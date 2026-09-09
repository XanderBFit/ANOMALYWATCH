/**
 * Anomaly Watch - Pattern Recognition & Bayesian Inference Engine
 * Implements spatio-temporal DBSCAN clustering, trajectory corridor vector fitting,
 * and multi-sensor Bayesian anomaly scoring for OSINT telemetry.
 */

export interface SpatialPoint {
  id?: string;
  lat: number;
  lng: number;
  timestamp: number; // Unix epoch ms
  sensorType: string;
  altitudeMeters?: number;
  velocityMps?: number;
  headingDegrees?: number;
  magnitude?: number;
  rawPayload?: any;
}

export interface ClusteredEvent {
  clusterId: string;
  centerLat: number;
  centerLng: number;
  startTime: number;
  endTime: number;
  durationMs: number;
  pointCount: number;
  sensorTypes: string[];
  points: SpatialPoint[];
  boundingRadiusKm: number;
}

export interface TrajectoryCorridor {
  origin: { lat: number; lng: number; time: number };
  destination: { lat: number; lng: number; time: number };
  estimatedVelocityMps: number;
  estimatedHeadingDegrees: number;
  corridorWidthKm: number;
  fitConfidence: number; // 0.0 - 1.0
  predictedWaypoints: Array<{
    lat: number;
    lng: number;
    estimatedTime: number;
    uncertaintyRadiusKm: number;
  }>;
}

export interface AnomalyBayesianEvaluation {
  posteriorAnomalyProbability: number; // 0.0 - 1.0
  conventionalProbability: number;
  confidenceGrade: 'ALPHA' | 'BETA' | 'GAMMA' | 'OMEGA';
  breakdown: {
    airDefenseMatchLikelihood: number;
    orbitalSatelliteMatchLikelihood: number;
    seismicAcousticLikelihood: number;
    solarGeomagneticCorrelation: number;
    kinematicAnomalyFactor: number;
  };
  eliminatedHypotheses: string[];
  candidateSignatures: string[];
}

export class PatternInferenceEngine {
  /**
   * Earth radius in kilometers for Haversine calculations.
   */
  private static readonly EARTH_RADIUS_KM = 6371;

  /**
   * Calculates Great-Circle Haversine distance between two coordinates in kilometers.
   */
  public static haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return PatternInferenceEngine.EARTH_RADIUS_KM * c;
  }

  /**
   * Calculates initial bearing (forward azimuth) from point 1 to point 2 in degrees (0-360).
   */
  public static calculateBearingDegrees(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
    const x =
      Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
      Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
    const brng = (toDeg(Math.atan2(y, x)) + 360) % 360;
    return brng;
  }

  /**
   * Computes destination coordinate given start point, bearing in degrees, and distance in km.
   */
  public static destinationPoint(lat: number, lon: number, bearingDeg: number, distanceKm: number): { lat: number; lng: number } {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const angDist = distanceKm / PatternInferenceEngine.EARTH_RADIUS_KM;
    const latRad = toRad(lat);
    const lonRad = toRad(lon);
    const brngRad = toRad(bearingDeg);

    const destLat = Math.asin(
      Math.sin(latRad) * Math.cos(angDist) + Math.cos(latRad) * Math.sin(angDist) * Math.cos(brngRad)
    );
    const destLon =
      lonRad +
      Math.atan2(
        Math.sin(brngRad) * Math.sin(angDist) * Math.cos(latRad),
        Math.cos(angDist) - Math.sin(latRad) * Math.sin(destLat)
      );

    return {
      lat: toDeg(destLat),
      lng: ((toDeg(destLon) + 540) % 360) - 180,
    };
  }

  /**
   * Spatio-Temporal DBSCAN Clustering
   * Groups multi-sensor telemetry points into discrete correlated anomaly events.
   * 
   * @param points Array of spatial points with coordinates and epoch timestamps
   * @param radiusKm Max spatial neighbor distance (Epsilon Spatial)
   * @param timeWindowMs Max temporal neighbor delta in ms (Epsilon Temporal)
   * @param minPoints Minimum points required to form a core cluster
   */
  public clusterEvents(
    points: SpatialPoint[],
    radiusKm: number = 75,
    timeWindowMs: number = 3600000, // 1 hour
    minPoints: number = 2
  ): ClusteredEvent[] {
    if (!points || points.length === 0) return [];

    const visited = new Set<number>();
    const clustered = new Set<number>();
    const clusters: SpatialPoint[][] = [];

    const getNeighbors = (index: number): number[] => {
      const p1 = points[index];
      const neighbors: number[] = [];

      for (let i = 0; i < points.length; i++) {
        if (i === index) continue;
        const p2 = points[i];

        const timeDiff = Math.abs(p1.timestamp - p2.timestamp);
        if (timeDiff <= timeWindowMs) {
          const distKm = PatternInferenceEngine.haversineDistanceKm(p1.lat, p1.lng, p2.lat, p2.lng);
          if (distKm <= radiusKm) {
            neighbors.push(i);
          }
        }
      }
      return neighbors;
    };

    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;
      visited.add(i);

      const neighbors = getNeighbors(i);
      if (neighbors.length + 1 >= minPoints) {
        const currentCluster: SpatialPoint[] = [points[i]];
        clustered.add(i);

        const queue = [...neighbors];
        while (queue.length > 0) {
          const neighborIdx = queue.shift()!;
          if (!visited.has(neighborIdx)) {
            visited.add(neighborIdx);
            const subNeighbors = getNeighbors(neighborIdx);
            if (subNeighbors.length + 1 >= minPoints) {
              queue.push(...subNeighbors.filter(n => !queue.includes(n) && !visited.has(n)));
            }
          }

          if (!clustered.has(neighborIdx)) {
            clustered.add(neighborIdx);
            currentCluster.push(points[neighborIdx]);
          }
        }

        clusters.push(currentCluster);
      }
    }

    // Format clusters into structured ClusteredEvent summaries
    return clusters.map((clusterPts, idx) => {
      const lats = clusterPts.map(p => p.lat);
      const lngs = clusterPts.map(p => p.lng);
      const times = clusterPts.map(p => p.timestamp);

      const centerLat = lats.reduce((a, b) => a + b, 0) / clusterPts.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / clusterPts.length;
      const startTime = Math.min(...times);
      const endTime = Math.max(...times);
      const sensorTypes = Array.from(new Set(clusterPts.map(p => p.sensorType)));

      const maxDistFromCenter = Math.max(
        ...clusterPts.map(p => PatternInferenceEngine.haversineDistanceKm(centerLat, centerLng, p.lat, p.lng))
      );

      return {
        clusterId: `CLUSTER-${Date.now().toString(36).toUpperCase()}-${idx + 1}`,
        centerLat,
        centerLng,
        startTime,
        endTime,
        durationMs: endTime - startTime,
        pointCount: clusterPts.length,
        sensorTypes,
        points: clusterPts.sort((a, b) => a.timestamp - b.timestamp),
        boundingRadiusKm: Math.max(5, maxDistFromCenter),
      };
    });
  }

  /**
   * Trajectory Corridor Vector Fitting
   * Fits high-speed vectors to clustered points sorted temporally to predict 24h trajectory corridors.
   */
  public fitTrajectoryCorridor(cluster: SpatialPoint[], forecastHours: number = 24): TrajectoryCorridor | null {
    if (!cluster || cluster.length < 2) {
      return null;
    }

    // Sort by chronological timestamp
    const sorted = [...cluster].sort((a, b) => a.timestamp - b.timestamp);
    const pFirst = sorted[0];
    const pLast = sorted[sorted.length - 1];

    const timeDeltaSec = (pLast.timestamp - pFirst.timestamp) / 1000;
    const distanceKm = PatternInferenceEngine.haversineDistanceKm(pFirst.lat, pFirst.lng, pLast.lat, pLast.lng);
    const bearingDeg = PatternInferenceEngine.calculateBearingDegrees(pFirst.lat, pFirst.lng, pLast.lat, pLast.lng);

    // Compute velocity in meters per second (fallback if stationary/instant)
    const velocityMps = timeDeltaSec > 0 ? (distanceKm * 1000) / timeDeltaSec : 0;

    // Estimate corridor dispersion width based on point variance
    let maxLateralDist = 5; // minimum 5km width
    sorted.forEach(p => {
      const d = PatternInferenceEngine.haversineDistanceKm(pFirst.lat, pFirst.lng, p.lat, p.lng);
      const b = PatternInferenceEngine.calculateBearingDegrees(pFirst.lat, pFirst.lng, p.lat, p.lng);
      const lateralDeviation = Math.abs(d * Math.sin(((b - bearingDeg) * Math.PI) / 180));
      if (lateralDeviation > maxLateralDist) maxLateralDist = lateralDeviation;
    });

    // Generate predictive waypoints over requested horizon
    const waypoints: TrajectoryCorridor['predictedWaypoints'] = [];
    const stepHours = Math.max(1, Math.round(forecastHours / 6));
    const effectiveSpeedKmh = Math.max(20, (velocityMps * 3.6) || (distanceKm > 0 ? distanceKm : 100));

    for (let h = 1; h <= forecastHours; h += stepHours) {
      const stepDistKm = effectiveSpeedKmh * h;
      const nextCoord = PatternInferenceEngine.destinationPoint(pLast.lat, pLast.lng, bearingDeg, stepDistKm);
      waypoints.push({
        lat: nextCoord.lat,
        lng: nextCoord.lng,
        estimatedTime: pLast.timestamp + h * 3600 * 1000,
        uncertaintyRadiusKm: maxLateralDist + h * 12, // expanding conical uncertainty
      });
    }

    const fitConfidence = Math.min(0.95, Math.max(0.4, 0.5 + sorted.length * 0.1 - (maxLateralDist / 100)));

    return {
      origin: { lat: pFirst.lat, lng: pFirst.lng, time: pFirst.timestamp },
      destination: { lat: pLast.lat, lng: pLast.lng, time: pLast.timestamp },
      estimatedVelocityMps: velocityMps,
      estimatedHeadingDegrees: Math.round(bearingDeg),
      corridorWidthKm: Math.round(maxLateralDist * 2),
      fitConfidence,
      predictedWaypoints: waypoints,
    };
  }

  /**
   * Multi-Sensor Bayesian Anomaly Scoring
   * Applies Bayes' theorem with likelihood ratios to evaluate the probability that
   * a target event is a non-conventional or anomalous signature rather than standard
   * commercial aviation (ADS-B), orbital debris/satellites (CelesTrak), or seismic events (USGS).
   */
  public calculateAnomalyScore(event: any, sensorFeeds: any[] = []): AnomalyBayesianEvaluation {
    // Baseline prior anomaly probability (1 in 1000 for raw unverified signals)
    let priorOdds = 0.05 / 0.95; 

    // Likelihood Ratios (Bayes Factors)
    // LR > 1 increases anomaly probability; LR < 1 increases conventional hypothesis
    let lrAviation = 1.0;
    let lrOrbital = 1.0;
    let lrSeismic = 1.0;
    let lrSolar = 1.0;
    let lrKinematics = 1.0;

    const eliminatedHypotheses: string[] = [];
    const candidateSignatures: string[] = [];

    // 1. Evaluate Commercial / ADS-B Aviation Correlation
    const hasTransponderMatch = event.hasSquawkMatch || event.transponderContact || false;
    const velocityMps = event.velocityMps || (event.speedKmh ? event.speedKmh / 3.6 : 0);
    const altitudeFt = event.altitudeFt || event.coordinates?.alt_ft || 0;

    if (hasTransponderMatch) {
      lrAviation = 0.02; // Very likely conventional aircraft
    } else {
      lrAviation = 2.5; // Uncorrelated radar return or untransponded target
      eliminatedHypotheses.push("Commercial Transponder (Mode A/C/S ADS-B absent)");
      candidateSignatures.push("DARK_TARGET_UNTRANSPONDED");
    }

    // 2. Kinematic & Velocity Evaluation (Hypersonic / Instant Turn / Extreme Altitude)
    if (velocityMps > 3000 || (velocityMps > 1000 && altitudeFt < 50000)) {
      lrKinematics = 6.0; // Mach 3+ at lower troposphere
      eliminatedHypotheses.push("Subsonic Commercial Aircraft");
      candidateSignatures.push("HYPERSONIC_PROPULSION");
    } else if (velocityMps > 400 && velocityMps <= 1000) {
      lrKinematics = 1.8;
      candidateSignatures.push("SUPERSONIC_TRANSIT");
    }

    if (altitudeFt > 80000 && altitudeFt < 200000) {
      lrKinematics *= 2.2; // Mesosphere transit zone
      eliminatedHypotheses.push("Standard Civil Airspace Operations (<60,000 ft)");
      candidateSignatures.push("STRATOSPHERIC_ANOMALY");
    }

    // 3. Evaluate Orbital / CelesTrak Satellite Ephemeris
    const orbitMatch = event.celestrakPassMatch || false;
    if (orbitMatch) {
      lrOrbital = 0.05; // Matches known Starlink / ISS / Cosmos orbital transit
    } else {
      lrOrbital = 1.6;
      eliminatedHypotheses.push("Known Ephemeris Satellite Transit (NORAD Catalog matched negative)");
      candidateSignatures.push("NON_KEPLERIAN_TRAJECTORY");
    }

    // 4. Evaluate Seismic & Acoustic Signature
    if (event.seismicCorrelation && event.seismicMagnitude && event.seismicMagnitude > 3.0) {
      lrSeismic = 0.15; // Natural tectonic tremor
    } else if (event.acousticShockwaveReported && !event.seismicCorrelation) {
      lrSeismic = 3.0; // Atmospheric shockwave without epicenter depth
      eliminatedHypotheses.push("Sub-surface Tectonic Epicenter");
      candidateSignatures.push("ATMOSPHERIC_BARIC_PULSE");
    }

    // 5. Evaluate Space Weather / Solar Geomagnetic Storm Correlation
    const kpIndex = event.kpIndex || 2;
    if (kpIndex >= 6) {
      lrSolar = 0.7; // Possible geomagnetic aurora / optical refraction
    } else {
      lrSolar = 1.2;
      eliminatedHypotheses.push("Auroral Optical Refraction (Quiet Geomagnetic Field Kp < 4)");
    }

    // Combine Bayes Factors: Posterior Odds = Prior Odds * Product(LR_i)
    const combinedLR = lrAviation * lrOrbital * lrSeismic * lrSolar * lrKinematics;
    const posteriorOdds = priorOdds * combinedLR;
    const posteriorProbability = Math.min(0.99, Math.max(0.01, posteriorOdds / (1 + posteriorOdds)));

    // Categorize into clearance confidence tiers
    let confidenceGrade: AnomalyBayesianEvaluation['confidenceGrade'] = 'GAMMA';
    if (posteriorProbability >= 0.85) {
      confidenceGrade = 'OMEGA';
    } else if (posteriorProbability >= 0.65) {
      confidenceGrade = 'ALPHA';
    } else if (posteriorProbability >= 0.40) {
      confidenceGrade = 'BETA';
    }

    return {
      posteriorAnomalyProbability: Math.round(posteriorProbability * 100) / 100,
      conventionalProbability: Math.round((1 - posteriorProbability) * 100) / 100,
      confidenceGrade,
      breakdown: {
        airDefenseMatchLikelihood: Math.round((1 / (1 + lrAviation)) * 100) / 100,
        orbitalSatelliteMatchLikelihood: Math.round((1 / (1 + lrOrbital)) * 100) / 100,
        seismicAcousticLikelihood: Math.round((1 / (1 + lrSeismic)) * 100) / 100,
        solarGeomagneticCorrelation: Math.round((1 / (1 + lrSolar)) * 100) / 100,
        kinematicAnomalyFactor: Math.round(lrKinematics * 10) / 10,
      },
      eliminatedHypotheses,
      candidateSignatures,
    };
  }
}

