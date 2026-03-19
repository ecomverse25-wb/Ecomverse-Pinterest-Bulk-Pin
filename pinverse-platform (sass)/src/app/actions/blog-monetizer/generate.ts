"use server";

import { GoogleGenAI } from "@google/genai";
import type { Tone, ArticleLength, H2Count, AffiliateLink, WritingProvider } from "@/components/blog-monetizer/BlogMonetizer.types";
import { generateWithClaude } from "./generate-claude";
import { generateWithOpenAI } from "./generate-openai";

// ─── Replicate Text Generation ───

async function generateWithReplicate(prompt: string, replicateApiKey: string, model: string): Promise<string> {
    const response = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${replicateApiKey}`,
            "Content-Type": "application/json",
            "Prefer": "wait",
        },
        body: JSON.stringify({
            input: { prompt },
        }),
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(`Replicate API error ${response.status}: ${errText}`);
    }

    const prediction = await response.json();

    if (prediction.status === "succeeded" && prediction.output) {
        const output = Array.isArray(prediction.output) ? prediction.output.join("") : prediction.output;
        return output;
    }

    // Poll for result
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
            const output = Array.isArray(statusData.output) ? statusData.output.join("") : statusData.output;
            return output;
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
    geminiApiKey?: string;
    anthropicApiKey?: string;
    openaiApiKey?: string;
    replicateApiKey?: string;
}

async function generateTextWithProvider(prompt: string, config: ProviderConfig): Promise<string> {
    switch (config.writingProvider) {
        case "google": {
            if (!config.geminiApiKey) throw new Error("Gemini API key is missing.");
            const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
            const response = await ai.models.generateContent({
                model: config.writingModel,
                contents: { parts: [{ text: prompt }] },
            });
            const text = response.text?.trim();
            if (!text) throw new Error("No response from AI.");
            return text;
        }
        case "claude": {
            if (!config.anthropicApiKey) throw new Error("Anthropic API key is missing.");
            return generateWithClaude({
                prompt,
                anthropicApiKey: config.anthropicApiKey,
                model: config.writingModel,
            });
        }
        case "openai": {
            if (!config.openaiApiKey) throw new Error("OpenAI API key is missing.");
            return generateWithOpenAI({
                prompt,
                openaiApiKey: config.openaiApiKey,
                model: config.writingModel,
            });
        }
        case "replicate": {
            if (!config.replicateApiKey) throw new Error("Replicate API key is missing.");
            return generateWithReplicate(prompt, config.replicateApiKey, config.writingModel);
        }
        default:
            throw new Error(`Unknown writing provider: ${config.writingProvider}`);
    }
}

// ─── Generate Bulk Titles (one API call) ───

function sanitizeArticleTitle(title: string): string {
    // Remove any year pattern (4 digit years 2020-2035)
    return title.replace(/\b(202[0-9]|203[0-5])\b/g, "").trim()
        // Clean up any double spaces left after year removal
        .replace(/\s+/g, " ")
        // Clean up trailing punctuation artifacts
        .replace(/[,\s]+$/, "")
        .trim();
}

function validateTitleNumber(title: string, h2Count: number): string {
    // Find any number in the title
    const numberMatch = title.match(/\b(\d+)\b/);
    if (!numberMatch) return title; // no number, fine as-is

    const titleNumber = parseInt(numberMatch[1]);

    // If title number doesn't match H2 count, fix it
    if (titleNumber !== h2Count) {
        console.log(`[TITLE] Fixing title number: ${titleNumber} → ${h2Count} in "${title}"`);
        return title.replace(/\b\d+\b/, h2Count.toString());
    }

    return title;
}

export async function generateBulkTitlesAction(
    keywords: string[],
    tone: Tone,
    niche: string,
    apiKey: string,
    model: string = "gemini-2.5-flash",
    writingProvider: WritingProvider = "google",
    anthropicApiKey?: string,
    openaiApiKey?: string,
    replicateApiKey?: string
): Promise<{ success?: boolean; titles?: { keyword: string; title: string }[]; error?: string }> {
    if (keywords.length === 0) return { error: "No keywords provided." };

    const keywordsList = keywords.map((k, i) => `${i + 1}. ${k}`).join("\n");

    const prompt = `For each keyword below, generate one compelling blog article title.
Rules:
- Title must include or strongly relate to the keyword
- Use power words: "Ultimate", "Genius", "Proven", "Surprising", "Essential", numbers like "7 Ways", "5 Ideas"
- Title must be click-worthy for Pinterest and Google
- Max 70 characters per title
- Match tone: ${tone}
- Match niche: ${niche}

STRICT TITLE RULES:
✅ DO: Start with the main keyword or a number
✅ DO: Use power words: Best, Essential, Genius, Ultimate, Proven, Simple, Complete, Perfect, Easy, Smart
✅ DO: Include a benefit or promise in the title
✅ DO: Keep it 50-70 characters

❌ DO NOT: Include any year numbers (2024, 2025, 2026, etc.)
❌ DO NOT: Use the keyword alone as the full title
❌ DO NOT: Use clickbait or exaggerated claims
❌ DO NOT: Start with "The" every time — vary the structure

GOOD title examples:
  "7 Best Wood Kitchenware Pieces Every Home Cook Needs"
  "Wood Kitchenware: The Complete Buyer's Guide"
  "How to Choose Wood Kitchenware That Lasts a Lifetime"
  "5 Reasons Wood Kitchenware Beats Plastic Every Time"
  "Wood Kitchenware Essentials for a Better Kitchen"

BAD title examples (never generate these):
  "Wood Kitchenware" ← raw keyword only
  "Best Wood Kitchenware in 2026" ← contains year
  "Top Wood Kitchenware Products 2025" ← contains year
  "Wood Kitchenware Guide 2026" ← contains year

Keywords:
${keywordsList}

Return JSON array only, no markdown, no code fences:
[
  { "keyword": "example keyword", "title": "Generated Title Here" }
]`;

    try {
        const config: ProviderConfig = {
            writingProvider,
            writingModel: model,
            geminiApiKey: apiKey,
            anthropicApiKey,
            openaiApiKey,
            replicateApiKey,
        };
        const text = await generateTextWithProvider(prompt, config);
        const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        const sanitizedTitles = parsed.map((item: any) => ({
            ...item,
            title: sanitizeArticleTitle(item.title)
        }));
        return { success: true, titles: sanitizedTitles };
    } catch (error: unknown) {
        console.error("Bulk title generation error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { error: msg };
    }
}

// ─── Generate Single Title ───

export async function generateSingleTitleAction(
    keyword: string,
    tone: Tone,
    niche: string,
    apiKey: string,
    model: string = "gemini-2.5-flash",
    writingProvider: WritingProvider = "google",
    anthropicApiKey?: string,
    openaiApiKey?: string,
    replicateApiKey?: string
): Promise<{ success?: boolean; title?: string; error?: string }> {
    const result = await generateBulkTitlesAction(
        [keyword], tone, niche, apiKey, model,
        writingProvider, anthropicApiKey, openaiApiKey, replicateApiKey
    );
    if (result.success && result.titles && result.titles.length > 0) {
        return { success: true, title: result.titles[0].title };
    }
    return { error: result.error || "Failed to generate title." };
}

// ─── Generate Full Article ───

const WORD_TARGETS: Record<ArticleLength, number> = {
    short: 800,
    standard: 1500,
    long: 2500,
};

export async function generateBlogArticleAction(
    title: string,
    keyword: string,
    niche: string,
    tone: Tone,
    articleLength: ArticleLength,
    h2Count: H2Count,
    apiKey: string,
    model: string = "gemini-2.5-flash",
    writingProvider: WritingProvider = "google",
    anthropicApiKey?: string,
    openaiApiKey?: string,
    replicateApiKey?: string
): Promise<{ success?: boolean; content?: string; title?: string; metaDescription?: string; wordCount?: number; error?: string }> {
    const wordTarget = WORD_TARGETS[articleLength];

    const prompt = `You are an expert SEO blog writer.

STEP 1 - TITLE: First, generate a compelling SEO title.
Output it on the very first line in this exact format:
##TITLE##Your SEO Title Here##TITLE##

Title rules:
- 50-70 characters
- Contains keyword "${keyword}" naturally  
- NOT just the keyword alone
- NO years (2024/2025/2026 etc.)
- Use formats: "X Best...", "How to...", "The Complete Guide to...", 
  "X Reasons...", "X Ways..."

CRITICAL TITLE RULE — NUMBER CONSISTENCY:
The user has configured exactly ${h2Count} H2 sections.
If your title includes a number, it MUST match ${h2Count}.

Examples for h2Sections = ${h2Count}:
✅ "${h2Count} Best ${keyword} Ideas to Maximize Your Home"
✅ "${h2Count} Genius Ways to ${keyword}"
✅ "${keyword}: ${h2Count} Expert Tips That Work"
❌ "15 Best ${keyword}" ← WRONG number
❌ "10 Ways to..." ← WRONG number

If you use a number in the title, use EXACTLY ${h2Count}.
If you don't want to use a number, use a non-numeric format:
"The Complete Guide to ${keyword}"
"How to Maximize Every Inch of Your Small Space"

STEP 2 - ARTICLE: Then write the full article.
Start the article body with <h1>Your SEO Title Here</h1>
(use the SAME title from STEP 1)

Keyword: ${keyword}
Niche: ${niche}
Tone: ${tone}
Length: ${articleLength}
WORD COUNT TARGET: ~${wordTarget} words
NUMBER OF H2 SECTIONS: ${h2Count}

Write this article as an experienced human blogger with genuine personal opinions and first-hand perspective.

Rules:
- Vary sentence length dramatically (mix very short and long sentences)
- Include personal opinions naturally: "In my experience...", "Honestly,", "Here's what most articles won't tell you:"
- Use conversational transitions: "Now here's the thing.", "Let me explain.", "You might be wondering..."
- Include specific numbers, real examples, relatable scenarios
- Avoid: bullet points with identical structure, repetitive sentence starters, formal academic phrases, overuse of em-dashes
- Write with personality — reader should feel this is a real person's blog
- Do NOT start multiple paragraphs with "I"
- Each H2 section must feel structurally different from others — mix long paragraphs, short punchy paragraphs, lists, Q&A style
- Natural keyword density 1.5–2.5%, never forced

REQUIRED STRUCTURE:
1. Start with <h1>Your SEO Title Here</h1>
2. Opening paragraph (~100 words) — engaging, immediately useful
3. You must write EXACTLY ${h2Count} H2 sections (not counting the FAQ H2) with varied engaging subheadings using <h2> tags.
   No more, no less. Each H2 must be a distinct idea/tip.
   The article introduction must NOT promise more ideas than ${h2Count}.
   If title says "${h2Count} ideas", the intro must say "${h2Count} ideas" and there must be exactly ${h2Count} H2s.
   Count your H2 sections before finishing. Double check.
4. After every 2 H2 sections, insert this exact HTML comment on its own line:
   <!-- AD UNIT: Display Ad (300x250 or 728x90) -->
5. End with an FAQ section containing 3 relevant questions in this format:
   <h2>Frequently Asked Questions</h2>
   Then 3 questions using <h3> for questions and <p> for answers

Also generate a meta description (150-160 characters) that includes the keyword.

OUTPUT FORMAT — Return valid HTML only (no markdown). At the very end, on a new line, add:
META_DESCRIPTION: [your meta description here]

Do NOT wrap in code fences. Do NOT include <html>, <head>, or <body> tags. Just the article content HTML.`;

    try {
        const config: ProviderConfig = {
            writingProvider,
            writingModel: model,
            geminiApiKey: apiKey,
            anthropicApiKey,
            openaiApiKey,
            replicateApiKey,
        };
        let text = await generateTextWithProvider(prompt, config);

        // Strip code fences if present
        text = text.replace(/```html\s*/gi, "").replace(/```/g, "").trim();

        // Extract meta description
        let metaDescription = "";
        const metaMatch = text.match(/META_DESCRIPTION:\s*(.+)/i);
        if (metaMatch) {
            metaDescription = metaMatch[1].trim();
            text = text.replace(/META_DESCRIPTION:\s*.+/i, "").trim();
        }

        let articleTitle = keyword; // default fallback
        let articleContent = text;

        // Extract title from ##TITLE## markers
        const titleMatch = text.match(/##TITLE##(.+?)##TITLE##/);
        if (titleMatch) {
            articleTitle = titleMatch[1]
                .trim()
                .replace(/\b(202[0-9]|203[0-5])\b/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            // Remove the ##TITLE## line from article content
            articleContent = text
                .replace(/##TITLE##.+?##TITLE##\n?/, '')
                .trim();
        }

        // Final validation — if title === keyword, force generate one
        if (articleTitle.toLowerCase() === keyword.toLowerCase()) {
            articleTitle = `The Complete Guide to ${keyword}`;
        }

        // Validate title number matches H2 count
        articleTitle = validateTitleNumber(articleTitle, h2Count);

        console.log(`[TITLE] Extracted SEO title: "${articleTitle}" for keyword: "${keyword}"`);

        // Count words
        const wordCount = articleContent.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;

        return { success: true, content: articleContent, title: articleTitle, metaDescription, wordCount };
    } catch (error: unknown) {
        console.error("Article generation error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { error: msg };
    }
}

// ─── Match Affiliate Links to H2 Sections ───

export async function matchAffiliateLinksAction(
    articleHtml: string,
    affiliateLinks: AffiliateLink[],
    apiKey: string,
    model: string = "gemini-2.5-flash",
    writingProvider: WritingProvider = "google",
    anthropicApiKey?: string,
    openaiApiKey?: string,
    replicateApiKey?: string
): Promise<{ success?: boolean; injectedHtml?: string; error?: string }> {
    if (affiliateLinks.length === 0) return { success: true, injectedHtml: articleHtml };

    // Extract H2 sections
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    const h2Sections: { heading: string; index: number }[] = [];
    let match;
    while ((match = h2Regex.exec(articleHtml)) !== null) {
        h2Sections.push({ heading: match[1].replace(/<[^>]*>/g, ""), index: h2Sections.length });
    }

    if (h2Sections.length === 0) return { success: true, injectedHtml: articleHtml };

    const sectionsText = h2Sections.map((s, i) => `${i + 1}. "${s.heading}"`).join("\n");
    const productsText = affiliateLinks.map((a, i) => `${i + 1}. "${a.productName}" → ${a.url}`).join("\n");

    const prompt = `Match affiliate products to article sections. Only match if GENUINELY relevant.

Sections:
${sectionsText}

Products:
${productsText}

Return JSON array only, no markdown:
[
  { "sectionIndex": 0, "productIndex": 0, "confidence": "high", "inlineText": "a short compelling sentence mentioning the product naturally" },
  { "sectionIndex": 1, "productIndex": null, "confidence": "none", "inlineText": "" }
]

Only return "high" or "medium" confidence matches. For "low" or "none", set productIndex to null.
IMPORTANT: Return ONLY the raw JSON array.`;

    try {
        const config: ProviderConfig = {
            writingProvider,
            writingModel: model,
            geminiApiKey: apiKey,
            anthropicApiKey,
            openaiApiKey,
            replicateApiKey,
        };
        const text = await generateTextWithProvider(prompt, config);

        const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
        const matches: Array<{ sectionIndex: number; productIndex: number | null; confidence: string; inlineText: string }> = JSON.parse(cleaned);

        // Inject affiliate links into HTML
        let result = articleHtml;
        // Process in reverse order to preserve indices
        const validMatches = matches
            .filter(m => m.productIndex !== null && (m.confidence === "high" || m.confidence === "medium"))
            .sort((a, b) => b.sectionIndex - a.sectionIndex);

        // Find all H2 closing tag positions
        const h2CloseRegex = /<\/h2>/gi;
        const h2Positions: number[] = [];
        let closeMatch;
        while ((closeMatch = h2CloseRegex.exec(result)) !== null) {
            h2Positions.push(closeMatch.index + closeMatch[0].length);
        }

        for (const m of validMatches) {
            if (m.productIndex === null) continue;
            const affiliate = affiliateLinks[m.productIndex];
            if (!affiliate) continue;

            // Find the end of the section (next H2 or end of content)
            const sectionStart = h2Positions[m.sectionIndex];
            if (sectionStart === undefined) continue;

            const nextSectionStart = h2Positions[m.sectionIndex + 1];
            const sectionEnd = nextSectionStart || result.length;

            // Build CTA box
            const ctaBox = `
<div style="background:#1e2a3a;border-left:3px solid #f0c040;border-radius:8px;padding:16px;margin:16px 0;">
  <p style="margin:0 0 4px 0;font-weight:bold;color:#e2e8f0;">🔗 <a href="${affiliate.url}" rel="nofollow sponsored" target="_blank" style="color:#f0c040;text-decoration:none;">${affiliate.productName}</a></p>
  <p style="margin:0 0 8px 0;color:#94a3b8;font-size:14px;">${m.inlineText || 'Check this out for your project!'}</p>
  <a href="${affiliate.url}" rel="nofollow sponsored" target="_blank" style="color:#f0c040;font-size:14px;font-weight:bold;text-decoration:none;">Check it out →</a>
</div>`;

            // Insert CTA box before the next H2 or at the end
            result = result.slice(0, sectionEnd) + ctaBox + result.slice(sectionEnd);

            // Also inject inline link in the first paragraph of the section
            if (m.inlineText) {
                const sectionContent = result.slice(sectionStart, sectionEnd);
                const firstParagraphEnd = sectionContent.indexOf("</p>");
                if (firstParagraphEnd !== -1) {
                    const inlineLink = ` <a href="${affiliate.url}" rel="nofollow sponsored" target="_blank" style="color:#f0c040;">${affiliate.productName}</a>`;
                    const insertPos = sectionStart + firstParagraphEnd;
                    result = result.slice(0, insertPos) + inlineLink + result.slice(insertPos);
                }
            }
        }

        return { success: true, injectedHtml: result };
    } catch (error: unknown) {
        console.error("Affiliate matching error:", error);
        // Return original HTML on error — don't break the article
        return { success: true, injectedHtml: articleHtml };
    }
}

// ─── WordPress Publishing ───

export async function publishBlogToWPAction(
    title: string,
    content: string,
    featuredImageUrl: string | undefined,
    wpUrl: string,
    wpUser: string,
    wpPassword: string
): Promise<{ success?: boolean; link?: string; id?: number; error?: string }> {
    if (!wpUrl || !wpUser || !wpPassword) return { error: "Missing WordPress credentials." };

    try {
        const auth = btoa(`${wpUser}:${wpPassword}`);
        const baseUrl = wpUrl.replace(/\/$/, "");

        let featuredMediaId: number | undefined;

        // Upload featured image if provided
        if (featuredImageUrl) {
            try {
                const imgResponse = await fetch(featuredImageUrl);
                const imgBlob = await imgResponse.blob();
                const imgBuffer = Buffer.from(await imgBlob.arrayBuffer());
                const fileName = `featured-${Date.now()}.jpg`;

                const uploadResponse = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Basic ${auth}`,
                        "Content-Disposition": `attachment; filename="${fileName}"`,
                        "Content-Type": "image/jpeg",
                    },
                    body: imgBuffer,
                });

                if (uploadResponse.ok) {
                    const mediaData = await uploadResponse.json();
                    featuredMediaId = mediaData.id;
                }
            } catch (imgErr) {
                console.error("Featured image upload failed:", imgErr);
                // Continue without featured image
            }
        }

        const postData: Record<string, unknown> = {
            title,
            content,
            status: "draft",
        };
        if (featuredMediaId) {
            postData.featured_media = featuredMediaId;
        }

        const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${auth}`,
            },
            body: JSON.stringify(postData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WordPress API Error: ${response.status} — ${errorText}`);
        }

        const data = await response.json();
        return { success: true, link: data.link, id: data.id };
    } catch (error: unknown) {
        console.error("WP publish error:", error);
        const msg = error instanceof Error ? error.message : "Failed to publish.";
        return { error: msg };
    }
}
