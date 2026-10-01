// Tactical Intelligence Speech Narration Service
// Transforms technical telemetry and markdown into fluid, natural spoken briefings.

export interface SpokenSegment {
  id: string;
  sectionTitle: string;
  text: string;
}

export type VoicePersona = 'OPERATIVE' | 'ANALYST' | 'INTERCEPT';

export interface PersonaConfig {
  name: string;
  label: string;
  desc: string;
  pitch: number;
  rate: number;
  gender: 'male' | 'female' | 'any';
  keywords: string[];
}

export const VOICE_PERSONAS: Record<VoicePersona, PersonaConfig> = {
  OPERATIVE: {
    name: 'Operative Dispatch',
    label: 'OPERATIVE DISPATCH',
    desc: 'Deep, calm, clandestine intelligence frequency',
    pitch: 0.82,
    rate: 0.96,
    gender: 'male',
    keywords: ['natural', 'google uk english male', 'microsoft guy online', 'daniel', 'david', 'male', 'en-gb']
  },
  ANALYST: {
    name: 'Operations Analyst',
    label: 'OPERATIONS ANALYST',
    desc: 'Articulate, measured, high-definition operational debrief',
    pitch: 1.0,
    rate: 1.02,
    gender: 'female',
    keywords: ['natural', 'google uk english female', 'microsoft jenny online', 'samantha', 'victoria', 'karen', 'female', 'en-us']
  },
  INTERCEPT: {
    name: 'Tactical Intercept',
    label: 'TACTICAL INTERCEPT',
    desc: 'Urgent, high-cadence tactical wire stream',
    pitch: 0.94,
    rate: 1.15,
    gender: 'any',
    keywords: ['natural', 'alex', 'google us english', 'microsoft mark', 'en-us']
  }
};

/**
 * Phonetically formats intelligence markdown into natural spoken English.
 * Expands technical codes, military acronyms, flight levels, and coordinates.
 */
export function formatIntelForSpeech(raw: string): string {
  if (!raw) return '';

  let speech = raw;

  // 1. Remove markdown links, code blocks, images, horizontal rules
  speech = speech.replace(/```[\s\S]*?```/g, ' ');
  speech = speech.replace(/`([^`]+)`/g, '$1');
  speech = speech.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  speech = speech.replace(/---/g, '. ');

  // 2. Format Header tags and section transitions
  speech = speech.replace(/###\s*⚡?\s*EXECUTIVE OVERVIEW/gi, '\n\nExecutive operational synthesis.\n');
  speech = speech.replace(/###\s*💡?\s*SIGNIFICANCE/gi, '\n\nOperational significance.\n');
  speech = speech.replace(/###\s*⚙️?\s*POTENTIAL CAUSES[\w\s&]*/gi, '\n\nEvaluated hypotheses and potential causes.\n');
  speech = speech.replace(/###\s*🌐?\s*(?:POSSIBLE\s+)?IMPLICATIONS/gi, '\n\nStrategic directives and possible implications.\n');
  speech = speech.replace(/###\s*📡?\s*(?:DETECTED\s+)?TELEMETRY VECTORS/gi, '\n\nCorroborated telemetry vectors.\n');
  speech = speech.replace(/###?\s*/g, '\n\n');

  // 3. Format Cycle and DEFCON headers
  speech = speech.replace(/\*\*CYCLE TIMESTAMP\*\*:\s*([^\n\r]+)/gi, (_m, cycle) => {
    return `Daily Strategic Intelligence Dispatch. Cycle: ${cycle.replace(/\/\//g, ',')}. `;
  });
  speech = speech.replace(/DEFCON:\s*(\d+)/gi, 'Defcon $1');
  speech = speech.replace(/DEFCON\s*(\d+)/gi, 'Defcon $1');

  // 4. Coordinates: e.g. 34.21°N, 128.45°W
  speech = speech.replace(/(\d+\.?\d*)°\s*([NSEW])/gi, '$1 degrees $2');
  speech = speech.replace(/\b([NSEW])\b(?=\s*,|\s*\))/g, (dir) => {
    const map: Record<string, string> = { N: 'North', S: 'South', E: 'East', W: 'West' };
    return map[dir] || dir;
  });

  // 5. Flight Levels & Altitudes: FL480 -> Flight level 4 8 0
  speech = speech.replace(/\bFL(\d)(\d)(\d)\b/gi, 'Flight level $1 $2 $3');
  speech = speech.replace(/\bFL(\d+)\b/gi, 'Flight level $1');
  speech = speech.replace(/\bAlt:\s*/gi, 'Altitude: ');

  // 6. Velocities: Mach 4.2 surge
  speech = speech.replace(/\bMach\s*(\d+\.?\d*)/gi, 'Mach $1');
  speech = speech.replace(/\bVelocity:\s*/gi, 'Velocity: ');

  // 7. Physical sensor units
  speech = speech.replace(/\+(\d+)\s*nT/gi, 'plus $1 nanoteslas');
  speech = speech.replace(/(\d+\.?\d*)\s*nT/gi, '$1 nanoteslas');
  speech = speech.replace(/(\d+\.?\d*)\s*Hz/gi, '$1 hertz');
  speech = speech.replace(/(\d+\.?\d*)\s*km\b/gi, '$1 kilometers');
  speech = speech.replace(/(\d+)\s*kt\b/gi, '$1 knots');

  // 8. Military and Scientific Acronyms Expansion for speech clarity
  const acronyms: Record<string, string> = {
    'NORAD': 'N O R A D',
    'ADS-B': 'A-D-S-B',
    'NOAA': 'N O A A',
    'USGS': 'U S G S',
    'FAA': 'F A A',
    'ATC': 'A T C',
    'UTC': 'U T C',
    'AESA': 'A-E-S-A',
    'ATFLIR': 'A-T-F-L-I-R',
    'CTBTO': 'C T B T O',
    'CINDACTA': 'Cindacta',
    'RADES': 'Rades radar network',
    'SOSUS': 'Sosus listening network',
    'EO/IR': 'electro-optical infrared',
    'RCS': 'radar cross section',
    'UAP': 'U A P',
    'UFO': 'U F O',
    'OSINT': 'open-source intelligence',
    'IR': 'infrared',
    'RF': 'radio frequency',
    'GPS': 'G P S'
  };

  for (const [abbr, spoken] of Object.entries(acronyms)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    speech = speech.replace(regex, spoken);
  }

  // 9. Percentage pronunciations
  speech = speech.replace(/(\d+)%/g, '$1 percent');

  // 10. Strip markdown bold, bullets, hashes, brackets, and emojis
  speech = speech.replace(/\*\*/g, '');
  speech = speech.replace(/[*_~`]/g, '');
  speech = speech.replace(/^[\s]*[-•*]\s+/gm, '');
  speech = speech.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ''); // Emojis
  speech = speech.replace(/\|/g, ', ');
  speech = speech.replace(/\s*;\s*/g, '. ');
  speech = speech.replace(/\s+/g, ' ');

  return speech.trim();
}

/**
 * Splits formatted speech into natural, digestible spoken segments.
 * Solves the browser Web Speech API 15-second cut-off limit and gives chapter progress.
 */
export function splitIntoSpokenSegments(formattedSpeech: string): SpokenSegment[] {
  if (!formattedSpeech) return [];

  // Split on double linebreaks or distinct major sentence clusters
  const rawBlocks = formattedSpeech
    .split(/\n+/)
    .map(b => b.trim())
    .filter(b => b.length > 0);

  const segments: SpokenSegment[] = [];
  let segmentCounter = 0;

  for (const block of rawBlocks) {
    // Identify Section Title if block starts with a milestone
    let sectionTitle = 'Operational Briefing';
    if (/^Daily Strategic Intelligence/i.test(block)) {
      sectionTitle = 'Cycle Identification';
    } else if (/^Executive operational synthesis/i.test(block)) {
      sectionTitle = 'Executive Overview';
    } else if (/^Operational significance/i.test(block)) {
      sectionTitle = 'Operational Significance';
    } else if (/^Evaluated hypotheses/i.test(block)) {
      sectionTitle = 'Potential Hypotheses';
    } else if (/^Strategic directives/i.test(block)) {
      sectionTitle = 'Strategic Directives';
    } else if (/^Corroborated telemetry/i.test(block)) {
      sectionTitle = 'Telemetry Vectors';
    }

    // If block is large (> 220 chars), split into individual sentences
    if (block.length > 220) {
      const sentences = block.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [block];
      let currentChunk = '';

      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;

        if (currentChunk.length + trimmed.length > 200) {
          if (currentChunk.trim()) {
            segments.push({
              id: `seg-${++segmentCounter}`,
              sectionTitle,
              text: currentChunk.trim()
            });
          }
          currentChunk = trimmed + ' ';
        } else {
          currentChunk += trimmed + ' ';
        }
      }

      if (currentChunk.trim()) {
        segments.push({
          id: `seg-${++segmentCounter}`,
          sectionTitle,
          text: currentChunk.trim()
        });
      }
    } else {
      segments.push({
        id: `seg-${++segmentCounter}`,
        sectionTitle,
        text: block
      });
    }
  }

  return segments;
}

/**
 * Resolves the optimal voice for a chosen persona from available SpeechSynthesisVoices.
 */
export function resolvePersonaVoice(
  voices: SpeechSynthesisVoice[],
  persona: VoicePersona
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const config = VOICE_PERSONAS[persona] || VOICE_PERSONAS.OPERATIVE;
  const englishVoices = voices.filter(v => v.lang.startsWith('en') || v.lang.startsWith('en-'));
  const candidatePool = englishVoices.length > 0 ? englishVoices : voices;

  // 1. Keyword search in order of persona priority
  for (const kw of config.keywords) {
    const match = candidatePool.find(v => v.name.toLowerCase().includes(kw));
    if (match) return match;
  }

  // 2. Gender heuristics
  if (config.gender === 'female') {
    const femaleMatch = candidatePool.find(v => 
      /female|samantha|karen|victoria|zira|jenny/i.test(v.name)
    );
    if (femaleMatch) return femaleMatch;
  } else if (config.gender === 'male') {
    const maleMatch = candidatePool.find(v => 
      /male|daniel|david|mark|alex|guy|george/i.test(v.name)
    );
    if (maleMatch) return maleMatch;
  }

  // 3. Fallback to default English voice
  return candidatePool[0] || null;
}
