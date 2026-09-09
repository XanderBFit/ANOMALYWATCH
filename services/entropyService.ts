/**
 * Local High-Entropy Highlighting Service
 * Computes character-level Shannon Entropy and identifies high-surprise vocabulary.
 */

// Common low-entropy words to filter out
const COMMON_BASE = new Set([
  'the', 'of', 'and', 'a', 'to', 'in', 'is', 'you', 'that', 'it', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'i',
  'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said',
  'there', 'use', 'an', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these',
  'so', 'some', 'her', 'would', 'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more', 'write', 'go', 'see', 'number', 'no', 'way', 'could'
]);

export function calculateStringEntropy(str: string): number {
  if (!str) return 0;
  const len = str.length;
  const freqs: Record<string, number> = {};
  for (let i = 0; i < len; i++) {
    const char = str[i];
    freqs[char] = (freqs[char] || 0) + 1;
  }
  let entropy = 0;
  for (const char in freqs) {
    const p = freqs[char] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export interface HighlightedToken {
  text: string;
  isAnomalous: boolean;
  entropy?: number;
  reason?: string;
}

export function highlightHighEntropyText(text: string, threshold = 3.5): HighlightedToken[] {
  if (!text) return [];
  // Tokenize using regex that preserves spaces and formatting
  // Matches whitespace \s+, words/numbers [a-zA-Z0-9_\-\.]+, or other characters [^\w\s]
  const regex = /(\s+||[a-zA-Z0-9_\-\.]+||[^\w\s])/g;
  const matches = text.match(regex) || [];
  
  return matches.map(token => {
    const trimmed = token.trim();
    if (trimmed.length >= 4 && /^[a-zA-Z0-9_\-\.]+$/.test(trimmed)) {
      const lower = trimmed.toLowerCase();
      
      // Calculate character-level Shannon Entropy
      const h = calculateStringEntropy(trimmed);
      
      // Compute surprises based on pattern types
      const containsDigits = /\d/.test(trimmed);
      const isCommon = COMMON_BASE.has(lower);
      
      let surpriseRatio = 1.0;
      let reason = "";
      
      if (isCommon) {
        surpriseRatio = 0.4; // Exclude common vocabulary
      } else if (containsDigits) {
        surpriseRatio = 1.6; // High descriptive density
      } else if (trimmed.toUpperCase() === trimmed) {
        surpriseRatio = 1.3; // UPPERCASE acronyms
      } else {
        surpriseRatio = 1.15;
      }
      
      const score = h * surpriseRatio;
      
      if (score > threshold) {
        if (containsDigits) {
          reason = `Dense coordinate/digit value standard deviation (H: ${h.toFixed(2)})`;
        } else if (trimmed.toUpperCase() === trimmed) {
          reason = `Specialized operational signifier/acronym (H: ${h.toFixed(2)})`;
        } else {
          reason = `Rare scientific/technical lexeme (H: ${h.toFixed(2)})`;
        }
        return {
          text: token,
          isAnomalous: true,
          entropy: h,
          reason
        };
      }
    }
    
    return {
      text: token,
      isAnomalous: false
    };
  });
}
