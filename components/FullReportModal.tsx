import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Link as LinkIcon, FileText } from 'lucide-react';
import { FullReport } from '../types';
import { getInDepthReport } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface FullReportModalProps {
  item: { title: string; snippet: string } | null;
  onClose: () => void;
}

export const FullReportModal: React.FC<FullReportModalProps> = ({ item, onClose }) => {
  const [report, setReport] = useState<FullReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (item) {
      setIsLoading(true);
      getInDepthReport(item.title, item.snippet).then(setReport).finally(() => setIsLoading(false));
    }
  }, [item]);

  if (!item) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#0a0a0f] border border-white/10 rounded-3xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
        >
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-widest">{report?.title || item.title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5"/></button>
          </div>

          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-ufo-green"/>
              <p className="text-slate-500 font-mono text-sm mt-4 italic">Synthesizing Signal...</p>
            </div>
          ) : report && (
            <div className="space-y-6 text-slate-300">
               <div className="p-4 bg-white/[0.03] border border-white/5 rounded-xl text-sm italic font-light">{report.summary}</div>
               
               {/* Confidence Score Display */}
               <div className="flex items-center gap-4">
                 <span className="text-xs font-mono font-bold text-slate-500 uppercase">Confidence</span>
                 <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${report.confidenceScore}%` }}
                    className={`h-full ${report.confidenceScore > 80 ? 'bg-ufo-green' : report.confidenceScore > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                   />
                 </div>
                 <span className="text-sm font-mono font-black">{report.confidenceScore}%</span>
               </div>
               
               <div className="prose prose-invert prose-sm max-w-none">
                 <ReactMarkdown>{report.inDepthAnalysis}</ReactMarkdown>
               </div>
               
               {report.groundingUrls.length > 0 && (
                 <div className="pt-6 border-t border-white/10">
                   <h3 className="text-xs font-mono font-bold text-slate-500 uppercase mb-3">Sources</h3>
                   <div className="space-y-2">
                     {report.groundingUrls.map((u, i) => (
                       <a key={i} href={u.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-cyan-400 hover:underline">
                         <LinkIcon className="w-3 h-3" /> {u.title}
                       </a>
                     ))}
                   </div>
                 </div>
               )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
