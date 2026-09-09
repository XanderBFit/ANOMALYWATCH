
import React, { useState, useEffect, useRef } from 'react';
import { generateKnowledgeGraph, triggerTacticalVibration } from '../services/geminiService';
import { CaseOps } from '../services/caseOps';
import { KnowledgeGraphData, KnowledgeNode } from '../types';
import { ArchiveOps } from '../services/firebaseService';
import Markdown from 'react-markdown';
import { ICONS } from '../constants';
import TacticalLoader from './TacticalLoader';

interface InvestigateProps {
  setView: (view: string) => void;
  initialTopic?: string | null;
}

const THINKING_STEPS = [
    "UPLINKING TO KNOWLEDGE GRAPH...",
    "SCRAPING SURFACE DATA...",
    "IDENTIFYING KEY ENTITIES...",
    "MAPPING HIDDEN CONNECTIONS...",
    "CONSTRUCTING NEURAL WEB...",
    "DECRYPTING SECRETS..."
];

const Investigate: React.FC<InvestigateProps> = ({ setView, initialTopic }) => {
  const [query, setQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  
  // Graph interaction state
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  
  useEffect(() => {
    const savedBookmarks = JSON.parse(localStorage.getItem('anomalyWatch_bookmarks') || '[]');
    setBookmarks(savedBookmarks);

    if (initialTopic) {
      setQuery(initialTopic);
      handleInvestigate(initialTopic);
    }
  }, [initialTopic]);

  const handleBookmark = () => {
    if (!activeTopic) return;
    const updatedBookmarks = bookmarks.includes(activeTopic)
      ? bookmarks.filter(b => b !== activeTopic)
      : [...bookmarks, activeTopic];
    
    setBookmarks(updatedBookmarks);
    localStorage.setItem('anomalyWatch_bookmarks', JSON.stringify(updatedBookmarks));
    triggerTacticalVibration(15);
  };

  const handleInvestigate = async (topic: string) => {
    if (!topic.trim()) return;
    setLoading(true);
    setThinkingStep(0);
    setGraphData(null);
    setSelectedNode(null);
    setActiveTopic(topic);
    
    // Animate the loader steps
    const stepInterval = setInterval(() => {
        setThinkingStep(prev => (prev < THINKING_STEPS.length - 1 ? prev + 1 : prev));
    }, 600);

    try {
        const data = await generateKnowledgeGraph(topic);
        setGraphData(data);
        triggerTacticalVibration([20, 50, 20]);
        
        // [AUTO-ARCHIVE]: Log Investigation
        ArchiveOps.logSignal({
            query: `Deep Dive Investigation: ${topic}`,
            response: data.summary,
            groundingUrls: data.groundingUrls,
            type: 'DEEP_DIVE'
        });

    } catch (e) {
        console.error("Investigation failed", e);
    } finally {
        clearInterval(stepInterval);
        setLoading(false);
    }
  };

  const handleNodeClick = (node: KnowledgeNode) => {
    setSelectedNode(node);
    triggerTacticalVibration(10);
  };

  const handleDeepDiveNode = () => {
    if (selectedNode) {
      setQuery(selectedNode.label);
      handleInvestigate(`${selectedNode.label} (${selectedNode.type})`);
    }
  };

  const handleCreateCase = () => {
      if (!graphData || !activeTopic) return;
      CaseOps.createCase(
          `Deep Investigation: ${activeTopic}`,
          `# ${activeTopic}\n\n${graphData.summary}\n\n## Key Entities Identified\n${graphData.nodes.map(n => `- **${n.label}** (${n.type}): ${n.description}`).join('\n')}`,
          'Deep Dive',
          {
              id: Date.now().toString(),
              type: 'Knowledge Graph',
              content: JSON.stringify(graphData),
              timestamp: Date.now(),
              urls: graphData.groundingUrls,
          }
      );
      setView('opslog');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PERSON': return 'text-ufo-green border-ufo-green bg-ufo-green/10';
      case 'LOCATION': return 'text-celestial-blue border-celestial-blue bg-celestial-blue/10';
      case 'EVENT': return 'text-warning-amber border-warning-amber bg-warning-amber/10';
      case 'ORGANIZATION': return 'text-danger-red border-danger-red bg-danger-red/10';
      default: return 'text-white border-white bg-white/10';
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 animate-in fade-in duration-500 pb-20 relative overflow-hidden">
      
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

      {/* LEFT: Search & Controls */}
      <div className="w-full md:w-80 flex flex-col gap-4 shrink-0 z-10 pointer-events-auto">
        
        {/* Search Bar */}
        <div className="glass-panel p-6 rounded-3xl bg-black/80 border border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-psi-purple via-ufo-green to-celestial-blue opacity-50"></div>
          <h2 className="text-sm font-display font-black text-white tracking-[0.2em] mb-4 flex items-center gap-2">
             <span className="w-2 h-2 bg-psi-purple rounded-full animate-pulse"></span>
             KNOWLEDGE ENGINE
          </h2>
          
          <div className="relative flex gap-2">
             <div className="relative flex-1">
                <input 
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvestigate(query)}
                  placeholder="INPUT TOPIC..."
                  className="w-full bg-black/60 border border-slate-700 rounded-2xl px-4 py-4 text-xs font-mono text-white focus:outline-none focus:border-psi-purple placeholder-slate-600 tracking-widest transition-all shadow-inner"
                />
                <button 
                   onClick={() => handleInvestigate(query)}
                   className="absolute right-2 top-2 p-2 text-psi-purple hover:text-white transition-colors"
                >
                   {ICONS.SEARCH}
                </button>
             </div>
             {activeTopic && (
               <button 
                 onClick={handleBookmark}
                 className={`p-4 rounded-2xl border transition-all ${bookmarks.includes(activeTopic) ? 'bg-psi-purple text-black border-psi-purple' : 'bg-black/60 border-slate-700 text-psi-purple hover:border-psi-purple'}`}
                 title={bookmarks.includes(activeTopic) ? "Remove Bookmark" : "Bookmark Topic"}
               >
                 <svg className="w-5 h-5" fill={bookmarks.includes(activeTopic) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                 </svg>
               </button>
             )}
          </div>
          
          <div className="mt-6 space-y-4">
             {bookmarks.length > 0 && (
               <div className="space-y-2">
                 <div className="text-[9px] font-mono text-psi-purple uppercase tracking-widest mb-2 flex items-center gap-2">
                   <span className="w-1 h-1 bg-psi-purple rounded-full"></span>
                   Bookmarked Vectors
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {bookmarks.map(topic => (
                      <button 
                        key={topic}
                        onClick={() => { setQuery(topic); handleInvestigate(topic); }}
                        className="px-3 py-1.5 rounded-lg text-[9px] font-mono text-psi-purple bg-psi-purple/10 border border-psi-purple/20 hover:bg-psi-purple hover:text-black transition-all truncate max-w-[150px]"
                      >
                         {topic}
                      </button>
                   ))}
                 </div>
               </div>
             )}

             <div className="space-y-2">
                <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2">Suggested Vectors</div>
                {['Tic Tac UFO', 'Skinwalker Ranch', 'Project Blue Book', 'Havana Syndrome', 'Antarctica Anomalies'].map(topic => (
                   <button 
                     key={topic}
                     onClick={() => { setQuery(topic); handleInvestigate(topic); }}
                     className="block w-full text-left px-3 py-2 rounded-lg text-[10px] font-mono text-slate-400 hover:text-white hover:bg-white/5 transition-colors truncate border border-transparent hover:border-white/10"
                   >
                      {topic}
                   </button>
                ))}
             </div>
          </div>
        </div>

        {/* Selected Node Details */}
        <div className={`glass-panel p-6 rounded-3xl bg-black/80 border border-white/10 flex-1 flex flex-col transition-all duration-500 ${selectedNode ? 'opacity-100 translate-x-0' : 'opacity-50 translate-x-[-20px] grayscale'}`}>
           <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">Node Analysis</h3>
           {selectedNode ? (
              <div className="space-y-4 animate-in slide-in-from-left-4 fade-in duration-300">
                 <div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getTypeColor(selectedNode.type)}`}>
                       {selectedNode.type}
                    </span>
                    <h2 className="text-xl font-display font-black text-white mt-2 leading-tight uppercase">{selectedNode.label}</h2>
                 </div>
                 <p className="text-xs font-mono text-slate-300 leading-relaxed border-l-2 border-slate-700 pl-3">
                    {selectedNode.description}
                 </p>
                 <div className="pt-4 mt-auto">
                    <button 
                       onClick={handleDeepDiveNode}
                       className="w-full py-4 bg-psi-purple/20 border border-psi-purple/40 text-psi-purple font-display font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-psi-purple hover:text-black transition-all shadow-[0_0_20px_rgba(176,38,255,0.2)]"
                    >
                       Investigate Node ➜
                    </button>
                 </div>
              </div>
           ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-700 space-y-4">
                 <div className="text-4xl">{ICONS.BRAIN}</div>
                 <p className="text-[10px] font-mono uppercase tracking-widest text-center">Select a node from the neural web to analyze.</p>
              </div>
           )}
        </div>
      </div>

      {/* CENTER: The Visual Graph */}
      <div className="flex-1 relative z-0 flex items-center justify-center overflow-hidden rounded-[3rem] border border-white/5 bg-[#030304] shadow-2xl group/graph">
        
        {/* Loading State */}
        {loading && (
           <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-12">
              <TacticalLoader stage={THINKING_STEPS[thinkingStep]} />
           </div>
        )}

        {/* Empty State */}
        {!graphData && !loading && (
           <div className="text-center space-y-6 opacity-30 select-none">
              <div className="w-64 h-64 border border-dashed border-slate-700 rounded-full flex items-center justify-center mx-auto animate-pulse-slow">
                 <div className="w-48 h-48 border border-slate-800 rounded-full"></div>
              </div>
              <h1 className="text-4xl font-display font-black text-white uppercase tracking-[0.2em]">Neural Link Offline</h1>
              <p className="text-sm font-mono text-slate-500 uppercase tracking-widest">Initiate query to generate knowledge graph</p>
           </div>
        )}

        {/* The Graph */}
        {graphData && !loading && (
           <div className="relative w-full h-full flex items-center justify-center">
              
              {/* Central Topic Node */}
              <div className="absolute z-30 flex flex-col items-center cursor-default">
                 <div className="w-24 h-24 rounded-full bg-black border-4 border-white shadow-[0_0_50px_rgba(255,255,255,0.3)] flex items-center justify-center relative group-hover/graph:scale-105 transition-transform duration-500">
                    <div className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center">
                       {ICONS.NEXUS}
                    </div>
                    {/* Orbit rings */}
                    <div className="absolute inset-[-20px] border border-white/10 rounded-full animate-[spin_10s_linear_infinite]"></div>
                    <div className="absolute inset-[-40px] border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                 </div>
                 <div className="mt-4 bg-black/80 backdrop-blur px-4 py-2 rounded-xl border border-white/20 max-w-[200px] text-center">
                    <span className="text-sm font-display font-black text-white uppercase tracking-widest">{graphData.mainTopic}</span>
                 </div>
              </div>

              {/* Orbiting Entities */}
              <div className="absolute w-full h-full animate-in zoom-in duration-1000">
                 {graphData.nodes.map((node, index) => {
                    // Calculate position in a circle
                    const total = graphData.nodes.length;
                    const angle = (index / total) * 2 * Math.PI;
                    const radius = 35; // Percentage from center
                    const x = 50 + radius * Math.cos(angle);
                    const y = 50 + radius * Math.sin(angle);
                    
                    return (
                       <button
                          key={node.id}
                          onClick={() => handleNodeClick(node)}
                          className={`absolute w-16 h-16 -ml-8 -mt-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-20 hover:scale-125 hover:z-40 ${
                             selectedNode?.id === node.id 
                             ? 'bg-white text-black border-white shadow-[0_0_30px_white]' 
                             : `bg-black ${getTypeColor(node.type).replace('text-', 'border-').split(' ')[1]} hover:bg-slate-900`
                          }`}
                          style={{ left: `${x}%`, top: `${y}%` }}
                       >
                          <span className="text-[8px] font-mono font-black">{node.label.slice(0, 2).toUpperCase()}</span>
                          
                          {/* Label Tooltip */}
                          <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 px-3 py-1 rounded border border-white/20 pointer-events-none transition-opacity z-50 ${selectedNode?.id === node.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                             <span className={`text-[9px] font-mono font-bold uppercase ${getTypeColor(node.type).split(' ')[0]}`}>{node.label}</span>
                          </div>

                          {/* Connection Line to Center (Simulated via transform for simple visuals) */}
                          <div 
                             className="absolute top-1/2 left-1/2 w-[200px] h-[1px] bg-gradient-to-l from-transparent to-white/20 -z-10 origin-left pointer-events-none"
                             style={{ 
                                transform: `rotate(${angle + Math.PI}rad)`,
                                width: '30vh' 
                             }}
                          ></div>
                       </button>
                    );
                 })}
              </div>
              
              {/* Summary Overlay (Bottom Right) */}
              <div className="absolute bottom-6 right-6 max-w-sm glass-panel p-6 rounded-2xl bg-black/90 border border-white/10 shadow-2xl z-40 animate-in slide-in-from-bottom-10 fade-in duration-700 delay-300">
                 <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">Executive Summary</h3>
                 <p className="text-xs font-mono text-slate-300 leading-relaxed mb-4 line-clamp-4">
                    {graphData.summary}
                 </p>
                 <div className="flex gap-2 justify-end">
                    <button 
                       onClick={handleCreateCase} 
                       className="px-4 py-2 bg-ufo-green/20 text-ufo-green border border-ufo-green/40 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-ufo-green hover:text-black transition-all"
                    >
                       Save to Case
                    </button>
                 </div>
              </div>
              
              {/* Source Counter (Top Right) */}
              <div className="absolute top-6 right-6 flex gap-2">
                 {graphData.groundingUrls.slice(0, 3).map((url, i) => (
                    <a key={i} href={url.uri} target="_blank" rel="noreferrer" className="w-8 h-8 rounded flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/20 transition-all text-[8px] font-mono text-slate-400">
                       {i+1}
                    </a>
                 ))}
              </div>

           </div>
        )}
      </div>

    </div>
  );
};

export default Investigate;
