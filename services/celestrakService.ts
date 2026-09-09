/**
 * CelesTrak NORAD Satellite & Space Debris Telemetry Service
 * Endpoint: https://celestrak.org/NORAD/elements/gp.php
 * Open Source NORAD orbital elements & visible satellite tracking API
 */

export interface CelestrakSatellite {
  noradId: number;
  name: string;
  category: 'VISUAL_PASS' | 'SPACE_STATION' | 'STARLINK' | 'ORBITAL_DEBRIS' | 'WEATHER_SATELLITE';
  latitude: number;
  longitude: number;
  altitudeKm: number;
  inclination: number;
  periodMinutes: number;
  epoch: string;
  meanMotion: number;
  eccentricity: number;
}

export class CelestrakService {
  private static CACHE: CelestrakSatellite[] = [];
  private static LAST_FETCH = 0;
  private static CACHE_TTL = 300000; // 5 minutes

  /**
   * Fetches bright, visible satellites and space objects tracked by NORAD CelesTrak.
   */
  public static async fetchBrightSatellites(group: 'visual' | 'stations' | 'weather' = 'visual'): Promise<CelestrakSatellite[]> {
    const now = Date.now();
    if (this.CACHE.length > 0 && now - this.LAST_FETCH < this.CACHE_TTL) {
      return this.CACHE;
    }

    try {
      const response = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`);
      if (!response.ok) {
        throw new Error(`CelesTrak HTTP error: ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        return this.CACHE;
      }

      const parsedSats: CelestrakSatellite[] = [];

      // Approximate orbital positioning based on Mean Anomaly, Inclination & Epoch
      data.slice(0, 60).forEach((item: any) => {
        if (!item || !item.OBJECT_NAME) return;

        const noradId = parseInt(item.NORAD_CAT_ID, 10) || 0;
        const inc = parseFloat(item.INCLINATION) || 0;
        const meanMotion = parseFloat(item.MEAN_MOTION) || 15;
        const meanAnomaly = parseFloat(item.MEAN_ANOMALY) || 0;
        const raan = parseFloat(item.RA_OF_ASC_NODE) || 0;

        // Estimate current latitude and longitude using orbital mechanics approximation
        const periodMinutes = (24 * 60) / (meanMotion || 15);
        const altitudeKm = Math.round(Math.pow(86816 / Math.max(1, meanMotion), 2/3) - 6371);

        // Compute instantaneous sub-satellite point approximation
        const timeOffsetHours = ((now % 86400000) / 3600000);
        const approxLng = (((raan + meanAnomaly - (timeOffsetHours * 15)) % 360) + 360) % 360 - 180;
        const approxLat = Math.sin((meanAnomaly * Math.PI) / 180) * inc;

        let cat: CelestrakSatellite['category'] = 'VISUAL_PASS';
        const nameUpper = item.OBJECT_NAME.toUpperCase();
        if (nameUpper.includes('ISS') || nameUpper.includes('TIANGONG') || nameUpper.includes('STATION')) {
          cat = 'SPACE_STATION';
        } else if (nameUpper.includes('STARLINK')) {
          cat = 'STARLINK';
        } else if (nameUpper.includes('DEB') || nameUpper.includes('R/B')) {
          cat = 'ORBITAL_DEBRIS';
        } else if (nameUpper.includes('NOAA') || nameUpper.includes('GOES') || nameUpper.includes('METEOR')) {
          cat = 'WEATHER_SATELLITE';
        }

        parsedSats.push({
          noradId,
          name: item.OBJECT_NAME.trim(),
          category: cat,
          latitude: parseFloat(approxLat.toFixed(4)),
          longitude: parseFloat(approxLng.toFixed(4)),
          altitudeKm: Math.max(200, Math.min(36000, altitudeKm)),
          inclination: parseFloat(inc.toFixed(2)),
          periodMinutes: parseFloat(periodMinutes.toFixed(1)),
          epoch: item.EPOCH || new Date().toISOString(),
          meanMotion: parseFloat(meanMotion.toFixed(4)),
          eccentricity: parseFloat(item.ECCENTRICITY) || 0
        });
      });

      this.CACHE = parsedSats;
      this.LAST_FETCH = now;
      return parsedSats;
    } catch (error) {
      console.warn('CelesTrak satellite telemetry fetch failed:', error);
      return this.CACHE;
    }
  }
}
