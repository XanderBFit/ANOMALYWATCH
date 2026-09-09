

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export interface AnalysisResult {
  text: string;
  groundingUrls?: Array<{uri: string, title: string}>;
  mapLocations?: Array<{uri: string, title: string}>;
  initialOpsLogFilter?: string | null;
}

export type AppView = 'dashboard' | 'briefing' | 'nexus' | 'opslog' | 'analyzer' | 'investigate' | 'investigation' | 'archives' | 'protocols' | 'celestial' | 'videointel' | 'map' | 'patternEngine' | 'chatroom' | 'radarWidget';

export type AnomalyCategory = 
  | 'Scientific'
  | 'Economic'
  | 'Social'
  | 'Geopolitical'
  | 'Cultural'
  | 'Scientific breakthroughs'
  | 'Economic anomalies'
  | 'Social trends'
  | 'Geopolitical shifts'
  | 'Cultural trends'
  | 'Technological oddities'
  | 'Environmental events'
  | 'UFO / UAP' 
  | 'Paranormal' 
  | 'Cryptid' 
  | 'Gov / Black Ops' 
  | 'Phenomena' 
  | 'Site Intel';

export const DEFAULT_ANOMALY_CATEGORIES = [
  'Scientific',
  'Economic',
  'Social',
  'Geopolitical',
  'Cultural'
] as const;

export interface AnomalySubmission {
  id: string;
  title: string;
  description: string;
  dateObserved: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  category: AnomalyCategory | string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidenceLinks?: Array<{ url: string; label?: string }>;
  evidenceImages?: Array<{ url: string; caption?: string; sha256?: string }>;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  submittedBy: string;
  submittedAt: number | any;
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNotes?: string;
  credibilityScore?: number;
  aiAnalysis?: string;
  isIntegratedIntoMainFeed?: boolean;
}

export interface RecurringPattern {
  id: string;
  name: string;
  category: string;
  patternType: 'DIURNAL_CYCLE' | 'WEEKLY_PULSE' | 'GEOGRAPHIC_CLUSTER' | 'CROSS_DOMAIN_SURGE' | 'IMPACT_CASCADE';
  cadence: string;
  frequency: number; // occurrences in timeframe
  avgImpactScore: number; // 0-100
  confidence: number; // 0-100
  description: string;
  locations: string[];
  historicalPrecedents: string[];
  recommendedAction: string;
}

export interface EmergingAnomalyPattern {
  id: string;
  title: string;
  category: string;
  firstDetected: string;
  surgeVelocity: number; // e.g. +145%
  impactScore: number; // 0-100
  status: 'ACCELERATING' | 'CRITICAL_SPIKE' | 'DEVELOPING' | 'STABILIZED';
  summary: string;
  evidenceCount: number;
  contributingDrivers: string[];
}

export interface DeepDiveData {
  historicalBackground: string;
  relatedEvents: string[];
  keyFigures: string[];
  potentialFutureImpacts: string;
  summary: string;
}

export interface AnomalyDeepDiveExplanation {
  title: string;
  summary: string;
  historicalContext: {
    originAndTimeline: string;
    precursorCases: Array<{ title: string; date: string; description: string }>;
    significance: string;
  };
  contributingFactorsAndCauses: {
    primaryHypotheses: Array<{ hypothesis: string; probability: string; details: string }>;
    environmentalOrTechnicalFactors: string[];
    fringeOrUnexplainedElements: string;
  };
  expertAndOrganizationalViews: {
    officialStance: string;
    keyOrganizations: Array<{ name: string; position: string; levelOfConcern: string }>;
    expertConsensus: string;
  };
  groundingUrls?: Array<{ uri: string; title: string }>;
  confidenceScore?: number;
}

export interface HistoricalCase {
  title: string;
  summary: string;
  date: string;
  groundingUrls?: Array<{uri: string, title: string}>;
}

export interface HistoricalCasesResult {
  cases: HistoricalCase[];
  groundingUrls: Array<{uri: string, title: string}>;
}

export interface InvestigationBrief {
  title: string;
  topic: string;
  summary: string;
  patterns: Array<{
    title: string;
    description: string;
    strength: 'Weak' | 'Moderate' | 'Strong';
  }>;
  connections: Array<{
    source: string;
    target: string;
    relation: string;
  }>;
  groundingUrls: Array<{uri: string, title: string}>;
  timestamp: number;
}

export interface IntelReport {
  id: string;
  timestamp: number;
  title: string;
  summary: string;
  inDepthAnalysis: string;
  confidenceScore: number;
  groundingUrls: Array<{uri: string, title: string}>;
}

export interface FullReport {
  title: string;
  summary: string;
  inDepthAnalysis: string; 
  groundingUrls: Array<{uri: string, title: string}>;
  timestamp: number;
  confidenceScore: number;
}

export type VoiceName = 'Charon' | 'Kore' | 'Puck' | 'Fenrir' | 'Zephyr';

export interface AgentIdentity {
  username: string; // Callsign
  specialty: string;
  sector: string; // Location/Base
  clearance: 'ALPHA' | 'BETA' | 'GAMMA' | 'OMEGA';
  xp: number; // Experience points
  bio: string; // Generated service history
  joined: number;
  watchwords?: string[];
}

export interface Hotspot {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  intensity: number; // 0.1 to 1.0
  category: AnomalyCategory;
  description: string;
  timestamp?: number;
}

export interface TrendData {
  name: string; // Day of week, e.g., "Mon"
  reports: number; // Estimated volume 0-100
}

export interface SpaceWeather {
  id: string;
  timestamp: number;
  solarFlareLevel: string;
  geomagneticStormLevel: string;
  description: string;
}

export interface AtmosphericData {
  id: string;
  timestamp: number;
  pressure: number;
  ionizationLevel: number;
  description: string;
}

export interface MaritimeData {
  id: string;
  mmsi: string;
  name: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  timestamp: number;
}

export interface RFSignalData {
  id: string;
  timestamp: number;
  frequency: number;
  strength: number;
  description: string;
  location: string;
}

export interface InfrasoundData {
  id: string;
  timestamp: number;
  frequency: number;
  amplitude: number;
  location: string;
  description: string;
}

export interface RadiationData {
  id: string;
  timestamp: number;
  radiationLevel: number; // uSv/h
  location: string;
  description: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  pressure: number;
  inversionLayer: boolean;
  description: string;
}

export interface MirageAnalysis {
  isMirageLikely: boolean;
  mirageType: 'None' | 'Inferior' | 'Superior' | 'Fata Morgana';
  confidence: number;
  reasoning: string;
}

export interface CredibilityScore {
  score: number; // 0-100
  veracity: 'Low' | 'Medium' | 'High' | 'Verified';
  reasoning: string;
  markers: string[]; // Linguistic markers of fabrication or authenticity
}

export interface TrendPrediction {
  category: AnomalyCategory;
  confidence: number;
  title: string;
  prediction: string;
  reasoning: string;
  timeframe: string;
  patterns: string[];
  causes: string[];
  contributingFactors: string[];
}

export interface DashboardProps {
  setView: (view: AppView, initialFilterCategory?: string | null) => void;
  initialFilterCategory?: string | null;
}

export type CaseStatus = 'New Lead' | 'Under Review' | 'Corroborated' | 'Discredited' | 'Archived' | 'Pending Inclusion';
export type EvidenceTier = 'Unvetted' | 'Single-source' | 'Multi-source' | 'Sensor-validated' | 'Official-doc-supported';

export interface CaseArtifact {
  id: string;
  type: string;
  content: string;
  timestamp: number;
  urls?: Array<{uri: string, title: string}>;
  imageUrl?: string;
  location?: string;
  severity?: string;
}

export interface CaseNote {
  id: string;
  timestamp: number;
  author: string;
  text: string;
}

export interface CaseRecord {
  id: string;
  createdTimestamp: number;
  updatedTimestamp: number;
  title: string;
  category: string;
  status: CaseStatus;
  evidenceTier: EvidenceTier;
  confidenceScore: number;
  location?: string;
  summary: string;
  anomalyReasoning?: string;
  briefing?: string;
  collaborators?: string[];
  lastModifiedBy?: string;
  artifacts: CaseArtifact[];
  notes: CaseNote[];
  tags: string[];
  relatedCaseIds: string[];
  isPublicFeed?: boolean;
}

export interface SignalLogEntry {
  id: string;
  timestamp: any;
  operative: string;
  specialty: string;
  query: string;
  response: string;
  groundingUrls: Array<{uri: string, title: string}>;
  type: 'DEEP_DIVE' | 'GEO_SCAN' | 'DAILY_BRIEF' | 'ARCHIVE_QUERY' | 'MEDIA_ANALYSIS' | 'SIGNAL_INTERCEPT' | 'STRATEGIC_DIRECTIVE' | 'GLOBAL_SEARCH';
}

export interface MissionDirective {
  title: string;
  description: string;
  priorityLevel: 'ALPHA' | 'BETA' | 'GAMMA';
  focusTags: string[];
  timestamp: number;
}

export interface CorrelatedVector {
  topic: string;
  reasoning: string;
  suggestedModule?: AppView;
  confidence: number;
}

export interface GlobalSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category?: AnomalyCategory;
}

export interface VideoSearchResult {
  title: string;
  url: string;
  description?: string;
  snippet?: string;
  uploadDate?: string;
  videoId: string;
}

export interface InterceptedSignal {
  id: string;
  timestamp: number;
  category: AnomalyCategory;
  source: string;
  url: string;
  title: string;
  summary: string;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface GlobalAlert {
  id: string;
  type: 'THREAT' | 'BROADCAST' | 'PROMOTION';
  title: string;
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: number;
  actionUrl?: string;
  actionLabel?: string;
  targetView?: AppView;
}

export interface FlightData {
  icao24: string;
  callsign: string;
  origin_country: string;
  longitude: number;
  latitude: number;
  altitude: number;
  velocity: number;
  true_track: number;
}

export interface SeismicEvent {
  id: string;
  place: string;
  time: number;
  updated: number;
  tz: number | null;
  url: string;
  detail: string;
  felt: number | null;
  cdi: number | null;
  mmi: number | null;
  alert: string | null;
  status: string;
  tsunami: number;
  sig: number;
  net: string;
  code: string;
  ids: string;
  sources: string;
  types: string;
  nst: number | null;
  dmin: number | null;
  rms: number | null;
  gap: number | null;
  magType: string;
  type: string;
  title: string;
  mag: number;
  longitude: number;
  latitude: number;
  depth: number;
}

export interface SatelliteData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity?: number;
  type: string;
}

// Knowledge Graph Types
export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'PERSON' | 'LOCATION' | 'EVENT' | 'ORGANIZATION' | 'CONCEPT' | 'ARTIFACT';
  description: string;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  relation: string;
}

export interface KnowledgeGraphData {
  mainTopic: string;
  summary: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  groundingUrls: Array<{uri: string, title: string}>;
}

export interface AlertSubscription {
  id: string;
  location?: string;
  keywords?: string[];
  category?: AnomalyCategory | string;
  timestamp: number;
}

export interface AnomalyTrackingResult {
  summary: string;
  explanation: string;
  matchCriteria: string;
  timestamp: number;
}

export interface UFOSighting {
  id: string;
  title: string;
  date: string;
  location: string;
  locationName?: string;
  description: string;
  category: AnomalyCategory;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  photoUrl?: string;
  timestamp: any;
  operative: string;
  coordinates?: { lat: number; lng: number; alt_ft?: number };
  confidenceScore?: number;
  latitude?: number;
  longitude?: number;
}

export interface CelestialEvent {
  id: string;
  title: string;
  type: 'Meteor Shower' | 'Eclipse' | 'Planetary Alignment' | 'Other';
  date: string;
  visibility: string;
  description: string;
  peakTime?: string;
  coordinates?: { lat: number; lng: number };
}

export interface ChatMessage {
  id?: string;
  sender: string;
  specialty?: string;
  text: string;
  timestamp?: any;
  type?: 'MESSAGE' | 'INTEL' | 'ALERT' | 'ACTION' | 'SYSTEM' | 'AI';
  channel?: string;
}

export interface AccessibleAnomalyExplanation {
  significance: string;
  potentialCauses: string[];
  possibleImplications: string;
  summaryScore?: number;
}

export interface TrendingAnomaly {
  id: string;
  title: string;
  location: string;
  category: AnomalyCategory;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  surgePercentage: number;
  trendingReason: 'NEWLY_DETECTED' | 'ACTIVITY_SPIKE' | 'CHATTER_SURGE' | 'HIGH_VOLTAGE_SERIES';
  activityScore: number;
  timeAgo: string;
  timestamp: number;
  description: string;
  explanation: AccessibleAnomalyExplanation;
  sourceUrl?: string;
}

export interface FinancialMarketAnomaly {
  id: string;
  asset: string;
  assetType: 'CRYPTO' | 'EQUITIES' | 'COMMODITIES' | 'FOREX' | 'VOLATILITY';
  change24h: number;
  currentPrice: string;
  anomalyScore: number;
  signalType: 'SPIKE' | 'FLASH_CRASH' | 'VOLUME_SURGE' | 'DIVERGENCE';
  timestamp: number;
  description: string;
  correlatedIncidents?: string[];
}

export interface SocialMediaTrendFeed {
  id: string;
  platform: 'REDDIT' | 'X_OSINT' | 'BLUESKY' | 'MASTODON' | 'GLOBAL_TELEGRAM';
  topic: string;
  hashtagOrSub: string;
  postVolume24h: number;
  sentiment: 'PANIC' | 'EUPHORIA' | 'SPECULATIVE' | 'ALERT' | 'NEUTRAL';
  velocityScore: number;
  topPostsSummary: string;
  timestamp: number;
  groundingUrls?: Array<{ uri: string; title: string }>;
}

export interface NewsAnomalyFeed {
  id: string;
  headline: string;
  source: string;
  category: 'GEOPOLITICAL' | 'AEROSPACE' | 'TECH_OUTAGE' | 'NATURAL_DISASTER' | 'UNEXPLAINED';
  urgency: 'BREAKING' | 'DEVELOPING' | 'ELEVATED';
  summary: string;
  timestamp: number;
  groundingUrl?: string;
  aiExplanation?: string;
}

export interface EmergingAnomalyRealtimeAnalysis {
  id: string;
  title: string;
  detectedAt: number;
  confidenceScore: number;
  primaryDrivers: {
    socialMedia: string;
    financialMarkets: string;
    newsBreaks: string;
    physicalTelemetry: string;
  };
  rootCauseAnalysis: string;
  impactAssessment: string;
  recommendedAction: string;
  groundingUrls?: Array<{ uri: string; title: string }>;
}

