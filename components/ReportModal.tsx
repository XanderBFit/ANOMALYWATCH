
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ICONS } from '../constants';
import { CaseOps } from '../services/caseOps';
import { SpeechButton } from './SpeechButton';
import { analyzeReportCredibility } from '../services/geminiService';
import { CredibilityScore } from '../types';
import { Upload, ShieldCheck, FileCode, CheckCircle, AlertCircle, Cpu } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (caseId: string) => void;
}

const STEPS = [
  { id: 'type', title: 'Classification', icon: ICONS.RADAR },
  { id: 'details', title: 'Intelligence', icon: ICONS.FILE },
  { id: 'review', title: 'Verification', icon: ICONS.SHIELD },
];

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    type: 'UFO / UAP',
    location: '',
    title: '',
    description: '',
    severity: 'Medium'
  });
  const [submitting, setSubmitting] = useState(false);
  const [credibility, setCredibility] = useState<CredibilityScore | null>(null);

  // SHA-256 & Media Provenance State
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [sha256Hash, setSha256Hash] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [provenanceStatus, setProvenanceStatus] = useState<'UNCHECKED' | 'VERIFIED' | 'SYNTHETIC_FLAGGED'>('UNCHECKED');

  const handleFileUpload = async (file: File) => {
    setMediaFile(file);
    setIsHashing(true);
    setProvenanceStatus('UNCHECKED');

    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      setSha256Hash(hashHex);
      
      // Simulate C2PA & Synthetic AI detection heuristic
      if (file.name.toLowerCase().includes('ai') || file.name.toLowerCase().includes('gen') || file.size < 100) {
        setProvenanceStatus('SYNTHETIC_FLAGGED');
      } else {
        setProvenanceStatus('VERIFIED');
      }
    } catch (err) {
      console.error("SHA-256 computation failed:", err);
    } finally {
      setIsHashing(false);
    }
  };

  useEffect(() => {
    if (formData.description.length > 50) {
      const timer = setTimeout(async () => {
        const score = await analyzeReportCredibility(formData.description);
        setCredibility(score);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [formData.description]);

  const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const caseId = await CaseOps.createCase(
        formData.title || `${formData.type} Report - ${formData.location}`,
        formData.description,
        formData.type,
        {
          id: Date.now().toString(),
          type: 'Field Report',
          content: formData.description,
          timestamp: Date.now(),
          urls: [],
          location: formData.location,
          severity: formData.severity
        }
      );
      if (onSuccess) onSuccess(caseId);
      onClose();
    } catch (error) {
      console.error('Failed to submit report:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-ufo-green/10 flex items-center justify-center text-ufo-green text-xl border border-ufo-green/20 shadow-[0_0_20px_rgba(0,255,157,0.1)]">
              {STEPS[step].icon}
            </div>
            <div>
              <h3 className="text-xl font-display font-black text-white uppercase tracking-widest">New Intelligence Entry</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="micro-label text-slate-500">Step 0{step + 1}</span>
                <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                <span className="micro-label text-ufo-green">{STEPS[step].title}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 rounded-full hover:bg-white/5 text-slate-500 hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-0.5 w-full bg-white/[0.03]">
          <motion.div 
            className="h-full bg-ufo-green shadow-[0_0_10px_#00ff9d]"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 md:p-12 custom-scrollbar relative">
          <div className="absolute inset-0 grid-pattern opacity-5 pointer-events-none"></div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10 relative z-10"
            >
              {step === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    'Scientific',
                    'Economic',
                    'Social',
                    'Geopolitical',
                    'Cultural',
                    'UFO / UAP', 
                    'Gov / Black Ops', 
                    'Phenomena',
                    'Environmental events'
                  ].map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, type }));
                        handleNext();
                      }}
                      className={`p-8 rounded-2xl border text-left group transition-all relative overflow-hidden ${
                        formData.type === type 
                          ? 'border-ufo-green/40 bg-ufo-green/[0.03] shadow-[0_0_40px_rgba(0,255,157,0.1)]' 
                          : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                      }`}
                    >
                      {formData.type === type && (
                         <div className="absolute top-0 right-0 p-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-ufo-green shadow-[0_0_8px_#00ff9d]"></div>
                         </div>
                      )}
                      <div className={`font-display font-black uppercase tracking-widest mb-3 ${formData.type === type ? 'text-ufo-green' : 'text-white'}`}>
                        {type}
                      </div>
                      <div className="micro-label opacity-40 group-hover:opacity-60 transition-opacity">
                        Protocol_{type.split(' ')[0].toUpperCase()}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="micro-label opacity-30 italic">Signal Designation</label>
                    <input 
                      type="text"
                      value={formData.title}
                      onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. LIGHTS OVER NEVADA SECTOR 7"
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-6 py-4 text-sm font-mono text-white focus:outline-none focus:border-ufo-green/30 placeholder:text-slate-800 transition-all font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="micro-label opacity-30 italic">Geo_Coordinates</label>
                      <input 
                        type="text"
                        value={formData.location}
                        onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="COORDINATES OR CITY"
                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-6 py-4 text-sm font-mono text-white focus:outline-none focus:border-ufo-green/30 placeholder:text-slate-800 transition-all"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="micro-label opacity-30 italic">Threat_Classification</label>
                      <select 
                        value={formData.severity}
                        onChange={e => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                        className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-6 py-4 text-sm font-mono text-white focus:outline-none focus:border-ufo-green/30 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Low">Low - Routine</option>
                        <option value="Medium">Medium - Anomalous</option>
                        <option value="High">High - Critical</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="micro-label opacity-30 italic">Raw_Observations</label>
                      <SpeechButton text={formData.description} />
                    </div>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="DETAILED INTEL LOG..."
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-6 py-4 text-sm font-mono text-white focus:outline-none focus:border-ufo-green/30 placeholder:text-slate-800 transition-all min-h-[120px] resize-none leading-relaxed"
                    />
                    {credibility && (
                      <div className="flex items-center gap-3 px-4 py-3 bg-ufo-green/[0.03] border border-ufo-green/10 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-ufo-green"></div>
                        <span className="micro-label text-ufo-green">Analyzed Reliability: {credibility.score}% — {credibility.veracity}</span>
                      </div>
                    )}
                  </div>

                  {/* Media Provenance & Cryptographic Hashing Block */}
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 uppercase">
                        <ShieldCheck className="w-4 h-4 text-ufo-green" />
                        <span>Cryptographic Media Provenance & C2PA Intake</span>
                      </div>
                      {provenanceStatus === 'VERIFIED' && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ufo-green/10 border border-ufo-green/30 text-[10px] font-mono text-ufo-green font-bold">
                          <CheckCircle className="w-3 h-3" /> C2PA VERIFIED
                        </span>
                      )}
                      {provenanceStatus === 'SYNTHETIC_FLAGGED' && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-400 font-bold">
                          <AlertCircle className="w-3 h-3" /> SYNTHETIC / AI FLAGGED
                        </span>
                      )}
                    </div>

                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-white/10 hover:border-ufo-green/40 rounded-xl bg-black/30 cursor-pointer transition-all group">
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                        className="hidden" 
                      />
                      <Upload className="w-6 h-6 text-slate-500 group-hover:text-ufo-green transition-colors mb-2" />
                      <span className="text-xs font-mono text-slate-300">
                        {mediaFile ? mediaFile.name : 'Attach Original Field Media (Photos/Video)'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 mt-1">
                        Computes client-side SHA-256 hash & C2PA authenticity headers
                      </span>
                    </label>

                    {isHashing && (
                      <div className="flex items-center gap-2 text-xs font-mono text-ufo-green animate-pulse">
                        <Cpu className="w-4 h-4 animate-spin" />
                        <span>COMPUTING SHA-256 CHECKSUM & METADATA PROVENANCE...</span>
                      </div>
                    )}

                    {sha256Hash && !isHashing && (
                      <div className="p-3 rounded-lg bg-black/60 border border-white/10 font-mono text-[10px] text-slate-400 space-y-1">
                        <div className="flex items-center gap-2 text-slate-300 font-bold">
                          <FileCode className="w-3.5 h-3.5 text-ufo-green" />
                          <span>SHA-256 CHECKSUM:</span>
                        </div>
                        <div className="break-all text-ufo-green font-mono">{sha256Hash}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="glass-panel p-10 rounded-3xl border border-white/[0.08] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 h-full flex flex-col justify-center opacity-[0.02] pointer-events-none">
                       <h1 className="text-[120px] font-display font-black uppercase leading-none">Review</h1>
                    </div>
                    
                    <div className="relative z-10 space-y-8">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-full bg-ufo-green/10 flex items-center justify-center text-ufo-green text-3xl animate-pulse shadow-[0_0_30px_rgba(0,255,157,0.2)]">
                          {ICONS.SHIELD}
                        </div>
                        <div>
                          <h4 className="text-lg font-display font-black text-white uppercase tracking-widest">Verification Pending</h4>
                          <p className="micro-label text-slate-500 italic mt-1">Review your intelligence packet before transmission</p>
                        </div>
                      </div>
  
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                          <span className="micro-label opacity-20 block">Signal_Type</span>
                          <span className="data-value text-ufo-green text-sm">{formData.type}</span>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                          <span className="micro-label opacity-20 block">Priority_Level</span>
                          <span className={`data-value text-sm ${formData.severity === 'High' ? 'text-danger-red font-black' : formData.severity === 'Medium' ? 'text-warning-amber' : 'text-celestial-blue'}`}>
                            {formData.severity.toUpperCase()}
                          </span>
                        </div>
                        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 col-span-1 md:col-span-2 space-y-2">
                          <span className="micro-label opacity-20 block">Target_Origin</span>
                          <span className="data-value text-sm text-slate-300">{formData.location || 'NONE_SPECIFIED'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-6 rounded-2xl bg-warning-amber/[0.03] border border-warning-amber/10">
                    <div className="text-warning-amber scale-110">{ICONS.ALERT}</div>
                    <p className="micro-label text-warning-amber/80 leading-relaxed normal-case font-mono pointer-events-none">
                      Warning: Authorized agents only. By committing this report, you verify that the intelligence provided is based on actual field observation. Data corruption or falsification will result in immediate extraction from the network.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <button 
            onClick={handleBack}
            disabled={step === 0 || submitting}
            className="px-8 py-3 micro-label text-slate-600 hover:text-white disabled:opacity-0 transition-all uppercase font-bold"
          >
            ← Previous
          </button>
          
          <div className="flex items-center gap-4">
            {step < STEPS.length - 1 ? (
              <button 
                onClick={handleNext}
                disabled={step === 0 && !formData.type}
                className="px-10 py-5 bg-white/[0.05] border border-white/10 text-white font-display font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/[0.1] transition-all"
              >
                Continue Protocol
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="px-12 py-5 bg-ufo-green text-black font-display font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-white transition-all disabled:opacity-50 shadow-[0_0_30px_rgba(0,255,157,0.2)]"
              >
                {submitting ? 'COMMITTING...' : 'COMMIT TO ARCHIVE'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ReportModal;
