"use server";

import { createClient } from "@/lib/supabase-server";

export interface UserSettings {
    gemini_api_key?: string;
    replicate_api_key?: string;
    imgbb_api_key?: string;
    anthropic_api_key?: string;
    openai_api_key?: string;
}

export async function getUserSettingsAction(): Promise<{ settings: UserSettings | null; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { settings: null, error: "User not authenticated" };
        }

        const { data, error } = await supabase
            .from('user_settings')
            .select('gemini_api_key, replicate_api_key, imgbb_api_key, anthropic_api_key, openai_api_key')
            .eq('user_id', user.id)
            .single();

        if (error) {
            // It's acceptable if no settings exist yet
            if (error.code === 'PGRST116') {
                return { settings: null, error: null };
            }
            throw error;
        }

        return { settings: data, error: null };
    } catch (error: any) {
        console.error("Error fetching settings:", error);
        return { settings: null, error: error.message };
    }
}

export async function updateUserSettingsAction(settings: UserSettings) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "User not authenticated" };
        }

        // 1. Check if settings exist for this user
        const { data: existing, error: fetchError } = await supabase
            .from('user_settings')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is 'not found'
            throw fetchError;
        }

        if (existing) {
            // 2. Update existing (Patch)
            const { error } = await supabase
                .from('user_settings')
                .update({
                    ...settings,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);
            if (error) throw error;
        } else {
            // 3. Insert new
            const { error } = await supabase
                .from('user_settings')
                .insert({
                    user_id: user.id,
                    ...settings
                });
            if (error) throw error;
        }

        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error updating settings:", error);
        return { success: false, error: error.message };
    }
}
