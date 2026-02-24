"use server";

import { GoogleGenAI } from "@google/genai";
import { GeneratedTextResponse, PinConfig } from "@/lib/types";

// We re-implement or wrap the logic from geminiService here for Server Side usage.
// Note: GoogleGenAI SDK works in Node environment.

export async function generateArticleAction(prompt: string, apiKey: string, model: string = "gemini-2.5-flash") {
    if (!apiKey) {
        return { error: "API Key is missing." };
    }

    // Use the model as-is — all deprecated models have been removed from the UI
    const normalizedModel = model;

    try {
        const ai = new GoogleGenAI({ apiKey });
        // Handle "Gemini 2.0" naming if needed, or pass through. 
        // Note: Google SDK might need specific mapping, but usually "gemini-1.5-flash" works.
        const response = await ai.models.generateContent({
            model: normalizedModel,
            contents: { parts: [{ text: prompt }] }
        });

        if (response.text) {
            // Track usage (fire and forget)
            (async () => {
                try {
                    // Dynamic import to avoid circular dep issues if any, or just keeping cleanly separated
                    const { createClient } = await import("@/lib/supabase-server");
                    const supabase = await createClient();
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { trackUserAction } = await import("./tracking-actions");
                        await trackUserAction(user.id, 'api_call', `Generated article with AI`, { model: normalizedModel });
                    }
                } catch (err) {
                    console.error("Tracking failed inside AI action:", err);
                }
            })();

            return { success: true, content: response.text };
        }
        return { error: "No content generated." };
    } catch (error: any) {
        console.error("Server Action Error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { error: msg };
    }
}

// --- AI-powered product-to-section matching ---

export interface SectionInfo {
    heading: string;
    description: string;
}

export interface ProductMatchResult {
    sectionIndex: number;
    productIndex: number | null;
    confidence: "high" | "medium" | "low" | "none";
}

export async function matchProductsToSectionsAction(
    articleTitle: string,
    targetKeyword: string,
    sections: SectionInfo[],
    productNames: string[],
    apiKey: string,
    model: string = "gemini-2.5-flash"
): Promise<{ success?: boolean; matches?: ProductMatchResult[]; error?: string }> {
    if (!apiKey) return { error: "API Key is missing." };
    if (sections.length === 0) return { success: true, matches: [] };
    if (productNames.length === 0) {
        // No products at all — return null for every section
        return {
            success: true,
            matches: sections.map((_, i) => ({ sectionIndex: i, productIndex: null, confidence: "none" as const }))
        };
    }

    const limitedProducts = productNames.slice(0, 100);

    const sectionsText = sections
        .map((s, i) => `${i + 1}. H2: "${s.heading}" | Description: "${s.description.slice(0, 200)}"`)
        .join("\n");

    const productsText = limitedProducts
        .map((name, i) => `${i + 1}. "${name}"`)
        .join("\n");

    const prompt = `You are a product matcher. Given a list of products and a list of article sections, find the best matching product for each section.
Only match a product if it is GENUINELY relevant to the section topic.
If no product is relevant, return null for that section.

Article title: ${articleTitle}
Article keyword: ${targetKeyword}

Sections:
${sectionsText}

Products (first ${limitedProducts.length} only):
${productsText}

Return JSON array only, one entry per section:
[
  { "sectionIndex": 0, "productIndex": 5, "confidence": "high" },
  { "sectionIndex": 1, "productIndex": null, "confidence": "none" },
  ...
]
confidence: "high" = clearly relevant, "medium" = somewhat relevant, "low" = loose match, "none" = no match (return null productIndex)
Only return "high" or "medium" confidence matches. For "low" or "none", set productIndex to null.

IMPORTANT: Return ONLY the raw JSON array. No markdown, no code fences, no explanation.`;

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: prompt }] }
        });

        const text = response.text?.trim();
        if (!text) return { error: "No response from AI for product matching." };

        // Parse JSON — strip any accidental code fences
        const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
        const parsed: ProductMatchResult[] = JSON.parse(cleaned);

        // Enforce: low/none → null productIndex
        const sanitized = parsed.map((m) => ({
            sectionIndex: m.sectionIndex,
            productIndex: (m.confidence === "high" || m.confidence === "medium") ? m.productIndex : null,
            confidence: m.confidence,
        }));

        return { success: true, matches: sanitized };
    } catch (error: any) {
        console.error("Product matching AI error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { error: msg };
    }
}
