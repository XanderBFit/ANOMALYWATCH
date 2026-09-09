import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Plus, X, Bell, Globe, Tag, Search, Shield } from 'lucide-react';
import { SubscriptionOps } from '../services/firebaseService';
import { AlertSubscription, AnomalyCategory } from '../types';

export const TrackingSettings: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState<AlertSubscription[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [formData, setFormData] = useState({
    location: '',
    category: 'UFO / UAP' as AnomalyCategory,
    keywords: [] as string[]
  });

  const CATEGORIES: AnomalyCategory[] = [
    'UFO / UAP', 'Paranormal', 'Cryptid', 'Gov / Black Ops', 
    'Phenomena', 'Site Intel', 'Geopolitical shifts', 
    'Scientific breakthroughs', 'Cultural trends', 
    'Economic anomalies', 'Technological oddities', 
    'Environmental events'
  ];

  useEffect(() => {
    const unsubscribe = SubscriptionOps.getUserSubscriptions(setSubscriptions);
    return () => unsubscribe();
  }, []);

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !formData.keywords.includes(newKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (word: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== word)
    }));
  };

  const handleSave = async () => {
    await SubscriptionOps.subscribeToAlerts({
      location: formData.location || undefined,
      category: formData.category,
      keywords: formData.keywords.length > 0 ? formData.keywords : undefined
    });
    setFormData({ location: '', category: 'UFO / UAP', keywords: [] });
  };

  const handleDelete = async (id: string) => {
    await SubscriptionOps.deleteSubscription(id);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
      >
        <Settings className="w-4 h-4" />
        <span className="text-sm font-mono tracking-widest uppercase">Tracking Parameters</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-950 border border-cyan-500/30 rounded-xl p-6 z-50 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
              
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <Shield className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h2 className="text-xl font-mono font-bold text-slate-100 tracking-tight">Anomaly Filters</h2>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Active Subscriptions */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <Bell className="w-3 h-3" /> Active Watchers
                  </h3>
                  <div className="max-h-32 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {subscriptions.length === 0 ? (
                      <p className="text-xs text-slate-600 italic">No active anomaly filters configured.</p>
                    ) : (
                      subscriptions.map(sub => (
                        <div key={sub.id} className="flex items-center justify-between p-2 bg-slate-900/50 border border-slate-800 rounded-lg group">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-mono text-cyan-400">{sub.category}</span>
                            <div className="flex flex-wrap gap-1">
                              {sub.location && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded flex items-center gap-1">
                                  <Globe className="w-2 h-2" /> {sub.location}
                                </span>
                              )}
                              {sub.keywords?.map(k => (
                                <span key={k} className="text-[10px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-300 rounded flex items-center gap-1">
                                  <Tag className="w-2 h-2" /> {k}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDelete(sub.id)}
                            className="p-1 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="h-px bg-slate-800" />

                {/* New Subscription Form */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono uppercase text-slate-500 tracking-widest">Configure New Watcher</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1.5 ml-1">Geographical Sector</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Global / Specific Region"
                          value={formData.location}
                          onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1.5 ml-1">Anomaly Classification</label>
                      <select
                        value={formData.category}
                        onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as AnomalyCategory }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1.5 ml-1">Tactical Keywords</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type="text"
                            placeholder="Add keyword..."
                            value={newKeyword}
                            onChange={e => setNewKeyword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddKeyword()}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
                          />
                        </div>
                        <button
                          onClick={handleAddKeyword}
                          className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.keywords.map(word => (
                          <span key={word} className="flex items-center gap-1 px-2 py-1 bg-slate-800 text-cyan-400 text-[10px] font-mono rounded-md border border-cyan-500/20">
                            {word}
                            <button onClick={() => removeKeyword(word)} className="hover:text-white">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold rounded-lg transition-all duration-300 shadow-[0_0_20px_rgba(8,145,178,0.3)] flex items-center justify-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    INITIALIZE WATCHER
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
