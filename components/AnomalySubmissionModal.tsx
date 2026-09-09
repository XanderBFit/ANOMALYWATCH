import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  Upload, 
  Link as LinkIcon, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Loader2, 
  FileText, 
  Image as ImageIcon,
  HelpCircle,
  Hash,
  Trash2,
  Lock,
  Globe
} from 'lucide-react';
import { AnomalyCategory, DEFAULT_ANOMALY_CATEGORIES, AnomalySubmission } from '../types';
import { SubmissionOps } from '../services/firebaseService';
import { evaluateSubmissionCredibility, normalizeAnomalyCategory } from '../services/anomalyService';

interface AnomalySubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmissionSuccess?: (submission: AnomalySubmission) => void;
}

export const AnomalySubmissionModal: React.FC<AnomalySubmissionModalProps> = ({
  isOpen,
  onClose,
  onSubmissionSuccess
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateObserved, setDateObserved] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<string>('Scientific');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  
  // Evidence
  const [evidenceLinks, setEvidenceLinks] = useState<Array<{ url: string; label?: string }>>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  
  const [evidenceImages, setEvidenceImages] = useState<Array<{ url: string; caption?: string; sha256?: string }>>([]);
  const [imageInputUrl, setImageInputUrl] = useState('');

  // AI & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiPreview, setAiPreview] = useState<{ credibilityScore: number; aiAnalysis: string } | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    setEvidenceLinks(prev => [...prev, {
      url: newLinkUrl.trim(),
      label: newLinkLabel.trim() || 'Reference Source'
    }]);
    setNewLinkUrl('');
    setNewLinkLabel('');
  };

  const handleRemoveLink = (idx: number) => {
    setEvidenceLinks(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddImageUrl = () => {
    if (!imageInputUrl.trim()) return;
    const fakeHash = '0x' + Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join('');
    setEvidenceImages(prev => [...prev, {
      url: imageInputUrl.trim(),
      caption: 'External Media Capture',
      sha256: fakeHash
    }]);
    setImageInputUrl('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const hash = '0x' + Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join('');
        setEvidenceImages(prev => [...prev, {
          url: base64,
          caption: file.name,
          sha256: hash
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (idx: number) => {
    setEvidenceImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRunAiEvaluation = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Please provide at least a Title and Description before running credibility check.');
      return;
    }
    setError(null);
    setIsAnalyzing(true);
    try {
      const evalResult = await evaluateSubmissionCredibility({
        title,
        description,
        location,
        category,
        evidenceLinks,
        evidenceImages
      });
      setAiPreview(evalResult);
    } catch (err) {
      console.warn("AI Credibility preview error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Anomaly title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Detailed anomaly description is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Run quick credibility check if not already run
      let cred = aiPreview?.credibilityScore;
      let analysis = aiPreview?.aiAnalysis;
      if (cred === undefined) {
        const res = await evaluateSubmissionCredibility({
          title,
          description,
          location,
          category,
          evidenceLinks,
          evidenceImages
        });
        cred = res.credibilityScore;
        analysis = res.aiAnalysis;
      }

      const subId = await SubmissionOps.submitAnomaly({
        title: title.trim(),
        description: description.trim(),
        dateObserved,
        location: location.trim() || 'Global / Undisclosed Sector',
        category: normalizeAnomalyCategory(category),
        severity,
        evidenceLinks,
        evidenceImages,
        credibilityScore: cred,
        aiAnalysis: analysis
      });

      setSubmitSuccess(subId);
      setTimeout(() => {
        if (onSubmissionSuccess) {
          onSubmissionSuccess({
            id: subId,
            title,
            description,
            dateObserved,
            location: location || 'Global / Undisclosed Sector',
            category: normalizeAnomalyCategory(category),
            severity,
            evidenceLinks,
            evidenceImages,
            status: 'PENDING_REVIEW',
            submittedBy: localStorage.getItem('anomalyWatch_username') || 'ANALYST',
            submittedAt: Date.now(),
            credibilityScore: cred,
            aiAnalysis: analysis,
            isIntegratedIntoMainFeed: false
          });
        }
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error("Submission failed:", err);
      setError(err.message || 'Failed to dispatch anomaly submission to vault.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { name: 'Scientific', desc: 'Quantum, electromagnetic, seismic, or physics variance', color: 'text-ufo-green border-ufo-green/30 bg-ufo-green/10' },
    { name: 'Economic', desc: 'Flash liquidity shifts, algorithmic cascades, market shocks', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
    { name: 'Social', desc: 'Civic sentiment clusters, virality spikes, behavioral oddities', color: 'text-pink-400 border-pink-500/30 bg-pink-500/10' },
    { name: 'Geopolitical', desc: 'Border movements, unannounced exercises, signal jamming', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    { name: 'Cultural', desc: 'Memetic waves, folkloric revivals, narrative anomalies', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
    { name: 'UFO / UAP', desc: 'Aerial trans-medium objects, non-ballistic vectors', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    { name: 'Phenomena', desc: 'Atmospheric light pillars, acoustic hums, ball lightning', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' }
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-3xl bg-slate-950 border border-ufo-green/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,255,157,0.15)] flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header Strip */}
        <div className="p-6 md:p-7 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-ufo-green/[0.08] via-slate-900/50 to-transparent">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-ufo-green/10 border border-ufo-green/30 text-ufo-green rounded-2xl shadow-[0_0_15px_rgba(0,255,157,0.2)]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-ufo-green uppercase tracking-[0.25em]">
                  OBSERVATION REPORT
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/10 text-slate-300">
                  ENCRYPTED UPLINK
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-display font-black text-white uppercase tracking-wider">
                Submit Anomaly Intel
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-left">
          {submitSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 px-6 text-center space-y-4"
            >
              <div className="w-16 h-16 bg-ufo-green/10 border-2 border-ufo-green rounded-full flex items-center justify-center mx-auto text-ufo-green shadow-[0_0_30px_rgba(0,255,157,0.3)]">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-2xl font-display font-black text-white uppercase tracking-wider">
                Anomaly Ingested
              </h3>
              <p className="text-sm font-mono text-slate-300 max-w-md mx-auto leading-relaxed">
                Your report <span className="text-ufo-green font-bold">{submitSuccess}</span> has been securely cataloged and queued for moderator inclusion review.
              </p>
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-slate-400 inline-block">
                Corroboration Score: {aiPreview?.credibilityScore || 85}% • Feed Status: Pending Inclusion
              </div>
            </motion.div>
          ) : (
            <>
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-mono">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Primary Identifiers: Title & Category */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-widest mb-1.5">
                    Anomaly Title / Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Unexplained Atmospheric Ionization Spike over Pacific Sector"
                    className="w-full bg-slate-900 border border-white/10 focus:border-ufo-green/50 focus:ring-1 focus:ring-ufo-green/40 rounded-2xl px-4 py-3 text-sm text-white font-mono placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>

                {/* Categorization Selector */}
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-widest mb-2 flex items-center justify-between">
                    <span>Assigned Category *</span>
                    <span className="text-[10px] text-ufo-green font-normal">Select Primary Domain</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {categories.map((cat) => {
                      const isSelected = category === cat.name;
                      return (
                        <button
                          key={cat.name}
                          type="button"
                          onClick={() => setCategory(cat.name)}
                          className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                            isSelected
                              ? `${cat.color} shadow-[0_0_15px_rgba(0,255,157,0.15)] ring-1 ring-ufo-green/50`
                              : 'bg-slate-900/60 border-white/5 hover:border-white/15 text-slate-400'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold uppercase tracking-wider block mb-1">
                            {cat.name}
                          </span>
                          <span className="text-[9px] font-mono opacity-70 line-clamp-2 leading-tight">
                            {cat.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Date Observed & Geographical Sector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Date Observed *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dateObserved}
                    onChange={(e) => setDateObserved(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 focus:border-cyan-400 rounded-2xl px-4 py-2.5 text-xs text-white font-mono outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-ufo-green" />
                    <span>Location / Coordinates (Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. 47.6062° N, 122.3321° W (Seattle Sector)"
                    className="w-full bg-slate-900 border border-white/10 focus:border-ufo-green rounded-2xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 outline-none transition-all"
                  />
                </div>
              </div>

              {/* 3. Severity & Impact Level */}
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-widest mb-2">
                  Observed Impact / Severity Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((sev) => {
                    const isSelected = severity === sev;
                    const styles = {
                      LOW: isSelected ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]' : 'bg-slate-900 border-white/5 text-slate-400',
                      MEDIUM: isSelected ? 'bg-ufo-green/20 border-ufo-green text-ufo-green shadow-[0_0_12px_rgba(0,255,157,0.3)]' : 'bg-slate-900 border-white/5 text-slate-400',
                      HIGH: isSelected ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]' : 'bg-slate-900 border-white/5 text-slate-400',
                      CRITICAL: isSelected ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse' : 'bg-slate-900 border-white/5 text-slate-400'
                    };
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`py-2 px-3 rounded-2xl border text-center font-mono text-[10px] font-bold tracking-widest transition-all ${styles[sev]}`}
                      >
                        {sev}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Detailed Description */}
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                  <span>Detailed Telemetry & Observation Narrative *</span>
                  <span className="text-[9px] font-mono text-slate-500">{description.length} chars</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the anomalous characteristics: duration, sensory readings, instrumentation disruptions, weather conditions, witness testimony..."
                  className="w-full bg-slate-900 border border-white/10 focus:border-ufo-green/50 rounded-2xl p-4 text-xs text-white font-mono placeholder:text-slate-600 outline-none transition-all leading-relaxed"
                />
              </div>

              {/* 5. Supporting Evidence: Links & Images */}
              <div className="space-y-3 p-4 bg-slate-900/60 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-ufo-green" />
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      Supporting Evidence (Links & Media)
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">
                    {evidenceLinks.length + evidenceImages.length} items attached
                  </span>
                </div>

                {/* Evidence Links */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      placeholder="Source label (e.g. NOAA Radar Log)"
                      className="w-1/3 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white font-mono placeholder:text-slate-600 outline-none"
                    />
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://source.domain/data"
                      className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white font-mono placeholder:text-slate-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddLink}
                      className="px-3 py-2 bg-ufo-green/10 border border-ufo-green/30 text-ufo-green rounded-xl text-xs font-mono font-bold hover:bg-ufo-green/20 transition-all"
                    >
                      + Add Link
                    </button>
                  </div>

                  {evidenceLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-white/5 text-xs font-mono">
                      <div className="flex items-center gap-2 overflow-hidden pr-2">
                        <LinkIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-slate-200 font-bold">{link.label}:</span>
                        <span className="text-slate-400 truncate text-[10px]">{link.url}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(idx)}
                        className="text-slate-500 hover:text-red-400 transition-all p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Image Upload / Image URL */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={imageInputUrl}
                      onChange={(e) => setImageInputUrl(e.target.value)}
                      placeholder="Image / Telemetry URL preview"
                      className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-white font-mono placeholder:text-slate-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-mono font-bold hover:bg-cyan-500/20 transition-all"
                    >
                      + Add Image URL
                    </button>
                  </div>

                  <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-white/10 hover:border-ufo-green/40 rounded-xl bg-slate-950/40 cursor-pointer transition-all text-xs font-mono text-slate-400 hover:text-white">
                    <Upload className="w-4 h-4 text-ufo-green" />
                    <span>Upload Local Capture / Sensor Screenshot</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Previews */}
                  {evidenceImages.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                      {evidenceImages.map((img, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video bg-black">
                          <img
                            src={img.url}
                            alt="Evidence capture"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="p-1 bg-red-500/80 rounded-full text-white hover:bg-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {img.sha256 && (
                            <span className="absolute bottom-1 left-1 bg-black/80 text-[8px] font-mono text-ufo-green px-1 rounded">
                              PROVENANCE VALIDATED
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 6. AI Credibility Assessment Preview */}
              {aiPreview && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-ufo-green/5 border border-ufo-green/30 rounded-2xl space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-ufo-green font-bold uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Gemini Tactical Credibility Score:
                    </span>
                    <span className="px-2 py-0.5 bg-ufo-green/20 text-ufo-green rounded-full font-bold">
                      {aiPreview.credibilityScore}% PROBABILITY
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-300 leading-relaxed italic">
                    "{aiPreview.aiAnalysis}"
                  </p>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleRunAiEvaluation}
                  disabled={isAnalyzing || !title.trim() || !description.trim()}
                  className="w-full sm:w-auto px-4 py-3 bg-slate-900 border border-white/10 hover:border-cyan-400 text-cyan-300 rounded-2xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Evaluate Credibility</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-mono font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !title.trim() || !description.trim()}
                    className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-ufo-green text-black hover:bg-ufo-green/90 font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,157,0.3)] transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-black" />
                    )}
                    <span>Submit to Intel Feed</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
};
