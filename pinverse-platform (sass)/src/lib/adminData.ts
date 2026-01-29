// Admin data functions - fetches real data from Supabase
import { createClient } from './supabase';

// Types for admin data
export interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    pins_created: number;
    api_calls: number;
    created_at: string;
    last_active: string;
}

export interface AdminMetrics {
    totalUsers: number;
    activeToday: number;
    newThisWeek: number;
    totalPinsCreated: number;
    totalApiCalls: number;
    monthlyRevenue: number;
    usersByPlan: {
        free: number;
        pro: number;
        enterprise: number;
    };
}

// Fetch all user profiles for admin
export async function fetchAllUsers(): Promise<{ users: UserProfile[]; error: string | null }> {
    const supabase = createClient();

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching users:', error);
            return { users: [], error: error.message };
        }

        // Transform the data to match our interface
        const users: UserProfile[] = (data || []).map(profile => ({
            id: profile.id,
            email: profile.email || '',
            full_name: profile.full_name,
            plan: profile.plan || 'free',
            status: profile.status || 'active',
            pins_created: profile.pins_created || 0,
            api_calls: profile.api_calls || 0,
            created_at: profile.created_at,
            last_active: profile.last_active || profile.created_at,
        }));

        return { users, error: null };
    } catch (err) {
        console.error('Error in fetchAllUsers:', err);
        return { users: [], error: 'Failed to fetch users' };
    }
}

// Get a single user by ID
export async function fetchUserById(id: string): Promise<{ user: UserProfile | null; error: string | null }> {
    const supabase = createClient();

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return { user: null, error: error.message };
        }

        const user: UserProfile = {
            id: data.id,
            email: data.email || '',
            full_name: data.full_name,
            plan: data.plan || 'free',
            status: data.status || 'active',
            pins_created: data.pins_created || 0,
            api_calls: data.api_calls || 0,
            created_at: data.created_at,
            last_active: data.last_active || data.created_at,
        };

        return { user, error: null };
    } catch (err) {
        return { user: null, error: 'Failed to fetch user' };
    }
}

// Update user status
export async function updateUserStatus(
    userId: string,
    status: 'active' | 'suspended' | 'cancelled'
): Promise<{ success: boolean; error: string | null }> {
    const supabase = createClient();

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ status })
            .eq('id', userId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch (err) {
        return { success: false, error: 'Failed to update user status' };
    }
}

// Update user plan
export async function updateUserPlan(
    userId: string,
    plan: 'free' | 'pro' | 'enterprise'
): Promise<{ success: boolean; error: string | null }> {
    const supabase = createClient();

    try {
        const { error } = await supabase
            .from('profiles')
            .update({ plan })
            .eq('id', userId);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch (err) {
        return { success: false, error: 'Failed to update user plan' };
    }
}

// Get admin metrics
export async function fetchAdminMetrics(): Promise<{ metrics: AdminMetrics; changes: MetricsChanges; error: string | null }> {
    const supabase = createClient();

    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*');

        if (error) {
            return {
                metrics: getEmptyMetrics(),
                changes: getEmptyChanges(),
                error: error.message
            };
        }

        const users = profiles || [];
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
                pro: users.filter(u => u.plan === 'pro').length,
                enterprise: users.filter(u => u.plan === 'enterprise').length,
            },
            monthlyRevenue:
                users.filter(u => u.plan === 'pro').length * 29 +
                users.filter(u => u.plan === 'enterprise').length * 99,
        };

        // Calculate week-over-week changes
        const prevWeekUsers = users.filter(u => u.created_at < weekAgo);
        const newLastWeek = users.filter(u => u.created_at >= twoWeeksAgo && u.created_at < weekAgo).length;

        const changes: MetricsChanges = {
            totalUsersChange: calcChange(metrics.totalUsers, prevWeekUsers.length),
            newThisWeekChange: calcChange(metrics.newThisWeek, newLastWeek),
        };

        return { metrics, changes, error: null };
    } catch (err) {
        return { metrics: getEmptyMetrics(), changes: getEmptyChanges(), error: 'Failed to fetch metrics' };
    }
}

// Calculate percentage change
function calcChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

// Interface for metric changes
export interface MetricsChanges {
    totalUsersChange: number;
    newThisWeekChange: number;
}

// Helper for empty metrics
function getEmptyMetrics(): AdminMetrics {
    return {
        totalUsers: 0,
        activeToday: 0,
        newThisWeek: 0,
        totalPinsCreated: 0,
        totalApiCalls: 0,
        monthlyRevenue: 0,
        usersByPlan: { free: 0, pro: 0, enterprise: 0 },
    };
}

// Helper for empty changes
function getEmptyChanges(): MetricsChanges {
    return {
        totalUsersChange: 0,
        newThisWeekChange: 0,
    };
}

// Increment user's pin count (call this when user creates pins)
export async function incrementPinCount(userId: string, count: number = 1): Promise<void> {
    const supabase = createClient();

    await supabase.rpc('increment_pins', { user_id: userId, amount: count });
}

// Increment user's API call count
export async function incrementApiCallCount(userId: string, count: number = 1): Promise<void> {
    const supabase = createClient();

    await supabase.rpc('increment_api_calls', { user_id: userId, amount: count });
}

// Update last active timestamp
export async function updateLastActive(userId: string): Promise<void> {
    const supabase = createClient();

    await supabase
        .from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userId);
}

// ============================================
// Activity Tracking
// ============================================

export type ActivityType = 'signup' | 'login' | 'pin_created' | 'subscription_change' | 'settings_update';

export interface Activity {
    id: string;
    user_id: string;
    user_email: string;
    type: ActivityType;
    description: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

// Log a new activity
export async function logActivity(
    userId: string,
    userEmail: string,
    type: ActivityType,
    description: string,
    metadata: Record<string, unknown> = {}
): Promise<void> {
    const supabase = createClient();

    try {
        await supabase.from('activities').insert({
            user_id: userId,
            user_email: userEmail,
            type,
            description,
            metadata,
        });
    } catch (err) {
        console.error('Failed to log activity:', err);
    }
}

// Fetch recent activities for admin dashboard
export async function fetchRecentActivities(limit: number = 10): Promise<{ activities: Activity[]; error: string | null }> {
    const supabase = createClient();

    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching activities:', error);
            return { activities: [], error: error.message };
        }

        return { activities: data || [], error: null };
    } catch (err) {
        return { activities: [], error: 'Failed to fetch activities' };
    }
}

// Fetch activities for a specific user
export async function fetchUserActivities(userId: string, limit: number = 10): Promise<{ activities: Activity[]; error: string | null }> {
    const supabase = createClient();

    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching user activities:', error);
            return { activities: [], error: error.message };
        }

        return { activities: data || [], error: null };
    } catch (err) {
        return { activities: [], error: 'Failed to fetch user activities' };
    }
}

// Format relative time for display
export function formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return time.toLocaleDateString();
}

// ============================================
// Daily Stats for Analytics Charts
// ============================================

export interface DailyStat {
    date: string;
    signups: number;
    activeUsers: number;
    pinsCreated: number;
}

// Fetch daily stats for the last 7 days
export async function fetchDailyStats(): Promise<{ stats: DailyStat[]; error: string | null }> {
    const supabase = createClient();

    try {
        // Get last 7 days
        const days: DailyStat[] = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            days.push({
                date: dateStr,
                signups: 0,
                activeUsers: 0,
                pinsCreated: 0
            });
        }

        // Fetch signups (users created in last 7 days)
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data: profiles } = await supabase
            .from('profiles')
            .select('created_at, last_active')
            .gte('created_at', weekAgo.toISOString());

        // Count signups per day
        (profiles || []).forEach(profile => {
            const signupDate = profile.created_at?.split('T')[0];
            const day = days.find(d => d.date === signupDate);
            if (day) day.signups++;
        });

        // Count active users per day (using last_active)
        const { data: allProfiles } = await supabase
            .from('profiles')
            .select('last_active')
            .gte('last_active', weekAgo.toISOString());

        (allProfiles || []).forEach(profile => {
            const activeDate = profile.last_active?.split('T')[0];
            const day = days.find(d => d.date === activeDate);
            if (day) day.activeUsers++;
        });

        // Fetch pins created from activities
        const { data: activities } = await supabase
            .from('activities')
            .select('created_at, type')
            .eq('type', 'pin_created')
            .gte('created_at', weekAgo.toISOString());

        (activities || []).forEach(activity => {
            const activityDate = activity.created_at?.split('T')[0];
            const day = days.find(d => d.date === activityDate);
            if (day) day.pinsCreated++;
        });

        return { stats: days, error: null };
    } catch (err) {
        console.error('Error fetching daily stats:', err);
        return { stats: [], error: 'Failed to fetch daily stats' };
    }
}

