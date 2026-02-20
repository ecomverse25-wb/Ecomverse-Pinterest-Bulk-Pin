"use server";

import { createClient } from "@/lib/supabase-server";
import { KeywordCluster, Product } from "@/components/article-writer/types";

// DB Types (Must match database schema)
export interface DBKeywordFile {
    id: string;
    filename: string;
    content: KeywordCluster[];
    created_at: string;
}

export interface DBProduct {
    id: string;
    name: string;
    link: string;
    image: string;
    batch_name: string;
    created_at: string;
}

export interface DBPrompt {
    category: string;
    prompt_text: string;
}

// --- Keywords ---

export async function saveKeywordFileAction(filename: string, content: KeywordCluster[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Auth Error: User not authenticated" };
    }

    const { data, error } = await supabase
        .from('user_keywords')
        .insert({
            user_id: user.id,
            filename,
            content: content
        })
        .select()
        .single();

    if (error) {
        console.error("Save Keyword Error:", error);
        return { error: `DB Error: ${error.message}` };
    }
    return { success: true, data };
}

export async function getUserKeywordsAction() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('user_keywords')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Get Keywords Error:", error);
        return { error: error.message };
    }
    return { success: true, data: data as DBKeywordFile[] };
}

export async function deleteKeywordFileAction(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('user_keywords')
        .delete()
        .eq('id', id);

    if (error) {
        return { error: error.message };
    }
    return { success: true };
}

// --- Products ---

export async function saveProductsAction(products: Product[], batchName: string = "Upload") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Auth Error: User not logged in." };
    }

    const rows = products.map(p => ({
        user_id: user.id,
        name: p.name,
        link: p.link,
        image: p.image,
        batch_name: batchName
    }));

    const { data, error } = await supabase
        .from('user_products')
        .insert(rows)
        .select();

    if (error) {
        console.error("Save Products Error:", error);
        return { error: `DB Insert Error: ${error.message} (Code: ${error.code})` };
    }
    return { success: true, data };
}

export async function getUserProductBatchesAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Auth Error" };

    // We want to group by batch_name and created_at to show "files"
    // Since we don't have a separate 'batches' table, we can distinct on batch_name/created_at
    // But this depends on exact timestamp matching. 
    // A better approach for the future is a separate table, but for now we'll query all and group in JS or use distinct.

    // Let's rely on the client or a distinct query if possible.
    // Supabase supports .select('batch_name, created_at').distinct()

    // However, knowing how accurate the timestamp is, let's just fetch all mostly-recent products and group them? 
    // Or just simple distinct.

    const { data, error } = await supabase
        .from('user_products')
        .select('batch_name, created_at')
        // We need a way to group. 
        // If we can't do distinct easily without a raw query, we fetch relevant columns 
        // and unique them in JS (not efficient for huge datasets but fine for <1000 rows).
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Get Product Batches Error:", error);
        return { error: error.message };
    }

    // Group by unique batch_name + created_at combinations
    const uniqueBatches = new Map();
    data.forEach((item: any) => {
        const key = `${item.batch_name}-${item.created_at}`;
        if (!uniqueBatches.has(key)) {
            uniqueBatches.set(key, item);
        }
    });

    return { success: true, data: Array.from(uniqueBatches.values()) };
}

export async function getProductsInBatchAction(batchName: string, createdAt: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Auth Error" };

    const { data, error } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', user.id)
        .eq('batch_name', batchName)
        .eq('created_at', createdAt);

    if (error) return { error: error.message };
    return { success: true, data: data as DBProduct[] };
}

export async function deleteProductBatchAction(batchName: string, createdAt: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Auth Error" };

    const { error } = await supabase
        .from('user_products')
        .delete()
        .eq('user_id', user.id)
        .eq('batch_name', batchName)
        .eq('created_at', createdAt);

    if (error) return { error: error.message };
    return { success: true };
}

// --- Prompts ---

export async function savePromptAction(category: string, text: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "User not authenticated" };

    const { error } = await supabase
        .from('user_prompts')
        .upsert({
            user_id: user.id,
            category,
            prompt_text: text,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, category' });

    if (error) {
        return { error: error.message };
    }
    return { success: true };
}

export async function getUserPromptsAction() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('user_prompts')
        .select('category, prompt_text');

    if (error) {
        console.error("Get Prompts Error:", error);
        return { error: error.message, data: [] };
    }
    return { success: true, data: data as DBPrompt[] };
}
// --- User Stats ---

export async function incrementPinCountAction(userId: string) {
    const supabase = await createClient();

    // Remote Procedure Call (RPC) is ideal for increments to handle concurrency,
    // but standard update is fine for this scale if RPC isn't set up.
    // We'll fetch current count and increment.

    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('pins_created')
        .eq('id', userId)
        .single();

    if (fetchError) return { error: fetchError.message };

    const newCount = (profile?.pins_created || 0) + 1;

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ pins_created: newCount })
        .eq('id', userId);

    if (updateError) return { error: updateError.message };

    return { success: true };
}

export async function updateLastActiveAction(userId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userId);

    if (error) return { error: error.message };
    return { success: true };
}
