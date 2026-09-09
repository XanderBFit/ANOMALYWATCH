import React from "react";
import { X, FileText, Volume2, ShieldCheck, Download, Compass } from "lucide-react";

export interface DossierRecord {
  id: string;
  title: string;
  category: string;
  timestamp: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidenceScore: number;
  coordinates: { lat: number; lng: number; alt_ft?: number };
  summary: string;
  sensorSignatures: string[];
  caseDossier: {
    evidenceTier: string;
    telemetryLog: string;
    falsePositivesEliminated: string[];
  };
}

interface SlideOverDossierProps {
  dossier: DossierRecord | null;
  onClose: () => void;
  onPlayAudioBrief: (dossier: DossierRecord) => void;
  onExportPDF: (dossier: DossierRecord) => void;
}

export const SlideOverDossier: React.FC<SlideOverDossierProps> = ({
  dossier,
  onClose,
  onPlayAudioBrief,
  onExportPDF,
}) => {
  if (!dossier) return null;

  const severityColor =
    dossier.severity === "CRITICAL"
      ? "text-rose-400 border-rose-500/50 bg-rose-950/40"
      : dossier.severity === "HIGH"
      ? "text-amber-400 border-amber-500/50 bg-amber-950/40"
      : "text-cyan-400 border-cyan-500/50 bg-cyan-950/40";

  return (
    <aside className="fixed right-0 top-14 bottom-14 w-full sm:w-[420px] bg-slate-950/95 backdrop-blur-xl border-l border-cyan-500/20 shadow-2xl z-50 flex flex-col transition-all duration-300 animate-slide-left font-mono">
      <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span className="text-xs tracking-wider text-slate-300 uppercase font-bold">
            {dossier.id}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-100 p-1 rounded-md hover:bg-slate-800/60"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${severityColor}`}>
              {dossier.severity}
            </span>
            <span className="text-slate-400 text-[10px]">
              {new Date(dossier.timestamp).toUTCString()}
            </span>
          </div>
          <h2 className="text-sm font-bold text-slate-100 leading-snug">
            {dossier.title}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-cyan-400">
            <Compass className="w-3 h-3" />
            <span>{dossier.coordinates.lat.toFixed(4)}°, {dossier.coordinates.lng.toFixed(4)}°</span>
            {dossier.coordinates.alt_ft && <span>({dossier.coordinates.alt_ft} ft)</span>}
          </div>
        </div>

        <div className="p-3 bg-slate-900/80 rounded-lg border border-cyan-500/20">
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-400">Confidence Rating:</span>
            <span className="font-bold text-cyan-300">
              {(dossier.confidenceScore * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${dossier.confidenceScore * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">
            Executive Summary
          </span>
          <p className="text-slate-200 leading-relaxed text-[11px] bg-slate-900/50 p-2.5 rounded border border-slate-800">
            {dossier.summary}
          </p>
        </div>

        <div className="space-y-1.5">
          <span className="text-slate-400 uppercase text-[10px] tracking-wider font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Conventional Causes Ruled Out
          </span>
          <ul className="space-y-1">
            {dossier.caseDossier.falsePositivesEliminated.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-300">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 uppercase text-[10px] tracking-wider font-bold">
            Sensor Signatures Log
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {dossier.sensorSignatures.map((sig, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-slate-900 text-cyan-300 border border-cyan-500/30 rounded text-[10px]"
              >
                {sig}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-cyan-500/20 bg-slate-900/90 flex gap-2">
        <button
          onClick={() => onPlayAudioBrief(dossier)}
          className="flex-1 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,240,255,0.1)]"
        >
          <Volume2 className="w-3.5 h-3.5" /> Audio Brief
        </button>
        <button
          onClick={() => onExportPDF(dossier)}
          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
        >
          <Download className="w-3.5 h-3.5" /> Export PDF
        </button>
      </div>
    </aside>
  );
};
