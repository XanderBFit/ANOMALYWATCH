import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, Circle, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Clock, 
  Maximize2, 
  Minimize2, 
  Info, 
  AlertTriangle, 
  Search, 
  Filter, 
  Layers, 
  ChevronRight, 
  Activity, 
  Radio, 
  Plane, 
  Eye, 
  Navigation,
  CheckCircle2,
  SlidersHorizontal,
  Download,
  TrendingUp,
  Compass,
  Sparkles,
  FileText,
  Shield,
  Bell,
  Video,
  Rss,
  Lock,
  Sun,
  Flame,
  Zap
} from 'lucide-react';
import { UFOSighting, SeismicEvent } from '../types';
import { ProgressionService } from '../services/progressionService';
import { SightingOps } from '../services/firebaseService';
import { RealWorldDataService } from '../services/realWorldDataService';
import { USGSService, USGSFeedPeriod } from '../services/usgsService';
import { SpatialPredictorService, PredictiveCorridor } from '../services/spatialPredictorService';
import { ExportService } from '../services/exportService';
import { AnomalyDetailModal } from './AnomalyDetailModal';
import SignalDensityHeatmap from './SignalDensityHeatmap';
import { ClearancePricingModal } from './ClearancePricingModal';
import { GeofencedAlertModal } from './GeofencedAlertModal';
import { CreatorExportModal } from './CreatorExportModal';
import { PodcastFeedModal } from './PodcastFeedModal';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet + React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// MapController component listens to size transitions on parent container
const MapController: React.FC<{ isExpanded: boolean; view: string; style: string }> = ({ isExpanded, view, style }) => {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const container = map.getContainer();
    if (!container) return () => clearTimeout(timer);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [map, isExpanded, view, style]);

  return null;
};

// MapFocus component smoothly centers and zooms to selected anomaly coordinate inputs
const MapFocus: React.FC<{ selectedAnomaly: UFOSighting | null; getCoords: (s: UFOSighting) => [number, number] }> = ({ selectedAnomaly, getCoords }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedAnomaly) {
      const coords = getCoords(selectedAnomaly);
      map.setView(coords, 7, { animate: true, duration: 1.5 });
    }
  }, [selectedAnomaly, map]);

  return null;
};

interface AnomalyMapProps {
  sightings?: UFOSighting[];
}

export const AnomalyMap: React.FC<AnomalyMapProps> = ({ sightings: initialSightings }) => {
  const [sightings, setSightings] = useState<UFOSighting[]>(initialSightings || []);
  const [seismicData, setSeismicData] = useState<SeismicEvent[]>([]);
  const [seismicFeedPeriod, setSeismicFeedPeriod] = useState<USGSFeedPeriod>('all_day');
  const [seismicLoading, setSeismicLoading] = useState<boolean>(false);
  const [flightData, setFlightData] = useState<any[]>([]);
  const [rfData, setRfData] = useState<any[]>([]);

  // Production Open-Source Data Pipelines
  const [nasaEvents, setNasaEvents] = useState<any[]>([]);
  const [celestrakSatellites, setCelestrakSatellites] = useState<any[]>([]);
  const [gdacsDisasters, setGdacsDisasters] = useState<any[]>([]);
  const [ndbcBuoys, setNdbcBuoys] = useState<any[]>([]);

  // Compute live seismic telemetry metrics
  const seismicSummary = useMemo(() => USGSService.getSeismicSummary(seismicData), [seismicData]);
  
  // Interactive UI Filters
  const [view, setView] = useState<'MAP' | 'TIMELINE'>('MAP');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<UFOSighting | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [mapStyle, setMapStyle] = useState<'DARK' | 'SATELLITE' | 'LIGHT'>('DARK');
  
  // Layer Toggles
  const [showSightings, setShowSightings] = useState(true);
  const [showSeismic, setShowSeismic] = useState(true);
  const [showFlights, setShowFlights] = useState(true);
  const [showRf, setShowRf] = useState(true);
  const [showNasa, setShowNasa] = useState(true);
  const [showSatellites, setShowSatellites] = useState(true);
  const [showGdacs, setShowGdacs] = useState(true);
  const [showBuoys, setShowBuoys] = useState(true);
  const [showCorridors, setShowCorridors] = useState(true);
  const [layerOpacity, setLayerOpacity] = useState<number>(0.85);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Mission Presets & Monetization Modals
  const [missionPreset, setMissionPreset] = useState<'AEROSPACE' | 'SPACE_WEATHER' | 'TECTONIC' | 'FULL'>('AEROSPACE');
  const [timeRange, setTimeRange] = useState<'24H' | '48H' | '7D' | '30D' | 'ALL'>('48H');
  const [userClearance, setUserClearance] = useState<string>(() => {
    return localStorage.getItem('anomaly_clearance_tier') || 'OBSERVER';
  });

  const [showClearanceModal, setShowClearanceModal] = useState(false);
  const [showGeofencedModal, setShowGeofencedModal] = useState(false);
  const [showMediaStudioModal, setShowMediaStudioModal] = useState(false);
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [requiredFeatureName, setRequiredFeatureName] = useState<string>('');

  // Sync user clearance on event
  useEffect(() => {
    const handleClearanceUpdate = (e: any) => {
      const tier = e.detail?.tier || localStorage.getItem('anomaly_clearance_tier') || 'OBSERVER';
      setUserClearance(tier);
    };
    window.addEventListener('anomaly-clearance-updated', handleClearanceUpdate);
    return () => window.removeEventListener('anomaly-clearance-updated', handleClearanceUpdate);
  }, []);

  const handleApplyMissionPreset = (preset: 'AEROSPACE' | 'SPACE_WEATHER' | 'TECTONIC' | 'FULL') => {
    setMissionPreset(preset);
    if (preset === 'AEROSPACE') {
      setShowSightings(true);
      setShowFlights(true);
      setShowSatellites(true);
      setShowRf(true);
      setShowSeismic(false);
      setShowNasa(false);
      setShowGdacs(false);
      setShowBuoys(false);
    } else if (preset === 'SPACE_WEATHER') {
      setShowSightings(true);
      setShowSatellites(true);
      setShowNasa(true);
      setShowRf(false);
      setShowFlights(false);
      setShowSeismic(false);
      setShowGdacs(false);
      setShowBuoys(false);
    } else if (preset === 'TECTONIC') {
      setShowSightings(true);
      setShowSeismic(true);
      setShowBuoys(true);
      setShowGdacs(true);
      setShowNasa(true);
      setShowSatellites(false);
      setShowFlights(false);
      setShowRf(false);
    } else if (preset === 'FULL') {
      setShowSightings(true);
      setShowSeismic(true);
      setShowFlights(true);
      setShowRf(true);
      setShowNasa(true);
      setShowSatellites(true);
      setShowGdacs(true);
      setShowBuoys(true);
    }
  };

  const handleSelectTimeRange = (range: '24H' | '48H' | '7D' | '30D' | 'ALL') => {
    if ((range === '7D' || range === '30D' || range === 'ALL') && userClearance === 'OBSERVER') {
      setRequiredFeatureName(`Historical Signal Archive Scrubbing (${range})`);
      setShowClearanceModal(true);
      return;
    }
    setTimeRange(range);
  };

  // Compute 24-Hour Spatial Predictive Vector Corridors
  const predictiveCorridors = useMemo(() => {
    return SpatialPredictorService.calculatePredictiveCorridors(sightings, seismicData, rfData);
  }, [sightings, seismicData, rfData]);

  useEffect(() => {
    if (initialSightings) {
      setSightings(initialSightings);
    } else {
      const unsubscribe = SightingOps.subscribeToSightings(setSightings);
      return () => unsubscribe();
    }
  }, [initialSightings]);

  useEffect(() => {
    let isMounted = true;
    setSeismicLoading(true);
    USGSService.fetchLiveEarthquakes(seismicFeedPeriod)
      .then(events => {
        if (isMounted) {
          setSeismicData(events);
          setSeismicLoading(false);
        }
      })
      .catch(err => {
        console.error("USGS earthquake fetch failed:", err);
        if (isMounted) setSeismicLoading(false);
      });

    return () => { isMounted = false; };
  }, [seismicFeedPeriod]);

  useEffect(() => {
    // Flight data from OpenSky API
    fetch('https://opensky-network.org/api/states/all?lamin=30&lomin=-120&lamax=50&lomax=-70')
      .then(res => {
        if (!res.ok) return [];
        return res.json();
      })
      .then(data => setFlightData(data.states || []))
      .catch(err => {
        // Silent block for API restrictions
      });

    // NASA EONET Natural Event Tracker
    RealWorldDataService.fetchNasaNaturalEvents(35)
      .then(events => setNasaEvents(events || []))
      .catch(err => console.error("NASA EONET fetch failed:", err));

    // NORAD CelesTrak Satellite Orbits
    RealWorldDataService.fetchCelesTrakSatellites('visual')
      .then(sats => setCelestrakSatellites(sats || []))
      .catch(err => console.error("CelesTrak fetch failed:", err));

    // UN GDACS Global Disaster Alerts
    RealWorldDataService.fetchGdacsDisasters()
      .then(disasters => setGdacsDisasters(disasters || []))
      .catch(err => console.error("GDACS fetch failed:", err));

    // NOAA NDBC Maritime Observations
    RealWorldDataService.fetchNdbcMaritimeObservations()
      .then(buoys => setNdbcBuoys(buoys || []))
      .catch(err => console.error("NDBC fetch failed:", err));

    // RF Transmitters from Local Database
    RealWorldDataService.fetchRFSignals()
      .then(signals => {
        const parsedSignals = (signals || []).map(sig => {
          let lat = 37.7749; // fallback
          let lng = -122.4194;
          if (sig.location) {
            if (sig.location === 'Pacific Ocean') { lat = 0; lng = -160; }
            else if (sig.location === 'Nevada, USA') { lat = 38.8; lng = -116.4; }
            else if (sig.location === 'North Sea') { lat = 56; lng = 3; }
            else {
              const hash = sig.location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              lat = 25 + (hash % 25);
              lng = -125 + (hash % 55);
            }
          }
          return {
            lat,
            lng,
            frequency: sig.frequency || "2400",
            title: `RF Vector ${sig.id || ''}`,
            description: sig.description || "Anomalous wireless transmission",
            location: sig.location || "Unknown Sector"
          };
        });
        setRfData(parsedSignals);
      })
      .catch(err => {
        console.error("Failed to fetch live RF data:", err);
      });
  }, []);

  const getCoords = (sighting: UFOSighting): [number, number] => {
    if (!sighting.location) return [0, 0];
    if (sighting.location === 'Pacific Ocean') return [0, -160];
    if (sighting.location === 'Nevada, USA') return [38.8, -116.4];
    if (sighting.location === 'North Sea') return [56, 3];
    
    const hash = sighting.location.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const lat = (hash % 140) - 70;
    const lng = (hash % 360) - 180;
    return [lat, lng];
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'N/A';
    try {
      if (ts.toDate) return ts.toDate().toLocaleString();
      if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
      return new Date(ts).toLocaleString();
    } catch (e) {
      return 'INVALID DATE';
    }
  };

  // Memoized Filtered Sightings
  const filteredSightings = useMemo(() => {
    return sightings.filter(s => {
      const matchesSearch = 
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSeverity = severityFilter === 'ALL' || s.severity === severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [sightings, searchQuery, severityFilter]);

  // Leaflet Tile Servers
  const tileUrls = {
    DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    SATELLITE: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    LIGHT: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png'
  };

  return (
    <div className={`relative bg-slate-950 border border-white/[0.08] rounded-3xl overflow-hidden transition-all duration-300 flex flex-col ${isExpanded ? 'fixed inset-4 z-50 shadow-[0_0_100px_rgba(0,0,0,0.85)]' : 'w-full'}`}>
      
      {/* HEADER SECTION */}
      <div className="w-full p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-[1000] border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-ufo-green/10 rounded-2xl border border-ufo-green/20">
            {view === 'MAP' ? <Globe className="w-6 h-6 text-ufo-green" /> : <Clock className="w-6 h-6 text-ufo-green" />}
          </div>
          <div>
            <h3 className="text-base font-display font-black text-white tracking-widest uppercase">GEOSPATIAL INTELLIGENCE RADAR</h3>
            <span className="font-mono text-[10px] text-slate-500 uppercase">
              {view === 'MAP' ? 'TACTICAL DEPLOYMENT RADAR FEED' : 'CHRONOLOGICAL ARCHIVE MATRIX'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Monetization Clearance Status Upgrade Button */}
          <button
            onClick={() => {
              setRequiredFeatureName('');
              setShowClearanceModal(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold border transition-all ${
              userClearance === 'ANALYST' 
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-black' 
                : userClearance === 'OPERATIVE'
                ? 'bg-ufo-green/10 border-ufo-green/40 text-ufo-green hover:bg-ufo-green hover:text-black'
                : 'bg-white/5 border-white/20 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{userClearance}: UPGRADE</span>
          </button>

          {/* Real-time Geofenced Alert Config Button */}
          <button
            onClick={() => setShowGeofencedModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[10px] font-mono font-bold hover:bg-sky-500 hover:text-black transition-all"
            title="Configure Geofenced SMS, Telegram & Discord dispatch triggers"
          >
            <Bell className="w-3.5 h-3.5 text-sky-400" />
            <span>ALERT ENGINE</span>
          </button>

          {/* Creator & Media Studio Export Button */}
          <button
            onClick={() => setShowMediaStudioModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold hover:bg-amber-500 hover:text-black transition-all"
            title="One-click PDF/PNG Dossier & Gemini Video Script Exporter"
          >
            <Video className="w-3.5 h-3.5 text-amber-400" />
            <span>MEDIA STUDIO</span>
          </button>

          {/* Subscriber RSS Podcast Feed Button */}
          <button
            onClick={() => setShowPodcastModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ufo-green/10 border border-ufo-green/30 text-ufo-green text-[10px] font-mono font-bold hover:bg-ufo-green hover:text-black transition-all"
            title="Subscriber private podcast RSS feed URL & audio briefing player"
          >
            <Rss className="w-3.5 h-3.5" />
            <span>AUDIO RSS</span>
          </button>

          {/* GIS & Intelligence Export Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold hover:bg-cyan-500 hover:text-black transition-all cursor-pointer"
              title="Export Vector Layers into QGIS / ArcGIS / KML / PDF formats"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400 hover:text-black" />
              <span>EXPORT GIS</span>
            </button>

            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-[2000] font-mono text-[11px]"
                >
                  <div className="px-3 py-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider border-b border-white/5">
                    GIS & Vector Formats
                  </div>
                  <button
                    onClick={() => {
                      ExportService.exportToGeoJSON(filteredSightings, seismicData, predictiveCorridors);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-ufo-green" />
                    <span>GeoJSON (.geojson) for QGIS/ArcGIS</span>
                  </button>
                  <button
                    onClick={() => {
                      ExportService.exportToKML(filteredSightings, predictiveCorridors);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span>KML (.kml) for Google Earth</span>
                  </button>

                  <div className="px-3 py-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider border-b border-white/5 mt-1 pt-2">
                    Executive Briefings
                  </div>
                  <button
                    onClick={() => {
                      if (filteredSightings.length > 0) {
                        ExportService.exportToPDFBrief(filteredSightings[0]);
                      }
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>PDF Intelligence Briefing</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Secret Quantum Artifact Treasure Node */}
          <button
            onClick={() => ProgressionService.discoverArtifact('ARTIFACT_SECTOR_51_DOSSIER')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold hover:bg-amber-500 hover:text-black transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            title="Classified Transponder Vector - Click to Uncover Sector 51 Intel"
          >
            <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400 hover:text-black" />
            <span>SEC-51-VECTOR</span>
          </button>

          {/* Tile Styles Selector */}
          <div className="flex bg-slate-900 border border-white/5 rounded-xl p-1 text-[10px] font-mono">
            {(['DARK', 'SATELLITE', 'LIGHT'] as const).map(style => (
              <button
                key={style}
                onClick={() => setMapStyle(style)}
                className={`px-3 py-1.5 rounded-lg transition-all ${mapStyle === style ? 'bg-ufo-green text-black font-black' : 'text-slate-400 hover:text-white'}`}
              >
                {style}
              </button>
            ))}
          </div>

          {/* Toggle Screen Mode */}
          <div className="flex bg-slate-900 border border-white/5 rounded-xl p-1 text-[10px] font-mono">
            <button
              onClick={() => setView('MAP')}
              className={`px-4 py-1.5 rounded-lg transition-all ${view === 'MAP' ? 'bg-ufo-green text-black font-black' : 'text-slate-400 hover:text-white'}`}
            >
              MAP VIEW
            </button>
            <button
              onClick={() => setView('TIMELINE')}
              className={`px-4 py-1.5 rounded-lg transition-all ${view === 'TIMELINE' ? 'bg-ufo-green text-black font-black' : 'text-slate-400 hover:text-white'}`}
            >
              TIMELINE VIEW
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-3 bg-slate-900 border border-white/5 hover:border-white/15 rounded-xl text-slate-400 hover:text-white transition-all"
            title={isExpanded ? 'Minimize View' : 'Fullscreen Radars'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* TACTICAL MISSION PRESETS BAR (SOLVES MAP NOISE & BLOAT) */}
      <div className="w-full px-6 py-3 bg-slate-900/80 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-ufo-green" /> MISSION PRESETS:
          </span>

          <button
            onClick={() => handleApplyMissionPreset('AEROSPACE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
              missionPreset === 'AEROSPACE' 
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-cyan-400" />
            <span>✈️ AEROSPACE & INTERCEPT</span>
          </button>

          <button
            onClick={() => handleApplyMissionPreset('SPACE_WEATHER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
              missionPreset === 'SPACE_WEATHER' 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>☀️ SPACE WEATHER & AURORA</span>
          </button>

          <button
            onClick={() => handleApplyMissionPreset('TECTONIC')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
              missionPreset === 'TECTONIC' 
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>🌋 TECTONIC & OCEANIC</span>
          </button>

          <button
            onClick={() => handleApplyMissionPreset('FULL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
              missionPreset === 'FULL' 
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span>🛰️ FULL COMMAND (ALL STREAMS)</span>
          </button>
        </div>

        {/* HISTORICAL SIGNAL ARCHIVE TIME SCRUB BAR (& GATE) */}
        <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10">
          <span className="text-[9px] text-slate-400 font-bold px-2 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3 text-ufo-green" /> TIME:
          </span>

          {(['24H', '48H', '7D', '30D', 'ALL'] as const).map((range) => {
            const isGated = (range === '7D' || range === '30D' || range === 'ALL') && userClearance === 'OBSERVER';
            return (
              <button
                key={range}
                onClick={() => handleSelectTimeRange(range)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1 ${
                  timeRange === range
                    ? 'bg-ufo-green text-black font-black'
                    : isGated
                    ? 'text-amber-400/80 hover:text-amber-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{range === '48H' ? '48H FREE' : range}</span>
                {isGated && <Lock className="w-2.5 h-2.5 text-amber-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* FILTER INTEGRATION CONTROLS (EASY USER INTERFACE) */}
      <div className="w-full p-6 border-b border-white/[0.05] bg-slate-950/40 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Search Search */}
        <div className="lg:col-span-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search signals, sectors, locations..."
            className="w-full pl-11 pr-4 py-3 bg-slate-900/50 hover:bg-slate-900 border border-white/5 focus:border-ufo-green/50 rounded-2xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none transition-all outline-none"
          />
        </div>

        {/* Severity Filters */}
        <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mr-2 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Priority:
          </span>
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-mono font-bold transition-all ${
                severityFilter === sev 
                  ? 'bg-white/10 text-white border border-white/20' 
                  : 'bg-white/[0.02] text-slate-500 border border-transparent hover:border-white/5 hover:text-slate-300'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Dynamic Layer Toggles with active count indicators */}
        <div className="lg:col-span-3 flex items-center justify-start lg:justify-end gap-3 flex-wrap">
          {/* Toggle Sightings */}
          <button
            onClick={() => setShowSightings(!showSightings)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-mono border transition-all ${
              showSightings 
                ? 'bg-ufo-green/10 border-ufo-green/20 text-ufo-green' 
                : 'bg-transparent border-white/5 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>SIGHTINGS ({filteredSightings.length})</span>
          </button>

          {/* Toggle Seismic with Feed Period Sub-Selector */}
          <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setShowSeismic(!showSeismic)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-mono transition-all ${
                showSeismic 
                  ? 'bg-orange-500/20 text-orange-400 font-bold' 
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${seismicLoading ? 'animate-spin text-orange-400' : ''}`} />
              <span>SEISMIC ({seismicData.length})</span>
            </button>

            {showSeismic && (
              <div className="flex items-center border-l border-white/10 pl-1 space-x-0.5">
                {[
                  { id: 'all_hour', label: '1H' },
                  { id: 'all_day', label: '24H' },
                  { id: '2.5_day', label: '2.5+' },
                  { id: '4.5_week', label: '4.5+' },
                  { id: 'significant_month', label: 'SIG' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSeismicFeedPeriod(p.id as USGSFeedPeriod)}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono transition-all ${
                      seismicFeedPeriod === p.id 
                        ? 'bg-orange-500 text-black font-black' 
                        : 'text-slate-500 hover:text-orange-300'
                    }`}
                    title={`USGS Feed: ${p.label}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Flights */}
          <button
            onClick={() => setShowFlights(!showFlights)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-mono border transition-all ${
              showFlights 
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' 
                : 'bg-transparent border-white/5 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            <span>LIVE FLIGHTS ({flightData.length})</span>
          </button>

          {/* Toggle RF Signals */}
          <button
            onClick={() => setShowRf(!showRf)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-mono border transition-all ${
              showRf 
                ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                : 'bg-transparent border-white/5 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>RF SIGNALS ({rfData.length})</span>
          </button>

          {/* Toggle NASA EONET */}
          <button
            onClick={() => setShowNasa(!showNasa)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-mono border transition-all ${
              showNasa 
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                : 'bg-transparent border-white/5 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>NASA EONET ({nasaEvents.length})</span>
          </button>

          {/* Toggle NORAD Satellites */}
          <button
            onClick={() => setShowSatellites(!showSatellites)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-mono border transition-all ${
              showSatellites 
                ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' 
                : 'bg-transparent border-white/5 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>NORAD SATS ({celestrakSatellites.length})</span>
          </button>

          {/* Toggle UN GDACS Disasters */}
          <button
            onClick={() => setShowGdacs(!showGdacs)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-mono border transition-all ${
              showGdacs 
                ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                : 'bg-transparent border-white/5 text-slate-500 hover:text-slate-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>UN GDACS ({gdacsDisasters.length})</span>
          </button>

          {/* Toggle NOAA Buoys */}
          <button
            onClick={() => setShowBuoys(!showBuoys)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-mono border transition-all ${
              showBuoys 
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' 
                : 'bg-transparent border-white/5 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-300" />
            <span>NOAA BUOYS ({ndbcBuoys.length})</span>
          </button>

          {/* Toggle Statistical Density Heatmaps & Historical Corridors */}
          <button
            onClick={() => setShowCorridors(!showCorridors)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-mono border transition-all ${
              showCorridors 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold' 
                : 'bg-transparent border-white/5 text-slate-500 hover:text-slate-400'
            }`}
            title="Statistical Density Heatmaps & Historical Corridors (Probabilistic Count-Min Sketch Model)"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>STATISTICAL DENSITY CORRIDORS ({predictiveCorridors.length})</span>
          </button>
        </div>
      </div>

      {/* OPACITY SLIDER & PROVENANCE BADGES BAR */}
      <div className="w-full px-6 py-2.5 bg-black/60 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="w-3.5 h-3.5 text-ufo-green" />
          <span>Vector Layer Opacity:</span>
          <input 
            type="range" 
            min="0.2" 
            max="1.0" 
            step="0.05"
            value={layerOpacity}
            onChange={e => setLayerOpacity(parseFloat(e.target.value))}
            className="w-24 h-1 bg-slate-800 accent-ufo-green rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-ufo-green font-bold">{Math.round(layerOpacity * 100)}%</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {showSeismic && (
            <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400 font-bold flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-orange-400 animate-pulse" />
              USGS LIVE: {seismicSummary.totalEvents} QUAKES | MAX {seismicSummary.maxMagnitude}M
              {seismicSummary.tsunamiAlertCount > 0 && (
                <span className="ml-1 text-red-400 font-black animate-ping">
                  [⚠️ {seismicSummary.tsunamiAlertCount} TSUNAMI ALERT]
                </span>
              )}
            </span>
          )}
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            OPENSKY: [LIVE FEED]
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400 font-bold">
            RF MATRIX: [AI / OSINT SYNTHESIS]
          </span>
        </div>
      </div>

      {/* CORE DISPLAY (GRID SPLIT PANELS FOR EASY INTERFACES) */}
      <div className="flex-1 w-full bg-slate-950">
        {view === 'MAP' ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 w-full h-[660px]">
            {/* XL-9: LEAFLET GLOBAL GRID MAP CONTAINER */}
            <div className="xl:col-span-8 w-full h-full relative border-r border-white/[0.05]">
              <MapContainer 
                center={[20, 0]} 
                zoom={2.2} 
                scrollWheelZoom={true}
                preferCanvas={true}
                className="w-full h-full"
                style={{ background: '#020617' }}
              >
                <MapController isExpanded={isExpanded} view={view} style={mapStyle} />
                <MapFocus selectedAnomaly={selectedAnomaly} getCoords={getCoords} />
                
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url={tileUrls[mapStyle]}
                />

                {/* 24-Hour Spatial Predictive Vector Corridors */}
                {showCorridors && predictiveCorridors.map((c) => (
                  <React.Fragment key={c.id}>
                    <Polyline
                      positions={c.corridorPolyline}
                      pathOptions={{
                        color: c.threatLevel === 'CRITICAL' ? '#ef4444' : c.threatLevel === 'HIGH' ? '#f59e0b' : '#00ff9d',
                        weight: 3,
                        dashArray: '8, 8',
                        opacity: layerOpacity * 0.9
                      }}
                    >
                      <Popup>
                        <div className="font-mono text-xs p-1 space-y-1">
                          <span className="text-emerald-400 font-bold uppercase block border-b border-white/10 pb-1">
                            {c.clusterName}
                          </span>
                          <div>Bearing: <span className="text-white font-bold">{c.bearingDegrees}°</span></div>
                          <div>Projected Speed: <span className="text-white font-bold">{c.estimatedSpeedKnots} knots</span></div>
                          <div>Density/Threat Score: <span className="text-amber-400 font-bold">{c.densityScore}/100 ({c.threatLevel})</span></div>
                          <div>Anomalies in Cluster: <span className="text-white font-bold">{c.associatedAnomaliesCount}</span></div>
                        </div>
                      </Popup>
                    </Polyline>

                    {/* Projected 24h Spatial Waypoint Circles */}
                    {c.projectedWaypoints.map((wp, idx) => (
                      <Circle
                        key={`${c.id}-wp-${idx}`}
                        center={[wp.lat, wp.lng]}
                        radius={wp.radiusKm * 1000}
                        pathOptions={{
                          color: '#00ff9d',
                          fillColor: '#00ff9d',
                          fillOpacity: 0.08,
                          weight: 1,
                          dashArray: '4, 4'
                        }}
                      />
                    ))}
                  </React.Fragment>
                ))}
                
                {showSightings && (
                  <>
                    <SignalDensityHeatmap points={filteredSightings.map(s => [...getCoords(s), 0.55])} />
                    <MarkerClusterGroup>
                      {filteredSightings.map(sighting => (
                        <Marker
                          key={sighting.id}
                          position={getCoords(sighting)}
                          icon={L.divIcon({
                            className: `custom-marker-${sighting.severity.toLowerCase()}`,
                            html: `<div style="background-color: ${
                              sighting.severity === 'CRITICAL' ? '#ef4444' : 
                              sighting.severity === 'HIGH' ? '#eab308' : 
                              sighting.severity === 'MEDIUM' ? '#3b82f6' : '#22c55e'
                            }; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.65); outline: 3px solid ${
                              sighting.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.1)'
                            }"></div>`,
                            iconSize: [14, 14],
                          })}
                          eventHandlers={{
                            click: () => setSelectedAnomaly(sighting)
                          }}
                        />
                      ))}
                    </MarkerClusterGroup>
                  </>
                )}

                {showSeismic && seismicData.map((s, i) => {
                  const radius = Math.max(4, Math.min((s.mag || 1) * 2.8, 18));
                  const isHighMag = s.mag >= 5.0;
                  const isCriticalMag = s.mag >= 6.5;
                  const hasTsunami = s.tsunami === 1;

                  const strokeColor = hasTsunami || isCriticalMag ? '#ef4444' : isHighMag ? '#f97316' : s.mag >= 3.0 ? '#eab308' : '#22c55e';
                  const fillColor = hasTsunami || isCriticalMag ? '#dc2626' : isHighMag ? '#ea580c' : s.mag >= 3.0 ? '#ca8a04' : '#16a34a';

                  return (
                    <CircleMarker
                      key={s.id || `seismic-${i}`}
                      center={[s.latitude, s.longitude]}
                      radius={radius}
                      pathOptions={{ 
                        color: strokeColor, 
                        fillColor: fillColor, 
                        fillOpacity: layerOpacity * 0.7,
                        weight: isHighMag || hasTsunami ? 2.5 : 1.2
                      }}
                    >
                      <Popup>
                        <div className="font-mono text-xs p-1 min-w-[220px] space-y-1.5">
                          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                            <span className="text-orange-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 text-orange-400" />
                              USGS Seismic Telemetry
                            </span>
                            {hasTsunami && (
                              <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[9px] border border-red-500/30 animate-pulse">
                                TSUNAMI ALERT
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline justify-between pt-1">
                            <div className="text-white font-bold text-base">
                              {s.mag} <span className="text-slate-400 text-xs font-normal">Mag ({s.magType || 'ML'})</span>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                              isCriticalMag ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                              isHighMag ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                              'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            }`}>
                              {isCriticalMag ? 'CRITICAL' : isHighMag ? 'HIGH' : 'STABLE'}
                            </span>
                          </div>
                          <div className="text-slate-200 text-xs font-semibold leading-snug">{s.place}</div>
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1 border-t border-white/5">
                            <div>Depth: <span className="text-slate-200 font-bold">{Math.round((s.depth || 0) * 10) / 10} km</span></div>
                            <div>Status: <span className="text-slate-200 font-bold uppercase">{s.status || 'REVIEWED'}</span></div>
                          </div>
                          <div className="text-[10px] text-slate-500">{new Date(s.time).toLocaleString()}</div>
                          {s.url && (
                            <a 
                              href={s.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="mt-2 block text-center px-2 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg text-[10px] text-orange-400 font-bold tracking-wider uppercase transition-colors"
                            >
                              USGS Event Dossier ↗
                            </a>
                          )}
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}

                {showFlights && flightData.map((f, i) => (
                  <CircleMarker
                    key={`flight-${i}`}
                    center={[f[6], f[5]]}
                    radius={2}
                    pathOptions={{ color: '#06b6d4', fillColor: '#0891b2', fillOpacity: 0.8 }}
                  >
                    <Popup>
                      <div className="font-mono text-[11px] p-1">
                        <div className="text-cyan-400 font-bold uppercase tracking-wider mb-1">Active Flight Tracker</div>
                        <div className="text-white">Callsign: <span className="font-bold text-white">{f[1] || 'COMM_UPLINK'}</span></div>
                        <div className="text-slate-400 mt-1">Speed Index: {Math.round(f[9] || 0)}m/s</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {showRf && rfData.map((r, i) => (
                  <CircleMarker
                    key={`rf-${i}`}
                    center={[r.lat, r.lng]}
                    radius={4}
                    pathOptions={{ color: '#b026ff', fillColor: '#818cf8', fillOpacity: 0.65 }}
                  >
                    <Popup>
                      <div className="font-mono text-xs p-1">
                        <strong className="text-indigo-400 font-bold uppercase">{r.title || "Wireless Vector"}</strong>
                        <div className="mt-1 text-slate-200">Frequency: <span className="font-bold text-white">{r.frequency} MHz</span></div>
                        {r.description && <div className="mt-1 text-[10px] text-slate-400 leading-normal italic">{r.description}</div>}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* NASA EONET Events */}
                {showNasa && nasaEvents.map((ev, i) => (
                  <CircleMarker
                    key={`nasa-${ev.id || i}`}
                    center={[ev.latitude, ev.longitude]}
                    radius={6}
                    pathOptions={{ color: '#f59e0b', fillColor: '#d97706', fillOpacity: 0.8 }}
                  >
                    <Popup>
                      <div className="font-mono text-xs p-1 min-w-[200px]">
                        <span className="text-amber-400 font-bold uppercase block text-[10px] border-b border-white/10 pb-1">
                          NASA EONET: {ev.category}
                        </span>
                        <div className="text-white font-bold text-xs mt-1">{ev.title}</div>
                        <div className="text-slate-300 text-[10px] mt-1">{ev.description}</div>
                        <a 
                          href={ev.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="mt-2 block text-center px-2 py-1 bg-amber-500/20 text-amber-300 rounded text-[9px] font-bold uppercase border border-amber-500/30"
                        >
                          NASA Source Telemetry ↗
                        </a>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* NORAD CelesTrak Satellite Orbit Passes */}
                {showSatellites && celestrakSatellites.map((sat, i) => (
                  <CircleMarker
                    key={`sat-${sat.noradId || i}`}
                    center={[sat.latitude, sat.longitude]}
                    radius={3.5}
                    pathOptions={{ color: '#38bdf8', fillColor: '#0284c7', fillOpacity: 0.85 }}
                  >
                    <Popup>
                      <div className="font-mono text-xs p-1 min-w-[190px]">
                        <span className="text-sky-400 font-bold uppercase block text-[10px] border-b border-white/10 pb-1">
                          NORAD #{sat.noradId}: {sat.category}
                        </span>
                        <div className="text-white font-bold text-xs mt-1">{sat.name}</div>
                        <div className="text-slate-300 text-[10px] mt-1">Altitude: <span className="text-sky-300 font-bold">{sat.altitudeKm} km</span></div>
                        <div className="text-slate-300 text-[10px]">Inclination: {sat.inclination}°</div>
                        <div className="text-slate-400 text-[9px] mt-1 italic">Sub-satellite coordinate projection</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* UN GDACS Global Disaster Alerts */}
                {showGdacs && gdacsDisasters.map((g, i) => (
                  <CircleMarker
                    key={`gdacs-${g.id || i}`}
                    center={[g.latitude, g.longitude]}
                    radius={g.alertLevel === 'RED' ? 9 : g.alertLevel === 'ORANGE' ? 7 : 5}
                    pathOptions={{ 
                      color: g.alertLevel === 'RED' ? '#ef4444' : g.alertLevel === 'ORANGE' ? '#f97316' : '#22c55e', 
                      fillColor: g.alertLevel === 'RED' ? '#dc2626' : g.alertLevel === 'ORANGE' ? '#ea580c' : '#16a34a', 
                      fillOpacity: 0.85 
                    }}
                  >
                    <Popup>
                      <div className="font-mono text-xs p-1 min-w-[210px]">
                        <div className="flex items-center justify-between border-b border-white/10 pb-1">
                          <span className="text-red-400 font-bold uppercase text-[10px]">UN GDACS {g.eventType}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                            g.alertLevel === 'RED' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                          }`}>
                            {g.alertLevel} ALERT
                          </span>
                        </div>
                        <div className="text-white font-bold text-xs mt-1">{g.eventName}</div>
                        <div className="text-slate-300 text-[10px] mt-0.5">{g.country}</div>
                        <div className="text-slate-400 text-[10px] mt-1">{g.description}</div>
                        {g.populationImpacted && (
                          <div className="text-amber-300 text-[10px] font-bold mt-1">Impact: {g.populationImpacted}</div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {/* NOAA NDBC Marine Buoys */}
                {showBuoys && ndbcBuoys.map((b, i) => (
                  <CircleMarker
                    key={`buoy-${b.stationId || i}`}
                    center={[b.latitude, b.longitude]}
                    radius={b.anomalyFlag ? 6 : 3.5}
                    pathOptions={{ 
                      color: b.anomalyFlag ? '#22d3ee' : '#0891b2', 
                      fillColor: b.anomalyFlag ? '#06b6d4' : '#155e75', 
                      fillOpacity: 0.8 
                    }}
                  >
                    <Popup>
                      <div className="font-mono text-xs p-1 min-w-[190px]">
                        <span className="text-cyan-300 font-bold uppercase block text-[10px] border-b border-white/10 pb-1">
                          NOAA NDBC Buoy #{b.stationId}
                        </span>
                        <div className="text-slate-200 text-[10px] mt-1">Wave Height: <span className="text-white font-bold">{b.waveHeightM} m</span></div>
                        <div className="text-slate-200 text-[10px]">Wind Gust: <span className="text-white font-bold">{b.windGustMs} m/s</span></div>
                        <div className="text-slate-200 text-[10px]">Pressure: <span className="text-white font-bold">{b.pressureHpa} hPa</span></div>
                        <div className="text-slate-200 text-[10px]">Sea Temp: <span className="text-white font-bold">{b.waterTempC} °C</span></div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>

              <div className="absolute bottom-5 left-5 z-[1000] bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-[9px] font-mono text-slate-300 shadow-2xl space-y-2">
                <span className="text-white font-bold block uppercase tracking-wider pb-1.5 border-b border-white/5">Active Legend</span>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> Critical Severity</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></div> High Severity</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div> Medium Severity</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div> Low Severity</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> Seismic Shockwave</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> NASA EONET Event</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-sky-400"></div> NORAD Satellite Pass</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-400"></div> UN GDACS Disaster Alert</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-cyan-300"></div> NOAA Marine Buoy</div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#b026ff]"></div> RF Wireless Hub</div>
              </div>
            </div>

            {/* XL-3: ACTIVE SIGHTING INTEGRATED DISPATCH LIST */}
            <div className="xl:col-span-4 flex flex-col h-full bg-slate-950/80">
              <div className="p-4 border-b border-white/[0.05] bg-slate-900/[0.04] flex justify-between items-center bg-white/[0.01]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-ufo-green shadow-[0_0_8px_#00ff9d]"></div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black">Active Dispatch Queue</span>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 bg-white/5 text-slate-400 rounded-full">{filteredSightings.length} Match</span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {filteredSightings.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-600 font-mono text-xs">
                    <SlidersHorizontal className="w-8 h-8 opacity-25 mb-3" />
                    <span>No sightings match the<br />current digital filter.</span>
                  </div>
                ) : (
                  filteredSightings.map(sighting => (
                    <div
                      key={sighting.id}
                      onClick={() => setSelectedAnomaly(sighting)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                        selectedAnomaly?.id === sighting.id
                          ? 'bg-ufo-green/10 border-ufo-green/35 shadow-[0_0_15px_rgba(0,255,157,0.03)]'
                          : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03] hover:border-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <span className="text-[9px] font-mono text-slate-500">{formatTimestamp(sighting.timestamp)}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded border leading-none font-bold ${
                          sighting.severity === 'CRITICAL' ? 'border-red-500/30 text-red-400 bg-red-950/20' :
                          sighting.severity === 'HIGH' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-950/20' :
                          sighting.severity === 'MEDIUM' ? 'border-blue-500/30 text-blue-400 bg-blue-950/20' :
                          'border-green-500/30 text-green-400 bg-green-950/20'
                        }`}>
                          {sighting.severity}
                        </span>
                      </div>
                      
                      <h4 className="text-xs font-mono font-bold text-white mb-1 group-hover:text-ufo-green transition-colors uppercase tracking-wider">{sighting.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">{sighting.description}</p>
                      
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                        <span className="flex items-center gap-1"><span className="text-slate-600">Loc:</span> {sighting.location}</span>
                        <span className="text-ufo-green flex items-center gap-1 font-black">
                          [ SELECT <Navigation className="w-2.5 h-2.5" /> ]
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* TIMELINE SEQUENCE LIST VIEW */
          <div className="w-full h-[660px] p-8 overflow-y-auto custom-scrollbar bg-slate-950">
            <div className="max-w-4xl mx-auto relative border-l border-white/[0.08] ml-4 space-y-8 pb-8">
              {filteredSightings.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-600 font-mono text-xs">
                  <Clock className="w-10 h-10 opacity-20 mb-4" />
                  <span>No events match current filter matrix.</span>
                </div>
              ) : (
                [...filteredSightings].sort((a, b) => {
                  const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
                  const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
                  return timeB - timeA;
                }).map((sighting, idx) => (
                  <motion.div
                    key={sighting.id}
                    initial={{ opacity: 0, x: -25 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="relative pl-8 group cursor-pointer"
                    onClick={() => setSelectedAnomaly(sighting)}
                  >
                    <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-ufo-green shadow-[0_0_10px_#00ff9d] group-hover:scale-150 transition-transform" />
                    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 hover:border-ufo-green/30 hover:bg-slate-900/60 transition-all">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <span className="text-[10px] font-mono text-ufo-green">{formatTimestamp(sighting.timestamp)}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded border leading-none font-bold ${
                          sighting.severity === 'CRITICAL' ? 'border-red-500/20 text-red-400 bg-red-950/10' : 'border-ufo-green/20 text-ufo-green bg-ufo-green/10'
                        }`}>
                          {sighting.severity}
                        </span>
                      </div>
                      <h4 className="text-sm font-mono font-bold text-white mb-2 uppercase tracking-wide">{sighting.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">{sighting.description}</p>
                      <div className="mt-4 flex flex-wrap gap-4 items-center text-[10px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1.5"><Globe className="w-3C h-3" /> {sighting.location}</span>
                        <span className="flex items-center gap-1.5"><SlidersHorizontal className="w-3C h-3" /> {sighting.category}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* DETAILED DICTIONING MODAL OVERLAY */}
      <AnimatePresence>
        {selectedAnomaly && (
          <AnomalyDetailModal 
            anomaly={selectedAnomaly} 
            onClose={() => setSelectedAnomaly(null)} 
          />
        )}
      </AnimatePresence>

      {/* MONETIZATION & SUBSCRIPTION CLEARANCE MATRIX MODAL */}
      <ClearancePricingModal
        isOpen={showClearanceModal}
        onClose={() => setShowClearanceModal(false)}
        requiredFeature={requiredFeatureName}
        onUpgradeSuccess={(tier) => setUserClearance(tier)}
      />

      {/* GEOFENCED REAL-TIME DISPATCH ALERT ENGINE MODAL */}
      <GeofencedAlertModal
        isOpen={showGeofencedModal}
        onClose={() => setShowGeofencedModal(false)}
        userClearance={userClearance}
        onNeedUpgrade={() => {
          setShowGeofencedModal(false);
          setRequiredFeatureName('Real-Time Geofenced SMS & Telegram Dispatch Alerts');
          setShowClearanceModal(true);
        }}
      />

      {/* CREATOR & MEDIA STUDIO ASSET PACK EXPORTER MODAL */}
      <CreatorExportModal
        isOpen={showMediaStudioModal}
        onClose={() => setShowMediaStudioModal(false)}
        sighting={selectedAnomaly}
        userClearance={userClearance}
        onNeedUpgrade={() => {
          setShowMediaStudioModal(false);
          setRequiredFeatureName('Media Studio Broadcast Asset Packs (PDF & Video Script)');
          setShowClearanceModal(true);
        }}
      />

      {/* PRIVATE SUBSCRIBER PODCAST & RSS FEED MODAL */}
      <PodcastFeedModal
        isOpen={showPodcastModal}
        onClose={() => setShowPodcastModal(false)}
        userClearance={userClearance}
        onNeedUpgrade={() => {
          setShowPodcastModal(false);
          setRequiredFeatureName('Private Subscriber RSS Podcast Feed');
          setShowClearanceModal(true);
        }}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 157, 0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 157, 0.3);
        }
      `}</style>
    </div>
  );
};
