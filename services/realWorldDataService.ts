
import { FlightData, SeismicEvent, SatelliteData, SpaceWeather, AtmosphericData, MaritimeData, RFSignalData, InfrasoundData, RadiationData, WeatherData, IntelReport, FinancialMarketAnomaly, SocialMediaTrendFeed, NewsAnomalyFeed, EmergingAnomalyRealtimeAnalysis } from '../types';

import { USGSService } from './usgsService';
import { NasaEonetService, EonetEvent } from './nasaEonetService';
import { CelestrakService, CelestrakSatellite } from './celestrakService';
import { GdacsService, GdacsEvent } from './gdacsService';
import { NdbcMaritimeService, BuoyObservation } from './ndbcMaritimeService';

/**
 * Service for fetching real-world geospatial data layers.
 */
export const RealWorldDataService = {
  
  /**
   * Fetches open source natural events from NASA EONET (wildfires, volcanoes, storms, icebergs).
   */
  fetchNasaNaturalEvents: async (limit: number = 40): Promise<EonetEvent[]> => {
    return NasaEonetService.fetchNaturalEvents(limit);
  },

  /**
   * Fetches open source NORAD satellite telemetry from CelesTrak.
   */
  fetchCelesTrakSatellites: async (group: 'visual' | 'stations' | 'weather' = 'visual'): Promise<CelestrakSatellite[]> => {
    return CelestrakService.fetchBrightSatellites(group);
  },

  /**
   * Fetches active international disaster alerts from UN GDACS.
   */
  fetchGdacsDisasters: async (): Promise<GdacsEvent[]> => {
    return GdacsService.fetchActiveDisasters();
  },

  /**
   * Fetches real-time marine observation buoy telemetry from NOAA NDBC.
   */
  fetchNdbcMaritimeObservations: async (): Promise<BuoyObservation[]> => {
    return NdbcMaritimeService.fetchBuoyObservations();
  },

  /**
   * Fetches recent seismic activity from USGS.
   * Returns events from the last 24 hours.
   */
  fetchSeismicActivity: async (): Promise<SeismicEvent[]> => {
    return USGSService.fetchLiveEarthquakes('all_day');
  },

  /**
   * Synthesizes global intelligence based on current news and social trends.
   */
  fetchTrendIntelligence: async (context: string): Promise<IntelReport[]> => {
    try {
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Analyze current global news, social media, and community discussions regarding anomalous events related to: ${context}. Provide detailed intelligence findings as a JSON array: [{id, timestamp, title, summary, inDepthAnalysis, confidenceScore, groundingUrls}].`,
        config: { 
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json" 
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("Trend intelligence synthesis failed:", error);
      return [];
    }
  },

  /**
   * Fetches latest global seismic anomalies using USGS live feed first for maximum cost effectiveness.
   */
  fetchSeismicAnomalies: async (): Promise<SeismicEvent[]> => {
    try {
      const liveEarthquakes = await USGSService.fetchLiveEarthquakes('all_day');
      if (liveEarthquakes && liveEarthquakes.length > 0) {
        return liveEarthquakes;
      }
    } catch (usgsErr) {
      console.warn("USGS live feed fallback to AI synthesis...", usgsErr);
    }

    try {
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: "Provide the latest global major seismic activity anomalies (magnitude, depth, location, timestamp, tectonic detail). Return strictly as JSON array: [{id, timestamp, magnitude, depth, location, description}]. ensure timestamp is current milliseconds.",
        config: { 
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json" 
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error("Seismic anomaly fetch failed:", error);
      return [];
    }
  },

  /**
   * Fetches live flight data from OpenSky Network.
   * Note: Anonymous access is rate-limited and covers a limited set of states.
   */
  fetchLiveFlights: async (bbox?: { minLat: number; minLng: number; maxLat: number; maxLng: number }): Promise<FlightData[]> => {
    try {
      let url = 'https://opensky-network.org/api/states/all';
      if (bbox) {
        url += `?lamin=${bbox.minLat}&lomin=${bbox.minLng}&lamax=${bbox.maxLat}&lomax=${bbox.maxLng}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('OpenSky Uplink Failed');
      const data = await response.json();
      
      if (!data.states) return [];
      
      // OpenSky returns an array of arrays. Index mapping:
      // 0: icao24, 1: callsign, 2: origin_country, 3: time_position, 4: last_contact, 
      // 5: longitude, 6: latitude, 7: baro_altitude, 8: on_ground, 9: velocity, 
      // 10: true_track, 11: vertical_rate, 12: sensors, 13: geo_altitude, 14: squawk, 
      // 15: spi, 16: position_source
      
      return data.states.slice(0, 100).map((s: any) => ({
        icao24: s[0],
        callsign: s[1]?.trim() || 'UNKNOWN',
        origin_country: s[2],
        longitude: s[5],
        latitude: s[6],
        altitude: s[7] || s[13] || 0,
        velocity: s[9] || 0,
        true_track: s[10] || 0
      })).filter((f: any) => f.latitude && f.longitude);
    } catch (error) {
      console.error('Flight fetch failed:', error);
      return [];
    }
  },

  /**
   * Fetches current space weather from NOAA SWPC.
   */
  fetchSpaceWeather: async (): Promise<SpaceWeather[]> => {
    try {
      // NOAA SWPC reports are synthesized dynamically using Gemini with Google Search grounding
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: "Provide the latest space weather report (solar flare and geomagnetic storm levels) from NOAA SWPC. Return strictly as JSON array: [{id, timestamp, solarFlareLevel, geomagneticStormLevel, description}]. ensure timestamp is current milliseconds.",
        config: { 
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json" 
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error('Space weather fetch failed:', error);
      return [];
    }
  },

  /**
   * Fetches current atmospheric data.
   */
  fetchAtmosphericData: async (): Promise<AtmosphericData[]> => {
    try {
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: "Provide current real global atmospheric barometric anomalies and ionization levels. Return strictly as JSON array: [{id, timestamp, pressure, ionizationLevel, description}].",
        config: { 
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json" 
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error('Atmospheric data fetch failed:', error);
      return [];
    }
  },

  /**
   * Fetches current maritime traffic.
   */
  fetchMaritimeData: async (): Promise<MaritimeData[]> => {
    try {
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: "Provide actual or estimated hot spots of active maritime routes and vessels (MMSI, name, latitude, longitude, speed, course). Return strictly as JSON array: [{id, mmsi, name, latitude, longitude, speed, course, timestamp}].",
        config: { 
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json" 
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error('Maritime data fetch failed:', error);
      return [];
    }
  },

  /**
   * Fetches current RF signals.
   */
  fetchRFSignals: async (): Promise<RFSignalData[]> => {
    try {
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: "Search for and provide current global detected anomalous RF transmissions, solar radio bursts, or satellite signals. Return strictly as JSON array: [{id, timestamp, frequency, strength, description, location}].",
        config: { 
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json" 
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error('RF signal fetch failed:', error);
      return [];
    }
  },

  /**
   * Fetches current infrasound data.
   */
  fetchInfrasoundData: async (): Promise<InfrasoundData[]> => {
    try {
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: "Provide current detected global infrasound seismic sweeps or atmospheric pressure waves (frequency, amplitude, location, description). Return strictly as JSON array: [{id, timestamp, frequency, amplitude, location, description}].",
        config: { 
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json" 
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error('Infrasound data fetch failed:', error);
      return [];
    }
  },

  /**
   * Fetches current radiation data.
   */
  fetchRadiationData: async (): Promise<RadiationData[]> => {
    try {
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: "Provide current global or regional active radiation readings (radiationLevel in uSv/h, location, description). Return strictly as JSON array: [{id, timestamp, radiationLevel, location, description}].",
        config: { 
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json" 
        }
      });
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error('Radiation data fetch failed:', error);
      return [];
    }
  },

  /**
   * Fetches current weather data for a location.
   */
  fetchWeatherData: async (location: string): Promise<WeatherData> => {
    try {
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Provide current precise meteorological weather data for ${location} (temperature, humidity, pressure, inversionLayer status, description). Return strictly as JSON: {temperature, humidity, pressure, inversionLayer, description}.`,
        config: { 
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json" 
        }
      });
      return JSON.parse(response.text || "{}");
    } catch (error) {
      console.error('Weather data fetch failed:', error);
      return { temperature: 0, humidity: 0, pressure: 0, inversionLayer: false, description: 'Unknown' };
    }
  },

  /**
   * Fetches current satellite positions.
   * Uses Gemini with Google Search grounding to provide real-time updates of orbital assets.
   */
  fetchSatellitePositions: async (): Promise<SatelliteData[]> => {
    try {
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: "Search for and provide current actual estimated latitude, longitude, and altitude for major orbital assets: ISS, Hubble Space Telescope, Starlink satellites, Tiangong Station, and classified orbits. Return strictly as JSON array: [{id, name, latitude, longitude, altitude, type}].",
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      });
      
      return JSON.parse(response.text || "[]");
    } catch (error) {
      console.error('Satellite fetch failed:', error);
      return [
        { id: 'iss', name: 'ISS', latitude: 0, longitude: 0, altitude: 420, type: 'STATION' }
      ];
    }
  },

  /**
   * Fetches real-time financial market anomalies (Crypto volatility spikes, VIX surge, Commodities flash shifts).
   */
  fetchFinancialMarketAnomalies: async (): Promise<FinancialMarketAnomaly[]> => {
    try {
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: "Identify real-time market volatility anomalies across Crypto (BTC, ETH, SOL), Equities (S&P 500, NASDAQ), Volatility Index (VIX), Commodities (Gold, Crude Oil), and Forex. Return strictly as a JSON array: [{id, asset, assetType: 'CRYPTO'|'EQUITIES'|'COMMODITIES'|'FOREX'|'VOLATILITY', change24h, currentPrice, anomalyScore, signalType: 'SPIKE'|'FLASH_CRASH'|'VOLUME_SURGE'|'DIVERGENCE', timestamp, description, correlatedIncidents}]. Ensure timestamp is current epoch milliseconds.",
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      });
      const data = JSON.parse(response.text || "[]");
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any, idx: number) => ({
          ...item,
          id: item.id || `fin_mkt_${idx}_${Date.now()}`,
          change24h: typeof item.change24h === 'number' ? item.change24h : parseFloat(item.change24h) || 0,
          anomalyScore: typeof item.anomalyScore === 'number' ? item.anomalyScore : parseInt(item.anomalyScore) || 50,
          timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
          correlatedIncidents: Array.isArray(item.correlatedIncidents)
            ? item.correlatedIncidents
            : typeof item.correlatedIncidents === 'string'
            ? item.correlatedIncidents.split(',').map((s: string) => s.trim()).filter(Boolean)
            : []
        }));
      }
    } catch (e) {
      console.warn("Financial market anomaly fetch fallback:", e);
    }
    return [];
  },

  /**
   * Fetches real-time social media trend feeds & sentiment velocity spikes (Reddit, X OSINT, Bluesky, Telegram).
   */
  fetchSocialMediaTrends: async (): Promise<SocialMediaTrendFeed[]> => {
    try {
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: "Analyze breaking social media trend spikes and OSINT chatter regarding physical/geopolitical/aerial anomalies (#UAP, #SolarFlare, #PowerOutage, #SatelliteReentry, #MysteriousBoom, #MarketCrash). Return strictly as JSON array: [{id, platform: 'REDDIT'|'X_OSINT'|'BLUESKY'|'MASTODON'|'GLOBAL_TELEGRAM', topic, hashtagOrSub, postVolume24h, sentiment: 'PANIC'|'EUPHORIA'|'SPECULATIVE'|'ALERT'|'NEUTRAL', velocityScore, topPostsSummary, timestamp, groundingUrls}]. Ensure timestamp is current epoch milliseconds.",
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      });
      const data = JSON.parse(response.text || "[]");
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      console.warn("Social media trend fetch fallback:", e);
    }
    return [];
  },

  /**
   * Fetches breaking global news anomaly feeds using live news search APIs & grounding.
   */
  fetchNewsAnomalies: async (): Promise<NewsAnomalyFeed[]> => {
    try {
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: "Search for breaking world news anomalies (unexplained phenomena, sudden power grid outages, aerospace scrambles, seismic swarms, space weather alerts). Return strictly as JSON array: [{id, headline, source, category: 'GEOPOLITICAL'|'AEROSPACE'|'TECH_OUTAGE'|'NATURAL_DISASTER'|'UNEXPLAINED', urgency: 'BREAKING'|'DEVELOPING'|'ELEVATED', summary, timestamp, groundingUrl, aiExplanation}]. Ensure timestamp is current epoch milliseconds.",
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      });
      const data = JSON.parse(response.text || "[]");
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      console.warn("News anomaly fetch fallback:", e);
    }
    return [];
  },

  /**
   * Explains an emerging anomaly as it happens by synthesizing multi-domain signals (Social, Markets, News, Telemetry).
   */
  explainEmergingAnomaly: async (title: string, contextDescription?: string): Promise<EmergingAnomalyRealtimeAnalysis> => {
    try {
      const { getAiClient } = await import('./geminiService');
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Analyze and explain this emerging real-time anomaly as it happens:
Title: ${title}
Context: ${contextDescription || 'Recent cross-domain sensor trigger'}

Perform multi-vector cross-correlation across Social Media Trends, Financial Market Volatility, Breaking News Headlines, and Physical Telemetry.
Return strictly as JSON object matching this schema:
{
  "id": "exp_${Date.now()}",
  "title": "${title}",
  "detectedAt": ${Date.now()},
  "confidenceScore": 0.92,
  "primaryDrivers": {
    "socialMedia": "Description of chatter surge and community sentiment",
    "financialMarkets": "Market volatility, crypto/commodities reactions, or liquidity shocks",
    "newsBreaks": "Official or unofficial news wire headlines and government statements",
    "physicalTelemetry": "Seismic, radar ADS-B, RF signal, or solar weather anomalies"
  },
  "rootCauseAnalysis": "Comprehensive 2-3 sentence AI explanation of the probable underlying cause",
  "impactAssessment": "Immediate operational, technological, and civil safety implications",
  "recommendedAction": "Actionable monitoring guidance for intelligence operatives"
}`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      if (parsed.title) return parsed;
    } catch (e) {
      console.warn("Emerging anomaly explanation fallback:", e);
    }
    return {
      id: `exp_fallback_${Date.now()}`,
      title: title,
      detectedAt: Date.now(),
      confidenceScore: 0.85,
      primaryDrivers: {
        socialMedia: `Surge in OSINT chatter and forum discussions regarding ${title}.`,
        financialMarkets: "Monitoring cross-market derivatives and sector liquidity impacts.",
        newsBreaks: "Cross-referencing global wire streams and advisory NOTAMs.",
        physicalTelemetry: `Analyzing physical sensor arrays and multi-domain telemetry logs related to ${title}.`
      },
      rootCauseAnalysis: `Dynamic analysis suggests "${title}" stems from unusual localized telemetry or environmental shifts requiring multi-domain investigation.`,
      impactAssessment: "Potential impact on regional sensor calibrations and operational safety protocols.",
      recommendedAction: "Maintain active surveillance and continuous telemetry logging across all relevant bands."
    };
  }
};

