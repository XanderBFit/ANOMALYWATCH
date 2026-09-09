/**
 * GDACS (Global Disaster Alert and Coordination System) Open Source Service
 * Endpoint: https://www.gdacs.org/gdacsapi/api/events/geteventlist/M
 * Free & Open Source - UN & European Commission Disaster Coordination
 */

export interface GdacsEvent {
  id: string;
  eventName: string;
  eventType: 'EARTHQUAKE' | 'CYCLONE' | 'FLOOD' | 'VOLCANO' | 'TSUNAMI' | 'DROUGHT';
  alertLevel: 'GREEN' | 'ORANGE' | 'RED';
  alertScore: number;
  latitude: number;
  longitude: number;
  country: string;
  fromdate: string;
  todate: string;
  description: string;
  populationImpacted?: string;
  link: string;
}

export class GdacsService {
  private static CACHE: GdacsEvent[] = [];
  private static LAST_FETCH = 0;
  private static CACHE_TTL = 300000; // 5 minutes

  /**
   * Fetches active global disaster alert feeds from GDACS.
   */
  public static async fetchActiveDisasters(): Promise<GdacsEvent[]> {
    const now = Date.now();
    if (this.CACHE.length > 0 && now - this.LAST_FETCH < this.CACHE_TTL) {
      return this.CACHE;
    }

    try {
      const response = await fetch('https://www.gdacs.org/gdacsapi/api/events/geteventlist/M');
      if (!response.ok) {
        throw new Error(`GDACS HTTP error: ${response.status}`);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.features)) {
        return this.CACHE;
      }

      const parsedEvents: GdacsEvent[] = [];

      data.features.forEach((feat: any) => {
        const props = feat.properties || {};
        const geom = feat.geometry || {};

        if (!geom.coordinates || !Array.isArray(geom.coordinates)) return;

        const lng = geom.coordinates[0];
        const lat = geom.coordinates[1];

        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        let type: GdacsEvent['eventType'] = 'EARTHQUAKE';
        const rawType = (props.eventtype || '').toUpperCase();
        if (rawType.includes('TC') || rawType.includes('CYCLONE')) type = 'CYCLONE';
        else if (rawType.includes('FL') || rawType.includes('FLOOD')) type = 'FLOOD';
        else if (rawType.includes('VO') || rawType.includes('VOLCANO')) type = 'VOLCANO';
        else if (rawType.includes('TS') || rawType.includes('TSUNAMI')) type = 'TSUNAMI';
        else if (rawType.includes('DR') || rawType.includes('DROUGHT')) type = 'DROUGHT';

        let alertLevel: GdacsEvent['alertLevel'] = 'GREEN';
        const levelStr = (props.alertlevel || '').toUpperCase();
        if (levelStr.includes('RED')) alertLevel = 'RED';
        else if (levelStr.includes('ORANGE')) alertLevel = 'ORANGE';

        parsedEvents.push({
          id: `gdacs-${props.eventid || Math.random()}`,
          eventName: props.name || props.eventname || `${type} Event`,
          eventType: type,
          alertLevel,
          alertScore: parseFloat(props.alertscore || '1.0'),
          latitude: lat,
          longitude: lng,
          country: props.country || 'Global Waters',
          fromdate: props.fromdate || new Date().toISOString(),
          todate: props.todate || new Date().toISOString(),
          description: props.description || props.htmldescription || `GDACS ${alertLevel} alert for ${type} in ${props.country || 'unassigned area'}.`,
          populationImpacted: props.population ? `${props.population} people` : undefined,
          link: props.url?.report || 'https://www.gdacs.org'
        });
      });

      this.CACHE = parsedEvents;
      this.LAST_FETCH = now;
      return parsedEvents;
    } catch (error) {
      console.warn('GDACS disaster feed fetch failed:', error);
      return this.CACHE;
    }
  }
}
