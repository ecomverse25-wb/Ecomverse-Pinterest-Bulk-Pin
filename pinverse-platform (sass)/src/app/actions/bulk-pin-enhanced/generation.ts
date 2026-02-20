'use server';

import { createClient } from '@/lib/supabase-server';
import { generatePinterestContent, generatePinterestImage } from '@/lib/gemini-enhanced';
import { generatePinterestContentReplicate, generatePinterestImageReplicate } from '@/lib/replicate-enhanced';
import { getTemplateBySlug, processPromptTemplate, generateSEOSlug } from '@/lib/pin-templates-library';
import { getAPIKeys } from './settings';

interface GeneratePinParams {
    url: string;
    keywords: string;
    templateSlug: string;
    contentProvider: 'gemini' | 'replicate';
    contentModel: string;
    imageProvider: 'gemini' | 'replicate';
    imageModel: string;
    aspectRatio?: '9:16' | '1:1';
    stylePrompt?: string;
}

const MODEL_MAP: Record<string, string> = {
    // Replicate API models
    "chatgpt-4o": "openai/gpt-4o",
    "chatgpt-4o-mini": "openai/gpt-4o-mini",
    "deepseek-v3": "deepseek-ai/deepseek-v3-0324",
    "llama-4-scout": "meta/llama-4-scout",
    "llama-3.1-405b": "meta/llama-3.1-405b-instruct",
    "llama-3.3-70b": "meta/llama-3.3-70b-instruct",
    "mixtral-8x7b": "mistralai/mixtral-8x7b-instruct-v0.1",
    // Gemini API models — live as of Feb 19, 2026
    "gemini-3.1-pro": "gemini-3.1-pro-preview",
    "gemini-3-flash": "gemini-3-flash-preview",
    "gemini-2.5-pro": "gemini-2.5-pro",
    "gemini-2.5-flash": "gemini-2.5-flash",
    "gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
};

interface GeneratePinResult {
    success: boolean;
    pin?: {
        id: string;
        title: string;
        description: string;
        imageUrl: string;
        url: string;
        keywords: string;
        seoSlug: string;
    };
    error?: string;
}

export async function generateSinglePin(params: GeneratePinParams): Promise<GeneratePinResult> {
    const supabase = await createClient();
    const startTime = Date.now();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const keysResult = await getAPIKeys();
        if (!keysResult.success || !keysResult.keys) {
            return { success: false, error: 'API keys not configured' };
        }

        const { geminiKey, replicateKey } = keysResult.keys;

        if (params.contentProvider === 'gemini' && !geminiKey) {
            return { success: false, error: 'Gemini API key not configured' };
        }
        if (params.contentProvider === 'replicate' && !replicateKey) {
            return { success: false, error: 'Replicate API key not configured' };
        }
        if (params.imageProvider === 'gemini' && !geminiKey) {
            return { success: false, error: 'Gemini API key not configured for images' };
        }
        if (params.imageProvider === 'replicate' && !replicateKey) {
            return { success: false, error: 'Replicate API key not configured for images' };
        }

        const template = getTemplateBySlug(params.templateSlug);
        if (!template) {
            return { success: false, error: 'Template not found' };
        }

        // STEP 1: Generate content
        // Use stylePrompt (template guidelines) as a custom prompt if provided
        const customPrompt = params.stylePrompt || undefined;
        let contentResult;
        if (params.contentProvider === 'gemini') {
            // Map the model ID to the actual API model name
            const modelId = MODEL_MAP[params.contentModel] || params.contentModel;
            contentResult = await generatePinterestContent(
                params.url,
                params.keywords,
                geminiKey,
                modelId as any,
                customPrompt
            );
        } else {
            contentResult = await generatePinterestContentReplicate(
                params.url,
                params.keywords,
                replicateKey,
                params.contentModel as any,
                customPrompt
            );
        }

        if (!contentResult.success) {
            return { success: false, error: `Content generation failed: ${contentResult.error}` };
        }

        // STEP 2: Generate image using template guidelines as image prompt
        const imagePrompt = params.stylePrompt
            ? params.stylePrompt
            : (template.guidelines
                ? template.guidelines.replace('${url}', params.url)
                : processPromptTemplate(
                    template.guidelines || '',
                    params.keywords,
                    'general'
                ));

        let imageResult;
        if (params.imageProvider === 'gemini') {
            imageResult = await generatePinterestImage(
                geminiKey,
                imagePrompt,
                params.imageModel as any,
                params.aspectRatio || '9:16'
            );
        } else {
            imageResult = await generatePinterestImageReplicate(
                replicateKey,
                imagePrompt,
                params.imageModel as any,
                params.aspectRatio || '9:16'
            );
        }

        if (!imageResult.success) {
            return { success: false, error: `Image generation failed: ${imageResult.error}` };
        }

        const seoSlug = generateSEOSlug(params.keywords);
        const generationTime = Date.now() - startTime;
        const totalCost = (contentResult.cost || 0) + (imageResult.cost || 0);

        const { data: pin, error: dbError } = await supabase
            .from('generated_pins_history')
            .insert({
                user_id: user.id,
                source_url: params.url,
                keywords: params.keywords,
                template_slug: params.templateSlug,
                content_provider: params.contentProvider,
                content_model: params.contentModel,
                image_provider: params.imageProvider,
                image_model: params.imageModel,
                generated_title: contentResult.title,
                generated_description: contentResult.description,
                generated_image_url: imageResult.imageUrl,
                seo_slug: seoSlug,
                generation_cost: totalCost,
                generation_time_ms: generationTime,
                status: 'completed',
            })
            .select()
            .single();

        if (dbError) throw dbError;

        return {
            success: true,
            pin: {
                id: pin.id,
                title: pin.generated_title,
                description: pin.generated_description,
                imageUrl: pin.generated_image_url,
                url: pin.source_url,
                keywords: pin.keywords,
                seoSlug: pin.seo_slug,
            },
        };

    } catch (error) {
        console.error('Error generating pin:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate pin'
        };
    }
}

export async function createBulkJob(params: {
    urls: Array<{ url: string; keywords: string }>;
    templateSlug: string;
    contentProvider: 'gemini' | 'replicate';
    contentModel: string;
    imageProvider: 'gemini' | 'replicate';
    imageModel: string;
}) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const { data: job, error: jobError } = await supabase
            .from('bulk_pin_jobs')
            .insert({
                user_id: user.id,
                status: 'pending',
                total_pins: params.urls.length,
                urls_data: params.urls,
                settings: {
                    templateSlug: params.templateSlug,
                    contentProvider: params.contentProvider,
                    contentModel: params.contentModel,
                    imageProvider: params.imageProvider,
                    imageModel: params.imageModel,
                },
            })
            .select()
            .single();

        if (jobError) throw jobError;

        return { success: true, jobId: job.id };

    } catch (error) {
        console.error('Error creating bulk job:', error);
        return { success: false, error: 'Failed to create bulk job' };
    }
}

export async function processBulkJobItem(params: {
    jobId: string;
    index: number;
    url: string;
    keywords: string;
    templateSlug: string;
    contentProvider: 'gemini' | 'replicate';
    contentModel: string;
    imageProvider: 'gemini' | 'replicate';
    imageModel: string;
}) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        await supabase
            .from('bulk_pin_jobs')
            .update({
                status: 'processing',
                current_index: params.index,
                started_at: new Date().toISOString(),
            })
            .eq('id', params.jobId);

        const result = await generateSinglePin({
            url: params.url,
            keywords: params.keywords,
            templateSlug: params.templateSlug,
            contentProvider: params.contentProvider,
            contentModel: params.contentModel,
            imageProvider: params.imageProvider,
            imageModel: params.imageModel,
        });

        if (result.success && result.pin) {
            await supabase
                .from('generated_pins_history')
                .update({ job_id: params.jobId })
                .eq('id', result.pin.id);
        }

        const { data: job } = await supabase
            .from('bulk_pin_jobs')
            .select('completed_pins, failed_pins, error_log')
            .eq('id', params.jobId)
            .single();

        if (job) {
            const errorLog = job.error_log || [];

            if (result.success) {
                await supabase
                    .from('bulk_pin_jobs')
                    .update({
                        completed_pins: (job.completed_pins || 0) + 1,
                        current_index: params.index,
                    })
                    .eq('id', params.jobId);
            } else {
                errorLog.push({
                    index: params.index,
                    url: params.url,
                    error: result.error,
                    timestamp: new Date().toISOString(),
                });

                await supabase
                    .from('bulk_pin_jobs')
                    .update({
                        failed_pins: (job.failed_pins || 0) + 1,
                        error_log: errorLog,
                        current_index: params.index,
                    })
                    .eq('id', params.jobId);
            }
        }

        return result;

    } catch (error) {
        console.error('Error processing bulk job item:', error);
        return { success: false, error: 'Failed to process item' };
    }
}

export async function completeBulkJob(jobId: string) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const { error } = await supabase
            .from('bulk_pin_jobs')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
            })
            .eq('id', jobId)
            .eq('user_id', user.id);

        if (error) throw error;

        return { success: true };

    } catch (error) {
        console.error('Error completing job:', error);
        return { success: false, error: 'Failed to complete job' };
    }
}

export async function getGeneratedPins(limit: number = 50) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const { data: pins, error } = await supabase
            .from('generated_pins_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return { success: true, pins };

    } catch (error) {
        console.error('Error getting pins:', error);
        return { success: false, error: 'Failed to get pins' };
    }
}

export async function deletePins(pinIds: string[]) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const { error } = await supabase
            .from('generated_pins_history')
            .delete()
            .in('id', pinIds)
            .eq('user_id', user.id);

        if (error) throw error;

        return { success: true };

    } catch (error) {
        console.error('Error deleting pins:', error);
        return { success: false, error: 'Failed to delete pins' };
    }
}
