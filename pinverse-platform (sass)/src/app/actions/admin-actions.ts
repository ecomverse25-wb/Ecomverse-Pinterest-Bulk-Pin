"use server";

import { createClient } from "@/lib/supabase-server"; // Use server-side clients
import { createAdminClient as createSupabaseAdmin } from "@/lib/supabase-admin"; // For Service Role operations
import { isAdmin } from "@/lib/admin";
import { UserProfile, AdminMetrics, MetricsChanges, Activity, DailyStat, ActivityType } from "@/app/admin/types";

interface DBProfile {
    id: string;
    email: string | null;
    full_name: string | null;
    plan: string;
    status: string;
    pins_created: number;
    api_calls: number;
    created_at: string;
    last_active: string | null;
}

// Helper to check admin permission
async function checkAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isAdmin(user.email)) {
        throw new Error("Unauthorized: Admin access required");
    }
    return user;
}

// Reuse logic from adminData.ts but as Server Action
export async function fetchAdminMetricsAction(): Promise<{ metrics: AdminMetrics; changes: MetricsChanges; error: string | null }> {
    try {
        await checkAdmin();
        const supabase = createSupabaseAdmin(); // Superseded by throw in util
        // if (!supabase) throw new Error("Supabase Admin client initialization failed");

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) throw error;

        const users: DBProfile[] = profiles || [];
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

        const metrics: AdminMetrics = {
            totalUsers: users.length,
            activeToday: users.filter(u => u.last_active?.startsWith(today)).length,
            newThisWeek: users.filter(u => u.created_at >= weekAgo).length,
            totalPinsCreated: users.reduce((sum, u) => sum + (u.pins_created || 0), 0),
            totalApiCalls: users.reduce((sum, u) => sum + (u.api_calls || 0), 0),
            usersByPlan: {
                free: users.filter(u => u.plan === 'free').length,
                starter: users.filter(u => u.plan === 'starter').length,
                pro: users.filter(u => u.plan === 'pro').length,
                promax: users.filter(u => u.plan === 'promax').length,
                enterprise: users.filter(u => u.plan === 'enterprise').length,
            },
            monthlyRevenue:
                users.filter(u => u.plan === 'starter').length * 14 +
                users.filter(u => u.plan === 'pro').length * 27 +
                Math.round(users.filter(u => u.plan === 'promax').length * (149 / 12)) +
                users.filter(u => u.plan === 'enterprise').length * 99,
        };

        // Changes
        const prevWeekUsers = users.filter(u => u.created_at < weekAgo);
        const newLastWeek = users.filter((u => u.created_at >= twoWeeksAgo && u.created_at < weekAgo)).length;

        const calcChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        const changes: MetricsChanges = {
            totalUsersChange: calcChange(metrics.totalUsers, prevWeekUsers.length),
            newThisWeekChange: calcChange(metrics.newThisWeek, newLastWeek),
        };

        return { metrics, changes, error: null };

    } catch (error: any) {
        console.error("Admin Metrics Error:", error);
        return {
            metrics: { totalUsers: 0, activeToday: 0, newThisWeek: 0, totalPinsCreated: 0, totalApiCalls: 0, monthlyRevenue: 0, usersByPlan: { free: 0, starter: 0, pro: 0, promax: 0, enterprise: 0 } },
            changes: { totalUsersChange: 0, newThisWeekChange: 0 },
            error: error.message
        };
    }
}

export async function fetchRecentActivitiesAction(limit: number = 10) {
    try {
        await checkAdmin();
        const supabase = createSupabaseAdmin();
        if (!supabase) throw new Error("Supabase Admin client initialization failed");
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return { activities: data as Activity[], error: null };
    } catch (error: any) {
        return { activities: [], error: error.message };
    }
}

export async function fetchAllUsersAction() {
    try {
        await checkAdmin();
        const supabase = createSupabaseAdmin();
        if (!supabase) throw new Error("Supabase Admin client initialization failed");
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform
        const users: UserProfile[] = (data || []).map((profile: DBProfile) => ({
            id: profile.id,
            email: profile.email || '',
            full_name: profile.full_name,
            plan: (profile.plan as 'free' | 'starter' | 'pro' | 'promax' | 'enterprise') || 'free',
            status: (profile.status as 'active' | 'suspended' | 'cancelled') || 'active',
            pins_created: profile.pins_created || 0,
            api_calls: profile.api_calls || 0,
            created_at: profile.created_at,
            last_active: profile.last_active || profile.created_at,
        }));

        return { users, error: null };
    } catch (error: any) {
        return { users: [], error: error.message };
    }
}

export async function logActivityAction(
    userId: string,
    userEmail: string,
    type: ActivityType,
    description: string,
    metadata: Record<string, unknown> = {}
) {
    // Internal use or called by other actions
    const supabase = createSupabaseAdmin();
    if (!supabase) return; // Fail silently for logging if system is down
    await supabase.from('activities').insert({
        user_id: userId,
        user_email: userEmail,
        type,
        description,
        metadata,
    });
}

export async function updateUserStatusAction(userId: string, status: 'active' | 'suspended' | 'cancelled') {
    try {
        const adminUser = await checkAdmin();
        const supabase = createSupabaseAdmin();
        if (!supabase) throw new Error("Supabase Admin client initialization failed");
        const { error } = await supabase
            .from('profiles')
            .update({ status })
            .eq('id', userId);

        if (error) throw error;

        await logActivityAction(userId, 'system', 'status_change', `User status changed to ${status} by ${adminUser.email}`);

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateUserPlanAction(userId: string, plan: 'free' | 'starter' | 'pro' | 'promax' | 'enterprise') {
    try {
        const adminUser = await checkAdmin();
        const supabase = createSupabaseAdmin();
        if (!supabase) throw new Error("Supabase Admin client initialization failed");
        const { error } = await supabase
            .from('profiles')
            .update({ plan })
            .eq('id', userId);

        if (error) throw error;

        await logActivityAction(userId, 'system', 'subscription_change', `User plan updated to ${plan} by ${adminUser.email}`, { plan });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteUserAction(userId: string) {
    try {
        const adminUser = await checkAdmin();
        const supabase = createSupabaseAdmin();
        if (!supabase) throw new Error("Supabase Admin client initialization failed");
        const { error } = await supabase.auth.admin.deleteUser(userId);

        if (error) throw error;

        await logActivityAction(userId, 'system', 'account_deletion', `User deleted by ${adminUser.email}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function fetchDailyStatsAction() {
    try {
        await checkAdmin();
        const supabase = createSupabaseAdmin();
        if (!supabase) throw new Error("Supabase Admin client initialization failed");

        // Simplified Logic: In production, better to use a dedicated stats table or SQL view
        // For now, mirroring the logic from adminData.ts
        const days: DailyStat[] = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            days.push({ date: dateStr, signups: 0, activeUsers: 0, pinsCreated: 0 });
        }

        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        // Fetch Data Parallel
        const [profilesRes, activitiesRes] = await Promise.all([
            supabase.from('profiles').select('created_at').gte('created_at', weekAgo.toISOString()),
            supabase.from('activities').select('created_at, type').eq('type', 'pin_created').gte('created_at', weekAgo.toISOString())
        ]);


        (profilesRes.data || []).forEach((p: { created_at: string }) => {
            const date = p.created_at.split('T')[0];
            const d = days.find(day => day.date === date);
            if (d) d.signups++;
        });

        (activitiesRes.data || []).forEach((a: { created_at: string }) => {
            const date = a.created_at.split('T')[0];
            const d = days.find(day => day.date === date);
            if (d) d.pinsCreated++;
        });

        // Note: Active Users calculation omitted for brevity/perf, or could assume same as signups/pins for now in this mock-like logic

        return { stats: days, error: null };

    } catch (error: any) {
        return { stats: [], error: error.message };
    }
}
// --- Specific User Activities ---
export async function fetchUserActivitiesAction(userId: string) {
    try {
        await checkAdmin();
        const supabase = createSupabaseAdmin();
        if (!supabase) throw new Error("Supabase Admin client initialization failed");
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { activities: data as Activity[], error: null };
    } catch (error: any) {
        return { activities: [], error: error.message };
    }
}

export async function createCustomerAction(data: {
    email: string;
    password: string;
    fullName?: string;
    plan: 'free' | 'starter' | 'pro' | 'promax' | 'enterprise';
}) {
    try {
        const adminUser = await checkAdmin();
        const supabase = createSupabaseAdmin();
        if (!supabase) throw new Error("Supabase Admin client initialization failed");

        // 1. Create User
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true,
            user_metadata: {
                full_name: data.fullName
            }
        });

        if (createError) throw createError;
        if (!userData.user) throw new Error("Failed to create user object");

        // 2. Update Profile with Plan (Profile is auto-created by trigger usually, but we update explicit fields)
        // Wait a small moment or direct insert/upsert to ensure profile exists/is updated

        // We'll use upsert to be safe, ensuring we set the plan correctly
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userData.user.id,
                email: data.email,
                full_name: data.fullName,
                plan: data.plan,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (profileError) {
            // If profile update fails, we might want to warn but the user exists
            console.error("Profile update failed after user creation", profileError);
            // Don't throw here to avoid "User created but error shown" confusion, or handle gracefully
        }

        // 3. Log Activity
        await logActivityAction(
            userData.user.id,
            data.email,
            'signup',
            `User created manually by admin ${adminUser.email} with plan ${data.plan}`
        );

        return { success: true, userId: userData.user.id };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
