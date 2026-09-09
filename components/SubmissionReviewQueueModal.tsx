import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  MapPin, 
  Calendar, 
  FileText, 
  Image as ImageIcon, 
  Layers, 
  AlertTriangle,
  ArrowRight,
  Loader2,
  Tag,
  Radio
} from 'lucide-react';
import { AnomalySubmission } from '../types';
import { SubmissionOps } from '../services/firebaseService';

interface SubmissionReviewQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmissionIntegrated?: (submission: AnomalySubmission) => void;
}

export const SubmissionReviewQueueModal: React.FC<SubmissionReviewQueueModalProps> = ({
  isOpen,
  onClose,
  onSubmissionIntegrated
}) => {
  const [submissions, setSubmissions] = useState<AnomalySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<AnomalySubmission | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'>('PENDING_REVIEW');
  const [reviewNote, setReviewNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const unsubscribe = SubmissionOps.subscribeToSubmissions((items) => {
      setSubmissions(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = submissions.filter(s => {
    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  });

  const pendingCount = submissions.filter(s => s.status === 'PENDING_REVIEW').length;
  const approvedCount = submissions.filter(s => s.status === 'APPROVED').length;
  const rejectedCount = submissions.filter(s => s.status === 'REJECTED').length;

  const handleApproveAndIntegrate = async (submission: AnomalySubmission) => {
    setIsProcessing(true);
    try {
      const updated = await SubmissionOps.reviewSubmission(
        submission.id,
        'APPROVED',
        reviewNote.trim() || 'Verified by Operative Review. Promoted to active anomaly feed and global tracking radar.',
        true // integrate into main feed
      );

      setSuccessToast(`Anomaly "${submission.title}" successfully integrated into the main feed!`);
      if (onSubmissionIntegrated && updated) {
        onSubmissionIntegrated(updated);
      }
      setSelectedSubmission(null);
      setReviewNote('');
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (e) {
      console.error("Failed to approve submission:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (submission: AnomalySubmission) => {
    setIsProcessing(true);
    try {
      await SubmissionOps.reviewSubmission(
        submission.id,
        'REJECTED',
        reviewNote.trim() || 'Did not meet verification criteria for intelligence feed inclusion.',
        false
      );
      setSelectedSubmission(null);
      setReviewNote('');
    } catch (e) {
      console.error("Failed to reject submission:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-5xl bg-slate-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[90vh]"
      >
        {/* Top Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-[0.25em]">
                  MODERATION CONTROL & FEED INTEGRATION
                </span>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-red-500/20 text-red-300 font-bold animate-pulse">
                    {pendingCount} PENDING
                  </span>
                )}
              </div>
              <h2 className="text-xl font-display font-black text-white uppercase tracking-wider">
                User Submissions Review Queue
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 border-b border-white/5 bg-black/40 flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-2">
            {[
              { id: 'PENDING_REVIEW', label: 'Pending Review', count: pendingCount, color: 'text-red-400 border-red-500/30 bg-red-500/10' },
              { id: 'APPROVED', label: 'Approved & Integrated', count: approvedCount, color: 'text-ufo-green border-ufo-green/30 bg-ufo-green/10' },
              { id: 'REJECTED', label: 'Rejected / Flagged', count: rejectedCount, color: 'text-slate-400 border-white/10 bg-white/5' },
              { id: 'ALL', label: 'All Records', count: submissions.length, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-2 whitespace-nowrap ${
                  statusFilter === tab.id
                    ? tab.color
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 text-[9px] rounded-md bg-white/10 font-bold">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {successToast && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs font-mono text-ufo-green bg-ufo-green/10 border border-ufo-green/30 px-3 py-1 rounded-xl flex items-center gap-1.5 shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{successToast}</span>
            </motion.div>
          )}
        </div>

        {/* Main Split Body: List on left, Detail Inspector on right */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Submissions List */}
          <div className="w-full md:w-5/12 border-r border-white/10 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-ufo-green mx-auto" />
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                  Scanning Cryptographic Vault...
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center space-y-2 text-slate-500 font-mono text-xs p-6 border border-dashed border-white/5 rounded-2xl">
                <ShieldCheck className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                <p>No submissions found in filter "{statusFilter}".</p>
              </div>
            ) : (
              filtered.map((item) => {
                const isSelected = selectedSubmission?.id === item.id;
                return (
                  <motion.div
                    key={item.id}
                    onClick={() => setSelectedSubmission(item)}
                    whileHover={{ scale: 1.01 }}
                    className={`p-4 rounded-2xl border text-left cursor-pointer transition-all relative overflow-hidden ${
                      isSelected
                        ? 'bg-slate-900 border-ufo-green/50 shadow-[0_0_20px_rgba(0,255,157,0.1)]'
                        : 'bg-black/50 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                        {item.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${
                        item.status === 'PENDING_REVIEW' ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' :
                        item.status === 'APPROVED' ? 'bg-ufo-green/20 text-ufo-green border border-ufo-green/30' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-sm font-display font-black text-white uppercase tracking-wider line-clamp-1 mb-1 group-hover:text-ufo-green">
                      {item.title}
                    </h4>

                    <p className="text-xs font-mono text-slate-400 line-clamp-2 leading-relaxed mb-3 italic">
                      "{item.description}"
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono text-slate-400 pt-2 border-t border-white/5">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-cyan-300 font-bold">
                        {item.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-ufo-green" />
                        {item.location}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {item.dateObserved}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Right Column: Detailed Inspector & Integration Actions */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-slate-950/80">
            {selectedSubmission ? (
              <div className="space-y-6 text-left">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        SUBMISSION ID: {selectedSubmission.id}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-ufo-green/10 text-ufo-green border border-ufo-green/30 font-bold">
                        {selectedSubmission.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                        selectedSubmission.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                        selectedSubmission.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {selectedSubmission.severity} IMPACT
                      </span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-display font-black text-white uppercase tracking-wider">
                      {selectedSubmission.title}
                    </h3>
                  </div>

                  {selectedSubmission.isIntegratedIntoMainFeed && (
                    <div className="px-3 py-1.5 rounded-2xl bg-ufo-green/10 border border-ufo-green/40 text-ufo-green font-mono text-xs font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,255,157,0.2)]">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      <span>LIVE ON ANOMALY FEED</span>
                    </div>
                  )}
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">
                      Date Observed
                    </span>
                    <span className="text-white font-bold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      {selectedSubmission.dateObserved}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">
                      Sector / Location
                    </span>
                    <span className="text-white font-bold flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-ufo-green" />
                      {selectedSubmission.location || 'Undisclosed'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/5 space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">
                      Submitted By
                    </span>
                    <span className="text-slate-300 font-bold truncate">
                      {selectedSubmission.submittedBy}
                    </span>
                  </div>
                </div>

                {/* Narrative Observation */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    Witness / Sensor Telemetry Disclosure
                  </label>
                  <div className="p-5 bg-black/60 border border-white/5 rounded-2xl text-xs font-mono text-slate-200 leading-relaxed italic">
                    "{selectedSubmission.description}"
                  </div>
                </div>

                {/* Supporting Evidence Display */}
                <div className="space-y-3">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    Corroborating Evidence Assets
                  </label>

                  {/* Images */}
                  {selectedSubmission.evidenceImages && selectedSubmission.evidenceImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedSubmission.evidenceImages.map((img, idx) => (
                        <div key={idx} className="rounded-2xl overflow-hidden border border-white/10 aspect-video bg-black relative group">
                          <img
                            src={img.url}
                            alt="Submitted asset"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-1 left-1 bg-black/80 text-[8px] font-mono text-ufo-green px-1.5 py-0.5 rounded">
                            {img.caption || 'IMAGE ASSET'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Links */}
                  {selectedSubmission.evidenceLinks && selectedSubmission.evidenceLinks.length > 0 && (
                    <div className="space-y-1.5">
                      {selectedSubmission.evidenceLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 bg-slate-900 border border-white/5 hover:border-cyan-400 rounded-xl text-xs font-mono text-cyan-300 transition-all"
                        >
                          <span className="font-bold">{link.label || 'Reference Link'}:</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-xs flex items-center gap-1">
                            {link.url} <ExternalLink className="w-3 h-3" />
                          </span>
                        </a>
                      ))}
                    </div>
                  )}

                  {(!selectedSubmission.evidenceImages || selectedSubmission.evidenceImages.length === 0) &&
                   (!selectedSubmission.evidenceLinks || selectedSubmission.evidenceLinks.length === 0) && (
                    <p className="text-xs font-mono text-slate-500 italic p-3 bg-white/5 rounded-xl">
                      No external media files attached to this report.
                    </p>
                  )}
                </div>

                {/* AI Credibility Assessment */}
                {selectedSubmission.aiAnalysis && (
                  <div className="p-4 bg-ufo-green/5 border border-ufo-green/30 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-ufo-green font-bold flex items-center gap-1.5 uppercase">
                        <Sparkles className="w-4 h-4" />
                        AI Telemetry Analysis
                      </span>
                      <span className="text-ufo-green font-bold">
                        {selectedSubmission.credibilityScore}% Confidence
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-300 leading-relaxed italic">
                      "{selectedSubmission.aiAnalysis}"
                    </p>
                  </div>
                )}

                {/* Review Notes Input */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                    Reviewer Directive / Moderator Annotation (Optional)
                  </label>
                  <input
                    type="text"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="e.g. Corroborated with NOAA seismic station. Verified for public alert feed."
                    className="w-full bg-slate-900 border border-white/10 focus:border-ufo-green rounded-2xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 outline-none"
                  />
                </div>

                {/* Moderation Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => handleApproveAndIntegrate(selectedSubmission)}
                    disabled={isProcessing}
                    className="flex-1 px-6 py-3.5 rounded-2xl bg-ufo-green text-black hover:bg-ufo-green/90 font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,255,157,0.3)] transition-all disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-black" />
                    )}
                    <span>Approve & Integrate into Main Feed</span>
                  </button>

                  <button
                    onClick={() => handleReject(selectedSubmission)}
                    disabled={isProcessing}
                    className="px-5 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 font-mono text-xs font-bold uppercase transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject / Flag</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 opacity-40">
                <FileText className="w-12 h-12 text-slate-500" />
                <h4 className="text-base font-display font-black text-white uppercase tracking-wider">
                  Select a Submission to Review
                </h4>
                <p className="text-xs font-mono text-slate-400 max-w-sm">
                  Inspect sensor attachments, verify witness statements, and integrate corroborated anomalies into the main intelligence stream.
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
