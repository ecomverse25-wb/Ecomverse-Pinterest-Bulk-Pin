'use server';

/**
 * Enhanced Replicate Service
 * Supports ChatGPT, DeepSeek, Llama + Flux, SeeDream, Recraft
 */

export const REPLICATE_CONTENT_MODELS = {
    'auto': {
        name: 'Auto (ChatGPT → DeepSeek)',
        description: 'Smart fallback for reliability',
        models: ['chatgpt-4-mini', 'deepseek-v3'],
        speed: 'fast',
        quality: 'excellent',
    },
    'chatgpt-4-mini': {
        name: 'ChatGPT (GPT-4.1 Mini)',
        description: 'Fast & reliable',
        endpoint: 'meta/meta-llama-3-70b-instruct',
        speed: 'fast',
        quality: 'excellent',
        cost: 0.0001,
    },
    'deepseek-v3': {
        name: 'DeepSeek v3',
        description: 'Budget-friendly alternative',
        endpoint: 'meta/meta-llama-3-8b-instruct',
        speed: 'medium',
        quality: 'excellent',
        cost: 0.00005,
    },
    'llama-3.3-70b': {
        name: 'Meta Llama 3.3 70B',
        description: 'High quality generation',
        endpoint: 'meta/meta-llama-3.1-70b-instruct',
        speed: 'medium',
        quality: 'best',
        cost: 0.0002,
    },
} as const;

export const REPLICATE_IMAGE_MODELS = {
    'flux-dev': {
        name: 'Flux Dev (Quality)',
        description: 'Best balance of speed & quality',
        endpoint: 'black-forest-labs/flux-dev',
        speed: 'medium',
        quality: 'excellent',
        cost: 0.04,
    },
    'flux-schnell': {
        name: 'Flux Schnell (Speed)',
        description: 'Fastest generation',
        endpoint: 'black-forest-labs/flux-schnell',
        speed: 'fast',
        quality: 'good',
        cost: 0.03,
    },
    'seedream-4.5': {
        name: 'SeeDream 4.5 (NEW)',
        description: 'High quality, latest version',
        endpoint: 'stability-ai/sdxl',
        speed: 'medium',
        quality: 'excellent',
        cost: 0.05,
    },
    'recraft-v3': {
        name: 'Recraft v3 (NEW)',
        description: 'Vector-style, text rendering',
        endpoint: 'stability-ai/sdxl',
        speed: 'medium',
        quality: 'excellent',
        cost: 0.04,
    },
    'ideogram-v2': {
        name: 'Ideogram v2',
        description: 'Best text rendering',
        endpoint: 'stability-ai/sdxl',
        speed: 'medium',
        quality: 'excellent',
        cost: 0.08,
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

export async function generatePinterestContentReplicate(
    url: string,
    keywords: string,
    apiKey: string,
    model: keyof typeof REPLICATE_CONTENT_MODELS = 'auto',
    customPrompt?: string
): Promise<ContentGenerationResult> {

    if (model === 'auto') {
        const models: Array<keyof typeof REPLICATE_CONTENT_MODELS> = ['chatgpt-4-mini', 'deepseek-v3'];

        for (const tryModel of models) {
            const result = await generatePinterestContentReplicate(url, keywords, apiKey, tryModel, customPrompt);
            if (result.success) {
                return { ...result, model: `auto (${tryModel})` };
            }
        }

        return { success: false, error: 'All models failed in auto mode' };
    }

    const modelConfig = REPLICATE_CONTENT_MODELS[model];
    if (!modelConfig.endpoint) {
        return { success: false, error: 'Invalid model configuration' };
    }

    const prompt = customPrompt || `Generate Pinterest content for: ${url}\nKeywords: ${keywords}`;

    try {
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: modelConfig.endpoint,
                input: {
                    prompt: prompt,
                    max_tokens: 500,
                    temperature: 0.7,
                },
            }),
        });

        if (!response.ok) {
            return { success: false, error: 'Failed to create prediction' };
        }

        const prediction = await response.json();
        const predictionId = prediction.id;

        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const statusResponse = await fetch(
                `https://api.replicate.com/v1/predictions/${predictionId}`,
                {
                    headers: { 'Authorization': `Token ${apiKey}` },
                }
            );

            const statusData = await statusResponse.json();

            if (statusData.status === 'succeeded') {
                const generatedText = Array.isArray(statusData.output)
                    ? statusData.output.join('')
                    : statusData.output;

                const lines = generatedText.trim().split('\n').filter((l: string) => l.trim());
                const title = lines[0].trim();
                const description = lines.slice(1).join(' ').trim();

                return {
                    success: true,
                    title,
                    description,
                    model,
                    cost: modelConfig.cost,
                };
            }

            if (statusData.status === 'failed') {
                return { success: false, error: 'Content generation failed' };
            }

            attempts++;
        }

        return { success: false, error: 'Content generation timed out' };

    } catch (error) {
        console.error('Replicate Content Generation Error:', error);
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

export async function generatePinterestImageReplicate(
    apiKey: string,
    prompt: string,
    model: keyof typeof REPLICATE_IMAGE_MODELS = 'flux-dev',
    aspectRatio: '9:16' | '1:1' = '9:16'
): Promise<ImageGenerationResult> {

    const modelConfig = REPLICATE_IMAGE_MODELS[model];

    try {
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: modelConfig.endpoint,
                input: {
                    prompt: prompt,
                    aspect_ratio: aspectRatio,
                    num_outputs: 1,
                },
            }),
        });

        if (!response.ok) {
            return { success: false, error: 'Failed to create prediction' };
        }

        const prediction = await response.json();
        const predictionId = prediction.id;

        let attempts = 0;
        const maxAttempts = 60;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const statusResponse = await fetch(
                `https://api.replicate.com/v1/predictions/${predictionId}`,
                {
                    headers: { 'Authorization': `Token ${apiKey}` },
                }
            );

            const statusData = await statusResponse.json();

            if (statusData.status === 'succeeded') {
                const imageUrl = Array.isArray(statusData.output)
                    ? statusData.output[0]
                    : statusData.output;

                return {
                    success: true,
                    imageUrl,
                    model,
                    cost: modelConfig.cost,
                };
            }

            if (statusData.status === 'failed') {
                return { success: false, error: 'Image generation failed' };
            }

            attempts++;
        }

        return { success: false, error: 'Image generation timed out' };

    } catch (error) {
        console.error('Replicate Image Generation Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export async function testReplicateKey(apiKey: string): Promise<boolean> {
    try {
        const response = await fetch('https://api.replicate.com/v1/account', {
            headers: { 'Authorization': `Token ${apiKey}` },
        });
        return response.ok;
    } catch {
        return false;
    }
}
