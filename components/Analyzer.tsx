
import React, { useState, useRef, useEffect } from 'react';
import { analyzeMedia } from '../services/geminiService';
import { CaseOps } from '../services/caseOps';
import { ArchiveOps } from '../services/firebaseService';
import Markdown from 'react-markdown';
import { ICONS } from '../constants';
import TacticalLoader from './TacticalLoader';
import SignalPatternAnalyzer from './SignalPatternAnalyzer';

interface AnalyzerProps {
  setView: (view: string, filter?: string | null, investigation?: string | null) => void;
}

const Analyzer: React.FC<AnalyzerProps> = ({ setView }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [poiMarkers, setPoiMarkers] = useState<{x: number, y: number}[]>([]);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const loggedCheckpoints = useRef<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchRecent = async () => {
      const signals = await ArchiveOps.getSignalLogs(10);
      setRecentScans(signals.filter(s => s.type === 'MEDIA_ANALYSIS'));
    };
    fetchRecent();
  }, [analyzing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // [SECURITY_CHECK]: Max 20MB for Gemini Flash
      const MAX_SIZE = 20 * 1024 * 1024;
      if (selectedFile.size > MAX_SIZE) {
        setError("FILE SIZE EXCEEDS 20MB LIMIT. COMPRESS DATA AND RETRY.");
        setFile(null);
        setPreview(null);
        return;
      }

      setFile(selectedFile);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setResult('');
      setPoiMarkers([]);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !preview) return;
    setAnalyzing(true);
    setError(null);
    setResult('');
    setProgress(0);
    setLogs(['>> INITIALIZING FORENSIC SUITE...']);
    setStage('PREPARING DATA...');
    setPoiMarkers([]);
    loggedCheckpoints.current.clear();
    
    const base64Data = preview.split(',')[1];
    const mimeType = file.type;
    const analysisPrompt = prompt.trim() || "What anomalies do you see in this file? Analyze thoroughly.";
    
    const interval = setInterval(() => {
       setProgress(prev => {
          const next = prev + (prev < 50 ? Math.random() * 8 : Math.random() * 2);
          if (Math.random() > 0.85 && poiMarkers.length < 8) setPoiMarkers(cur => [...cur, { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 }]);
          return next >= 98 ? 98 : next;
       });
    }, 200);

    try {
        const text = await analyzeMedia(base64Data, mimeType, analysisPrompt);
        clearInterval(interval);
        setProgress(100);
        setStage('REPORT COMPILED');
        setResult(text);
        
        // [AUTO-ARCHIVE]: Log Forensic Analysis
        ArchiveOps.logSignal({
            query: `Visual Forensic Analysis: ${file.name}`,
            response: text,
            groundingUrls: [],
            type: 'MEDIA_ANALYSIS'
        });

    } catch (e: any) {
        console.error("Analysis Error:", e);
        const errorMsg = e?.message || "";
        
        if (errorMsg.includes("429") || errorMsg.includes("quota")) {
          setError("UPLINK SATURATED. QUOTA EXCEEDED. WAIT FOR RESET.");
        } else if (errorMsg.includes("safety") || errorMsg.includes("HARM")) {
          setError("SECURITY PROTOCOL TRIGGERED: CONTENT BLOCKED BY SAFETY FILTERS.");
        } else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
          setError("SIGNAL LOSS DETECTED. CHECK NETWORK CONNECTIVITY.");
        } else if (errorMsg.includes("large")) {
          setError("PAYLOAD TOO LARGE. REDUCE RESOLUTION AND RETRY.");
        } else {
          setError("FORENSIC CORE FAILURE: UPLINK UNSTABLE OR DATA CORRUPT.");
        }
        
        setLogs(prev => [...prev, "!! CRITICAL ERROR DETECTED !!"]);
        setStage('ANALYSIS ABORTED');
    } finally {
        setAnalyzing(false);
        clearInterval(interval);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState('UFO / UAP');

  const handlePromote = async () => {
    if (!result) return;
    const id = await CaseOps.createCase(
      `Forensic Analysis: ${file?.name || 'Unknown'}`,
      result,
      selectedCategory,
      { 
        id: Date.now().toString(), 
        type: 'Forensic Report', 
        content: result, 
        timestamp: Date.now(),
        urls: [] 
      }
    );
    setView('LOGS', null, id);
  };

  useEffect(() => {
     if (!analyzing) return;
     const checkpoints = [
         { p: 5, msg: '>> ENCRYPTING DATA PACKET...', stage: 'ENCRYPTING...' },
         { p: 20, msg: '>> UPLOADING TO VISION CORE...', stage: 'UPLOADING...' },
         { p: 40, msg: '>> PARSING GEOMETRY & LIGHTING...', stage: 'SCANNING...' },
         { p: 65, msg: '>> ISOLATING ANOMALOUS VECTORS...', stage: 'DETECTING...' },
     ];
     checkpoints.forEach(cp => {
         if (progress >= cp.p && !loggedCheckpoints.current.has(cp.p)) {
             loggedCheckpoints.current.add(cp.p);
             setLogs(prev => [...prev, cp.msg]);
             setStage(cp.stage);
         }
     });
  }, [progress, analyzing]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-24 md:pb-20 px-4 md:px-0">
      <div className="text-center space-y-0 mb-8 md:mb-12">
        <h2 className="text-4xl md:text-8xl font-display font-black text-white/90 tracking-[-0.05em] uppercase leading-[0.75] italic drop-shadow-[0_0_30px_rgba(255,255,255,0.2)] select-none">
          Visual
        </h2>
        <h2 className="text-4xl md:text-8xl font-display font-black text-ufo-green tracking-[0.05em] uppercase leading-[0.75] italic drop-shadow-[0_0_50px_#00ff9d] hypnotic-text select-none">
          Forensics
        </h2>
        <div className="flex items-center justify-center gap-4 md:gap-6 mt-8 md:mt-10">
           <div className="h-px w-10 md:w-16 bg-ufo-green/30"></div>
           <p className="text-ufo-green font-mono font-black tracking-[0.3em] md:tracking-[0.5em] text-[9px] md:text-xs uppercase animate-pulse">Neural Analysis Core</p>
           <div className="h-px w-10 md:w-16 bg-ufo-green/30"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        <div className="lg:col-span-7 space-y-6 md:space-y-8">
          <div 
            className={`glass-panel border-2 border-dashed rounded-[2.5rem] md:rounded-[4rem] h-[350px] md:h-[600px] flex flex-col items-center justify-center cursor-pointer transition-all duration-700 relative overflow-hidden group ${
              file ? 'border-ufo-green bg-ufo-green/5 shadow-[0_0_60px_rgba(0,255,157,0.1)]' : 'border-slate-800/40 hover:border-ufo-green/40 hover:bg-white/[0.01]'
            }`}
            onClick={() => !analyzing && fileInputRef.current?.click()}
          >
            {analyzing && preview && (
                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                    <div className="scanning-beam opacity-50"></div>
                    <div className="absolute inset-0 bg-ufo-green/5 animate-pulse"></div>
                </div>
            )}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(0,255,157,0.15)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(0,255,157,0.15)_1.5px,transparent_1.5px)] bg-[size:40px_40px]"></div>
            
            {preview ? <div className="relative z-10 w-full h-full p-6 md:p-12 flex items-center justify-center animate-in zoom-in-95 duration-500">
              <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain rounded-2xl md:rounded-3xl shadow-2xl border border-white/10" />
              {poiMarkers.map((m, i) => (
                <div key={i} className="absolute w-6 h-6 border-2 border-danger-red rounded-full animate-ping" style={{ left: `${m.x}%`, top: `${m.y}%` }}></div>
              ))}
            </div> : (
              <div className="z-10 text-center space-y-6 md:space-y-8 p-8 md:p-12">
                <div className="w-20 h-20 md:w-32 md:h-32 mx-auto rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-800 group-hover:text-ufo-green group-hover:border-ufo-green/40 transition-all duration-500 scale-110 md:scale-100">
                   <svg className="w-10 h-10 md:w-16 md:h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <div className="space-y-3">
                  <span className="block text-xs md:text-sm text-slate-500 font-display font-black tracking-[0.3em] md:tracking-[0.5em] uppercase">Initialize Link</span>
                  <p className="text-[9px] md:text-[10px] text-ufo-green/40 font-mono tracking-[0.4em] uppercase font-bold leading-relaxed px-4">DRAG OR TAP SOURCE DATA PACKET</p>
                </div>
              </div>
            )}
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} disabled={analyzing} />
          </div>

          <div className="glass-panel p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 bg-white/[0.01]">
             <div className="flex items-center gap-4 mb-6 md:mb-8">
                <div className="w-2 h-2 bg-ufo-green rounded-full shadow-[0_0_12px_#00ff9d] animate-pulse"></div>
                <h4 className="text-[10px] md:text-xs font-display font-black text-white tracking-[0.4em] uppercase">Analysis Protocols</h4>
             </div>
             <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="DEFINE TARGET ANOMALY VECTORS..."
                className="w-full bg-black border border-white/5 rounded-2xl md:rounded-3xl p-6 md:p-8 text-xs md:text-sm font-mono text-white placeholder:text-slate-800 focus:outline-none focus:border-ufo-green/30 transition-all resize-none shadow-inner"
                rows={3}
             />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!file || analyzing}
            className="w-full py-6 md:py-8 bg-ufo-green text-black font-display font-black text-lg md:text-2xl uppercase tracking-[0.4em] md:tracking-[0.6em] hover:bg-white hover:shadow-[0_0_60px_rgba(0,255,157,0.4)] transition-all disabled:opacity-20 rounded-[1.5rem] md:rounded-[2.5rem] active:scale-[0.98] shadow-2xl relative overflow-hidden"
          >
            <span className="relative z-10">{analyzing ? 'EXECUTING SCAN...' : 'INITIATE ANALYSIS'}</span>
            {analyzing && <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20 animate-pulse"></div>}
          </button>
        </div>

        <div className="lg:col-span-5 space-y-8 md:space-y-10 focus-mode-analyzer-output">
          <div className="glass-panel border border-white/5 rounded-[2.5rem] md:rounded-[4rem] min-h-[450px] md:min-h-[600px] overflow-hidden relative bg-[#030305] shadow-2xl flex flex-col">
             <div className="p-6 md:p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center backdrop-blur-xl">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 bg-ufo-green rounded-full"></div>
                   <span className="text-[10px] md:text-xs font-mono text-slate-500 uppercase tracking-[0.3em] font-black">Neural Output</span>
                </div>
                {file && (
                  <span className="text-[9px] font-mono text-ufo-green/60 uppercase tracking-tighter font-bold bg-ufo-green/5 px-3 py-1 rounded-full border border-ufo-green/20">
                    {file.name.slice(0, 20)}...
                  </span>
                )}
             </div>
             {analyzing && <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-3xl p-8 md:p-16 flex flex-col items-center justify-center animate-in fade-in duration-500"><TacticalLoader stage={stage} /></div>}
             
             {error && !analyzing && (
               <div className="absolute inset-0 z-40 bg-danger-red/10 backdrop-blur-3xl p-10 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-danger-red/20 border-2 border-danger-red/30 flex items-center justify-center text-danger-red text-3xl animate-pulse shadow-2xl">
                    {ICONS.ALERT}
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-danger-red font-display font-black tracking-[0.5em] uppercase text-sm md:text-base">System Corruption</h3>
                    <p className="text-white/80 font-mono text-[10px] md:text-xs max-w-[280px] leading-relaxed uppercase font-bold">{error}</p>
                  </div>
                  <button 
                    onClick={() => setError(null)}
                    className="px-10 py-4 bg-white/5 hover:bg-danger-red hover:text-white border border-white/10 rounded-2xl text-[10px] md:text-xs font-mono text-white uppercase tracking-[0.3em] transition-all font-black"
                  >
                    Purge Error Logs
                  </button>
               </div>
             )}

             <div className="p-8 md:p-14 flex-1 overflow-y-auto custom-scrollbar relative">
              {result && !analyzing ? (
                <div className="space-y-10 md:space-y-14 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                  <div className="prose prose-invert prose-xs sm:prose-sm md:prose-xl max-w-none text-slate-400 font-mono tracking-tight leading-relaxed prose-headings:text-ufo-green prose-headings:font-display prose-headings:uppercase">
                    <Markdown>{result}</Markdown>
                  </div>
                  
                  <div className="pt-10 md:pt-14 border-t border-white/5 flex flex-col gap-6">
                     <div className="space-y-3">
                        <label className="text-[10px] font-mono text-slate-700 uppercase tracking-[0.4em] font-black">Anomaly Classification</label>
                        <select 
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full bg-black border border-white/5 rounded-2xl md:rounded-3xl p-5 md:p-6 text-[10px] md:text-xs font-mono text-ufo-green focus:outline-none focus:border-ufo-green/30 tracking-[0.1em] font-black shadow-inner"
                        >
                          {['UFO / UAP', 'Paranormal', 'Cryptid', 'Gov / Black Ops', 'Phenomena', 'Site Intel'].map(cat => (
                            <option key={cat} value={cat} className="bg-slate-900">{cat.toUpperCase()}</option>
                          ))}
                        </select>
                     </div>
                     <button 
                       onClick={handlePromote}
                       className="w-full py-5 md:py-6 bg-warning-amber text-black font-display font-black text-xs md:text-sm uppercase tracking-[0.4em] rounded-[1.5rem] md:rounded-[2.5rem] hover:bg-white transition-all shadow-2xl active:scale-95"
                     >
                       Manifest Case Record
                     </button>
                  </div>
                </div>
              ) : !analyzing && (
                <div className="h-full flex flex-col items-center justify-center text-slate-900 space-y-8 opacity-20 select-none text-center">
                   <div className="text-7xl md:text-8xl">{ICONS.BRAIN}</div>
                   <p className="text-[10px] md:text-xs font-mono uppercase tracking-[0.5em] font-black max-w-[200px] leading-relaxed">Neural Core Synced. Awaiting forensic stream input...</p>
                </div>
              )}
             </div>
          </div>

          <div className="glass-panel border border-white/5 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-12 bg-white/[0.01] shadow-2xl flex flex-col max-h-[400px] md:max-h-[500px]">
             <SignalPatternAnalyzer/>
             <div className="flex items-center justify-between mb-8 md:mb-10 mt-8">
                <div className="flex items-center gap-4">
                   <div className="w-2 h-2 bg-celestial-blue rounded-full shadow-[0_0_12px_#00d0ff] animate-pulse"></div>
                   <h4 className="text-[10px] md:text-xs font-display font-black text-white tracking-[0.4em] uppercase">Scan History</h4>
                </div>
                <span className="text-[8px] md:text-[9px] font-mono text-slate-700 uppercase tracking-widest font-bold">Node_Link: Active</span>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 md:space-y-6">
                {recentScans.length > 0 ? recentScans.map((scan, idx) => (
                  <div key={idx} className="p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-black/40 border border-white/5 hover:border-ufo-green/20 hover:bg-ufo-green/[0.02] transition-all cursor-pointer group animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                     <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-mono text-ufo-green font-black uppercase tracking-[0.1em] truncate max-w-[180px] group-hover:tracking-[0.2em] transition-all">
                           {scan.query.replace('Visual Forensic Analysis: ', '')}
                        </span>
                        <span className="text-[9px] font-mono text-slate-800 uppercase font-black">
                           {new Date(scan.timestamp?.seconds * 1000 || scan.timestamp).toLocaleDateString()}
                        </span>
                     </div>
                     <p className="text-[10px] md:text-xs font-mono text-slate-600 line-clamp-2 leading-relaxed font-bold uppercase tracking-tight">
                        {scan.response}
                     </p>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-900 space-y-4 opacity-20 py-10 text-center">
                     <p className="text-[10px] font-mono uppercase tracking-[0.5em] font-black leading-relaxed">Local scan buffer cleared.</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analyzer;
