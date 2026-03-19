"use server";

import { GoogleGenAI } from "@google/genai";
import type { WritingProvider } from "@/components/blog-monetizer/BlogMonetizer.types";
import { generateWithClaude } from "@/app/actions/blog-monetizer/generate-claude";
import { generateWithOpenAI } from "@/app/actions/blog-monetizer/generate-openai";
import { checkRateLimit } from "./generate";

// ─── Provider Router (local copy) ───

async function generateTextWithProvider(prompt: string, config: {
    writingProvider: WritingProvider;
    writingModel: string;
}): Promise<string> {
    switch (config.writingProvider) {
        case "google": {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error("Gemini configuration error.");
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
            const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
            if (!anthropicApiKey) throw new Error("Anthropic configuration error.");
            return generateWithClaude({ prompt, anthropicApiKey, model: config.writingModel });
        }
        case "openai": {
            const openaiApiKey = process.env.OPENAI_API_KEY;
            if (!openaiApiKey) throw new Error("OpenAI configuration error.");
            return generateWithOpenAI({ prompt, openaiApiKey, model: config.writingModel });
        }
        case "replicate": {
            const replicateApiKey = process.env.REPLICATE_API_KEY;
            if (!replicateApiKey) throw new Error("Replicate configuration error.");
            const response = await fetch(`https://api.replicate.com/v1/models/${config.writingModel}/predictions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${replicateApiKey}`,
                    "Content-Type": "application/json",
                    "Prefer": "wait",
                },
                body: JSON.stringify({ input: { prompt } }),
            });
            if (!response.ok) throw new Error(`Replicate error ${response.status}`);
            const prediction = await response.json();
            if (prediction.status === "succeeded" && prediction.output) {
                return Array.isArray(prediction.output) ? prediction.output.join("") : prediction.output;
            }
            throw new Error("Replicate prediction incomplete");
        }
        default:
            throw new Error(`Unknown provider: ${config.writingProvider}`);
    }
}

// ─── Generate Pin Text for Food Articles ───

export interface FoodPinVariation {
    variationNumber: number;
    label: string;
    pinTitle: string;
    pinDescription: string;
}

export async function generateFoodPinVariationsAction(
    keyword: string,
    articleTitle: string,
    niche: string,
    geminiModel: string = "gemini-2.5-flash",
    writingProvider: WritingProvider = "google"
): Promise<{ success?: boolean; variations?: FoodPinVariation[]; error?: string }> {
    if (!(await checkRateLimit())) return { error: "Rate limit exceeded. Please try again later." };
    keyword = keyword.substring(0, 200).trim();
    articleTitle = articleTitle.substring(0, 200).trim();
    niche = niche.substring(0, 100).trim();
    const prompt = `Generate 3 Pinterest pin variations for this food article.

Article Title: "${articleTitle}"
Target Keyword: "${keyword}"
Niche: ${niche}

VARIATION #1 — "Featured" ⭐ (Listicle-forward):
Pin Title Formula: "${keyword}: [Number] [Adjective] Ideas You'll Love"
- Max 100 characters
- Must start with the keyword
- Emotionally compelling

VARIATION #2 — "How-To" style:
Pin Title Formula: "How to [keyword-related action] — [Quick Benefit]"
- Max 100 characters
- Action-oriented
- Include a time or ease benefit

VARIATION #3 — "Curiosity" style:
Pin Title Formula: "[Number] [keyword] That Will [Surprising Outcome]"
- Max 100 characters
- Create curiosity gap
- Emotionally compelling

For ALL variations, generate a Pin Description:
- 400-500 characters
- Include focus keyword "${keyword}" 2-3 times naturally
- Include one clear benefit statement
- End with: "Save this for later! #${keyword.replace(/\s+/g, '')} #${niche.replace(/\s+/g, '')} #food"
- Conversational, inviting tone

Return JSON array only, no markdown, no code fences:
[
  {
    "variationNumber": 1,
    "label": "Featured ⭐",
    "pinTitle": "...",
    "pinDescription": "..."
  },
  {
    "variationNumber": 2,
    "label": "How-To",
    "pinTitle": "...",
    "pinDescription": "..."
  },
  {
    "variationNumber": 3,
    "label": "Curiosity",
    "pinTitle": "...",
    "pinDescription": "..."
  }
]`;

    try {
        const text = await generateTextWithProvider(prompt, {
            writingProvider,
            writingModel: geminiModel,
        });

        const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
        const variations: FoodPinVariation[] = JSON.parse(cleaned);

        // Validate and trim
        const validated = variations.map(v => ({
            ...v,
            pinTitle: v.pinTitle.slice(0, 100),
            pinDescription: v.pinDescription.slice(0, 500),
        }));

        return { success: true, variations: validated };
    } catch (error: unknown) {
        console.error("Food pin variation generation error:", error);
        return { error: "Failed to generate pin variations. Try again later." };
    }
}
