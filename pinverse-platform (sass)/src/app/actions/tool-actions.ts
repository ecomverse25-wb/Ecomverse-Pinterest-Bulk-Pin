'use server'

import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { isAdmin } from '@/lib/admin';
import { revalidatePath } from 'next/cache';

export type Tool = {
    id: string;
    name: string;
    description: string;
    is_globally_visible: boolean;
};

export type UserToolVisibility = {
    user_id: string;
    tool_id: string;
    is_visible: boolean;
};

export async function getTools() {
    const supabase = await createClient();
    const { data: tools, error } = await supabase
        .from('tools')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching tools:', error);
        return [];
    }

    return tools as Tool[];
}

// Public function for home page - no auth required
export async function getPublicVisibleTools() {
    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
        console.error('Admin client unavailable for public tools fetch');
        return [];
    }

    const { data: tools, error } = await adminSupabase
        .from('tools')
        .select('*')
        .eq('is_globally_visible', true)
        .order('name');

    if (error) {
        console.error('Error fetching public visible tools:', error);
        return [];
    }

    return tools as Tool[];
}

export async function getToolVisibilityForUser(userId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('user_tool_visibility')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching user tool visibility:', error);
        return [];
    }

    return data as UserToolVisibility[];
}

export async function toggleToolGlobal(toolId: string, isVisible: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!isAdmin(user?.email)) {
        throw new Error('Unauthorized');
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) throw new Error('Admin client unavailable');

    const { error } = await adminSupabase
        .from('tools')
        .update({ is_globally_visible: isVisible })
        .eq('id', toolId);

    if (error) throw error;

    revalidatePath('/');  // Revalidate home page
    revalidatePath('/dashboard/tools');
    revalidatePath('/admin');
}

export async function toggleToolForUser(userId: string, toolId: string, isVisible: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!isAdmin(user?.email)) {
        throw new Error('Unauthorized');
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) throw new Error('Admin client unavailable');

    // Check if entry exists
    const { data: existing } = await adminSupabase
        .from('user_tool_visibility')
        .select('*')
        .eq('user_id', userId)
        .eq('tool_id', toolId)
        .single();

    if (existing) {
        const { error } = await adminSupabase
            .from('user_tool_visibility')
            .update({ is_visible: isVisible })
            .eq('id', existing.id);
        if (error) throw error;
    } else {
        const { error } = await adminSupabase
            .from('user_tool_visibility')
            .insert({
                user_id: userId,
                tool_id: toolId,
                is_visible: isVisible
            });
        if (error) throw error;
    }

    revalidatePath('/dashboard/tools');
    revalidatePath('/admin');
}

export async function removeToolOverrideForUser(userId: string, toolId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!isAdmin(user?.email)) {
        throw new Error('Unauthorized');
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) throw new Error('Admin client unavailable');

    const { error } = await adminSupabase
        .from('user_tool_visibility')
        .delete()
        .eq('user_id', userId)
        .eq('tool_id', toolId);

    if (error) throw error;

    revalidatePath('/dashboard/tools');
    revalidatePath('/admin');
}

export async function getVisibleToolsForCurrentUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // 1. Get all globally visible tools
    const { data: tools, error: toolsError } = await supabase
        .from('tools')
        .select('*');

    if (toolsError) return [];

    // 2. Get user specific overrides
    const { data: overrides, error: overridesError } = await supabase
        .from('user_tool_visibility')
        .select('*')
        .eq('user_id', user.id);

    if (overridesError) return [];

    // 3. Merge logic
    const visibleTools = (tools as Tool[]).filter(tool => {
        const override = (overrides as UserToolVisibility[]).find(o => o.tool_id === tool.id);
        if (override) {
            return override.is_visible;
        }
        return tool.is_globally_visible;
    });

    return visibleTools;
}
