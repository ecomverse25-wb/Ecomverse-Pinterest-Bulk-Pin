// ─── Food SEO Writer v2.0 — 100-Point Quality Scoring (Section 2.7) ───

import type {
  QualityCheck,
  QualityCategory,
  QualityScoreResult,
  ScoreBand,
  GeneratedContent,
  PinterestCopyResult,
  SchemaResult,
  FormInputs,
} from "../types";
import {
  TITLE_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  META_DESC_MIN_LENGTH,
  META_DESC_MAX_LENGTH,
  KEYWORD_DENSITY_MIN,
  KEYWORD_DENSITY_MAX,
  MAX_H2_KEYWORD_REPEATS,
  PIN_TITLE_MAX_CHARS,
  PIN_DESC_MIN_CHARS,
  PIN_DESC_MAX_CHARS,
  TOBI_MAX_WORDS,
  OPTIMAL_PASSAGE_MIN_WORDS,
  OPTIMAL_PASSAGE_MAX_WORDS,
  FAQ_MIN_COUNT,
  QUALITY_BLOCK_THRESHOLD,
  SCORE_BANDS,
} from "./constants";
import { scanBlacklistedPhrases, analyzeBurstiness, calculateTTR } from "./ai-detection";

// ─── Score Band Lookup ───

function getScoreBand(score: number): ScoreBand {
  for (const band of SCORE_BANDS) {
    if (score >= band.min && score <= band.max) return band.label;
  }
  return "Redo";
}

// ─── Helper: Count keyword in text ───

function countKeywordOccurrences(text: string, keyword: string): number {
  const lowerText = text.toLowerCase();
  const lowerKw = keyword.toLowerCase();
  let count = 0;
  let idx = 0;
  while ((idx = lowerText.indexOf(lowerKw, idx)) !== -1) {
    count++;
    idx += lowerKw.length;
  }
  return count;
}

// ─── Helper: Extract plain text from HTML ───

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ─── Helper: Get H2 headings from content ───

function getH2s(html: string): string[] {
  const matches = html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi);
  return [...matches].map((m) => m[1].replace(/<[^>]*>/g, "").trim());
}

// ─── Category 1: Content Quality (25 Points) ───

function scoreContentQuality(
  content: GeneratedContent,
  inputs: FormInputs
): QualityCategory {
  const checks: QualityCheck[] = [];
  const text = stripHtml(content.articleHtml);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Recipe completeness (8 pts)
  const hasRecipe = content.recipeCards.length > 0;
  const recipe = content.recipeCards[0];
  let recipePoints = 0;
  let recipeIssue = "";
  if (inputs.core.contentType === "Single Recipe Post" || inputs.core.contentType === "Meal Prep Guide") {
    if (!hasRecipe) {
      recipeIssue = "No recipe card found. Single Recipe Posts MUST include a full recipe.";
    } else {
      const hasIngredients = recipe.ingredients.length >= 3;
      const hasInstructions = recipe.instructions.length >= 3;
      const hasTimes = recipe.prepTime && recipe.cookTime && recipe.totalTime;
      const hasServings = !!recipe.servings;
      if (hasIngredients && hasInstructions && hasTimes && hasServings) {
        recipePoints = 8;
      } else {
        recipePoints = 4;
        recipeIssue = "Recipe card is incomplete — check ingredients, instructions, times, or servings.";
      }
    }
  } else if (inputs.core.contentType === "Recipe Roundup/Listicle" || inputs.core.contentType === "Holiday/Seasonal") {
    // Roundups should NOT have full recipes inline
    const hasFullRecipeInline = !!content.articleHtml.match(/###?\s*Ingredients/i);
    if (hasFullRecipeInline) {
      recipePoints = 2;
      recipeIssue = "Roundup/Listicle posts should NOT include full recipes inline. Use preview descriptions and link to individual recipes.";
    } else {
      recipePoints = 8;
    }
  } else {
    recipePoints = 8; // Not applicable
  }
  checks.push({
    name: "Recipe completeness",
    maxPoints: 8,
    earnedPoints: recipePoints,
    criteria: "Full ingredients with measurements, numbered steps, times, servings",
    issue: recipeIssue || undefined,
    fixSuggestion: recipeIssue ? "Ensure recipe card has all required fields." : undefined,
  });

  // Content depth (5 pts)
  const wordTarget =
    inputs.core.wordCountTarget === "Short (800-1200)" ? 1000 :
    inputs.core.wordCountTarget === "Long (3000-4500)" ? 3750 : 2000;
  const withinRange = Math.abs(wordCount - wordTarget) / wordTarget <= 0.1;
  checks.push({
    name: "Content depth",
    maxPoints: 5,
    earnedPoints: withinRange ? 5 : wordCount > wordTarget * 0.8 ? 3 : 1,
    criteria: `Meets word count target (${wordTarget} ±10%). Current: ${wordCount} words.`,
    issue: !withinRange ? `Word count ${wordCount} is outside ±10% of target ${wordTarget}` : undefined,
  });

  // Engagement elements (4 pts)
  const hasSubstitutions = /substitut|swap|replace|instead of/i.test(text);
  const hasStorage = /storage|store|refrigerat|freez/i.test(text);
  const hasTips = /tip:|pro tip|here's a trick|my trick/i.test(text);
  const hasAnecdote = /i (tried|made|remember|learned|discovered)/i.test(text);
  const engagementCount = [hasSubstitutions, hasStorage, hasTips, hasAnecdote].filter(Boolean).length;
  checks.push({
    name: "Engagement elements",
    maxPoints: 4,
    earnedPoints: Math.min(engagementCount, 4),
    criteria: "Practical tips, substitutions, storage info, personal anecdotes present",
    issue: engagementCount < 3 ? `Only ${engagementCount}/4 engagement elements found` : undefined,
  });

  // No placeholder text (3 pts)
  const hasPlaceholders = /\[(?!INSERT)[^\]]*\]|Lorem ipsum|TBD|TODO/i.test(text);
  checks.push({
    name: "No placeholder text",
    maxPoints: 3,
    earnedPoints: hasPlaceholders ? 0 : 3,
    criteria: "Zero instances of [bracket placeholders], Lorem ipsum, or TBD markers",
    issue: hasPlaceholders ? "Found placeholder text in content" : undefined,
    fixSuggestion: hasPlaceholders ? "Remove all bracket placeholders and TBD markers." : undefined,
  });

  // Image placement (2 pts) — Correction 1: reduced from 3 to allow TTR check
  // Bug Fix 4: detect markdown image patterns ![...](...) and HTML <img> tags
  const imgTagCount = (content.articleHtml.match(/<img/gi) || []).length;
  const mdImageCount = (content.articleHtml.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
  const imageCount = imgTagCount + mdImageCount;
  const expectedImages = Math.floor(wordCount / 350);
  checks.push({
    name: "Image placement",
    maxPoints: 2,
    earnedPoints: imageCount >= expectedImages ? 2 : imageCount > 0 ? 1 : 0,
    criteria: `Image markers every 300-400 words (expected ~${expectedImages}, found ${imageCount})`,
    issue: imageCount < expectedImages ? `Need more image placeholders (${imageCount} found, ~${expectedImages} expected)` : undefined,
  });

  // Broken sentences check (2 pts)
  const brokenSentences = text.match(/[A-Z][^.!?]*(?:\.\.\.|…)(?!\s*[A-Z"])/g) || [];
  checks.push({
    name: "Broken sentences check",
    maxPoints: 2,
    earnedPoints: brokenSentences.length === 0 ? 2 : 0,
    criteria: "No grammatically incomplete sentences",
    issue: brokenSentences.length > 0 ? `Found ${brokenSentences.length} potentially broken sentences` : undefined,
  });

  // Title-Content Count Match (1 pt) — for listicle/roundup posts
  const titleNumMatch = content.title.match(/(\d+)/);
  let titleNum = titleNumMatch ? parseInt(titleNumMatch[1], 10) : 0;
  if (titleNum > 15) titleNum = 15; // Cap at 15 to match generation rules
  
  const isListicle = inputs.core.contentType === "Recipe Roundup/Listicle" || inputs.core.contentType === "Holiday/Seasonal";
  const contentH2s = getH2s(content.articleHtml);
  // Filter out non-recipe H2s (FAQ, intro, conclusion, tips, shopping lists, etc.)
  const recipeH2s = contentH2s.filter(h => !/faq|frequently asked|conclusion|introduction|planning|shopping list|tips|storage|why these|related|nutrition note/i.test(h));
  if (isListicle && titleNum >= 5) {
    const countMatch = recipeH2s.length >= titleNum;
    checks.push({
      name: "Title-Content count match",
      maxPoints: 1,
      earnedPoints: countMatch ? 1 : 0,
      criteria: `Title promises ${titleNum} items. Found ${recipeH2s.length} recipe H2 sections.`,
      issue: !countMatch ? `Title says "${titleNum}" but article has only ${recipeH2s.length} recipe sections. Content must match the title promise.` : undefined,
      fixSuggestion: !countMatch ? `Add ${titleNum - recipeH2s.length} more recipe H2 sections to match the title.` : undefined,
    });
  } else {
    checks.push({
      name: "Title-Content count match",
      maxPoints: 1,
      earnedPoints: 1,
      criteria: "N/A (not a numbered listicle)",
    });
  }

  // Missing/Placeholder images (1 pt)
  const placeholderCount = (content.articleHtml.match(/src=["']image-placeholder["']/gi) || []).length
    + (content.articleHtml.match(/class="image-placeholder"/gi) || []).length;
  checks.push({
    name: "Image generation completeness",
    maxPoints: 1,
    earnedPoints: placeholderCount === 0 ? 1 : 0,
    criteria: `${placeholderCount} unreplaced image placeholder(s) found`,
    issue: placeholderCount > 0 ? `${placeholderCount} images are still placeholders. Use the "Regenerate Image" buttons to generate real images.` : undefined,
    fixSuggestion: placeholderCount > 0 ? "Click 'Regenerate All Missing Images' in the article preview tab." : undefined,
  });

  const totalEarned = checks.reduce((sum, c) => sum + c.earnedPoints, 0);
  return { name: "Content Quality", maxPoints: 26, earnedPoints: totalEarned, checks };
}

// ─── Category 2: SEO (25 Points) ───

function scoreSEO(
  content: GeneratedContent,
  inputs: FormInputs
): QualityCategory {
  const checks: QualityCheck[] = [];
  const keyword = inputs.core.mainKeyword.toLowerCase();
  const text = stripHtml(content.articleHtml);
  const h2s = getH2s(content.articleHtml);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Title tag (4 pts)
  const titleLen = content.title.length;
  const titleHasKeyword = content.title.toLowerCase().includes(keyword);
  const titleOk = titleLen >= TITLE_MIN_LENGTH && titleLen <= TITLE_MAX_LENGTH && titleHasKeyword;
  checks.push({
    name: "Title tag",
    maxPoints: 4,
    earnedPoints: titleOk ? 4 : titleHasKeyword ? 2 : 0,
    criteria: `50-60 chars (${titleLen}), keyword present: ${titleHasKeyword ? "✓" : "✗"}`,
    issue: !titleOk ? `Title is ${titleLen} chars (target: 50-60). Keyword ${titleHasKeyword ? "present" : "MISSING"}.` : undefined,
  });

  // Meta description (3 pts)
  const metaLen = content.metaDescription.length;
  const metaHasKeyword = content.metaDescription.toLowerCase().includes(keyword);
  const metaOk = metaLen >= META_DESC_MIN_LENGTH && metaLen <= META_DESC_MAX_LENGTH && metaHasKeyword;
  checks.push({
    name: "Meta description",
    maxPoints: 3,
    earnedPoints: metaOk ? 3 : metaHasKeyword ? 1 : 0,
    criteria: `120-160 chars (${metaLen}), keyword present: ${metaHasKeyword ? "✓" : "✗"}`,
    issue: !metaOk ? `Meta is ${metaLen} chars (target: 120-160). Keyword ${metaHasKeyword ? "present" : "MISSING"}.` : undefined,
  });

  // Keyword distribution (5 pts)
  const keywordCount = countKeywordOccurrences(text, keyword);
  const kwWords = keyword.split(/\s+/).length;
  const density = wordCount > 0 ? (keywordCount * kwWords / wordCount) * 100 : 0;
  const densityOk = density >= KEYWORD_DENSITY_MIN && density <= KEYWORD_DENSITY_MAX;
  const firstPara = text.slice(0, 500).toLowerCase();
  const keywordInFirstPara = firstPara.includes(keyword);
  checks.push({
    name: "Keyword distribution",
    maxPoints: 5,
    earnedPoints: densityOk && keywordInFirstPara ? 5 : densityOk || keywordInFirstPara ? 3 : 1,
    criteria: `Density: ${density.toFixed(1)}% (target: 1-2%), in first paragraph: ${keywordInFirstPara ? "✓" : "✗"}`,
    issue: !densityOk ? `Keyword density ${density.toFixed(1)}% — target 1-2%` : undefined,
  });

  // Heading hierarchy (3 pts)
  const hasH1 = /<h1[^>]*>/i.test(content.articleHtml);
  const h1Count = (content.articleHtml.match(/<h1[^>]*>/gi) || []).length;
  const hasSkippedLevels = /<h1[^>]*>[\s\S]*?<h3[^>]*>/i.test(content.articleHtml) && !/<h2[^>]*>/i.test(content.articleHtml);
  checks.push({
    name: "Heading hierarchy",
    maxPoints: 3,
    earnedPoints: hasH1 && h1Count === 1 && !hasSkippedLevels ? 3 : hasH1 ? 1 : 0,
    criteria: `H1 count: ${h1Count} (should be 1), skipped levels: ${hasSkippedLevels ? "Yes" : "No"}`,
    issue: h1Count !== 1 || hasSkippedLevels ? "Fix heading hierarchy (exactly 1 H1, no skipped levels)" : undefined,
  });

  // No keyword stuffing (4 pts)
  const h2sWithKeyword = h2s.filter((h) => h.toLowerCase().includes(keyword));
  const stuffed = h2sWithKeyword.length > MAX_H2_KEYWORD_REPEATS;
  checks.push({
    name: "No keyword stuffing",
    maxPoints: 4,
    earnedPoints: stuffed ? 0 : 4,
    criteria: `Main keyword in ${h2sWithKeyword.length} H2s (max: ${MAX_H2_KEYWORD_REPEATS})`,
    issue: stuffed ? `Keyword appears in ${h2sWithKeyword.length} H2 headings — maximum ${MAX_H2_KEYWORD_REPEATS} allowed. Rephrase with synonyms.` : undefined,
    fixSuggestion: stuffed ? "Vary H2 headings using synonyms and related terms." : undefined,
  });

  // Internal/external links (3 pts)
  // Count absolute https links — split into "internal" (links to user's own domain) vs "external" (other domains).
  // Since we don't know the user's domain here, we count all absolute https links as external,
  // and only count links that match a known blog pattern (sourcerecipes.info, etc.) as internal.
  const allAbsoluteLinks = content.articleHtml.match(/href="https?:\/\/[^"]+"/gi) || [];
  // Internal = links to common food blog patterns the user's WP site would serve
  const internalLinks = allAbsoluteLinks.filter(l => /sourcerecipes\.info|localhost/i.test(l)).length;
  const externalLinks = allAbsoluteLinks.length - internalLinks;
  checks.push({
    name: "Internal/external links",
    maxPoints: 3,
    earnedPoints: internalLinks >= 2 && externalLinks >= 1 ? 3 : (internalLinks > 0 || externalLinks > 0) ? 2 : 0,
    criteria: `Internal: ${internalLinks} (need 2+), External: ${externalLinks} (need 1+)`,
    issue: internalLinks < 2 || externalLinks < 1 ? "Add more internal link suggestions and at least 1 external authority link" : undefined,
  });

  // Rank Math score estimate (3 pts)
  const otherChecksPassed = checks.filter((c) => c.earnedPoints === c.maxPoints).length;
  checks.push({
    name: "Rank Math score estimate",
    maxPoints: 3,
    earnedPoints: otherChecksPassed >= 5 ? 3 : otherChecksPassed >= 3 ? 2 : 0,
    criteria: `Projected Rank Math 80+ based on ${otherChecksPassed}/6 checks passing`,
  });

  const totalEarned = checks.reduce((sum, c) => sum + c.earnedPoints, 0);
  return { name: "SEO", maxPoints: 25, earnedPoints: totalEarned, checks };
}

// ─── Category 3: E-E-A-T Signals (15 Points) ───

function scoreEEAT(content: GeneratedContent): QualityCategory {
  const checks: QualityCheck[] = [];
  const text = stripHtml(content.articleHtml);

  // Experience signals (5 pts)
  const experiencePatterns = [
    /\bi (tried|made|cooked|baked|tested|discovered|found)\b/i,
    /\bmy (family|kids|husband|wife|partner|mom|dad|grandmother)\b/i,
    /\bfirst time\b/i,
    /\bi learned\b/i,
    /\bmy kitchen\b/i,
    /\bthe trick i use\b/i,
    /\bafter testing\b/i,
  ];
  const experienceCount = experiencePatterns.filter((p) => p.test(text)).length;
  checks.push({
    name: "Experience signals",
    maxPoints: 5,
    earnedPoints: experienceCount >= 2 ? 5 : experienceCount === 1 ? 3 : 0,
    criteria: `At least 2 first-person cooking experiences (found ${experienceCount})`,
    issue: experienceCount < 2 ? "Add more personal cooking experiences, recipe testing mentions" : undefined,
  });

  // Expertise indicators (4 pts)
  const expertisePatterns = [
    /\d+°[FC]/i,
    /\d+\s*minutes/i,
    /\d+\s*(cups?|tablespoons?|teaspoons?|oz|ounces?|grams?|pounds?)/i,
    /internal temperature/i,
  ];
  const expertiseCount = expertisePatterns.filter((p) => p.test(text)).length;
  checks.push({
    name: "Expertise indicators",
    maxPoints: 4,
    earnedPoints: expertiseCount >= 3 ? 4 : expertiseCount >= 2 ? 3 : expertiseCount >= 1 ? 1 : 0,
    criteria: `Specific temperatures, times, techniques, nutritional knowledge (found ${expertiseCount})`,
    issue: expertiseCount < 2 ? "Include more specific temperatures, times, and measurements" : undefined,
  });

  // Author presence (3 pts)
  checks.push({
    name: "Author presence",
    maxPoints: 3,
    earnedPoints: 2, // We suggest real author setup but can't fully verify
    criteria: "Content suggests real author setup (verify in WordPress)",
  });

  // Source citations (3 pts)
  const hasCitation = /USDA|harvard|mayo clinic|CDC|NIH|dietaryguidelines|nutritionsource/i.test(text);
  checks.push({
    name: "Source citations",
    maxPoints: 3,
    earnedPoints: hasCitation ? 3 : 0,
    criteria: `At least 1 authoritative source cited: ${hasCitation ? "✓" : "✗"}`,
    issue: !hasCitation ? "Add at least 1 authoritative nutrition/food safety source citation" : undefined,
  });

  const totalEarned = checks.reduce((sum, c) => sum + c.earnedPoints, 0);
  return { name: "E-E-A-T Signals", maxPoints: 15, earnedPoints: totalEarned, checks };
}

// ─── Category 4: Pinterest Readiness (20 Points) ───

function scorePinterest(
  pinterest: PinterestCopyResult | null
): QualityCategory {
  const checks: QualityCheck[] = [];

  if (!pinterest) {
    return {
      name: "Pinterest Readiness",
      maxPoints: 20,
      earnedPoints: 0,
      checks: [{
        name: "Pinterest copy",
        maxPoints: 20,
        earnedPoints: 0,
        criteria: "No Pinterest copy generated",
        issue: "Generate Pinterest copy to earn points in this category",
      }],
    };
  }

  // Pin title quality (5 pts)
  const validTitles = pinterest.pinTitles.filter(
    (t: { charCount: number }) => t.charCount <= PIN_TITLE_MAX_CHARS
  );
  checks.push({
    name: "Pin title quality",
    maxPoints: 5,
    earnedPoints: validTitles.length === pinterest.pinTitles.length ? 5 : validTitles.length > 0 ? 3 : 0,
    criteria: `All variants under 100 chars: ${validTitles.length}/${pinterest.pinTitles.length}`,
    issue: validTitles.length < pinterest.pinTitles.length ? `${pinterest.pinTitles.length - validTitles.length} titles exceed 100 characters` : undefined,
  });

  // Pin description quality (5 pts)
  const validDescs = pinterest.pinDescriptions.filter(
    (d: { charCount: number }) => d.charCount >= PIN_DESC_MIN_CHARS && d.charCount <= PIN_DESC_MAX_CHARS
  );
  checks.push({
    name: "Pin description quality",
    maxPoints: 5,
    earnedPoints: validDescs.length === pinterest.pinDescriptions.length ? 5 : validDescs.length > 0 ? 3 : 0,
    criteria: `All variants 100-500 chars: ${validDescs.length}/${pinterest.pinDescriptions.length}`,
  });

  // TOBI text suggestions (3 pts)
  const validTobi = pinterest.tobiOverlays.filter((t) => t.wordCount <= TOBI_MAX_WORDS);
  checks.push({
    name: "TOBI text suggestions",
    maxPoints: 3,
    earnedPoints: validTobi.length >= 5 ? 3 : validTobi.length >= 3 ? 2 : 0,
    criteria: `All under ${TOBI_MAX_WORDS} words: ${validTobi.length}/${pinterest.tobiOverlays.length}`,
  });

  // Board suggestions (2 pts)
  checks.push({
    name: "Board suggestions",
    maxPoints: 2,
    earnedPoints: pinterest.boardSuggestions.length >= 3 ? 2 : pinterest.boardSuggestions.length > 0 ? 1 : 0,
    criteria: `${pinterest.boardSuggestions.length} board suggestions (need 3)`,
  });

  // Image dimensions note (2 pts) — Correction 1: reduced from 3
  checks.push({
    name: "Image dimensions note",
    maxPoints: 2,
    earnedPoints: 2, // Always included as recommendation
    criteria: "Recommends 1000×1500px (2:3 ratio) for pin images ✓",
  });

  // data-pin-description (2 pts)
  checks.push({
    name: "data-pin-description",
    maxPoints: 2,
    earnedPoints: pinterest.dataPinDescriptions.length > 0 ? 2 : 0,
    criteria: `Generated for ${pinterest.dataPinDescriptions.length} images in the post`,
  });

  const totalEarned = checks.reduce((sum, c) => sum + c.earnedPoints, 0);
  return { name: "Pinterest Readiness", maxPoints: 19, earnedPoints: totalEarned, checks };
}

// ─── Category 5: AI Search & Citation Readiness (15 Points) ───

function scoreAiSearch(
  content: GeneratedContent,
  schemas: SchemaResult | null
): QualityCategory {
  const checks: QualityCheck[] = [];
  const html = content.articleHtml;

  // Answer-first formatting (4 pts)
  const h2Sections = html.split(/<h2[^>]*>/i).slice(1);
  let answerFirstCount = 0;
  for (const section of h2Sections) {
    // Check if section starts with a short direct sentence after the heading
    const afterHeading = section.replace(/.*?<\/h2>/i, "").trim();
    const firstParagraph = afterHeading.match(/<p>(.*?)<\/p>/i);
    if (firstParagraph) {
      const firstSentence = firstParagraph[1].split(/[.!?]/)[0];
      const wordCount = firstSentence.split(/\s+/).filter(Boolean).length;
      if (wordCount <= 30) answerFirstCount++;
    }
  }
  const answerFirstRatio = h2Sections.length > 0 ? answerFirstCount / h2Sections.length : 0;
  checks.push({
    name: "Answer-first formatting",
    maxPoints: 4,
    earnedPoints: answerFirstRatio >= 0.7 ? 4 : answerFirstRatio >= 0.5 ? 2 : 0,
    criteria: `Each H2 starts with direct answer: ${answerFirstCount}/${h2Sections.length} sections`,
    issue: answerFirstRatio < 0.7 ? "More H2 sections need to start with a direct answer before elaboration" : undefined,
  });

  // Passage length optimization (3 pts)
  let optimalPassages = 0;
  for (const section of h2Sections) {
    const sectionText = section.replace(/<[^>]*>/g, " ").trim();
    const wordCount = sectionText.split(/\s+/).filter(Boolean).length;
    if (wordCount >= OPTIMAL_PASSAGE_MIN_WORDS && wordCount <= OPTIMAL_PASSAGE_MAX_WORDS) {
      optimalPassages++;
    }
  }
  const passageRatio = h2Sections.length > 0 ? optimalPassages / h2Sections.length : 0;
  checks.push({
    name: "Passage length optimization",
    maxPoints: 3,
    earnedPoints: passageRatio >= 0.5 ? 3 : passageRatio >= 0.3 ? 2 : 0,
    criteria: `H2 sections averaging 134-167 words: ${optimalPassages}/${h2Sections.length}`,
  });

  // FAQ section present (3 pts)
  const faqPresent = content.faqItems.length >= FAQ_MIN_COUNT;
  checks.push({
    name: "FAQ section present",
    maxPoints: 3,
    earnedPoints: faqPresent ? 3 : content.faqItems.length > 0 ? 1 : 0,
    criteria: `${content.faqItems.length} Q&A pairs (need ${FAQ_MIN_COUNT}-7)`,
    issue: !faqPresent ? `Need at least ${FAQ_MIN_COUNT} FAQ questions` : undefined,
  });

  // Schema markup generated (3 pts)
  const hasRecipeSchema = schemas?.recipeSchema !== undefined;
  const hasFaqSchema = schemas?.faqSchema !== undefined;
  const hasArticleSchema = schemas?.articleSchema !== undefined;
  const schemaCount = [hasRecipeSchema, hasFaqSchema, hasArticleSchema].filter(Boolean).length;
  checks.push({
    name: "Schema markup generated",
    maxPoints: 3,
    earnedPoints: schemaCount >= 3 ? 3 : schemaCount >= 2 ? 2 : schemaCount >= 1 ? 1 : 0,
    criteria: `Recipe: ${hasRecipeSchema ? "✓" : "✗"}, FAQ: ${hasFaqSchema ? "✓" : "✗"}, Article: ${hasArticleSchema ? "✓" : "✗"}`,
  });

  // AI phrase avoidance (2 pts)
  const flagged = scanBlacklistedPhrases(content.articleHtml);
  const foundCount = flagged.filter((f) => f.found).length;
  checks.push({
    name: "AI phrase avoidance",
    maxPoints: 2,
    earnedPoints: foundCount === 0 ? 2 : 0,
    criteria: `${foundCount} blacklisted AI phrases found (must be 0)`,
    issue: foundCount > 0 ? `Found ${foundCount} blacklisted AI phrases: ${flagged.filter(f => f.found).map(f => `"${f.phrase}"`).join(", ")}` : undefined,
    fixSuggestion: foundCount > 0 ? "Remove all blacklisted AI phrases and replace with natural language." : undefined,
  });

  // Bug Fix 6: TTR (Vocabulary Diversity) check (2 pts)
  const { ttr } = calculateTTR(content.articleHtml);
  let ttrPoints = 0;
  let ttrIssue: string | undefined;
  if (ttr >= 0.55) {
    ttrPoints = 2;
  } else if (ttr >= 0.50) {
    ttrPoints = 1;
    ttrIssue = "Vocabulary diversity is slightly low";
  } else {
    ttrPoints = 0;
    ttrIssue = `Vocabulary diversity is low (TTR: ${ttr}). The content uses repetitive word choices typical of AI-generated text. Vary your vocabulary more.`;
  }
  checks.push({
    name: "Vocabulary diversity (TTR)",
    maxPoints: 2,
    earnedPoints: ttrPoints,
    criteria: `TTR: ${ttr} (target: 0.55-0.75)`,
    issue: ttrIssue,
    fixSuggestion: ttrIssue ? "Use more varied vocabulary — avoid repeating the same adjectives, verbs, and phrases." : undefined,
  });

  const totalEarned = checks.reduce((sum, c) => sum + c.earnedPoints, 0);
  return { name: "AI Search & Citation Readiness", maxPoints: 17, earnedPoints: totalEarned, checks };
}

// ─── Main Scoring Function ───

export function calculateQualityScore(
  content: GeneratedContent,
  inputs: FormInputs,
  pinterest: PinterestCopyResult | null,
  schemas: SchemaResult | null
): QualityScoreResult {
  const categories: QualityCategory[] = [
    scoreContentQuality(content, inputs),
    scoreSEO(content, inputs),
    scoreEEAT(content),
    scorePinterest(pinterest),
    scoreAiSearch(content, schemas),
  ];

  const totalScore = categories.reduce((sum, c) => sum + c.earnedPoints, 0);
  const maxScore = categories.reduce((sum, c) => sum + c.maxPoints, 0);
  const band = getScoreBand(totalScore);

  // Collect blocked issues (items that prevent publishing)
  const blockedIssues: string[] = [];
  if (totalScore < QUALITY_BLOCK_THRESHOLD) {
    blockedIssues.push(`Quality score ${totalScore}/100 is below the minimum threshold of ${QUALITY_BLOCK_THRESHOLD}. Content should not be published without fixes.`);
  }

  for (const cat of categories) {
    for (const check of cat.checks) {
      if (check.earnedPoints === 0 && check.maxPoints >= 4 && check.issue) {
        blockedIssues.push(check.issue);
      }
    }
  }

  return {
    totalScore,
    maxScore,
    band,
    categories,
    blockedIssues,
  };
}
