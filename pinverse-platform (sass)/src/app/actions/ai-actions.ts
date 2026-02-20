"use server";

import { GoogleGenAI } from "@google/genai";
import { GeneratedTextResponse, PinConfig } from "@/lib/types";

// We re-implement or wrap the logic from geminiService here for Server Side usage.
// Note: GoogleGenAI SDK works in Node environment.

export async function generateArticleAction(prompt: string, apiKey: string, model: string = "gemini-2.0-flash") {
    if (!apiKey) {
        return { error: "API Key is missing." };
    }

    // Normalize model name - ensure it's a valid current model
    const normalizedModel = model.includes("1.5") ? "gemini-2.0-flash" : model;

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

// We can add the sophisticated Pin Details generation here too if needed later,
// using the same pattern.
