# Hacker News Show HN Launch Submission

**Title**: Show HN: Anomaly Watch – Real-time OSINT & multi-sensor anomaly correlation platform

**URL**: https://anomalywatch.ai.studio/

**Content / First Comment**:
Hey HN,

I built **Anomaly Watch** (https://anomalywatch.ai.studio/), a real-time OSINT surveillance and multi-sensor correlation platform designed to track anomalous aerial, seismic, and space weather phenomena without the noise and pseudoscience.

### The Problem
When unconfirmed UAP reports, sonic booms, or strange radar returns occur, researchers and analysts have to jump across 5 different disconnected tabs: checking FlightRadar24 for commercial transponders, CelesTrak for Starlink/satellite orbits, NOAA for geomagnetic storms/auroras, and USGS for seismic shocks. By the time you correlate the data, hours have passed.

### How It Works & Tech Stack
1. **Multi-Sensor Edge Ingress**: A serverless Cloudflare Worker ingests and normalizes 8 open telemetry feeds (USGS Seismic, OpenSky Network ADS-B, NOAA SWPC space weather, NORAD CelesTrak orbits, NASA EONET, UN GDACS, and NOAA NDBC buoys).
2. **In-Memory Spatial Computing**: Implemented custom **Count-Min Sketch** and **Bloom Filter** algorithms in TypeScript (`ChronoEventSketcher`) to compute real-time spatial density heatmaps and suppress duplicate reports directly in browser RAM without database query bloat.
3. **AI Web Search Grounding**: Uses the `@google/genai` TypeScript SDK with Google Web Search grounding to cross-reference unconfirmed reports with aviation news, generating structured case dossiers (`CASE-XXXX`) and synthesized tactical audio briefs.
4. **Local-First / Offline Vault**: Powered by IndexedDB (`idb`) so field operatives in remote areas maintain full map and dossier caching even when disconnected.

### Privacy & Business Model
- Zero invasive tracking, open guest mode without required signups.
- Core telemetry and live radar map are 100% free. Monetization comes from real-time geofenced SMS/Telegram alerts and broadcast-ready media dossier exports for content creators.

I'd love to hear your feedback on the UI density, data correlation methodology, and potential edge-case false positives to add to the elimination matrix!
