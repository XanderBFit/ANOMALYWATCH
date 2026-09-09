
import { AgentIdentity } from '../types';
import { AudioOrchestrator } from './audioOrchestrator';

export interface IntelArtifact {
  id: string;
  code: string;
  title: string;
  locationName: string;
  description: string;
  xpReward: number;
  category: string;
}

export const CLASSIFIED_ARTIFACTS: IntelArtifact[] = [
  {
    id: 'ARTIFACT_QUANTUM_FREQ_432',
    code: 'QN-432-HERTZ',
    title: 'Resonant Infrasound Signal Fragment',
    locationName: 'Signal Pattern Analyzer',
    description: 'Sub-audible frequency pulse registered prior to atmospheric ion displacement. Unmatched in civil acoustics database.',
    xpReward: 100,
    category: 'Acoustic Telemetry'
  },
  {
    id: 'ARTIFACT_SECTOR_51_DOSSIER',
    code: 'SEC-51-VECTOR',
    title: 'Covert Transponder Vector Log',
    locationName: 'Global Anomaly Map',
    description: 'Unmarked aerospace object maintaining Mach 6 velocity at 85,000 ft altitude over restricted airspace.',
    xpReward: 100,
    category: 'Aerospace Anomaly'
  },
  {
    id: 'ARTIFACT_NEO_METEOR_CORE',
    code: 'NEO-771-ISO',
    title: 'Extraterrestrial Meteorite Isotope',
    locationName: 'Celestial Tracker',
    description: 'Spectensive signature indicating non-terrestrial metallurgical ratios from an incoming near-Earth trajectory.',
    xpReward: 100,
    category: 'Astrophysical'
  },
  {
    id: 'ARTIFACT_BLACK_BUDGET_LOG',
    code: 'BB-LOG-1972',
    title: 'Project Blue Book Unredacted Note',
    locationName: 'Source Nexus',
    description: 'Declassified memorandum noting multi-sensor radar lock on luminous metallic sphere over coastal facility.',
    xpReward: 100,
    category: 'Gov / Black Ops'
  },
  {
    id: 'ARTIFACT_SHANNON_ENTROPY_KEY',
    code: 'ENT-KEY-99',
    title: 'Quantum Shannon Key Fragment',
    locationName: 'Briefing Room',
    description: 'Statistical entropy anomaly exhibiting non-random information density in military radio frequency bands.',
    xpReward: 100,
    category: 'Fringe Science'
  },
  {
    id: 'ARTIFACT_DEEP_RESEARCH_KEY',
    code: 'OCEAN-MAG-08',
    title: 'Sub-Oceanic Magnetic Anomaly Code',
    locationName: 'Ops Log',
    description: 'Bathymetric sensor cluster recorded localized localized localized magnetic disturbance off Marianas Trench.',
    xpReward: 100,
    category: 'Environmental'
  }
];

export const CLEARANCE_THRESHOLDS = {
  ALPHA: 0,
  BETA: 500,
  GAMMA: 2500,
  OMEGA: 10000
};

export const XP_VALUES = {
  DAILY_LOGIN: 50,
  SCAN_INTEL: 25,
  CREATE_CASE: 100,
  BROADCAST_SIGNAL: 15,
  ANALYZE_MEDIA: 40,
  DEEP_DIVE: 60,
  DISCOVER_ARTIFACT: 100
};

export const ProgressionService = {
  
  getIdentity: (): AgentIdentity => {
    const stored = localStorage.getItem('anomaly_agent_identity');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Backwards compatibility for profiles without XP
      if (typeof parsed.xp === 'undefined') parsed.xp = 0;
      return parsed;
    }
    // Default fallback
    return {
      username: localStorage.getItem('anomalyWatch_username') || 'RECON_GUEST',
      specialty: localStorage.getItem('anomalyWatch_specialty') || 'ANALYST',
      sector: 'SECTOR_01',
      clearance: 'ALPHA',
      xp: 0,
      bio: 'Service history pending...',
      joined: Date.now(),
      watchwords: ['UAP', 'REDACTED', 'ANOMALY']
    };
  },

  saveIdentity: (identity: AgentIdentity) => {
    localStorage.setItem('anomaly_agent_identity', JSON.stringify(identity));
    // Trigger event for UI updates
    window.dispatchEvent(new Event('storage'));
  },

  getDiscoveredArtifactIds: (): string[] => {
    try {
      const stored = localStorage.getItem('anomaly_discovered_artifacts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  discoverArtifact: (artifactId: string): boolean => {
    const artifact = CLASSIFIED_ARTIFACTS.find(a => a.id === artifactId);
    if (!artifact) return false;

    const current = ProgressionService.getDiscoveredArtifactIds();
    if (current.includes(artifactId)) {
      return false; // Already discovered
    }

    const updated = [...current, artifactId];
    localStorage.setItem('anomaly_discovered_artifacts', JSON.stringify(updated));

    // Sound effect
    AudioOrchestrator.playArtifactDiscoveredSound();

    // Add XP
    ProgressionService.addXP(artifact.xpReward, `Discovered Artifact: ${artifact.title}`);

    // Dispatch custom discovery event
    const event = new CustomEvent('anomaly-artifact-discovered', {
      detail: { artifact }
    });
    window.dispatchEvent(event);

    return true;
  },

  calculateClearance: (xp: number): 'ALPHA' | 'BETA' | 'GAMMA' | 'OMEGA' => {
    if (xp >= CLEARANCE_THRESHOLDS.OMEGA) return 'OMEGA';
    if (xp >= CLEARANCE_THRESHOLDS.GAMMA) return 'GAMMA';
    if (xp >= CLEARANCE_THRESHOLDS.BETA) return 'BETA';
    return 'ALPHA';
  },

  getNextThreshold: (currentClearance: string): number => {
    if (currentClearance === 'ALPHA') return CLEARANCE_THRESHOLDS.BETA;
    if (currentClearance === 'BETA') return CLEARANCE_THRESHOLDS.GAMMA;
    if (currentClearance === 'GAMMA') return CLEARANCE_THRESHOLDS.OMEGA;
    return CLEARANCE_THRESHOLDS.OMEGA; // Cap
  },

  addXP: (amount: number, reason: string) => {
    const identity = ProgressionService.getIdentity();
    const oldClearance = identity.clearance;
    
    identity.xp += amount;
    const newClearance = ProgressionService.calculateClearance(identity.xp);
    
    identity.clearance = newClearance;
    ProgressionService.saveIdentity(identity);

    // Dispatch custom event for visual feedback
    const event = new CustomEvent('anomaly-xp-gain', { 
      detail: { amount, reason, leveledUp: newClearance !== oldClearance, newClearance } 
    });
    window.dispatchEvent(event);
  }
};

