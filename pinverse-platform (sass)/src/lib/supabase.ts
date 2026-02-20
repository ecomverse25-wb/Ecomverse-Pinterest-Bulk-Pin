import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase Client: Missing Environment Variables')
        return null
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey)
}



// Auth helper functions
export async function signUp(email: string, password: string) {
    const supabase = createClient()
    if (!supabase) return { data: null, error: { message: "System Error: Database configuration missing." } as any }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    })
    return { data, error }
}

export async function signIn(email: string, password: string) {
    const supabase = createClient()
    if (!supabase) return { data: null, error: { message: "System Error: Database configuration missing." } as any }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })
    return { data, error }
}

export async function signOut() {
    const supabase = createClient()
    if (!supabase) return { error: { message: "System Error: Database configuration missing." } as any }

    const { error } = await supabase.auth.signOut()
    return { error }
}

export async function resetPassword(email: string) {
    const supabase = createClient()
    if (!supabase) return { data: null, error: { message: "System Error: Database configuration missing." } as any }

    // Use environment variable for site URL, fallback to production URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pinverse.io';

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password`,
    })
    return { data, error }
}

export async function getUser() {
    const supabase = createClient()
    if (!supabase) return { user: null, error: { message: "System Error: Database configuration missing." } as any }

    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
}

