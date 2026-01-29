import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables')
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Auth helper functions
export async function signUp(email: string, password: string) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    })
    return { data, error }
}

export async function signIn(email: string, password: string) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })
    return { data, error }
}

export async function signOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    return { error }
}

export async function resetPassword(email: string) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
}

export async function getUser() {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
}

export async function getSession() {
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
}
