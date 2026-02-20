"use server";

import { createClient } from "@/lib/supabase-server"; // For public reading/auth check
import { createAdminClient } from "@/lib/supabase-admin"; // For writing (Service Role)
import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";

export type ContentSectionKey = 'hero' | 'features' | 'pricing' | 'testimonials' | 'cta' | 'footer';

// Generic content type, specific schemas will be enforced by the components
export interface SiteContentData {
    [key: string]: any;
}

/**
 * Fetches content for a specific section.
 * Publicly accessible.
 */
export async function getSiteContentAction(sectionKey: ContentSectionKey) {
    try {
        const supabase = await createClient(); // Helper that handles cookies etc.
        const { data, error } = await supabase
            .from('site_content')
            .select('content')
            .eq('section_key', sectionKey)
            .single();

        if (error) {
            // If row doesn't exist (e.g. first run), return null so components use defaults
            if (error.code === 'PGRST116') return { content: null, error: null };
            return { content: null, error: error.message };
        }

        return { content: data.content as SiteContentData, error: null };
    } catch (error: any) {
        console.error(`Unexpected error fetching content for ${sectionKey}:`, error);
        return { content: null, error: error.message };
    }
}

/**
 * Updates content for a section.
 * Restricted to Admins.
 */
export async function updateSiteContentAction(sectionKey: ContentSectionKey, content: SiteContentData) {
    try {
        // 1. Auth Check (Must be Admin)
        const supabaseAuth = await createClient();
        const { data: { user } } = await supabaseAuth.auth.getUser();

        if (!user || !isAdmin(user.email)) {
            return { success: false, error: "Unauthorized: Admins only" };
        }

        // 2. Perform Update using Admin Client (Bypasses RLS if configured rigidly)
        // Although our RLS policy allows read, write is denied for normal users.
        const supabaseAdmin = createAdminClient();
        if (!supabaseAdmin) throw new Error("Server configuration error");

        // Upsert: Create row if missing, update if exists
        const { error } = await supabaseAdmin
            .from('site_content')
            .upsert({
                section_key: sectionKey,
                content: content,
                updated_at: new Date().toISOString(),
                updated_by: user.id
            }, { onConflict: 'section_key' });

        if (error) throw error;

        // 3. Revalidate paths to reflect changes immediately
        revalidatePath('/'); // Home page
        revalidatePath('/admin/content'); // Admin editor

        return { success: true, error: null };

    } catch (error: any) {
        console.error(`Error updating content for ${sectionKey}:`, error);
        return { success: false, error: error.message };
    }
}
