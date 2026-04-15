"use server";

import { GoogleGenAI } from "@google/genai";
import { headers } from "next/headers";
import type { WritingProvider } from "@/components/blog-monetizer/BlogMonetizer.types";
import { generateWithClaude } from "@/app/actions/blog-monetizer/generate-claude";
import { generateWithOpenAI } from "@/app/actions/blog-monetizer/generate-openai";
import type {
  ContentType,
  FormInputs,
  ResearchResult,
  SearchIntent,
  OutlineHeading,
  ProviderSettings,
} from "@/components/food-seo-writer/types";
import { getTemplateInstructions } from "@/components/food-seo-writer/lib/templates";
import { WORD_COUNT_RANGES, DEFAULT_FTC_DISCLOSURE } from "@/components/food-seo-writer/lib/constants";

// ─── Rate Limiting ───

const rateLimits = new Map<string, { count: number; resetTime: number }>();
async function checkRateLimit(): Promise<boolean> {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const limit = rateLimits.get(ip);
  if (!limit || now > limit.resetTime) {
    rateLimits.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  if (limit.count >= 60) return false;
  limit.count++;
  return true;
}

// ─── Provider Router ───

async function generateTextWithProvider(
  prompt: string,
  config: ProviderSettings,
  systemPrompt?: string
): Promise<string> {
  switch (config.contentProvider) {
    case "gemini": {
      const apiKey = config.contentApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API key is missing.");
      const ai = new GoogleGenAI({ apiKey });
      const contents = systemPrompt
        ? [
            { role: "user" as const, parts: [{ text: systemPrompt + "\n\n" + prompt }] },
          ]
        : [{ role: "user" as const, parts: [{ text: prompt }] }];
      const response = await ai.models.generateContent({
        model: config.contentModel,
        contents,
      });
      const text = response.text?.trim();
      if (!text) throw new Error("No output generated.");
      return text;
    }
    case "anthropic": {
      const anthropicApiKey = config.contentApiKey || process.env.ANTHROPIC_API_KEY;
      if (!anthropicApiKey) throw new Error("Anthropic API key is missing.");
      const fullPrompt = systemPrompt ? systemPrompt + "\n\n" + prompt : prompt;
      return generateWithClaude({ prompt: fullPrompt, anthropicApiKey, model: config.contentModel });
    }
    case "openai": {
      const openaiApiKey = config.contentApiKey || process.env.OPENAI_API_KEY;
      if (!openaiApiKey) throw new Error("OpenAI API key is missing.");
      const fullPrompt = systemPrompt ? systemPrompt + "\n\n" + prompt : prompt;
      return generateWithOpenAI({ prompt: fullPrompt, openaiApiKey, model: config.contentModel });
    }
    case "replicate": {
      const replicateApiKey = config.contentApiKey || process.env.REPLICATE_API_KEY;
      if (!replicateApiKey) throw new Error("Replicate API key is missing.");
      const fullPrompt = systemPrompt ? systemPrompt + "\n\n" + prompt : prompt;
      const response = await fetch(`https://api.replicate.com/v1/models/${config.contentModel}/predictions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${replicateApiKey}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({ input: { prompt: fullPrompt } }),
      });
      if (!response.ok) throw new Error(`Replicate API error ${response.status}`);
      const prediction = await response.json();
      if (prediction.status === "succeeded" && prediction.output) {
        return Array.isArray(prediction.output) ? prediction.output.join("") : prediction.output;
      }
      throw new Error("Replicate prediction failed");
    }
    default:
      throw new Error(`Unknown provider: ${config.contentProvider}`);
  }
}

// ─── Stage 2: Research & Planning (Section 2.3) ───

export async function researchAndPlanAction(
  inputs: FormInputs,
  config: ProviderSettings
): Promise<{ success: boolean; result?: ResearchResult; error?: string }> {
  if (!(await checkRateLimit())) return { success: false, error: "Rate limit exceeded." };

  const keyword = inputs.core.mainKeyword.trim();
  const contentType = inputs.core.contentType;
  const isAutoDetect = contentType === ("auto-detect" as ContentType);
  const wordRange = WORD_COUNT_RANGES[inputs.core.wordCountTarget];
  const templateInstructions = isAutoDetect 
    ? "Analyze the keyword and determine the best content type. Choose exactly one from: Single Recipe Post / Recipe Roundup/Listicle / Meal Prep Guide / Product Review / Comparison Post / Holiday/Seasonal / Pillar Page. Return as: DETECTED_CONTENT_TYPE: [your choice]"
    : getTemplateInstructions(contentType);

  const prompt = `You are an expert food SEO strategist. Analyze this keyword and plan content.
Return ONLY valid JSON, no markdown, no code fences.

Keyword: "${keyword}"
Content Type: ${isAutoDetect ? "Auto-detect" : contentType}
Target Word Count: ${wordRange.min}-${wordRange.max} words
${inputs.keywords.secondaryKeywords ? `Secondary Keywords: ${inputs.keywords.secondaryKeywords}` : "No secondary keywords provided — suggest 3-5."}
${inputs.keywords.contextualKeywords ? `Contextual Keywords: ${inputs.keywords.contextualKeywords}` : "No contextual keywords provided — suggest 3-5."}
Target Site: ${inputs.core.targetSite || "Not specified"}

Template Structure:
${templateInstructions}

Return this EXACT JSON structure:
{
  "searchIntent": "informational" | "transactional" | "navigational",
  "selectedTemplate": "${isAutoDetect ? "DETECTED_CONTENT_TYPE: [your choice]" : contentType}",
  "seasonalRelevance": "description of seasonal relevance or 'year-round'",
  "competitionLevel": "low" | "medium" | "high",
  "suggestedSecondaryKeywords": ["kw1", "kw2", "kw3"],
  "suggestedContextualKeywords": ["kw1", "kw2", "kw3"],
  "title": "SEO title 50-60 characters with main keyword, compelling for Google and Pinterest",
  "metaDescription": "120-160 characters with main keyword, compelling CTA",
  "urlSlug": "short-hyphenated-slug-with-keyword",
  "outline": [
    { "level": "h1", "text": "Same as title", "plannedWordCount": 0, "hasImagePlacement": false, "affiliateLinkPlanned": false },
    { "level": "h2", "text": "H2 heading text", "plannedWordCount": 150, "hasImagePlacement": true, "affiliateLinkPlanned": false }
  ]
}

CRITICAL OUTLINE RULES:
- H1 title MUST include the main keyword "${keyword}" and be 50-60 characters
- NEVER use the exact phrase "${keyword}" in more than 2 H2 headings — vary with synonyms and natural language
${(() => {
  // For roundup/listicle posts, extract the number from the keyword or title to enforce H2 count
  const isRoundup = contentType === 'Recipe Roundup/Listicle' || contentType === 'Holiday/Seasonal';
  const numMatch = keyword.match(/(\d+)/)
  let titleNum = numMatch ? parseInt(numMatch[1], 10) : 0;
  let instruction = '';
  
  if (isRoundup && titleNum >= 5) {
    if (titleNum > 15) {
      instruction = `- CRITICAL MAX LIMIT: The keyword contains a large number (${titleNum}), but you MUST CAP the listicle at exactly 15 items to maintain high quality. The SEO title you generate MUST use the number 15 (e.g. "15 Best...").\n`;
      titleNum = 15;
    }
    return instruction + `- CRITICAL: You MUST plan EXACTLY ${titleNum} recipe H2 sections in the outline (plus intro/FAQ/conclusion H2s). The reader expects ${titleNum} items. Each recipe H2 MUST have hasImagePlacement: true.\n- Plan ${titleNum + 4} total H2 sections (${titleNum} recipes + intro + FAQ + conclusion + tips)\n`;
  }
  return `- Plan ${Math.ceil((wordRange.min + wordRange.max) / 2 / 150)} H2 sections\n`;
})()}- Each H2 section should target 134-167 words (optimal for AI citation engines)
- Plan image placements every 300-400 words
- Plan affiliate link placements max 1 per 300 words, contextually relevant
- Include an FAQ section H2 with 5-7 sub-headings (H3)
- Include secondary and contextual keywords distributed across headings`;

  try {
    const text = await generateTextWithProvider(prompt, config);
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const validIntents: SearchIntent[] = ["informational", "transactional", "navigational"];
    
    let finalContentType = contentType;
    if (isAutoDetect && parsed.selectedTemplate) {
      const match = parsed.selectedTemplate.match(/DETECTED_CONTENT_TYPE:\s*(.*)/i);
      if (match && match[1]) {
        finalContentType = match[1].split(/[^A-Za-z \/-]/)[0].trim() as ContentType;
      } else {
        finalContentType = parsed.selectedTemplate.replace("DETECTED_CONTENT_TYPE:", "").trim() as ContentType;
      }
    }

    const result: ResearchResult = {
      searchIntent: validIntents.includes(parsed.searchIntent) ? parsed.searchIntent : "informational",
      selectedTemplate: isAutoDetect ? finalContentType : contentType,
      seasonalRelevance: String(parsed.seasonalRelevance || "year-round").substring(0, 200),
      competitionLevel: parsed.competitionLevel || "medium",
      suggestedSecondaryKeywords: Array.isArray(parsed.suggestedSecondaryKeywords)
        ? parsed.suggestedSecondaryKeywords.map(String).slice(0, 10)
        : [],
      suggestedContextualKeywords: Array.isArray(parsed.suggestedContextualKeywords)
        ? parsed.suggestedContextualKeywords.map(String).slice(0, 10)
        : [],
      outline: Array.isArray(parsed.outline)
        ? parsed.outline.map((h: OutlineHeading) => ({
            level: h.level || "h2",
            text: String(h.text || "").substring(0, 200),
            plannedWordCount: h.plannedWordCount || 150,
            hasImagePlacement: !!h.hasImagePlacement,
            affiliateLinkPlanned: !!h.affiliateLinkPlanned,
          }))
        : [],
      title: String(parsed.title || keyword).substring(0, 80),
      metaDescription: String(parsed.metaDescription || "").substring(0, 180),
      urlSlug: String(parsed.urlSlug || keyword.toLowerCase().replace(/\s+/g, "-")).substring(0, 100),
    };

    return { success: true, result };
  } catch (err: unknown) {
    console.error("[FOOD-SEO-V2] Research stage failed:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: `Research & Planning failed: ${msg}` };
  }
}

// ─── Stage 3: Content Generation (Section 2.4) — Exact System Prompt ───

const SYSTEM_PROMPT_CONTENT_WRITER = `You are a professional food blogger writing for a real audience of home cooks.
Your content must be genuinely helpful, with real recipes people can actually cook.

CRITICAL RULES:

1. Every recipe MUST include: exact ingredients with measurements (cups, tablespoons, grams), numbered step-by-step cooking instructions, prep time, cook time, total time, and servings.

2. NEVER use the exact main keyword phrase in more than 2 H2 headings. Vary with synonyms, related terms, and natural language.

3. NEVER use these AI-detected phrases: "In today's fast-paced world", "Whether you're a seasoned chef or a beginner", "Let's dive in", "Look no further", "takes it to the next level", "game-changer", "elevate your", "savor every bite", "culinary journey", "mouthwatering", "tantalizing". Replace with natural, conversational language.

4. Vary sentence length deliberately. Mix short punchy sentences (5-8 words) with medium (12-18 words) and occasional long ones (20-30 words). This creates natural burstiness that evades AI detection.

5. Include at least 2 first-person experience signals per post: specific cooking failures, recipe testing iterations, family reactions, seasonal cooking memories. These MUST feel genuine, not generic.

6. For roundup posts: give a preview description (80-150 words) and a practical tip per item. Do NOT include full recipes — link to individual posts instead.

7. Image alt text must be descriptive and include a keyword variation, but never be identical to the H2 heading.

8. MANDATORY WORD COUNT PER SECTION: You MUST write exactly 140-165 words for each H2 section (excluding the Recipe Card section). This is a strict output format requirement. Before finalizing each section, count your words. If a section is under 134 words, add more specific detail. If over 167 words, split into tighter sentences. Sections outside 134-167 words will fail quality validation. Target 150 words as the ideal.

9. Start each major section with a direct answer to the implied question, THEN elaborate. This "answer-first" format increases AI citation rate by ~340%.

10. Include specific numbers, temperatures, and times. "Bake at 375°F for 22-25 minutes" not "Bake until done."

11. Include at least 1 external link to an authoritative source relevant to the recipe topic. Use sources like USDA FoodData Central (fdc.nal.usda.gov), FDA food safety guidelines, Harvard Health, Mayo Clinic, or recognized nutrition databases. Format as a standard HTML anchor tag. This is required for E-E-A-T signals.

12. Insert an image placeholder after every H2 section heading, before the first paragraph of that section. Use this exact format:
![Descriptive alt text with keyword variation](image-placeholder)
For a 2000-word article with ~10 H2 sections, include at least 5 image placeholders. Each alt text must be unique, descriptive, include a keyword variation, and never be identical to the H2 heading text.

13. Do NOT include any affiliate disclosure text in the article body. The FTC disclosure is handled separately by the compliance module and will be automatically inserted. Never write "This post may contain affiliate links" or similar disclosure text in your output.

14. Use varied vocabulary throughout. Do not repeat the same adjectives, verbs, or descriptive phrases. For example, don't use "delicious" more than twice in the entire article — use "flavorful", "satisfying", "rich", or specific taste descriptions instead.`;

export async function generateContentAction(
  inputs: FormInputs,
  research: ResearchResult,
  config: ProviderSettings,
  correctionInstructions?: string
): Promise<{
  success: boolean;
  content?: string;
  title?: string;
  metaDescription?: string;
  wordCount?: number;
  error?: string;
}> {
  if (!(await checkRateLimit())) return { success: false, error: "Rate limit exceeded." };

  const keyword = inputs.core.mainKeyword.trim();
  const templateInstructions = getTemplateInstructions(inputs.core.contentType);
  const wordRange = WORD_COUNT_RANGES[inputs.core.wordCountTarget];
  const hasProducts = inputs.monetization.productLinks.length > 0 || inputs.monetization.productStoreUrl;

  // Build product links text (manual entries)
  let productLinksSection = "";
  if (inputs.monetization.productLinks.length > 0) {
    productLinksSection = `AFFILIATE PRODUCTS:
${inputs.monetization.productLinks.map((p: any) => `- ${p.productName}: ${p.url}`).join("\n")}

AFFILIATE LINK RULES:
- Insert contextually where they genuinely help the reader
- Format: "I use this [Product Name](URL){rel="sponsored noopener"} for this step — it makes [specific benefit]."
- Maximum 1 link per 300 words
- Each link must feel like a genuine recommendation, not an ad
- Never force links. Never place 2 affiliate links in the same paragraph.`;
  }

  // Product catalog from file upload (Feature 4)
  let productCatalogSection = "";
  if (inputs.monetization.productCatalog && inputs.monetization.productCatalog.length > 0) {
    const catalogLines = inputs.monetization.productCatalog.map(
      (p: any) => `- ${p.productName}: ${p.url}`
    ).join("\n");
    productCatalogSection = `\nPRODUCT CATALOG (${inputs.monetization.productCatalog.length} products available):
${catalogLines}

PRODUCT MATCHING RULES:
- For each recipe section where a kitchen tool or product would be genuinely helpful, select the most relevant product from this catalog and insert an affiliate link naturally.
- Match products based on relevance to the recipe content — for example, a blender product link in a smoothie section, a cutting board link in a prep-heavy recipe.
- Maximum 1 product link per 300 words.
- Do NOT force-fit products. Only include them where genuinely relevant.`;
  }

  // Amazon affiliate tag (Feature 6)
  let amazonSection = "";
  if (inputs.monetization.amazonTag) {
    amazonSection = `\nAMAZON AFFILIATE TAG: ${inputs.monetization.amazonTag}
- When mentioning Amazon products, format links as: https://amazon.com/dp/[ASIN]?tag=${inputs.monetization.amazonTag}
- If no Amazon tag were provided, product mentions would appear as plain bold text without links.`;
  } else if (!hasProducts && inputs.monetization.productCatalog.length === 0) {
    amazonSection = `\nNO AFFILIATE LINKS: Product mentions should appear as plain bold text without links.`;
  }

  // FTC disclosure
  const ftcSection = hasProducts && inputs.monetization.affiliateDisclosure
    ? `\nFTC DISCLOSURE:
After the intro paragraph, before the first H2, insert this EXACT text as an italic block:
"${DEFAULT_FTC_DISCLOSURE}"
Do NOT repeat this disclosure anywhere else in the article.`
    : "";

  const prompt = `${correctionInstructions ? `CORRECTION INSTRUCTIONS (fix these issues from previous generation):\n${correctionInstructions}\n\n` : ""}CONTENT GENERATION TASK:

Keyword: "${keyword}"
Title: "${research.title}"
Meta Description: "${research.metaDescription}"
Content Type: ${inputs.core.contentType}
Target Word Count: ${wordRange.min}-${wordRange.max} words
Writing Persona: ${inputs.advanced.writingPersona}
Tone: ${inputs.advanced.tone}
${inputs.advanced.aiSearchOptimization ? "AI Search Optimization: ON — use answer-first formatting for every H2 section" : ""}
${inputs.advanced.includeRecipeCard ? "Include Recipe Card: YES — use the exact recipe card format" : ""}
${inputs.advanced.includeFaqSection ? "Include FAQ Section: YES — 5-7 Q&As with concise answers (50-100 words each)" : ""}
${inputs.advanced.includeNutritionInfo ? "Include Nutrition Info: YES" : ""}

TEMPLATE TO FOLLOW:
${templateInstructions}

CONTENT STRUCTURE (MANDATORY):
- Do NOT output an H1 tag anywhere. Start directly with the introduction.
- ANSWER-FIRST RULE (MANDATORY): Every H2 section MUST begin with a direct, declarative answer sentence as the FIRST sentence after the H2 heading. Do NOT start sections with anecdotes, questions, or transitional phrases. Lead with the answer, then elaborate.
- VOCABULARY DIVERSITY (MANDATORY): Avoid repeating the same adjective, verb, or descriptive phrase more than twice in the entire article. Do not use 'superb', 'fantastic', 'brilliant', 'delectable', 'compelling', 'exceptional' more than once each. Vary your word choices. Use a thesaurus-level range of vocabulary.
- INTERNAL LINKS: You may include internal links ONLY to exact URLs provided by the user in the Internal Link Topics field. If no topics are provided, include ZERO internal links. Never invent slugs.
- For Recipe Roundup/Listicle articles: write each recipe as its own H2 section following this exact pattern: (1) H2 heading with recipe name and a descriptive subtitle after an em-dash, (2) one paragraph of vivid sensory description, (3) one paragraph with the focus keyword bolded in a <strong> tag, (4) an image placeholder <figure><img src='image-placeholder' alt='[recipe name — subtitle]' data-pin-description='[1-sentence pinterest description]' /></figure>, (5) one practical tip paragraph starting with 'Practical tip:'.
- Opening hook: 2-3 sentences, include main keyword naturally
- Personal story: 100-200 words max (not 500-word life stories — readers hate this)
- Jump to Recipe note: "Jump to Recipe" anchor link after intro
- Body content: Follows the template structure above
${inputs.advanced.includeRecipeCard ? `- Recipe card: Full structured recipe using this EXACT format:
  ## [Recipe Name]
  **Prep Time:** [X minutes]
  **Cook Time:** [X minutes]
  **Total Time:** [X minutes]
  **Servings:** [X]
  **Calories:** [X per serving]
  ### Ingredients
  - [Measurement] [Ingredient] ([preparation note if needed])
  ### Instructions
  1. [Specific instruction with temperature, time, and visual cue]
  2. [Include "you'll know it's ready when..." visual indicators]
  ### Nutrition Facts (per serving)
  Calories: [X] | Protein: [X]g | Carbs: [X]g | Fat: [X]g | Fiber: [X]g | Sugar: [X]g | Sodium: [X]mg
  ### Storage
  [How to store, how long it lasts, reheating instructions]
  ### Recipe Notes
  - [Substitution options]
  - [Make-ahead tips]
  - [Scaling notes]` : ""}
${inputs.advanced.includeFaqSection ? "- FAQ section: 5-7 questions with concise answers (50-100 words each)" : ""}
- Conclusion: 2-3 sentences with call-to-action. End every article with a closing paragraph containing one internal link to a user-provided category URL (if available).

${(() => {
  // LISTICLE COUNT ENFORCEMENT
  const isRoundup = inputs.core.contentType === 'Recipe Roundup/Listicle' || inputs.core.contentType === 'Holiday/Seasonal';
  const numMatch = research.title.match(/(\d+)/);
  let titleNum = numMatch ? parseInt(numMatch[1], 10) : 0;
  if (titleNum > 15) titleNum = 15;
  
  if (isRoundup && titleNum >= 5) {
    return `LISTICLE COUNT ENFORCEMENT (CRITICAL MANDATE):
- The topic specifies ${titleNum} distinct items. You MUST write EXACTLY ${titleNum} distinct recipe H2 sections in the article body.
- CRITICAL: Do NOT write generic categorical H2s (e.g. "Vibrant Lunches", "Nourishing Soups"). Every H2 MUST be a specific, numbered recipe title (e.g. "1. Golden Milk Chicken Soup", "2. Roasted Turmeric Cauliflower", etc).
- Each of the ${titleNum} recipes MUST have: (1) a numbered H2 heading, (2) a descriptive paragraph outlining why it's great, (3) an image placeholder, (4) a practical tip.
- Do NOT combine multiple recipes under one section. You MUST have ${titleNum} separate H2s for recipes.
- After all ${titleNum} recipe sections are completed, then you may include the FAQ section and conclusion.
- Failure to provide exactly ${titleNum} numbered distinct recipe H2 sections will result in rejection.`;
  }
  return '';
})()}

${productLinksSection}
${productCatalogSection}
${amazonSection}
${ftcSection}

OUTLINE TO FOLLOW:
${research.outline.map((h: OutlineHeading) => `${h.level.toUpperCase()}: ${h.text} (~${h.plannedWordCount} words)`).join("\n")}

IMAGE PLACEMENT (MANDATORY): 
For each recipe/content H2 section, place the <figure><img src='image-placeholder' alt='...' data-pin-description='...' /></figure> tag AFTER the second paragraph and BEFORE the Practical tip paragraph. NEVER place the image immediately after the H2 heading as the first element.

NO IMAGE RULE (MANDATORY): 
Do NOT place any <figure><img> placeholder inside the FAQ section, inside any FAQ question/answer pair, or inside the closing call-to-action section. Images appear ONLY in recipe/content H2 sections.

KEYWORD DISTRIBUTION:
- Main keyword "${keyword}" in H1, first paragraph, and max 2 H2 headings
- Secondary keywords: ${inputs.keywords.secondaryKeywords || "distribute naturally"}
- Qualifier keywords: ${inputs.keywords.qualifierKeywords || "use as modifiers"}
- Contextual keywords: ${inputs.keywords.contextualKeywords || "weave naturally throughout"}

OUTPUT FORMAT:
Return clean HTML with:
- Do NOT include an <h1> tag (the title is handled separately)
- <h2> for main sections
- <h3> for sub-sections and FAQ questions
- <p> for paragraphs
- <strong> for key bolded phrases
- <ul>/<ol> for lists
- ![alt text](image-placeholder) for image placeholders (keep as markdown image syntax)
Do NOT wrap in code fences. Do NOT include <html>, <head>, or <body> tags.`;

  try {
    const text = await generateTextWithProvider(prompt, config, SYSTEM_PROMPT_CONTENT_WRITER);
    let content = text.replace(/```html\s*/gi, "").replace(/```/g, "").trim();

    // Remove duplicate <h1> title
    content = content.replace(/^\s*<h1[^>]*>.*?<\/h1>\s*/i, "");

    // Fix 1: Add Featured Image placeholder as the very FIRST element before intro
    const heroPlaceholder = `\n<figure class="wp-block-image size-full featured-image">\n  <img src="image-placeholder" alt="${inputs.core.mainKeyword} — ${research.title}" data-pin-description="${research.metaDescription}" />\n</figure>\n\n`;
    content = heroPlaceholder + content;

    // Fix 3: NO images in FAQ or Closing CTA. Post-processing strip of <figure> tags in those sections.
    content = content.replace(
      /(<h2[^>]*>.*?(?:frequently asked|faq|save these|for later|share this).*?<\/h2>)([\s\S]*?)(?=<h2|$)/gi,
      (match, h2, sectionContent) => {
        return h2 + sectionContent.replace(/<figure[^>]*>.*?<\/figure>/gi, "");
      }
    );

    // Strip out any fabricated internal links that point to relative paths 
    // AND weren't in the provided internal links list (since we only pass generic instructions for now, 
    // we'll strip ALL relative links if there is no internal link data provided by the user).
    // The user didn't provide internal Link topics in the inputs schema actually! So we must strip all fabricated relative links.
    if (!inputs.monetization.productStoreUrl && inputs.monetization.productLinks.length === 0) {
      // If no valid internal links provided, strip all relative links
      content = content.replace(/<a\s+[^>]*href=["']\/[^"']*["'][^>]*>(.*?)<\/a>/gi, "$1");
    } else {
      // Basic strip for relative links that look obviously fake
      content = content.replace(/<a\s+[^>]*href=["']\/[a-z0-9-]+["'][^>]*>(.*?)<\/a>/gi, "$1");
    }

    // Bug Fix 7: Strip any FTC disclosure text that the AI may have included in the body
    content = content.replace(
      /<p>[^<]*(?:affiliate links?)[^<]*(?:commission|earn)[^<]*(?:recommend|love|use)[^<]*<\/p>\s*/gi,
      ""
    );
    content = content.replace(
      /<p>\s*<em>[^<]*(?:affiliate links?)[^<]*(?:commission|earn)[^<]*<\/em>\s*<\/p>\s*/gi,
      ""
    );

    // Count words
    const wordCount = content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;

    // Polish Fix 1: Strip leading H1 from final output
    content = content
      .replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, "")
      .trimStart();

    return {
      success: true,
      content,
      title: research.title,
      metaDescription: research.metaDescription,
      wordCount,
    };
  } catch (err) {
    console.error("[FOOD-SEO-V2] Content generation failed:", err);
    return { success: false, error: "Content generation failed. Please try again." };
  }
}

// ─── Stage 4: SEO Optimization (Section 2.5) ───

export async function optimizeSeoAction(
  content: string,
  title: string,
  metaDescription: string,
  keyword: string,
  config: ProviderSettings,
  correctionInstructions?: string
): Promise<{
  success: boolean;
  optimizedContent?: string;
  optimizedTitle?: string;
  optimizedMetaDescription?: string;
  urlSlug?: string;
  error?: string;
}> {
  if (!(await checkRateLimit())) return { success: false, error: "Rate limit exceeded." };

  const prompt = `${correctionInstructions ? `CORRECTION INSTRUCTIONS:\n${correctionInstructions}\n\n` : ""}You are an SEO optimization specialist. Review and optimize this food blog content.
Return ONLY the optimized HTML content, nothing else. Do NOT wrap in code fences.

Focus Keyword: "${keyword}"
Current Title: "${title}"
Current Meta Description: "${metaDescription}"

SEO VALIDATION CHECKLIST — fix any issues:
1. Title tag: 50-60 characters, includes main keyword — trim or expand to fit
2. Meta description: 120-160 characters, includes main keyword, compelling CTA — generate if missing
3. H1: Exactly 1 per post, contains main keyword — fix if multiple or missing
4. H2 keyword distribution: Main keyword in max 2 of all H2s — rephrase stuffed headings
5. Keyword density: 1-2% of total words — add/remove instances
6. First paragraph: Main keyword within first 100 words — rework if missing
7. Image alt text: All images have unique, descriptive alt text with keyword variations
8. Heading hierarchy: No skipping levels (H1→H2→H3, never H1→H3)
9. Readability: Short paragraphs (2-3 sentences max), no filler phrases
10. All affiliate links must use rel="sponsored noopener noreferrer" target="_blank" class="affiliate-link"

CURRENT CONTENT:
${content}

Return the optimized HTML content. If the title or meta description needed changes, put them as HTML comments at the very start:
<!-- OPTIMIZED_TITLE: Your optimized title here -->
<!-- OPTIMIZED_META: Your optimized meta description here -->
<!-- OPTIMIZED_SLUG: your-optimized-url-slug -->
Then the full optimized HTML content.`;

  try {
    let text = await generateTextWithProvider(prompt, config);
    text = text.replace(/```html\s*/gi, "").replace(/```/g, "").trim();

    // Extract optimization markers
    const titleMatch = text.match(/<!-- OPTIMIZED_TITLE: (.*?) -->/);
    const metaMatch = text.match(/<!-- OPTIMIZED_META: (.*?) -->/);
    const slugMatch = text.match(/<!-- OPTIMIZED_SLUG: (.*?) -->/);

    let optimizedContent = text
      .replace(/<!-- OPTIMIZED_TITLE:.*?-->\n?/g, "")
      .replace(/<!-- OPTIMIZED_META:.*?-->\n?/g, "")
      .replace(/<!-- OPTIMIZED_SLUG:.*?-->\n?/g, "")
      .trim();

    let finalMeta = metaMatch ? metaMatch[1].trim() : metaDescription;

    // Bug Fix 2: Enforce meta description 160 char limit
    if (finalMeta.length > 160) {
      const kwLower = keyword.toLowerCase();
      // Truncate at last complete word before 155 chars and append "..."
      let truncated = finalMeta.substring(0, 155);
      const lastSpace = truncated.lastIndexOf(" ");
      if (lastSpace > 100) {
        truncated = truncated.substring(0, lastSpace);
      }
      truncated = truncated.replace(/[,;:\-]$/, "").trim() + "...";

      // Check if keyword is still present
      if (truncated.toLowerCase().includes(kwLower)) {
        finalMeta = truncated;
      } else {
        // Keyword was cut off — keep original but hard-truncate
        finalMeta = metaDescription.length <= 160 ? metaDescription : truncated;
      }
    }

    // Bug Fix 3: Check for external links and add fallback if missing
    const externalLinkCount = (optimizedContent.match(/href="https?:\/\//gi) || []).length;
    if (externalLinkCount === 0) {
      // Append a Nutrition Note section before FAQ
      const nutritionNote = `<h2>Nutrition Note</h2>\n<p>For detailed nutritional information on common recipe ingredients, the <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noopener noreferrer">USDA FoodData Central database</a> provides comprehensive, science-backed nutrient data that can help you make informed dietary choices.</p>`;
      const faqMatch = optimizedContent.match(/<h2[^>]*>.*?(?:FAQ|Frequently Asked)/i);
      if (faqMatch && faqMatch.index !== undefined) {
        optimizedContent = optimizedContent.slice(0, faqMatch.index) + nutritionNote + "\n" + optimizedContent.slice(faqMatch.index);
      } else {
        // Append at end before closing
        optimizedContent += "\n" + nutritionNote;
      }
    }

    return {
      success: true,
      optimizedContent,
      optimizedTitle: titleMatch ? titleMatch[1].trim() : title,
      optimizedMetaDescription: finalMeta,
      urlSlug: slugMatch ? slugMatch[1].trim() : keyword.toLowerCase().replace(/\s+/g, "-"),
    };
  } catch (err) {
    console.error("[FOOD-SEO-V2] SEO optimization failed:", err);
    return { success: false, error: "SEO optimization failed. Please try again." };
  }
}

// ─── Stage 5: Pinterest Copy Generation (Section 2.6) ───

export async function generatePinterestCopyAction(
  keyword: string,
  title: string,
  metaDescription: string,
  contentType: ContentType,
  pinVariants: number,
  config: ProviderSettings
): Promise<{
  success: boolean;
  result?: {
    pinTitles: { text: string; charCount: number }[];
    pinDescriptions: { text: string; charCount: number }[];
    tobiOverlays: { text: string; wordCount: number }[];
    boardSuggestions: { name: string; description: string }[];
    hiddenPins: { title: string; description: string; tobiText: string }[];
  };
  error?: string;
}> {
  if (!(await checkRateLimit())) return { success: false, error: "Rate limit exceeded." };

  const prompt = `Generate Pinterest marketing copy for this food blog post.
Return ONLY valid JSON, no markdown, no code fences.

Post Title: "${title}"
Main Keyword: "${keyword}"
Content Type: ${contentType}
Meta Description: "${metaDescription}"

Return this EXACT JSON structure:
{
  "pinTitles": [
    ${Array.from({ length: pinVariants }, (_, i) => `"Pin Title ${i + 1} — 40-100 characters, keyword front-loaded, power word included"`).join(",\n    ")}
  ],
  "pinDescriptions": [
    ${Array.from({ length: pinVariants }, (_, i) => `"Pin Description ${i + 1} — 100-500 characters, main keyword in first sentence, 1-2 secondary keywords, end with soft CTA like 'Save for later'"`).join(",\n    ")}
  ],
  "tobiOverlays": [
    "4-8 words, readable on phone, creates curiosity",
    "4-8 words, states clear benefit",
    "4-8 words, uses number or time hook",
    "4-8 words, emotional appeal",
    "4-8 words, action-oriented"
  ],
  "boardSuggestions": [
    { "name": "Board Name", "description": "What someone would find on this board" },
    { "name": "Board Name 2", "description": "Description" },
    { "name": "Board Name 3", "description": "Description" }
  ],
  "hiddenPins": [
    { "title": "Hidden pin title (different from main variants)", "description": "Hidden pin description", "tobiText": "4-8 word overlay" },
    { "title": "Hidden pin title 2", "description": "Hidden pin description 2", "tobiText": "4-8 word overlay" }
  ]
}

PIN TITLE RULES:
- 40-100 characters each
- Main keyword front-loaded (first 3-4 words)
- Include a qualifier keyword variant in each
- Use power words: Easy, Best, Quick, Simple, Ultimate, Perfect, Delicious
- NO hashtags (Pinterest's algorithm no longer rewards them)
- Each variant must be unique in structure and angle

PIN DESCRIPTION RULES:
- 100-500 characters each (Pinterest shows first 50-60 in feed)
- Include main keyword in first sentence
- Include 1-2 secondary keywords
- End with soft CTA: "Save for later", "Try this tonight", "Click for the full recipe"
- NO hashtags
- Write in second person ("you'll love")

TOBI TEXT RULES:
- 4-8 words maximum (must be readable on a phone screen)
- Example patterns: "This [Food] Hack Changed Everything", "The Secret to Perfect [Dish]", "[Number] [Dish] Ideas You'll Love", "Ready in [Time] Minutes"

BOARD SUGGESTION RULES (Tony Hill's strategy):
- Broad enough to keep adding pins over time
- Narrow enough that every pin is highly relevant
- Format: "Board Name — What someone would find on this board"

HIDDEN PIN RULES:
- Different from the main pin variants
- For team members to pin from personal accounts`;

  try {
    const text = await generateTextWithProvider(prompt, config);
    const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const result = {
      pinTitles: (parsed.pinTitles || []).map((t: string, i: number) => ({
        text: t,
        charCount: t.length,
      })),
      pinDescriptions: (parsed.pinDescriptions || []).map((d: string, i: number) => ({
        text: d,
        charCount: d.length,
      })),
      tobiOverlays: (parsed.tobiOverlays || []).map((t: string, i: number) => ({
        text: t,
        wordCount: t.split(/\s+/).filter(Boolean).length,
      })),
      boardSuggestions: (parsed.boardSuggestions || []).map(
        (b: { name: string; description: string }) => ({
          name: b.name || "",
          description: b.description || "",
        })
      ),
      hiddenPins: (parsed.hiddenPins || []).map(
        (h: { title: string; description: string; tobiText: string }) => ({
          title: h.title || "",
          description: h.description || "",
          tobiText: h.tobiText || "",
        })
      ),
    };

    return { success: true, result };
  } catch (err) {
    console.error("[FOOD-SEO-V2] Pinterest copy generation failed:", err);
    return { success: false, error: "Pinterest copy generation failed. Please try again." };
  }
}

// ─── Phase 2: Images & Publishing Server Actions ───

import Replicate from "replicate";
import { publishToWordPress, type WordPressPublishOptions } from "@/components/food-seo-writer/lib/wordpress-api";
import { uploadToImgBB } from "@/components/food-seo-writer/lib/imgbb";

export async function generateImageAction(
  title: string,
  contentSummary: string,
  promptTemplate: string,
  style: any,
  colorMood: string,
  dimensions: any,
  config: ProviderSettings,
  imgbbKey: string,
  imageType: 'featured' | 'inline' | 'pin' = 'inline'
): Promise<{ success?: boolean; imageUrl?: string; prompt?: string; error?: string }> {
  if (!(await checkRateLimit())) return { success: false, error: "Rate limit exceeded." };

  const IMAGE_SPECS = {
    featured: { aspectRatio: '16:9', imageSize: '1K' },
    inline:   { aspectRatio: '9:16', imageSize: '1K' },
    pin:      { aspectRatio: '2:3',  imageSize: '1K' },
  };

  const prompt = promptTemplate
    .replace("{title}", title)
    .replace("{content}", contentSummary) + ` Style: ${style}. ${colorMood ? `Mood: ${colorMood}.` : ""}`;

  console.log(`[Image] type=${imageType} aspectRatio=${IMAGE_SPECS[imageType].aspectRatio}`);

  const apiKey = config.useSharedKey && config.imageProvider === config.contentProvider ? config.contentApiKey : config.imageApiKey;

  try {
    let imageUrl = "";
    if (config.imageProvider === "gemini") {
      const gApiKey = apiKey || process.env.GEMINI_API_KEY || "";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.imageModel}:generateContent?key=${gApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: {
                aspectRatio: IMAGE_SPECS[imageType].aspectRatio,
                imageSize: IMAGE_SPECS[imageType].imageSize,
              }
            }
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message ?? `Gemini API error ${res.status}`);
      }

      // Extract image from response parts
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find(
        (p: any) => p.inlineData?.mimeType?.startsWith('image/')
      );

      if (!imagePart?.inlineData?.data) {
        // Log full response for debugging
        console.error('Gemini image response (no image found):', JSON.stringify(data, null, 2));
        throw new Error(
          `Gemini returned no image. Response had ${parts.length} parts: ${parts.map((p: any) => p.text ? 'text' : p.inlineData ? `image(${p.inlineData.mimeType})` : 'unknown').join(', ')}`
        );
      }

      const base64Data = imagePart.inlineData.data;
      const mimeType = imagePart.inlineData.mimeType;

      // Upload to ImgBB if key is available, otherwise return data URI
      if (imgbbKey) {
        const formData = new FormData();
        formData.append('image', base64Data);
        const imgbbRes = await fetch(
          `https://api.imgbb.com/1/upload?key=${imgbbKey}`,
          { method: 'POST', body: formData }
        );
        const imgbbData = await imgbbRes.json();
        if (imgbbData?.data?.url) {
          imageUrl = imgbbData.data.url;
        } else {
          console.error('ImgBB upload failed:', JSON.stringify(imgbbData));
          // Fall through to data URI if ImgBB fails
          imageUrl = `data:${mimeType};base64,${base64Data}`;
        }
      } else {
        imageUrl = `data:${mimeType};base64,${base64Data}`;
      }
    } else {
      const rep = new Replicate({ auth: apiKey || process.env.REPLICATE_API_KEY || "" });
      const output = await rep.run(config.imageModel as `${string}/${string}`, { input: { prompt } }) as string[] | ReadableStream;
      if (Array.isArray(output) && output.length > 0) {
        const pic = await fetch(output[0]);
        if (!pic.ok) throw new Error("Replicate image URL fetch failed");
        const buf = await pic.arrayBuffer();
        const base64 = Buffer.from(buf).toString('base64');
        const upload = await uploadToImgBBAction(base64, imgbbKey, title);
        if (!upload.success) throw new Error(`ImgBB Upload Failed: ${upload.error}`);
        imageUrl = upload.url!;
      } else if (typeof output === "string") {
        // Some replicate models return a single string URL
        const pic = await fetch(output as unknown as string);
        if (!pic.ok) throw new Error("Replicate image URL fetch failed");
        const buf = await pic.arrayBuffer();
        const base64 = Buffer.from(buf).toString('base64');
        const upload = await uploadToImgBBAction(base64, imgbbKey, title);
        if (!upload.success) throw new Error(`ImgBB Upload Failed: ${upload.error}`);
        imageUrl = upload.url!;
      } else {
        throw new Error("Unexpected replicate image output format.");
      }
    }
    
    return { success: true, imageUrl, prompt };
  } catch (err: any) {
    const errMsg = err.message || "Failed to generate image.";
    console.error("[FOOD-SEO-V2] Image generation failed:", errMsg);
    return { success: false, error: errMsg };
  }
}

export async function uploadToImgBBAction(
  base64Image: string,
  apiKey: string,
  name?: string
): Promise<{ success: boolean; url?: string; displayUrl?: string; deleteUrl?: string; error?: string }> {
  if (!(await checkRateLimit())) return { success: false, error: "Rate limit exceeded." };
  return uploadToImgBB(base64Image, apiKey, name);
}

export async function publishToWordPressAction(
  options: WordPressPublishOptions
): Promise<{ success: boolean; link?: string; id?: number; error?: string }> {
  if (!(await checkRateLimit())) return { success: false, error: "Rate limit exceeded." };
  return publishToWordPress(options);
}

// ─── Lightweight Image API Key Test ───

export async function testImageApiKey(
  apiKey: string,
  imageProvider: string,
  imageModel: string
): Promise<{ success: boolean; error?: string }> {
  if (!apiKey) return { success: false, error: "No API key provided." };

  try {
    if (imageProvider === "gemini") {
      const testRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "A single red apple on a white background." }] }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"]
            }
          }),
        }
      );
      const testData = await testRes.json();
      if (!testRes.ok) throw new Error(testData?.error?.message ?? `Status ${testRes.status}`);
      const parts = testData?.candidates?.[0]?.content?.parts ?? [];
      const hasImage = parts.some((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
      if (!hasImage) throw new Error(`API responded but returned no image. Parts: ${JSON.stringify(parts.map((p: any) => Object.keys(p)))}`);
      return { success: true };
    } else if (imageProvider === "replicate") {
      // Test by checking the model exists
      const response = await fetch(`https://api.replicate.com/v1/models/${imageModel}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) {
        return { success: false, error: `Replicate API key invalid or model not found (HTTP ${response.status})` };
      }
      return { success: true };
    }
    return { success: false, error: `Unknown image provider: ${imageProvider}` };
  } catch (err: unknown) {
    console.error("testImageApiKey error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: msg };
  }
}
