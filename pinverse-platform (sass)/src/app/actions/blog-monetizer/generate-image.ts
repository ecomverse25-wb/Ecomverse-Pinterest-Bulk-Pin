"use server";

import { GoogleGenAI } from "@google/genai";
import type { ImageStyle, ImageDimensions, ImageProvider, WritingProvider } from "@/components/blog-monetizer/BlogMonetizer.types";
import { IMAGE_STYLE_SUFFIXES } from "@/components/blog-monetizer/BlogMonetizer.types";
import { generateImageWithGoogleImagen } from "./generate-image-google";

// ─── Dimension → aspect ratio mapping ───

function getDimensionConfig(dimensions: ImageDimensions): { width: number; height: number; ratio: string } {
    switch (dimensions) {
        case '1024x1536': return { width: 1024, height: 1536, ratio: '2:3' };
        case '1536x864': return { width: 1536, height: 864, ratio: '16:9' };
        case '1024x1024': return { width: 1024, height: 1024, ratio: '1:1' };
        default: return { width: 1024, height: 1536, ratio: '2:3' };
    }
}

// ─── Dimension → Google Imagen aspect ratio ───

function getImagenAspectRatio(dimensions: ImageDimensions): "1:1" | "9:16" | "16:9" | "4:3" | "3:4" {
    switch (dimensions) {
        case '1024x1536': return "9:16";
        case '1536x864': return "16:9";
        case '1024x1024': return "1:1";
        default: return "9:16";
    }
}

// ─── Generate Featured Image Prompt via Gemini ───

export async function generateFeaturedImagePromptAction(
    title: string,
    contentSummary: string,
    promptTemplate: string,
    apiKey: string,
    model: string = "gemini-2.5-flash"
): Promise<{ success?: boolean; prompt?: string; error?: string }> {
    if (!apiKey) return { error: "Gemini API key is missing." };

    const filledTemplate = promptTemplate
        .replace(/\{title\}/g, title)
        .replace(/\{content\}/g, contentSummary);

    const systemPrompt = `${filledTemplate}\n\nOutput ONLY an image generation prompt. No explanation. No headers. Just the prompt text. 2-3 sentences max.`;

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ text: systemPrompt }] }
        });

        const text = response.text?.trim();
        if (!text) return { error: "No prompt generated." };

        return { success: true, prompt: text };
    } catch (error: unknown) {
        console.error("Image prompt generation error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { error: msg };
    }
}

// ─── Build Final Image Prompt with Style Suffix ───

function buildFinalPrompt(basePrompt: string, style: ImageStyle, colorMood: string): string {
    let final = basePrompt;

    // Append style suffix
    const suffix = IMAGE_STYLE_SUFFIXES[style];
    if (suffix) {
        final += suffix;
    }

    // Append color mood
    if (colorMood.trim()) {
        final += `, color palette: ${colorMood.trim()}`;
    }

    // Always append global suffix
    final += ", no text, no watermarks, no people, high resolution, Pinterest-worthy, portrait orientation";

    return final;
}

// ─── Generate Image via Replicate (single model) ───

async function generateImageViaReplicate(
    prompt: string,
    replicateKey: string,
    aspectRatio: string,
    imageModel: string = "black-forest-labs/flux-1.1-pro"
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    console.log("[BlogMonetizer] generateImageViaReplicate called", { promptLength: prompt.length, aspectRatio, imageModel });

    if (!replicateKey) {
        console.error("[BlogMonetizer] Replicate API key is empty!");
        return { success: false, error: "Replicate API key is missing." };
    }

    try {
        console.log(`[BlogMonetizer] Using model: ${imageModel}`);
        const response = await fetch(`https://api.replicate.com/v1/models/${imageModel}/predictions`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${replicateKey}`,
                "Content-Type": "application/json",
                "Prefer": "wait",
            },
            body: JSON.stringify({
                input: {
                    prompt,
                    aspect_ratio: aspectRatio,
                    num_outputs: 1,
                },
            }),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => "");
            console.error(`[BlogMonetizer] Model ${imageModel} returned ${response.status}: ${errText}`);
            return { success: false, error: `Image model ${imageModel} failed: ${response.status}` };
        }

        const prediction = await response.json();
        console.log(`[BlogMonetizer] Prediction status: ${prediction.status}, id: ${prediction.id}`);

        // If "Prefer: wait" gave us a completed result
        if (prediction.status === "succeeded" && prediction.output) {
            const imageUrl = Array.isArray(prediction.output)
                ? prediction.output[0]
                : prediction.output;
            console.log(`[BlogMonetizer] Image ready (immediate): ${imageUrl?.slice(0, 80)}...`);
            return { success: true, imageUrl };
        }

        // Poll for result
        const predictionId = prediction.id;
        let attempts = 0;
        const maxAttempts = 90;
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const statusResponse = await fetch(
                `https://api.replicate.com/v1/predictions/${predictionId}`,
                { headers: { "Authorization": `Bearer ${replicateKey}` } }
            );
            const statusData = await statusResponse.json();

            if (statusData.status === "succeeded") {
                const imageUrl = Array.isArray(statusData.output)
                    ? statusData.output[0]
                    : statusData.output;
                console.log(`[BlogMonetizer] Image ready (polled): ${imageUrl?.slice(0, 80)}...`);
                return { success: true, imageUrl };
            }
            if (statusData.status === "failed" || statusData.status === "canceled") {
                console.error(`[BlogMonetizer] Model ${imageModel} prediction ${statusData.status}:`, statusData.error);
                return { success: false, error: `Image prediction ${statusData.status}` };
            }
            attempts++;
        }

        return { success: false, error: "Image generation timed out." };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error("[BlogMonetizer] generateImageViaReplicate error:", msg);
        return { success: false, error: msg };
    }
}

// ─── Upload to ImgBB ───

export async function uploadToImgBBAction(
    imageUrl: string,
    imgbbKey: string
): Promise<{ success?: boolean; url?: string; error?: string }> {
    if (!imgbbKey) return { error: "ImgBB API key is missing." };

    try {
        // Download image
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) return { error: "Failed to download image." };

        const blob = await imgResponse.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const base64 = buffer.toString("base64");

        // Upload to ImgBB
        const formData = new FormData();
        formData.append("key", imgbbKey);
        formData.append("image", base64);

        const uploadResponse = await fetch("https://api.imgbb.com/1/upload", {
            method: "POST",
            body: formData,
        });

        if (!uploadResponse.ok) {
            return { error: "ImgBB upload failed." };
        }

        const data = await uploadResponse.json();
        if (data.success && data.data?.url) {
            return { success: true, url: data.data.url };
        }
        return { error: "ImgBB response invalid." };
    } catch (error: unknown) {
        console.error("ImgBB upload error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { error: msg };
    }
}

// ─── Generate Featured Image (Full Flow) ───

export async function generateFeaturedImageAction(
    title: string,
    contentSummary: string,
    promptTemplate: string,
    style: ImageStyle,
    colorMood: string,
    dimensions: ImageDimensions,
    geminiKey: string,
    replicateKey: string,
    imgbbKey: string,
    geminiModel: string = "gemini-2.5-flash",
    imageProvider: ImageProvider = "replicate",
    imageModel?: string,
    writingProvider?: WritingProvider,
): Promise<{ success?: boolean; imageUrl?: string; prompt?: string; error?: string }> {
    console.log("[BlogMonetizer] generateFeaturedImageAction called", {
        title, style, dimensions, imageProvider, imageModel,
        hasGeminiKey: !!geminiKey, hasReplicateKey: !!replicateKey, hasImgbbKey: !!imgbbKey,
    });

    // Phase 1: Get prompt from Gemini (always uses Gemini for prompt generation)
    // If writing provider is Google or we have a Gemini key, use it for prompt gen
    const promptGenKey = geminiKey;
    if (!promptGenKey) {
        return { error: "Gemini API key is required for image prompt generation." };
    }

    const promptResult = await generateFeaturedImagePromptAction(
        title, contentSummary, promptTemplate, promptGenKey, geminiModel
    );
    if (!promptResult.success || !promptResult.prompt) {
        return { error: promptResult.error || "Failed to generate image prompt." };
    }

    // Phase 2: Build final prompt with style suffix
    const finalPrompt = buildFinalPrompt(promptResult.prompt, style, colorMood);

    // Phase 3: Generate image based on provider
    if (imageProvider === "google-imagen") {
        const imagenAR = getImagenAspectRatio(dimensions);
        const model = imageModel || "imagen-3.0-generate-002";
        try {
            const imageUrl = await generateImageWithGoogleImagen({
                prompt: finalPrompt,
                geminiApiKey: geminiKey,
                model,
                aspectRatio: imagenAR,
                imgbbApiKey: imgbbKey || undefined,
            });
            if (!imageUrl) {
                return { error: "Google Imagen returned no image." };
            }
            return { success: true, imageUrl, prompt: finalPrompt };
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Google Imagen error";
            return { error: msg };
        }
    } else {
        // Replicate
        const dimConfig = getDimensionConfig(dimensions);
        const model = imageModel || "black-forest-labs/flux-1.1-pro";
        const imgResult = await generateImageViaReplicate(finalPrompt, replicateKey, dimConfig.ratio, model);
        if (!imgResult.success || !imgResult.imageUrl) {
            return { error: imgResult.error || "Image generation failed." };
        }

        // Phase 4: Upload to ImgBB for permanent URL
        if (imgbbKey) {
            const uploadResult = await uploadToImgBBAction(imgResult.imageUrl, imgbbKey);
            if (uploadResult.success && uploadResult.url) {
                return { success: true, imageUrl: uploadResult.url, prompt: finalPrompt };
            }
        }

        // Return Replicate URL if ImgBB fails/unavailable
        return { success: true, imageUrl: imgResult.imageUrl, prompt: finalPrompt };
    }
}

// ─── Generate H2 Section Image ───

export async function generateH2ImageAction(
    h2Topic: string,
    niche: string,
    replicateKey: string,
    imgbbKey: string,
    imageProvider: ImageProvider = "replicate",
    imageModel?: string,
    geminiKey?: string,
    dimensions: ImageDimensions = "1024x1536",
): Promise<{ success?: boolean; imageUrl?: string; error?: string }> {
    console.log("[BlogMonetizer] generateH2ImageAction called", { h2Topic, niche, imageProvider, imageModel });

    const prompt = `High quality lifestyle photography, ${h2Topic}, ${niche} blog style, bright natural lighting, clean aesthetic, visually appealing, no text overlay, professional editorial photography, Pinterest-worthy composition, portrait orientation, no text, no watermarks, no people, high resolution`;

    if (imageProvider === "google-imagen") {
        if (!geminiKey) return { error: "Gemini API key is required for Google Imagen." };
        const imagenAR = getImagenAspectRatio(dimensions);
        const model = imageModel || "imagen-3.0-generate-002";
        try {
            const imageUrl = await generateImageWithGoogleImagen({
                prompt,
                geminiApiKey: geminiKey,
                model,
                aspectRatio: imagenAR,
                imgbbApiKey: imgbbKey || undefined,
            });
            if (!imageUrl) {
                return { error: "Google Imagen returned no image for section." };
            }
            return { success: true, imageUrl };
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Google Imagen section error";
            return { error: msg };
        }
    } else {
        // Replicate
        if (!replicateKey) return { error: "Replicate API key is missing." };
        const model = imageModel || "black-forest-labs/flux-1.1-pro";
        const result = await generateImageViaReplicate(prompt, replicateKey, "2:3", model);
        if (!result.success || !result.imageUrl) {
            return { error: result.error || "Section image generation failed." };
        }

        // Upload to ImgBB
        if (imgbbKey) {
            const uploadResult = await uploadToImgBBAction(result.imageUrl, imgbbKey);
            if (uploadResult.success && uploadResult.url) {
                return { success: true, imageUrl: uploadResult.url };
            }
        }

        return { success: true, imageUrl: result.imageUrl };
    }
}
