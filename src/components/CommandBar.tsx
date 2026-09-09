import React from "react";
import { Radar, Shield, Sun, Activity, Search, Radio, UserCheck } from "lucide-react";

export type MissionPreset = "ALL" | "AIR" | "SPACE" | "SEISMIC";

interface CommandBarProps {
  activePreset: MissionPreset;
  onSelectPreset: (preset: MissionPreset) => void;
  onOpenSearch: () => void;
  streamStatuses: { [key: string]: boolean };
  userRole?: string;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  activePreset,
  onSelectPreset,
  onOpenSearch,
  streamStatuses,
  userRole = "Guest Operative",
}) => {
  return (
    <header className="h-14 w-full bg-slate-950/85 backdrop-blur-md border-b border-cyan-500/20 px-4 flex items-center justify-between select-none z-40">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center">
          <Radar className="w-6 h-6 text-cyan-400 animate-spin-slow" />
          <div className="absolute w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        </div>
        <div>
          <span className="font-mono font-bold text-sm tracking-wider text-slate-100 uppercase">
            Anomaly Watch
          </span>
          <span className="ml-2 text-[10px] font-mono text-cyan-400/70 border border-cyan-500/30 px-1.5 py-0.5 rounded">
            HUD v2.4
          </span>
        </div>
      </div>

      <div className="hidden md:flex items-center bg-slate-900/90 border border-cyan-500/20 rounded-lg p-0.5 gap-1 font-mono text-xs">
        <button
          onClick={() => onSelectPreset("ALL")}
          className={`px-3 py-1 rounded flex items-center gap-1.5 transition-colors ${
            activePreset === "ALL"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Radio className="w-3.5 h-3.5" /> All Feeds
        </button>
        <button
          onClick={() => onSelectPreset("AIR")}
          className={`px-3 py-1 rounded flex items-center gap-1.5 transition-colors ${
            activePreset === "AIR"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Air Defense
        </button>
        <button
          onClick={() => onSelectPreset("SPACE")}
          className={`px-3 py-1 rounded flex items-center gap-1.5 transition-colors ${
            activePreset === "SPACE"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sun className="w-3.5 h-3.5" /> Space Weather
        </button>
        <button
          onClick={() => onSelectPreset("SEISMIC")}
          className={`px-3 py-1 rounded flex items-center gap-1.5 transition-colors ${
            activePreset === "SEISMIC"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Tectonic & Marine
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-cyan-500/20 rounded-md text-xs font-mono text-slate-400 hover:border-cyan-400/50 hover:text-cyan-300 transition-all"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Quick Search</span>
          <kbd className="bg-slate-800 text-[10px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs text-slate-300 hidden sm:inline">
            {userRole}
          </span>
        </div>
      </div>
    </header>
  );
};
