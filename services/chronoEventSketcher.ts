/**
 * ChronoEventSketcher Service
 * Implements highly space-efficient probabilistic data structures:
 * 1. A Bloom Filter for compact, O(1) membership queries of sectors/keywords/entities.
 * 2. A Count-Min Sketch (CMS) for approximate frequency estimation of event types & categories.
 * 3. Delta-Compressed Time-Series Log for ultra-low memory representation of past timestamps.
 */

import { UFOSighting, CaseRecord, AnomalyCategory } from "../types";

// Hash functions for Bloom Filter and Count-Min Sketch
const fnv1a = (str: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
};

const djb2 = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0;
};

const sdbm = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + (hash << 6) + (hash << 16) - hash;
  }
  return hash >>> 0;
};

export class BloomFilter {
  size: number;
  bitArray: boolean[];

  constructor(size = 2048) {
    this.size = size;
    this.bitArray = new Array(size).fill(false);
  }

  add(item: string) {
    const h1 = fnv1a(item) % this.size;
    const h2 = djb2(item) % this.size;
    const h3 = sdbm(item) % this.size;
    this.bitArray[h1] = true;
    this.bitArray[h2] = true;
    this.bitArray[h3] = true;
  }

  test(item: string): boolean {
    const h1 = fnv1a(item) % this.size;
    const h2 = djb2(item) % this.size;
    const h3 = sdbm(item) % this.size;
    return this.bitArray[h1] && this.bitArray[h2] && this.bitArray[h3];
  }

  serialize(): string {
    // Pack 8 boolean flags into one base64 char or string
    let binary = "";
    for (let i = 0; i < this.bitArray.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j++) {
        if (this.bitArray[i + j]) {
          byte |= (1 << j);
        }
      }
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  deserialize(base64: string) {
    const binary = atob(base64);
    this.bitArray = new Array(this.size).fill(false);
    for (let i = 0; i < binary.length; i++) {
      const byte = binary.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        const bitIdx = i * 8 + j;
        if (bitIdx < this.size) {
          this.bitArray[bitIdx] = (byte & (1 << j)) !== 0;
        }
      }
    }
  }
}

export class CountMinSketch {
  width: number;
  depth: number;
  table: number[][];

  constructor(width = 256, depth = 4) {
    this.width = width;
    this.depth = depth;
    this.table = Array.from({ length: depth }, () => new Array(width).fill(0));
  }

  add(item: string, value = 1) {
    for (let i = 0; i < this.depth; i++) {
      const idx = this.hash(item, i) % this.width;
      this.table[i][idx] += value;
    }
  }

  estimate(item: string): number {
    let minVal = Infinity;
    for (let i = 0; i < this.depth; i++) {
      const idx = this.hash(item, i) % this.width;
      minVal = Math.min(minVal, this.table[i][idx]);
    }
    return minVal === Infinity ? 0 : minVal;
  }

  private hash(item: string, index: number): number {
    switch (index) {
      case 0: return fnv1a(item);
      case 1: return djb2(item);
      case 2: return sdbm(item);
      default:
        // Combined linear congruential generator for fallback depths
        return (fnv1a(item) + index * 0xdeece66d + 11) >>> 0;
    }
  }

  serialize(): string {
    return JSON.stringify(this.table);
  }

  deserialize(jsonStr: string) {
    try {
      this.table = JSON.parse(jsonStr);
      this.depth = this.table.length;
      this.width = this.table[0].length;
    } catch (e) {
      console.error("Failed to deserialize Count-Min Sketch", e);
    }
  }
}

/**
 * Delta-Compressed Event Time Logger
 * Packs raw ISO dates or timestamps into custom hourly delta offsets
 * using compact relative arrays.
 */
export interface CompressedChronoArchive {
  baseTimestamp: number;
  hourlyDeltas: number[]; // relative hour additions from base
  categoryMapping: Record<string, number[]>; // category keys to indices of hourlyDeltas
}

export class ChronoEventSketcher {
  private bloom: BloomFilter;
  private cms: CountMinSketch;
  private rawEventCount = 0;
  private archive: CompressedChronoArchive;

  constructor() {
    this.bloom = new BloomFilter();
    this.cms = new CountMinSketch();
    this.archive = {
      baseTimestamp: Date.now(),
      hourlyDeltas: [],
      categoryMapping: {}
    };
    this.loadFromStorage();
  }

  /**
   * Process and sketch an influx of events (sightings or case records)
   */
  sketchEvents(events: Array<UFOSighting | CaseRecord>) {
    if (events.length === 0) return;
    this.rawEventCount = events.length;

    // Reset sketchers
    this.bloom = new BloomFilter();
    this.cms = new CountMinSketch();

    // Determine oldest event to set as base timestamp
    let minTime = Infinity;
    const sorted = [...events].sort((a, b) => {
      const ta = this.parseTime(a);
      const tb = this.parseTime(b);
      return ta - tb;
    });

    sorted.forEach(ev => {
      const t = this.parseTime(ev);
      if (t < minTime) minTime = t;
    });

    if (minTime === Infinity) {
      minTime = Date.now();
    }

    this.archive.baseTimestamp = minTime;
    this.archive.hourlyDeltas = [];
    this.archive.categoryMapping = {};

    sorted.forEach((ev, idx) => {
      const ts = this.parseTime(ev);
      // Delta represented as approximate hours since base (dense integers, very small memory footprint)
      const hourDelta = Math.max(0, Math.round((ts - minTime) / (3600 * 1000)));
      this.archive.hourlyDeltas.push(hourDelta);

      // 1. Sketch into Count-Min Sketch for category and location frequency
      const category = ev.category || "UFO / UAP";
      const location = ev.location || "Unknown Sector";
      this.cms.add(category);
      this.cms.add(location);
      this.cms.add(`${category}::${location}`);

      // 2. Sketch into Bloom Filter for membership validation of words, entities
      this.bloom.add(category);
      this.bloom.add(location);
      
      // Tokenize titles/descriptions/summaries for high-quality semantic checking
      const anyEv = ev as any;
      const textToScan = `${anyEv.title || ""} ${anyEv.description || anyEv.summary || ""}`.toLowerCase();
      const tokens: string[] = textToScan.match(/[a-z0-9]+/g) || [];
      tokens.forEach((tok: string) => {
        if (tok.length > 3) {
          this.bloom.add(tok);
        }
      });

      // Keep index map of categories to support compression-level trend decoding
      if (!this.archive.categoryMapping[category]) {
        this.archive.categoryMapping[category] = [];
      }
      this.archive.categoryMapping[category].push(idx);
    });

    this.saveToStorage();
  }

  private parseTime(ev: any): number {
    if (!ev) return Date.now();
    if (ev.timestamp && typeof ev.timestamp === 'object' && ev.timestamp.seconds) {
      return ev.timestamp.seconds * 1000;
    }
    if (ev.timestamp) {
      const d = new Date(ev.timestamp);
      return isNaN(d.getTime()) ? Date.now() : d.getTime();
    }
    if (ev.date) {
      const d = new Date(ev.date);
      return isNaN(d.getTime()) ? Date.now() : d.getTime();
    }
    if (ev.updatedTimestamp) return ev.updatedTimestamp;
    if (ev.createdTimestamp) return ev.createdTimestamp;
    return Date.now();
  }

  /**
   * Fast O(1) keyword lookup. 0% false negatives, small false positive probability.
   */
  hasEntityOccurred(keyword: string): boolean {
    return this.bloom.test(keyword.toLowerCase().trim());
  }

  /**
   * Approximate frequency of category or loc
   */
  getEstimatedFrequency(term: string): number {
    return this.cms.estimate(term);
  }

  /**
   * Reconstitute low-memory time-series trend of categories for plotting or regression
   */
  reconstituteTrend(category: string, bins = 12): { label: string; count: number }[] {
    const indices = this.archive.categoryMapping[category] || [];
    if (indices.length === 0 || this.archive.hourlyDeltas.length === 0) {
      return Array.from({ length: bins }, (_, i) => ({ label: `Bin ${i + 1}`, count: 0 }));
    }

    const deltas = indices.map(idx => this.archive.hourlyDeltas[idx]);
    const maxDelta = Math.max(...this.archive.hourlyDeltas);
    const minDelta = 0;
    const range = (maxDelta - minDelta) || 1;
    const binSize = range / bins;

    const binnedCounts = new Array(bins).fill(0);
    deltas.forEach(d => {
      const binIdx = Math.min(bins - 1, Math.floor((d - minDelta) / binSize));
      binnedCounts[binIdx]++;
    });

    return binnedCounts.map((count, i) => {
      const hourOffset = minDelta + i * binSize;
      const d = new Date(this.archive.baseTimestamp + hourOffset * 3600 * 1000);
      const label = maxDelta < 48 
        ? `${d.getHours()}:00` 
        : `${d.getMonth() + 1}/${d.getDate()}`;
      return { label, count };
    });
  }

  /**
   * Computes size benchmarks demonstrating the massive memory efficiency gain
   */
  getMemoryMetrics() {
    const rawCharCount = this.rawEventCount * 850; // estimate ~850 chars per raw event JSON
    const estimatedRawBytes = rawCharCount;
    
    // Calculate size of serialized sketched structures
    const bloomStr = this.bloom.serialize();
    const cmsStr = this.cms.serialize();
    const archiveStr = JSON.stringify(this.archive);
    const sketchBytes = bloomStr.length + cmsStr.length + archiveStr.length;

    const savedPercent = Math.max(0, Math.round(((estimatedRawBytes - sketchBytes) / estimatedRawBytes) * 100));

    return {
      rawEventCount: this.rawEventCount,
      estimatedRawBytes,
      sketchBytes,
      savedPercent: estimatedRawBytes > 0 ? savedPercent : 0,
      bloomBitSize: this.bloom.size,
      cmsSize: `${this.cms.width}x${this.cms.depth}`
    };
  }

  private saveToStorage() {
    try {
      localStorage.setItem("anomalyWatch_bloom_sketch", this.bloom.serialize());
      localStorage.setItem("anomalyWatch_cms_sketch", this.cms.serialize());
      localStorage.setItem("anomalyWatch_chrono_archive", JSON.stringify(this.archive));
      localStorage.setItem("anomalyWatch_raw_count", this.rawEventCount.toString());
    } catch (e) {
      console.warn("ChronoEventSketcher storage save failed:", e);
    }
  }

  private loadFromStorage() {
    try {
      const bloom = localStorage.getItem("anomalyWatch_bloom_sketch");
      const cms = localStorage.getItem("anomalyWatch_cms_sketch");
      const arch = localStorage.getItem("anomalyWatch_chrono_archive");
      const count = localStorage.getItem("anomalyWatch_raw_count");

      if (bloom) this.bloom.deserialize(bloom);
      if (cms) this.cms.deserialize(cms);
      if (arch) this.archive = JSON.parse(arch);
      if (count) this.rawEventCount = parseInt(count, 10) || 0;
    } catch (e) {
      console.warn("ChronoEventSketcher load failed, starting fresh:", e);
    }
  }
}

export const chronoEventSketcher = new ChronoEventSketcher();
