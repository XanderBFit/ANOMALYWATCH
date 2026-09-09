# Reddit OSINT & Tech Launch Threads

## Thread 1: r/OSINT & r/webdev
**Title**: Why I built a real-time OSINT dashboard aggregating USGS seismic, ADS-B transponders, NORAD orbits, and solar telemetry (with zero server tracking)

**Body**:
Hey everyone,

Wanted to share an OSINT tool I've been building called **Anomaly Watch** (https://anomalywatch.ai.studio/).

The goal was to solve a specific problem: when an anomalous aerial event or unexplained tremor occurs, how quickly can you rule out conventional causes using open-source telemetry?

### The Architecture:
- **Frontend**: React 18 + TypeScript + Tailwind CSS with a dark tactical glassmorphism HUD.
- **Geospatial**: Leaflet GIS with dynamic vector layers for live ADS-B transponders (OpenSky), 25,000+ NORAD satellites (CelesTrak), seismic shocks (USGS), and space weather (NOAA SWPC).
- **In-Memory Probabilistic Math**: Count-Min Sketch + Bloom Filters in TypeScript for high-speed spatial density tracking and duplicate suppression.
- **AI Verification**: Gemini with Google Web Search grounding to auto-compile evidence dossiers.
- **Offline First**: IndexedDB (`idb`) cache ensures field operatives maintain access even without internet.

Check it out live at https://anomalywatch.ai.studio/ — feedback on additional open-source sensors or UI improvements is welcome!
