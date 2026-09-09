/**
 * NASA Earth Observatory Natural Event Tracker (EONET) Service
 * Endpoint: https://eonet.gsfc.nasa.gov/api/v3/events
 * Free & Open Source - No API key required
 */

export interface EonetEvent {
  id: string;
  title: string;
  description?: string;
  category: string;
  categoryId: string;
  latitude: number;
  longitude: number;
  date: string;
  timestamp: number;
  link: string;
  magnitudeValue?: number;
  magnitudeUnit?: string;
  sources: { id: string; url: string }[];
}

export class NasaEonetService {
  private static CACHE: EonetEvent[] = [];
  private static LAST_FETCH = 0;
  private static CACHE_TTL = 300000; // 5 minutes

  /**
   * Fetches live natural events (wildfires, volcanoes, storms, icebergs, severe events) from NASA EONET.
   */
  public static async fetchNaturalEvents(limit: number = 40): Promise<EonetEvent[]> {
    const now = Date.now();
    if (this.CACHE.length > 0 && now - this.LAST_FETCH < this.CACHE_TTL) {
      return this.CACHE;
    }

    try {
      const response = await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`NASA EONET HTTP error: ${response.status}`);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.events)) {
        return this.CACHE;
      }

      const parsedEvents: EonetEvent[] = [];

      data.events.forEach((item: any) => {
        const primaryCat = item.categories && item.categories[0] ? item.categories[0] : { id: 'unknown', title: 'Environmental' };
        const geom = item.geometry && item.geometry[0];

        if (!geom || !geom.coordinates || !Array.isArray(geom.coordinates)) return;

        // EONET coordinates format: [lng, lat]
        let lng = 0;
        let lat = 0;

        if (geom.type === 'Point') {
          lng = geom.coordinates[0];
          lat = geom.coordinates[1];
        } else if (geom.type === 'Polygon' && Array.isArray(geom.coordinates[0])) {
          // Polygon center
          const coords = geom.coordinates[0];
          let sumLng = 0;
          let sumLat = 0;
          coords.forEach((c: number[]) => {
            sumLng += c[0];
            sumLat += c[1];
          });
          lng = sumLng / coords.length;
          lat = sumLat / coords.length;
        }

        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

        parsedEvents.push({
          id: item.id,
          title: item.title || 'Anomalous Environmental Event',
          description: item.description || `NASA EONET detected ${primaryCat.title} event.`,
          category: primaryCat.title || 'Environmental',
          categoryId: primaryCat.id || 'environmental',
          latitude: lat,
          longitude: lng,
          date: geom.date || item.closed || new Date().toISOString(),
          timestamp: geom.date ? new Date(geom.date).getTime() : Date.now(),
          link: item.link || item.sources?.[0]?.url || 'https://eonet.gsfc.nasa.gov',
          magnitudeValue: geom.magnitudeValue,
          magnitudeUnit: geom.magnitudeUnit,
          sources: (item.sources || []).map((s: any) => ({ id: s.id, url: s.url }))
        });
      });

      this.CACHE = parsedEvents;
      this.LAST_FETCH = now;
      return parsedEvents;
    } catch (error) {
      console.warn('NASA EONET fetch failed, utilizing cached/resilient fallback:', error);
      return this.CACHE;
    }
  }
}
