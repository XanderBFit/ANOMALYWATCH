import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Tag, Hash, Bell, Check } from 'lucide-react';
import { AnomalyCategory } from '../types';

interface PersonalizationPanelProps {
  onPreferencesChange: (categories: AnomalyCategory[], keywords: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: AnomalyCategory[] = [
  'UFO / UAP', 'Paranormal', 'Cryptid', 'Gov / Black Ops', 
  'Phenomena', 'Site Intel', 'Geopolitical shifts', 
  'Scientific breakthroughs', 'Cultural trends', 
  'Economic anomalies', 'Technological oddities', 
  'Environmental events'
];

export const PersonalizationPanel: React.FC<PersonalizationPanelProps> = ({ onPreferencesChange, isOpen, onClose }) => {
  const [selectedCategories, setSelectedCategories] = useState<AnomalyCategory[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('anomalyWatch_preferences');
    if (saved) {
      const { categories, keywords } = JSON.parse(saved);
      setSelectedCategories(categories);
      setKeywords(keywords);
    }
  }, []);

  const savePreferences = (newCats: AnomalyCategory[], newKeys: string[]) => {
    localStorage.setItem('anomalyWatch_preferences', JSON.stringify({ categories: newCats, keywords: newKeys }));
    onPreferencesChange(newCats, newKeys);
  };

  const toggleCategory = (cat: AnomalyCategory) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat];
    setSelectedCategories(next);
    savePreferences(next, keywords);
  };

  const addKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newKeyword && !keywords.includes(newKeyword)) {
      const next = [...keywords, newKeyword];
      setKeywords(next);
      setNewKeyword('');
      savePreferences(selectedCategories, next);
    }
  };

  const removeKeyword = (key: string) => {
    const next = keywords.filter(k => k !== key);
    setKeywords(next);
    savePreferences(selectedCategories, next);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-950 border-l border-slate-800 z-[101] shadow-2xl p-8 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-red-500" />
                <h2 className="text-xl font-mono font-bold text-white tracking-widest uppercase">Feed Calibration</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-900 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <div className="space-y-12">
              {/* Categories */}
              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-red-500/50" />
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Sector Focus</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-2 text-[10px] font-mono rounded-lg border transition-all text-left flex justify-between items-center ${
                        selectedCategories.includes(cat)
                          ? 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      {cat}
                      {selectedCategories.includes(cat) && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </section>

              {/* Keywords */}
              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-red-500/50" />
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Keyword Intercepts</h3>
                </div>
                <form onSubmit={addKeyword} className="relative">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Enter tracking keyword..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500/50 transition-colors"
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-all"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
                <div className="flex flex-wrap gap-2">
                  {keywords.map(key => (
                    <button
                      key={key}
                      onClick={() => removeKeyword(key)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-full text-[10px] font-mono text-slate-300 flex items-center gap-2 hover:border-red-500/50 hover:text-red-400 transition-all group"
                    >
                      <Hash className="w-3 h-3 text-slate-500 group-hover:text-red-500/50" />
                      {key}
                      <X className="w-3 h-3 text-slate-600" />
                    </button>
                  ))}
                </div>
              </section>

              {/* Notifications */}
              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-red-500/50" />
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Alert Protocols</h3>
                </div>
                <div className="p-4 bg-slate-900 shadow-inner rounded-xl border border-slate-800 space-y-4">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-200 transition-colors">Tactical Override Notifications</span>
                    <div className="w-10 h-5 bg-slate-800 rounded-full relative border border-slate-700">
                      <div className="absolute left-1 top-1 w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    </div>
                  </label>
                  <p className="text-[10px] font-mono text-slate-600 leading-relaxed italic">
                    * Alerts will be prioritized based on calibrated sector focus and keyword intercepts.
                  </p>
                </div>
              </section>
            </div>

            <div className="mt-12 pt-12 border-t border-white/5">
              <button 
                onClick={onClose}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              >
                Apply Calibration
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const ArrowRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);
