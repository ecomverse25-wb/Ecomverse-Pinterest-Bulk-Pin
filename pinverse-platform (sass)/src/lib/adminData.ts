import { fetchAdminMetricsAction, fetchDailyStatsAction, fetchAllUsersAction, updateUserStatusAction, logActivityAction, fetchUserActivitiesAction } from "@/app/actions/admin-actions"
import { incrementPinCountAction, updateLastActiveAction } from "@/app/actions/user-actions"


// Re-export types
export * from "@/app/admin/types";

// Types needed if not in admin/types
export interface MetricsChanges {
    totalUsersChange: number;
    newThisWeekChange: number;
}

export const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export async function fetchAdminMetrics() {
    return await fetchAdminMetricsAction();
}

export async function fetchDailyStats() {
    return await fetchDailyStatsAction();
}

export async function fetchUserById(id: string) {
    // Fallback: fetch all and find (temporary until specific action exists)
    const { users, error } = await fetchAllUsersAction();
    if (error) return { user: null, error };

    const user = users.find(u => u.id === id);
    if (!user) return { user: null, error: "User not found" };

    return { user, error: null };
}

export async function updateUserStatus(userId: string, status: 'active' | 'suspended' | 'cancelled') {
    return await updateUserStatusAction(userId, status);
}

export async function fetchUserActivities(userId: string) {
    return await fetchUserActivitiesAction(userId);
}


export async function logActivity(userId: string, email: string, type: any, description: string, metadata: Record<string, unknown> = {}) {
    return await logActivityAction(userId, email, type, description, metadata);
}


export async function incrementPinCount(userId: string) {
    return await incrementPinCountAction(userId);
}

export async function updateLastActive(userId: string) {
    return await updateLastActiveAction(userId);
}

