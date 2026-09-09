import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  FileText, 
  Satellite, 
  Navigation, 
  Compass, 
  X, 
  ArrowRight,
  Sparkles,
  Radio,
  Layers,
  CornerDownLeft
} from 'lucide-react';
import { AppView, UFOSighting } from '../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSighting?: (sighting: UFOSighting) => void;
  onSelectLocation?: (lat: number, lng: number, label: string) => void;
  onNavigateView?: (view: AppView) => void;
  sightings?: UFOSighting[];
}

type PaletteCategory = 'ALL' | 'CASES' | 'BASES' | 'SATELLITES' | 'NAV';

interface QuickSearchItem {
  id: string;
  type: 'CASE' | 'BASE' | 'SATELLITE' | 'VIEW' | 'COORDINATE';
  category: PaletteCategory;
  title: string;
  subtitle: string;
  badge: string;
  action: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectSighting,
  onSelectLocation,
  onNavigateView,
  sightings = []
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PaletteCategory>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Static Strategic Locations / Military Airbases
  const strategicBases = [
    { name: 'Groom Lake / Area 51 (Nevada)', lat: 37.235, lng: -115.811, code: 'KXTA' },
    { name: 'Nellis Air Force Base (Las Vegas)', lat: 36.236, lng: -115.058, code: 'KLSV' },
    { name: 'Eglin AFB / Gulf Test Range (Florida)', lat: 30.483, lng: -86.525, code: 'VPS' },
    { name: 'Pine Gap Defense Facility (Australia)', lat: -23.799, lng: 133.737, code: 'US-AU' },
    { name: 'Vandenberg Space Force Base (California)', lat: 34.742, lng: -120.572, code: 'KVBG' },
    { name: 'Lajes Field Air Base (Azores Islands)', lat: 38.761, lng: -27.090, code: 'LPLA' },
    { name: 'Cape Canaveral Space Force Station (Florida)', lat: 28.392, lng: -80.607, code: 'CCAFS' }
  ];

  // Static NORAD Satellites
  const noradSatellites = [
    { id: '25544', name: 'International Space Station (ISS)', lat: 51.64, lng: -0.12, type: 'LEO Orbit' },
    { id: '48274', name: 'Starlink Constellation (SpaceX)', lat: 34.20, lng: -118.40, type: 'Communications' },
    { id: '20580', name: 'Hubble Space Telescope (HST)', lat: 28.50, lng: -80.60, type: 'Observatory' },
    { id: '43013', name: 'NOAA-20 Weather Polar Orbit', lat: 60.10, lng: 24.90, type: 'Space Weather' }
  ];

  // System Navigation Views
  const navTargets = [
    { view: 'dashboard' as AppView, name: 'Command Center & Tactical Overview', desc: '4-Quadrant Bento Grid & Geospatial Radar' },
    { view: 'patternEngine' as AppView, name: 'Pattern Engine & Correlation Matrix', desc: 'Recharts temporal density & Bayesian analytics' },
    { view: 'map' as AppView, name: 'Geospatial Radar Map (Full Canvas)', desc: 'Real-time multi-sensor geospatial tracking canvas' },
    { view: 'chatroom' as AppView, name: 'IRC Comms Chatroom (Freq-99)', desc: 'Live tactical encrypted field operative chat' },
    { view: 'briefing' as AppView, name: 'News Wire & Decrypted AI Daily Brief', desc: 'Verified news feeds and deep web search grounding' },
    { view: 'opslog' as AppView, name: 'Operational Field Logs & Dossier Archive', desc: 'User logged sightings and cryptographic vault' },
    { view: 'nexus' as AppView, name: 'Signal Nexus Wireless Relay', desc: 'Multi-frequency spectrum analyzer' },
    { view: 'analyzer' as AppView, name: 'Forensic Lab & Deep Scan', desc: 'Coordinate intelligence and image analysis' },
  ];

  // Build items list filtered by search query and category
  const allItems: QuickSearchItem[] = [];

  // Parse coordinate input if query looks like "37.23, -115.81"
  const coordMatch = query.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[3]);
    allItems.push({
      id: `coord-${lat}-${lng}`,
      type: 'COORDINATE',
      category: 'BASES',
      title: `Jump to GPS Coordinates: ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
      subtitle: 'Focus GIS Radar Map camera on target coordinate',
      badge: 'GPS TARGET',
      action: () => {
        if (onSelectLocation) onSelectLocation(lat, lng, `GPS (${lat}, ${lng})`);
        onClose();
      }
    });
  }

  // Filter Sighting Cases
  sightings.forEach((s) => {
    const locationStr = s.locationName || s.location || '';
    const match = !query || 
      s.title.toLowerCase().includes(query.toLowerCase()) || 
      s.id.toLowerCase().includes(query.toLowerCase()) ||
      locationStr.toLowerCase().includes(query.toLowerCase()) ||
      (s.category || '').toLowerCase().includes(query.toLowerCase());

    if (match) {
      allItems.push({
        id: `sighting-${s.id}`,
        type: 'CASE',
        category: 'CASES',
        title: s.title,
        subtitle: `ID: CASE-${s.id.slice(-6)} • ${locationStr || 'Unmarked Airspace'}`,
        badge: s.severity || 'GRADE X',
        action: () => {
          if (onSelectSighting) onSelectSighting(s);
          onClose();
        }
      });
    }
  });

  // Filter Strategic Airbases
  strategicBases.forEach((b) => {
    const match = !query || b.name.toLowerCase().includes(query.toLowerCase()) || b.code.toLowerCase().includes(query.toLowerCase());
    if (match) {
      allItems.push({
        id: `base-${b.code}`,
        type: 'BASE',
        category: 'BASES',
        title: b.name,
        subtitle: `Airbase ICAO: ${b.code} • Lat:${b.lat}, Lng:${b.lng}`,
        badge: 'STRATEGIC SITE',
        action: () => {
          if (onSelectLocation) onSelectLocation(b.lat, b.lng, b.name);
          onClose();
        }
      });
    }
  });

  // Filter Satellites
  noradSatellites.forEach((sat) => {
    const match = !query || sat.name.toLowerCase().includes(query.toLowerCase()) || sat.id.includes(query);
    if (match) {
      allItems.push({
        id: `sat-${sat.id}`,
        type: 'SATELLITE',
        category: 'SATELLITES',
        title: sat.name,
        subtitle: `NORAD ID: ${sat.id} • ${sat.type}`,
        badge: 'CELESTRAK',
        action: () => {
          if (onSelectLocation) onSelectLocation(sat.lat, sat.lng, sat.name);
          onClose();
        }
      });
    }
  });

  // Filter Navigation Targets
  navTargets.forEach((nav) => {
    const match = !query || nav.name.toLowerCase().includes(query.toLowerCase()) || nav.view.toLowerCase().includes(query.toLowerCase());
    if (match) {
      allItems.push({
        id: `nav-${nav.view}`,
        type: 'VIEW',
        category: 'NAV',
        title: nav.name,
        subtitle: nav.desc,
        badge: 'NAV ROUTE',
        action: () => {
          if (onNavigateView) onNavigateView(nav.view);
          onClose();
        }
      });
    }
  });

  // Filter by category tab
  const filteredItems = activeCategory === 'ALL'
    ? allItems
    : allItems.filter(item => item.category === activeCategory);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  // Global Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          window.dispatchEvent(new CustomEvent('toggle-command-palette'));
        }
        return;
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + Math.max(1, filteredItems.length)) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredItems, selectedIndex]);

  if (!isOpen) return null;

  const categories: { id: PaletteCategory; label: string; count: number }[] = [
    { id: 'ALL', label: 'All Results', count: allItems.length },
    { id: 'CASES', label: 'Case Records', count: allItems.filter(i => i.category === 'CASES').length },
    { id: 'BASES', label: 'Strategic Sites', count: allItems.filter(i => i.category === 'BASES').length },
    { id: 'SATELLITES', label: 'Satellites', count: allItems.filter(i => i.category === 'SATELLITES').length },
    { id: 'NAV', label: 'Navigation', count: allItems.filter(i => i.category === 'NAV').length },
  ];

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-md flex items-start justify-center pt-16 md:pt-24 p-4 font-mono"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-slate-950 border border-ufo-green/40 rounded-3xl shadow-[0_0_50px_rgba(0,255,157,0.15)] overflow-hidden space-y-0"
        >
          {/* Header Search Bar Input */}
          <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-slate-900/90">
            <Search className="w-5 h-5 text-ufo-green shrink-0 animate-pulse" />
            <input
              autoFocus
              type="text"
              placeholder="Search Case (CASE-2004), Airbase (Area 51), Satellite, or Lat, Lng..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white focus:outline-none placeholder:text-slate-500 font-mono tracking-wide"
            />
            {query && (
              <button 
                onClick={() => setQuery('')} 
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] text-slate-300 font-sans">
              ESC
            </kbd>
          </div>

          {/* Category Filter Chips */}
          <div className="px-4 py-2 bg-slate-950 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all shrink-0 flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-ufo-green/20 text-ufo-green border border-ufo-green/40'
                    : 'text-slate-400 hover:text-slate-200 bg-white/[0.02] border border-white/5'
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-[9px] opacity-60">({cat.count})</span>
              </button>
            ))}
          </div>

          {/* Results List */}
          <div 
            ref={listRef}
            className="max-h-[380px] overflow-y-auto p-2 space-y-1 custom-scrollbar"
          >
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No matching case dossiers, airbases, or satellites found for "{query}".
              </div>
            ) : (
              filteredItems.slice(0, 20).map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between group cursor-pointer ${
                      isSelected
                        ? 'bg-ufo-green/15 border border-ufo-green/50 shadow-[0_0_15px_rgba(0,255,157,0.1)]'
                        : 'bg-transparent border border-transparent hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl border transition-colors shrink-0 ${
                        isSelected
                          ? 'bg-ufo-green text-black border-ufo-green shadow-[0_0_10px_#00ff9d]'
                          : 'bg-white/5 border-white/10 text-ufo-green'
                      }`}>
                        {item.type === 'CASE' && <FileText className="w-4 h-4" />}
                        {item.type === 'BASE' && <MapPin className="w-4 h-4" />}
                        {item.type === 'SATELLITE' && <Satellite className="w-4 h-4" />}
                        {item.type === 'VIEW' && <Navigation className="w-4 h-4" />}
                        {item.type === 'COORDINATE' && <Compass className="w-4 h-4" />}
                      </div>

                      <div className="truncate">
                        <h4 className={`text-xs font-bold uppercase transition-colors truncate ${
                          isSelected ? 'text-ufo-green' : 'text-white'
                        }`}>
                          {item.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.subtitle}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 uppercase">
                        {item.badge}
                      </span>
                      {isSelected ? (
                        <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-ufo-green/20 border border-ufo-green/40 text-[9px] text-ufo-green font-sans font-black">
                          <CornerDownLeft className="w-2.5 h-2.5" /> Enter
                        </kbd>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-ufo-green group-hover:translate-x-0.5 transition-all" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Navigation Hints */}
          <div className="px-4 py-2.5 bg-slate-900 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white/10 text-[9px] text-slate-300">↑</kbd>
                <kbd className="px-1 py-0.5 rounded bg-white/10 text-[9px] text-slate-300">↓</kbd> Navigate
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white/10 text-[9px] text-slate-300">↵</kbd> Select
              </span>
            </div>
            <span className="text-ufo-green font-bold uppercase hidden sm:inline">ANOMALY WATCH HUD</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
