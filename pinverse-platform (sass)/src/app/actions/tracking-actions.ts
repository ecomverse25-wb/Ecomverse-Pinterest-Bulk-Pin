"use server";

import { createAdminClient } from "@/lib/supabase-admin";

type ActionType = 'pin_created' | 'api_call';

/**
 * Tracks a user action by logging it to the activities table
 * and updating the relevant counter in the profiles table.
 */
export async function trackUserAction(
    userId: string,
    actionType: ActionType,
    description: string,
    metadata: Record<string, any> = {}
) {
    const supabase = createAdminClient();
    // If admin client fails (e.g. missing env vars), we can't track.
    // We swallow the error to not break the user flow, but log it.
    if (!supabase) {
        console.error("Tracking failed: Admin client not available");
        return;
    }

    try {
        // 1. Log to activities table
        await supabase.from('activities').insert({
            user_id: userId,
            type: actionType,
            description,
            metadata,
            created_at: new Date().toISOString()
        });

        // 2. Increment stats in profiles table
        const updateData: any = { last_active: new Date().toISOString() };

        if (actionType === 'pin_created') {
            // Postgres doesn't strictly support "increment" in a simple update without RPC or raw,
            // but we can try fetching then updating or using a custom RPC if available.
            // For now, simpler approach: use rpc if exists, else read-update.
            // Let's assume standard increment approach for now.
            const { error } = await supabase.rpc('increment_profile_stat', {
                user_id_param: userId,
                col_name: 'pins_created'
            });
            if (error) {
                // Fallback if RPC doesn't exist (likely doesn't yet)
                // We will perform a read-then-write or use a raw query if Supabase client allows (it doesn't easily).
                // Let's implement a safe read-update.
                const { data: profile } = await supabase.from('profiles').select('pins_created').eq('id', userId).single();
                if (profile) {
                    await supabase.from('profiles').update({
                        pins_created: (profile.pins_created || 0) + 1,
                        last_active: new Date().toISOString()
                    }).eq('id', userId);
                }
            }
        } else if (actionType === 'api_call') {
            const { error } = await supabase.rpc('increment_profile_stat', {
                user_id_param: userId,
                col_name: 'api_calls'
            });
            if (error) {
                const { data: profile } = await supabase.from('profiles').select('api_calls').eq('id', userId).single();
                if (profile) {
                    await supabase.from('profiles').update({
                        api_calls: (profile.api_calls || 0) + 1,
                        last_active: new Date().toISOString()
                    }).eq('id', userId);
                }
            }
        } else {
            await supabase.from('profiles').update(updateData).eq('id', userId);
        }

    } catch (error) {
        console.error("Tracking error:", error);
    }
}
