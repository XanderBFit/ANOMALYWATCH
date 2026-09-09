import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, Moon, Sun, Telescope, Info, MapPin, Calendar, Clock, Sparkles } from 'lucide-react';
import { CelestialEvent } from '../types';
import { fetchCelestialEvents } from '../services/celestialService';
import { ProgressionService } from '../services/progressionService';

interface CelestialTrackerProps {
  initialFilterCategory?: string | null;
}

const CelestialTracker: React.FC<CelestialTrackerProps> = ({ initialFilterCategory }) => {
  const [events, setEvents] = useState<CelestialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CelestialEvent | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      const data = await fetchCelestialEvents();
      
      if (initialFilterCategory) {
        const filtered = data.filter(e => 
          e.title.toLowerCase().includes(initialFilterCategory.toLowerCase()) ||
          e.type.toLowerCase().includes(initialFilterCategory.toLowerCase()) ||
          e.description.toLowerCase().includes(initialFilterCategory.toLowerCase())
        );
        setEvents(filtered.length > 0 ? filtered : data);
        if (filtered.length > 0) setSelectedEvent(filtered[0]);
        else if (data.length > 0) setSelectedEvent(data[0]);
      } else {
        setEvents(data);
        if (data.length > 0) setSelectedEvent(data[0]);
      }
      
      setLoading(false);
    };
    loadEvents();
  }, [initialFilterCategory]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'Meteor Shower': return <Star className="w-5 h-5" />;
      case 'Eclipse': return <Moon className="w-5 h-5" />;
      case 'Planetary Alignment': return <Sun className="w-5 h-5" />;
      default: return <Telescope className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-display font-black text-white uppercase tracking-tighter">Celestial Intel</h2>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.3em]">Orbital Event Tracking & Visibility Analysis</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Secret Quantum Artifact Treasure Node */}
          <button
            onClick={() => ProgressionService.discoverArtifact('ARTIFACT_NEO_METEOR_CORE')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold hover:bg-amber-500 hover:text-black transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            title="Incoming Meteorite Spectrum - Click to Decode Extraterrestrial Isotope"
          >
            <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400 hover:text-black" />
            <span>NEO-771-ISO</span>
          </button>

          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
            <div className="w-2 h-2 bg-celestial-blue rounded-full animate-pulse shadow-[0_0_10px_#00d0ff]"></div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Deep Space Link: Active</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Event List */}
        <div className="lg:col-span-1 space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse border border-white/5"></div>
            ))
          ) : (
            events.map((event) => (
              <motion.div
                key={event.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedEvent(event)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${
                  selectedEvent?.id === event.id 
                  ? 'bg-celestial-blue/10 border-celestial-blue shadow-[0_0_30px_rgba(0,208,255,0.1)]' 
                  : 'bg-black/40 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${selectedEvent?.id === event.id ? 'bg-celestial-blue text-black' : 'bg-white/5 text-slate-400'}`}>
                    {getIcon(event.type)}
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{event.date}</span>
                </div>
                <h3 className="text-sm font-display font-bold text-white uppercase tracking-wide truncate">{event.title}</h3>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-[8px] font-mono px-2 py-0.5 rounded uppercase ${
                    event.type === 'Meteor Shower' ? 'bg-indigo-500/20 text-indigo-300' :
                    event.type === 'Eclipse' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {event.type}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Event Detail */}
        <div className="lg:col-span-2">
          {selectedEvent ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={selectedEvent.id}
              className="glass-panel p-8 rounded-[2.5rem] border border-white/10 bg-black/60 relative overflow-hidden min-h-[60vh] flex flex-col"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Star className="w-64 h-64 text-celestial-blue" />
              </div>

              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <span className="px-4 py-1 bg-celestial-blue text-black text-[10px] font-display font-black rounded-full uppercase tracking-widest">
                    {selectedEvent.type}
                  </span>
                  <div className="h-px flex-1 bg-white/10"></div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Event ID: {selectedEvent.id}</span>
                </div>

                <h1 className="text-5xl font-display font-black text-white uppercase tracking-tighter mb-8 leading-none">
                  {selectedEvent.title}
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                        <Calendar className="w-5 h-5 text-celestial-blue" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Observation Date</p>
                        <p className="text-lg font-display font-bold text-white uppercase">{selectedEvent.date}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                        <Clock className="w-5 h-5 text-celestial-blue" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Peak Intensity</p>
                        <p className="text-lg font-display font-bold text-white uppercase">{selectedEvent.peakTime || 'TBD'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                        <MapPin className="w-5 h-5 text-celestial-blue" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Visibility Sector</p>
                        <p className="text-lg font-display font-bold text-white uppercase">{selectedEvent.visibility}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                        <Info className="w-5 h-5 text-celestial-blue" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-lg font-display font-bold text-emerald-400 uppercase tracking-widest animate-pulse">Confirmed</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.3em] font-black">Intelligence Briefing</h4>
                  <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl text-slate-300 font-mono text-sm leading-relaxed">
                    {selectedEvent.description}
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center relative z-10">
                <div className="flex gap-4">
                  <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-display font-black uppercase tracking-widest transition-all">
                    Export Data
                  </button>
                  <button className="px-6 py-3 bg-celestial-blue text-black rounded-xl text-[10px] font-display font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,208,255,0.3)]">
                    Set Alert
                  </button>
                </div>
                <div className="text-[9px] font-mono text-slate-700 uppercase tracking-[0.4em]">
                  Orbital_Mechanics_V.4.2
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-800 opacity-20">
              <Star className="w-32 h-32 mb-8" />
              <p className="font-display text-xl uppercase tracking-[0.5em]">Select Event for Analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CelestialTracker;
