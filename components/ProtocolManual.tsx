import React, { useState } from 'react';
import { ICONS } from '../constants';
import { CaseOps } from '../services/caseOps';
import { ProgressionService } from '../services/progressionService';
import { AnomalyCategory } from '../types';
import { 
  BookOpen, 
  ShieldAlert, 
  Sparkles, 
  FileText, 
  Check, 
  Copy, 
  Terminal, 
  ArrowRight, 
  AlertTriangle, 
  Info, 
  MapPin, 
  Clock, 
  Send,
  Tag
} from 'lucide-react';

type TabID = 'directives' | 'categories' | 'severities' | 'builder';

interface AnomalyCategoryDetail {
  id: string;
  name: string;
  codename: string;
  definition: string;
  rationale: string;
  threatAssessment: string;
  systemMapping: AnomalyCategory;
}

interface SeverityLevelDetail {
  level: string;
  title: string;
  labelColor: string;
  borderColor: string;
  glowColor: string;
  description: string;
  metrics: string[];
  exampleName: string;
  exampleDesc: string;
  exampleLocation: string;
}

const ProtocolManual: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabID>('directives');
  const [copied, setCopied] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Interactive Builder
  const [builderForm, setBuilderForm] = useState({
    name: '',
    dateTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
    location: '',
    category: 'UFO / UAP' as AnomalyCategory,
    severity: 'Medium',
    description: '',
    hypothesis: ''
  });

  // Unique detailed classifications based on user request
  const customCategories: AnomalyCategoryDetail[] = [
    {
      id: 'STD',
      name: 'Spatio-Temporal & Localized Gravity Dilations',
      codename: 'PROTOCOL_STD_04',
      definition: 'Localized distortions in standard space-time geometries, leading to mechanical/digital chronometer drift, gravitational pocket creation, or coordinate shifts.',
      rationale: 'Vital for tracking micro-wormhole dynamics, dimensional leakage, or localized trans-dimensional propulsion trials. Left unmapped, these dilations pose extreme biological damage risk and telemetry sensor corruption.',
      threatAssessment: 'High-density spatial integrity tracking required.',
      systemMapping: 'Environmental events'
    },
    {
      id: 'EET',
      name: 'Coherent Exotic Electromagnetic Transmissions',
      codename: 'PROTOCOL_EET_09',
      definition: 'Super-coherent radio frequency, scalar, or plasma emissions that exhibit artificial patterns and violate baseline celestial or terrestrial radio physics.',
      rationale: 'Tracking EET allows the organization to pinpoint hidden scalar arrays, non-human navigational markers, or deep subterranean telemetry hubs. Vital for shielding commercial grids from severe magnetic disruption.',
      threatAssessment: 'Active signal analysis and localization.',
      systemMapping: 'Technological oddities'
    },
    {
      id: 'MCC',
      name: 'Psycho-Memetic Cognitive Cascades',
      codename: 'PROTOCOL_MCC_11',
      definition: 'Coordinated, simultaneous shifts in neurological activity or shared sensory projection within localized human populations near active anomalies.',
      rationale: 'MCC events serve as direct indicators of high-intensity dimensional junctions. Documenting these patterns is critical to understanding the psychotronic envelope of active craft and protecting operative neural stability.',
      threatAssessment: 'Cognitive perimeter isolation and shielding.',
      systemMapping: 'Cultural trends'
    },
    {
      id: 'NBC',
      name: 'Atmospheric & Sub-Oceanic Non-Ballistic Craft',
      codename: 'PROTOCOL_NBC_17',
      definition: 'Aerodynamic structures displaying supersonic speed capabilities without trailing sonic booms, instantaneous inertia changes, or absence of heat exhaust.',
      rationale: 'Essential for distinguishing advanced, non-human spacecraft or aquatic assets from national defense prototypes. Map overlays assist military defense coordinators and avoid catastrophic airspace incidents.',
      threatAssessment: 'Instant trajectory modeling and intercept logs.',
      systemMapping: 'UFO / UAP'
    },
    {
      id: 'MBC',
      name: 'Macro-Bioform Cryptid Signatures',
      codename: 'PROTOCOL_MBC_22',
      definition: 'Direct sightings or physical traces of undocumented biological organisms exhibiting anomalous genetic structure or physical traits.',
      rationale: 'Critical to the safe indexing of recovered biological material and mutated ecosystems. Prevents unintended cross-contamination and updates containment parameters for first-contact vectors.',
      threatAssessment: 'Isolation containment and biological vetting.',
      systemMapping: 'Cryptid'
    }
  ];

  // Severity Level definitions with descriptions and illustrative examples
  const severityLevels: SeverityLevelDetail[] = [
    {
      level: 'LOW',
      title: 'Routine Signal / Telemetry Anomaly',
      labelColor: 'text-celestial-blue',
      borderColor: 'border-celestial-blue/20',
      glowColor: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]',
      description: 'Minor variations from the baseline signal, verified as non-hazardous, often single-witness or isolated to standard sensor drift. No threat detected.',
      metrics: ['Single-source telemetry contact', 'No environmental side-effects', 'Zero electromagnetic interference'],
      exampleName: 'Micro-Chronometer Drift S-01',
      exampleDesc: 'A localized digital clock variation of +3.4 seconds affecting non-military systems over a remote forested area.',
      exampleLocation: 'Siberian Sector 04'
    },
    {
      level: 'MEDIUM',
      title: 'Anomalous Coherent Pattern',
      labelColor: 'text-warning-amber',
      borderColor: 'border-warning-amber/20',
      glowColor: 'shadow-[0_0_15px_rgba(245,158,11,0.1)]',
      description: 'Coherent, persistent anomaly corroborated by multiple independent sensors or high-integrity witness personnel. Demands forensic monitoring.',
      metrics: ['Multi-Witness visual corroboration', 'Active sensor matching (Thermal + Radar)', 'Slight electromagnetic hum recorded'],
      exampleName: 'Supersonic Tic-Tac Intercept',
      exampleDesc: 'Radar correlation of an egg-shaped structure moving at Mach 6 with rapid vector shifts and zero thermal exhaust plume.',
      exampleLocation: 'Pacific Off-shore Fleet Grid 7'
    },
    {
      level: 'HIGH',
      title: 'Critical Threat / ACTIVE Hardware Overwrite',
      labelColor: 'text-rose-500',
      borderColor: 'border-rose-500/20',
      glowColor: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
      description: 'Severe localized disruption with physical structural alterations, high scalar radiation, power distribution failures, or operative cognitive distress.',
      metrics: ['Active electrical grid blackout', 'Radiation surge (>2.5 uSv/h)', 'Targeted frequency jamming over regional radius'],
      exampleName: 'West Coast Grid Collapse Echoes',
      exampleDesc: 'Synchronous failure of regional substations following super-charged RF emissions and visual detection of a rotating triangular craft.',
      exampleLocation: 'Nevada Test Site sector'
    },
    {
      level: 'CRITICAL',
      title: 'Ontological Breakout / Planetary Sovereign Alert',
      labelColor: 'text-red-600',
      borderColor: 'border-red-600/30',
      glowColor: 'shadow-[0_0_25px_rgba(220,38,38,0.2)] bg-red-950/10',
      description: 'Systemic breakdown of standard physical laws on a global scale, or highly active planetary-wide signals breaching all encrypted networks simultaneously.',
      metrics: ['Multi-spectrum baseline collapse', 'Atmospheric spatial distortion', 'Synchronous global broadcast over-ride'],
      exampleName: '1420 MHz Synchronized Signal Pulse',
      exampleDesc: 'A rhythmic, high-amplitude transmission interrupting all public and classified defense communication lines with the exact Wow! signal sequence.',
      exampleLocation: 'Simultaneous Global Reception'
    }
  ];

  // Compose summary based on builder input
  const getCompiledSummary = (): string => {
    return `==================================================
           FIELD INTEL ANOMALY SUMMARY
==================================================
ANOMALY NAME:        ${builderForm.name.toUpperCase()}
OBSERVATION TIME:    ${builderForm.dateTime}
SYS_COORDINATES:     ${builderForm.location.toUpperCase()}
METADATA CATEGORY:   ${builderForm.category.toUpperCase()}
WARNING SEVERITY:    ${builderForm.severity.toUpperCase()}

OBSERVATION DETAILS
--------------------------------------------------
${builderForm.description}

HYPOTHESES & EXPLANATIONS
--------------------------------------------------
${builderForm.hypothesis}
==================================================`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCompiledSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCommitSubmit = async () => {
    setIsSubmitting(true);
    setSubmitSuccess(false);
    try {
      // Build summary using the exact template content
      const summaryText = getCompiledSummary();
      const title = builderForm.name || 'UNSPECIFIED TERMINAL ANOMALY';

      // Store in standard case list using CaseOps
      await CaseOps.createCase(
        title,
        summaryText,
        builderForm.category,
        {
          id: `ART-${Date.now()}`,
          type: 'Terminal Standardized Intel',
          content: summaryText,
          timestamp: Date.now(),
          location: builderForm.location,
          severity: builderForm.severity
        },
        builderForm.location
      );

      // Award XP for utilizing correct formatting systems
      ProgressionService.addXP(75, 'Standardized Field Intel Log Transmitted');
      
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch (e) {
      console.error('Failed to commit log', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-32">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-medium tracking-widest text-white uppercase mb-2">OPERATIONAL PROTOCOLS</h1>
          <p className="text-ufo-green font-mono text-[10px] uppercase tracking-[0.4em]">Clearance Level: D17-V3 Global Standard // Secure Network Node</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 md:flex bg-black/40 border border-white/5 p-1 rounded-2xl gap-1">
          {[
            { id: 'directives', label: 'Directives', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'categories', label: 'Categories', icon: <Tag className="w-4 h-4" /> },
            { id: 'severities', label: 'Severity Levels', icon: <ShieldAlert className="w-4 h-4" /> },
            { id: 'builder', label: 'Summary Builder', icon: <Terminal className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id as TabID)}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-mono tracking-wider rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-ufo-green/10 text-ufo-green border border-ufo-green/20 font-bold'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {/* DIRECTIVES TAB */}
        {activeTab === 'directives' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Safety Warning */}
            <section className="bg-rose-950/10 border border-rose-950/30 p-6 rounded-2xl space-y-3">
              <h2 className="text-rose-500 font-mono text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                MANDATORY SAFETY & OPERATIONS WARN
              </h2>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                **PHOTOSENSITIVITY TRIGGER:** The tactile intelligence maps and geo-location overlays utilize rapid chromatic shifts. Operatives are instructed to recalibrate ambient display settings in hardware config panels if sensory discomfort occurs.
              </p>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                **DATA SANITIZATION REQUIREMENTS:** Standard declassification protocols mandate that all personal PII (Agent addresses, email domains) remain strictly isolated from raw field intelligence packets before database commit.
              </p>
            </section>

            {/* Clearance Levels */}
            <section className="space-y-6">
              <h3 className="text-sm font-display uppercase tracking-widest text-white border-l-4 border-ufo-green pl-3">Intel Clearance Hierarchy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { level: '01', title: 'LEVEL 1: OBSERVATION', desc: 'Baseline signal logging. Low anomalous probability. Passive storage in log archive directory.', target: 'OPS LOG // Telemetry Raw' },
                  { level: '02', title: 'LEVEL 2: INVESTIGATION', desc: 'Unusual geospatial clusters confirmed. Active forensic analysis initiated by field agents.', target: 'VISUALS // LOCAL SPECTROMETRY' },
                  { level: '03', title: 'LEVEL 3: CORROBORATION', desc: 'Identified recurring pattern with multi-agency or multi-sensor verification. Dossier compilation authorized.', target: 'CASE FILES // Corroborated Index' },
                  { level: '04', title: 'LEVEL 4: ELEVATION', desc: 'Critical ontological breakpoint detected. Implications on global defense grids or fundamental physics.', target: 'NEXUS BROADCAST // Immediate Alert' }
                ].map((item) => (
                  <div key={item.level} className="p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-ufo-green/20 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-mono font-bold text-white tracking-widest">{item.title}</h4>
                        <span className="text-[10px] font-mono text-ufo-green font-bold">L-{item.level}</span>
                      </div>
                      <p className="text-slate-400 text-xs font-mono leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="mt-4 border-t border-white/5 pt-2 text-[9px] font-mono text-slate-500 uppercase tracking-wider">{item.target}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Sector Guidelines */}
            <section className="space-y-6">
              <h3 className="text-sm font-display uppercase tracking-widest text-white border-l-4 border-celestial-blue pl-3">Sector Directives</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { title: 'COMMAND HUB', icon: ICONS.GRID, desc: 'Central situational monitoring. Read real-time diagnostic volumes, system status log values, and operational updates.' },
                  { title: 'BRIEFING ROOM', icon: ICONS.SEARCH, desc: 'Coordinated Gemini-powered deep search tracking. Synthesizes global records with grounding references.' },
                  { title: 'VISUAL FORENSICS', icon: ICONS.UPLOAD, desc: 'Spectrum-shift pixel analysis. Extracts potential metallic structure outlines from unverified imagery uploads.' },
                  { title: 'FIELD MAPS', icon: ICONS.MAP, desc: 'Interactive geographic hotbeds. Locate active regional clusters, coordinate sweeps, and weather correlations.' },
                  { title: 'AI DEEP DIVE', icon: ICONS.BRAIN, desc: 'Logical framework models. Operates rigorous hypothetical algorithms on selected critical topics.' },
                  { title: 'THE VAULT', icon: ICONS.ARCHIVE, desc: 'Government clearance leaks. Review historic databases of officially declassified military communications.' }
                ].map((sec) => (
                  <div key={sec.title} className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2 text-white font-mono text-xs font-bold uppercase">
                      {sec.icon}
                      {sec.title}
                    </div>
                    <p className="text-slate-500 text-[11px] font-mono leading-relaxed">{sec.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ANOMALY CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-6 bg-black/40 border border-white/5 rounded-2xl">
              <h2 className="text-lg font-mono font-medium tracking-widest text-white mb-2 uppercase">Core Classification Architecture</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                To prevent cognitive overload and maintain robust indexing standards, anomalous signals are strictly partitioned into 5 distinct global categories. The following framework outlines their technical scope and the vital scientific rationale behind keeping active records of each.
              </p>
            </div>

            <div className="space-y-4">
              {customCategories.map((catSpec) => (
                <div key={catSpec.id} className="p-6 rounded-2xl bg-black/50 border border-white/5 hover:border-ufo-green/20 transition-all space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="px-2.5 py-1 bg-ufo-green/10 border border-ufo-green/20 rounded font-mono text-[9px] text-ufo-green font-bold">
                        {catSpec.id}
                      </div>
                      <h3 className="text-sm font-display font-black text-white uppercase tracking-wider">{catSpec.name}</h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{catSpec.codename}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
                    <div className="space-y-2">
                      <span className="text-slate-500 uppercase text-[9px] tracking-wider block">Phenomena Definition:</span>
                      <p className="text-slate-300 leading-relaxed text-[11px]">{catSpec.definition}</p>
                    </div>

                    <div className="space-y-2 border-l border-white/5 pl-0 md:pl-6">
                      <span className="text-ufo-green uppercase text-[9px] tracking-wider block">Operational Rationale:</span>
                      <p className="text-slate-400 leading-relaxed text-[11px] italic">{catSpec.rationale}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5 text-[9px] font-mono text-slate-500">
                    <div className="flex items-center gap-1">
                      <Info className="w-3 h-3 text-slate-400" />
                      <span>THREAT: <span className="text-slate-300 font-bold">{catSpec.threatAssessment}</span></span>
                    </div>
                    <div>
                      <span>SYSTEM ARCHIVE MAPPING: <span className="text-ufo-green font-bold">{catSpec.systemMapping.toUpperCase()}</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEVERITY LEVEL PROTOCOL TAB */}
        {activeTab === 'severities' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-6 bg-black/40 border border-white/5 rounded-2xl">
              <h2 className="text-lg font-mono font-medium tracking-widest text-white mb-2 uppercase">Anomaly Severity Protocols</h2>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                The escalation framework is governed by strict physical and biological impact metrics. Determining severity ensures resource optimization and informs regional operative evacuation levels. Review the metrics and historical templates below.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {severityLevels.map((sev) => (
                <div 
                  key={sev.level} 
                  className={`p-6 rounded-3xl bg-black/50 border ${sev.borderColor} ${sev.glowColor} flex flex-col justify-between space-y-6 transition-all`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className={`font-display font-black text-sm tracking-widest ${sev.labelColor}`}>{sev.level} SEVERITY</span>
                      <span className="text-[10px] font-mono text-slate-600">Metric_V3</span>
                    </div>
                    
                    <h4 className="text-xs font-mono font-bold text-white uppercase">{sev.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-mono text-[11px]">{sev.description}</p>

                    <div className="space-y-1.5 pt-2">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">Validation Triggers:</span>
                      {sev.metrics.map((metric, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[10px] font-mono text-slate-300 leading-none">
                          <span className="text-ufo-green">▪</span>
                          <span>{metric}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Operational Case Example */}
                  <div className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] space-y-2">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Illustrative Case Example:</span>
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-200">
                      <span>{sev.exampleName}</span>
                      <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {sev.exampleLocation}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 leading-relaxed">{sev.exampleDesc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOG BUILDER TAB */}
        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
            {/* Input Form Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="p-5 bg-black/40 border border-white/5 rounded-2xl">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Terminal className="w-4 h-4 text-ufo-green" />
                  Terminal Log Formulator
                </h3>
                <p className="text-[11px] font-mono text-slate-500 leading-relaxed">
                  Enter field intelligence details. The generator automatically structures metadata to compile with standardization templates. Press copy or transmit to save the case directly to the AnomalyVault database.
                </p>
              </div>

              {/* Interactive Form */}
              <div className="p-6 rounded-2xl bg-black/30 border border-white/5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Anomaly Name */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Anomaly Name</label>
                    <input 
                      type="text"
                      value={builderForm.name}
                      onChange={(e) => setBuilderForm({ ...builderForm, name: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ufo-green/50 transition-all"
                    />
                  </div>

                  {/* Observation Date */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Observation Date/Time</label>
                    <div className="relative">
                      <input 
                        type="text"
                        value={builderForm.dateTime}
                        onChange={(e) => setBuilderForm({ ...builderForm, dateTime: e.target.value })}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ufo-green/50 transition-all"
                      />
                      <Clock className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Spatio-Temporal Location</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={builderForm.location}
                      onChange={(e) => setBuilderForm({ ...builderForm, location: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ufo-green/50 transition-all font-bold"
                    />
                    <MapPin className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-500" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category select */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Metadata Classification</label>
                    <select
                      value={builderForm.category}
                      onChange={(e) => setBuilderForm({ ...builderForm, category: e.target.value as AnomalyCategory })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ufo-green/50 transition-all cursor-pointer"
                    >
                      <option value="UFO / UAP">UFO / UAP</option>
                      <option value="Gov / Black Ops">Gov / Black Ops</option>
                      <option value="Geopolitical shifts">Geopolitical shifts</option>
                      <option value="Scientific breakthroughs">Scientific breakthroughs</option>
                      <option value="Technological oddities">Technological oddities</option>
                      <option value="Environmental events">Environmental events</option>
                      <option value="Paranormal">Paranormal</option>
                      <option value="Cryptid">Cryptid</option>
                      <option value="Phenomena">Phenomena</option>
                    </select>
                  </div>

                  {/* Severity Level */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Assign Severity Level</label>
                    <select
                      value={builderForm.severity}
                      onChange={(e) => setBuilderForm({ ...builderForm, severity: e.target.value })}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ufo-green/50 transition-all cursor-pointer"
                    >
                      <option value="Low">Low - Telemetry drift</option>
                      <option value="Medium">Medium - Coherent pattern</option>
                      <option value="High">High - Structural impact</option>
                      <option value="Critical">Critical - Sovereign breach</option>
                    </select>
                  </div>
                </div>

                {/* Raw Observations description */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Observed Anomalous Details</label>
                  <textarea 
                    value={builderForm.description}
                    onChange={(e) => setBuilderForm({ ...builderForm, description: e.target.value })}
                    rows={3}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ufo-green/50 transition-all resize-none leading-relaxed"
                    placeholder="Describe exactly what is unusual..."
                  />
                </div>

                {/* Known or hypothesized explanations */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Hypothesized Explanations</label>
                  <textarea 
                    value={builderForm.hypothesis}
                    onChange={(e) => setBuilderForm({ ...builderForm, hypothesis: e.target.value })}
                    rows={2}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-ufo-green/50 transition-all resize-none leading-relaxed"
                    placeholder="Known physical or structural theories..."
                  />
                </div>
              </div>
            </div>

            {/* Template Outline & Preview Column */}
            <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
              {/* Template Rules */}
              <div className="p-5 bg-black/40 border border-white/5 rounded-2xl space-y-2">
                <span className="text-[9px] font-mono text-ufo-green uppercase tracking-widest font-black block flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-ufo-green animate-pulse" />
                  MANDATORY TEMPLATE SUMMARY PROTOCOL
                </span>
                <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                  The compiled output layout complies with declassification standard order. Anomaly entries MUST isolate the name, spatial coordinates, classification category, and known explanatory context cleanly.
                </p>
              </div>

              {/* Interactive Live Screen output */}
              <div className="flex-1 min-h-[300px] bg-black border border-white/10 rounded-2xl p-5 font-mono text-xs text-white relative flex flex-col justify-between group shadow-inner">
                {/* Visual Terminal Accents */}
                <div className="absolute top-2.5 right-4 flex items-center gap-1.5 opacity-20 group-hover:opacity-60 transition-opacity">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                </div>

                <div className="overflow-x-auto select-all whitespace-pre leading-relaxed scrollbar-thin scrollbar-thumb-white/10 text-ufo-green py-3 text-[11px]">
                  {getCompiledSummary()}
                </div>

                {/* Operational Actions */}
                <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-all rounded-xl font-mono text-xs font-bold text-white uppercase"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-ufo-green" />
                        <span>COPIED TO TERMINAL</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>COPY TEMPLATE</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCommitSubmit}
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-ufo-green text-black hover:bg-white transition-all rounded-xl font-mono text-xs font-bold uppercase disabled:opacity-50 font-black tracking-wider shadow-[0_0_20px_rgba(0,255,157,0.15)]"
                  >
                    {isSubmitting ? (
                      <span>TRANSMITTING CORE...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>TRANSMIT TO VAULT</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status report updates */}
              {submitSuccess && (
                <div className="p-4 bg-ufo-green/10 border border-ufo-green/20 rounded-xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
                  <Check className="w-5 h-5 text-ufo-green flex-shrink-0" />
                  <div className="font-mono text-xs">
                    <span className="text-ufo-green uppercase font-black block">INTELLIGENCE COMMITTED SUCCESSFULLY</span>
                    <span className="text-slate-400 text-[10px]">Vault databases updated. XP authorized. +75 XP awarded to your clearance profile.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center font-mono">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">
          "Systematic classification is our finest defense against cognitive chaos." <br/>
          — D17 RESEARCH ARCHIVAL STANDARDS // INDEX_REV_V3
        </p>
      </div>
    </div>
  );
};

export default ProtocolManual;
