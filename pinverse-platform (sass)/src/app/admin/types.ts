export interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    plan: 'free' | 'starter' | 'pro' | 'promax' | 'enterprise';
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
        starter: number;
        pro: number;
        promax: number;
        enterprise: number;
    };
}

export interface MetricsChanges {
    totalUsersChange: number;
    newThisWeekChange: number;
}

export type ActivityType = 'signup' | 'login' | 'pin_created' | 'subscription_change' | 'settings_update' | 'status_change' | 'account_deletion';

export interface Activity {
    id: string;
    user_id: string;
    user_email: string;
    type: ActivityType;
    description: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

export interface DailyStat {
    date: string;
    signups: number;
    activeUsers: number;
    pinsCreated: number;
}
