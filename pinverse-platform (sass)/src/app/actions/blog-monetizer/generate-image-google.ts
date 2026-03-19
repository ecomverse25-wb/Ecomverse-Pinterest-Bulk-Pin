"use server";

import { GoogleGenAI } from "@google/genai";

export async function generateImageWithGoogleImagen({
    prompt,
    geminiApiKey,
    model = "gemini-2.5-flash-image",
    aspectRatio = "9:16",
    imgbbApiKey,
}: {
    prompt: string;
    geminiApiKey: string;
    model?: string;
    aspectRatio?: string;
    imgbbApiKey?: string;
}): Promise<string | null> {
    try {
        console.log("[Imagen] Starting generation with model:", model);
        console.log("[Imagen] Aspect ratio:", aspectRatio);
        console.log("[Imagen] Prompt length:", prompt.length);

        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        // All 3 models use generateContent with IMAGE responseModality
        const response = await ai.models.generateContent({
            model,
            contents: [{
                role: "user",
                parts: [{
                    text: `Generate a tall portrait image (9:16 ratio, taller than wide): ${prompt}. IMPORTANT: The image must be TALL portrait orientation, significantly taller than it is wide, like a Pinterest pin. No text, no watermarks, no people.`
                }]
            }],
            config: {
                responseModalities: ["IMAGE", "TEXT"],
            },
        });

        // Extract image from response parts
        const parts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith("image/")) {
                const base64 = part.inlineData.data;
                if (!base64) continue;

                // Upload to ImgBB if key provided
                if (imgbbApiKey) {
                    try {
                        const formData = new FormData();
                        formData.append("image", base64);
                        const res = await fetch(
                            `https://api.imgbb.com/1/upload?key=${imgbbApiKey}`,
                            { method: "POST", body: formData }
                        );
                        const data = await res.json();
                        if (data.data?.url) return data.data.url;
                    } catch (imgbbError) {
                        console.error("[Imagen] ImgBB upload failed:", imgbbError);
                        // fall through to base64
                    }
                }
                return `data:${part.inlineData.mimeType};base64,${base64}`;
            }
        }

        console.error("[Imagen] No image data in Gemini content response.");
        return null;
    } catch (error: unknown) {
        console.error("[Imagen] FULL ERROR:", error);
        console.error("[Imagen] Error message:", error instanceof Error ? error.message : String(error));
        console.error("[Imagen] Error stack:", error instanceof Error ? error.stack : "no stack");

        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(formatImagenError(msg));
    }
}

function formatImagenError(msg: string): string {
    const lower = msg.toLowerCase();
    if (lower.includes("permission_denied") || lower.includes("billing")) {
        return "⚠️ Google Imagen requires billing enabled on your Google account. Visit aistudio.google.com → Billing, or switch to Replicate.";
    }
    if (lower.includes("resource_exhausted") || lower.includes("quota")) {
        return "⚠️ Google Imagen quota exceeded. Try again later or switch to Replicate for image generation.";
    }
    if (lower.includes("api_key_invalid") || lower.includes("invalid api key")) {
        return "⚠️ Invalid Gemini API key. Please check your key in Setup.";
    }
    return msg; // Instead of "Image generation failed: ${msg}", let's return raw msg so user can see it
}
