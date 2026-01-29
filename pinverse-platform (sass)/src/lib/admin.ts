// Admin configuration and helper functions

// List of admin email addresses - add your email here
export const ADMIN_EMAILS = [
    'admin@pinverse.com',
    'ecomverse25@gmail.com',
];

// Check if a user email is an admin
export function isAdmin(email: string | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Mock customer data for UI development
export interface Customer {
    id: string;
    email: string;
    name: string;
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    signupDate: string;
    lastActive: string;
    pinsCreated: number;
    apiCalls: number;
}

export const MOCK_CUSTOMERS: Customer[] = [
    {
        id: '1',
        email: 'sarah@example.com',
        name: 'Sarah Johnson',
        plan: 'pro',
        status: 'active',
        signupDate: '2025-12-15',
        lastActive: '2026-01-28',
        pinsCreated: 247,
        apiCalls: 1523,
    },
    {
        id: '2',
        email: 'mike@startup.io',
        name: 'Mike Chen',
        plan: 'enterprise',
        status: 'active',
        signupDate: '2025-11-20',
        lastActive: '2026-01-28',
        pinsCreated: 892,
        apiCalls: 4521,
    },
    {
        id: '3',
        email: 'emma@shop.com',
        name: 'Emma Wilson',
        plan: 'pro',
        status: 'active',
        signupDate: '2026-01-05',
        lastActive: '2026-01-27',
        pinsCreated: 89,
        apiCalls: 412,
    },
    {
        id: '4',
        email: 'james@blog.net',
        name: 'James Brown',
        plan: 'free',
        status: 'active',
        signupDate: '2026-01-20',
        lastActive: '2026-01-26',
        pinsCreated: 12,
        apiCalls: 45,
    },
    {
        id: '5',
        email: 'lisa@creative.co',
        name: 'Lisa Martinez',
        plan: 'pro',
        status: 'suspended',
        signupDate: '2025-10-08',
        lastActive: '2026-01-10',
        pinsCreated: 156,
        apiCalls: 823,
    },
    {
        id: '6',
        email: 'david@ecommerce.store',
        name: 'David Lee',
        plan: 'enterprise',
        status: 'active',
        signupDate: '2025-09-15',
        lastActive: '2026-01-28',
        pinsCreated: 1247,
        apiCalls: 8932,
    },
    {
        id: '7',
        email: 'anna@design.agency',
        name: 'Anna Taylor',
        plan: 'pro',
        status: 'cancelled',
        signupDate: '2025-08-22',
        lastActive: '2025-12-15',
        pinsCreated: 234,
        apiCalls: 1102,
    },
    {
        id: '8',
        email: 'chris@marketplace.io',
        name: 'Chris Anderson',
        plan: 'free',
        status: 'active',
        signupDate: '2026-01-25',
        lastActive: '2026-01-28',
        pinsCreated: 5,
        apiCalls: 18,
    },
];

// Mock analytics data
export interface DailyStats {
    date: string;
    signups: number;
    activeUsers: number;
    pinsCreated: number;
}

export const MOCK_DAILY_STATS: DailyStats[] = [
    { date: '2026-01-22', signups: 3, activeUsers: 45, pinsCreated: 156 },
    { date: '2026-01-23', signups: 5, activeUsers: 52, pinsCreated: 203 },
    { date: '2026-01-24', signups: 2, activeUsers: 48, pinsCreated: 178 },
    { date: '2026-01-25', signups: 7, activeUsers: 61, pinsCreated: 245 },
    { date: '2026-01-26', signups: 4, activeUsers: 55, pinsCreated: 198 },
    { date: '2026-01-27', signups: 6, activeUsers: 63, pinsCreated: 267 },
    { date: '2026-01-28', signups: 8, activeUsers: 72, pinsCreated: 312 },
];

// Recent activity for activity feed
export interface Activity {
    id: string;
    type: 'signup' | 'pin_created' | 'subscription_change' | 'login';
    user: string;
    description: string;
    timestamp: string;
}

export const MOCK_ACTIVITIES: Activity[] = [
    { id: '1', type: 'signup', user: 'Chris Anderson', description: 'New user signed up', timestamp: '2 minutes ago' },
    { id: '2', type: 'pin_created', user: 'David Lee', description: 'Created 25 new pins', timestamp: '15 minutes ago' },
    { id: '3', type: 'subscription_change', user: 'Emma Wilson', description: 'Upgraded to Pro plan', timestamp: '1 hour ago' },
    { id: '4', type: 'login', user: 'Mike Chen', description: 'Logged in from new device', timestamp: '2 hours ago' },
    { id: '5', type: 'pin_created', user: 'Sarah Johnson', description: 'Created 12 new pins', timestamp: '3 hours ago' },
    { id: '6', type: 'signup', user: 'New User', description: 'New user signed up', timestamp: '5 hours ago' },
];

// Summary metrics
export function getMetricsSummary() {
    const totalCustomers = MOCK_CUSTOMERS.length;
    const activeToday = MOCK_CUSTOMERS.filter(c => c.lastActive === '2026-01-28').length;
    const newThisWeek = MOCK_CUSTOMERS.filter(c => new Date(c.signupDate) >= new Date('2026-01-22')).length;
    const proUsers = MOCK_CUSTOMERS.filter(c => c.plan === 'pro').length;
    const enterpriseUsers = MOCK_CUSTOMERS.filter(c => c.plan === 'enterprise').length;

    // Mock revenue calculation
    const monthlyRevenue = (proUsers * 29) + (enterpriseUsers * 99);

    return {
        totalCustomers,
        activeToday,
        newThisWeek,
        monthlyRevenue,
        totalPinsCreated: MOCK_CUSTOMERS.reduce((sum, c) => sum + c.pinsCreated, 0),
        totalApiCalls: MOCK_CUSTOMERS.reduce((sum, c) => sum + c.apiCalls, 0),
    };
}
