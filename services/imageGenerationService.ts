/**
 * ANOMALY WATCH - Zero-Cost Tactical Reconnaissance Image Generator Service
 * 
 * Provides 100% free, zero-cost AI visual reconnaissance and tactical FLIR/SAR imaging
 * utilizing open high-fidelity diffusion models (Flux) paired with instant offline
 * procedural radar telemetry vector rendering.
 * 
 * Cost: $0.00 (No API key, no token billing, no subscription required).
 */

export type ReconMode = 
  | 'FLIR_THERMAL' 
  | 'SAR_SATELLITE' 
  | 'NIGHT_VISION' 
  | 'GUN_CAMERA' 
  | 'DAYLIGHT_TELEPHOTO' 
  | 'PROCEDURAL_RADAR';

export interface ReconModeConfig {
  id: ReconMode;
  name: string;
  badge: string;
  sensorCode: string;
  description: string;
  color: string;
  promptPrefix: string;
}

export const RECON_MODES: Record<ReconMode, ReconModeConfig> = {
  FLIR_THERMAL: {
    id: 'FLIR_THERMAL',
    name: 'FLIR Infrared (White-Hot)',
    badge: 'FLIR THERMAL',
    sensorCode: 'AN/AAQ-28 IR-OPTIC',
    description: 'Monochrome thermal contrast highlighting propulsion heat signatures against cold tropospheric clouds.',
    color: '#00ff9d',
    promptPrefix: 'authentic military FLIR forward-looking infrared thermal gun camera photograph, high-contrast monochrome infrared thermal signature, white-hot heat bloom of an anomalous craft, tropospheric clouds background, authentic cockpit HUD reticle, crosshairs, digital elevation telemetry overlay, classified aerospace reconnaissance capture'
  },
  SAR_SATELLITE: {
    id: 'SAR_SATELLITE',
    name: 'SAR Orbital Satellite',
    badge: 'ORBITAL SAR',
    sensorCode: 'LEO-RADAR-ARRAY',
    description: 'Classified synthetic aperture radar capture from low-Earth orbit showing georeferenced terrain returns.',
    color: '#38bdf8',
    promptPrefix: 'classified high-resolution synthetic aperture radar (SAR) satellite reconnaissance photograph from low-earth orbit, top-down tactical terrain perspective, radar return reflections, georeferenced coordinates, false-color radar topography, unidentified aerospace craft silhouette'
  },
  NIGHT_VISION: {
    id: 'NIGHT_VISION',
    name: 'PVS-31 Night Vision (Gen 3)',
    badge: 'NIGHT VISION',
    sensorCode: 'AN/PVS-31A PHOSPHOR',
    description: 'Military-spec green phosphor light amplification revealing luminescent night sky anomalies.',
    color: '#22c55e',
    promptPrefix: 'military Gen-3 night vision goggle photograph, green phosphor luminescent glow, light amplification photon grain, high-altitude night sky with stars, silhouette of a mysterious glowing anomalous craft executing maneuvers, military ground operative POV'
  },
  GUN_CAMERA: {
    id: 'GUN_CAMERA',
    name: 'Fighter Cockpit Gun Camera',
    badge: 'HUD GUN CAMERA',
    sensorCode: 'HUD-AV-REC 60FPS',
    description: 'Heads-up display gun camera optical feed with target lock brackets and airspeed vectors.',
    color: '#fbbf24',
    promptPrefix: 'authentic jet fighter heads up display gun camera optical frame, green vector HUD overlay with pitch ladder and target lock bracket box, high-altitude sky, high speed metallic anomaly maneuvering past fighter jet canopy, telephoto camera grain, authentic military footage'
  },
  DAYLIGHT_TELEPHOTO: {
    id: 'DAYLIGHT_TELEPHOTO',
    name: 'Telephoto Intercept (Optical)',
    badge: 'TELEPHOTO INTERCEPT',
    sensorCode: '800MM ED GLASS',
    description: 'Crisp optical telephoto capture revealing structural metallic surface reflections in daylight.',
    color: '#a855f7',
    promptPrefix: 'telephoto defense camera photograph, 800mm optical telephoto lens, clear daylight tropospheric sky, high altitude aerospace anomaly with brushed titanium or metallic hull reflecting sunlight, subtle atmospheric heat haze distortion, authentic aerospace surveillance photography'
  },
  PROCEDURAL_RADAR: {
    id: 'PROCEDURAL_RADAR',
    name: 'Procedural Radar / HUD Waterfall',
    badge: 'TACTICAL RADAR',
    sensorCode: 'AESA MULTI-BAND',
    description: 'Instant 100% offline client-side vector radar display with azimuth rings and target tracking markers.',
    color: '#10b981',
    promptPrefix: 'procedural vector tactical radar HUD waterfall'
  }
};

export interface ReconImageOptions {
  prompt: string;
  mode?: ReconMode;
  width?: number;
  height?: number;
  seed?: number;
  sightingContext?: {
    id?: string;
    title?: string;
    location?: string;
    coordinates?: [number, number];
    category?: string;
    shape?: string;
  };
}

export interface GeneratedReconImage {
  id: string;
  url: string;
  mode: ReconMode;
  modeLabel: string;
  prompt: string;
  enhancedPrompt: string;
  seed: number;
  timestamp: number;
  width: number;
  height: number;
  source: 'DIFFUSION_FLUX' | 'PROCEDURAL_RADAR';
  telemetry: {
    azimuth: number;
    elevation: number;
    sensor: string;
    coordinates?: [number, number];
    locationName?: string;
    targetName?: string;
  };
}

const STORAGE_KEY = 'aw_recon_imagery_vault_v1';

/**
 * Procedural Vector SVG Generator for 100% offline, instantaneous tactical radar recon
 */
export const generateProceduralRadarSvg = (
  targetTitle: string = 'ANOMALOUS_TARGET_01',
  locationName: string = 'SECTOR_ALPHA',
  coordinates?: [number, number],
  seed: number = 42
): string => {
  const timestamp = new Date().toISOString().substring(11, 19);
  const lat = coordinates ? coordinates[0].toFixed(3) : (34.125 + (seed % 10) * 0.1).toFixed(3);
  const lng = coordinates ? coordinates[1].toFixed(3) : (-118.25 + (seed % 10) * 0.1).toFixed(3);
  const azimuth = ((seed * 37) % 360).toFixed(1);
  const elevation = (15 + ((seed * 19) % 65)).toFixed(1);
  const sanitizedTitle = (targetTitle || 'UNIDENTIFIED_RETURN').toUpperCase().slice(0, 24);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 576" width="100%" height="100%">
    <defs>
      <radialGradient id="radarBg" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#02140d" />
        <stop offset="65%" stop-color="#010a06" />
        <stop offset="100%" stop-color="#000302" />
      </radialGradient>
      <radialGradient id="heatSig" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
        <stop offset="25%" stop-color="#00ff9d" stop-opacity="0.8" />
        <stop offset="60%" stop-color="#06b6d4" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#00ff9d" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="scanBeam" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00ff9d" stop-opacity="0.25" />
        <stop offset="100%" stop-color="#00ff9d" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- Canvas Background -->
    <rect width="1024" height="576" fill="url(#radarBg)" />

    <!-- Tactical Grid Matrix -->
    <g stroke="#00ff9d" stroke-width="0.6" stroke-opacity="0.12" stroke-dasharray="3 3">
      <line x1="0" y1="288" x2="1024" y2="288" />
      <line x1="512" y1="0" x2="512" y2="576" />
      <line x1="0" y1="144" x2="1024" y2="144" />
      <line x1="0" y1="432" x2="1024" y2="432" />
      <line x1="256" y1="0" x2="256" y2="576" />
      <line x1="768" y1="0" x2="768" y2="576" />
    </g>

    <!-- Radar Concentric Rings -->
    <g stroke="#00ff9d" stroke-width="1" stroke-opacity="0.2" fill="none">
      <circle cx="512" cy="288" r="90" />
      <circle cx="512" cy="288" r="180" stroke-dasharray="6 6" />
      <circle cx="512" cy="288" r="260" stroke-opacity="0.35" />
    </g>

    <!-- Scanning Sector Beam -->
    <polygon points="512,288 800,120 720,80" fill="url(#scanBeam)" />

    <!-- Thermal Target Return Signature -->
    <circle cx="590" cy="230" r="85" fill="url(#heatSig)" />
    <circle cx="590" cy="230" r="9" fill="#ffffff" />
    <circle cx="590" cy="230" r="20" stroke="#00ff9d" stroke-width="1.8" fill="none" stroke-dasharray="3 2" />
    
    <!-- Reticle Bracket on Target -->
    <path d="M 565 210 L 565 200 L 575 200" stroke="#00ff9d" stroke-width="2" fill="none" />
    <path d="M 615 210 L 615 200 L 605 200" stroke="#00ff9d" stroke-width="2" fill="none" />
    <path d="M 565 250 L 565 260 L 575 260" stroke="#00ff9d" stroke-width="2" fill="none" />
    <path d="M 615 250 L 615 260 L 605 260" stroke="#00ff9d" stroke-width="2" fill="none" />

    <!-- Target Vector Heading Line -->
    <line x1="590" y1="230" x2="680" y2="170" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2" />
    <polygon points="680,170 668,172 674,180" fill="#ef4444" />
    <text x="605" y="222" fill="#ef4444" font-family="monospace" font-size="11" font-weight="bold">TARGET LOCK: UNCORRELATED</text>

    <!-- Top Telemetry Panel -->
    <rect x="30" y="24" width="410" height="96" fill="#000000" fill-opacity="0.75" stroke="#00ff9d" stroke-width="1" stroke-opacity="0.35" rx="6" />
    <text x="44" y="46" fill="#00ff9d" font-family="monospace" font-size="13" font-weight="bold">TACTICAL RECON // ${sanitizedTitle}</text>
    <text x="44" y="66" fill="#a7f3d0" font-family="monospace" font-size="11">COORD: ${lat}°, ${lng}° | LOC: ${locationName.toUpperCase().slice(0, 20)}</text>
    <text x="44" y="84" fill="#38bdf8" font-family="monospace" font-size="11">AZIMUTH: ${azimuth}° | ELEVATION: ${elevation}° | UTC: ${timestamp}</text>
    <text x="44" y="102" fill="#f59e0b" font-family="monospace" font-size="10">SENSOR: AESA PHASED ARRAY // CONFIDENCE: 94.2%</text>

    <!-- Corner Reticles -->
    <path d="M 20 40 L 20 20 L 40 20" stroke="#00ff9d" stroke-width="2" fill="none" />
    <path d="M 1004 40 L 1004 20 L 984 20" stroke="#00ff9d" stroke-width="2" fill="none" />
    <path d="M 20 536 L 20 556 L 40 556" stroke="#00ff9d" stroke-width="2" fill="none" />
    <path d="M 1004 536 L 1004 556 L 984 556" stroke="#00ff9d" stroke-width="2" fill="none" />

    <!-- Center Crosshairs -->
    <line x1="500" y1="288" x2="524" y2="288" stroke="#00ff9d" stroke-width="1.5" />
    <line x1="512" y1="276" x2="512" y2="300" stroke="#00ff9d" stroke-width="1.5" />
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/**
 * Preload and verify image availability with strict timeout
 */
const preloadImage = (url: string, timeoutMs: number = 8000): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    let isSettled = false;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        resolve(false);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve(true);
      }
    };

    img.onerror = () => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve(false);
      }
    };

    img.src = url;
  });
};

/**
 * Builds the tactical prompt for the diffusion pipeline
 */
export const buildTacticalPrompt = (options: ReconImageOptions): { prompt: string; enhanced: string } => {
  const mode = options.mode || 'FLIR_THERMAL';
  const config = RECON_MODES[mode] || RECON_MODES.FLIR_THERMAL;
  const userText = options.prompt?.trim() || options.sightingContext?.title || 'Unidentified Aerial Phenomenon';

  let contextAdditions = '';
  if (options.sightingContext) {
    if (options.sightingContext.shape) {
      contextAdditions += `, ${options.sightingContext.shape} geometry`;
    }
    if (options.sightingContext.location) {
      contextAdditions += `, over ${options.sightingContext.location}`;
    }
  }

  const enhanced = `${config.promptPrefix}, depicting ${userText}${contextAdditions}, highly detailed, cinematic military atmosphere, 8k resolution, photorealistic, sharp focus`;
  return { prompt: userText, enhanced };
};

/**
 * Generates an intelligence reconnaissance image with zero API cost.
 * Uses Pollinations Flux diffusion engine with automatic fallback to procedural HUD vector radar.
 */
export const generateTacticalReconImage = async (
  options: ReconImageOptions
): Promise<GeneratedReconImage> => {
  const mode = options.mode || 'FLIR_THERMAL';
  const width = options.width || 1024;
  const height = options.height || 576;
  const seed = options.seed !== undefined ? options.seed : Math.floor(Math.random() * 999999);

  const { prompt, enhanced } = buildTacticalPrompt(options);
  const targetTitle = options.sightingContext?.title || prompt;
  const locationName = options.sightingContext?.location || 'Unspecified Coordinates';
  const coordinates = options.sightingContext?.coordinates;

  // If user explicitly chose PROCEDURAL_RADAR, return instant vector SVG
  if (mode === 'PROCEDURAL_RADAR') {
    const svgUrl = generateProceduralRadarSvg(targetTitle, locationName, coordinates, seed);
    const result: GeneratedReconImage = {
      id: `recon-${Date.now()}-${seed}`,
      url: svgUrl,
      mode,
      modeLabel: RECON_MODES[mode].name,
      prompt,
      enhancedPrompt: enhanced,
      seed,
      timestamp: Date.now(),
      width,
      height,
      source: 'PROCEDURAL_RADAR',
      telemetry: {
        azimuth: (seed * 17) % 360,
        elevation: 20 + ((seed * 11) % 60),
        sensor: RECON_MODES[mode].sensorCode,
        coordinates,
        locationName,
        targetName: targetTitle
      }
    };
    saveImageToVault(result);
    return result;
  }

  // 100% Free Pollinations Flux URL
  // Parameters: model=flux, nologo=true, seed, width, height
  const diffusionUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhanced)}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;

  // Test loading with timeout fallback
  const isLoaded = await preloadImage(diffusionUrl, 10000);

  if (isLoaded) {
    const result: GeneratedReconImage = {
      id: `recon-${Date.now()}-${seed}`,
      url: diffusionUrl,
      mode,
      modeLabel: RECON_MODES[mode].name,
      prompt,
      enhancedPrompt: enhanced,
      seed,
      timestamp: Date.now(),
      width,
      height,
      source: 'DIFFUSION_FLUX',
      telemetry: {
        azimuth: (seed * 17) % 360,
        elevation: 20 + ((seed * 11) % 60),
        sensor: RECON_MODES[mode].sensorCode,
        coordinates,
        locationName,
        targetName: targetTitle
      }
    };
    saveImageToVault(result);
    return result;
  }

  // Network or timeout fallback: generate clean procedural vector radar
  const fallbackSvgUrl = generateProceduralRadarSvg(targetTitle, locationName, coordinates, seed);
  const fallbackResult: GeneratedReconImage = {
    id: `recon-${Date.now()}-${seed}`,
    url: fallbackSvgUrl,
    mode,
    modeLabel: `${RECON_MODES[mode].name} (Tactical HUD Fallback)`,
    prompt,
    enhancedPrompt: enhanced,
    seed,
    timestamp: Date.now(),
    width,
    height,
    source: 'PROCEDURAL_RADAR',
    telemetry: {
      azimuth: (seed * 17) % 360,
      elevation: 20 + ((seed * 11) % 60),
      sensor: RECON_MODES[mode].sensorCode,
      coordinates,
      locationName,
      targetName: targetTitle
    }
  };
  saveImageToVault(fallbackResult);
  return fallbackResult;
};

/**
 * Vault Storage for persistent recon imagery
 */
export const getReconVaultImages = (): GeneratedReconImage[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
};

export const saveImageToVault = (image: GeneratedReconImage): void => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getReconVaultImages();
    // Prepend new image and cap at 30 items
    const updated = [image, ...existing.filter(i => i.id !== image.id)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('recon-image-saved', { detail: image }));
  } catch (err) {
    console.warn('Failed saving recon image to vault:', err);
  }
};

export const clearReconVault = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('recon-vault-cleared'));
};
