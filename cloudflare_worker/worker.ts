/**
 * Anomaly Watch - Cloudflare Worker Telemetry Ingress Proxy
 * Proxies, normalizes, and caches 8 multi-sensor feeds with CORS headers.
 */

export interface Env {
  TELEMETRY_CACHE?: KVNamespace;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    let cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      let data: any = null;
      let ttl = 300; // default 5 min edge cache

      switch (url.pathname) {
        // 1. USGS Seismic Telemetry (M2.5+ Past 24h)
        case "/api/telemetry/usgs": {
          ttl = 120; // 2 min
          const res = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson");
          const json: any = await res.json();
          data = {
            source: "USGS",
            timestamp: new Date().toISOString(),
            count: json.features?.length || 0,
            features: (json.features || []).map((f: any) => ({
              id: `usgs-${f.id}`,
              type: "Feature",
              geometry: f.geometry,
              properties: {
                title: f.properties.title,
                mag: f.properties.mag,
                place: f.properties.place,
                time: f.properties.time,
                url: f.properties.url,
                severity: f.properties.mag >= 6.0 ? "CRITICAL" : f.properties.mag >= 4.5 ? "HIGH" : "MEDIUM",
              },
            })),
          };
          break;
        }

        // 2. NOAA Space Weather (Kp Index & Solar X-Ray Flux)
        case "/api/telemetry/noaa-swpc": {
          ttl = 180; // 3 min
          const [kpRes, flareRes] = await Promise.all([
            fetch("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"),
            fetch("https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json"),
          ]);
          const kpData: any = await kpRes.json();
          const flareData: any = await flareRes.json();
          const latestKp = kpData[kpData.length - 1] || {};
          const latestFlare = flareData[flareData.length - 1] || {};

          data = {
            source: "NOAA_SWPC",
            timestamp: new Date().toISOString(),
            kpIndex: {
              value: latestKp.kp_index || 0,
              timeTag: latestKp.time_tag || "",
              status: (latestKp.kp_index || 0) >= 7 ? "G3_G5_SUPERSTORM" : (latestKp.kp_index || 0) >= 5 ? "G1_G2_STORM" : "NORMAL",
            },
            xrayFlux: {
              flux: latestFlare.flux || 0,
              energy: latestFlare.energy || "",
              timeTag: latestFlare.time_tag || "",
            },
          };
          break;
        }

        // 3. OpenSky Network ADS-B Transponders (Bounded Sector or Global Active)
        case "/api/telemetry/opensky": {
          ttl = 45; // 45 sec
          const lamin = url.searchParams.get("lamin") || "25.0";
          const lomin = url.searchParams.get("lomin") || "-125.0";
          const lamax = url.searchParams.get("lamax") || "50.0";
          const lomax = url.searchParams.get("lomax") || "-65.0";

          const openSkyUrl = `https://opensky-network.org/api/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
          const res = await fetch(openSkyUrl, {
            headers: { "User-Agent": "AnomalyWatch/2.0 (OSINT Telemetry Ingress)" },
          });

          if (!res.ok) {
            data = { source: "OpenSky", status: "RATE_LIMITED_FALLBACK", states: [] };
          } else {
            const json: any = await res.json();
            data = {
              source: "OpenSky",
              timestamp: new Date().toISOString(),
              count: (json.states || []).length,
              states: (json.states || []).slice(0, 150).map((s: any[]) => ({
                icao24: s[0],
                callsign: (s[1] || "").trim(),
                originCountry: s[2],
                longitude: s[5],
                latitude: s[6],
                baroAltitudeMeters: s[7],
                velocityMps: s[9],
                trueTrackDegrees: s[10],
                verticalRateMps: s[11],
                squawk: s[14],
              })),
            };
          }
          break;
        }

        // 4. NORAD CelesTrak Satellite Orbits (Bright Satellites & Space Stations)
        case "/api/telemetry/celestrak": {
          ttl = 3600; // 1 hour
          const group = url.searchParams.get("group") || "bright";
          const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`);
          const json: any = await res.json();
          data = {
            source: "NORAD_CelesTrak",
            timestamp: new Date().toISOString(),
            group,
            count: (json || []).length,
            satellites: (json || []).slice(0, 200).map((sat: any) => ({
              noradId: sat.NORAD_CAT_ID,
              name: sat.OBJECT_NAME,
              intlDes: sat.INTLDES,
              epoch: sat.EPOCH,
              meanMotion: sat.MEAN_MOTION,
              eccentricity: sat.ECCENTRICITY,
              inclination: sat.INCLINATION,
              raan: sat.RA_OF_ASC_NODE,
              periodMin: sat.PERIOD || (1440 / (sat.MEAN_MOTION || 1)),
            })),
          };
          break;
        }

        // 5. NASA EONET v3 Natural Events
        case "/api/telemetry/nasa-eonet": {
          ttl = 600; // 10 min
          const res = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50");
          const json: any = await res.json();
          data = {
            source: "NASA_EONET",
            timestamp: new Date().toISOString(),
            events: (json.events || []).map((ev: any) => ({
              id: ev.id,
              title: ev.title,
              category: ev.categories?.[0]?.title || "Natural Disaster",
              geometry: ev.geometry,
            })),
          };
          break;
        }

        // 6. UN GDACS Disaster Alerts
        case "/api/telemetry/un-gdacs": {
          ttl = 600; // 10 min
          const res = await fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventtypes=EQ,TC,FL,VO&alertlevel=Red,Orange,Green");
          const json: any = await res.json();
          data = {
            source: "UN_GDACS",
            timestamp: new Date().toISOString(),
            alerts: (json || []).slice(0, 30),
          };
          break;
        }

        // 7. NOAA NDBC Marine Buoys
        case "/api/telemetry/noaa-buoys": {
          ttl = 900; // 15 min
          const res = await fetch("https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt");
          const text = await res.text();
          const lines = text.trim().split("\n").slice(2, 60);
          const buoys = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            return {
              stationId: parts[0],
              lat: parseFloat(parts[1]),
              lng: parseFloat(parts[2]),
              waveHeightMeters: parseFloat(parts[8]) || null,
              dominantPeriodSec: parseFloat(parts[9]) || null,
              pressureHpa: parseFloat(parts[12]) || null,
              waterTempC: parseFloat(parts[14]) || null,
            };
          }).filter(b => !isNaN(b.lat) && !isNaN(b.lng));

          data = {
            source: "NOAA_NDBC",
            timestamp: new Date().toISOString(),
            buoys,
          };
          break;
        }

        // 8. Reddit OSINT Ingress
        case "/api/telemetry/reddit-osint": {
          ttl = 180; // 3 min
          const sub = url.searchParams.get("sub") || "UFOs";
          const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=25`, {
            headers: { "User-Agent": "AnomalyWatch/2.0 (OSINT Ingress)" },
          });
          const json: any = await res.json();
          const posts = (json.data?.children || []).map((c: any) => ({
            id: c.data.id,
            title: c.data.title,
            author: c.data.author,
            createdUtc: c.data.created_utc,
            permalink: `https://reddit.com${c.data.permalink}`,
            score: c.data.score,
            numComments: c.data.num_comments,
            thumbnail: c.data.thumbnail && c.data.thumbnail.startsWith("http") ? c.data.thumbnail : null,
          }));

          data = {
            source: `Reddit_r_${sub}`,
            timestamp: new Date().toISOString(),
            posts,
          };
          break;
        }

        default:
          return new Response(JSON.stringify({ error: "Endpoint not found" }), { status: 404, headers: CORS_HEADERS });
      }

      const response = new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Cache-Control": `public, max-age=${ttl}, s-maxage=${ttl}`,
        },
      });

      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || "Ingress error" }), {
        status: 500,
        headers: CORS_HEADERS,
      });
    }
  },
};
