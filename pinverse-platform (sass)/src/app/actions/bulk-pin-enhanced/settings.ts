'use server';

import { createClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

function encrypt(text: string): string {
    return Buffer.from(text).toString('base64');
}

function decrypt(encrypted: string): string {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
}

export async function saveAPIKeys(data: {
    geminiKey?: string;
    replicateKey?: string;
}) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const encryptedData: any = {};
        if (data.geminiKey) encryptedData.gemini_key = encrypt(data.geminiKey);
        if (data.replicateKey) encryptedData.replicate_key = encrypt(data.replicateKey);

        const { error } = await supabase
            .from('user_api_keys')
            .upsert({
                user_id: user.id,
                ...encryptedData,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id'
            });

        if (error) throw error;

        revalidatePath('/dashboard/tools/bulk-pin-creator');
        return { success: true };

    } catch (error) {
        console.error('Error saving API keys:', error);
        return { success: false, error: 'Failed to save API keys' };
    }
}

export async function getAPIKeys() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const { data, error } = await supabase
            .from('user_api_keys')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error) {
            return {
                success: true,
                keys: { geminiKey: '', replicateKey: '' }
            };
        }

        const keys = {
            geminiKey: data.gemini_key ? decrypt(data.gemini_key) : '',
            replicateKey: data.replicate_key ? decrypt(data.replicate_key) : '',
        };

        return { success: true, keys };

    } catch (error) {
        console.error('Error getting API keys:', error);
        return { success: false, error: 'Failed to get API keys' };
    }
}

export async function saveUserSettings(settings: {
    contentProvider?: string;
    contentModel?: string;
    imageProvider?: string;
    imageModel?: string;
    defaultTemplateSlug?: string;
    delayBetweenPinsSeconds?: number;
}) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const { error } = await supabase
            .from('bulk_pin_user_settings')
            .upsert({
                user_id: user.id,
                content_provider: settings.contentProvider,
                content_model: settings.contentModel,
                image_provider: settings.imageProvider,
                image_model: settings.imageModel,
                default_template_slug: settings.defaultTemplateSlug,
                delay_between_pins_seconds: settings.delayBetweenPinsSeconds,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id'
            });

        if (error) throw error;

        revalidatePath('/dashboard/tools/bulk-pin-creator');
        return { success: true };

    } catch (error) {
        console.error('Error saving settings:', error);
        return { success: false, error: 'Failed to save settings' };
    }
}

export async function getUserSettings() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const { data, error } = await supabase
            .from('bulk_pin_user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error) {
            return {
                success: true,
                settings: {
                    contentProvider: 'gemini',
                    contentModel: 'gemini-2.5-flash',
                    imageProvider: 'gemini',
                    imageModel: 'gemini-3-pro-image-preview',
                    defaultTemplateSlug: 'basic-text-middle',
                    delayBetweenPinsSeconds: 5,
                }
            };
        }

        const settings = {
            contentProvider: data.content_provider,
            contentModel: data.content_model,
            imageProvider: data.image_provider,
            imageModel: data.image_model,
            defaultTemplateSlug: data.default_template_slug,
            delayBetweenPinsSeconds: data.delay_between_pins_seconds,
        };

        return { success: true, settings };

    } catch (error) {
        console.error('Error getting settings:', error);
        return { success: false, error: 'Failed to get settings' };
    }
}

