/**
 * NOAA National Data Buoy Center (NDBC) Marine Telemetry Service
 * Endpoint: https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt
 * Open Source Real-time Maritime & Oceanic Observation Buoy Data
 */

export interface BuoyObservation {
  stationId: string;
  latitude: number;
  longitude: number;
  windSpeedMs: number;
  windGustMs: number;
  waveHeightM: number;
  dominantWavePeriodSec: number;
  pressureHpa: number;
  airTempC: number;
  waterTempC: number;
  anomalyFlag: boolean;
  timestamp: number;
}

export class NdbcMaritimeService {
  private static CACHE: BuoyObservation[] = [];
  private static LAST_FETCH = 0;
  private static CACHE_TTL = 300000; // 5 minutes

  /**
   * Fetches latest ocean observation buoys from NOAA NDBC.
   */
  public static async fetchBuoyObservations(): Promise<BuoyObservation[]> {
    const now = Date.now();
    if (this.CACHE.length > 0 && now - this.LAST_FETCH < this.CACHE_TTL) {
      return this.CACHE;
    }

    try {
      const response = await fetch('https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt');
      if (!response.ok) {
        throw new Error(`NOAA NDBC HTTP error: ${response.status}`);
      }

      const text = await response.text();
      const lines = text.split('\n');
      if (lines.length < 3) return this.CACHE;

      const parsedObs: BuoyObservation[] = [];

      // Skip header lines (0 and 1)
      for (let i = 2; i < Math.min(lines.length, 120); i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length < 14) continue;

        const stationId = parts[0];
        const lat = parseFloat(parts[1]);
        const lng = parseFloat(parts[2]);

        if (isNaN(lat) || isNaN(lng)) continue;

        const windSpeedMs = parseFloat(parts[6]);
        const windGustMs = parseFloat(parts[7]);
        const waveHeightM = parseFloat(parts[8]);
        const domPeriod = parseFloat(parts[9]);
        const pressureHpa = parseFloat(parts[12]);
        const airTemp = parseFloat(parts[13]);
        const waterTemp = parseFloat(parts[14]);

        const validWave = !isNaN(waveHeightM) && waveHeightM < 99.0 ? waveHeightM : 1.2;
        const validGust = !isNaN(windGustMs) && windGustMs < 99.0 ? windGustMs : 4.5;
        const validPress = !isNaN(pressureHpa) && pressureHpa > 800 ? pressureHpa : 1013.2;

        const isAnomaly = validWave > 4.5 || validGust > 22.0 || validPress < 980.0;

        parsedObs.push({
          stationId,
          latitude: lat,
          longitude: lng,
          windSpeedMs: isNaN(windSpeedMs) ? 3.0 : windSpeedMs,
          windGustMs: validGust,
          waveHeightM: validWave,
          dominantWavePeriodSec: isNaN(domPeriod) ? 6.0 : domPeriod,
          pressureHpa: validPress,
          airTempC: isNaN(airTemp) ? 18.5 : airTemp,
          waterTempC: isNaN(waterTemp) ? 16.0 : waterTemp,
          anomalyFlag: isAnomaly,
          timestamp: now
        });
      }

      this.CACHE = parsedObs;
      this.LAST_FETCH = now;
      return parsedObs;
    } catch (error) {
      console.warn('NOAA NDBC maritime observation fetch failed:', error);
      return this.CACHE;
    }
  }
}
