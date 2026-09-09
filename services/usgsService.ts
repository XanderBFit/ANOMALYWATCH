import { SeismicEvent } from '../types';

export type USGSFeedPeriod = 'all_hour' | 'all_day' | '2.5_day' | '4.5_week' | 'significant_month';

export interface SeismicSummary {
  totalEvents: number;
  maxMagnitude: number;
  significantCount: number;
  tsunamiAlertCount: number;
  latestEvent: SeismicEvent | null;
  feedTimestamp: number;
}

export const USGSService = {
  /**
   * Fetches real-time USGS Earthquake data GeoJSON.
   */
  fetchLiveEarthquakes: async (period: USGSFeedPeriod = 'all_day'): Promise<SeismicEvent[]> => {
    try {
      const url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${period}.geojson`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`USGS GeoJSON fetch failed: ${response.status}`);
      }
      const data = await response.json();
      if (!data.features || !Array.isArray(data.features)) {
        return [];
      }

      return data.features.map((f: any): SeismicEvent => {
        const coords = f.geometry?.coordinates || [0, 0, 0];
        const props = f.properties || {};
        return {
          id: f.id || `usgs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          place: props.place || 'Unknown Location',
          time: props.time || Date.now(),
          updated: props.updated || Date.now(),
          tz: props.tz || null,
          url: props.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${f.id}`,
          detail: props.detail || '',
          felt: props.felt || null,
          cdi: props.cdi || null,
          mmi: props.mmi || null,
          alert: props.alert || null,
          status: props.status || 'reviewed',
          tsunami: props.tsunami || 0,
          sig: props.sig || 0,
          net: props.net || 'us',
          code: props.code || '',
          ids: props.ids || '',
          sources: props.sources || '',
          types: props.types || 'earthquake',
          nst: props.nst || null,
          dmin: props.dmin || null,
          rms: props.rms || null,
          gap: props.gap || null,
          magType: props.magType || 'ml',
          type: props.type || 'earthquake',
          title: props.title || `${props.mag || 0} mag - ${props.place || 'Unknown'}`,
          mag: props.mag || 0,
          longitude: coords[0],
          latitude: coords[1],
          depth: coords[2] || 0
        };
      });
    } catch (err) {
      console.error('USGSService fetch error:', err);
      return [];
    }
  },

  /**
   * Computes telemetry summary metrics for seismic dashboard widgets.
   */
  getSeismicSummary: (events: SeismicEvent[]): SeismicSummary => {
    if (!events.length) {
      return {
        totalEvents: 0,
        maxMagnitude: 0,
        significantCount: 0,
        tsunamiAlertCount: 0,
        latestEvent: null,
        feedTimestamp: Date.now()
      };
    }

    let maxMag = 0;
    let sigCount = 0;
    let tsunamiCount = 0;
    let latest: SeismicEvent = events[0];

    events.forEach(e => {
      if (e.mag > maxMag) maxMag = e.mag;
      if (e.sig > 500 || e.mag >= 5.0) sigCount++;
      if (e.tsunami === 1) tsunamiCount++;
      if (e.time > latest.time) latest = e;
    });

    return {
      totalEvents: events.length,
      maxMagnitude: Math.round(maxMag * 10) / 10,
      significantCount: sigCount,
      tsunamiAlertCount: tsunamiCount,
      latestEvent: latest,
      feedTimestamp: Date.now()
    };
  }
};

export default USGSService;
