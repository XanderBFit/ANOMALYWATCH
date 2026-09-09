import React from 'react';
import { motion } from 'motion/react';
import { 
  Atom, 
  TrendingUp, 
  Users, 
  Globe2, 
  Palette, 
  Radio, 
  Layers, 
  Sparkles, 
  Activity, 
  Search,
  Filter,
  X
} from 'lucide-react';
import { normalizeAnomalyCategory } from '../services/anomalyService';

interface CategoryFilterBarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categoryCounts?: { [cat: string]: number };
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  totalCount?: number;
}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts = {},
  searchQuery = '',
  onSearchChange,
  totalCount
}) => {
  const categories = [
    { id: 'ALL', label: 'All Anomalies', icon: Layers, color: 'text-white border-white/20 bg-white/10' },
    { id: 'Scientific', label: 'Scientific', icon: Atom, color: 'text-ufo-green border-ufo-green/30 bg-ufo-green/10' },
    { id: 'Economic', label: 'Economic', icon: TrendingUp, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
    { id: 'Social', label: 'Social', icon: Users, color: 'text-pink-400 border-pink-500/30 bg-pink-500/10' },
    { id: 'Geopolitical', label: 'Geopolitical', icon: Globe2, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    { id: 'Cultural', label: 'Cultural', icon: Palette, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
    { id: 'UFO / UAP', label: 'Aerial / UAP', icon: Radio, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    { id: 'Phenomena', label: 'Phenomena', icon: Sparkles, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' }
  ];

  return (
    <div className="w-full space-y-3">
      {/* Category Pills & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Scroll Container */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar pr-2 flex-1">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.icon;
            const count = cat.id === 'ALL' ? totalCount : categoryCounts[cat.id];

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`px-3.5 py-2 rounded-2xl border text-xs font-mono font-bold transition-all flex items-center gap-2 shrink-0 relative overflow-hidden group ${
                  isSelected
                    ? `${cat.color} shadow-[0_0_15px_rgba(0,255,157,0.15)] ring-1 ring-white/20`
                    : 'bg-slate-950/80 border-white/10 hover:border-white/20 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'animate-pulse' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span>{cat.label}</span>
                {count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-mono font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Real-time Search Input */}
        {onSearchChange && (
          <div className="relative shrink-0 w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search category or sector..."
              className="w-full bg-slate-950/90 border border-white/10 focus:border-ufo-green/50 rounded-2xl pl-9 pr-8 py-2 text-xs font-mono text-white placeholder:text-slate-600 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
