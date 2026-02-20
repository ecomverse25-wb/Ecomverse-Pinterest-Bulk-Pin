"use server";

import { createClient } from "@/lib/supabase-server"; // Assuming this exists or using createAdminClient
// Ideally we should use the authenticated user's client, but for actions we use server client
import { KeywordCluster, Product, ArticleData } from "@/components/article-writer/types";

// Helper to get authenticated client
async function getSupabaseAuth() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, user };
}

export async function saveUserDataAction(userId: string, key: string, value: any) {
    try {
        const { supabase, user } = await getSupabaseAuth();
        if (!user || user.id !== userId) throw new Error("Unauthorized");

        // We'll use a generic 'user_data' table: id, user_id, key, value (jsonb), updated_at
        // Check if row exists
        const { data: existing } = await supabase
            .from('user_data')
            .select('id')
            .eq('user_id', userId)
            .eq('key', key)
            .single();

        if (existing) {
            await supabase
                .from('user_data')
                .update({ value, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('user_data')
                .insert({ user_id: userId, key, value });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Save Data Error:", error);
        return { success: false, error: error.message };
    }
}

export async function loadUserDataAction(userId: string) {
    try {
        const { supabase, user } = await getSupabaseAuth();
        if (!user || user.id !== userId) throw new Error("Unauthorized");

        const { data } = await supabase
            .from('user_data')
            .select('key, value')
            .eq('user_id', userId);

        const result: { clusters?: KeywordCluster[], products?: Product[], articles?: ArticleData[] } = {};

        if (data) {
            data.forEach((row: any) => {
                if (row.key === 'clusters') result.clusters = row.value;
                if (row.key === 'products') result.products = row.value;
                if (row.key === 'articles') result.articles = row.value;
            });
        }

        return result;
    } catch (error: any) {
        console.error("Load Data Error:", error);
        return {};
    }
}
