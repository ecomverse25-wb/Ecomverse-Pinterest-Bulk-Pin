'use server';

/**
 * Enhanced Gemini Service - Latest Models
 */

export const GEMINI_CONTENT_MODELS = {
    'gemini-3-flash-preview': {
        name: 'Gemini 3 Flash (Latest)',
        description: 'Frontier-class fast generation',
        speed: 'fast',
        quality: 'excellent',
    },
    'gemini-2.5-flash': {
        name: 'Gemini 2.5 Flash (Stable)',
        description: 'Production-ready, balanced',
        speed: 'fast',
        quality: 'excellent',
    },
    'gemini-2.5-pro': {
        name: 'Gemini 2.5 Pro',
        description: 'Highest quality with thinking',
        speed: 'medium',
        quality: 'best',
    },
} as const;

export const GEMINI_IMAGE_MODELS = {
    'gemini-3-pro-image-preview': {
        name: 'Gemini 3 Pro Image (Nano Banana)',
        description: 'Latest iteration, best quality',
        speed: 'medium',
        quality: 'excellent',
    },
    'imagen-4-fast': {
        name: 'Imagen 4 Fast',
        description: 'Speed optimized',
        speed: 'fast',
        quality: 'good',
    },
    'imagen-4-standard': {
        name: 'Imagen 4 Standard',
        description: 'Balanced quality',
        speed: 'medium',
        quality: 'excellent',
    },
} as const;

interface ContentGenerationResult {
    success: boolean;
    title?: string;
    description?: string;
    error?: string;
    model?: string;
    cost?: number;
}

export async function generatePinterestContent(
    url: string,
    keywords: string,
    apiKey: string,
    model: keyof typeof GEMINI_CONTENT_MODELS = 'gemini-2.5-flash',
    customPrompt?: string
): Promise<ContentGenerationResult> {
    const prompt = customPrompt || `
You're a Pinterest content writer optimizing blog posts for maximum search visibility and clicks.

Blog post URL: ${url}
Main keywords: ${keywords}

Generate:
1. A Pinterest title (under 80 characters) that starts with an emoji and includes the main keyword
2. A Pinterest description (EXACTLY 3 sentences, NO MORE) that clearly summarizes the post

Format your response EXACTLY like this:

🍫 Cherry Clafoutis – The Dessert That Makes You Feel Like a French Pastry Chef

This **cherry clafoutis** is packed with **plant-based ingredients**, quinoa, and roasted vegetables. Perfect for **meal prep** or a quick **healthy lunch**. Customizable, colorful, and delicious!

Generate now:
`;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500,
                    },
                }),
            }
        );

        if (!response.ok) {
            return { success: false, error: 'Failed to generate content' };
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;

        const lines = generatedText.trim().split('\n').filter((l: string) => l.trim());
        const title = lines[0].trim();
        const description = lines.slice(1).join(' ').trim();

        return {
            success: true,
            title,
            description,
            model,
            cost: 0,
        };

    } catch (error) {
        console.error('Gemini Content Generation Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

interface ImageGenerationResult {
    success: boolean;
    imageUrl?: string;
    error?: string;
    model?: string;
    cost?: number;
}

export async function generatePinterestImage(
    apiKey: string,
    prompt: string,
    model: keyof typeof GEMINI_IMAGE_MODELS = 'gemini-3-pro-image-preview',
    aspectRatio: '9:16' | '1:1' = '9:16'
): Promise<ImageGenerationResult> {

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImage?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    numberOfImages: 1,
                    aspectRatio: aspectRatio,
                }),
            }
        );

        if (!response.ok) {
            return { success: false, error: 'Failed to generate image' };
        }

        const data = await response.json();
        const imageUrl = data.generatedImages[0].uri || data.generatedImages[0].imageUrl;

        return {
            success: true,
            imageUrl,
            model,
            cost: 0,
        };

    } catch (error) {
        console.error('Gemini Image Generation Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export async function testGeminiKey(apiKey: string): Promise<boolean> {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            { method: 'GET' }
        );
        return response.ok;
    } catch {
        return false;
    }
}
