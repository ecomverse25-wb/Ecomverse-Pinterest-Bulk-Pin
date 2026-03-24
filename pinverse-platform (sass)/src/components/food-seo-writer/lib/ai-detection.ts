// ─── Food SEO Writer v2.0 — Anti-AI-Detection Layer (Section 7) ───

import type { BlacklistedPhrase, BurstinessResult, AiDetectionResult } from "../types";
import { TTR_MIN, TTR_MAX, MIN_EXPERIENCE_SIGNALS } from "./constants";

// ─── 7.1 Blacklisted Phrases (15 total) ───

export const BLACKLISTED_PHRASES: { phrase: string; replacement: string }[] = [
  {
    phrase: "In today's fast-paced world",
    replacement: "[Remove entirely — start with specific context]",
  },
  {
    phrase: "Whether you're a seasoned chef or a beginner",
    replacement: '"No matter your skill level" or [Remove]',
  },
  {
    phrase: "Let's dive in",
    replacement: "[Remove — just continue naturally]",
  },
  {
    phrase: "Look no further",
    replacement: "[Remove]",
  },
  {
    phrase: "Takes it to the next level",
    replacement: '"Makes a real difference" or use specific detail',
  },
  {
    phrase: "Game-changer",
    replacement: '"Worth trying" or be specific about why',
  },
  {
    phrase: "Elevate your",
    replacement: '"Improve your" or just describe the improvement',
  },
  {
    phrase: "Savor every bite",
    replacement: "[Remove or replace with specific taste description]",
  },
  {
    phrase: "Culinary journey",
    replacement: "[Remove]",
  },
  {
    phrase: "Mouthwatering",
    replacement: "Use specific flavor descriptions instead",
  },
  {
    phrase: "Tantalizing",
    replacement: "Use specific sensory details instead",
  },
  {
    phrase: "Embark on",
    replacement: "[Remove]",
  },
  {
    phrase: "Delve into",
    replacement: '"Try" or "Explore"',
  },
  {
    phrase: "Tapestry of flavors",
    replacement: "[Remove]",
  },
  {
    phrase: "Symphony of",
    replacement: "[Remove]",
  },
];

/**
 * Scan content for blacklisted AI phrases
 */
export function scanBlacklistedPhrases(content: string): BlacklistedPhrase[] {
  const contentLower = content.toLowerCase();
  return BLACKLISTED_PHRASES.map((bp) => {
    const phraseLower = bp.phrase.toLowerCase();
    let count = 0;
    let idx = 0;
    while ((idx = contentLower.indexOf(phraseLower, idx)) !== -1) {
      count++;
      idx += phraseLower.length;
    }
    return {
      phrase: bp.phrase,
      replacement: bp.replacement,
      found: count > 0,
      count,
    };
  });
}

// ─── 7.2 Burstiness Scoring ───

/**
 * Analyze sentence length distribution for natural burstiness.
 * Healthy content has:
 * - 20-30% short sentences (5-10 words)
 * - 40-50% medium sentences (11-20 words)
 * - 20-30% long sentences (21-35 words)
 * - Less than 5% very long sentences (35+ words)
 */
export function analyzeBurstiness(content: string): BurstinessResult {
  // Strip HTML tags for analysis
  const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  // Split into sentences (handle abbreviations and decimals)
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length === 0) {
    return {
      shortSentences: 0,
      mediumSentences: 0,
      longSentences: 0,
      veryLongSentences: 0,
      isHealthy: false,
      message: "No sentences found in content.",
    };
  }

  let short = 0;
  let medium = 0;
  let long = 0;
  let veryLong = 0;

  for (const sentence of sentences) {
    const wordCount = sentence.split(/\s+/).filter(Boolean).length;
    if (wordCount <= 10) short++;
    else if (wordCount <= 20) medium++;
    else if (wordCount <= 35) long++;
    else veryLong++;
  }

  const total = sentences.length;
  const shortPct = (short / total) * 100;
  const mediumPct = (medium / total) * 100;
  const longPct = (long / total) * 100;
  const veryLongPct = (veryLong / total) * 100;

  // Check if distribution is healthy
  const isHealthy =
    shortPct >= 15 &&
    shortPct <= 35 &&
    mediumPct >= 35 &&
    mediumPct <= 55 &&
    longPct >= 15 &&
    longPct <= 35 &&
    veryLongPct < 8;

  let message = "";
  if (isHealthy) {
    message = `Sentence distribution looks natural. Short: ${shortPct.toFixed(0)}%, Medium: ${mediumPct.toFixed(0)}%, Long: ${longPct.toFixed(0)}%, Very Long: ${veryLongPct.toFixed(0)}%.`;
  } else {
    const issues: string[] = [];
    if (shortPct < 15) issues.push("Add more short punchy sentences (5-10 words)");
    if (shortPct > 35) issues.push("Too many short sentences — add some longer ones");
    if (mediumPct < 35) issues.push("Need more medium-length sentences (11-20 words)");
    if (mediumPct > 55) issues.push("Sentences are too uniform in length — vary more");
    if (longPct < 15) issues.push("Add some longer detail sentences (21-35 words)");
    if (longPct > 35) issues.push("Too many long sentences — break some up");
    if (veryLongPct >= 8) issues.push("Break up very long sentences (35+ words) — they hurt readability");
    message = `Content reads as AI-generated — vary sentence lengths more. ${issues.join(". ")}.`;
  }

  return {
    shortSentences: Math.round(shortPct),
    mediumSentences: Math.round(mediumPct),
    longSentences: Math.round(longPct),
    veryLongSentences: Math.round(veryLongPct),
    isHealthy,
    message,
  };
}

// ─── 7.3 Vocabulary Diversity (Type-Token Ratio) ───

/**
 * Calculate TTR = (unique words / total words)
 * Target: 0.55-0.75 for food blog content
 * Below 0.5 indicates repetitive AI vocabulary
 */
export function calculateTTR(content: string): { ttr: number; isHealthy: boolean } {
  const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0 && /[a-z]/.test(w));

  if (words.length === 0) return { ttr: 0, isHealthy: false };

  const uniqueWords = new Set(words);
  const ttr = uniqueWords.size / words.length;

  return {
    ttr: Math.round(ttr * 100) / 100,
    isHealthy: ttr >= TTR_MIN && ttr <= TTR_MAX,
  };
}

// ─── 7.4 Personal Voice Injection Points ───

const INJECTION_MARKERS = [
  "[INSERT: Your experience making this recipe for the first time]",
  "[INSERT: A specific tip you learned through trial and error]",
  "[INSERT: How your family/friends reacted to this dish]",
];

/**
 * Check for personal experience signals and suggest injection points.
 */
export function detectPersonalVoice(content: string): string[] {
  const text = content.replace(/<[^>]*>/g, " ").toLowerCase();

  // Check for existing experience signals
  const signals = [
    /\bi (tried|made|cooked|baked|tested|discovered)\b/i,
    /\bmy (family|kids|husband|wife|partner|friends)\b/i,
    /\bfirst time\b/i,
    /\bi learned\b/i,
    /\bmy kitchen\b/i,
    /\bwhen i was\b/i,
    /\bi remember\b/i,
    /\bgrowing up\b/i,
  ];

  let foundSignals = 0;
  for (const signal of signals) {
    if (signal.test(text)) foundSignals++;
  }

  if (foundSignals >= MIN_EXPERIENCE_SIGNALS) {
    return []; // No injection needed
  }

  // Suggest injection points
  return INJECTION_MARKERS.slice(0, MIN_EXPERIENCE_SIGNALS - foundSignals + 1);
}

// ─── Full AI Detection Scan ───

export function runAiDetectionScan(content: string): AiDetectionResult {
  const flaggedPhrases = scanBlacklistedPhrases(content);
  const burstiness = analyzeBurstiness(content);
  const { ttr, isHealthy: ttrHealthy } = calculateTTR(content);
  const personalVoiceInjectionPoints = detectPersonalVoice(content);

  return {
    flaggedPhrases,
    burstiness,
    ttr,
    ttrHealthy,
    personalVoiceInjectionPoints,
  };
}
