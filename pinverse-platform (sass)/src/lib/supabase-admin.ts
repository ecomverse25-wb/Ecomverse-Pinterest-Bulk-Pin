import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        const missing = [];
        if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
        if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

        const errorMsg = `Supabase Admin Init Error: Missing variables: ${missing.join(", ")}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    try {
        return createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })
    } catch (error) {
        console.error('Supabase Admin Init Failed:', error)
        throw new Error(`Supabase Admin Init Failed: ${(error as Error).message}`);
    }
}
