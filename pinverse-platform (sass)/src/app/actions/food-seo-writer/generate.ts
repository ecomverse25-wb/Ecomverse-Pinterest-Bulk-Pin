"use server";

import { GoogleGenAI } from "@google/genai";
import { headers } from "next/headers";

const rateLimits = new Map<string, { count: number; resetTime: number }>();
export async function checkRateLimit() {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const limit = rateLimits.get(ip);
    if (!limit || now > limit.resetTime) {
        rateLimits.set(ip, { count: 1, resetTime: now + 60000 });
        return true;
    }
    if (limit.count >= 10) return false;
    limit.count++;
    return true;
}
import type { WritingProvider } from "@/components/blog-monetizer/BlogMonetizer.types";
import type {
    FoodTone, FoodH2Count, TitleFormula, SchemaType, AuthoritySource, FaqCount,
    KeywordAnalysis, SearchIntent, FoodArticle
} from "@/components/food-seo-writer/types";
import { generateWithClaude } from "@/app/actions/blog-monetizer/generate-claude";
import { generateWithOpenAI } from "@/app/actions/blog-monetizer/generate-openai";
import {
    TITLE_FORMULA_DESCRIPTIONS, AUTHORITY_SOURCE_URLS, STRATEGY_DEFAULTS,
    INTENT_SIGNALS, AUTHORITY_KEYWORD_MAP,
} from "@/components/food-seo-writer/constants";

// (Re-exports removed: Turbopack blocks re-exporting non-async items from a 'use server' file)

// ─── Fallback Keyword Analysis (runs if AI call fails) ───

function fallbackAnalyzeKeyword(keyword: string): KeywordAnalysis {
    const kw = keyword.toLowerCase();
    const wordCount = kw.split(/\s+/).length;

    // Detect intent from keyword signals
    let intent: SearchIntent = 'listicle'; // default
    for (const [intentKey, signals] of Object.entries(INTENT_SIGNALS)) {
        if (signals.some(s => kw.includes(s))) {
            intent = intentKey as SearchIntent;
            break;
        }
    }

    // Detect authority source from topic
    let authoritySource: AuthoritySource = 'usda';
    let authorityUrl = AUTHORITY_SOURCE_URLS['usda'];
    for (const [signal, source] of Object.entries(AUTHORITY_KEYWORD_MAP)) {
        if (kw.includes(signal)) {
            authoritySource = source;
            authorityUrl = AUTHORITY_SOURCE_URLS[source];
            break;
        }
    }

    // Determine strategy
    const contentStrategy = wordCount < 3 ? 'pillar' as const : 'cluster' as const;

    // Map intent to settings
    const intentMappings: Record<SearchIntent, {
        schemaType: SchemaType; titleFormula: TitleFormula; tone: FoodTone;
        h2Count: FoodH2Count; wordTarget: number;
    }> = {
        listicle: { schemaType: 'ItemList', titleFormula: 'number-adjective-keyword-benefit', tone: 'listicle', h2Count: 10, wordTarget: 1500 },
        howto: { schemaType: 'HowTo', titleFormula: 'how-to-keyword-outcome', tone: 'how-to', h2Count: 8, wordTarget: 1500 },
        recipe: { schemaType: 'Recipe', titleFormula: 'best-number-keyword-audience', tone: 'how-to', h2Count: 6, wordTarget: 1200 },
        informational: { schemaType: 'Article', titleFormula: 'ultimate-guide-keyword', tone: 'personal-story', h2Count: 10, wordTarget: 1500 },
        roundup: { schemaType: 'ItemList', titleFormula: 'number-adjective-keyword-benefit', tone: 'listicle', h2Count: 10, wordTarget: 1500 },
        comparison: { schemaType: 'Article', titleFormula: 'best-number-keyword-audience', tone: 'listicle', h2Count: 8, wordTarget: 1500 },
    };

    const mapping = intentMappings[intent];
    const h2Count = contentStrategy === 'pillar' ? 15 : mapping.h2Count;
    const wordTarget = contentStrategy === 'pillar' ? 2000 : mapping.wordTarget;

    return {
        keyword,
        intent,
        searchIntentReason: `Fallback detection: keyword contains signals for ${intent} intent`,
        schemaType: mapping.schemaType,
        contentStrategy,
        titleFormula: mapping.titleFormula,
        tone: mapping.tone,
        h2Count: h2Count as FoodH2Count,
        authoritySource,
        authorityUrl,
        suggestedTitle: keyword,
        estimatedWordCount: wordTarget,
        pinterestBoardSuggestion: keyword.split(' ').slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        isFallback: true,
    };
}

// ─── AI Keyword Analysis (Stage 1) ───

export async function analyzeKeywordAction(
    keyword: string,
    geminiKey?: string,
    writingProvider: WritingProvider = 'google',
    writingModel: string = 'gemini-2.5-flash',
    anthropicKey?: string,
    openaiKey?: string,
    replicateKey?: string
): Promise<KeywordAnalysis> {
    const trimmedKeyword = keyword.substring(0, 200).trim();
    if (!trimmedKeyword) return fallbackAnalyzeKeyword(keyword);

    const analysisPrompt = `Analyze this food blog keyword and return a JSON object. Return ONLY valid JSON, nothing else.

Keyword: "${trimmedKeyword}"

Return this exact JSON structure:
{
  "intent": "listicle" | "howto" | "recipe" | "informational" | "roundup" | "comparison",
  "searchIntentReason": "one sentence explanation of why this intent was chosen",
  "schemaType": "ItemList" | "HowTo" | "Recipe" | "Article",
  "contentStrategy": "pillar" | "cluster",
  "titleFormula": "number-adjective-keyword-benefit" | "how-to-keyword-outcome" | "best-number-keyword-audience" | "ultimate-guide-keyword",
  "tone": "how-to" | "listicle" | "comparison" | "personal-story",
  "h2Count": 6 | 8 | 10 | 12 | 15,
  "authoritySource": "usda" | "harvard" | "mayo-clinic" | "cdc" | "nih" | "aha",
  "authorityUrl": "https://...",
  "suggestedTitle": "AI-generated SEO title for this keyword, max 60 chars",
  "estimatedWordCount": 1200 | 1500 | 2000 | 2500,
  "pinterestBoardSuggestion": "suggested Pinterest board name"
}

Rules for analysis:
- Listicle: plural keywords like "recipes", "ideas", "meals", "tips"
- HowTo: keywords starting with "how to", "make", "cook", "prepare"
- Recipe: singular recipe keywords like "lemon chicken recipe"
- Informational: "what is", "benefits of", "why"
- Roundup: "best", "top", "favorite"
- Comparison: "vs", "versus", "compared"
- Use "pillar" for broad 1-2 word keywords, "cluster" for 3+ word long-tail
- Pick authority source based on health topic relevance
- Title must include the focus keyword in first 60 chars`;

    try {
        const config: ProviderConfig = {
            writingProvider, writingModel,
            geminiKey, anthropicKey, openaiKey, replicateKey,
        };
        const text = await generateTextWithProvider(analysisPrompt, config);
        const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        // Validate and coerce fields
        const validIntents: SearchIntent[] = ['listicle', 'howto', 'recipe', 'informational', 'roundup', 'comparison'];
        const validSchemas: SchemaType[] = ['ItemList', 'HowTo', 'Recipe', 'Article'];
        const validStrategies = ['pillar', 'cluster'] as const;
        const validTones: FoodTone[] = ['how-to', 'listicle', 'comparison', 'personal-story'];
        const validH2Counts: FoodH2Count[] = [6, 8, 10, 12, 15];
        const validAuthorities: AuthoritySource[] = ['usda', 'harvard', 'mayo-clinic', 'cdc', 'nih', 'aha'];

        return {
            keyword: trimmedKeyword,
            intent: validIntents.includes(parsed.intent) ? parsed.intent : 'listicle',
            searchIntentReason: String(parsed.searchIntentReason || '').substring(0, 200),
            schemaType: validSchemas.includes(parsed.schemaType) ? parsed.schemaType : 'auto-detect',
            contentStrategy: validStrategies.includes(parsed.contentStrategy) ? parsed.contentStrategy : 'cluster',
            titleFormula: parsed.titleFormula || 'number-adjective-keyword-benefit',
            tone: validTones.includes(parsed.tone) ? parsed.tone : 'listicle',
            h2Count: validH2Counts.includes(parsed.h2Count) ? parsed.h2Count : 10,
            authoritySource: validAuthorities.includes(parsed.authoritySource) ? parsed.authoritySource : 'usda',
            authorityUrl: String(parsed.authorityUrl || AUTHORITY_SOURCE_URLS['usda']),
            suggestedTitle: String(parsed.suggestedTitle || trimmedKeyword).substring(0, 100),
            estimatedWordCount: [1200, 1500, 2000, 2500].includes(parsed.estimatedWordCount) ? parsed.estimatedWordCount : 1500,
            pinterestBoardSuggestion: String(parsed.pinterestBoardSuggestion || '').substring(0, 100),
            isFallback: false,
        };
    } catch {
        // AI analysis failed — use fallback rules
        return fallbackAnalyzeKeyword(trimmedKeyword);
    }
}

// ─── Replicate Text Generation ───

async function generateWithReplicate(prompt: string, replicateApiKey: string, model: string): Promise<string> {
    const response = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${replicateApiKey}`,
            "Content-Type": "application/json",
            "Prefer": "wait",
        },
        body: JSON.stringify({ input: { prompt } }),
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Replicate API error ${response.status}: ${errText}`);
    }

    const prediction = await response.json();

    if (prediction.status === "succeeded" && prediction.output) {
        return Array.isArray(prediction.output) ? prediction.output.join("") : prediction.output;
    }

    const predictionId = prediction.id;
    let attempts = 0;
    const maxAttempts = 90;
    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusResponse = await fetch(
            `https://api.replicate.com/v1/predictions/${predictionId}`,
            { headers: { "Authorization": `Bearer ${replicateApiKey}` } }
        );
        const statusData = await statusResponse.json();

        if (statusData.status === "succeeded") {
            return Array.isArray(statusData.output) ? statusData.output.join("") : statusData.output;
        }
        if (statusData.status === "failed" || statusData.status === "canceled") {
            throw new Error(`Replicate prediction ${statusData.status}: ${statusData.error || "Unknown error"}`);
        }
        attempts++;
    }
    throw new Error("Replicate prediction timed out");
}

// ─── Provider Router ───

interface ProviderConfig {
    writingProvider: WritingProvider;
    writingModel: string;
    geminiKey?: string;
    anthropicKey?: string;
    openaiKey?: string;
    replicateKey?: string;
}

async function generateTextWithProvider(prompt: string, config: ProviderConfig): Promise<string> {
    switch (config.writingProvider) {
        case "google": {
            const apiKey = config.geminiKey || process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error("Gemini API key is missing. Please enter your key in the Setup tab.");
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: config.writingModel,
                contents: { parts: [{ text: prompt }] },
            });
            const text = response.text?.trim();
            if (!text) throw new Error("No output generated.");
            return text;
        }
        case "claude": {
            const anthropicApiKey = config.anthropicKey || process.env.ANTHROPIC_API_KEY;
            if (!anthropicApiKey) throw new Error("Anthropic API key is missing. Please enter your key in the Setup tab.");
            return generateWithClaude({ prompt, anthropicApiKey, model: config.writingModel });
        }
        case "openai": {
            const openaiApiKey = config.openaiKey || process.env.OPENAI_API_KEY;
            if (!openaiApiKey) throw new Error("OpenAI API key is missing. Please enter your key in the Setup tab.");
            return generateWithOpenAI({ prompt, openaiApiKey, model: config.writingModel });
        }
        case "replicate": {
            const replicateApiKey = config.replicateKey || process.env.REPLICATE_API_KEY;
            if (!replicateApiKey) throw new Error("Replicate API key is missing. Please enter your key in the Setup tab.");
            return generateWithReplicate(prompt, replicateApiKey, config.writingModel);
        }
        default:
            throw new Error(`Unknown writing provider: ${config.writingProvider}`);
    }
}

// ─── Generate Bulk Titles ───

function sanitizeArticleTitle(title: string): string {
    return title.replace(/\b(202[0-9]|203[0-5])\b/g, "").trim()
        .replace(/\s+/g, " ")
        .replace(/[,\s]+$/, "")
        .trim();
}

export async function generateFoodBulkTitlesAction(
    keywords: string[],
    tone: FoodTone,
    niche: string,
    titleFormula: TitleFormula,
    h2Count: FoodH2Count,
    model: string = "gemini-2.5-flash",
    writingProvider: WritingProvider = "google",
    geminiKey?: string,
    anthropicKey?: string,
    openaiKey?: string,
    replicateKey?: string
): Promise<{ success?: boolean; titles?: { keyword: string; title: string }[]; error?: string }> {
    if (!(await checkRateLimit())) return { error: "Rate limit exceeded. Please try again later." };
    if (keywords.length === 0) return { error: "No keywords provided." };
    niche = niche.substring(0, 100).trim();

    const keywordsList = keywords.map((k, i) => `${i + 1}. ${k.substring(0, 200).trim()}`).join("\n");
    const formulaDesc = TITLE_FORMULA_DESCRIPTIONS[titleFormula];

    const prompt = `For each keyword below, generate one compelling food blog article title.

Title Formula to use: ${formulaDesc}

Rules:
- Title must include or strongly relate to the keyword
- Use the exact title formula pattern specified above
- Title must be click-worthy for Pinterest and Google
- Max 60 characters per title
- Match tone: ${tone}
- Match niche: ${niche}
- If the formula includes a number, use ${h2Count} as the number

STRICT TITLE RULES:
✅ DO: Follow the title formula pattern exactly
✅ DO: Include sensory or emotional food words: Easy, Delicious, Quick, Healthy, Amazing
✅ DO: Include a benefit or promise in the title
✅ DO: Keep it under 60 characters for Google title tag

❌ DO NOT: Include any year numbers (2024, 2025, 2026, etc.)
❌ DO NOT: Use the keyword alone as the full title
❌ DO NOT: Use clickbait or exaggerated claims
❌ DO NOT: Start with "The" every time — vary the structure

Keywords:
${keywordsList}

Return JSON array only, no markdown, no code fences:
[
  { "keyword": "example keyword", "title": "Generated Title Here" }
]`;

    try {
        const config: ProviderConfig = {
            writingProvider, writingModel: model,
            geminiKey, anthropicKey, openaiKey, replicateKey,
        };
        const text = await generateTextWithProvider(prompt, config);
        const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        const sanitizedTitles = parsed.map((item: { keyword: string; title: string }) => ({
            ...item,
            title: sanitizeArticleTitle(item.title),
        }));
        return { success: true, titles: sanitizedTitles };
    } catch (error: unknown) {
        console.error("Food bulk title generation error:", error);
        return { error: "Failed to generate titles. Please try again or check AI status." };
    }
}

// ─── Generate Single Title ───

export async function generateFoodSingleTitleAction(
    keyword: string,
    tone: FoodTone,
    niche: string,
    titleFormula: TitleFormula,
    h2Count: FoodH2Count,
    model?: string,
    writingProvider?: WritingProvider,
    geminiKey?: string,
    anthropicKey?: string,
    openaiKey?: string,
    replicateKey?: string
): Promise<{ success?: boolean; title?: string; error?: string }> {
    const result = await generateFoodBulkTitlesAction(
        [keyword], tone, niche, titleFormula, h2Count,
        model, writingProvider,
        geminiKey, anthropicKey, openaiKey, replicateKey
    );
    if (result.success && result.titles && result.titles.length > 0) {
        return { success: true, title: result.titles[0].title };
    }
    return { error: result.error || "Failed to generate title." };
}

// ─── Generate Full Food SEO Article ───

export async function generateFoodArticleAction(
    title: string,
    keyword: string,
    niche: string,
    tone: FoodTone,
    contentStrategy: 'pillar' | 'cluster',
    h2Count: FoodH2Count,
    titleFormula: TitleFormula,
    schemaType: SchemaType,
    authoritySource: AuthoritySource,
    faqCount: FaqCount,
    internalLinkTopics: string,
    affiliateLinksText: string,
    amazonAffiliateTag?: string,
    model: string = "gemini-2.5-flash",
    writingProvider: WritingProvider = "google",
    geminiKey?: string,
    anthropicKey?: string,
    openaiKey?: string,
    replicateKey?: string
): Promise<{

    success?: boolean;
    content?: string;
    title?: string;
    metaDescription?: string;
    pinTitle?: string;
    pinDescription?: string;
    schemaMarkup?: string;
    wordCount?: number;
    tags?: string[];
    error?: string;

}> {
    if (!(await checkRateLimit())) return { error: "Rate limit exceeded. Please try again later." };
    title = title.substring(0, 200).trim();
    keyword = keyword.substring(0, 200).trim();
    niche = niche.substring(0, 100).trim();
    internalLinkTopics = (internalLinkTopics || "").trim();
    affiliateLinksText = (affiliateLinksText || "").trim();

    const wordTarget = STRATEGY_DEFAULTS[contentStrategy].wordTarget;
    const formulaDesc = TITLE_FORMULA_DESCRIPTIONS[titleFormula];
    const authorityUrl = AUTHORITY_SOURCE_URLS[authoritySource];
    const authorityLabel = authoritySource === 'auto-select' ? 'a reputable nutrition authority (USDA, Harvard Health, Mayo Clinic, etc.)' : authoritySource;

    const schemaInstructions = schemaType === 'auto-detect'
        ? 'Auto-detect the best schema type based on the content (ItemList for listicles, HowTo for step-by-step guides, Recipe for single recipe posts, Article for general food content)'
        : `Use ${schemaType} schema type`;

    const prompt = `You are an expert food blog SEO writer who creates content that ranks on Google AND gets saved on Pinterest simultaneously.

INPUTS:
- Blog Niche: ${niche}
- Focus Keyword: ${keyword}
- Content Strategy: ${contentStrategy} (${contentStrategy === 'pillar' ? 'Broad keyword, 2000+ words, targets category-level traffic' : 'Long-tail keyword, 1200-1500 words, targets specific searches'})
- Title Formula: ${formulaDesc}
- Article Tone: ${tone}
- H2 Sections: ${h2Count}
- Schema Type: ${schemaInstructions}
- Authority Source: ${authorityLabel}${authorityUrl ? ` (${authorityUrl})` : ''}
- FAQ Count: ${faqCount}
- Internal Link Topics: ${internalLinkTopics || 'None provided'}
- Affiliate Products: ${affiliateLinksText || 'None provided'}
- Word Count Target: ~${wordTarget} words

STRICT OUTPUT STRUCTURE — follow this EXACTLY:

First, output these labeled fields at the TOP, each on its own line:
[PIN_TITLE]: Generate a Pinterest pin title. Max 100 characters. Keyword-first: "${keyword}: [Emotional Hook]"
[PIN_DESCRIPTION]: 400-500 characters. Include focus keyword "${keyword}" 2-3 times naturally. End with: "Save this for later! #${keyword.replace(/\s+/g, '')} #${niche.replace(/\s+/g, '')} #food"
[META_DESCRIPTION]: Exactly 150-155 characters. Must contain exact focus keyword "${keyword}". Format: [Hook with keyword] + [What reader gets] + [CTA]
[TAGS]: Generate 5-7 comma-separated relevant tags (e.g. healthy recipes, quick dinners, low carb)

Then output ##TITLE## marker:
##TITLE##Your SEO Title Here##TITLE##

Rules for SEO title:
- Generate using the title formula: ${formulaDesc}
- Focus keyword "${keyword}" must appear within first 60 chars
- Max 60 characters for Google title tag
- Emotionally compelling, listicle-forward for food content
- No clickbait, must deliver on the promise
- If formula includes a number, use ${h2Count}

Then write the full article as HTML:

Start with <h1>Your SEO Title Here</h1> (same title from above)

INTRODUCTION (150-200 words):
- First sentence MUST contain exact keyword "${keyword}"
- Use Problem → Agitate → Solve structure
- NO filler openers like "Are you looking for..." or "In this article we will..."
- Personal, relatable tone — write as a home cook, not a food scientist
- End intro with a preview of what reader will find

H2 SECTIONS (write exactly ${h2Count} sections):
- Each H2 must work as a standalone Pinterest pin title
- Format: "[Recipe/Item Name] — [Benefit or Time Hook]"
- Example: "Sheet Pan Lemon Herb Chicken — Ready in 25 Minutes"
- Include "${keyword}" or semantic variant in at least 3 of the H2 headings
- Each section: minimum 120 words
- Include sensory language (taste, smell, texture, color)
- Bold 1 key phrase per section using <strong> tags
- End each section with a practical tip or variation

IMAGE PLACEHOLDERS:
- After each H2, insert: <!-- IMAGE: [descriptive scene] - ${keyword} [context] -->
- Alt text must contain focus keyword or semantic variant

INTERNAL LINKS (insert 2-3 total):
- Place naturally within paragraph text
- Format: <!-- INTERNAL LINK: {related_topic} | anchor: [anchor text] -->
- Use topics from the internal link topics provided
- Anchor text must be descriptive (never "click here")

AFFILIATE LINKS:
- Insert after benefit statements, never before
- Max 1 per H2 section
- Format: <a href="https://www.amazon.com/s?k=PRODUCT_NAME_URL_ENCODED${amazonAffiliateTag ? `&tag=${amazonAffiliateTag}` : ''}">Product Name</a>
- Replace PRODUCT_NAME_URL_ENCODED with the URL-encoded product name you recommend.

EXTERNAL LINK (insert exactly 1):
- Place in the final third of the article
- Use ${authorityLabel}${authorityUrl ? ` (${authorityUrl})` : ''}
- Must be DoFollow (no rel="nofollow")
- Anchor text should name the source

FAQ SECTION (mandatory, ${faqCount} questions):
Title: <h2>Frequently Asked Questions About ${keyword}</h2>
- Each question must match Google "People Also Ask" format
- Questions must contain semantic variants of "${keyword}"
- Answer length: 40-60 words each
- Conversational, direct answers
- Use <h3> for each question, <p> for answer

CONCLUDING PARAGRAPH (100-150 words):
- Restate the focus keyword naturally
- Include a call-to-save for Pinterest: "Save this post for your next meal planning session!"
- Link back to one internal category page

KEYWORD DENSITY RULES:
- Target: 0.5%-1.5% (Rank Math optimal)
- No keyword stuffing, natural placement only

CONTENT QUALITY REQUIREMENTS:
- No passive voice in headings
- Flesch Reading Ease: 60-70 (conversational)
- Short paragraphs: 2-3 sentences maximum
- No filler phrases: "In conclusion", "As you can see", "It's worth noting", "Without further ado"
- E-E-A-T signal: include 1 personal experience statement
- Sensory language in every food description

After the article body, generate the schema markup:
[SCHEMA_START]
Generate appropriate JSON-LD based on schema type.
${schemaType === 'ItemList' || schemaType === 'auto-detect' ? `
If ItemList:
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "[SEO Title]",
  "description": "[Meta Description]",
  "numberOfItems": ${h2Count},
  "itemListElement": [array of ListItem objects with position, name, description]
}` : ''}
${schemaType === 'HowTo' || schemaType === 'auto-detect' ? `
If HowTo:
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "[SEO Title]",
  "description": "[Meta Description]",
  "step": [array of HowToStep objects]
}` : ''}
${schemaType === 'Recipe' || schemaType === 'auto-detect' ? `
If Recipe:
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "[SEO Title]",
  "description": "[Meta Description]"
}` : ''}
${schemaType === 'Article' || schemaType === 'auto-detect' ? `
If Article:
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[SEO Title]",
  "description": "[Meta Description]",
  "keywords": "[keyword], [semantic variants]"
}` : ''}
[SCHEMA_END]

OUTPUT FORMAT:
Return clean HTML with:
- <h1> for SEO title
- <h2> for main sections
- <h3> for FAQ questions and sub-sections
- <p> for paragraphs
- <strong> for key bolded phrases
- <!-- IMAGE: --> comments for image placeholders
- <!-- INTERNAL LINK: --> comments for internal links
- Schema JSON-LD between [SCHEMA_START] and [SCHEMA_END] markers

Do NOT wrap in code fences. Do NOT include <html>, <head>, or <body> tags.`;

    try {
        const config: ProviderConfig = {
            writingProvider, writingModel: model,
            geminiKey, anthropicKey, openaiKey, replicateKey,
        };
        let text = await generateTextWithProvider(prompt, config);

        // Strip code fences if present
        text = text.replace(/```html\s*/gi, "").replace(/```/g, "").trim();

        // Extract labeled fields from top
        let pinTitle = "";
        let pinDescription = "";
        let metaDescription = "";

        const pinTitleMatch = text.match(/\[PIN_TITLE\]:\s*(.+)/i);
        if (pinTitleMatch) {
            pinTitle = pinTitleMatch[1].trim();
        }

        // PIN_DESCRIPTION may be multi-line, so use lookahead for [META_DESCRIPTION]
        const pinDescMatch = text.match(/\[PIN_DESCRIPTION\]:\s*([\s\S]+?)(?=\[META_DESCRIPTION\])/i);
        if (pinDescMatch) {
            pinDescription = pinDescMatch[1].trim();
        } else {
            // Fallback: single-line match
            const pinDescSingle = text.match(/\[PIN_DESCRIPTION\]:\s*(.+)/i);
            if (pinDescSingle) {
                pinDescription = pinDescSingle[1].trim();
            }
        }

        const metaMatch = text.match(/\[META_DESCRIPTION\]:\s*(.+)/i);
        if (metaMatch) {
            metaDescription = metaMatch[1].trim();
        }

        // Fallback: try old META_DESCRIPTION format
        if (!metaDescription) {
            const metaMatch2 = text.match(/META_DESCRIPTION:\s*(.+)/i);
            if (metaMatch2) {
                metaDescription = metaMatch2[1].trim();
            }
        }

        let tags: string[] = [];
        const tagsMatch = text.match(/\[TAGS\]:\s*(.+)/i);
        if (tagsMatch) {
            tags = tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean);
        }

        // Strip the entire header fields block
        text = text
            .replace(/\[PIN_TITLE\]:[\s\S]*?\[TAGS\]:.+\n?/i, '')
            .replace(/\[PIN_TITLE\]:[\s\S]*?\[META_DESCRIPTION\]:.+\n?/i, '')
            .trim();

        // Extract schema markup
        let schemaMarkup = "";
        const schemaMatch = text.match(/\[SCHEMA_START\]([\s\S]*?)\[SCHEMA_END\]/i);
        if (schemaMatch) {
            schemaMarkup = schemaMatch[1].trim();
            // Try to extract just the JSON from the schema block
            const jsonMatch = schemaMarkup.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                schemaMarkup = jsonMatch[0].trim();
            }
            text = text.replace(/\[SCHEMA_START\][\s\S]*?\[SCHEMA_END\]/i, "").trim();
        }

        // Extract title
        let articleTitle = keyword;
        let articleContent = text;

        const titleMatch = text.match(/##TITLE##(.+?)##TITLE##/);
        if (titleMatch) {
            articleTitle = titleMatch[1]
                .trim()
                .replace(/\b(202[0-9]|203[0-5])\b/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            articleContent = text.replace(/##TITLE##.+?##TITLE##\n?/, '').trim();
        }

        // Fallback if title === keyword
        if (articleTitle.toLowerCase() === keyword.toLowerCase()) {
            const h1Match = articleContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
            if (h1Match) {
                articleTitle = h1Match[1].replace(/<[^>]*>/g, "").trim();
            }
            if (articleTitle.toLowerCase() === keyword.toLowerCase()) {
                articleTitle = `The Complete Guide to ${keyword}`;
            }
        }

        console.log(`[FOOD-SEO] Extracted title: "${articleTitle}" for keyword: "${keyword}"`);

        // Process Internal Links
        articleContent = processInternalLinks(articleContent);

        // Count words
        const wordCount = articleContent.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;

        return {
            success: true,
            content: articleContent,
            title: articleTitle,
            metaDescription,
            pinTitle,
            pinDescription,
            schemaMarkup,
            wordCount,
            tags,
        };
    } catch (error: unknown) {
        console.error("Food article generation error:", error);
        return { error: "Failed to generate article. Please try again or check AI provider availability." };
    }
}

// TEST: uncomment to verify API connection
// const testResult = await generateFoodArticleAction( ... );

// ─── Post-Processing & Publishing ───

function processInternalLinks(html: string): string {
    const paragraphs = html.split(/(<\/p>|<p[^>]*>)/i);
    let modifiedHtml = "";
    const placeholders: { topic: string; anchor: string }[] = [];

    // Extract all <!-- INTERNAL LINK: topic | anchor: text --> and remove them
    const linkRegex = /<!--\s*INTERNAL LINK:\s*([^|]+)\|\s*anchor:\s*([^>]+)-->/gi;
    let match;
    let tempHtml = html;
    while ((match = linkRegex.exec(tempHtml)) !== null) {
        placeholders.push({ topic: match[1].trim(), anchor: match[2].trim() });
    }
    tempHtml = tempHtml.replace(linkRegex, "");

    // Process paragraphs
    const pTokens = tempHtml.split(/(<p[^>]*>[\s\S]*?<\/p>)/gi);
    for (let i = 0; i < pTokens.length; i++) {
        let token = pTokens[i];
        if (token.toLowerCase().startsWith("<p")) {
            for (let j = 0; j < placeholders.length; j++) {
                const link = placeholders[j];
                const parts = link.anchor.toLowerCase().split(/\s+/);
                // Check if paragraph contains some words from anchor text
                if (parts.some(p => p.length > 3 && token.toLowerCase().includes(p))) {
                    const slug = link.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    token = token.replace(/<\/p>/i, ` For more ideas, explore our <a href="/${slug}/">${link.anchor}</a>.</p>`);
                    placeholders.splice(j, 1);
                    j--;
                    break; // Only one link per paragraph
                }
            }
        }
        modifiedHtml += token;
    }

    // Append remaining back before FAQ
    if (placeholders.length > 0) {
        let leftoverHtml = "";
        for (const link of placeholders) {
            const slug = link.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            leftoverHtml += `<p>For more ideas, explore our <a href="/${slug}/">${link.anchor}</a>.</p>\n`;
        }
        const faqRegex = /<h2[^>]*>.*frequently asked questions.*<\/h2>/i;
        if (faqRegex.test(modifiedHtml)) {
            modifiedHtml = modifiedHtml.replace(faqRegex, (m) => leftoverHtml + m);
        } else {
            modifiedHtml += leftoverHtml;
        }
    }

    return modifiedHtml;
}

function convertHtmlToGutenberg(html: string): string {
  // Step 1: Preserve HTML comments (IMAGE placeholders etc.) — wrap them
  // temporarily so they survive regex replacement
  const comments: string[] = [];
  let result = html.replace(/<!--[\s\S]*?-->/g, (match) => {
    // Only preserve non-wp-block comments as raw HTML blocks
    if (!match.startsWith('<!-- wp:') && !match.startsWith('<!-- /wp:')) {
      comments.push(match);
      return `%%COMMENT_${comments.length - 1}%%`;
    }
    return match;
  });

  // Step 2: Convert block-level elements (use [\s\S]*? for multiline)
  result = result
    .replace(/<h1([\s\S]*?)>([\s\S]*?)<\/h1>/gi,
      '<!-- wp:heading {"level":1} -->\n<h1$1>$2</h1>\n<!-- /wp:heading -->')
    .replace(/<h2([\s\S]*?)>([\s\S]*?)<\/h2>/gi,
      '<!-- wp:heading {"level":2} -->\n<h2$1>$2</h2>\n<!-- /wp:heading -->')
    .replace(/<h3([\s\S]*?)>([\s\S]*?)<\/h3>/gi,
      '<!-- wp:heading {"level":3} -->\n<h3$1>$2</h3>\n<!-- /wp:heading -->')
    .replace(/<ul([\s\S]*?)>([\s\S]*?)<\/ul>/gi,
      '<!-- wp:list -->\n<ul$1>$2</ul>\n<!-- /wp:list -->')
    .replace(/<p([\s\S]*?)>([\s\S]*?)<\/p>/gi,
      '<!-- wp:paragraph -->\n<p$1>$2</p>\n<!-- /wp:paragraph -->')
    .replace(/<figure[^>]*>([\s\S]*?)<img([^>]+)>([\s\S]*?)<\/figure>/gi,
      '<!-- wp:image -->\n<figure class="wp-block-image"><img$2 /></figure>\n<!-- /wp:image -->');

  // Step 3: Restore preserved comments as HTML blocks
  result = result.replace(/%%COMMENT_(\d+)%%/g, (_, idx) => {
    return `<!-- wp:html -->\n${comments[parseInt(idx)]}\n<!-- /wp:html -->`;
  });

  return result;
}

export async function publishFoodArticleToWPAction(
    article: FoodArticle,
    wpUrl: string,
    wpUser: string,
    wpPassword: string
): Promise<{ success?: boolean; id?: number; link?: string; error?: string }> {
    try {
        const baseUrl = wpUrl.replace(/\/$/, "");
        const authHeader = "Basic " + Buffer.from(`${wpUser}:${wpPassword}`).toString("base64");

        // FIX 6: Strip duplicate H1/H2 titles from start
        const escapeRegex = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const titleRegex = new RegExp(`^\\s*<h[12][^>]*>${escapeRegex(article.title)}<\\/h[12]>\\s*`, 'i');
        let finalContent = article.content.replace(titleRegex, '');
        
        // FIX 5: Convert HTML to Gutenberg
        finalContent = convertHtmlToGutenberg(finalContent);

        // Upload featured image first if it exists
        let featuredMediaId: number | undefined;
        if (article.featuredImageUrl) {
            try {
                const imgRes = await fetch(article.featuredImageUrl);
                const blob = await imgRes.blob();
                const buffer = Buffer.from(await blob.arrayBuffer());
                const mimeType = blob.type || "image/jpeg";
                const ext = mimeType.split("/")[1] || "jpg";
                
                const safeTitle = article.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
                const filename = `${safeTitle}-featured.${ext}`;

                const uploadRes = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
                    method: "POST",
                    headers: {
                        "Authorization": authHeader,
                        "Content-Disposition": `attachment; filename="${filename}"`,
                        "Content-Type": mimeType,
                    },
                    body: buffer,
                });

                if (uploadRes.ok) {
                    const mediaResult = await uploadRes.json();
                    featuredMediaId = mediaResult.id;
                    
                    // FIX 9: Set alt_text and caption
                    await fetch(`${baseUrl}/wp-json/wp/v2/media/${featuredMediaId}`, {
                        method: "POST", // WP REST API accepts POST for updating
                        headers: {
                            "Authorization": authHeader,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            alt_text: `${article.keyword} - ${article.title}`,
                            caption: article.title
                        }),
                    });
                }
            } catch (err) {
                console.error("Food SEO featured image upload error:", err);
            }
        }

        // FIX 1: Fetch or create category
        let categoryIds: number[] | undefined;
        try {
            // Search using the full keyword for best match
            const catRes = await fetch(
                `${baseUrl}/wp-json/wp/v2/categories?search=${encodeURIComponent(article.keyword)}&per_page=10`,
                { headers: { "Authorization": authHeader } }
            );
            const cats = await catRes.json();

            // Filter out Uncategorized (id=1) — NEVER fall back to it
            const validCats = Array.isArray(cats) ? cats.filter((c: any) => c.id !== 1) : [];

            if (validCats.length > 0) {
                categoryIds = [validCats[0].id];
            } else {
                // No match found — create a proper category from the keyword
                // Use last 2-3 meaningful words (skip numbers and short words)
                const words = article.keyword.split(' ').filter(w => w.length > 3 && !/^\d+$/.test(w));
                const catName = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                const createCat = await fetch(`${baseUrl}/wp-json/wp/v2/categories`, {
                    method: "POST",
                    headers: { "Authorization": authHeader, "Content-Type": "application/json" },
                    body: JSON.stringify({ name: catName })
                });
                if (createCat.ok) {
                    const newCat = await createCat.json();
                    if (newCat.id && newCat.id !== 1) categoryIds = [newCat.id];
                }
            }
        } catch (e) { console.error("Category lookup failed", e); }

        // FIX 4: Fetch or create tags
        const tagIds: number[] = [];
        if (article.tags && article.tags.length > 0) {
            for (const tag of article.tags) {
                try {
                    const tagRes = await fetch(`${baseUrl}/wp-json/wp/v2/tags?search=${encodeURIComponent(tag)}`, {
                        headers: { "Authorization": authHeader }
                    });
                    const existingTags = await tagRes.json();
                    const exactMatch = existingTags.find((t: any) => t.name.toLowerCase() === tag.toLowerCase());
                    if (exactMatch) {
                        tagIds.push(exactMatch.id);
                    } else {
                        const createTag = await fetch(`${baseUrl}/wp-json/wp/v2/tags`, {
                            method: "POST",
                            headers: { "Authorization": authHeader, "Content-Type": "application/json" },
                            body: JSON.stringify({ name: tag })
                        });
                        if (createTag.ok) {
                            const newTag = await createTag.json();
                            tagIds.push(newTag.id);
                        }
                    }
                } catch (e) { console.error("Tag lookup failed", e); }
            }
        }

        // Prepare POST body
        const postData: Record<string, unknown> = {
            title: article.title,
            content: finalContent,
            status: "draft",
            categories: categoryIds,
            tags: tagIds.length > 0 ? tagIds : undefined,
            excerpt: article.metaDescription, // FIX 3
            meta: {
                // FIX 2: Rank Math meta fields
                rank_math_focus_keyword: article.keyword,
                rank_math_title: article.title,
                rank_math_description: article.metaDescription,
                rank_math_facebook_title: article.title,
                rank_math_facebook_description: article.metaDescription,
                rank_math_twitter_use_facebook: "on"
            }
        };

        if (featuredMediaId) postData.featured_media = featuredMediaId;

        const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
            method: "POST",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(postData),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`WordPress API error: ${response.status} ${errText}`);
        }

        const data = await response.json();
        return { success: true, id: data.id, link: data.link };
    } catch (error: unknown) {
        console.error("Publishing Food Article error:", error);
        return { error: error instanceof Error ? error.message : "Unknown error publishing to WordPress" };
    }
}
