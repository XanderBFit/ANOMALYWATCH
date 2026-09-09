import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, XCircle, ChevronRight, FileText, Globe, Clock, User } from 'lucide-react';
import { CaseOps } from '../services/caseOps';
import { CaseRecord } from '../types';
import TacticalLoader from './TacticalLoader';

export const InclusionReviewPanel: React.FC = () => {
  const [pendingCases, setPendingCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);

  useEffect(() => {
    const unsub = CaseOps.subscribeToCases((cases) => {
      setPendingCases(cases.filter(c => c.status === 'Pending Inclusion'));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleApprove = async (caseId: string) => {
    await CaseOps.saveCase({
        ...(pendingCases.find(c => c.id === caseId) as CaseRecord),
        status: 'Corroborated',
        isPublicFeed: true,
        updatedTimestamp: Date.now()
    });
    // Add success note
    await CaseOps.addNote(caseId, "MODERATOR_APPROVAL: Anomaly verified for public intelligence feed.");
    setSelectedCase(null);
  };

  const handleReject = async (caseId: string) => {
    await CaseOps.updateStatus(caseId, 'Discredited', "Failed verification protocols during manual review.");
    setSelectedCase(null);
  };

  if (loading) return <TacticalLoader stage="SCANNING_PENDING_ASSETS" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-mono font-bold text-red-500 uppercase tracking-[0.3em] flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 animate-pulse" />
          Pending Inclusion Review ({pendingCases.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
        {pendingCases.length === 0 ? (
          <div className="p-12 border border-dashed border-white/5 rounded-3xl text-center opacity-30 italic text-xs font-mono">
            No pending submissions awaiting verification.
          </div>
        ) : (
          pendingCases.map((c) => (
            <motion.button
              key={c.id}
              onClick={() => setSelectedCase(c)}
              className={`text-left p-6 rounded-2xl border transition-all relative overflow-hidden group ${
                selectedCase?.id === c.id 
                  ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)] scale-[1.02]' 
                  : 'bg-black/60 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{c.id}</span>
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-mono rounded uppercase tracking-tighter">Needs Review</span>
              </div>
              <h4 className="text-sm font-display font-black text-white uppercase tracking-wider line-clamp-1 mb-2">{c.title}</h4>
              <p className="text-[10px] font-mono text-slate-400 line-clamp-2 leading-relaxed italic mb-4">"{c.summary}"</p>
              
              <div className="flex items-center gap-4 text-[9px] font-mono text-slate-500 uppercase">
                <div className="flex items-center gap-1">
                  <Globe className="w-3 h-3" /> {c.location}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(c.createdTimestamp).toLocaleDateString()}
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedCase && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
          >
            <div className="w-full max-w-2xl bg-slate-950 border border-red-500/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-red-500/[0.03]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-500/10 rounded-2xl">
                    <FileText className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-widest">Case Verification</h3>
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.3em]">ID: {selectedCase.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCase(null)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
                <section className="space-y-4">
                  <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.5em] font-bold">Intelligence Disclosure</h4>
                  <div className="p-6 bg-black border border-white/5 rounded-2xl">
                    <p className="text-lg font-mono text-slate-200 leading-relaxed italic">"{selectedCase.summary}"</p>
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-6 text-[10px] font-mono uppercase">
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-600 block mb-2 tracking-widest font-bold">Geographical Sector</span>
                    <span className="text-white text-sm">{selectedCase.location}</span>
                  </div>
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-600 block mb-2 tracking-widest font-bold">Source Classification</span>
                    <span className="text-white text-sm">{selectedCase.category}</span>
                  </div>
                </div>

                {selectedCase.anomalyReasoning && (
                  <section className="space-y-4">
                    <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.5em] font-bold">AI Correlation Reasoning</h4>
                    <div className="p-6 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
                      <p className="text-[11px] font-mono text-cyan-200 leading-loose italic">{selectedCase.anomalyReasoning}</p>
                    </div>
                  </section>
                )}
              </div>

              <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
                <button
                  onClick={() => handleReject(selectedCase.id)}
                  className="flex-1 py-5 rounded-2xl border border-red-500/30 text-red-500 font-mono font-bold text-xs uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-red-500/5"
                >
                  <XCircle className="w-5 h-5" />
                  Discard Intel
                </button>
                <button
                  onClick={() => handleApprove(selectedCase.id)}
                  className="flex-[2] py-5 rounded-2xl bg-red-600 text-white font-mono font-bold text-xs uppercase tracking-[0.3em] hover:bg-red-500 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-red-500/20 group"
                >
                  <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Authorize Feed Inclusion
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
