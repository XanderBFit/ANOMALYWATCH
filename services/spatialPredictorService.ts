import { UFOSighting, SeismicEvent } from '../types';

export interface PredictiveCorridor {
  id: string;
  clusterName: string;
  centerLat: number;
  centerLng: number;
  bearingDegrees: number; // 0 to 360
  estimatedSpeedKnots: number;
  densityScore: number; // 0 to 100
  threatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  projectedWaypoints: {
    hoursAhead: number; // 6, 12, 18, 24
    lat: number;
    lng: number;
    radiusKm: number;
  }[];
  corridorPolyline: [number, number][]; // Line coordinates
  associatedAnomaliesCount: number;
  primaryCategory: string;
}

export class SpatialPredictorService {
  /**
   * Helper function to extract or estimate coordinates from an anomaly
   */
  public static getCoords(s: { location?: string; lat?: number; lng?: number }): [number, number] | null {
    if (typeof s.lat === 'number' && typeof s.lng === 'number' && !isNaN(s.lat) && !isNaN(s.lng)) {
      return [s.lat, s.lng];
    }
    if (!s.location) return null;
    if (s.location === 'Pacific Ocean') return [0, -160];
    if (s.location === 'Nevada, USA') return [38.8, -116.4];
    if (s.location === 'North Sea') return [56, 3];
    if (s.location === 'Mariana Trench') return [11.3, 142.2];

    const hash = s.location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const lat = ((hash * 13) % 120) - 60;
    const lng = ((hash * 29) % 320) - 160;
    return [lat, lng];
  }

  /**
   * Calculates spatial-temporal clusters and projects 24-hour predictive corridors
   */
  public static calculatePredictiveCorridors(
    sightings: UFOSighting[],
    seismicEvents: SeismicEvent[] = [],
    rfSignals: any[] = []
  ): PredictiveCorridor[] {
    const validPoints: { id: string; lat: number; lng: number; title: string; category: string; severity: string; timestamp: number }[] = [];

    // Collect coordinates from sightings
    sightings.forEach(s => {
      const coords = this.getCoords(s);
      if (coords) {
        validPoints.push({
          id: s.id,
          lat: coords[0],
          lng: coords[1],
          title: s.title || 'UAP Signal',
          category: s.category || 'UFO / UAP',
          severity: s.severity || 'HIGH',
          timestamp: typeof s.timestamp === 'number' ? s.timestamp : Date.now()
        });
      }
    });

    // Collect coordinates from seismic events
    seismicEvents.forEach((se, idx) => {
      if (typeof se.latitude === 'number' && typeof se.longitude === 'number') {
        validPoints.push({
          id: se.id || `seis-${idx}`,
          lat: se.latitude,
          lng: se.longitude,
          title: `Seismic Activity (${se.place})`,
          category: 'Phenomena',
          severity: se.mag >= 5.0 ? 'CRITICAL' : 'MEDIUM',
          timestamp: se.time || Date.now()
        });
      }
    });

    // Collect coordinates from RF signals
    rfSignals.forEach((rf, idx) => {
      if (typeof rf.lat === 'number' && typeof rf.lng === 'number') {
        validPoints.push({
          id: `rf-${idx}`,
          lat: rf.lat,
          lng: rf.lng,
          title: rf.title || 'RF Vector Emission',
          category: 'Electromagnetic',
          severity: 'MEDIUM',
          timestamp: Date.now()
        });
      }
    });

    if (validPoints.length === 0) return [];

    // Simple Spatial Clustering (Grid-based / distance grouping ~1000km threshold)
    const clusters: typeof validPoints[] = [];
    const visited = new Set<string>();

    validPoints.forEach(pt => {
      if (visited.has(pt.id)) return;

      const cluster: typeof validPoints = [pt];
      visited.add(pt.id);

      validPoints.forEach(other => {
        if (visited.has(other.id)) return;
        const distKm = this.haversineDistance(pt.lat, pt.lng, other.lat, other.lng);
        if (distKm < 1200) {
          cluster.push(other);
          visited.add(other.id);
        }
      });

      clusters.push(cluster);
    });

    // For top clusters, project 24-hour predictive vector corridors
    const corridors: PredictiveCorridor[] = clusters
      .filter(c => c.length >= 1)
      .map((cluster, idx) => {
        const avgLat = cluster.reduce((sum, p) => sum + p.lat, 0) / cluster.length;
        const avgLng = cluster.reduce((sum, p) => sum + p.lng, 0) / cluster.length;

        // Calculate synthetic bearing & drift vector derived from cluster id and lat/lng
        const seedHash = Math.abs(Math.sin(avgLat * 12.9898 + avgLng * 78.233 + idx * 43758.5453));
        const bearingDegrees = Math.floor(seedHash * 360);
        const estimatedSpeedKnots = Math.floor(150 + seedHash * 450);

        // Density Score based on items in cluster
        const densityScore = Math.min(99, Math.floor(40 + cluster.length * 15 + seedHash * 20));

        let threatLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
        if (densityScore > 85 || cluster.some(p => p.severity === 'CRITICAL')) threatLevel = 'CRITICAL';
        else if (densityScore > 65 || cluster.some(p => p.severity === 'HIGH')) threatLevel = 'HIGH';

        // Calculate 24-hour waypoints along bearing vector
        const waypoints: PredictiveCorridor['projectedWaypoints'] = [];
        const polyline: [number, number][] = [[avgLat, avgLng]];

        [6, 12, 18, 24].forEach(hours => {
          const distanceKm = (estimatedSpeedKnots * 1.852) * (hours / 4); // scaled for visual density
          const nextCoord = this.destinationPoint(avgLat, avgLng, distanceKm, bearingDegrees);
          
          waypoints.push({
            hoursAhead: hours,
            lat: nextCoord[0],
            lng: nextCoord[1],
            radiusKm: Math.round(50 + hours * 12)
          });

          polyline.push([nextCoord[0], nextCoord[1]]);
        });

        const primaryCategory = cluster[0]?.category || 'Phenomena';

        return {
          id: `corridor-pred-${idx}-${Math.round(avgLat)}`,
          clusterName: `Sector Corridor Vector ${String.fromCharCode(65 + (idx % 26))}-${Math.floor(seedHash * 900 + 100)}`,
          centerLat: parseFloat(avgLat.toFixed(4)),
          centerLng: parseFloat(avgLng.toFixed(4)),
          bearingDegrees,
          estimatedSpeedKnots,
          densityScore,
          threatLevel,
          projectedWaypoints: waypoints,
          corridorPolyline: polyline,
          associatedAnomaliesCount: cluster.length,
          primaryCategory
        };
      });

    return corridors.sort((a, b) => b.densityScore - a.densityScore);
  }

  /**
   * Distance in km between two lat/lng pairs
   */
  private static haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Calculates destination point given distance (km) and bearing (deg)
   */
  private static destinationPoint(lat: number, lon: number, distanceKm: number, bearingDeg: number): [number, number] {
    const R = 6371;
    const d = distanceKm / R;
    const brng = bearingDeg * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lon * Math.PI / 180;

    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));

    return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
  }
}
