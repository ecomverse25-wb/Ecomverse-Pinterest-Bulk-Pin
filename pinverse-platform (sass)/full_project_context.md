# Full Project Context

Generated on: 2026-01-31T23:29:10.281Z

## File: package.json
```json
{
  "name": "pinverse-platform",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@google/genai": "^1.38.0",
    "@stripe/stripe-js": "^8.6.4",
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.93.2",
    "file-saver": "^2.0.5",
    "jszip": "^3.10.1",
    "lucide-react": "^0.563.0",
    "mammoth": "^1.11.0",
    "next": "16.1.6",
    "nodemailer": "^7.0.13",
    "papaparse": "^5.5.3",
    "pdfjs-dist": "^5.4.530",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "resend": "^6.9.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/file-saver": "^2.0.7",
    "@types/node": "^20",
    "@types/nodemailer": "^7.0.9",
    "@types/papaparse": "^5.5.2",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "copy-webpack-plugin": "^13.0.1",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

## File: tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}

```

## File: next.config.ts
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // If client-side, copy the PDF worker to the public folder
    if (!isServer) {
      const path = require('path');
      const CopyPlugin = require('copy-webpack-plugin');

      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: path.join(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
              to: path.join(process.cwd(), 'public/pdf.worker.min.mjs'),
            },
          ],
        })
      );
    }
    return config;
  },
};

export default nextConfig;

```

## File: tailwind.config.ts
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
    darkMode: 'class',
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}

export default config

```

## File: .env.example
```example
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

```

## File: postcss.config.mjs
```mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;

```

## File: README.md
```md
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

```

## File: src/app/actions/admin-actions.ts
```ts
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
        const supabase = createSupabaseAdmin(); // Use Admin client to bypass RLS if needed for global stats
        if (!supabase) throw new Error("Supabase Admin client initialization failed");

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
                pro: users.filter(u => u.plan === 'pro').length,
                enterprise: users.filter(u => u.plan === 'enterprise').length,
            },
            monthlyRevenue:
                users.filter(u => u.plan === 'pro').length * 29 +
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
            metrics: { totalUsers: 0, activeToday: 0, newThisWeek: 0, totalPinsCreated: 0, totalApiCalls: 0, monthlyRevenue: 0, usersByPlan: { free: 0, pro: 0, enterprise: 0 } },
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
            plan: (profile.plan as 'free' | 'pro' | 'enterprise') || 'free',
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

export async function updateUserPlanAction(userId: string, plan: 'free' | 'pro' | 'enterprise') {
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

```

## File: src/app/actions/ai-actions.ts
```ts
"use server";

import { GoogleGenAI } from "@google/genai";
import { GeneratedTextResponse, PinConfig } from "@/lib/types";

// We re-implement or wrap the logic from geminiService here for Server Side usage.
// Note: GoogleGenAI SDK works in Node environment.

export async function generateArticleAction(prompt: string, apiKey: string) {
    if (!apiKey) {
        return { error: "API Key is missing." };
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [{ text: prompt }] }
        });

        if (response.text) {
            return { success: true, content: response.text };
        }
        return { error: "No content generated." };
    } catch (error: any) {
        console.error("Server Action Error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        return { error: msg };
    }
}

// We can add the sophisticated Pin Details generation here too if needed later,
// using the same pattern.

```

## File: src/app/actions/analytics-actions.ts
```ts
"use server";

export interface AnalyticsSummary {
    impressions: number;
    saves: number;
    outboundClicks: number;
    engagementRate: number;
}

export interface DailyPerformance {
    date: string;
    impressions: number;
    saves: number;
    clicks: number;
}

export interface TopPin {
    id: string;
    title: string;
    image: string;
    impressions: number;
    saves: number;
    clicks: number;
}

export async function getAnalyticsSummaryAction(): Promise<{ success: boolean; data?: { summary: AnalyticsSummary; daily: DailyPerformance[] }; error?: string }> {
    // Mock Data for User Analytics
    const summary: AnalyticsSummary = {
        impressions: 12500,
        saves: 843,
        outboundClicks: 320,
        engagementRate: 4.5
    };

    // Generate last 7 days mock data
    const daily: DailyPerformance[] = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
            date: date.toISOString(),
            impressions: Math.floor(Math.random() * 2000) + 1000,
            saves: Math.floor(Math.random() * 150) + 50,
            clicks: Math.floor(Math.random() * 50) + 10,
        };
    });

    return { success: true, data: { summary, daily } };
}

export async function getTopPinsAction(): Promise<{ success: boolean; data?: TopPin[]; error?: string }> {
    const mockPins: TopPin[] = [
        {
            id: "1",
            title: "10 Minimalist Bedroom Ideas",
            image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=60",
            impressions: 4500,
            saves: 320,
            clicks: 150
        },
        {
            id: "2",
            title: "How to Style Your Coffee Table",
            image: "https://images.unsplash.com/photo-1550989460-d29b00282470?w=800&auto=format&fit=crop&q=60",
            impressions: 3200,
            saves: 180,
            clicks: 85
        },
        {
            id: "3",
            title: "Summer Capsule Wardrobe Essentials",
            image: "https://images.unsplash.com/photo-1540411183-10bb3298a0d4?w=800&auto=format&fit=crop&q=60",
            impressions: 2800,
            saves: 140,
            clicks: 60
        },
        {
            id: "4",
            title: "Healthy Meal Prep for Beginners",
            image: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=800&auto=format&fit=crop&q=60",
            impressions: 1900,
            saves: 95,
            clicks: 45
        }
    ];

    return { success: true, data: mockPins };
}

```

## File: src/app/actions/pinterest-actions.ts
```ts
"use server";

interface PinterestTrendResponse {
    trends: {
        term: string;
        domain: string;
        growth: number;
    }[];
}

interface PinterestPin {
    id: string;
    title: string;
    description: string;
    image: string;
    link: string;
}

export async function getPinterestTrendsAction(token: string, region: string = "US", trendType: string = "monthly"): Promise<{ success: boolean; data?: PinterestTrendResponse; error?: string }> {
    if (!token) {
        // Mock data for demonstration if no token is provided
        return {
            success: true,
            data: {
                trends: [
                    { term: "luxury minimalist living room", domain: "home_decor", growth: 150 },
                    { term: "sustainable fashion outfits", domain: "fashion", growth: 85 },
                    { term: "healthy meal prep ideas", domain: "food", growth: 120 },
                    { term: "diy backyard oasis", domain: "gardening", growth: 200 },
                    { term: "neutral aesthetic wallpaper", domain: "design", growth: 95 },
                ]
            }
        };
    }

    try {
        // Real API call would go here
        // const response = await fetch(`https://api.pinterest.com/v5/trends/keywords/${region}/top/${trendType}`, {
        //     headers: { Authorization: `Bearer ${token}` }
        // });
        // const data = await response.json();

        // Return mock for now as we don't have a verified robust endpoint without full setup
        return {
            success: true,
            data: {
                trends: [
                    { term: "mock trend 1", domain: "mock", growth: 100 },
                    { term: "mock trend 2", domain: "mock", growth: 50 },
                ]
            }
        };

    } catch (error) {
        return { success: false, error: "Failed to fetch trends" };
    }
}

export async function searchPinterestIdeasAction(token: string, query: string): Promise<{ success: boolean; data?: PinterestPin[]; error?: string }> {
    if (!token) {
        // Mock data
        return {
            success: true,
            data: [
                { id: "1", title: "Modern Home Decor", description: "Minimalist style for your living room", image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?w=800&auto=format&fit=crop&q=60", link: "#" },
                { id: "2", title: "Cozy Bedroom Ideas", description: "Warm tones and soft textures", image: "https://images.unsplash.com/photo-1616594039964-ea82824125a0?w=800&auto=format&fit=crop&q=60", link: "#" },
                { id: "3", title: "Kitchen Organization", description: "Smart storage solutions", image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&auto=format&fit=crop&q=60", link: "#" },
            ]
        };
    }

    try {
        // Placeholder for real search API
        return {
            success: true,
            data: []
        };
    } catch (error) {
        return { success: false, error: "Failed to search pins" };
    }
}

```

## File: src/app/actions/scheduler-actions.ts
```ts
"use server";

export interface ScheduledPin {
    id: string;
    title: string;
    image: string;
    scheduledTime: Date;
    status: 'scheduled' | 'published' | 'failed';
    boardId: string;
}

export async function getScheduledPinsAction(start: Date, end: Date): Promise<{ success: boolean; data?: ScheduledPin[]; error?: string }> {
    // Mock data for now
    const mockPins: ScheduledPin[] = [
        {
            id: "1",
            title: "Summer Living Room Ideas",
            image: "https://images.unsplash.com/photo-1540932296774-7097ea9015c9?w=800&auto=format&fit=crop&q=60",
            scheduledTime: new Date(new Date().setHours(10, 0, 0, 0)), // Today at 10 AM
            status: 'scheduled',
            boardId: "living-room"
        },
        {
            id: "2",
            title: "Minimalist Coffee Setup",
            image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=800&auto=format&fit=crop&q=60",
            scheduledTime: new Date(new Date().setDate(new Date().getDate() + 1)), // Tomorrow
            status: 'scheduled',
            boardId: "coffee-lovers"
        }
    ];

    return { success: true, data: mockPins };
}

export async function schedulePinAction(pinId: string, date: Date): Promise<{ success: boolean; error?: string }> {
    try {
        console.log(`Scheduling pin ${pinId} for ${date.toISOString()}`);
        // In a real app, this would update the database and maybe schedule a cron job
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to schedule pin" };
    }
}

export async function getBestTimesAction(): Promise<{ success: boolean; data?: string[]; error?: string }> {
    // Mock best times based on "analytics"
    return {
        success: true,
        data: ["09:00", "12:00", "17:00", "20:00"]
    };
}

```

## File: src/app/actions/tool-actions.ts
```ts
'use server'

import { createClient } from '@/lib/supabase-server';
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

    const { error } = await supabase
        .from('tools')
        .update({ is_globally_visible: isVisible })
        .eq('id', toolId);

    if (error) throw error;

    revalidatePath('/dashboard/tools');
    revalidatePath('/admin');
}

export async function toggleToolForUser(userId: string, toolId: string, isVisible: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!isAdmin(user?.email)) {
        throw new Error('Unauthorized');
    }

    // Check if entry exists
    const { data: existing } = await supabase
        .from('user_tool_visibility')
        .select('*')
        .eq('user_id', userId)
        .eq('tool_id', toolId)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('user_tool_visibility')
            .update({ is_visible: isVisible })
            .eq('id', existing.id);
        if (error) throw error;
    } else {
        const { error } = await supabase
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

    const { error } = await supabase
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

```

## File: src/app/actions/user-actions.ts
```ts
"use server";

import { createClient } from "@/lib/supabase-server";
import { KeywordCluster, Product } from "@/components/article-writer/types";

// DB Types (Must match database schema)
export interface DBKeywordFile {
    id: string;
    filename: string;
    content: KeywordCluster[];
    created_at: string;
}

export interface DBProduct {
    id: string;
    name: string;
    link: string;
    image: string;
    batch_name: string;
    created_at: string;
}

export interface DBPrompt {
    category: string;
    prompt_text: string;
}

// --- Keywords ---

export async function saveKeywordFileAction(filename: string, content: KeywordCluster[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Auth Error: User not authenticated" };
    }

    const { data, error } = await supabase
        .from('user_keywords')
        .insert({
            user_id: user.id,
            filename,
            content: content
        })
        .select()
        .single();

    if (error) {
        console.error("Save Keyword Error:", error);
        return { error: `DB Error: ${error.message}` };
    }
    return { success: true, data };
}

export async function getUserKeywordsAction() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('user_keywords')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Get Keywords Error:", error);
        return { error: error.message };
    }
    return { success: true, data: data as DBKeywordFile[] };
}

export async function deleteKeywordFileAction(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('user_keywords')
        .delete()
        .eq('id', id);

    if (error) {
        return { error: error.message };
    }
    return { success: true };
}

// --- Products ---

export async function saveProductsAction(products: Product[], batchName: string = "Upload") {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Auth Error: User not logged in." };
    }

    const rows = products.map(p => ({
        user_id: user.id,
        name: p.name,
        link: p.link,
        image: p.image,
        batch_name: batchName
    }));

    const { data, error } = await supabase
        .from('user_products')
        .insert(rows)
        .select();

    if (error) {
        console.error("Save Products Error:", error);
        return { error: `DB Insert Error: ${error.message} (Code: ${error.code})` };
    }
    return { success: true, data };
}

export async function getUserProductBatchesAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Auth Error" };

    // We want to group by batch_name and created_at to show "files"
    // Since we don't have a separate 'batches' table, we can distinct on batch_name/created_at
    // But this depends on exact timestamp matching. 
    // A better approach for the future is a separate table, but for now we'll query all and group in JS or use distinct.

    // Let's rely on the client or a distinct query if possible.
    // Supabase supports .select('batch_name, created_at').distinct()

    // However, knowing how accurate the timestamp is, let's just fetch all mostly-recent products and group them? 
    // Or just simple distinct.

    const { data, error } = await supabase
        .from('user_products')
        .select('batch_name, created_at')
        // We need a way to group. 
        // If we can't do distinct easily without a raw query, we fetch relevant columns 
        // and unique them in JS (not efficient for huge datasets but fine for <1000 rows).
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Get Product Batches Error:", error);
        return { error: error.message };
    }

    // Group by unique batch_name + created_at combinations
    const uniqueBatches = new Map();
    data.forEach((item: any) => {
        const key = `${item.batch_name}-${item.created_at}`;
        if (!uniqueBatches.has(key)) {
            uniqueBatches.set(key, item);
        }
    });

    return { success: true, data: Array.from(uniqueBatches.values()) };
}

export async function getProductsInBatchAction(batchName: string, createdAt: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Auth Error" };

    const { data, error } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', user.id)
        .eq('batch_name', batchName)
        .eq('created_at', createdAt);

    if (error) return { error: error.message };
    return { success: true, data: data as DBProduct[] };
}

export async function deleteProductBatchAction(batchName: string, createdAt: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Auth Error" };

    const { error } = await supabase
        .from('user_products')
        .delete()
        .eq('user_id', user.id)
        .eq('batch_name', batchName)
        .eq('created_at', createdAt);

    if (error) return { error: error.message };
    return { success: true };
}

// --- Prompts ---

export async function savePromptAction(category: string, text: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "User not authenticated" };

    const { error } = await supabase
        .from('user_prompts')
        .upsert({
            user_id: user.id,
            category,
            prompt_text: text,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, category' });

    if (error) {
        return { error: error.message };
    }
    return { success: true };
}

export async function getUserPromptsAction() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('user_prompts')
        .select('category, prompt_text');

    if (error) {
        console.error("Get Prompts Error:", error);
        return { error: error.message, data: [] };
    }
    return { success: true, data: data as DBPrompt[] };
}
// --- User Stats ---

export async function incrementPinCountAction(userId: string) {
    const supabase = await createClient();

    // Remote Procedure Call (RPC) is ideal for increments to handle concurrency,
    // but standard update is fine for this scale if RPC isn't set up.
    // We'll fetch current count and increment.

    const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('pins_created')
        .eq('id', userId)
        .single();

    if (fetchError) return { error: fetchError.message };

    const newCount = (profile?.pins_created || 0) + 1;

    const { error: updateError } = await supabase
        .from('profiles')
        .update({ pins_created: newCount })
        .eq('id', userId);

    if (updateError) return { error: updateError.message };

    return { success: true };
}

export async function updateLastActiveAction(userId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userId);

    if (error) return { error: error.message };
    return { success: true };
}

```

## File: src/app/actions/user-data-actions.ts
```ts
"use server";

import { createClient } from "@/lib/supabase-server"; // Assuming this exists or using createAdminClient
// Ideally we should use the authenticated user's client, but for actions we use server client
import { KeywordCluster, Product, ArticleData } from "@/components/article-writer/types";

// Helper to get authenticated client
async function getSupabaseAuth() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, user };
}

export async function saveUserDataAction(userId: string, key: string, value: any) {
    try {
        const { supabase, user } = await getSupabaseAuth();
        if (!user || user.id !== userId) throw new Error("Unauthorized");

        // We'll use a generic 'user_data' table: id, user_id, key, value (jsonb), updated_at
        // Check if row exists
        const { data: existing } = await supabase
            .from('user_data')
            .select('id')
            .eq('user_id', userId)
            .eq('key', key)
            .single();

        if (existing) {
            await supabase
                .from('user_data')
                .update({ value, updated_at: new Date().toISOString() })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('user_data')
                .insert({ user_id: userId, key, value });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Save Data Error:", error);
        return { success: false, error: error.message };
    }
}

export async function loadUserDataAction(userId: string) {
    try {
        const { supabase, user } = await getSupabaseAuth();
        if (!user || user.id !== userId) throw new Error("Unauthorized");

        const { data } = await supabase
            .from('user_data')
            .select('key, value')
            .eq('user_id', userId);

        const result: { clusters?: KeywordCluster[], products?: Product[], articles?: ArticleData[] } = {};

        if (data) {
            data.forEach((row: any) => {
                if (row.key === 'clusters') result.clusters = row.value;
                if (row.key === 'products') result.products = row.value;
                if (row.key === 'articles') result.articles = row.value;
            });
        }

        return result;
    } catch (error: any) {
        console.error("Load Data Error:", error);
        return {};
    }
}

```

## File: src/app/actions/user-settings-actions.ts
```ts
"use server";

import { createClient } from "@/lib/supabase-server";

export interface UserSettings {
    gemini_api_key?: string;
    replicate_api_key?: string;
    imgbb_api_key?: string;
}

export async function getUserSettingsAction(): Promise<{ settings: UserSettings | null; error: string | null }> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { settings: null, error: "User not authenticated" };
        }

        const { data, error } = await supabase
            .from('user_settings')
            .select('gemini_api_key, replicate_api_key, imgbb_api_key')
            .eq('user_id', user.id)
            .single();

        if (error) {
            // It's acceptable if no settings exist yet
            if (error.code === 'PGRST116') {
                return { settings: null, error: null };
            }
            throw error;
        }

        return { settings: data, error: null };
    } catch (error: any) {
        console.error("Error fetching settings:", error);
        return { settings: null, error: error.message };
    }
}

export async function updateUserSettingsAction(settings: UserSettings) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: "User not authenticated" };
        }

        const { error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: user.id,
                ...settings,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        return { success: true, error: null };
    } catch (error: any) {
        console.error("Error updating settings:", error);
        return { success: false, error: error.message };
    }
}

```

## File: src/app/actions/wp-actions.ts
```ts
"use server";

import { ArticleData, WPCredentials } from "@/components/article-writer/types";

// Server Action for WordPress Publishing
// This avoids CORS issues and hides credentials from the client network (though they are still passed from client state currently).

export async function publishPostAction(article: ArticleData, credentials: WPCredentials) {
    if (!credentials.url || !credentials.user || !credentials.password) {
        return { error: "Missing WordPress credentials." };
    }

    try {
        const auth = btoa(`${credentials.user}:${credentials.password}`);
        const wpUrl = credentials.url.replace(/\/$/, ""); // Remove trailing slash

        const postData = {
            title: article.title,
            content: article.content,
            status: 'draft', // Always draft for safety
            // Optional: categories, tags, author, etc.
        };

        const response = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WordPress API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return { success: true, link: data.link, id: data.id };

    } catch (error: any) {
        console.error("WP Action Error:", error);
        const msg = error instanceof Error ? error.message : "Failed to publish post.";
        return { error: msg };
    }
}

```

## File: src/app/admin/analytics/page.tsx
```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
    TrendingUp,
    Users,
    ImagePlus,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    RefreshCw
} from "lucide-react";
import { fetchAdminMetrics, AdminMetrics, MetricsChanges, fetchDailyStats, DailyStat } from "@/lib/adminData";

export default function AnalyticsPage() {
    const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
    const [changes, setChanges] = useState<MetricsChanges | null>(null);
    const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);

        const [metricsResult, statsResult] = await Promise.all([
            fetchAdminMetrics(),
            fetchDailyStats()
        ]);
        setMetrics(metricsResult.metrics);
        setChanges(metricsResult.changes);
        setDailyStats(statsResult.stats);
        setLastUpdated(new Date());

        if (showRefreshing) setRefreshing(false);
        else setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => loadData(true), 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    if (loading || !metrics) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
            </div>
        );
    }

    // Calculate max values for chart scaling (with minimum of 1 to avoid division by zero)
    const maxSignups = Math.max(1, ...dailyStats.map(d => d.signups));
    const maxActiveUsers = Math.max(1, ...dailyStats.map(d => d.activeUsers));
    const maxPins = Math.max(1, ...dailyStats.map(d => d.pinsCreated));

    // Calculate totals
    const totalSignups = dailyStats.reduce((sum, d) => sum + d.signups, 0);
    const avgActiveUsers = dailyStats.length > 0
        ? Math.round(dailyStats.reduce((sum, d) => sum + d.activeUsers, 0) / dailyStats.length)
        : 0;
    const totalPinsWeek = dailyStats.reduce((sum, d) => sum + d.pinsCreated, 0);
    const avgPinsDay = dailyStats.length > 0
        ? Math.round(totalPinsWeek / dailyStats.length)
        : 0;
    const peakPins = dailyStats.length > 0
        ? Math.max(...dailyStats.map(d => d.pinsCreated))
        : 0;

    return (
        <div className="max-w-7xl mx-auto text-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Analytics</h1>
                    <p className="text-slate-400">Platform performance and usage metrics.</p>
                </div>
                <div className="flex items-center gap-4">
                    {lastUpdated && (
                        <span className="text-xs text-slate-500">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="p-2 rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
                        title="Refresh data"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div
                    className="rounded-xl p-5"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <Users className="w-5 h-5 text-yellow-400" />
                        <span className="flex items-center gap-1 text-sm text-emerald-400">
                            <ArrowUpRight className="w-4 h-4" /> 12%
                        </span>
                    </div>
                    <p className="text-2xl font-bold">{metrics.totalUsers}</p>
                    <p className="text-sm text-slate-400">Total Users</p>
                </div>

                <div
                    className="rounded-xl p-5"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <span className="flex items-center gap-1 text-sm text-emerald-400">
                            <ArrowUpRight className="w-4 h-4" /> 8%
                        </span>
                    </div>
                    <p className="text-2xl font-bold">{metrics.activeToday}</p>
                    <p className="text-sm text-slate-400">Active Today</p>
                </div>

                <div
                    className="rounded-xl p-5"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <ImagePlus className="w-5 h-5 text-blue-400" />
                        <span className="flex items-center gap-1 text-sm text-emerald-400">
                            <ArrowUpRight className="w-4 h-4" /> 23%
                        </span>
                    </div>
                    <p className="text-2xl font-bold">{metrics.totalPinsCreated.toLocaleString()}</p>
                    <p className="text-sm text-slate-400">Total Pins</p>
                </div>

                <div
                    className="rounded-xl p-5"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <Zap className="w-5 h-5 text-purple-400" />
                        <span className="flex items-center gap-1 text-sm text-red-400">
                            <ArrowDownRight className="w-4 h-4" /> 3%
                        </span>
                    </div>
                    <p className="text-2xl font-bold">{metrics.totalApiCalls.toLocaleString()}</p>
                    <p className="text-sm text-slate-400">API Calls</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
                {/* Signups Chart */}
                <div
                    className="rounded-xl p-6"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
                    <h2 className="text-lg font-bold mb-6">Daily Signups</h2>
                    <div className="h-48 flex items-end gap-2">
                        {dailyStats.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full rounded-t-md transition-all hover:opacity-80"
                                    style={{
                                        height: `${(day.signups / maxSignups) * 100}%`,
                                        minHeight: '8px',
                                        background: 'linear-gradient(180deg, #FACC15, #EAB308)'
                                    }}
                                />
                                <span className="text-xs text-slate-500">
                                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid #334155' }}>
                        <span className="text-sm text-slate-400">This Week</span>
                        <span className="text-lg font-bold text-yellow-400">
                            {totalSignups} signups
                        </span>
                    </div>
                </div>

                {/* Active Users Chart */}
                <div
                    className="rounded-xl p-6"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
                    <h2 className="text-lg font-bold mb-6">Daily Active Users</h2>
                    <div className="h-48 flex items-end gap-2">
                        {dailyStats.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <div
                                    className="w-full rounded-t-md transition-all hover:opacity-80"
                                    style={{
                                        height: `${(day.activeUsers / maxActiveUsers) * 100}%`,
                                        minHeight: '8px',
                                        background: 'linear-gradient(180deg, #10B981, #059669)'
                                    }}
                                />
                                <span className="text-xs text-slate-500">
                                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid #334155' }}>
                        <span className="text-sm text-slate-400">Average</span>
                        <span className="text-lg font-bold text-emerald-400">
                            {avgActiveUsers} users/day
                        </span>
                    </div>
                </div>
            </div>

            {/* Pins Created Chart (Full Width) */}
            <div
                className="rounded-xl p-6"
                style={{ background: '#1E293B', border: '1px solid #334155' }}
            >
                <h2 className="text-lg font-bold mb-6">Pins Created (Last 7 Days)</h2>
                <div className="h-48 flex items-end gap-3">
                    {dailyStats.map((day, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <span className="text-xs font-medium text-slate-300">{day.pinsCreated}</span>
                            <div
                                className="w-full rounded-t-md transition-all hover:opacity-80"
                                style={{
                                    height: `${(day.pinsCreated / maxPins) * 100}%`,
                                    minHeight: '8px',
                                    background: 'linear-gradient(180deg, #3B82F6, #2563EB)'
                                }}
                            />
                            <span className="text-xs text-slate-500">
                                {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 grid grid-cols-3 gap-4 text-center" style={{ borderTop: '1px solid #334155' }}>
                    <div>
                        <p className="text-2xl font-bold text-blue-400">
                            {totalPinsWeek.toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-400">Total This Week</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-yellow-400">
                            {avgPinsDay}
                        </p>
                        <p className="text-sm text-slate-400">Daily Average</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-emerald-400">
                            {peakPins}
                        </p>
                        <p className="text-sm text-slate-400">Peak Day</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

```

## File: src/app/admin/customers/page.tsx
```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Search,
    Filter,
    MoreVertical,
    Eye,
    UserX,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Crown,
    CheckCircle,
    XCircle,
    AlertCircle,
    Download,
    Loader2
} from "lucide-react";
import { fetchAllUsersAction, updateUserStatusAction } from "@/app/actions/admin-actions";
import { UserProfile } from "@/app/admin/types";

export default function CustomersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterPlan, setFilterPlan] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const itemsPerPage = 10;

    // Fetch users on mount
    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        const { users: fetchedUsers, error: fetchError } = await fetchAllUsersAction();
        if (fetchError) {
            setError(fetchError);
        } else {
            setUsers(fetchedUsers);
        }
        setLoading(false);
    };

    // Handle status toggle
    const handleStatusToggle = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
        const { success, error } = await updateUserStatusAction(userId, newStatus as 'active' | 'suspended');
        if (success) {
            // Refresh users
            loadUsers();
        } else {
            alert('Failed to update status: ' + error);
        }
        setOpenMenu(null);
    };

    // Filter customers
    const filteredCustomers = users.filter((customer) => {
        const name = customer.full_name || customer.email.split('@')[0];
        const matchesSearch =
            name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPlan = filterPlan === "all" || customer.plan === filterPlan;
        const matchesStatus = filterStatus === "all" || customer.status === filterStatus;
        return matchesSearch && matchesPlan && matchesStatus;
    });

    // Export customers to CSV
    const exportToCSV = () => {
        const headers = ['Name', 'Email', 'Plan', 'Status', 'Signup Date', 'Last Active', 'Pins Created', 'API Calls'];
        const csvContent = [
            headers.join(','),
            ...filteredCustomers.map(c => [
                `"${c.full_name || c.email.split('@')[0]}"`,
                c.email,
                c.plan,
                c.status,
                c.created_at,
                c.last_active,
                c.pins_created,
                c.api_calls
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Pagination
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const paginatedCustomers = filteredCustomers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getPlanBadge = (plan: UserProfile["plan"]) => {
        const styles = {
            free: { bg: "rgba(100, 116, 139, 0.2)", color: "#94A3B8", icon: null },
            pro: { bg: "rgba(250, 204, 21, 0.2)", color: "#FACC15", icon: Crown },
            enterprise: { bg: "rgba(139, 92, 246, 0.2)", color: "#A78BFA", icon: Crown },
        };
        const style = styles[plan];
        return (
            <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize"
                style={{ background: style.bg, color: style.color }}
            >
                {style.icon && <Crown className="w-3 h-3" />}
                {plan}
            </span>
        );
    };

    const getStatusBadge = (status: UserProfile["status"]) => {
        const styles = {
            active: { bg: "rgba(16, 185, 129, 0.2)", color: "#10B981", icon: CheckCircle },
            suspended: { bg: "rgba(245, 158, 11, 0.2)", color: "#F59E0B", icon: AlertCircle },
            cancelled: { bg: "rgba(239, 68, 68, 0.2)", color: "#EF4444", icon: XCircle },
        };
        const style = styles[status];
        return (
            <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize"
                style={{ background: style.bg, color: style.color }}
            >
                <style.icon className="w-3 h-3" />
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400 mb-4">Error loading customers: {error}</p>
                <button
                    onClick={loadUsers}
                    className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg font-medium"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto text-white">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Customers</h1>
                <p className="text-slate-400">Manage and view all customer accounts.</p>
            </div>

            {/* Filters */}
            <div
                className="rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center"
                style={{ background: '#1E293B', border: '1px solid #334155' }}
            >
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                    />
                </div>

                {/* Plan Filter */}
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={filterPlan}
                        onChange={(e) => setFilterPlan(e.target.value)}
                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                        <option value="all">All Plans</option>
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                    </select>
                </div>

                {/* Status Filter */}
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-yellow-400"
                >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                </select>

                {/* Export Button */}
                <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition hover:opacity-90"
                    style={{ background: '#10B981', color: 'white' }}
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            {/* Customer Table */}
            <div
                className="rounded-xl overflow-hidden"
                style={{ background: '#1E293B', border: '1px solid #334155' }}
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: '1px solid #334155' }}>
                                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Customer</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Plan</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Status</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Signup Date</th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Pins Created</th>
                                <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedCustomers.map((customer) => (
                                <tr
                                    key={customer.id}
                                    className="hover:bg-slate-800/50 transition"
                                    style={{ borderBottom: '1px solid #334155' }}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                                                style={{ background: 'linear-gradient(135deg, #FACC15, #10B981)', color: '#0F172A' }}
                                            >
                                                {(customer.full_name || customer.email).charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium">{customer.full_name || customer.email.split('@')[0]}</p>
                                                <p className="text-sm text-slate-400">{customer.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getPlanBadge(customer.plan)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(customer.status)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-300">
                                        {new Date(customer.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-slate-300">
                                        {customer.pins_created.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="relative">
                                            <button
                                                onClick={() => setOpenMenu(openMenu === customer.id ? null : customer.id)}
                                                className="p-2 rounded-lg hover:bg-slate-700 transition"
                                            >
                                                <MoreVertical className="w-5 h-5 text-slate-400" />
                                            </button>

                                            {openMenu === customer.id && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setOpenMenu(null)}
                                                    />
                                                    <div
                                                        className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-xl z-20 py-1"
                                                        style={{ background: '#0F172A', border: '1px solid #334155' }}
                                                    >
                                                        <Link
                                                            href={`/admin/customers/${customer.id}`}
                                                            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-800 transition"
                                                        >
                                                            <Eye className="w-4 h-4 text-slate-400" />
                                                            View Details
                                                        </Link>
                                                        <button
                                                            onClick={() => handleStatusToggle(customer.id, customer.status)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-800 transition text-yellow-400"
                                                        >
                                                            <UserX className="w-4 h-4" />
                                                            {customer.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                                                        </button>
                                                        <button className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-800 transition text-red-400">
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete Account
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderTop: '1px solid #334155' }}
                >
                    <p className="text-sm text-slate-400">
                        Showing {paginatedCustomers.length} of {filteredCustomers.length} customers
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm">
                            Page {currentPage} of {totalPages || 1}
                        </span>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage >= totalPages}
                            className="p-2 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

```

## File: src/app/admin/customers/[id]/page.tsx
```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowLeft,
    Mail,
    Calendar,
    Activity,
    ImagePlus,
    Zap,
    Clock,
    Crown,
    CheckCircle,
    AlertCircle,
    XCircle,
    UserX,
    Trash2,
    RefreshCw,
    Loader2,
    X
} from "lucide-react";
import { fetchUserById, updateUserStatus, UserProfile, fetchUserActivities, Activity as UserActivity, formatRelativeTime } from "@/lib/adminData";
import { updateUserPlanAction, deleteUserAction } from "@/app/actions/admin-actions";

import { getUser } from "@/lib/supabase";

export default function CustomerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const customerId = params.id as string;

    const [customer, setCustomer] = useState<UserProfile | null>(null);
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [adminUser, setAdminUser] = useState<{ email: string } | null>(null);

    // Modal states
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadCustomer();
        // Get admin email for logging
        getUser().then(({ user }) => {
            if (user) setAdminUser({ email: user.email || '' });
        });
    }, [customerId]);

    const loadCustomer = async () => {
        setLoading(true);
        const [userResult, activitiesResult] = await Promise.all([
            fetchUserById(customerId),
            fetchUserActivities(customerId)
        ]);

        if (userResult.error) {
            setError(userResult.error);
        } else {
            setCustomer(userResult.user);
            setActivities(activitiesResult.activities);
        }
        setLoading(false);
    };

    const handleStatusToggle = async () => {
        if (!customer) return;
        setActionLoading(true);
        const newStatus = customer.status === 'suspended' ? 'active' : 'suspended';
        const { success } = await updateUserStatus(customer.id, newStatus as 'active' | 'suspended');
        if (success) {
            await loadCustomer();
        }
        setActionLoading(false);
    };

    const handlePlanChange = async (newPlan: 'free' | 'pro' | 'enterprise') => {
        if (!customer || !adminUser) return;
        setActionLoading(true);
        const result = await updateUserPlanAction(customer.id, newPlan);

        if (result.success) {
            setShowPlanModal(false);
            await loadCustomer();
        } else {
            alert(result.error || 'Failed to update plan');
        }
        setActionLoading(false);
    };

    const handleDeleteAccount = async () => {
        if (!customer || !adminUser) return;
        setActionLoading(true);
        const result = await deleteUserAction(customer.id);

        if (result.success) {
            router.push('/admin/customers');
        } else {
            alert(result.error || 'Failed to delete user');
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
            </div>
        );
    }

    if (error || !customer) {
        return (
            <div className="max-w-4xl mx-auto text-white text-center py-20">
                <h1 className="text-2xl font-bold mb-4">Customer Not Found</h1>
                <p className="text-slate-400 mb-6">The customer you&apos;re looking for doesn&apos;t exist.</p>
                <Link href="/admin/customers" className="btn-primary inline-flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to Customers
                </Link>
            </div>
        );
    }

    const displayName = customer.full_name || customer.email.split('@')[0];

    const daysSinceSignup = Math.floor(
        (new Date().getTime() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const getPlanStyle = (plan: UserProfile["plan"]) => {
        const styles = {
            free: { bg: "rgba(100, 116, 139, 0.2)", color: "#94A3B8", label: "Free Plan" },
            pro: { bg: "rgba(250, 204, 21, 0.2)", color: "#FACC15", label: "Pro Plan" },
            enterprise: { bg: "rgba(139, 92, 246, 0.2)", color: "#A78BFA", label: "Enterprise Plan" },
        };
        return styles[plan];
    };

    const getStatusStyle = (status: UserProfile["status"]) => {
        const styles = {
            active: { bg: "rgba(16, 185, 129, 0.2)", color: "#10B981", icon: CheckCircle, label: "Active" },
            suspended: { bg: "rgba(245, 158, 11, 0.2)", color: "#F59E0B", icon: AlertCircle, label: "Suspended" },
            cancelled: { bg: "rgba(239, 68, 68, 0.2)", color: "#EF4444", icon: XCircle, label: "Cancelled" },
        };
        return styles[status ?? 'active'];
    };

    const planStyle = getPlanStyle(customer.plan);
    const statusStyle = getStatusStyle(customer.status);

    return (
        <div className="max-w-5xl mx-auto text-white">
            {/* Back Button */}
            <Link
                href="/admin/customers"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Customers
            </Link>

            {/* Header */}
            <div
                className="rounded-xl p-6 mb-6"
                style={{ background: '#1E293B', border: '1px solid #334155' }}
            >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg, #FACC15, #10B981)', color: '#0F172A' }}
                    >
                        {displayName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1">
                        <h1 className="text-2xl font-bold mb-2">{displayName}</h1>
                        <div className="flex flex-wrap items-center gap-4 text-slate-400">
                            <span className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                {customer.email}
                            </span>
                            <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Joined {new Date(customer.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <span
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                            style={{ background: planStyle.bg, color: planStyle.color }}
                        >
                            <Crown className="w-4 h-4" />
                            {planStyle.label}
                        </span>
                        <span
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                            style={{ background: statusStyle.bg, color: statusStyle.color }}
                        >
                            <statusStyle.icon className="w-4 h-4" />
                            {statusStyle.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl p-5" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(250, 204, 21, 0.1)' }}>
                            <ImagePlus className="w-5 h-5 text-yellow-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{customer.pins_created.toLocaleString()}</p>
                    <p className="text-sm text-slate-400">Pins Created</p>
                </div>

                <div className="rounded-xl p-5" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                            <Zap className="w-5 h-5 text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{customer.api_calls.toLocaleString()}</p>
                    <p className="text-sm text-slate-400">API Calls</p>
                </div>

                <div className="rounded-xl p-5" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                            <Activity className="w-5 h-5 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{customer.last_active ? new Date(customer.last_active).toLocaleDateString() : 'Never'}</p>
                    <p className="text-sm text-slate-400">Last Active</p>
                </div>

                <div className="rounded-xl p-5" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                            <Clock className="w-5 h-5 text-purple-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{daysSinceSignup}</p>
                    <p className="text-sm text-slate-400">Days Since Signup</p>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Activity Timeline */}
                <div className="rounded-xl p-6" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {activities.length === 0 ? (
                            <p className="text-slate-400 text-sm">No activity recorded yet</p>
                        ) : (
                            activities.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4">
                                    <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2" />
                                    <div className="flex-1">
                                        <p className="text-sm">{activity.description}</p>
                                        <p className="text-xs text-slate-500">{formatRelativeTime(activity.created_at)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Admin Actions */}
                <div className="rounded-xl p-6" style={{ background: '#1E293B', border: '1px solid #334155' }}>
                    <h2 className="text-lg font-bold mb-4">Admin Actions</h2>
                    <div className="space-y-3">
                        <button
                            onClick={() => setShowPlanModal(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition hover:bg-slate-700 text-left"
                            style={{ background: '#0F172A' }}
                        >
                            <RefreshCw className="w-5 h-5 text-blue-400" />
                            <div>
                                <p className="font-medium">Change Plan</p>
                                <p className="text-xs text-slate-400">Upgrade or downgrade subscription</p>
                            </div>
                        </button>
                        <button
                            onClick={handleStatusToggle}
                            disabled={actionLoading}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition hover:bg-slate-700 text-left disabled:opacity-50"
                            style={{ background: '#0F172A' }}
                        >
                            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin text-yellow-400" /> : <UserX className="w-5 h-5 text-yellow-400" />}
                            <div>
                                <p className="font-medium">{customer.status === 'suspended' ? 'Unsuspend Account' : 'Suspend Account'}</p>
                                <p className="text-xs text-slate-400">Temporarily disable access</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition hover:bg-slate-700 text-left"
                            style={{ background: '#0F172A' }}
                        >
                            <Trash2 className="w-5 h-5 text-red-400" />
                            <div>
                                <p className="font-medium text-red-400">Delete Account</p>
                                <p className="text-xs text-slate-400">Permanently remove this user</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Change Plan Modal */}
            {showPlanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-[#1E293B] border border-slate-700 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">Change Customer Plan</h3>
                            <button onClick={() => setShowPlanModal(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {(['free', 'pro', 'enterprise'] as const).map((plan) => (
                                <button
                                    key={plan}
                                    onClick={() => handlePlanChange(plan)}
                                    disabled={actionLoading}
                                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition ${customer.plan === plan
                                        ? 'bg-yellow-400/10 border-yellow-400 text-yellow-400'
                                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Crown className={`w-5 h-5 ${customer.plan === plan ? 'text-yellow-400' : 'text-slate-400'}`} />
                                        <span className="font-bold capitalize">{plan} Plan</span>
                                    </div>
                                    {customer.plan === plan && <CheckCircle className="w-5 h-5" />}
                                </button>
                            ))}
                        </div>
                        {actionLoading && (
                            <div className="mt-4 flex justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-[#1E293B] border border-red-500/30 p-6">
                        <div className="flex items-center gap-3 text-red-400 mb-4">
                            <AlertCircle className="w-6 h-6" />
                            <h3 className="text-xl font-bold">Delete Account?</h3>
                        </div>
                        <p className="text-slate-400 mb-6">
                            Are you sure you want to delete <strong>{displayName}</strong>? This action is permanent and cannot be undone. All data will be lost.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3 rounded-xl font-medium bg-slate-800 hover:bg-slate-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={actionLoading}
                                className="flex-1 py-3 rounded-xl font-medium bg-red-500 hover:bg-red-600 transition flex items-center justify-center gap-2"
                            >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

```

## File: src/app/admin/layout.tsx
```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    BarChart3,
    ArrowLeft,
    Shield,
    Menu,
    X
} from "lucide-react";
import { useState, useEffect } from "react";
import { getUser } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<{ email?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        checkAdminAccess();
    }, []);

    const checkAdminAccess = async () => {
        try {
            const { user, error } = await getUser();
            if (error || !user) {
                router.push("/login");
                return;
            }
            setUser(user);

            // Check if user is admin
            if (!isAdmin(user.email)) {
                router.push("/dashboard");
                return;
            }

            setAuthorized(true);
        } catch (err) {
            router.push("/login");
        } finally {
            setLoading(false);
        }
    };

    const navigation = [
        { name: "Overview", href: "/admin", icon: LayoutDashboard },
        { name: "Customers", href: "/admin/customers", icon: Users },
        { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ];

    const isActive = (href: string) => {
        if (href === "/admin") {
            return pathname === "/admin";
        }
        return pathname.startsWith(href);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
                <div className="text-center">
                    <div className="flex items-center gap-2 mb-4 justify-center">
                        <Shield className="w-8 h-8 text-yellow-400" />
                        <span className="text-2xl font-black text-white">Admin Panel</span>
                    </div>
                    <p className="text-slate-400">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (!authorized) {
        return null;
    }

    return (
        <div className="min-h-screen" style={{ background: '#0F172A' }}>
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Admin themed with accent color */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 z-50 transform transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
                style={{ background: '#0F172A', borderRight: '1px solid #334155' }}
            >
                <div className="p-6" style={{ borderBottom: '1px solid #334155' }}>
                    <div className="flex items-center gap-2">
                        <Shield className="w-6 h-6 text-yellow-400" />
                        <span className="text-xl font-black text-white">Admin</span>
                        <span className="text-xl font-black text-yellow-400">Panel</span>
                    </div>
                </div>

                <nav className="p-4 space-y-1">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive(item.href)
                                ? "text-yellow-400 border"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                }`}
                            style={isActive(item.href) ? {
                                background: 'rgba(250, 204, 21, 0.1)',
                                borderColor: 'rgba(250, 204, 21, 0.2)'
                            } : {}}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4" style={{ borderTop: '1px solid #334155' }}>
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Dashboard
                    </Link>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top bar */}
                <header
                    className="sticky top-0 h-16 backdrop-blur flex items-center justify-between px-6 z-30"
                    style={{
                        background: 'rgba(15, 23, 42, 0.9)',
                        borderBottom: '1px solid #334155'
                    }}
                >
                    <button
                        className="lg:hidden text-slate-400 hover:text-white transition"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        <div className="rounded-full px-4 py-1" style={{
                            background: 'rgba(250, 204, 21, 0.1)',
                            border: '1px solid rgba(250, 204, 21, 0.2)'
                        }}>
                            <span className="text-sm font-medium text-yellow-400">Admin</span>
                        </div>
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                            style={{ background: 'linear-gradient(135deg, #FACC15, #10B981)', color: '#0F172A' }}
                        >
                            {user?.email?.charAt(0).toUpperCase() || "A"}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-6 lg:p-8">
                    {children}
                </main>
            </div>

            {/* Mobile close button */}
            {sidebarOpen && (
                <button
                    className="fixed top-4 right-4 z-50 lg:hidden text-white bg-slate-800 p-2 rounded-lg"
                    onClick={() => setSidebarOpen(false)}
                >
                    <X className="w-6 h-6" />
                </button>
            )}
        </div>
    );
}

```

## File: src/app/admin/page.tsx
```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Users,
    TrendingUp,
    DollarSign,
    Activity as ActivityIcon,
    ArrowUpRight,
    ArrowDownRight,
    UserPlus,
    ImagePlus,
    CreditCard,
    LogIn,
    Loader2,
    RefreshCw
} from "lucide-react";
import { fetchAdminMetricsAction, fetchRecentActivitiesAction } from "@/app/actions/admin-actions";
import { AdminMetrics, MetricsChanges, Activity } from "@/app/admin/types";
import { formatRelativeTime } from "@/app/admin/utils";
import ToolVisibilityManager from "@/components/admin/ToolVisibilityManager";
import { getTools, Tool } from "@/app/actions/tool-actions";

export default function AdminDashboard() {
    const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
    const [changes, setChanges] = useState<MetricsChanges | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [tools, setTools] = useState<Tool[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);

        const [metricsResult, activitiesResult] = await Promise.all([
            fetchAdminMetricsAction(),
            fetchRecentActivitiesAction(5)
        ]);
        if (metricsResult.metrics) {
            setMetrics(metricsResult.metrics);
            setChanges(metricsResult.changes);
        }
        if (activitiesResult.activities) {
            setActivities(activitiesResult.activities);
        }

        // Fetch tools for visibility manager
        const toolsResult = await getTools();
        setTools(toolsResult);

        setLastUpdated(new Date());

        if (showRefreshing) setRefreshing(false);
        else setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => loadData(true), 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'signup':
                return <UserPlus className="w-4 h-4" />;
            case 'pin_created':
                return <ImagePlus className="w-4 h-4" />;
            case 'subscription_change':
                return <CreditCard className="w-4 h-4" />;
            case 'login':
                return <LogIn className="w-4 h-4" />;
            default:
                return <ActivityIcon className="w-4 h-4" />;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'signup':
                return '#10B981';
            case 'pin_created':
                return '#FACC15';
            case 'subscription_change':
                return '#8B5CF6';
            case 'login':
                return '#3B82F6';
            default:
                return '#64748B';
        }
    };

    const formatChange = (change: number) => {
        if (change > 0) return `+${change}%`;
        if (change < 0) return `${change}%`;
        return '0%';
    };

    if (loading || !metrics || !changes) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
            </div>
        );
    }

    const statCards = [
        {
            title: "Total Customers",
            value: metrics.totalUsers.toString(),
            change: formatChange(changes.totalUsersChange),
            trend: changes.totalUsersChange >= 0 ? "up" : "down",
            icon: Users,
            color: "#FACC15",
            bgColor: "rgba(250, 204, 21, 0.1)",
        },
        {
            title: "Active Today",
            value: metrics.activeToday.toString(),
            change: "+0%",
            trend: "up",
            icon: ActivityIcon,
            color: "#10B981",
            bgColor: "rgba(16, 185, 129, 0.1)",
        },
        {
            title: "New This Week",
            value: metrics.newThisWeek.toString(),
            change: formatChange(changes.newThisWeekChange),
            trend: changes.newThisWeekChange >= 0 ? "up" : "down",
            icon: UserPlus,
            color: "#3B82F6",
            bgColor: "rgba(59, 130, 246, 0.1)",
        },
        {
            title: "Monthly Revenue",
            value: `$${metrics.monthlyRevenue}`,
            change: "+0%",
            trend: "up",
            icon: DollarSign,
            color: "#8B5CF6",
            bgColor: "rgba(139, 92, 246, 0.1)",
        },
    ];

    return (
        <div className="max-w-7xl mx-auto text-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                    <p className="text-slate-400">Welcome back! Here&apos;s what&apos;s happening with your platform.</p>
                </div>
                <div className="flex items-center gap-4">
                    {lastUpdated && (
                        <span className="text-xs text-slate-500">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="p-2 rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
                        title="Refresh data"
                    >
                        <RefreshCw className={`w-5 h-5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((stat) => (
                    <div
                        key={stat.title}
                        className="rounded-xl p-5"
                        style={{ background: '#1E293B', border: '1px solid #334155' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ background: stat.bgColor }}
                            >
                                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                            </div>
                            <span
                                className={`flex items-center gap-1 text-sm ${stat.trend === "up" ? "text-emerald-400" : "text-red-400"
                                    }`}
                            >
                                {stat.trend === "up" ? (
                                    <ArrowUpRight className="w-4 h-4" />
                                ) : (
                                    <ArrowDownRight className="w-4 h-4" />
                                )}
                                {stat.change}
                            </span>
                        </div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-sm text-slate-400">{stat.title}</p>
                    </div>
                ))}
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div
                    className="rounded-xl p-6"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold">Recent Activity</h2>
                        <Link href="/admin/analytics" className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                            View all <ArrowUpRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {activities.length === 0 ? (
                            <p className="text-slate-400 text-sm">No recent activity</p>
                        ) : (
                            activities.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4">
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `${getActivityColor(activity.type)}20` }}
                                    >
                                        <span style={{ color: getActivityColor(activity.type) }}>
                                            {getActivityIcon(activity.type)}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">
                                            {activity.user_email?.split('@')[0] || 'User'}
                                        </p>
                                        <p className="text-sm text-slate-400 truncate">{activity.description}</p>
                                    </div>
                                    <span className="text-xs text-slate-500 shrink-0">
                                        {formatRelativeTime(activity.created_at)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Platform Usage */}
                <div
                    className="rounded-xl p-6"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
                    <h2 className="text-lg font-bold mb-6">Platform Usage</h2>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-400">Total Pins Created</span>
                                <span className="font-medium">{metrics.totalPinsCreated.toLocaleString()}</span>
                            </div>
                            <div className="h-2 rounded-full" style={{ background: '#0F172A' }}>
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${Math.min((metrics.totalPinsCreated / 1000) * 100, 100)}%`,
                                        background: 'linear-gradient(90deg, #EF4444, #F97316)'
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-400">Total API Calls</span>
                                <span className="font-medium">{metrics.totalApiCalls.toLocaleString()}</span>
                            </div>
                            <div className="h-2 rounded-full" style={{ background: '#0F172A' }}>
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${Math.min((metrics.totalApiCalls / 5000) * 100, 100)}%`,
                                        background: 'linear-gradient(90deg, #10B981, #34D399)'
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-slate-400">Active Users Rate</span>
                                <span className="font-medium">
                                    {metrics.totalUsers > 0 ? Math.round((metrics.activeToday / metrics.totalUsers) * 100) : 0}%
                                </span>
                            </div>
                            <div className="h-2 rounded-full" style={{ background: '#0F172A' }}>
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${metrics.totalUsers > 0 ? (metrics.activeToday / metrics.totalUsers) * 100 : 0}%`,
                                        background: 'linear-gradient(90deg, #3B82F6, #60A5FA)'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4" style={{ borderTop: '1px solid #334155' }}>
                        <p className="text-sm text-slate-400 mb-3">Quick Actions</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                href="/admin/customers"
                                className="px-4 py-3 rounded-lg text-center font-medium transition hover:opacity-80"
                                style={{ background: '#0F172A' }}
                            >
                                <Users className="w-4 h-4 inline-block mr-2" />
                                View Customers
                            </Link>
                            <Link
                                href="/admin/analytics"
                                className="px-4 py-3 rounded-lg text-center font-medium transition hover:opacity-80"
                                style={{ background: '#0F172A' }}
                            >
                                <TrendingUp className="w-4 h-4 inline-block mr-2" />
                                Analytics
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tool Visibility Manager */}
            <div className="mt-8">
                <ToolVisibilityManager initialTools={tools} />
            </div>
        </div>
    );
}

```

## File: src/app/admin/types.ts
```ts
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

```

## File: src/app/admin/utils.ts
```ts
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

```

## File: src/app/contact/actions.ts
```ts
"use server";

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    },
});

export async function sendContactEmail(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;

    if (!name || !email || !subject || !message) {
        return { success: false, error: 'All fields are required' };
    }

    try {
        console.log("Attempting to send email via SMTP...");

        // Verify connection configuration
        // await transporter.verify(); // Optional: good for debugging startup, but might slow down request

        const info = await transporter.sendMail({
            from: `"PinVerse Support" <${process.env.SMTP_USER}>`, // sender address
            to: "ecomverse25@gmail.com", // list of receivers
            replyTo: email, // Reply to the customer
            subject: `[PinVerse Contact] ${subject} - ${name}`, // Subject line
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <blockquote style="background: #f4f4f5; padding: 10px; border-left: 4px solid #facc15;">
                    ${message.replace(/\n/g, '<br/>')}
                </blockquote>
            `,
        });

        console.log("SMTP Message sent: %s", info.messageId);
        return { success: true };

    } catch (error: any) {
        console.error('SMTP Email sending failed:', error);
        return { success: false, error: 'Failed to send message: ' + (error.message || 'Unknown error') };
    }
}

```

## File: src/app/contact/page.tsx
```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle, AlertCircle } from "lucide-react";
import { sendContactEmail } from "./actions";

export default function ContactPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);

        try {
            const result = await sendContactEmail(formData);

            if (result.success) {
                setIsSubmitted(true);
            } else {
                setError(result.error || "Something went wrong.");
            }
        } catch (err) {
            setError("An unexpected error occurred.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A]">
            {/* Header */}
            <nav className="border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl font-black text-white">Pin</span>
                        <span className="text-xl font-black text-yellow-400">Verse</span>
                    </Link>
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
                    <p className="text-slate-400 max-w-xl mx-auto">Have a question or need help? We&apos;re here for you. Send us a message and we&apos;ll respond as soon as possible.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Contact Info */}
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-yellow-400/10 rounded-xl flex items-center justify-center">
                                    <Mail className="w-6 h-6 text-yellow-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium">Email Support</h3>
                                    <a href="mailto:support@pinverse.io" className="text-yellow-400 hover:underline">support@pinverse.io</a>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-400/10 rounded-xl flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium">Response Time</h3>
                                    <p className="text-slate-400">Within 24-48 hours</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <h3 className="text-white font-medium mb-2">Business Address</h3>
                            <p className="text-slate-400">
                                Ecomverse LLC<br />
                                United States
                            </p>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                        {isSubmitted ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Message Sent!</h2>
                                <p className="text-slate-400">Thank you for contacting us. We&apos;ll get back to you soon.</p>
                                <button
                                    onClick={() => setIsSubmitted(false)}
                                    className="mt-6 text-sm text-yellow-400 hover:text-yellow-300 underline"
                                >
                                    Send another message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        placeholder="John Doe"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        placeholder="you@example.com"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                                    <select
                                        name="subject"
                                        required
                                        defaultValue=""
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                                    >
                                        <option value="" disabled>Select a topic</option>
                                        <option value="General Inquiry">General Inquiry</option>
                                        <option value="Technical Support">Technical Support</option>
                                        <option value="Billing Question">Billing Question</option>
                                        <option value="Feature Request">Feature Request</option>
                                        <option value="Partnership">Partnership</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                                    <textarea
                                        name="message"
                                        required
                                        rows={5}
                                        placeholder="How can we help you?"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? "Sending..." : (
                                        <>
                                            <Send className="w-4 h-4" /> Send Message
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-8 mt-12">
                <div className="max-w-4xl mx-auto px-6 text-center text-slate-500 text-sm">
                    © 2025 Ecomverse LLC. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

```

## File: src/app/dashboard/account/page.tsx
```tsx
"use client";

import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, ExternalLink, Check } from "lucide-react";
import { getUser } from "@/lib/supabase";
import { getUserSettingsAction, updateUserSettingsAction } from "@/app/actions/user-settings-actions";

export default function AccountPage() {
    const [userEmail, setUserEmail] = useState("");
    const [geminiKey, setGeminiKey] = useState("");
    const [replicateKey, setReplicateKey] = useState("");
    const [imgbbKey, setImgbbKey] = useState("");
    const [showKeys, setShowKeys] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Load user and API keys on mount
    useEffect(() => {
        const loadData = async () => {
            // Get user email
            const { user } = await getUser();
            if (user?.email) {
                setUserEmail(user.email);
            }

            // Load API keys from Database
            const { settings, error } = await getUserSettingsAction();
            if (settings) {
                setGeminiKey(settings.gemini_api_key || '');
                setReplicateKey(settings.replicate_api_key || '');
                setImgbbKey(settings.imgbb_api_key || '');
            } else if (error) {
                console.error("Failed to load settings:", error);
            }
        };

        loadData();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);

        const { success, error } = await updateUserSettingsAction({
            gemini_api_key: geminiKey,
            replicate_api_key: replicateKey,
            imgbb_api_key: imgbbKey
        });

        if (!success) {
            alert("Failed to save settings: " + error);
            setIsSaving(false);
            return;
        }

        // Update functionality in real-time by updating localStorage as fallback/cache or just relying on DB? 
        // For now, let's keep localStorage as a cache/backup if we want to avoid breaking changes in other components abruptly, 
        // BUT the goal is migration. Let's assume other components might need updates if they read from localStorage.
        // We will remove localStorage writing here to enforce DB usage, but checking where else these keys are read is important.

        // Clearing potentially stale localStorage items to avoid confusion
        localStorage.removeItem('pinverse_google_api_key');
        localStorage.removeItem('pinverse_replicate_api_key');
        localStorage.removeItem('pinverse_imgbb_api_key');

        setSaved(true);
        setIsSaving(false);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="max-w-2xl" style={{ color: 'var(--foreground)' }}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
                <p style={{ color: 'var(--muted)' }}>Manage your profile and API keys.</p>
            </div>

            {/* Profile Section */}
            <div
                className="rounded-xl p-6 mb-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
                <h2 className="text-lg font-bold mb-4">Profile</h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)', opacity: 0.9 }}>Email</label>
                        <input
                            type="email"
                            value={userEmail || "Loading..."}
                            disabled
                            className="w-full rounded-lg px-4 py-3 cursor-not-allowed"
                            style={{ background: 'var(--secondary)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)', opacity: 0.9 }}>Subscription</label>
                        <div className="flex items-center gap-3">
                            <span
                                className="px-4 py-2 rounded-lg font-medium"
                                style={{ background: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.2)', color: 'var(--primary)' }}
                            >
                                Pro Plan
                            </span>
                            <a href="/dashboard/billing" className="hover:underline text-sm" style={{ color: 'var(--primary)' }}>
                                Manage subscription
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* API Keys Section */}
            <div
                className="rounded-xl p-6 mb-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">API Keys</h2>
                    <button
                        onClick={() => setShowKeys(!showKeys)}
                        className="text-sm flex items-center gap-2 transition hover:opacity-80"
                        style={{ color: 'var(--muted)' }}
                    >
                        {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showKeys ? "Hide" : "Show"} Keys
                    </button>
                </div>

                <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                    Add your API keys to enable AI-powered features. Your keys are stored locally in your browser and only used to make API calls on your behalf.
                </p>

                <div className="space-y-5">
                    {/* Google Gemini */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.9 }}>Google Gemini API Key</label>
                            <a
                                href="https://aistudio.google.com/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-xs flex items-center gap-1"
                                style={{ color: 'var(--primary)' }}
                            >
                                Get Key <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        <input
                            type={showKeys ? "text" : "password"}
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="AIza..."
                            className="w-full rounded-lg px-4 py-3 outline-none transition"
                            style={{
                                background: 'var(--secondary)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)'
                            }}
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Required for AI content generation</p>
                    </div>

                    {/* Replicate */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.9 }}>Replicate API Key (Optional)</label>
                            <a
                                href="https://replicate.com/account/api-tokens"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-xs flex items-center gap-1"
                                style={{ color: 'var(--primary)' }}
                            >
                                Get Key <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        <input
                            type={showKeys ? "text" : "password"}
                            value={replicateKey}
                            onChange={(e) => setReplicateKey(e.target.value)}
                            placeholder="r8_..."
                            className="w-full rounded-lg px-4 py-3 outline-none transition"
                            style={{
                                background: 'var(--secondary)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)'
                            }}
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>For advanced image models (FLUX, SDXL)</p>
                    </div>

                    {/* ImgBB */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.9 }}>ImgBB API Key (Optional)</label>
                            <a
                                href="https://api.imgbb.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-xs flex items-center gap-1"
                                style={{ color: 'var(--primary)' }}
                            >
                                Get Key <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        <input
                            type={showKeys ? "text" : "password"}
                            value={imgbbKey}
                            onChange={(e) => setImgbbKey(e.target.value)}
                            placeholder="b80aeb48..."
                            className="w-full rounded-lg px-4 py-3 outline-none transition"
                            style={{
                                background: 'var(--secondary)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)'
                            }}
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>For image hosting in CSV exports (100% free)</p>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
                {isSaving ? "Saving..." : saved ? (
                    <>
                        <Check className="w-4 h-4" /> Saved!
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4" /> Save Changes
                    </>
                )}
            </button>
        </div>
    );
}


```

## File: src/app/dashboard/billing/page.tsx
```tsx
"use client";

import { useState } from "react";
import { Check, CreditCard, Download } from "lucide-react";

export default function BillingPage() {
    const [couponCode, setCouponCode] = useState("");
    const [couponApplied, setCouponApplied] = useState(false);

    const applyCoupon = () => {
        if (couponCode.toUpperCase() === "ECOMVERSE100") {
            setCouponApplied(true);
        }
    };

    const invoices = [
        { id: "INV-001", date: "Jan 28, 2025", amount: "$59.00", status: "Paid" },
        { id: "INV-002", date: "Dec 28, 2024", amount: "$59.00", status: "Paid" },
    ];

    return (
        <div className="max-w-2xl" style={{ color: 'var(--foreground)' }}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Billing</h1>
                <p style={{ color: 'var(--muted)' }}>Manage your subscription and payment methods.</p>
            </div>

            {/* Current Plan */}
            <div
                className="rounded-xl p-6 mb-6"
                style={{
                    background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.08), rgba(16, 185, 129, 0.08))',
                    border: '1px solid rgba(250, 204, 21, 0.2)'
                }}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Current Plan</p>
                        <h2 className="text-2xl font-bold mb-2">Pro Plan</h2>
                        <p style={{ color: 'var(--foreground)', opacity: 0.8 }}>$59/month • Renews on Feb 28, 2025</p>
                    </div>
                    <div className="text-white text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--accent)' }}>
                        ACTIVE
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button className="btn-secondary text-sm">
                        Change Plan
                    </button>
                    <button className="text-sm transition hover:opacity-80" style={{ color: '#EF4444' }}>
                        Cancel Subscription
                    </button>
                </div>
            </div>

            {/* Plan Features */}
            <div
                className="rounded-xl p-6 mb-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
                <h3 className="text-lg font-bold mb-4">Your Plan Includes</h3>
                <ul className="space-y-3">
                    <li className="flex items-center gap-3" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
                        <Check className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        All tools access
                    </li>
                    <li className="flex items-center gap-3" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
                        <Check className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        Unlimited pins
                    </li>
                    <li className="flex items-center gap-3" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
                        <Check className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        Priority support
                    </li>
                    <li className="flex items-center gap-3" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
                        <Check className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        Early access to new tools
                    </li>
                </ul>
            </div>

            {/* Payment Method */}
            <div
                className="rounded-xl p-6 mb-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
                <h3 className="text-lg font-bold mb-4">Payment Method</h3>
                <div
                    className="flex items-center gap-4 p-4 rounded-lg"
                    style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
                >
                    <div className="w-12 h-8 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB, #60A5FA)' }}>
                        <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>Expires 12/26</p>
                    </div>
                    <button className="ml-auto hover:underline text-sm" style={{ color: 'var(--primary)' }}>
                        Update
                    </button>
                </div>
            </div>

            {/* Coupon Code */}
            <div
                className="rounded-xl p-6 mb-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
                <h3 className="text-lg font-bold mb-4">Apply Coupon</h3>
                {couponApplied ? (
                    <div
                        className="rounded-lg p-4 flex items-center gap-3"
                        style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                    >
                        <Check className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        <span style={{ color: 'var(--accent)' }}>Ecomverse member discount applied! Your next billing will be $0.</span>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Enter coupon code"
                            className="flex-1 rounded-lg px-4 py-3 outline-none transition"
                            style={{
                                background: 'var(--secondary)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)'
                            }}
                        />
                        <button onClick={applyCoupon} className="btn-primary">
                            Apply
                        </button>
                    </div>
                )}
            </div>

            {/* Invoice History */}
            <div
                className="rounded-xl p-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
                <h3 className="text-lg font-bold mb-4">Invoice History</h3>
                <div className="space-y-3">
                    {invoices.map((invoice) => (
                        <div
                            key={invoice.id}
                            className="flex items-center justify-between p-4 rounded-lg"
                            style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
                        >
                            <div>
                                <p className="font-medium">{invoice.id}</p>
                                <p className="text-sm" style={{ color: 'var(--muted)' }}>{invoice.date}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span>{invoice.amount}</span>
                                <span className="text-sm" style={{ color: 'var(--accent)' }}>{invoice.status}</span>
                                <button className="transition hover:opacity-80" style={{ color: 'var(--muted)' }}>
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


```

## File: src/app/dashboard/layout.tsx
```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Wrench, Settings, CreditCard, LogOut, Menu, X, Sun, Moon, Shield, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { getUser, signOut } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";
import { useTheme } from "@/components/ThemeProvider";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<{ email?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const { user, error } = await getUser();
            if (error || !user) {
                router.push("/login");
                return;
            }
            setUser(user);
        } catch (err) {
            router.push("/login");
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/login");
    };

    const navigation = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Tools", href: "/dashboard/tools", icon: Wrench },
        { name: "Account", href: "/dashboard/account", icon: Settings },
        { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
    ];

    const isActive = (href: string) => {
        if (href === "/dashboard") {
            return pathname === "/dashboard";
        }
        return pathname.startsWith(href);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
                <div className="text-center">
                    <div className="flex items-center gap-2 mb-4 justify-center">
                        <span className="text-2xl font-black" style={{ color: 'var(--foreground)' }}>Pin</span>
                        <span className="text-2xl font-black" style={{ color: 'var(--primary)' }}>Verse</span>
                    </div>
                    <p style={{ color: 'var(--muted)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen transition-colors" style={{ background: 'var(--background)' }}>
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Stays dark navy in both modes for brand consistency */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 z-50 transform transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
                style={{ background: '#0F172A', borderRight: '1px solid #334155' }}
            >
                <div className="p-6" style={{ borderBottom: '1px solid #334155' }}>
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl font-black text-white">Pin</span>
                        <span className="text-2xl font-black" style={{ color: 'var(--primary)' }}>Verse</span>
                    </Link>
                </div>

                <nav className="p-4 space-y-1">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive(item.href)
                                ? "text-yellow-400 border"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                }`}
                            style={isActive(item.href) ? {
                                background: 'rgba(250, 204, 21, 0.1)',
                                borderColor: 'rgba(250, 204, 21, 0.2)'
                            } : {}}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4" style={{ borderTop: '1px solid #334155' }}>
                    {/* Admin Panel Link - Only visible to admins */}
                    {isAdmin(user?.email) && (
                        <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-3 mb-2 text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition border border-yellow-400/20"
                        >
                            <Shield className="w-5 h-5" />
                            Admin Panel
                        </Link>
                    )}
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top bar */}
                <header
                    className="sticky top-0 h-16 backdrop-blur flex items-center justify-between px-6 z-30"
                    style={{
                        background: 'var(--header)',
                        borderBottom: '1px solid var(--border)'
                    }}
                >
                    <button
                        className="lg:hidden hover:text-white transition"
                        style={{ color: 'var(--muted)' }}
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        {/* Theme Toggle */}
                        <div className="flex items-center rounded-lg p-1" style={{ background: 'var(--secondary)' }}>
                            <button
                                onClick={() => theme !== 'light' && toggleTheme()}
                                className={`p-2 rounded-md transition-all flex items-center gap-1 ${theme === 'light'
                                    ? 'shadow-sm'
                                    : 'hover:opacity-80'
                                    }`}
                                style={theme === 'light' ? {
                                    background: 'var(--card)',
                                    color: 'var(--primary)'
                                } : {
                                    color: 'var(--muted)'
                                }}
                                title="Light Mode"
                            >
                                <Sun className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => theme !== 'dark' && toggleTheme()}
                                className={`p-2 rounded-md transition-all flex items-center gap-1 ${theme === 'dark'
                                    ? 'shadow-sm'
                                    : 'hover:opacity-80'
                                    }`}
                                style={theme === 'dark' ? {
                                    background: 'var(--card)',
                                    color: 'var(--accent)'
                                } : {
                                    color: 'var(--muted)'
                                }}
                                title="Dark Mode"
                            >
                                <Moon className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="rounded-full px-4 py-1" style={{
                            background: 'rgba(250, 204, 21, 0.1)',
                            border: '1px solid rgba(250, 204, 21, 0.2)'
                        }}>
                            <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Pro Plan</span>
                        </div>
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                            style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#0F172A' }}
                        >
                            {user?.email?.charAt(0).toUpperCase() || "U"}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-6 lg:p-8">
                    {children}
                </main>
            </div>

            {/* Mobile close button */}
            {sidebarOpen && (
                <button
                    className="fixed top-4 right-4 z-50 lg:hidden text-white bg-slate-800 p-2 rounded-lg"
                    onClick={() => setSidebarOpen(false)}
                >
                    <X className="w-6 h-6" />
                </button>
            )}
        </div>
    );
}

```

## File: src/app/dashboard/page.tsx
```tsx
"use client";

import Link from "next/link";
import { TrendingUp, Clock, Wrench, Settings, ArrowRight } from "lucide-react";

export default function DashboardPage() {
    return (
        <div className="max-w-6xl mx-auto" style={{ color: 'var(--foreground)' }}>
            {/* Welcome Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
                <p style={{ color: 'var(--muted)' }}>Here's an overview of your PinVerse activity.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div
                    className="rounded-xl p-6 shadow-sm"
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(250, 204, 21, 0.1)' }}>
                            <Wrench className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Active</span>
                    </div>
                    <p className="text-3xl font-bold mb-1">1</p>
                    <p style={{ color: 'var(--muted)' }} className="text-sm">Available Tools</p>
                </div>

                <div
                    className="rounded-xl p-6 shadow-sm"
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                            <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold mb-1">0</p>
                    <p style={{ color: 'var(--muted)' }} className="text-sm">Pins Created This Month</p>
                </div>

                <div
                    className="rounded-xl p-6 shadow-sm"
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(250, 204, 21, 0.1)' }}>
                            <Clock className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold mb-1">Pro</p>
                    <p style={{ color: 'var(--muted)' }} className="text-sm">Current Plan</p>
                </div>
            </div>

            {/* Quick Actions */}
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
                <Link
                    href="/dashboard/tools"
                    className="rounded-xl p-6 flex items-center justify-between group transition hover:shadow-lg"
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div>
                        <h3 className="font-semibold mb-1" style={{ color: 'var(--primary)' }}>Go to Tools</h3>
                        <p style={{ color: 'var(--muted)' }} className="text-sm">Access your Pinterest marketing tools</p>
                    </div>
                    <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition" style={{ color: 'var(--primary)' }} />
                </Link>
                <Link
                    href="/dashboard/account"
                    className="rounded-xl p-6 flex items-center justify-between group transition hover:shadow-lg"
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div>
                        <h3 className="font-semibold mb-1">Account Settings</h3>
                        <p style={{ color: 'var(--muted)' }} className="text-sm">Manage your API keys and profile</p>
                    </div>
                    <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition" style={{ color: 'var(--muted)' }} />
                </Link>
            </div>

            {/* Getting Started Section */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)'
                }}
            >
                <h2 className="text-xl font-bold mb-4">Getting Started</h2>
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'var(--primary)', color: '#0F172A' }}>1</div>
                        <div>
                            <h3 className="font-medium">Add Your API Keys</h3>
                            <p style={{ color: 'var(--muted)' }} className="text-sm">Go to Account Settings and add your <span style={{ color: 'var(--accent)' }}>Google Gemini API</span> key to enable AI features.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'var(--primary)', color: '#0F172A' }}>2</div>
                        <div>
                            <h3 className="font-medium">Create Your First Pins</h3>
                            <p style={{ color: 'var(--muted)' }} className="text-sm">Use the <span style={{ color: 'var(--accent)' }}>Bulk Pin Creator</span> to generate stunning pins from your URLs.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'var(--primary)', color: '#0F172A' }}>3</div>
                        <div>
                            <h3 className="font-medium">Export to Pinterest</h3>
                            <p style={{ color: 'var(--muted)' }} className="text-sm">Use the <span style={{ color: 'var(--accent)' }}>CSV Editor</span> to schedule and bulk upload your pins to Pinterest.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


```

## File: src/app/dashboard/tools/analytics/page.tsx
```tsx
import { Metadata } from "next";
import AnalyticsTool from "@/components/analytics/AnalyticsTool";

export const metadata: Metadata = {
    title: "Analytics Dashboard | PinVerse",
    description: "Track your Pinterest performance with detailed analytics.",
};

export default function AnalyticsPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                    Analytics Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                    Insights into how your content is performing on Pinterest.
                </p>
            </div>

            <AnalyticsTool />
        </div>
    );
}

```

## File: src/app/dashboard/tools/article-writer/page.tsx
```tsx
import { Metadata } from "next";
import ArticleWriterTool from "@/components/article-writer/ArticleWriterTool";

export const metadata: Metadata = {
    title: "PinVerse Master Writer | PinVerse",
    description: "AI-powered SEO Article & Pin Generator",
};

export default function ArticleWriterPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
                    PinVerse Master Writer
                </h1>
                <p className="text-muted-foreground mt-2">
                    Turn keywords into SEO articles and Pinterest assets in 3 simple steps.
                </p>
            </div>

            <ArticleWriterTool />
        </div>
    );
}

```

## File: src/app/dashboard/tools/bulk-pin-creator/page.tsx
```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Image, Download, Trash2, FileText, Table, Sparkles, Settings } from 'lucide-react';
import { PinData, PinConfig, CSVSettings } from '@/lib/types';
import { generatePinDetails, generatePinImage, regeneratePinText, editPinImage } from '@/lib/geminiService';
import { getUser } from '@/lib/supabase';
import { logActivity, incrementPinCount, updateLastActive } from '@/lib/adminData';
import InputSection from '@/components/bulk-pin/InputSection';
import PinCard from '@/components/bulk-pin/PinCard';
import CSVEditor from '@/components/bulk-pin/CSVEditor';
import ChatBot from '@/components/bulk-pin/ChatBot';
import { getUserSettingsAction, updateUserSettingsAction } from "@/app/actions/user-settings-actions";
import SettingsModal from '@/components/bulk-pin/SettingsModal';

const DEFAULT_TEXT_RULES = `You're a Pinterest content writer optimizing for maximum search visibility and clicks.
Write: 1. A Pinterest title (under 80 characters) starting with an emoji and including the main keyword
2. A Pinterest description (EXACTLY 3 sentences) that clearly summarizes the post
CRITICAL: Target Keyword must appear in the first sentence. Include 3-4 searchable SEO keywords naturally.`;

const DEFAULT_IMAGE_RULES = `Create a visual prompt for a high-converting, vibrant Pinterest pin.
1. IMAGE: High-quality, eye-catching, and contextually relevant
2. TYPOGRAPHY: Include the title "{title}" in a bold, readable font
3. STYLE: Creative, "Poster Style", colorful but professional.`;

const DEFAULT_CONFIG: PinConfig = {
    style: 'basic_bottom', ratio: '9:16', model: 'gemini-2.5-flash-image', contentType: 'article',
    websiteUrl: '', referenceImages: [], imageSize: '1K', logoData: undefined, logoPosition: 'bottom-right',
    logoSize: 20, ctaText: '', ctaColor: '#E60023', ctaTextColor: '#FFFFFF', ctaPosition: 'bottom-center'
};

export default function BulkPinCreatorPage() {
    const [googleApiKey, setGoogleApiKey] = useState('');
    const [replicateApiKey, setReplicateApiKey] = useState('');
    const [imgbbApiKey, setImgbbApiKey] = useState('');
    const [pins, setPins] = useState<PinData[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [config, setConfig] = useState<PinConfig>(DEFAULT_CONFIG);
    const [textRules, setTextRules] = useState(DEFAULT_TEXT_RULES);
    const [imageRules, setImageRules] = useState(DEFAULT_IMAGE_RULES);
    const [showCSVEditor, setShowCSVEditor] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [csvSettings, setCsvSettings] = useState<CSVSettings>({ imgbbApiKey: '', postInterval: '60', pinsPerDay: 10 });
    const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);


    useEffect(() => {
        // Load API Keys from DB
        getUserSettingsAction().then(({ settings }) => {
            if (settings) {
                setGoogleApiKey(settings.gemini_api_key || '');
                setReplicateApiKey(settings.replicate_api_key || '');
                setImgbbApiKey(settings.imgbb_api_key || '');
            }
        });

        const savedConfig = localStorage.getItem('pinverse_pin_config');
        if (savedConfig) try { setConfig(JSON.parse(savedConfig)); } catch { }
        const savedTextRules = localStorage.getItem('pinverse_text_rules');
        const savedImageRules = localStorage.getItem('pinverse_image_rules');
        const savedCsvSettings = localStorage.getItem('pinverse_csv_settings');
        if (savedTextRules) setTextRules(savedTextRules);
        if (savedImageRules) setImageRules(savedImageRules);
        if (savedCsvSettings) try { setCsvSettings(JSON.parse(savedCsvSettings)); } catch { }

        // Get current user for activity logging
        getUser().then(({ user }) => {
            if (user) {
                setCurrentUser({ id: user.id, email: user.email || '' });
            }
        });
    }, []);

    const updateConfig = (newConfig: PinConfig) => {
        setConfig(newConfig);
        localStorage.setItem('pinverse_pin_config', JSON.stringify(newConfig));
    };



    const handleSaveSettings = async (newTextRules: string, newImageRules: string, newConfig: PinConfig, newReplicateKey: string, newGoogleKey: string, newCsvSettings: CSVSettings) => {
        setTextRules(newTextRules);
        setImageRules(newImageRules);
        setConfig(newConfig);
        setReplicateApiKey(newReplicateKey);
        setGoogleApiKey(newGoogleKey);
        setCsvSettings(newCsvSettings);
        setImgbbApiKey(newCsvSettings.imgbbApiKey);

        // Save Rules to LocalStorage (User Preference)
        localStorage.setItem('pinverse_text_rules', newTextRules);
        localStorage.setItem('pinverse_image_rules', newImageRules);
        localStorage.setItem('pinverse_pin_config', JSON.stringify(newConfig));
        localStorage.setItem('pinverse_csv_settings', JSON.stringify(newCsvSettings));

        // Save Keys to Database
        await updateUserSettingsAction({
            gemini_api_key: newGoogleKey,
            replicate_api_key: newReplicateKey,
            imgbb_api_key: newCsvSettings.imgbbApiKey
        });

        // Clean up old local storage keys
        localStorage.removeItem('pinverse_replicate_api_key');
        localStorage.removeItem('pinverse_google_api_key');
        localStorage.removeItem('pinverse_imgbb_api_key');
    };

    const handleGeneratePrompts = async (urls: string[], pinConfig: PinConfig) => {
        if (!googleApiKey) { alert("Please add your Google Gemini API key in Account Settings first."); return; }
        setIsProcessing(true);
        const newPins: PinData[] = urls.map(url => ({
            id: Math.random().toString(36).substr(2, 9), url, status: 'analyzing', targetKeyword: '', annotatedInterests: '',
            visualPrompt: '', title: '', description: '', tags: [], config: { ...pinConfig }
        }));
        setPins(prev => [...newPins, ...prev]);

        for (const pin of newPins) {
            try {
                const details = await generatePinDetails(pin.url, pin.config, textRules, imageRules, '', '', googleApiKey);
                setPins(current => current.map(p => p.id === pin.id ? {
                    ...p, status: 'ready_for_generation', targetKeyword: details.targetKeyword || '',
                    visualPrompt: details.visualPrompt, title: details.title, description: details.description, tags: details.tags
                } : p));
            } catch {
                setPins(current => current.map(p => p.id === pin.id ? { ...p, status: 'error', error: 'Failed to analyze URL' } : p));
            }
        }
        setIsProcessing(false);
    };

    const handleGenerateImage = async (id: string) => {
        const pin = pins.find(p => p.id === id);
        if (!pin) return;
        setPins(current => current.map(p => p.id === id ? { ...p, status: 'generating_image', error: undefined } : p));
        try {
            const imageUrl = await generatePinImage(pin.visualPrompt, pin.config, googleApiKey, replicateApiKey);
            setPins(current => current.map(p => p.id === id ? { ...p, status: 'complete', imageUrl } : p));

            // Log activity when pin is successfully generated
            if (currentUser) {
                logActivity(
                    currentUser.id,
                    currentUser.email,
                    'pin_created',
                    `Created pin: ${pin.title.substring(0, 50)}${pin.title.length > 50 ? '...' : ''}`,
                    { pinId: id, title: pin.title }
                );
                // Update the user's pin count in their profile
                incrementPinCount(currentUser.id);
                // Update user's last active timestamp
                updateLastActive(currentUser.id);
            }
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Image generation failed';
            setPins(current => current.map(p => p.id === id ? { ...p, status: 'error', error: errorMessage } : p));
        }
    };

    const handleRegenerateText = async (id: string) => {
        const pin = pins.find(p => p.id === id);
        if (!pin || !googleApiKey) return;
        try {
            const details = await regeneratePinText(pin.url, pin.targetKeyword, pin.annotatedInterests, textRules, imageRules, googleApiKey);
            setPins(current => current.map(p => p.id === id ? {
                ...p, visualPrompt: details.visualPrompt || p.visualPrompt, title: details.title, description: details.description, tags: details.tags
            } : p));
        } catch { alert("Failed to regenerate text."); }
    };

    const handleRecreate = async (id: string) => {
        const pin = pins.find(p => p.id === id);
        if (!pin || !googleApiKey) return;
        setPins(current => current.map(p => p.id === id ? { ...p, status: 'analyzing', imageUrl: undefined } : p));
        try {
            const details = await generatePinDetails(pin.url, pin.config, textRules, imageRules, pin.annotatedInterests, pin.targetKeyword, googleApiKey);
            setPins(current => current.map(p => p.id === id ? {
                ...p, status: 'ready_for_generation', targetKeyword: details.targetKeyword || '', visualPrompt: details.visualPrompt,
                title: details.title, description: details.description, tags: details.tags
            } : p));
        } catch {
            setPins(current => current.map(p => p.id === id ? { ...p, status: 'error', error: 'Failed to recreate pin' } : p));
        }
    };

    const handleEditImage = async (id: string, prompt: string) => {
        const pin = pins.find(p => p.id === id);
        if (!pin?.imageUrl || !googleApiKey) return;
        const newImageUrl = await editPinImage(pin.imageUrl, prompt, googleApiKey);
        setPins(current => current.map(p => p.id === id ? { ...p, imageUrl: newImageUrl } : p));
    };

    const handleUpdatePin = (id: string, data: Partial<PinData>) => {
        setPins(current => current.map(p => p.id === id ? { ...p, ...data } : p));
    };

    const handleDeletePin = (id: string) => { setPins(current => current.filter(p => p.id !== id)); };

    const handleDownload = (id: string) => {
        const pin = pins.find(p => p.id === id);
        if (!pin?.imageUrl) return;
        const link = document.createElement('a');
        link.href = pin.imageUrl;
        link.download = `${pin.title.replace(/[^a-z0-9\s-_]/gi, '').trim() || 'image'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerateAllImages = async () => {
        const readyPins = pins.filter(p => p.status === 'ready_for_generation');
        for (const pin of readyPins) { await handleGenerateImage(pin.id); }
    };

    const handleDownloadAll = () => {
        pins.filter(p => p.status === 'complete' && p.imageUrl).forEach(pin => handleDownload(pin.id));
    };

    const handleClearAll = () => { if (confirm('Clear all pins?')) setPins([]); };

    const handleExportCSV = () => {
        if (pins.length === 0) return;
        const headers = ['Title', 'Description', 'Tags', 'URL', 'Image URL', 'Status'];
        const rows = pins.map(pin => [
            `"${(pin.title || '').replace(/"/g, '""')}"`, `"${(pin.description || '').replace(/"/g, '""')}"`,
            `"${(pin.tags || []).join(', ')}"`, `"${pin.url}"`,
            `"${pin.imageUrl?.startsWith('data:') ? 'Base64' : (pin.imageUrl || '')}"`, `"${pin.status}"`
        ].join(','));
        const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pinterest-pins-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const readyCount = pins.filter(p => p.status === 'ready_for_generation').length;
    const completedCount = pins.filter(p => p.status === 'complete').length;

    return (
        <div className="flex h-[calc(100vh-80px)] -m-6">
            {/* Left Sidebar */}
            <InputSection onGeneratePrompts={handleGeneratePrompts} isProcessing={isProcessing} config={config} onConfigChange={updateConfig} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div
                    className="p-4 flex items-center justify-between"
                    style={{ background: 'var(--secondary)', borderBottom: '1px solid var(--border)' }}
                >
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                            <Sparkles className="w-5 h-5" style={{ color: 'var(--primary)' }} /> Generated Prompts & Pins
                        </h1>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{pins.length} pins • {readyCount} ready • {completedCount} complete</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={handleGenerateAllImages} disabled={readyCount === 0}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${readyCount > 0 ? '' : 'opacity-50 cursor-not-allowed'}`}
                            style={readyCount > 0 ? { background: 'var(--primary)', color: '#0F172A' } : { background: 'var(--card)', color: 'var(--muted)' }}>
                            <Image className="w-3.5 h-3.5" /> Create All Pins ({readyCount})
                        </button>
                        <button onClick={handleDownloadAll} disabled={completedCount === 0}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${completedCount > 0 ? '' : 'opacity-50 cursor-not-allowed'}`}
                            style={completedCount > 0 ? { background: 'var(--accent)', color: 'white' } : { background: 'var(--card)', color: 'var(--muted)' }}>
                            <Download className="w-3.5 h-3.5" /> Download All ({completedCount})
                        </button>
                        <button onClick={handleClearAll} disabled={pins.length === 0}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                            style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444' }}>
                            <Trash2 className="w-3.5 h-3.5" /> Clear All
                        </button>
                        <button onClick={() => setShowCSVEditor(true)} disabled={completedCount === 0}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${completedCount > 0 ? '' : 'opacity-50 cursor-not-allowed'}`}
                            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                            <Table className="w-3.5 h-3.5" /> View CSV Editor
                        </button>
                        <button onClick={handleExportCSV} disabled={pins.length === 0}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                            style={{ background: 'var(--accent)', color: 'white' }}>
                            <FileText className="w-3.5 h-3.5" /> Export CSV for Pinterest
                        </button>

                        {/* Settings Button */}
                        <button onClick={() => setShowSettings(true)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                            <Settings className="w-3.5 h-3.5" /> Settings
                        </button>
                    </div>
                </div>

                {/* Pin Grid */}
                <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--background)' }}>
                    {pins.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--secondary)' }}>
                                    <Image className="w-10 h-10" style={{ color: 'var(--muted)' }} />
                                </div>
                                <h3 className="text-xl font-medium mb-2" style={{ color: 'var(--foreground)' }}>No pins yet</h3>
                                <p className="max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
                                    Enter URLs on the left and click "Generate Prompts" to create Pinterest-optimized pins with AI.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {pins.map(pin => (
                                <PinCard key={pin.id} pin={pin} onUpdate={handleUpdatePin} onGenerateImage={handleGenerateImage}
                                    onRegenerateText={handleRegenerateText} onRecreate={handleRecreate} onDownload={handleDownload} onEditImage={handleEditImage} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CSV Editor Modal */}
            <CSVEditor isOpen={showCSVEditor} onClose={() => setShowCSVEditor(false)} pins={pins}
                csvSettings={{ ...csvSettings, imgbbApiKey }} />

            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                customRules={textRules}
                imageRules={imageRules}
                defaultConfig={config}
                replicateApiKey={replicateApiKey}
                googleApiKey={googleApiKey}
                csvSettings={csvSettings}
                onSave={handleSaveSettings}
            />

            {/* Chat Assistant */}
            <ChatBot googleApiKey={googleApiKey} />
        </div>
    );
}

```

## File: src/app/dashboard/tools/page.tsx
```tsx
import Link from "next/link";
import { Check, Lock, ArrowRight } from "lucide-react";
import { getVisibleToolsForCurrentUser } from "@/app/actions/tool-actions";

export default async function ToolsPage() {
    const visibleTools = await getVisibleToolsForCurrentUser();
    const visibleToolIds = new Set(visibleTools.map(t => t.id));

    const tools = [
        {
            id: "article-writer",
            name: "PinVerse Master Writer",
            description: "Turn keywords into SEO articles and Pinterest assets in 3 simple steps.",
            features: [
                "Pinterest Trend Research",
                "Keyword Clustering",
                "SEO Article Generation",
                "Auto-Pin Factory"
            ],
            status: visibleToolIds.has("article-writer") ? "available" : "coming_soon",
            href: "/dashboard/tools/article-writer",
        },
        {
            id: "bulk-pin-creator",
            name: "Bulk Pin Creator",
            description: "Generate hundreds of Pinterest pins with AI-powered titles, descriptions, and images. Export as CSV for bulk upload.",
            features: [
                "AI-generated content",
                "Batch image generation",
                "CSV export with scheduling",
                "ImgBB auto-upload",
            ],
            status: visibleToolIds.has("bulk-pin-creator") ? "available" : "coming_soon",
            href: "/dashboard/tools/bulk-pin-creator",
        },
        {
            id: "pinterest-scheduler",
            name: "Pinterest Scheduler",
            description: "Schedule your pins for optimal posting times. Automate your Pinterest workflow with smart scheduling.",
            features: [
                "Auto-scheduling",
                "Best time analysis",
                "Multi-board support",
            ],
            status: visibleToolIds.has("pinterest-scheduler") ? "available" : "coming_soon",
            href: "/dashboard/tools/pinterest-scheduler",
        },
        {
            id: "keyword-research",
            name: "Keyword Research",
            description: "Find high-traffic Pinterest keywords to optimize your pins for maximum discoverability.",
            features: [
                "Trending keywords",
                "Competition analysis",
                "SEO suggestions",
            ],
            status: visibleToolIds.has("keyword-research") ? "available" : "coming_soon",
            href: "#",
        },
        {
            id: "analytics",
            name: "Analytics Dashboard",
            description: "Track your Pinterest performance with detailed analytics and insights.",
            features: [
                "Pin performance",
                "Traffic tracking",
                "Growth metrics",
            ],
            status: visibleToolIds.has("analytics") ? "available" : "coming_soon",
            href: "/dashboard/tools/analytics",
        },
    ];

    return (
        <div style={{ color: 'var(--foreground)' }}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Tools</h1>
                <p style={{ color: 'var(--muted)' }}>Access your Pinterest marketing tools.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {tools.map((tool) => (
                    <div
                        key={tool.id}
                        className="relative rounded-2xl p-6 transition"
                        style={{
                            background: tool.status === "available"
                                ? 'linear-gradient(135deg, rgba(250, 204, 21, 0.08), rgba(249, 115, 22, 0.08))'
                                : 'var(--card)',
                            border: tool.status === "available"
                                ? '1px solid rgba(250, 204, 21, 0.3)'
                                : '1px solid var(--border)'
                        }}
                    >
                        {tool.status === "available" ? (
                            <div className="absolute top-4 right-4 text-white text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--accent)' }}>
                                AVAILABLE
                            </div>
                        ) : (
                            <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1" style={{ background: 'var(--muted)', color: 'white' }}>
                                <Lock className="w-3 h-3" /> COMING SOON
                            </div>
                        )}

                        <h3
                            className={`text-xl font-bold mb-2 ${tool.status === "coming_soon" ? "opacity-60" : ""}`}
                            style={{ color: 'var(--foreground)' }}
                        >
                            {tool.name}
                        </h3>
                        <p
                            className={`mb-4 ${tool.status === "coming_soon" ? "opacity-60" : ""}`}
                            style={{ color: 'var(--muted)' }}
                        >
                            {tool.description}
                        </p>

                        <ul className={`space-y-2 mb-6 ${tool.status === "coming_soon" ? "opacity-60" : ""}`}>
                            {tool.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
                                    <Check className="w-4 h-4" style={{ color: tool.status === "available" ? 'var(--accent)' : 'var(--muted)' }} />
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        {tool.status === "available" ? (
                            <Link
                                href={tool.href}
                                className="inline-flex items-center gap-2 btn-primary text-sm"
                            >
                                Open Tool <ArrowRight className="w-4 h-4" />
                            </Link>
                        ) : (
                            <button
                                disabled
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm cursor-not-allowed"
                                style={{ background: 'var(--secondary)', color: 'var(--muted)' }}
                            >
                                <Lock className="w-4 h-4" /> Coming Soon
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

```

## File: src/app/dashboard/tools/pinterest-scheduler/page.tsx
```tsx
import { Metadata } from "next";
import SchedulerTool from "@/components/scheduler/SchedulerTool";

export const metadata: Metadata = {
    title: "Pinterest Scheduler | PinVerse",
    description: "Automate your Pinterest workflow with smart scheduling.",
};

export default function SchedulerPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
                    Pinterest Scheduler
                </h1>
                <p className="text-muted-foreground mt-2">
                    Manage your upcoming pins and automate publishing for maximum reach.
                </p>
            </div>

            <SchedulerTool />
        </div>
    );
}

```

## File: src/app/forgot-password/page.tsx
```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { resetPassword } from "@/lib/supabase";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const { error } = await resetPassword(email);

            if (error) {
                setError(error.message);
                return;
            }

            setIsSubmitted(true);
        } catch (err) {
            setError("Failed to send reset email. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <span className="text-3xl font-black text-white">Pin</span>
                        <span className="text-3xl font-black text-yellow-400">Verse</span>
                    </Link>
                </div>

                {/* Card */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                    {isSubmitted ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
                            <p className="text-slate-400 mb-6">
                                We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>
                            </p>
                            <p className="text-slate-500 text-sm mb-6">
                                Didn&apos;t receive the email? Check your spam folder or try again.
                            </p>
                            <Link href="/login" className="btn-secondary inline-block">
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Mail className="w-8 h-8 text-yellow-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white text-center mb-2">Forgot Password?</h1>
                            <p className="text-slate-400 text-center mb-8">
                                No worries! Enter your email and we&apos;ll send you a reset link.
                            </p>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="you@example.com"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? "Sending..." : "Send Reset Link"}
                                </button>
                            </form>

                            <p className="text-center text-slate-400 mt-6">
                                Remember your password?{" "}
                                <Link href="/login" className="text-yellow-400 hover:underline">Sign in</Link>
                            </p>
                        </>
                    )}
                </div>

                <Link href="/" className="flex items-center justify-center gap-2 text-slate-500 hover:text-white transition mt-6">
                    <ArrowLeft className="w-4 h-4" /> Back to home
                </Link>
            </div>
        </div>
    );
}

```

## File: src/app/globals.css
```css
@import "tailwindcss";

/* Dark mode (default) - Primary brand experience */
:root,
.dark {
  --background: #0F172A;
  --foreground: #E2E8F0;
  --primary: #FACC15;
  --primary-hover: #EAB308;
  --secondary: #1E293B;
  --accent: #10B981;
  --accent-hover: #059669;
  --card: #1E293B;
  --card-hover: #334155;
  --border: #334155;
  --muted: #64748B;
  --sidebar: #0F172A;
  --header: rgba(15, 23, 42, 0.9);
}

/* Light mode - Warm, branded feel */
.light {
  --background: #FDF9F3;
  --foreground: #1E293B;
  --primary: #FACC15;
  --primary-hover: #EAB308;
  --secondary: #FFF8E7;
  --accent: #10B981;
  --accent-hover: #059669;
  --card: #FFFFFF;
  --card-hover: #FFFBF0;
  --border: #FACC15;
  --muted: #64748B;
  --sidebar: #1E293B;
  --header: rgba(253, 249, 243, 0.95);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: 'Inter', Arial, Helvetica, sans-serif;
  transition: background-color 0.3s, color 0.3s;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--muted);
}

/* Gradient text utility */
.gradient-text {
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Glass effect */
.glass {
  background: rgba(30, 41, 59, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(250, 204, 21, 0.1);
}

.light .glass {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(250, 204, 21, 0.2);
}

/* Card with shadow for light mode */
.card-themed {
  background: var(--card);
  border: 1px solid var(--border);
  transition: all 0.2s;
}

.light .card-themed {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* Input styling */
.input-themed {
  background: var(--secondary);
  border: 1px solid var(--border);
  color: var(--foreground);
}

.input-themed::placeholder {
  color: var(--muted);
}

.input-themed:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.2);
}

/* Button styles */
.btn-primary {
  background: var(--primary);
  color: #0F172A;
  font-weight: 700;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--secondary);
  color: var(--foreground);
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--card-hover);
  border-color: var(--primary);
}

.btn-accent {
  background: var(--accent);
  color: white;
  font-weight: 700;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.btn-accent:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}
```

## File: src/app/layout.tsx
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "PinVerse Platform",
  description: "Advanced Pinterest Operations",
  keywords: "Pinterest, marketing, bulk pins, automation, Pinterest tools, content creator, Pinterest scheduler",
  authors: [{ name: "Ecomverse LLC" }],
  openGraph: {
    title: "PinVerse - Pinterest Marketing Tools",
    description: "Powerful Pinterest marketing automation tools for creators and businesses.",
    url: "https://pinverse.io",
    siteName: "PinVerse",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PinVerse - Pinterest Marketing Tools",
    description: "Powerful Pinterest marketing automation tools for creators and businesses.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

```

## File: src/app/login/page.tsx
```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { signIn } from "@/lib/supabase";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const { data, error } = await signIn(email, password);

            if (error) {
                setError(error.message);
                return;
            }

            if (data?.session) {
                router.push("/dashboard");
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <span className="text-3xl font-black text-white">Pin</span>
                        <span className="text-3xl font-black text-yellow-400">Verse</span>
                    </Link>
                </div>

                {/* Login Card */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                    <h1 className="text-2xl font-bold text-white text-center mb-2">Welcome Back</h1>
                    <p className="text-slate-400 text-center mb-8">Sign in to access your tools</p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 text-slate-400">
                                <input type="checkbox" className="rounded border-slate-600 bg-slate-900 text-yellow-400 focus:ring-yellow-400" />
                                Remember me
                            </label>
                            <Link href="/forgot-password" className="text-yellow-400 hover:underline">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <p className="text-center text-slate-400 mt-6">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-yellow-400 hover:underline">Sign up</Link>
                    </p>
                </div>

                <Link href="/" className="flex items-center justify-center gap-2 text-slate-500 hover:text-white transition mt-6">
                    <ArrowLeft className="w-4 h-4" /> Back to home
                </Link>
            </div>
        </div>
    );
}

```

## File: src/app/page.tsx
```tsx
import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Shield, Users, Check, Star } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center">
              <span className="text-2xl font-black text-white">Pin</span>
              <span className="text-2xl font-black text-yellow-400">Verse</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-slate-300 hover:text-white transition">Features</Link>
            <Link href="#tools" className="text-slate-300 hover:text-white transition">Tools</Link>
            <Link href="#pricing" className="text-slate-300 hover:text-white transition">Pricing</Link>
            <Link href="/login" className="text-slate-300 hover:text-white transition">Login</Link>
            <Link href="/signup" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-2 mb-8">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-yellow-400 font-medium">AI-Powered Pinterest Tools</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
            Dominate Pinterest<br />
            <span className="text-yellow-400">Without the Guesswork</span>
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Create stunning pins in bulk, schedule content automatically, and grow your Pinterest traffic with our suite of AI-powered marketing tools.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#tools" className="btn-secondary text-lg px-8 py-4">
              Explore Tools
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>7-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose PinVerse?</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Everything you need to scale your Pinterest presence and drive massive organic traffic.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-yellow-400/50 transition">
              <div className="w-14 h-14 bg-yellow-400/10 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI-Powered Content</h3>
              <p className="text-slate-400">Generate optimized pin titles, descriptions, and images using advanced AI. Save hours on content creation.</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-yellow-400/50 transition">
              <div className="w-14 h-14 bg-emerald-400/10 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Bulk Operations</h3>
              <p className="text-slate-400">Create and schedule hundreds of pins at once. Export directly to Pinterest with our CSV editor.</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-yellow-400/50 transition">
              <div className="w-14 h-14 bg-purple-400/10 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Built for Creators</h3>
              <p className="text-slate-400">Designed by Pinterest marketers, for Pinterest marketers. Tools that actually work.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Powerful Tools, One Platform</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Access all the tools you need to dominate Pinterest marketing.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Tool 1: Bulk Pin Creator */}
            <div className="group relative bg-gradient-to-br from-yellow-400/10 to-orange-400/10 border border-yellow-400/20 rounded-2xl p-8 hover:border-yellow-400/50 transition overflow-hidden">
              <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">AVAILABLE</div>
              <h3 className="text-2xl font-bold text-white mb-3">Bulk Pin Creator</h3>
              <p className="text-slate-400 mb-6">Generate hundreds of Pinterest pins with AI-powered titles, descriptions, and images. Export as CSV for bulk upload.</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> AI-generated content</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Batch image generation</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> CSV export with scheduling</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> ImgBB auto-upload</li>
              </ul>
            </div>

            {/* Tool 2: Master Writer */}
            <div className="group relative bg-gradient-to-br from-indigo-400/10 to-purple-400/10 border border-indigo-400/20 rounded-2xl p-8 hover:border-indigo-400/50 transition overflow-hidden">
              <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">AVAILABLE</div>
              <h3 className="text-2xl font-bold text-white mb-3">Master Writer</h3>
              <p className="text-slate-400 mb-6">Turn keywords into SEO articles and Pinterest assets in 3 simple steps. Research trends, write content, and create pins.</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Trend Research</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> SEO Article Generation</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> Auto-Pin Factory</li>
                <li className="flex items-center gap-2 text-slate-300"><Check className="w-4 h-4 text-emerald-400" /> WordPress Integration</li>
              </ul>
            </div>

            {/* Tool 3: Pinterest Scheduler (Coming Soon) */}
            <div className="group relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 opacity-75">
              <div className="absolute top-4 right-4 bg-slate-600 text-white text-xs font-bold px-3 py-1 rounded-full">COMING SOON</div>
              <h3 className="text-2xl font-bold text-white mb-3">Pinterest Scheduler</h3>
              <p className="text-slate-400 mb-6">Schedule your pins for optimal posting times. Automate your Pinterest workflow with smart scheduling.</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Auto-scheduling</li>
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Best time analysis</li>
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Multi-board support</li>
              </ul>
            </div>

            {/* Tool 3: Coming Soon */}
            <div className="group relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 opacity-75">
              <div className="absolute top-4 right-4 bg-slate-600 text-white text-xs font-bold px-3 py-1 rounded-full">COMING SOON</div>
              <h3 className="text-2xl font-bold text-white mb-3">Keyword Research</h3>
              <p className="text-slate-400 mb-6">Find high-traffic Pinterest keywords to optimize your pins for maximum discoverability.</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Trending keywords</li>
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Competition analysis</li>
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> SEO suggestions</li>
              </ul>
            </div>

            {/* Tool 4: Coming Soon */}
            <div className="group relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 opacity-75">
              <div className="absolute top-4 right-4 bg-slate-600 text-white text-xs font-bold px-3 py-1 rounded-full">COMING SOON</div>
              <h3 className="text-2xl font-bold text-white mb-3">Analytics Dashboard</h3>
              <p className="text-slate-400 mb-6">Track your Pinterest performance with detailed analytics and insights.</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Pin performance</li>
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Traffic tracking</li>
                <li className="flex items-center gap-2 text-slate-500"><Check className="w-4 h-4 text-slate-600" /> Growth metrics</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Choose the plan that fits your Pinterest marketing needs.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Trial */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-2">Free Trial</h3>
              <p className="text-slate-400 text-sm mb-6">Try all features for 7 days</p>
              <div className="mb-6">
                <span className="text-4xl font-black text-white">$0</span>
                <span className="text-slate-400">/7 days</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> All tools access</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> 10 pins limit</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Basic support</li>
              </ul>
              <Link href="/signup" className="block w-full btn-secondary text-center">Start Free Trial</Link>
            </div>

            {/* Starter */}
            <div className="bg-gradient-to-b from-yellow-400/10 to-transparent border-2 border-yellow-400 rounded-2xl p-8 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 text-xs font-bold px-4 py-1 rounded-full">MOST POPULAR</div>
              <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
              <p className="text-slate-400 text-sm mb-6">For individual creators</p>
              <div className="mb-6">
                <span className="text-4xl font-black text-white">$29</span>
                <span className="text-slate-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> 2 tools access</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> 100 pins/month</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Priority support</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> CSV export</li>
              </ul>
              <Link href="/signup?plan=starter" className="block w-full btn-primary text-center">Get Started</Link>
            </div>

            {/* Pro */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
              <p className="text-slate-400 text-sm mb-6">For power users & agencies</p>
              <div className="mb-6">
                <span className="text-4xl font-black text-white">$59</span>
                <span className="text-slate-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> All tools access</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Unlimited pins</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Priority support</li>
                <li className="flex items-center gap-2 text-slate-300 text-sm"><Check className="w-4 h-4 text-emerald-400" /> Early access to new tools</li>
              </ul>
              <Link href="/signup?plan=pro" className="block w-full btn-accent text-center">Go Pro</Link>
            </div>
          </div>

          <p className="text-center text-slate-500 mt-8 text-sm">
            Are you an Ecomverse member? <Link href="/signup?coupon=ECOMVERSE100" className="text-yellow-400 hover:underline">Get free access here</Link>
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Loved by Pinterest Marketers</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-slate-300 mb-4">&quot;PinVerse saved me hours every week. I can now create a month&apos;s worth of pins in under an hour!&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400/20 rounded-full flex items-center justify-center text-yellow-400 font-bold">S</div>
                <div>
                  <p className="text-white font-medium">Sarah M.</p>
                  <p className="text-slate-500 text-sm">Food Blogger</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-slate-300 mb-4">&quot;The AI-generated content is surprisingly good. My Pinterest traffic has grown 300% since I started using PinVerse.&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-400/20 rounded-full flex items-center justify-center text-emerald-400 font-bold">M</div>
                <div>
                  <p className="text-white font-medium">Michael R.</p>
                  <p className="text-slate-500 text-sm">E-commerce Owner</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-slate-300 mb-4">&quot;Finally, a Pinterest tool that actually works! The bulk creation feature is a game-changer for my agency.&quot;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-400/20 rounded-full flex items-center justify-center text-purple-400 font-bold">J</div>
                <div>
                  <p className="text-white font-medium">Jessica L.</p>
                  <p className="text-slate-500 text-sm">Marketing Agency</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-yellow-400/10 to-emerald-400/10 border border-yellow-400/20 rounded-3xl p-12">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Dominate Pinterest?</h2>
          <p className="text-slate-400 mb-8">Start your free 7-day trial today. No credit card required.</p>
          <Link href="/signup" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2">
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl font-black text-white">Pin</span>
                <span className="text-xl font-black text-yellow-400">Verse</span>
              </div>
              <p className="text-slate-500 text-sm">Pinterest marketing tools for creators and businesses.</p>
              <p className="text-slate-600 text-xs mt-4">© 2025 Ecomverse LLC. All rights reserved.</p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="#features" className="hover:text-white transition">Features</Link></li>
                <li><Link href="#tools" className="hover:text-white transition">Tools</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="https://ecomverse.study" className="hover:text-white transition">Ecomverse Academy</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link href="/refund-policy" className="hover:text-white transition">Refund Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

```

## File: src/app/pricing/page.tsx
```tsx
import Link from "next/link";
import { Check, ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Pricing - PinVerse",
    description: "Simple, transparent pricing for PinVerse Pinterest marketing tools.",
};

export default function PricingPage() {
    const plans = [
        {
            name: "Free Trial",
            description: "Try all features for 7 days",
            price: "$0",
            period: "/7 days",
            features: [
                "All tools access",
                "10 pins limit",
                "Basic support",
            ],
            cta: "Start Free Trial",
            href: "/signup",
            highlighted: false,
            buttonClass: "btn-secondary",
        },
        {
            name: "Starter",
            description: "For individual creators",
            price: "$29",
            period: "/month",
            features: [
                "2 tools access",
                "100 pins/month",
                "Priority support",
                "CSV export",
            ],
            cta: "Get Started",
            href: "/signup?plan=starter",
            highlighted: true,
            buttonClass: "btn-primary",
            badge: "MOST POPULAR",
        },
        {
            name: "Pro",
            description: "For power users & agencies",
            price: "$59",
            period: "/month",
            features: [
                "All tools access",
                "Unlimited pins",
                "Priority support",
                "Early access to new tools",
                "Custom templates",
            ],
            cta: "Go Pro",
            href: "/signup?plan=pro",
            highlighted: false,
            buttonClass: "btn-accent",
        },
    ];

    const faqs = [
        {
            question: "Can I cancel anytime?",
            answer: "Yes! You can cancel your subscription at any time. Your access will continue until the end of your current billing period.",
        },
        {
            question: "What payment methods do you accept?",
            answer: "We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe.",
        },
        {
            question: "Is there a refund policy?",
            answer: "Yes, we offer a 7-day money-back guarantee. If you're not satisfied within the first 7 days of your paid subscription, we'll give you a full refund.",
        },
        {
            question: "Do I need my own API keys?",
            answer: "Yes, you'll need to provide your own API keys for Google Gemini (free), and optionally Replicate and ImgBB. This gives you full control over your usage and costs.",
        },
        {
            question: "I'm an Ecomverse member. Do I get free access?",
            answer: "Yes! Ecomverse Skool members get free access to all PinVerse tools. Just use the coupon code ECOMVERSE100 when signing up.",
        },
    ];

    return (
        <div className="min-h-screen bg-[#0F172A]">
            {/* Navigation */}
            <nav className="border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl font-black text-white">Pin</span>
                        <span className="text-2xl font-black text-yellow-400">Verse</span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link href="/login" className="text-slate-300 hover:text-white transition">Login</Link>
                        <Link href="/signup" className="btn-primary text-sm">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-20 pb-12 px-6 text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
                <p className="text-slate-400 max-w-xl mx-auto">Choose the plan that fits your Pinterest marketing needs. All plans include a 7-day free trial.</p>
            </section>

            {/* Pricing Cards */}
            <section className="px-6 pb-20">
                <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative rounded-2xl p-8 ${plan.highlighted
                                    ? "bg-gradient-to-b from-yellow-400/10 to-transparent border-2 border-yellow-400"
                                    : "bg-slate-800/50 border border-slate-700"
                                }`}
                        >
                            {plan.badge && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 text-xs font-bold px-4 py-1 rounded-full">
                                    {plan.badge}
                                </div>
                            )}

                            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                            <p className="text-slate-400 text-sm mb-6">{plan.description}</p>

                            <div className="mb-6">
                                <span className="text-4xl font-black text-white">{plan.price}</span>
                                <span className="text-slate-400">{plan.period}</span>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link href={plan.href} className={`block w-full ${plan.buttonClass} text-center`}>
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>

                <p className="text-center text-slate-500 mt-8 text-sm">
                    Are you an Ecomverse member? <Link href="/signup?coupon=ECOMVERSE100" className="text-yellow-400 hover:underline">Get free access here</Link>
                </p>
            </section>

            {/* FAQ */}
            <section className="py-20 px-6 bg-slate-900/50">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>

                    <div className="space-y-6">
                        {faqs.map((faq, i) => (
                            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-white mb-2">{faq.question}</h3>
                                <p className="text-slate-400">{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-yellow-400/10 to-emerald-400/10 border border-yellow-400/20 rounded-3xl p-12">
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
                    <p className="text-slate-400 mb-8">Start your free 7-day trial today. No credit card required.</p>
                    <Link href="/signup" className="btn-primary text-lg px-8 py-4">
                        Start Free Trial
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-slate-800">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-white">Pin</span>
                        <span className="text-lg font-black text-yellow-400">Verse</span>
                    </div>
                    <p className="text-slate-500 text-sm">© 2025 Ecomverse LLC. All rights reserved.</p>
                    <div className="flex gap-6 text-sm text-slate-400">
                        <Link href="/terms" className="hover:text-white">Terms</Link>
                        <Link href="/privacy" className="hover:text-white">Privacy</Link>
                        <Link href="/refund-policy" className="hover:text-white">Refunds</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

```

## File: src/app/privacy/page.tsx
```tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Privacy Policy - PinVerse",
    description: "Privacy Policy for PinVerse Pinterest marketing tools.",
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-[#0F172A]">
            {/* Header */}
            <nav className="border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl font-black text-white">Pin</span>
                        <span className="text-xl font-black text-yellow-400">Verse</span>
                    </Link>
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
                <p className="text-slate-500 mb-8">Last updated: January 2025</p>

                <div className="prose prose-invert prose-slate max-w-none">
                    <div className="space-y-8 text-slate-300">

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
                            <p>Ecomverse LLC (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates PinVerse (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>

                            <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.1 Personal Information</h3>
                            <p>When you register for an account, we may collect:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Email address</li>
                                <li>Payment information (processed by Stripe)</li>
                                <li>Account preferences and settings</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.2 Usage Data</h3>
                            <p>We automatically collect certain information when you use the Service:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Browser type and version</li>
                                <li>Device information</li>
                                <li>Pages visited and features used</li>
                                <li>Time and date of your visit</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.3 API Keys</h3>
                            <p>You may provide third-party API keys (Google Gemini, Replicate, ImgBB) to enable certain features. These keys are stored securely and only used to make API calls on your behalf.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
                            <p>We use the information we collect to:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Provide and maintain our Service</li>
                                <li>Process your transactions</li>
                                <li>Send you service-related communications</li>
                                <li>Respond to your inquiries and support requests</li>
                                <li>Improve our Service</li>
                                <li>Detect and prevent fraud or abuse</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">4. Third-Party Services</h2>
                            <p>Our Service integrates with the following third-party services:</p>

                            <div className="mt-4 space-y-4">
                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                    <h4 className="font-bold text-white">Supabase</h4>
                                    <p className="text-sm text-slate-400">Used for authentication and data storage. <a href="https://supabase.com/privacy" className="text-yellow-400 hover:underline">Privacy Policy</a></p>
                                </div>
                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                    <h4 className="font-bold text-white">Stripe</h4>
                                    <p className="text-sm text-slate-400">Used for payment processing. <a href="https://stripe.com/privacy" className="text-yellow-400 hover:underline">Privacy Policy</a></p>
                                </div>
                                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                                    <h4 className="font-bold text-white">Google (Gemini API)</h4>
                                    <p className="text-sm text-slate-400">Used for AI content generation (via your API key). <a href="https://policies.google.com/privacy" className="text-yellow-400 hover:underline">Privacy Policy</a></p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">5. Data Security</h2>
                            <p>We implement appropriate technical and organizational measures to protect your personal information, including:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Encryption of data in transit (HTTPS)</li>
                                <li>Secure storage with access controls</li>
                                <li>Regular security assessments</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">6. Your Rights</h2>
                            <p>Depending on your location, you may have the following rights:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li><strong>Access:</strong> Request a copy of your personal data</li>
                                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                                <li><strong>Portability:</strong> Request transfer of your data</li>
                                <li><strong>Opt-out:</strong> Opt out of marketing communications</li>
                            </ul>
                            <p className="mt-4">To exercise these rights, contact us at support@pinverse.io</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">7. Cookies</h2>
                            <p>We use essential cookies to maintain your session and preferences. We do not use tracking cookies for advertising purposes.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">8. Data Retention</h2>
                            <p>We retain your personal information for as long as your account is active or as needed to provide you services. You may request deletion of your account and data at any time.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">9. Children&apos;s Privacy</h2>
                            <p>Our Service is not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">10. Changes to This Policy</h2>
                            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">11. Contact Us</h2>
                            <p>If you have questions about this Privacy Policy, please contact us:</p>
                            <ul className="list-none mt-4 space-y-2">
                                <li><strong>Email:</strong> support@pinverse.io</li>
                                <li><strong>Company:</strong> Ecomverse LLC</li>
                            </ul>
                        </section>

                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-8">
                <div className="max-w-4xl mx-auto px-6 text-center text-slate-500 text-sm">
                    © 2025 Ecomverse LLC. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

```

## File: src/app/refund-policy/page.tsx
```tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Refund Policy - PinVerse",
    description: "Refund Policy for PinVerse Pinterest marketing tools.",
};

export default function RefundPolicyPage() {
    return (
        <div className="min-h-screen bg-[#0F172A]">
            {/* Header */}
            <nav className="border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl font-black text-white">Pin</span>
                        <span className="text-xl font-black text-yellow-400">Verse</span>
                    </Link>
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <h1 className="text-4xl font-bold text-white mb-2">Refund Policy</h1>
                <p className="text-slate-500 mb-8">Last updated: January 2025</p>

                <div className="prose prose-invert prose-slate max-w-none">
                    <div className="space-y-8 text-slate-300">

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Our Commitment</h2>
                            <p>At PinVerse, we want you to be completely satisfied with your purchase. We offer a straightforward refund policy to give you peace of mind.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">7-Day Money-Back Guarantee</h2>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 my-4">
                                <p className="text-emerald-400 font-medium">If you&apos;re not satisfied with PinVerse within the first 7 days of your paid subscription, we&apos;ll give you a full refund—no questions asked.</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Eligibility for Refund</h2>
                            <p>To be eligible for a refund:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Your refund request must be made within <strong>7 days</strong> of your initial subscription payment</li>
                                <li>This is your first subscription to PinVerse</li>
                                <li>You have not previously received a refund from us</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Non-Refundable Items</h2>
                            <p>The following are not eligible for refunds:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Subscription renewals after the initial 7-day period</li>
                                <li>Accounts that have been suspended or terminated for violating our Terms of Service</li>
                                <li>Partial month refunds for cancellations</li>
                                <li>Third-party API costs (these are charged by external providers)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">How to Request a Refund</h2>
                            <p>To request a refund:</p>
                            <ol className="list-decimal pl-6 space-y-2 mt-4">
                                <li>Send an email to <strong>support@pinverse.io</strong></li>
                                <li>Include your account email address</li>
                                <li>Include the subject line: &quot;Refund Request&quot;</li>
                                <li>Briefly explain why you&apos;re requesting a refund (optional but helpful)</li>
                            </ol>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Processing Time</h2>
                            <p>Once we receive your refund request:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>We will review your request within <strong>1-2 business days</strong></li>
                                <li>If approved, your refund will be processed within <strong>5-10 business days</strong></li>
                                <li>The refund will be credited to your original payment method</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Subscription Cancellation</h2>
                            <p>If you simply want to cancel your subscription without a refund:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Go to your <Link href="/dashboard/billing" className="text-yellow-400 hover:underline">Billing Settings</Link></li>
                                <li>Click &quot;Cancel Subscription&quot;</li>
                                <li>Your access will continue until the end of your current billing period</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
                            <p>If you have any questions about our refund policy, please contact us:</p>
                            <ul className="list-none mt-4 space-y-2">
                                <li><strong>Email:</strong> support@pinverse.io</li>
                                <li><strong>Response Time:</strong> Within 24-48 hours</li>
                            </ul>
                        </section>

                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-8">
                <div className="max-w-4xl mx-auto px-6 text-center text-slate-500 text-sm">
                    © 2025 Ecomverse LLC. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

```

## File: src/app/signup/page.tsx
```tsx
"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft, Check } from "lucide-react";
import { signUp } from "@/lib/supabase";

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const plan = searchParams.get("plan") || "trial";
    const coupon = searchParams.get("coupon") || "";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [couponCode, setCouponCode] = useState(coupon);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!acceptTerms) {
            setError("You must accept the Terms of Service");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);

        try {
            const { data, error } = await signUp(email, password);

            if (error) {
                setError(error.message);
                return;
            }

            // Show success message (email verification may be required)
            setSuccess(true);
        } catch (err) {
            setError("Failed to create account. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const getPlanTitle = () => {
        switch (plan) {
            case "starter": return "Starter ($29/mo)";
            case "pro": return "Pro ($59/mo)";
            default: return "Free Trial (7 days)";
        }
    };

    if (success) {
        return (
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <span className="text-3xl font-black text-white">Pin</span>
                        <span className="text-3xl font-black text-yellow-400">Verse</span>
                    </Link>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
                    <p className="text-slate-400 mb-6">
                        We&apos;ve sent a confirmation link to <strong className="text-white">{email}</strong>
                    </p>
                    <p className="text-slate-500 text-sm mb-6">
                        Click the link in your email to activate your account, then you can sign in.
                    </p>
                    <Link href="/login" className="btn-primary inline-block">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md">
            {/* Logo */}
            <div className="text-center mb-8">
                <Link href="/" className="inline-flex items-center gap-2">
                    <span className="text-3xl font-black text-white">Pin</span>
                    <span className="text-3xl font-black text-yellow-400">Verse</span>
                </Link>
            </div>

            {/* Signup Card */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                <h1 className="text-2xl font-bold text-white text-center mb-2">Create Your Account</h1>
                <p className="text-slate-400 text-center mb-2">Start your Pinterest marketing journey</p>

                <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-4 py-2 text-center mb-6">
                    <span className="text-yellow-400 text-sm font-medium">Selected Plan: {getPlanTitle()}</span>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Minimum 8 characters"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Confirm your password"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Coupon Code (Optional)</label>
                        <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="ECOMVERSE100"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                        />
                        {couponCode === "ECOMVERSE100" && (
                            <div className="flex items-center gap-2 text-emerald-400 text-sm mt-2">
                                <Check className="w-4 h-4" /> Ecomverse member discount applied!
                            </div>
                        )}
                    </div>

                    <label className="flex items-start gap-3 text-sm text-slate-400">
                        <input
                            type="checkbox"
                            checked={acceptTerms}
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                            className="mt-1 rounded border-slate-600 bg-slate-900 text-yellow-400 focus:ring-yellow-400"
                        />
                        <span>
                            I agree to the{" "}
                            <Link href="/terms" className="text-yellow-400 hover:underline">Terms of Service</Link>
                            {" "}and{" "}
                            <Link href="/privacy" className="text-yellow-400 hover:underline">Privacy Policy</Link>
                        </span>
                    </label>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                <p className="text-center text-slate-400 mt-6">
                    Already have an account?{" "}
                    <Link href="/login" className="text-yellow-400 hover:underline">Sign in</Link>
                </p>
            </div>

            <Link href="/" className="flex items-center justify-center gap-2 text-slate-500 hover:text-white transition mt-6">
                <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="w-full max-w-md">
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2">
                    <span className="text-3xl font-black text-white">Pin</span>
                    <span className="text-3xl font-black text-yellow-400">Verse</span>
                </div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
                <p className="text-slate-400">Loading...</p>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-6 py-12">
            <Suspense fallback={<LoadingFallback />}>
                <SignupForm />
            </Suspense>
        </div>
    );
}

```

## File: src/app/terms/page.tsx
```tsx
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Terms of Service - PinVerse",
    description: "Terms of Service for PinVerse Pinterest marketing tools.",
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-[#0F172A]">
            {/* Header */}
            <nav className="border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl font-black text-white">Pin</span>
                        <span className="text-xl font-black text-yellow-400">Verse</span>
                    </Link>
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
                <p className="text-slate-500 mb-8">Last updated: January 2025</p>

                <div className="prose prose-invert prose-slate max-w-none">
                    <div className="space-y-8 text-slate-300">

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">1. Agreement to Terms</h2>
                            <p>By accessing or using PinVerse (&quot;Service&quot;), operated by Ecomverse LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these terms, you do not have permission to access the Service.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
                            <p>PinVerse provides Pinterest marketing automation tools, including but not limited to:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Bulk pin creation with AI-generated content</li>
                                <li>Image generation and editing tools</li>
                                <li>CSV export functionality for Pinterest scheduling</li>
                                <li>Content scheduling and management features</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts</h2>
                            <p>When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms.</p>
                            <p className="mt-4">You are responsible for:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Maintaining the confidentiality of your account and password</li>
                                <li>Restricting access to your computer and account</li>
                                <li>All activities that occur under your account</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">4. API Keys and Third-Party Services</h2>
                            <p>Our Service may require you to provide your own API keys for third-party services (e.g., Google Gemini, Replicate, ImgBB). You are responsible for:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Obtaining and maintaining valid API keys</li>
                                <li>Complying with the terms of service of those third-party providers</li>
                                <li>Any costs associated with your API usage</li>
                                <li>Keeping your API keys secure and confidential</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">5. Subscription and Billing</h2>
                            <p>Some features of our Service are billed on a subscription basis (&quot;Subscription(s)&quot;). You will be billed in advance on a recurring basis (&quot;Billing Cycle&quot;), either monthly or annually, depending on the plan you select.</p>
                            <p className="mt-4">Your subscription will automatically renew unless you cancel it at least 24 hours before the end of the current Billing Cycle.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">6. Acceptable Use</h2>
                            <p>You agree not to use the Service to:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Violate any laws or regulations</li>
                                <li>Infringe upon the rights of others</li>
                                <li>Create spam or engage in deceptive practices</li>
                                <li>Distribute malware or harmful content</li>
                                <li>Attempt to gain unauthorized access to our systems</li>
                                <li>Violate Pinterest&apos;s Terms of Service or Community Guidelines</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">7. Intellectual Property</h2>
                            <p>The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Ecomverse LLC. Content you create using our tools remains your property, subject to applicable licensing.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">8. Limitation of Liability</h2>
                            <p>In no event shall Ecomverse LLC, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">9. Disclaimer</h2>
                            <p>Your use of the Service is at your sole risk. The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. The Service is provided without warranties of any kind, whether express or implied.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">10. Changes to Terms</h2>
                            <p>We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days&apos; notice prior to any new terms taking effect.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">11. Contact Us</h2>
                            <p>If you have any questions about these Terms, please contact us:</p>
                            <ul className="list-none mt-4 space-y-2">
                                <li><strong>Email:</strong> support@pinverse.io</li>
                                <li><strong>Company:</strong> Ecomverse LLC</li>
                            </ul>
                        </section>

                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-8">
                <div className="max-w-4xl mx-auto px-6 text-center text-slate-500 text-sm">
                    © 2025 Ecomverse LLC. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

```

## File: src/components/admin/ToolVisibilityManager.tsx
```tsx
import { useState, useEffect } from 'react';
import { Tool, UserToolVisibility, toggleToolGlobal, toggleToolForUser, removeToolOverrideForUser, getToolVisibilityForUser } from '@/app/actions/tool-actions';
import { Check, X, Loader2, Search, RotateCcw, Save } from 'lucide-react';

interface ToolVisibilityManagerProps {
    initialTools: Tool[];
}

type OverrideStatus = 'default' | 'visible' | 'hidden';

export default function ToolVisibilityManager({ initialTools }: ToolVisibilityManagerProps) {
    const [tools, setTools] = useState<Tool[]>(initialTools);
    const [loading, setLoading] = useState<string | null>(null);

    // User Management State
    const [targetUserId, setTargetUserId] = useState('');
    const [userOverrides, setUserOverrides] = useState<UserToolVisibility[]>([]);
    const [userLoading, setUserLoading] = useState(false);
    const [activeUser, setActiveUser] = useState<string | null>(null);

    // Sync state with prop updates
    useEffect(() => {
        setTools(initialTools);
    }, [initialTools]);

    const handleGlobalToggle = async (toolId: string, currentStatus: boolean) => {
        setLoading(toolId);
        try {
            await toggleToolGlobal(toolId, !currentStatus);
            setTools(tools.map(t =>
                t.id === toolId ? { ...t, is_globally_visible: !currentStatus } : t
            ));
        } catch (error) {
            console.error('Failed to toggle tool', error);
            alert('Failed to update tool visibility');
        } finally {
            setLoading(null);
        }
    };

    const handleLoadUser = async () => {
        if (!targetUserId.trim()) return;
        setUserLoading(true);
        try {
            const overrides = await getToolVisibilityForUser(targetUserId);
            setUserOverrides(overrides);
            setActiveUser(targetUserId);
        } catch (error) {
            console.error('Failed to load user', error);
            alert('Failed to load user settings');
        } finally {
            setUserLoading(false);
        }
    };

    const handleUserOverrideChange = async (toolId: string, status: OverrideStatus) => {
        if (!activeUser) return;
        setLoading(`user-${toolId}`);
        try {
            if (status === 'default') {
                await removeToolOverrideForUser(activeUser, toolId);
                // Remove from local state
                setUserOverrides(prev => prev.filter(o => o.tool_id !== toolId));
            } else {
                const isVisible = status === 'visible';
                await toggleToolForUser(activeUser, toolId, isVisible);
                // Update local state
                setUserOverrides(prev => {
                    const exists = prev.find(o => o.tool_id === toolId);
                    if (exists) {
                        return prev.map(o => o.tool_id === toolId ? { ...o, is_visible: isVisible } : o);
                    }
                    return [...prev, { user_id: activeUser, tool_id: toolId, is_visible: isVisible }];
                });
            }
        } catch (error) {
            console.error('Failed to set override', error);
            alert('Failed to update user override');
        } finally {
            setLoading(null);
        }
    };

    const getOverrideStatus = (toolId: string): OverrideStatus => {
        const override = userOverrides.find(o => o.tool_id === toolId);
        if (!override) return 'default';
        return override.is_visible ? 'visible' : 'hidden';
    };

    const getEffectiveStatus = (tool: Tool) => {
        const override = userOverrides.find(o => o.tool_id === tool.id);
        if (override) return override.is_visible;
        return tool.is_globally_visible;
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Tool Visibility Control</h2>

            {/* Global Settings Table */}
            <div className="overflow-x-auto mb-8">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-700">
                            <th className="pb-3 text-slate-400 font-medium">Tool Name</th>
                            <th className="pb-3 text-slate-400 font-medium">ID</th>
                            <th className="pb-3 text-slate-400 font-medium">Global Status</th>
                            <th className="pb-3 text-slate-400 font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {tools.map((tool) => (
                            <tr key={tool.id} className="group hover:bg-slate-700/30 transition">
                                <td className="py-4 text-white font-medium">{tool.name}</td>
                                <td className="py-4 text-slate-500 font-mono text-xs">{tool.id}</td>
                                <td className="py-4">
                                    {tool.is_globally_visible ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                            <Check className="w-3 h-3" /> Visible
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">
                                            <X className="w-3 h-3" /> Hidden
                                        </span>
                                    )}
                                </td>
                                <td className="py-4">
                                    <button
                                        onClick={() => handleGlobalToggle(tool.id, tool.is_globally_visible)}
                                        disabled={loading === tool.id}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${tool.is_globally_visible
                                                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            }`}
                                    >
                                        {loading === tool.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {tool.is_globally_visible ? 'Hide Globally' : 'Show Globally'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* User Specific Settings */}
            <div className="mt-6 p-6 bg-slate-900/50 rounded-xl border border-slate-700/50">
                <h3 className="text-lg font-bold text-white mb-2">User-Specific Overrides</h3>
                <p className="text-sm text-slate-400 mb-4">Search for a user by UUID to manage their specific tool access. Overrides take precedence over global settings.</p>

                <div className="flex gap-2 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Enter User UUID..."
                            value={targetUserId}
                            onChange={(e) => setTargetUserId(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white w-full focus:ring-2 focus:ring-yellow-400/50 outline-none transition"
                        />
                    </div>
                    <button
                        onClick={handleLoadUser}
                        disabled={userLoading || !targetUserId}
                        className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg text-sm font-bold hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {userLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load Settings'}
                    </button>
                </div>

                {activeUser && (
                    <div className="overflow-x-auto">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-slate-400 text-sm">Editing settings for:</span>
                            <span className="text-white font-mono bg-slate-800 px-2 py-1 rounded text-xs">{activeUser}</span>
                        </div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="pb-3 text-slate-400 font-medium">Tool</th>
                                    <th className="pb-3 text-slate-400 font-medium">Global</th>
                                    <th className="pb-3 text-slate-400 font-medium">User Override</th>
                                    <th className="pb-3 text-slate-400 font-medium">Effective Result</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {tools.map((tool) => {
                                    const status = getOverrideStatus(tool.id);
                                    const effective = getEffectiveStatus(tool);
                                    return (
                                        <tr key={tool.id} className="group hover:bg-slate-800/50 transition">
                                            <td className="py-3 text-white text-sm font-medium">{tool.name}</td>
                                            <td className="py-3">
                                                {tool.is_globally_visible ? (
                                                    <span className="text-emerald-400 text-xs flex items-center gap-1"><Check className="w-3 h-3" /> Visible</span>
                                                ) : (
                                                    <span className="text-red-400 text-xs flex items-center gap-1"><X className="w-3 h-3" /> Hidden</span>
                                                )}
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 w-fit border border-slate-700">
                                                    <button
                                                        onClick={() => handleUserOverrideChange(tool.id, 'default')}
                                                        disabled={loading === `user-${tool.id}`}
                                                        className={`px-3 py-1 rounded text-xs font-medium transition ${status === 'default'
                                                                ? 'bg-slate-600 text-white shadow-sm'
                                                                : 'text-slate-400 hover:text-white'
                                                            }`}
                                                        title="Use Global Setting"
                                                    >
                                                        Default
                                                    </button>
                                                    <button
                                                        onClick={() => handleUserOverrideChange(tool.id, 'visible')}
                                                        disabled={loading === `user-${tool.id}`}
                                                        className={`px-3 py-1 rounded text-xs font-medium transition ${status === 'visible'
                                                                ? 'bg-emerald-500 text-white shadow-sm'
                                                                : 'text-slate-400 hover:text-white'
                                                            }`}
                                                        title="Force Show"
                                                    >
                                                        Show
                                                    </button>
                                                    <button
                                                        onClick={() => handleUserOverrideChange(tool.id, 'hidden')}
                                                        disabled={loading === `user-${tool.id}`}
                                                        className={`px-3 py-1 rounded text-xs font-medium transition ${status === 'hidden'
                                                                ? 'bg-red-500 text-white shadow-sm'
                                                                : 'text-slate-400 hover:text-white'
                                                            }`}
                                                        title="Force Hide"
                                                    >
                                                        Hide
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                {effective ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                                        Visible
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">
                                                        Hidden
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

```

## File: src/components/analytics/AnalyticsTool.tsx
```tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, Bookmark, MousePointer, TrendingUp, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { getAnalyticsSummaryAction, getTopPinsAction, AnalyticsSummary, DailyPerformance, TopPin } from "@/app/actions/analytics-actions";

export default function AnalyticsTool() {
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [daily, setDaily] = useState<DailyPerformance[]>([]);
    const [topPins, setTopPins] = useState<TopPin[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const [summaryResult, pinsResult] = await Promise.all([
                getAnalyticsSummaryAction(),
                getTopPinsAction()
            ]);

            if (summaryResult.success && summaryResult.data) {
                setSummary(summaryResult.data.summary);
                setDaily(summaryResult.data.daily);
            }

            if (pinsResult.success && pinsResult.data) {
                setTopPins(pinsResult.data);
            }

            setLoading(false);
        };

        loadData();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading analytics...</div>;
    }

    const maxImpressions = Math.max(1, ...daily.map(d => d.impressions));

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    title="Total Impressions"
                    value={summary?.impressions.toLocaleString() || "0"}
                    icon={Eye}
                    trend="+12%"
                    trendUp={true}
                    color="text-blue-500"
                />
                <KpiCard
                    title="Total Saves"
                    value={summary?.saves.toLocaleString() || "0"}
                    icon={Bookmark}
                    trend="+5%"
                    trendUp={true}
                    color="text-red-500"
                />
                <KpiCard
                    title="Outbound Clicks"
                    value={summary?.outboundClicks.toLocaleString() || "0"}
                    icon={MousePointer}
                    trend="-2%"
                    trendUp={false}
                    color="text-green-500"
                />
                <KpiCard
                    title="Avg. Engagement"
                    value={`${summary?.engagementRate}%`}
                    icon={Activity}
                    trend="+0.5%"
                    trendUp={true}
                    color="text-purple-500"
                />
            </div>

            {/* Main Chart */}
            <div className="grid lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Performance Overview</CardTitle>
                        <CardDescription>Impressions over the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 flex items-end gap-4 mt-4">
                            {daily.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div className="relative w-full flex items-end justify-center h-full">
                                        <div
                                            className="w-full max-w-[40px] rounded-t-lg bg-primary/20 group-hover:bg-primary/40 transition-all relative"
                                            style={{ height: `${(day.impressions / maxImpressions) * 100}%` }}
                                        >
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                                                {day.impressions}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Pins */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Top Performing Pins
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {topPins.map(pin => (
                            <div key={pin.id} className="flex gap-3 items-start group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={pin.image}
                                    alt={pin.title}
                                    className="w-12 h-16 object-cover rounded-md bg-muted"
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                                        {pin.title}
                                    </h4>
                                    <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Eye className="w-3 h-3" /> {pin.impressions.toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MousePointer className="w-3 h-3" /> {pin.clicks}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function KpiCard({ title, value, icon: Icon, trend, trendUp, color }: any) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="flex items-center justify-between pt-2">
                    <div className="text-2xl font-bold">{value}</div>
                    <div className={`text-xs flex items-center ${trendUp ? 'text-green-500' : 'text-red-500'}`}>
                        {trendUp ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                        {trend}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

```

## File: src/components/article-writer/ArticleWriterTool.tsx
```tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, FileText, Image as ImageIcon, Layers } from "lucide-react";
import KeywordStrategy from "./KeywordStrategy";
import ContentEngine from "./ContentEngine";
import PinFactory from "./PinFactory";
import PromptSettings from "./PromptSettings";

// Shared Types
export interface KeywordCluster {
    topic: string;
    keywords: string[];
}

export interface Product {
    name: string;
    link: string;
    image: string;
}

export interface ArticleData {
    topic: string;
    title: string;
    content: string; // HTML
    heroImage?: string; // URL for Pin Factory
    wpLink?: string;
}

import { getUser } from "@/lib/supabase";
import { saveUserDataAction, loadUserDataAction } from "@/app/actions/user-data-actions";
import { useEffect } from "react";

export default function ArticleWriterTool() {
    const [activeTab, setActiveTab] = useState("strategy");

    // Load initial data
    useEffect(() => {
        const load = async () => {
            const { user } = await getUser();
            if (user) {
                const data = await loadUserDataAction(user.id);
                if (data.clusters) setClusters(data.clusters);
                if (data.products) setProducts(data.products);
                if (data.articles) setGeneratedArticles(data.articles);
            }
        };
        load();
    }, []);

    const saveData = async (key: string, value: any) => {
        const { user } = await getUser();
        if (user) {
            await saveUserDataAction(user.id, key, value);
        }
    };

    // Wrappers to save on state change
    const updateClusters = (newClusters: KeywordCluster[]) => {
        setClusters(newClusters);
        saveData('clusters', newClusters);
    };

    const updateProducts = (newProducts: Product[]) => {
        setProducts(newProducts);
        saveData('products', newProducts);
    };

    const updateArticles = (newArticles: ArticleData[]) => {
        setGeneratedArticles(newArticles);
        saveData('articles', newArticles);
    };

    // Global State (Persists across tabs)
    const [apiKey, setApiKey] = useState("");
    const [activePinterestToken, setActivePinterestToken] = useState("");
    const [apiProvider, setApiProvider] = useState<"gemini" | "openai">("gemini");

    // WordPress Creds
    const [wpUrl, setWpUrl] = useState("");
    const [wpUser] = useState("");

    const [wpPassword, setWpPassword] = useState("");


    // Data
    const [clusters, setClusters] = useState<KeywordCluster[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [generatedArticles, setGeneratedArticles] = useState<ArticleData[]>([]);



    return (
        <div className="space-y-6">
            {/* API Configuration & Settings Header */}
            <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">AI Provider</label>
                            <select
                                className="w-full p-2 rounded-md border bg-background"
                                value={apiProvider}
                                onChange={(e) => setApiProvider(e.target.value as "gemini" | "openai")}

                            >
                                <option value="gemini">Google Gemini</option>
                                {/* <option value="openai">OpenAI (Coming Soon)</option> */}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">AI API Key</label>
                            <input
                                type="password"
                                className="w-full p-2 rounded-md border bg-background"
                                placeholder="sk-..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">WordPress URL</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md border bg-background"
                                placeholder="https://mysite.com"
                                value={wpUrl}
                                onChange={(e) => setWpUrl(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">WP App Password</label>
                            <input
                                type="password"
                                className="w-full p-2 rounded-md border bg-background"
                                placeholder="abcd efgh ..."
                                value={wpPassword}
                                onChange={(e) => setWpPassword(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-14 bg-muted p-1 rounded-lg">
                    <TabsTrigger value="strategy" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-base">
                        <Layers className="w-5 h-5" />
                        1. Strategy & Data
                    </TabsTrigger>
                    <TabsTrigger value="content" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-base">
                        <FileText className="w-5 h-5" />
                        2. Content Engine
                    </TabsTrigger>
                    <TabsTrigger value="pins" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-base">
                        <ImageIcon className="w-5 h-5" />
                        3. Pin Factory
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm text-base">
                        <Settings className="w-5 h-5" />
                        Settings
                    </TabsTrigger>
                </TabsList>


                <TabsContent value="strategy">
                    <KeywordStrategy
                        clusters={clusters}
                        setClusters={updateClusters}
                        products={products}
                        setProducts={updateProducts}
                        onNext={() => setActiveTab('content')}
                    />
                </TabsContent>

                <TabsContent value="content">
                    <ContentEngine
                        clusters={clusters}
                        products={products}
                        apiKey={apiKey}
                        wpCredentials={{ url: wpUrl, user: wpUser, password: wpPassword }}
                        articles={generatedArticles}
                        setArticles={updateArticles}
                        onNext={() => setActiveTab('pins')}
                    />
                </TabsContent>

                <TabsContent value="pins">
                    <PinFactory
                        articles={generatedArticles}
                    />
                </TabsContent>

                <TabsContent value="settings">
                    <PromptSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}

```

## File: src/components/article-writer/ContentEngine.tsx
```tsx
"use client";

import { useState } from "react";
import { KeywordCluster, Product, ArticleData, WPCredentials } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Check, Share, RefreshCw, ArrowRight } from "lucide-react";

import { generateArticleAction } from "@/app/actions/ai-actions";
import { publishPostAction } from "@/app/actions/wp-actions";
import { useToast } from "@/components/ui/use-toast";

interface ContentEngineProps {
    clusters: KeywordCluster[];
    products: Product[];
    apiKey: string;
    wpCredentials: WPCredentials;
    articles: ArticleData[];
    setArticles: (articles: ArticleData[]) => void;
    onNext: () => void;
}

import { usePrompts } from "./usePrompts";
import { PromptCategory } from "./prompts";

// ... existing imports

export default function ContentEngine({ clusters, products, apiKey, wpCredentials, articles, setArticles, onNext }: ContentEngineProps) {
    const [selectedTopic, setSelectedTopic] = useState<KeywordCluster | null>(null);
    const [generating, setGenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);
    // const [statusMsg, setStatusMsg] = useState("");
    const { toast } = useToast();

    // Load prompts
    const { prompts } = usePrompts();


    const handleGenerate = async () => {
        if (!selectedTopic || !apiKey) {
            toast({ title: "Missing Information", description: "Please select a topic and ensure API Key is set.", variant: "destructive" });
            return;
        }

        setGenerating(true);
        toast({ title: "Started", description: "Matching products and generating article..." });

        // 1. Find Matching Products
        const topicLower = selectedTopic.topic.toLowerCase();
        let matched = products.filter(p => p.name.toLowerCase().includes(topicLower));

        // Fallback to random 3 if no match
        if (matched.length === 0 && products.length > 0) {
            matched = products.sort(() => 0.5 - Math.random()).slice(0, 3);
        } else {
            matched = matched.slice(0, 3); // Top 3 matches
        }

        // 2. Construct Prompt
        const productHTML = matched.map(p =>
            `<div class="my-6 p-4 border rounded-lg shadow-sm bg-white max-w-sm mx-auto">
                <img src="${p.image}" alt="${p.name}" class="w-full h-64 object-cover rounded-md mb-4" />
                <h3 class="font-bold text-lg mb-2 text-slate-900">${p.name}</h3>
                <a href="${p.link}" class="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors no-underline">Check Price</a>
             </div>`
        ).join("\n");

        // Simple Heuristic for Category (can be improved with UI selector later)
        let category: PromptCategory = 'general';
        if (topicLower.includes('decor') || topicLower.includes('room') || topicLower.includes('home')) category = 'home_decor';
        else if (topicLower.includes('fashion') || topicLower.includes('outfit') || topicLower.includes('wear') || topicLower.includes('style')) category = 'fashion';
        else if (topicLower.includes('food') || topicLower.includes('recipe') || topicLower.includes('cook') || topicLower.includes('meal')) category = 'food';

        const basePrompt = prompts[category] || prompts['general'];
        const itemCount = 5; // Default for now, could extract from title if needed

        const prompt = basePrompt
            .replace(/{title}/g, selectedTopic.topic)
            .replace(/{itemCount}/g, itemCount.toString())
            .replace(/{date}/g, new Date().toDateString())
            + `\n\nIMPORTANT: You MUST embed the following HTML Product Cards naturally within the body: \n${productHTML}\n\nOutput ONLY HTML code starting with <h1>.`;

        try {
            const result = await generateArticleAction(prompt, apiKey);

            if (result.error || !result.content) {
                throw new Error(result.error || "Generation failed");
            }

            const content = result.content;

            // Extract Title from H1
            const titleMatch = content.match(/<h1>(.*?)<\/h1>/i);
            const title = titleMatch ? titleMatch[1] : selectedTopic.topic; // Basic extraction

            // Extract a Hero Image candidate (first product image or null)
            const heroImage = matched.length > 0 ? matched[0].image : undefined;

            const newArticle: ArticleData = {
                topic: selectedTopic.topic,
                title: title,
                content: content,
                heroImage: heroImage,
                wpStatus: 'unsent'
            };

            setArticles([...articles, newArticle]);
            toast({ title: "Success", description: "Article successfully generated!", variant: "success" });
        } catch (error: unknown) {

            console.error(error);
            const msg = error instanceof Error ? error.message : "Unknown error";
            toast({ title: "Generation Failed", description: msg, variant: "destructive" });
        } finally {
            setGenerating(false);
        }
    };

    const publishToWP = async (article: ArticleData, index: number) => {
        if (!wpCredentials.url || !wpCredentials.user || !wpCredentials.password) {
            toast({ title: "Error", description: "Missing WordPress Credentials in Strategy/Settings.", variant: "destructive" });
            return;
        }

        setPublishing(true);
        toast({ title: "Publishing", description: "Sending to WordPress..." });

        try {
            // Use Server Action instead of Client Service
            const result = await publishPostAction(article, wpCredentials);

            if (result.error || !result.link) {
                throw new Error(result.error || "Failed to publish post");
            }

            // Update article status
            const updated = [...articles];
            updated[index] = {
                ...article,
                wpLink: result.link,
                wpStatus: 'draft'
            };
            setArticles(updated);
            toast({ title: "Published", description: "Article saved as draft in WordPress.", variant: "success" });

        } catch (error: unknown) {

            console.error(error);
            const msg = error instanceof Error ? error.message : "Unknown error";
            toast({ title: "Publish Error", description: msg, variant: "destructive" });
            const updated = [...articles];
            updated[index] = { ...article, wpStatus: 'failed' };
            setArticles(updated);
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Topic Selector */}
            <Card className="col-span-1 bg-white dark:bg-slate-950">
                <CardHeader>
                    <CardTitle>Select Topic</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px]">
                        {clusters.map((c, i) => (
                            <div
                                key={i}
                                onClick={() => setSelectedTopic(c)}
                                className={`p-3 mb-2 rounded-lg cursor-pointer border transition-colors ${selectedTopic?.topic === c.topic ? 'bg-primary/10 border-primary' : 'hover:bg-slate-100'} text-slate-900 border-slate-200`}
                            >
                                <div className="font-semibold">{c.topic}</div>
                                <div className="text-xs text-slate-500">{c.keywords.length} keywords</div>
                            </div>
                        ))}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Middle: Generator & Preview */}
            <Card className="col-span-2 bg-white dark:bg-slate-950">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Content Studio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4 items-center bg-slate-50 border border-slate-100 p-4 rounded-lg">
                        <div className="flex-1">
                            <span className="text-sm font-medium text-slate-500">Chosen Topic: </span>
                            <span className="font-bold text-lg text-slate-900">{selectedTopic?.topic || "None"}</span>
                        </div>
                        <Button
                            onClick={handleGenerate}
                            disabled={generating || !selectedTopic}
                            className="w-40"
                        >
                            {generating ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                            Generate Article
                        </Button>
                    </div>

                    {/* Generated Articles List */}
                    <div className="space-y-4 mt-6">
                        {articles.map((article, idx) => (
                            <Card key={idx} className="overflow-hidden border-slate-200 bg-white">
                                <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center px-4">
                                    <h3 className="font-bold truncate max-w-md text-slate-900">{article.title}</h3>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant={article.wpStatus === 'draft' ? "outline" : "default"}
                                            onClick={() => publishToWP(article, idx)}
                                            disabled={publishing || article.wpStatus === 'draft'}
                                        >
                                            {article.wpStatus === 'draft'
                                                ? <span className="text-green-600 flex items-center"><Check className="w-3 h-3 mr-1" /> Draft Saved</span>
                                                : <span className="flex items-center"><Share className="w-3 h-3 mr-1" /> Send to WP</span>
                                            }
                                        </Button>
                                    </div>
                                </div>
                                {/* White background enforced for article content for better readability */}
                                <div className="p-8 max-h-[600px] overflow-y-auto text-base prose prose-slate max-w-none bg-white text-slate-900 rounded-b-lg shadow-inner">
                                    <div dangerouslySetInnerHTML={{ __html: article.content }} />
                                </div>
                            </Card>
                        ))}
                    </div>

                    {articles.length > 0 && (
                        <div className="flex justify-end mt-4">
                            <Button onClick={onNext} variant="secondary">
                                Go to Pin Factory <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

```

## File: src/components/article-writer/KeywordStrategy.tsx
```tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";


import { useState, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { KeywordCluster, Product } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowRight, Save, Database, Trash2, FileSpreadsheet } from "lucide-react";
import { saveKeywordFileAction, getUserKeywordsAction, deleteKeywordFileAction, saveProductsAction, DBKeywordFile, getUserProductBatchesAction, getProductsInBatchAction, deleteProductBatchAction } from "@/app/actions/user-actions";
import { useToast } from "@/components/ui/use-toast";

interface KeywordStrategyProps {
    clusters: KeywordCluster[];
    setClusters: (clusters: KeywordCluster[]) => void;
    products: Product[];
    setProducts: (products: Product[]) => void;
    onNext: () => void;
}

export default function KeywordStrategy({ clusters, setClusters, products, setProducts, onNext }: KeywordStrategyProps) {
    const [loading, setLoading] = useState(false);
    const [savedFiles, setSavedFiles] = useState<DBKeywordFile[]>([]);
    const [savedProductBatches, setSavedProductBatches] = useState<{ batch_name: string, created_at: string }[]>([]);
    const [status, setStatus] = useState("");
    const { toast } = useToast();

    // Load saved files on mount
    useEffect(() => {
        loadSavedFiles();
    }, []);

    const loadSavedFiles = async () => {
        try {
            const [keywordsRes, productsRes] = await Promise.all([
                getUserKeywordsAction(),
                getUserProductBatchesAction()
            ]);

            if (keywordsRes.success && keywordsRes.data) {
                setSavedFiles(keywordsRes.data);
            }

            if (productsRes.success && productsRes.data) {
                setSavedProductBatches(productsRes.data);
            }

        } catch (e) {
            console.error("Failed to load user files", e);
        }
    };

    const handleKeywordUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setStatus(`Parsing ${file.name}...`);

        let rawKeywords: string[] = [];

        try {
            if (file.name.endsWith(".csv")) {
                Papa.parse(file, {
                    complete: (results) => {
                        rawKeywords = results.data.flat().filter(k => typeof k === 'string' && k.length > 2) as string[];
                        finishUpload(rawKeywords, file.name);
                    },
                    header: false,
                    skipEmptyLines: true
                });
                return; // Papa is async callback
            } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                rawKeywords = json.flat().filter((k: any) => typeof k === 'string' && k.length > 2) as string[];
            } else if (file.name.endsWith(".txt")) {
                const text = await file.text();
                rawKeywords = text.split('\n').map(k => k.trim()).filter(k => k.length > 2);
            } else if (file.name.endsWith(".docx")) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                rawKeywords = result.value.split('\n').map(k => k.trim()).filter(k => k.length > 2);
            } else {
                throw new Error("Unsupported file format. Please use CSV, Excel, TXT, or DOCX.");
            }

            // For non-CSV sync/async awaits
            finishUpload(rawKeywords, file.name);

        } catch (error: any) {
            console.error("Upload Error:", error);
            setStatus("Error parsing file");
            toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
            setLoading(false);
        }
    };

    const finishUpload = async (keywords: string[], filename: string) => {
        if (keywords.length === 0) {
            setLoading(false);
            setStatus("No keywords found");
            return;
        }

        const newClusters = simpleCluster(keywords);
        setClusters(newClusters);
        setLoading(false);
        setStatus("Clustered! Saving to DB...");

        // Auto-save to DB
        try {
            const result = await saveKeywordFileAction(filename, newClusters);
            if (result.success) {
                await loadSavedFiles();
                setStatus("Saved to Database!");
                toast({ title: "Saved", description: "Keywords saved to database.", variant: "success" });
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            console.error("Failed to save", e);
            setStatus("Error saving to DB");
            const msg = e instanceof Error ? e.message : "Unknown error";
            toast({ title: "Save Failed", description: msg, variant: "destructive" });
        }
    };

    const handleLoadFile = (file: DBKeywordFile) => {
        setClusters(file.content);
        setStatus(`Loaded ${file.filename}`);
    };

    const handleDeleteFile = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this file?")) return;
        try {
            const result = await deleteKeywordFileAction(id);
            if (result.success) {
                await loadSavedFiles();
                toast({ title: "Deleted", description: "File deleted.", variant: "success" });
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Delete failed.", variant: "destructive" });
        }
    };

    const handleLoadProductBatch = async (batch: { batch_name: string, created_at: string }) => {
        setLoading(true);
        setStatus("Loading products...");
        try {
            const result = await getProductsInBatchAction(batch.batch_name, batch.created_at);
            if (result.success && result.data) {
                setProducts(result.data);
                setStatus(`Loaded ${result.data.length} products`);
                toast({ title: "Loaded", description: `${result.data.length} products loaded.`, variant: "success" });
            } else {
                throw new Error(result.error || "Failed to load");
            }
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: "Failed to load products.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProductBatch = async (batch: { batch_name: string, created_at: string }, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this product list?")) return;

        try {
            const result = await deleteProductBatchAction(batch.batch_name, batch.created_at);
            if (result.success) {
                await loadSavedFiles(); // Refresh list
                toast({ title: "Deleted", description: "Product list deleted.", variant: "success" });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
        }
    };

    const processProductData = async (data: any[], filename: string) => {
        // Helper to safely get value from object with case-insensitive check
        const getValue = (obj: any, keys: string[]) => {
            if (Array.isArray(obj)) return undefined;
            for (const key of keys) {
                const val = obj[key];
                if (val !== undefined && val !== null && val !== '') return String(val).trim();

                const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
                if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) return String(obj[foundKey]).trim();
            }
            return '';
        };

        const parsedProducts: Product[] = data.map((row: any) => {
            const name = getValue(row, ['name', 'product name', 'title', 'product_name']) || (Array.isArray(row) ? String(row[0] || '') : '');
            const link = getValue(row, ['link', 'url', 'product link', 'product_url', 'affiliate_link']) || (Array.isArray(row) ? String(row[1] || '') : '');
            const image = getValue(row, ['image', 'image_url', 'image url', 'img', 'src']) || (Array.isArray(row) ? String(row[2] || '') : '');

            return { name, link, image };
        }).filter((p: Product) => p.name && p.name.length > 1); // Loosened validation

        if (parsedProducts.length === 0) {
            toast({ title: "No Products Found", description: "Could not identify products. Check headers: Name, Link, Image.", variant: "destructive" });
            return;
        }

        setProducts(parsedProducts);

        try {
            const result = await saveProductsAction(parsedProducts, filename);
            if (result.success) {
                setStatus(`Uploaded ${parsedProducts.length} products to DB`);
                toast({ title: "Success", description: `${parsedProducts.length} products saved to DB.`, variant: "success" });
                loadSavedFiles(); // Refresh list
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            console.error("Product save failed", e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            const time = new Date().toLocaleTimeString();
            toast({ title: `Save Failed (${time})`, description: msg, variant: "destructive" });
        }
    };

    const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        if (isExcel) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                processProductData(data, file.name);
            };
            reader.readAsBinaryString(file);
        } else {
            // CSV Fallback
            Papa.parse(file, {
                complete: (results) => {
                    processProductData(results.data, file.name);
                },
                header: true,
                skipEmptyLines: true
            });
        }
    };

    // A very basic text clustering function
    const simpleCluster = (keywords: string[]): KeywordCluster[] => {
        const clusters: Record<string, string[]> = {};

        keywords.forEach(keyword => {
            const clean = keyword.toLowerCase().trim();
            const words = clean.split(' ');
            const topic = words.slice(0, 2).join(' ');

            if (!clusters[topic]) {
                clusters[topic] = [];
            }
            clusters[topic].push(keyword);
        });

        return Object.entries(clusters)
            .map(([topic, kws]) => ({ topic: topic.toUpperCase(), keywords: kws }))
            .sort((a, b) => b.keywords.length - a.keywords.length);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col h-full bg-card dark:bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Upload className="w-5 h-5" />
                            1. Keywords Data
                        </div>
                        {status && <Badge variant="outline" className="text-xs bg-card text-foreground">{status}</Badge>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                    {/* Saved Files List */}
                    {savedFiles.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Database className="w-4 h-4" /> Your Saved Lists
                            </h4>
                            <ScrollArea className="h-32 border rounded-md bg-card text-foreground">
                                <div className="p-2 space-y-1">
                                    {savedFiles.map(file => (
                                        <div
                                            key={file.id}
                                            onClick={() => handleLoadFile(file)}
                                            className="flex justify-between items-center p-2 text-sm hover:bg-muted/50 cursor-pointer rounded group transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Save className="w-3 h-3 text-muted-foreground" />
                                                <span>{file.filename}</span>
                                                <span className="text-xs text-muted-foreground">({new Date(file.created_at).toLocaleDateString()})</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                                                onClick={(e) => handleDeleteFile(file.id, e)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer relative shrink-0 transition-colors bg-card">
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls, .txt, .docx"
                            onChange={handleKeywordUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="space-y-2">
                            <p className="font-medium text-foreground">Upload New CSV</p>
                            <p className="text-xs text-muted-foreground">Supports CSV, Excel, TXT, DOCX</p>
                        </div>
                    </div>

                    {loading && <p className="text-sm text-center animate-pulse text-muted-foreground">Processing...</p>}

                    {clusters.length > 0 && (
                        <div className="bg-muted/30 p-4 rounded-md flex-1 min-h-[150px] overflow-y-auto border border-border">
                            <h4 className="font-semibold mb-2 text-foreground">Active Clusters ({clusters.length})</h4>
                            <ul className="space-y-2 text-sm">
                                {clusters.map((c, i) => (
                                    <li key={i} className="flex justify-between p-2 bg-card rounded border border-border shadow-sm">
                                        <span className="text-foreground">{c.topic}</span>
                                        <span className="text-muted-foreground">{c.keywords.length} kw</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="flex flex-col h-full bg-card dark:bg-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5" />
                        2. Product Database
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                    {/* Saved Products List */}
                    {savedProductBatches.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Database className="w-4 h-4" /> Your Saved Product Lists
                            </h4>
                            <ScrollArea className="h-32 border rounded-md bg-card text-foreground">
                                <div className="p-2 space-y-1">
                                    {savedProductBatches.map((batch, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleLoadProductBatch(batch)}
                                            className="flex justify-between items-center p-2 text-sm hover:bg-muted/50 cursor-pointer rounded group transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Save className="w-3 h-3 text-muted-foreground" />
                                                <span>{batch.batch_name}</span>
                                                <span className="text-xs text-muted-foreground">({new Date(batch.created_at).toLocaleDateString()})</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                                                onClick={(e) => handleDeleteProductBatch(batch, e)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer relative shrink-0 transition-colors bg-card">
                        <input
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            onChange={handleProductUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <div className="space-y-2">
                            <p className="font-medium text-foreground">Upload Products</p>
                            <p className="text-xs text-muted-foreground">Supports CSV, Excel (.xlsx, .xls)</p>
                            <p className="text-xs text-muted-foreground">Headers: Name, Link, Image</p>
                        </div>
                    </div>

                    {products.length > 0 ? (
                        <div className="bg-green-50 dark:bg-green-950/20 p-6 rounded-md flex-1 flex flex-col items-center justify-center border border-green-100 dark:border-green-900">
                            <h4 className="font-semibold mb-2 text-green-800 dark:text-green-400">Active Session Products</h4>
                            <p className="text-5xl font-bold text-green-600 dark:text-green-500 my-4">{products.length}</p>
                            <p className="text-sm text-green-700 dark:text-green-300 text-center">Ready for matching in Content Engine.</p>
                        </div>
                    ) : (
                        <div className="bg-muted/30 p-6 rounded-md flex-1 flex items-center justify-center border border-border text-muted-foreground text-sm">
                            <p>No products loaded yet.</p>
                        </div>
                    )}

                    <div className="pt-4 mt-auto flex justify-end">
                        <Button
                            onClick={onNext}
                            disabled={clusters.length === 0}
                            className="w-full md:w-auto"
                        >
                            Continue to Content Engine <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

```

## File: src/components/article-writer/PinFactory.tsx
```tsx
"use client";

import { useState } from "react";
import { ArticleData } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, Image as ImageIcon } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useToast } from "@/components/ui/use-toast";

interface PinFactoryProps {
    articles: ArticleData[];
}

interface PinResult {
    articleTitle: string;
    pinTitle: string;
    pinDescription: string;
    destinationLink: string;
    imageBlob: Blob;
    imageName: string;
}

export default function PinFactory({ articles }: PinFactoryProps) {
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<PinResult[]>([]);
    const [currentAction, setCurrentAction] = useState("");
    const { toast } = useToast();

    const processImages = async () => {
        setProcessing(true);
        setResults([]);
        toast({ title: "Started", description: "Generating Pinterest assets..." });

        const generatedResults: PinResult[] = [];
        const total = articles.length;

        try {
            for (let i = 0; i < total; i++) {
                const article = articles[i];
                if (!article.heroImage) continue;

                // Update Status
                setCurrentAction(`Processing: ${article.topic}`);
                setProgress(((i) / total) * 100);

                // 1. Generate Metadata
                const pinTitle = article.title;
                const pinDesc = article.topic;

                // TODO: In a real app, we might call AI here to optimize for Pinterest specifically.
                // For speed/prototype, we'll reuse the Article title or do a quick rule-based generic.

                // 2. Generate Image (Canvas)
                const blob = await generatePinCanvas(article.heroImage);
                if (blob) {
                    generatedResults.push({
                        articleTitle: article.title,
                        pinTitle: pinTitle,
                        pinDescription: `Check out our guide on ${article.topic}! ${pinDesc}`,
                        destinationLink: article.wpLink || "https://mysite.com",
                        imageBlob: blob,
                        imageName: `pin_${i + 1}_${article.topic.replace(/\s+/g, '-')}.jpg`
                    });
                }
            }

            setResults(generatedResults);
            setProgress(100);
            setCurrentAction("Done! Ready to Download.");
            toast({ title: "Success", description: `${generatedResults.length} Pins created!`, variant: "success" });

        } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            setCurrentAction(`Error: ${msg}`);
            toast({ title: "Generation Failed", description: msg, variant: "destructive" });
        } finally {
            setProcessing(false);
        }
    };

    const generatePinCanvas = (imageUrl: string): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1000;
            canvas.height = 1500;

            if (!ctx) return resolve(null);

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                // 1. Draw Blurred Background
                ctx.filter = 'blur(30px)';
                // Draw image to fill canvas (cover)
                const ratio = Math.max(canvas.width / img.width, canvas.height / img.height);
                const centerShift_x = (canvas.width - img.width * ratio) / 2;
                const centerShift_y = (canvas.height - img.height * ratio) / 2;
                ctx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);

                // Reset filter
                ctx.filter = 'none';

                // 2. Draw Main Image (Centered, max 900px width)
                // Maintain aspect ratio
                const targetWidth = 900;
                const scale = targetWidth / img.width;
                const targetHeight = img.height * scale;

                const x = (canvas.width - targetWidth) / 2;
                const y = (canvas.height - targetHeight) / 2;

                // Add simple shadow
                ctx.shadowColor = "rgba(0,0,0,0.5)";
                ctx.shadowBlur = 20;
                ctx.drawImage(img, x, y, targetWidth, targetHeight);

                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
            };
            img.onerror = () => {
                console.warn("Could not load image for canvas", imageUrl);
                resolve(null);
            };
            img.src = imageUrl;
        });
    };

    const downloadZip = async () => {
        const zip = new JSZip();

        // CSV Content
        let csv = "Title,Description,Destination Link,Image Filename\n";
        results.forEach(r => {
            // Escape quotes for CSV
            const t = r.pinTitle.replace(/"/g, '""');
            const d = r.pinDescription.replace(/"/g, '""');
            csv += `"${t}","${d}","${r.destinationLink}","images/${r.imageName}"\n`;
        });

        zip.file("pinterest_bulk.csv", csv);

        const imgFolder = zip.folder("images");
        results.forEach(r => {
            imgFolder?.file(r.imageName, r.imageBlob);
        });

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "pin_lions_bulk_export.zip");
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-slate-950">
                <CardHeader>
                    <CardTitle>Pin Factory Queue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                        Ready to process <strong>{articles.filter(a => a.heroImage).length}</strong> articles with images.
                    </div>

                    {processing && (
                        <div className="space-y-2">
                            <Progress value={progress} />
                            <p className="text-xs text-center animate-pulse">{currentAction}</p>
                        </div>
                    )}

                    <Button
                        onClick={processImages}
                        disabled={processing || articles.length === 0}
                        className="w-full"
                    >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                        Generate Pins
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-950">
                <CardHeader>
                    <CardTitle>Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {results.length > 0 ? (
                        <div className="space-y-4">
                            <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200 text-center">
                                <h3 className="font-bold text-lg">{results.length} Pins Created!</h3>
                                <p className="text-sm">Ready for export.</p>
                            </div>
                            <Button onClick={downloadZip} variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                                <Download className="w-4 h-4 mr-2" />
                                Download ZIP Package
                            </Button>
                        </div>
                    ) : (
                        <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-slate-400">
                            Waiting for generation...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

```

## File: src/components/article-writer/prompts.ts
```ts
export type PromptCategory = 'general' | 'home_decor' | 'fashion' | 'food';

export const PROMPT_CATEGORIES: { id: PromptCategory; label: string }[] = [
    { id: 'general', label: 'Default (General)' },
    { id: 'home_decor', label: 'Home Decor' },
    { id: 'fashion', label: 'Fashion & Outfits' },
    { id: 'food', label: 'Food & Recipes' },
];

const BASE_STRUCTURE = `
STRUCTURE:
1. Start with an engaging <h1> title that's more viral than the original:
   - Maximum 15 words
   - MUST include the exact core phrase from the original title
   - Use proper title case capitalization
   - Make it click-worthy and engaging while keeping the SEO keywords
   - Example: Original '5 Bedroom Ideas' becomes '5 Stunning Bedroom Ideas That Will Transform Your Sleep Space'

2. Follow with a short, punchy introduction (3-4 sentences) that immediately gets to the point. Hook the reader fast with why these items are amazing. No generic phrases like "In today's world..." or "In modern times...". Jump straight into something that grabs attention.

3. Create EXACTLY {itemCount} numbered sections using <h2> headings with creative names instead of boring titles.

4. For EACH section, include:
   - A brief intro paragraph (2-3 sentences) explaining why this item is awesome
   - Use <h3> subsections when helpful (like 'Key Points', 'Tips', 'Materials') but only where it makes sense
   - Include occasional <ul> lists for key elements when it helps with scannability
   - Mix short paragraphs with practical information
   - End with a brief note about benefits, applications, or when to use this

5. End with a brief, encouraging conclusion (2-3 sentences) that makes readers excited to try these ideas.

TONE & STYLE:
- Conversational and informal - write like you're chatting with a friend
- Approachable, light-hearted, and occasionally sarcastic (but don't overdo it)
- Use active voice only - avoid passive constructions entirely
- Keep paragraphs SHORT (2-3 sentences max) - make it scannable
- Use rhetorical questions to engage readers and break up text
- Sprinkle in internet slang sparingly: "FYI", "IMO", "Trust me", "Seriously" (2-3 times max per article)
- Include occasional humor to keep things fun
- Personal opinions and commentary when appropriate
- Bold key terms and important phrases with <strong> tags (but NOT in the introduction)

FORMATTING:
- Use proper HTML: <h1> for title, <h2> for numbered items, <h3> for subsections when helpful
- Use <ul> with <li> for lists of key elements
- Use <p> for paragraphs
- Break up content with vivid descriptions and specific details
- Avoid dense blocks of text
- NO Markdown, code fences, or backticks
- No extraneous preamble before content starts

Date: {date}
`;

export const DEFAULT_PROMPTS: Record<PromptCategory, string> = {
    general: `Write a conversational, friendly listicle article about: "{title}".
Target length: approximately 1500 words.

CRITICAL: Create EXACTLY {itemCount} numbered sections - no more, no less. The title specifies {itemCount} items, so deliver exactly that many.

${BASE_STRUCTURE}`,

    home_decor: `Write a conversational, friendly home decor article showcasing: "{title}".
Target length: approximately 1500 words.

CRITICAL: Present EXACTLY {itemCount} completely different and distinct room designs - no more, no less. Each section must showcase a unique, complete design concept.

${BASE_STRUCTURE.replace('3. Create EXACTLY {itemCount} numbered sections using <h2>', '3. Create EXACTLY {itemCount} numbered design sections using <h2>')
            .replace('4. For EACH section, include:', '4. For EACH design section, describe the complete room vision naturally:\n   - Start with a brief intro paragraph painting the overall picture and mood\n   - Describe specific details about colors, furniture, textiles, and decor\n   - Use <h3> subsections like "Color Palette", "Key Pieces", "Styling Tips"')}`,

    fashion: `Write a conversational, friendly fashion outfit listicle article about: "{title}".
Target length: approximately 1500 words.

CRITICAL: Create EXACTLY {itemCount} numbered outfit sections - no more, no less. The title specifies {itemCount} outfits, so deliver exactly that many.

${BASE_STRUCTURE.replace('3. Create EXACTLY {itemCount} numbered sections using <h2>', '3. Create EXACTLY {itemCount} numbered outfit sections using <h2>')
            .replace('4. For EACH section, include:', '4. For EACH outfit section, include:\n   - A brief intro paragraph explaining why this outfit is amazing\n   - <ul> list of all clothing items and accessories\n   - <p> styling tips on how to wear and accessorize')}`,

    food: `Write a conversational, friendly food recipe article about: "{title}".
Target length: approximately 1500 words.

CRITICAL: Create EXACTLY {itemCount} numbered recipe sections - no more, no less. The title specifies {itemCount} recipes, so deliver exactly that many.

${BASE_STRUCTURE.replace('3. Create EXACTLY {itemCount} numbered sections using <h2>', '3. Create EXACTLY {itemCount} numbered recipe sections using <h2>')
            .replace('4. For EACH section, include:', '4. For EACH recipe section, include:\n   - A brief intro paragraph explaining why this recipe is awesome\n   - <h3>Ingredients:</h3> section with bulleted <ul> list\n   - <h3>Instructions:</h3> section with numbered <ol> steps')}`
};

```

## File: src/components/article-writer/PromptSettings.tsx
```tsx
import { useState } from "react";
import { usePrompts } from "./usePrompts";
import { PROMPT_CATEGORIES, PromptCategory } from "./prompts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export default function PromptSettings() {
    const { prompts, updatePrompt, resetPrompt, loaded } = usePrompts();
    const [selectedCategory, setSelectedCategory] = useState<PromptCategory>('general');

    if (!loaded) return <div>Loading settings...</div>;

    // Changes are auto-saved in this version via the hook, but if we had a manual save:
    // const handleSave = () => { toast({ title: "Saved", description: "Settings updated.", variant: "success" }) }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Global Prompt Settings</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Customize the AI instructions used for generating articles. These settings are saved to your browser.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <label className="text-sm font-medium">Select Category:</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value as PromptCategory)}
                            className="p-2 border rounded-md bg-transparent min-w-[200px]"
                        >
                            {PROMPT_CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium">
                                Prompt Template for <span className="text-primary">{PROMPT_CATEGORIES.find(c => c.id === selectedCategory)?.label}</span>
                            </label>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (confirm("Are you sure you want to reset this prompt to default?")) {
                                        resetPrompt(selectedCategory);
                                    }
                                }}
                            >
                                <RotateCcw className="w-3 h-3 mr-2" /> Reset Default
                            </Button>
                        </div>

                        <textarea
                            value={prompts[selectedCategory]}
                            onChange={(e) => updatePrompt(selectedCategory, e.target.value)}
                            className="w-full h-96 p-4 font-mono text-xs border rounded-md bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-primary outline-none resize-y"
                            placeholder="Enter AI instructions..."
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Available placeholders: {"{title}"}, {"{itemCount}"}, {"{date}"}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

```

## File: src/components/article-writer/types.ts
```ts
export interface KeywordCluster {
    topic: string;
    keywords: string[];
}

export interface Product {
    name: string;
    link: string;
    image: string;
}

export interface ArticleData {
    topic: string;
    title: string;
    content: string; // HTML
    heroImage?: string; // URL for Pin Factory
    wpLink?: string;
    wpStatus?: 'draft' | 'publish' | 'failed' | 'unsent';
}

export interface WPCredentials {
    url: string;
    user: string;
    password: string;
}

```

## File: src/components/article-writer/usePrompts.ts
```ts
"use client";

import { useState, useEffect } from 'react';
import { DEFAULT_PROMPTS, PromptCategory } from './prompts';
import { getUserPromptsAction, savePromptAction } from '@/app/actions/user-actions';


export function usePrompts() {
    const [prompts, setPrompts] = useState<Record<PromptCategory, string>>(DEFAULT_PROMPTS);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const loadPrompts = async () => {
            try {
                // 1. Try DB
                const result = await getUserPromptsAction();
                if (result.success && result.data && result.data.length > 0) {
                    const dbPrompts = result.data;
                    const merged = { ...DEFAULT_PROMPTS };
                    dbPrompts.forEach(p => {
                        if (p.category in merged) {
                            merged[p.category as PromptCategory] = p.prompt_text;
                        }
                    });
                    setPrompts(merged);
                } else {
                    // 2. Fallback to LocalStorage if DB empty/auth missing
                    const saved = localStorage.getItem('pin_lions_prompts');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        setPrompts({ ...DEFAULT_PROMPTS, ...parsed });
                    }
                }
            } catch (e) {
                console.error("Failed to load prompts", e);
            } finally {
                setLoaded(true);
            }
        };
        loadPrompts();
    }, []);

    const updatePrompt = async (category: PromptCategory, text: string) => {
        // Optimistic update
        const newPrompts = { ...prompts, [category]: text };
        setPrompts(newPrompts);

        // Save to DB (and local as backup)
        try {
            await savePromptAction(category, text);
            localStorage.setItem('pin_lions_prompts', JSON.stringify(newPrompts));
        } catch (e) {
            console.error("Failed to save prompt to DB", e);
        }
    };

    const resetPrompt = async (category: PromptCategory) => {
        const text = DEFAULT_PROMPTS[category];
        await updatePrompt(category, text);
    };

    const resetAll = async () => {
        setPrompts(DEFAULT_PROMPTS);
        localStorage.removeItem('pin_lions_prompts');
        // Loop reset all in DB? Or just rely on overwrite.
        // For now simple reset.
    };

    return { prompts, updatePrompt, resetPrompt, resetAll, loaded };
}

```

## File: src/components/bulk-pin/ChatBot.tsx
```tsx

import React, { useState, useRef, useEffect } from 'react';
import { chatWithGemini } from '@/lib/geminiService';
import { ChatMessage } from '@/lib/types';
import { MessageSquare, X, Send, Bot } from 'lucide-react';


interface ChatBotProps {
    googleApiKey: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ googleApiKey }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: 'Hi! I can help you with Pinterest strategy or answer questions about your content.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        if (!googleApiKey) {
            setMessages(prev => [...prev, { role: 'user', text: input }]);
            setMessages(prev => [...prev, { role: 'model', text: "Please enter your Google API Key in the settings to start chatting." }]);
            setInput('');
            return;
        }

        const userMsg: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const responseText = await chatWithGemini(userMsg.text, messages, googleApiKey);
            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch {
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please check your API key and try again." }]);
        } finally {

            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 md:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-300" style={{ height: '500px', maxHeight: '80vh' }}>
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Gemini Assistant</h3>
                                <p className="text-[10px] text-white/80">Powered by Gemini 3 Pro</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-slate-900 space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 rounded-bl-none shadow-sm'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex gap-2 shrink-0">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={googleApiKey ? "Ask a question..." : "API Key Required"}
                            disabled={!googleApiKey}
                            className="flex-1 bg-gray-100 dark:bg-slate-700 border-0 rounded-full px-4 py-2 text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading || !googleApiKey}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-full disabled:opacity-50 transition-colors"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-105"
            >
                {isOpen ? (
                    <X className="w-6 h-6" />
                ) : (
                    <MessageSquare className="w-7 h-7" />
                )}
            </button>
        </div>
    );
};

export default ChatBot;

```

## File: src/components/bulk-pin/CSVEditor.tsx
```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { PinData, CSVPinData, CSVSettings } from '@/lib/types';
import { ArrowLeft, Download, Loader2, Table } from 'lucide-react';

interface CSVEditorProps {
    isOpen: boolean;
    onClose: () => void;
    pins: PinData[];
    csvSettings: CSVSettings;
}

export default function CSVEditor({ isOpen, onClose, pins, csvSettings }: CSVEditorProps) {
    const [csvData, setCsvData] = useState<CSVPinData[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (isOpen && pins.length > 0) {
            // Move generateCSVData inside or use it from props/callback if it's stable. 
            // Since generateCSVData is defined inside component and uses currentDate (which changes), 
            // we should probably just move the logic inside useEffect or useCallback.
            // But to fix lint quickly and correctly:

            const now = new Date();
            const intervalMinutes = parseInt(csvSettings.postInterval);
            const pinsPerDay = csvSettings.pinsPerDay;

            const currentDate = new Date(now);
            currentDate.setMinutes(Math.ceil(currentDate.getMinutes() / 30) * 30, 0, 0);
            let pinsScheduledToday = 0;

            const initialData = pins
                .filter(pin => pin.status === 'complete' && pin.imageUrl)
                .map((pin) => {
                    if (pinsScheduledToday >= pinsPerDay) {
                        currentDate.setDate(currentDate.getDate() + 1);
                        currentDate.setHours(8, 0, 0, 0);
                        pinsScheduledToday = 0;
                    }

                    const publishDate = new Date(currentDate);
                    currentDate.setMinutes(currentDate.getMinutes() + intervalMinutes);
                    pinsScheduledToday++;

                    return {
                        id: pin.id,
                        title: pin.title,
                        description: pin.description,
                        mediaUrl: pin.imageUrl?.startsWith('data:') ? '(auto-filled on export)' : (pin.imageUrl || ''),
                        link: pin.url,
                        pinterestBoard: '',
                        publishDate: formatDateForInput(publishDate),
                        thumbnail: '',
                        keywords: pin.tags?.join(', ') || ''
                    };
                });
            setCsvData(initialData);
        }
    }, [isOpen, pins, csvSettings]);

    // generateCSVData removed as it is now inlined in useEffect


    const formatDateForInput = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const handleFieldChange = (id: string, field: keyof CSVPinData, value: string) => {
        setCsvData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleExportCSV = async () => {
        if (csvData.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);

        let exportData = [...csvData];

        // Upload images to ImgBB if API key is set
        if (csvSettings.imgbbApiKey) {
            const pinsNeedingUpload = pins.filter(pin =>
                pin.imageUrl?.startsWith('data:') && csvData.find(csv => csv.id === pin.id)
            );

            for (let i = 0; i < pinsNeedingUpload.length; i++) {
                const pin = pinsNeedingUpload[i];
                try {
                    const response = await fetch('https://api.imgbb.com/1/upload', {
                        method: 'POST',
                        body: (() => {
                            const formData = new FormData();
                            formData.append('key', csvSettings.imgbbApiKey);
                            formData.append('image', pin.imageUrl!.split(',')[1]);
                            return formData;
                        })()
                    });

                    const result = await response.json();
                    if (result.success && result.data?.url) {
                        exportData = exportData.map(csv =>
                            csv.id === pin.id ? { ...csv, mediaUrl: result.data.url } : csv
                        );
                    }
                } catch (error) {
                    console.error('Failed to upload image:', error);
                }
                setUploadProgress(Math.round(((i + 1) / pinsNeedingUpload.length) * 100));
            }
        }

        // Generate CSV content
        const headers = ['Title', 'Description', 'Media URL', 'Link', 'Pinterest Board', 'Publish Date', 'Thumbnail', 'Keywords'];

        const escapeCsvField = (field: string) => {
            const cleaned = String(field || '').replace(/[\r\n\t]+/g, ' ').trim();
            return `"${cleaned.replace(/"/g, '""')}"`;
        };

        const csvRows = exportData.map(row => [
            escapeCsvField(row.title),
            escapeCsvField(row.description),
            escapeCsvField(row.mediaUrl),
            escapeCsvField(row.link),
            escapeCsvField(row.pinterestBoard),
            escapeCsvField(row.publishDate.replace('T', ' ')),
            escapeCsvField(row.thumbnail),
            escapeCsvField(row.keywords)
        ].join(','));

        const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

        link.setAttribute('href', url);
        link.setAttribute('download', `pinterest-bulk-upload-${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setIsUploading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
            {/* Header */}
            <div className="h-16 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white">
                        <Table className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">CSV Editor - Review & Edit Your Pinterest Bulk Upload</h2>
                        <p className="text-xs text-slate-400">Edit all fields below. Changes are saved automatically. Export when ready!</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExportCSV} disabled={isUploading || csvData.length === 0}
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${isUploading ? 'bg-emerald-600 text-white cursor-wait' :
                            csvData.length === 0 ? 'bg-slate-600 text-slate-400 cursor-not-allowed' :
                                'bg-emerald-500 hover:bg-emerald-600 text-white'
                            }`}>
                        {isUploading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading... {uploadProgress}%</>
                        ) : (
                            <><Download className="w-4 h-4" /> Export CSV</>
                        )}
                    </button>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium text-sm flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Pins
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-6">
                {csvData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500">
                        <div className="text-center">
                            <Table className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">No completed pins to export</p>
                            <p className="text-sm mt-2">Generate and complete some pins first, then come back here.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-40">Title</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-64">Description</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-48">Media URL</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-48">Link</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-32">Pinterest Board</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-40">Publish Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-300 uppercase tracking-wider w-40">Keywords</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {csvData.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-700/50">
                                        <td className="px-4 py-3">
                                            <input type="text" value={row.title} onChange={(e) => handleFieldChange(row.id, 'title', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <textarea value={row.description} onChange={(e) => handleFieldChange(row.id, 'description', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs resize-none h-16" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="text" value={row.mediaUrl} onChange={(e) => handleFieldChange(row.id, 'mediaUrl', e.target.value)}
                                                placeholder="ImgBB URL (auto-filled)" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="text" value={row.link} onChange={(e) => handleFieldChange(row.id, 'link', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="text" value={row.pinterestBoard} onChange={(e) => handleFieldChange(row.id, 'pinterestBoard', e.target.value)}
                                                placeholder="e.g., Recipes" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="datetime-local" value={row.publishDate} onChange={(e) => handleFieldChange(row.id, 'publishDate', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="text" value={row.keywords} onChange={(e) => handleFieldChange(row.id, 'keywords', e.target.value)}
                                                placeholder="e.g., healthy, recipes" className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

```

## File: src/components/bulk-pin/InputSection.tsx
```tsx
"use client";

import React, { useState, useRef } from 'react';
import { PinConfig, PinStyle, AspectRatio, ImageModel, LogoPosition } from '@/lib/types';
import { parseFile } from '@/lib/fileParser';

import { Upload, Link2, Image, X, Sparkles, Loader2 } from 'lucide-react';


interface InputSectionProps {
    onGeneratePrompts: (urls: string[], config: PinConfig) => void;
    isProcessing: boolean;
    config: PinConfig;
    onConfigChange: (config: PinConfig) => void;
}

export default function InputSection({ onGeneratePrompts, isProcessing, config, onConfigChange }: InputSectionProps) {
    const [inputText, setInputText] = useState('');
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [isLoadingUrl, setIsLoadingUrl] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const refImageInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const handleGenerate = () => {
        if (!inputText.trim()) return;
        const urls = inputText.split('\n').filter(line => line.trim().length > 0);
        onGeneratePrompts(urls, config);
        setInputText('');
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const content = await parseFile(file);
            if (content) {
                const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
                if (lines.length > 0) {
                    setInputText(prev => (prev.trim() ? prev.trim() + '\n' : '') + lines.join('\n'));
                }
            }
        } catch (error) {
            console.error('File parsing error:', error);
            alert('Failed to parse file. Please check the file format.');
        }
        event.target.value = '';
    };

    const handleReferenceImagesUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        Array.from(files).forEach((file: File) => {
            if (file.size > 4 * 1024 * 1024) {
                alert(`Image ${file.name} is too large. Max size 4MB.`);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result) {
                    onConfigChange({ ...config, referenceImages: [...(config.referenceImages || []), result] });
                }
            };
            reader.readAsDataURL(file);
        });
        event.target.value = '';
    };

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert("Logo too large. Please use a file under 2MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) onConfigChange({ ...config, logoData: e.target.result as string });
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const handleAddImageUrl = async () => {
        if (!imageUrlInput.trim()) return;
        setIsLoadingUrl(true);
        try {
            const response = await fetch(imageUrlInput);
            if (!response.ok) throw new Error("Failed to fetch");
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    onConfigChange({ ...config, referenceImages: [...(config.referenceImages || []), reader.result as string] });
                    setImageUrlInput('');
                }
                setIsLoadingUrl(false);
            };
            reader.readAsDataURL(blob);
        } catch {
            alert("Could not load image from URL. Please download and upload manually.");
            setIsLoadingUrl(false);
        }
    };

    const removeReferenceImage = (index: number) => {
        onConfigChange({ ...config, referenceImages: (config.referenceImages || []).filter((_, i) => i !== index) });
    };

    const positionOptions = [
        { value: 'bottom-right', label: 'Bottom Right' },
        { value: 'bottom-center', label: 'Bottom Center' },
        { value: 'bottom-left', label: 'Bottom Left' },
        { value: 'top-right', label: 'Top Right' },
        { value: 'top-center', label: 'Top Center' },
        { value: 'top-left', label: 'Top Left' },
        { value: 'center', label: 'Center' },
    ];

    return (
        <div
            className="w-full lg:w-80 xl:w-96 p-5 flex flex-col h-full shrink-0 overflow-y-auto"
            style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--border)', color: '#E2E8F0' }}
        >
            {/* Content Type Toggle */}
            <div className="mb-4 p-1 rounded-lg flex bg-black/20">
                <button onClick={() => onConfigChange({ ...config, contentType: 'article' })}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${config.contentType === 'article' ? 'shadow-sm' : ''}`}
                    style={config.contentType === 'article' ? { background: 'var(--secondary)', color: 'var(--primary)' } : { color: 'var(--muted)' }}>
                    Standard Post
                </button>
                <button onClick={() => onConfigChange({ ...config, contentType: 'product' })}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${config.contentType === 'product' ? 'shadow-sm' : ''}`}
                    style={config.contentType === 'product' ? { background: 'var(--secondary)', color: 'var(--primary)' } : { color: 'var(--muted)' }}>
                    Product
                </button>
            </div>

            {/* URL Input */}
            <div className="mb-2 flex justify-between items-center">
                <h2 className="text-xs font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: '#E2E8F0' }}>
                    <Link2 className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                    {config.contentType === 'product' ? 'Product URLs' : 'Article URLs'}
                </h2>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.csv,.xlsx,.xls,.docx,.pdf" />
                <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-medium hover:opacity-80" style={{ color: 'var(--primary)' }}>
                    Import List
                </button>
            </div>
            <textarea
                className="w-full min-h-[400px] rounded-lg p-3 text-xs font-mono outline-none resize-y mb-4 input-themed"
                placeholder={config.contentType === 'product' ? "https://amazon.com/dp/..." : "https://yourdomain.com/post-1"}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isProcessing}
            />

            {/* Logo Overlay Section */}
            <div className="mb-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2" style={{ color: '#E2E8F0' }}>
                        <Image className="w-3.5 h-3.5" style={{ color: '#EC4899' }} /> Logo Overlay
                    </label>
                    {config.logoData && <button onClick={() => onConfigChange({ ...config, logoData: undefined })} className="text-[10px]" style={{ color: '#EF4444' }}>Remove</button>}
                </div>
                <div className="rounded-lg p-3 space-y-3 bg-black/20" style={{ border: '1px solid var(--border)' }}>
                    {!config.logoData ? (
                        <div onClick={() => logoInputRef.current?.click()}
                            className="w-full h-12 border border-dashed rounded flex items-center justify-center cursor-pointer text-[10px] hover:bg-white/5 transition-colors"
                            style={{ borderColor: 'var(--muted)', color: 'var(--muted)' }}>
                            + Upload Logo (PNG)
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded flex items-center justify-center p-1 bg-white/5" style={{ border: '1px solid var(--border)' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={config.logoData} alt="Logo" className="max-w-full max-h-full object-contain" />

                            </div>
                            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Logo loaded</span>
                        </div>
                    )}
                    <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/png,image/jpeg" className="hidden" />
                    {config.logoData && (
                        <>
                            <div>
                                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>Position</label>
                                <select value={config.logoPosition || 'bottom-right'} onChange={(e) => onConfigChange({ ...config, logoPosition: e.target.value as LogoPosition })}
                                    className="w-full text-xs rounded p-1.5 bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-pink-500">
                                    {positionOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>Size</label>
                                    <span className="text-[9px]" style={{ color: '#64748B' }}>{config.logoSize || 20}%</span>
                                </div>
                                <input type="range" min="10" max="60" step="5" value={config.logoSize || 20}
                                    onChange={(e) => onConfigChange({ ...config, logoSize: Number(e.target.value) })}
                                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-pink-500 bg-white/10" />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* CTA Section */}
            <div className="mb-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <label className="text-xs font-bold uppercase tracking-wide flex items-center gap-2 mb-2" style={{ color: '#E2E8F0' }}>
                    <Sparkles className="w-3.5 h-3.5" style={{ color: '#3B82F6' }} /> Call to Action (CTA)
                </label>
                <div className="rounded-lg p-3 space-y-3 bg-black/20" style={{ border: '1px solid var(--border)' }}>
                    <div>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>Button Text</label>
                        <input type="text" value={config.ctaText || ''} onChange={(e) => onConfigChange({ ...config, ctaText: e.target.value })}
                            placeholder="e.g. Shop Now, Read More" className="w-full text-xs rounded p-2 bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-blue-500" />
                    </div>
                    {config.ctaText && (
                        <>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>Button Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" value={config.ctaColor || '#E60023'} onChange={(e) => onConfigChange({ ...config, ctaColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" />
                                        <span className="text-[10px] font-mono" style={{ color: '#64748B' }}>{config.ctaColor || '#E60023'}</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>Text Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" value={config.ctaTextColor || '#FFFFFF'} onChange={(e) => onConfigChange({ ...config, ctaTextColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" />
                                        <span className="text-[10px] font-mono" style={{ color: '#64748B' }}>{config.ctaTextColor || '#FFFFFF'}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>Position</label>
                                <select value={config.ctaPosition || 'bottom-center'} onChange={(e) => onConfigChange({ ...config, ctaPosition: e.target.value as LogoPosition })}
                                    className="w-full text-xs rounded p-1.5 bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-blue-500">
                                    {positionOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Reference Images */}
            <div className="mb-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <label className="text-xs font-bold uppercase tracking-wide mb-2 block" style={{ color: '#E2E8F0' }}>
                    Reference Assets <span className="font-normal normal-case" style={{ color: 'var(--muted)' }}>(Optional)</span>
                </label>
                <div className="flex gap-2 mb-3">
                    <input type="text" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} placeholder="Paste Image Link..."
                        className="flex-1 rounded-lg px-2 py-1.5 text-xs bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-blue-500" />
                    <button onClick={handleAddImageUrl} disabled={isLoadingUrl || !imageUrlInput}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors">
                        {isLoadingUrl ? '...' : 'Add'}
                    </button>
                </div>
                <input type="file" ref={refImageInputRef} onChange={handleReferenceImagesUpload} className="hidden" accept="image/*" multiple />
                <div onClick={() => refImageInputRef.current?.click()}
                    className="w-full h-14 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer mb-3 hover:bg-white/5 transition-colors"
                    style={{ borderColor: 'var(--muted)' }}>
                    <div className="flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                        <Upload className="w-4 h-4" />
                        <span className="text-[10px]">Upload Files</span>
                    </div>
                </div>
                {(config.referenceImages?.length || 0) > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                        {config.referenceImages?.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded overflow-hidden group border border-white/10 bg-black/40">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img} alt={`Ref ${idx}`} className="w-full h-full object-cover" />

                                <button onClick={() => removeReferenceImage(idx)}
                                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pin Settings */}
            <div className="space-y-4 flex-1 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#E2E8F0' }}>Pin Style:</label>
                    <select value={config.style} onChange={(e) => onConfigChange({ ...config, style: e.target.value as PinStyle })}
                        className="w-full text-xs rounded-lg p-2.5 bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-yellow-500" disabled={isProcessing}>
                        <option value="basic_top" className="bg-slate-800">Basic - Text at Top</option>
                        <option value="basic_middle" className="bg-slate-800">Basic - Text at Middle</option>
                        <option value="basic_bottom" className="bg-slate-800">Basic - Text at Bottom</option>
                        <option value="collage" className="bg-slate-800">Collage - Multiple Images</option>
                        <option value="custom" className="bg-slate-800">Custom - Your Brand Guidelines</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#E2E8F0' }}>Aspect Ratio:</label>
                    <select value={config.ratio} onChange={(e) => onConfigChange({ ...config, ratio: e.target.value as AspectRatio })}
                        className="w-full text-xs rounded-lg p-2.5 bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-yellow-500" disabled={isProcessing}>
                        <option value="9:16" className="bg-slate-800">9:16 - Standard Pinterest (Recommended)</option>
                        <option value="2:3" className="bg-slate-800">2:3 - Classic Portrait</option>
                        <option value="1:2" className="bg-slate-800">1:2 - Tall Pin</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#E2E8F0' }}>Image Model:</label>
                    <select value={config.model} onChange={(e) => onConfigChange({ ...config, model: e.target.value as ImageModel })}
                        className="w-full text-xs rounded-lg p-2.5 bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-yellow-500" disabled={isProcessing}>
                        <optgroup label="Google" className="bg-slate-800">
                            <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Fastest)</option>
                            <option value="gemini-3-pro-image-preview">Nano Banana Pro (High Res)</option>
                            <option value="imagen-4.0-generate-001">Google Imagen 3 (High Quality)</option>
                        </optgroup>
                        <optgroup label="Replicate" className="bg-slate-800">
                            <option value="flux-schnell">Flux Schnell (Speed)</option>
                            <option value="flux-dev">Flux Dev (Quality)</option>
                            <option value="sdxl-turbo">SDXL Turbo (Fastest)</option>
                            <option value="ideogram">Ideogram (Text Rendering)</option>
                            <option value="seedream4">SeeDream 4 (High Quality)</option>
                            <option value="pruna">Pruna AI ($0.01/img)</option>
                        </optgroup>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: '#E2E8F0' }}>Website URL (On Image):</label>
                    <input type="text" value={config.websiteUrl || ''} onChange={(e) => onConfigChange({ ...config, websiteUrl: e.target.value })}
                        placeholder="e.g. mydomain.com" className="w-full rounded-lg p-2.5 text-xs bg-black/20 border border-white/10 text-slate-200 outline-none focus:border-yellow-500" disabled={isProcessing} />
                </div>
            </div>

            {/* Generate Button */}
            <div className="mt-6">
                <button onClick={handleGenerate} disabled={isProcessing || !inputText.trim()}
                    className={`w-full py-3 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all
          ${isProcessing || !inputText.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-yellow-400/20'}`}
                    style={{ background: 'var(--primary)', color: '#0F172A' }}>
                    {isProcessing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    ) : (
                        <><Sparkles className="w-4 h-4" /> Generate Prompts</>
                    )}
                </button>
            </div>
        </div>
    );
}


```

## File: src/components/bulk-pin/PinCard.tsx
```tsx
"use client";

import React, { useState } from 'react';
import { PinData } from '@/lib/types';
import { Copy, Check, RefreshCw, Download, Eye, X, Loader2 } from 'lucide-react';
import Image from 'next/image';


interface PinCardProps {
    pin: PinData;
    onUpdate: (id: string, data: Partial<PinData>) => void;
    onGenerateImage: (id: string) => void;
    onRegenerateText?: (id: string) => void;
    onRecreate?: (id: string) => void;
    onDownload: (id: string) => void;
    onEditImage?: (id: string, prompt: string) => Promise<void>;
}

export default function PinCard({ pin, onUpdate, onGenerateImage, onRegenerateText, onRecreate, onDownload, onEditImage }: PinCardProps) {
    const [isEditingImage, setIsEditingImage] = useState(false);
    const [editPrompt, setEditPrompt] = useState('');
    const [isProcessingEdit, setIsProcessingEdit] = useState(false);
    const [isRegeneratingText, setIsRegeneratingText] = useState(false);
    const [copied, setCopied] = useState('');

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(''), 2000);
    };

    const handleRegenerateTextClick = async () => {
        if (!onRegenerateText) return;
        setIsRegeneratingText(true);
        await onRegenerateText(pin.id);
        setIsRegeneratingText(false);
    };

    const handleRecreateClick = () => {
        if (onRecreate && window.confirm("This will reset the entire pin and generate new prompts. Continue?")) {
            onRecreate(pin.id);
        }
    };

    const handleViewFullSize = () => {
        if (!pin.imageUrl) return;
        const htmlContent = `<!DOCTYPE html><html><head><title>${pin.title || 'Pin Image'}</title></head><body style="margin:0; display:flex; align-items:center; justify-content:center; background:#1a1a1a; height: 100vh;"><img src="${pin.imageUrl}" style="max-width:100%; max-height:100vh; object-fit:contain;" /></body></html>`;
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    const handleEditSubmit = async () => {
        if (!onEditImage || !editPrompt.trim()) return;
        setIsProcessingEdit(true);
        try {
            await onEditImage(pin.id, editPrompt);
            setEditPrompt('');
            setIsEditingImage(false);
        } catch {
            alert("Failed to edit image. Please try again.");
        } finally {
            setIsProcessingEdit(false);
        }
    };

    const isImageReady = pin.status === 'complete' && pin.imageUrl;
    const isGenerating = pin.status === 'generating_image';
    const isAnalyzing = pin.status === 'analyzing';

    return (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 overflow-hidden flex flex-col h-full transition-all hover:shadow-md">
            {/* Header: URL */}
            <div className="p-3 border-b border-slate-700 bg-slate-700/50 flex items-center justify-between gap-2">
                <p className="text-xs text-yellow-400 font-medium truncate flex-1" title={pin.url}>{pin.url}</p>
                <div className="flex items-center gap-2">
                    {pin.config?.contentType === 'product' && (
                        <span className="px-1.5 py-0.5 bg-orange-900/30 text-orange-400 rounded text-[9px] font-bold uppercase border border-orange-800/50">Product</span>
                    )}
                    <button onClick={() => handleCopy(pin.url, 'url')} className="text-slate-400 hover:text-yellow-400 p-1 rounded hover:bg-slate-600" title="Copy URL">
                        {copied === 'url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    {onRecreate && (
                        <button onClick={handleRecreateClick} className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-red-900/30" title="Recreate entire pin" disabled={isAnalyzing || isGenerating}>
                            <RefreshCw className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* State 1: Prompt Generation / Ready for Image */}
            {!isImageReady && (
                <div className="p-4 flex flex-col gap-4 flex-1">
                    {/* SEO Inputs Row */}
                    <div className="flex gap-2 items-end">
                        <div className="grid grid-cols-2 gap-2 flex-1">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Target Keyword</label>
                                <input type="text" value={pin.targetKeyword} onChange={(e) => onUpdate(pin.id, { targetKeyword: e.target.value })}
                                    placeholder="e.g. Strength Training" className="w-full bg-yellow-900/10 border border-yellow-800/50 rounded px-2 py-1.5 text-xs text-yellow-300 font-medium" disabled={isAnalyzing || isGenerating} />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Annotated Interests</label>
                                <input type="text" value={pin.annotatedInterests} onChange={(e) => onUpdate(pin.id, { annotatedInterests: e.target.value })}
                                    placeholder="e.g. healthy, meal prep" className="w-full bg-slate-700/50 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-300 italic" disabled={isAnalyzing || isGenerating} />
                            </div>
                        </div>
                        {onRegenerateText && !isAnalyzing && (
                            <button onClick={handleRegenerateTextClick} disabled={isRegeneratingText} title="Regenerate Text"
                                className={`p-2 bg-yellow-900/20 hover:bg-yellow-900/40 text-yellow-400 border border-yellow-800/50 rounded-lg shrink-0 h-[34px] w-[34px] flex items-center justify-center ${isRegeneratingText ? 'opacity-50 cursor-wait' : ''}`}>
                                {isRegeneratingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            </button>
                        )}
                    </div>

                    {/* AI Prompt */}
                    <div className="flex-1 flex flex-col">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex justify-between">
                            <span>Visual Prompt</span>
                            {!isAnalyzing && pin.visualPrompt && <span className="text-[9px] text-slate-500 font-normal">Editable</span>}
                        </label>
                        {isAnalyzing ? (
                            <div className="w-full h-32 bg-slate-700/50 rounded animate-pulse flex items-center justify-center text-xs text-slate-500">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating Prompt...
                            </div>
                        ) : (
                            <textarea value={pin.visualPrompt} onChange={(e) => onUpdate(pin.id, { visualPrompt: e.target.value })}
                                placeholder="Ready to generate prompt" className="w-full h-32 bg-slate-700/50 border border-slate-600 rounded p-2 text-xs font-mono text-slate-300 resize-none" disabled={isGenerating} />
                        )}
                    </div>

                    {/* Action Button */}
                    <button onClick={() => onGenerateImage(pin.id)} disabled={isAnalyzing || isGenerating || !pin.visualPrompt}
                        className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm flex items-center justify-center gap-2
            ${isAnalyzing || isGenerating || !pin.visualPrompt ? 'bg-yellow-400/30 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 text-slate-900'}`}>
                        {isGenerating ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creating Pin...</>) : (<>Create Pin</>)}
                    </button>
                </div>
            )}

            {/* State 2: Image Generated / Complete */}
            {isImageReady && (
                <div className="flex flex-col h-full">
                    {/* Image Preview */}
                    <div className="relative w-full aspect-[9/16] bg-slate-900 group shrink-0 max-h-[280px] overflow-hidden">
                        <Image
                            src={pin.imageUrl || ''}
                            alt={pin.title || 'Pin Image'}
                            fill
                            className={`object-cover ${isProcessingEdit ? 'opacity-50' : ''}`}
                            unoptimized
                        />

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <button onClick={handleViewFullSize} className="bg-white/90 p-2 rounded-full hover:bg-white text-slate-800" title="View Full Size">
                                <Eye className="w-5 h-5" />
                            </button>
                            <button onClick={() => setIsEditingImage(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                                Edit Image
                            </button>
                        </div>
                        {isProcessingEdit && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Edit Mode Overlay */}
                    {isEditingImage && (
                        <div className="p-3 bg-slate-700/50 border-b border-slate-600">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] uppercase font-bold text-slate-400">Magic Edit</label>
                                <button onClick={() => setIsEditingImage(false)} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="flex gap-2">
                                <input type="text" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="e.g. Add a retro filter..."
                                    className="flex-1 text-xs bg-slate-800 border border-slate-600 text-slate-200 rounded p-1.5" />
                                <button onClick={handleEditSubmit} disabled={!editPrompt.trim() || isProcessingEdit}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50">Go</button>
                            </div>
                        </div>
                    )}

                    {/* Editable Content */}
                    <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
                        {/* Regenerate Text Button Row */}
                        <div className="flex justify-between items-center bg-yellow-900/10 p-2 rounded-lg border border-yellow-800/30">
                            <span className="text-[10px] font-medium text-yellow-300">Content Options</span>
                            <button onClick={handleRegenerateTextClick} disabled={isRegeneratingText}
                                className={`text-xs bg-slate-800 border border-yellow-800 text-yellow-400 hover:bg-yellow-900/20 px-2 py-1 rounded shadow-sm flex items-center gap-1 ${isRegeneratingText ? 'opacity-50' : ''}`}>
                                {isRegeneratingText ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Regenerating...</> : <><RefreshCw className="w-3.5 h-3.5" /> Regenerate Text</>}
                            </button>
                        </div>

                        {/* Title */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Title</label>
                                <button onClick={() => handleCopy(pin.title, 'title')} className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-slate-200 bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-600">
                                    {copied === 'title' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy
                                </button>
                            </div>
                            <textarea value={pin.title} onChange={(e) => onUpdate(pin.id, { title: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm font-bold text-slate-100 resize-none h-14" />
                        </div>

                        {/* Description */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Description</label>
                                <button onClick={() => handleCopy(pin.description, 'desc')} className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-slate-200 bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-600">
                                    {copied === 'desc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy
                                </button>
                            </div>
                            <textarea value={pin.description} onChange={(e) => onUpdate(pin.id, { description: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300 resize-none h-20" />
                        </div>

                        {/* Tags */}
                        {pin.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {pin.tags.map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-slate-700 text-slate-400 text-[10px] rounded-full">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="p-3 bg-slate-700/30 border-t border-slate-700 flex gap-2">
                        <button onClick={() => onGenerateImage(pin.id)} disabled={isGenerating}
                            className="flex-1 py-2 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5" /> Regenerate Image
                        </button>
                        <button onClick={() => onDownload(pin.id)}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5">
                            <Download className="w-3.5 h-3.5" /> Download Pin
                        </button>
                    </div>
                </div>
            )}

            {/* Error Overlay */}
            {pin.status === 'error' && (
                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center z-10">
                    <div className="bg-red-900/20 text-red-400 rounded-full p-3 mb-2">
                        <X className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Generation Failed</h4>
                    <p className="text-xs text-slate-400 mt-1 mb-4">{pin.error || 'Something went wrong.'}</p>
                    <button onClick={() => onUpdate(pin.id, { status: isImageReady ? 'complete' : 'ready_for_generation', error: undefined })}
                        className="text-xs text-yellow-400 font-medium hover:underline">Dismiss</button>
                </div>
            )}
        </div>
    );
}

```

## File: src/components/bulk-pin/SettingsModal.tsx
```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { PinConfig, PinStyle, AspectRatio, ImageModel, PostInterval, CSVSettings } from '@/lib/types';
import { Settings, Key, Sliders, FileEdit, ImageIcon, FileSpreadsheet, X, Check, Loader2 } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    customRules: string;
    imageRules: string;
    defaultConfig: PinConfig;
    replicateApiKey: string;
    googleApiKey: string;
    csvSettings: CSVSettings;
    onSave: (rules: string, imageRules: string, config: PinConfig, replicateKey: string, googleKey: string, csvSettings: CSVSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, customRules, imageRules, defaultConfig, replicateApiKey, googleApiKey, csvSettings, onSave }) => {
    const [localTextRules, setLocalTextRules] = useState(customRules);
    const [localImageRules, setLocalImageRules] = useState(imageRules);
    const [localReplicateKey, setLocalReplicateKey] = useState(replicateApiKey);
    const [localGoogleKey, setLocalGoogleKey] = useState(googleApiKey);

    // Default Config State
    const [localStyle, setLocalStyle] = useState<PinStyle>(defaultConfig.style);
    const [localRatio, setLocalRatio] = useState<AspectRatio>(defaultConfig.ratio);
    const [localModel, setLocalModel] = useState<ImageModel>(defaultConfig.model);

    // CSV Settings State
    const [localImgbbKey, setLocalImgbbKey] = useState(csvSettings.imgbbApiKey);
    const [localPostInterval, setLocalPostInterval] = useState<PostInterval>(csvSettings.postInterval);
    const [localPinsPerDay, setLocalPinsPerDay] = useState(csvSettings.pinsPerDay);

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    // const [hasInitialized, setHasInitialized] = useState(false);


    // Reset local state when modal opens
    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLocalTextRules(customRules);

            setLocalImageRules(imageRules);
            setLocalReplicateKey(replicateApiKey);
            setLocalGoogleKey(googleApiKey);
            setLocalStyle(defaultConfig.style);
            setLocalRatio(defaultConfig.ratio);
            setLocalModel(defaultConfig.model);
            setLocalImgbbKey(csvSettings.imgbbApiKey);
            setLocalPostInterval(csvSettings.postInterval);
            setLocalPinsPerDay(csvSettings.pinsPerDay);
            setSaveStatus('idle');
        }
    }, [isOpen, customRules, imageRules, defaultConfig, replicateApiKey, googleApiKey, csvSettings]);

    if (!isOpen) return null;

    const handleSave = () => {
        setSaveStatus('saving');

        setTimeout(() => {
            onSave(localTextRules, localImageRules, {
                ...defaultConfig,
                style: localStyle,
                ratio: localRatio,
                model: localModel,
            }, localReplicateKey, localGoogleKey, {
                imgbbApiKey: localImgbbKey,
                postInterval: localPostInterval,
                pinsPerDay: localPinsPerDay
            });

            setSaveStatus('saved');

            setTimeout(() => {
                onClose();
            }, 750);
        }, 500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            {/* Modal */}
            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white">
                        <Settings className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Settings</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Configure your Ecomverse defaults and API keys</p>
                    </div>
                    <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* API Keys Section */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <Key className="w-4 h-4 text-orange-500" />
                            API Credentials
                        </h3>
                        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-lg p-4 space-y-4">

                            {/* Google API Key */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Google Gemini API Key (Required)</label>
                                <input
                                    type="password"
                                    value={localGoogleKey}
                                    onChange={(e) => setLocalGoogleKey(e.target.value)}
                                    placeholder="AIzaSy..."
                                    className="w-full bg-white dark:bg-slate-700 border border-orange-200 dark:border-orange-800/50 rounded p-2 text-xs text-gray-700 dark:text-white focus:ring-1 focus:ring-orange-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Used for generating text, pin details, and Gemini images.</p>
                            </div>

                            {/* Replicate API Key */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Replicate API Token (Optional)</label>
                                <input
                                    type="password"
                                    value={localReplicateKey}
                                    onChange={(e) => setLocalReplicateKey(e.target.value)}
                                    placeholder="r8_..."
                                    className="w-full bg-white dark:bg-slate-700 border border-orange-200 dark:border-orange-800/50 rounded p-2 text-xs text-gray-700 dark:text-white focus:ring-1 focus:ring-orange-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Required ONLY for Flux, Ideogram, and SDXL models.</p>
                            </div>

                        </div>
                    </div>

                    {/* Section 1: Default Config */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-emerald-500" />
                            Configuration Defaults
                        </h3>
                        <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Default Pin Style</label>
                                <select
                                    value={localStyle}
                                    onChange={(e) => setLocalStyle(e.target.value as PinStyle)}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-xs rounded-md p-2 focus:ring-1 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="basic_top">Basic - Text at Top</option>
                                    <option value="basic_middle">Basic - Text at Middle</option>
                                    <option value="basic_bottom">Basic - Text at Bottom</option>
                                    <option value="collage">Collage</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Default Aspect Ratio</label>
                                <select
                                    value={localRatio}
                                    onChange={(e) => setLocalRatio(e.target.value as AspectRatio)}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-xs rounded-md p-2 focus:ring-1 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="9:16">9:16 (Standard)</option>
                                    <option value="2:3">2:3 (Classic)</option>
                                    <option value="1:2">1:2 (Tall)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Default Image Model</label>
                                <select
                                    value={localModel}
                                    onChange={(e) => setLocalModel(e.target.value as ImageModel)}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-xs rounded-md p-2 focus:ring-1 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
                                    <option value="gemini-3-pro-image-preview">Nano Banana Pro</option>
                                    <option value="imagen-4.0-generate-001">Imagen 3</option>
                                    <option value="ideogram">Ideogram (Replicate)</option>
                                    <option value="flux-schnell">Flux Schnell (Replicate)</option>
                                    <option value="flux-dev">Flux Dev (Replicate)</option>
                                    <option value="sdxl-turbo">SDXL Turbo (Replicate)</option>
                                    <option value="seedream4">SeeDream4 (Replicate)</option>
                                    <option value="pruna">Pruna AI ($0.01/img)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Text Rules */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <FileEdit className="w-4 h-4 text-purple-500" />
                            Title & Description Rules (ChatGPT 5 Style)
                        </h3>
                        <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Customize how the AI generates Titles and Descriptions.
                            </p>
                            <textarea
                                value={localTextRules}
                                onChange={(e) => setLocalTextRules(e.target.value)}
                                className="w-full h-32 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded p-3 text-xs font-mono text-gray-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-y"
                            />
                        </div>
                    </div>

                    {/* Section 3: Image Rules */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-blue-500" />
                            Image Prompting Rules
                        </h3>
                        <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-3">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Instructions for generating the Visual Image Prompt (e.g. &quot;Always include bright colors&quot;, &quot;Use photorealistic style&quot;).
                            </p>
                            <textarea
                                value={localImageRules}
                                onChange={(e) => setLocalImageRules(e.target.value)}
                                className="w-full h-32 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded p-3 text-xs font-mono text-gray-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-y"
                                placeholder="e.g. Ensure all images have high contrast. Avoid using cartoon styles..."
                            />
                        </div>
                    </div>

                    {/* Section 4: CSV & Scheduling Options */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-pink-500" />
                            CSV & Scheduling Options
                        </h3>
                        <div className="bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/30 rounded-lg p-4 space-y-4">

                            {/* ImgBB API Key */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">ImgBB API Key (Optional)</label>
                                <input
                                    type="password"
                                    value={localImgbbKey}
                                    onChange={(e) => setLocalImgbbKey(e.target.value)}
                                    placeholder="b80aeb48f4248d948ba2be1605046d6c"
                                    className="w-full bg-white dark:bg-slate-700 border border-pink-200 dark:border-pink-800/50 rounded p-2 text-xs text-gray-700 dark:text-white focus:ring-1 focus:ring-pink-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                    <strong>Enable Image Hosting:</strong> Add your ImgBB API Key to automatically upload generated images and include direct URLs in your CSV export.
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    Get a free API Key: <a href="https://api.imgbb.com/" target="_blank" rel="noopener noreferrer" className="text-pink-600 dark:text-pink-400 underline hover:text-pink-700">Get ImgBB API Key (100% free, no limits!)</a>
                                </p>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                                    <strong>Benefit:</strong> Images hosted on ImgBB CDN forever, perfect for bulk Pinterest uploading!
                                </p>
                            </div>

                            {/* Post Interval */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Post Interval (minutes)</label>
                                <select
                                    value={localPostInterval}
                                    onChange={(e) => setLocalPostInterval(e.target.value as PostInterval)}
                                    className="w-full bg-white dark:bg-slate-700 border border-pink-200 dark:border-pink-800/50 rounded p-2 text-xs text-gray-700 dark:text-white focus:ring-1 focus:ring-pink-500 outline-none"
                                >
                                    <option value="30">Every 30 minutes</option>
                                    <option value="60">Every 1 hour</option>
                                    <option value="120">Every 2 hours</option>
                                    <option value="180">Every 3 hours</option>
                                </select>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                    Set how often pins should be scheduled when using auto-increment in CSV editor.
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    <strong>Example:</strong> 30 minutes = 08:00, 08:30, 09:00, 09:30...
                                </p>
                            </div>

                            {/* Pins Per Day */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Pins Per Day</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={localPinsPerDay}
                                    onChange={(e) => setLocalPinsPerDay(Math.max(1, Math.min(50, parseInt(e.target.value) || 15)))}
                                    className="w-full bg-white dark:bg-slate-700 border border-pink-200 dark:border-pink-800/50 rounded p-2 text-xs text-gray-700 dark:text-white focus:ring-1 focus:ring-pink-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                    Maximum number of pins to schedule per day in CSV editor.
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    <strong>Example:</strong> Set to 15 = only 15 time slots per day, then moves to next day. This helps you schedule consistently without overwhelming your Pinterest account.
                                </p>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-slate-700/30 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        disabled={saveStatus !== 'idle'}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saveStatus !== 'idle'}
                        className={`px-6 py-2 text-sm font-bold rounded-lg shadow-sm transition-all flex items-center justify-center min-w-[140px]
                    ${saveStatus === 'saved' ? 'bg-green-500 text-white' :
                                saveStatus === 'saving' ? 'bg-emerald-400 text-white cursor-wait' :
                                    'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                    >
                        {saveStatus === 'saved' ? (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Saved!
                            </>
                        ) : saveStatus === 'saving' ? (
                            <>
                                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                                Saving...
                            </>
                        ) : (
                            "Save Settings"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;

```

## File: src/components/scheduler/SchedulerTool.tsx
```tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, MoreVertical, Plus } from "lucide-react";
import { getScheduledPinsAction, ScheduledPin } from "@/app/actions/scheduler-actions";
import { Badge } from "@/components/ui/badge";

export default function SchedulerTool() {
    const [scheduledPins, setScheduledPins] = useState<ScheduledPin[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSchedule();
    }, []);

    const loadSchedule = async () => {
        const result = await getScheduledPinsAction(new Date(), new Date());
        if (result.success && result.data) {
            setScheduledPins(result.data);
        }
        setLoading(false);
    };

    // Group pins by date for easier viewing
    const groupedPins = scheduledPins.reduce((acc, pin) => {
        const dateKey = new Date(pin.scheduledTime).toLocaleDateString();
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(pin);
        return acc;
    }, {} as Record<string, ScheduledPin[]>);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">
            {/* Main Calendar / Schedule Feed */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            Scheduled Pins
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline">Weekly View</Button>
                            <Button size="sm">Monthly View</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-40">Loading schedule...</div>
                        ) : Object.keys(groupedPins).length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                No pins scheduled. Add some from the queue!
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(groupedPins).map(([date, pins]) => (
                                    <div key={date}>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-3 sticky top-0 bg-card py-2 z-10">
                                            {date}
                                        </h3>
                                        <div className="space-y-3">
                                            {pins.map(pin => (
                                                <div key={pin.id} className="flex items-center gap-4 p-3 rounded-lg border bg-accent/20 hover:bg-accent/40 transition-colors group">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={pin.image} alt={pin.title} className="w-16 h-24 object-cover rounded-md" />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium truncate">{pin.title}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(pin.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            <span className="w-1 h-1 rounded-full bg-slate-500" />
                                                            Board: {pin.boardId}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={pin.status === 'published' ? 'default' : 'secondary'} className="capitalize">
                                                            {pin.status}
                                                        </Badge>
                                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Sidebar Queue */}
            <div className="space-y-6">
                <Card className="h-full flex flex-col bg-secondary/10 border-dashed">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                            Unscheduled Queue
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="text-center py-8">
                            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                                <Plus className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium">Queue is empty</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Generate pins with the Master Writer to fill this queue.
                            </p>
                            <Button variant="ghost" className="mt-2 text-primary">
                                Go to Master Writer
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

```

## File: src/components/ThemeProvider.tsx
```tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Load theme from localStorage on mount
        const savedTheme = localStorage.getItem('pinverse_theme') as Theme;
        if (savedTheme === 'light' || savedTheme === 'dark') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setThemeState(savedTheme);

        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Update the HTML class when theme changes
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.remove('dark');
            root.classList.add('light');
        }

        // Save to localStorage
        localStorage.setItem('pinverse_theme', theme);
    }, [theme, mounted]);

    const toggleTheme = () => {
        setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    // Prevent flash of wrong theme
    if (!mounted) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

```

## File: src/components/ui/badge.tsx
```tsx
import * as React from "react"

const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "destructive" | "outline" }>(
    ({ className, variant = "default", ...props }, ref) => {
        const variants = {
            default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
            secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
            destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
            outline: "text-foreground",
        }

        const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(" ")

        return (
            <div ref={ref} className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)} {...props} />
        )
    }
)
Badge.displayName = "Badge"

export { Badge }

```

## File: src/components/ui/button.tsx
```tsx
import * as React from "react"

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "secondary" | "outline" | "ghost" | "destructive", size?: "default" | "sm" | "lg" | "icon" }>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {

        // Base styles
        const base = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

        // Variants
        const variants = {
            default: "bg-primary text-primary-foreground hover:bg-primary/90",
            destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
        }

        // Sizes
        const sizes = {
            default: "h-10 px-4 py-2",
            sm: "h-9 rounded-md px-3",
            lg: "h-11 rounded-md px-8",
            icon: "h-10 w-10",
        }

        const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(" ")

        return (
            <button
                ref={ref}
                className={cn(base, variants[variant], sizes[size], className)}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }

```

## File: src/components/ui/card.tsx
```tsx
import * as React from "react"

const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(" ")

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...props} />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

```

## File: src/components/ui/input.tsx
```tsx
import * as React from "react"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>


const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }

```

## File: src/components/ui/label.tsx
```tsx
import * as React from "react"

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
    ({ className, ...props }, ref) => (
        <label
            ref={ref}
            className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
            {...props}
        />
    )
)
Label.displayName = "Label"

export { Label }

```

## File: src/components/ui/progress.tsx
```tsx
import * as React from "react"

const Progress = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: number }>(
    ({ className, value, ...props }, ref) => (
        <div
            ref={ref}
            className={`relative h-4 w-full overflow-hidden rounded-full bg-secondary ${className}`}
            {...props}
        >
            <div
                className="h-full w-full flex-1 bg-primary transition-all"
                style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
            />
        </div>
    )
)
Progress.displayName = "Progress"

export { Progress }

```

## File: src/components/ui/scroll-area.tsx
```tsx
import * as React from "react"

const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, children, ...props }, ref) => (
        <div ref={ref} className={`relative overflow-auto ${className}`} {...props}>
            {children}
        </div>
    )
)
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }

```

## File: src/components/ui/tabs.tsx
```tsx
import * as React from "react"

// Simple Context-based Tabs to mimic Radix UI API
const TabsContext = React.createContext<{ value: string; onValueChange: (v: string) => void }>({ value: "", onValueChange: () => { } })

const Tabs = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string, onValueChange: (v: string) => void }>(
    ({ className, value, onValueChange, ...props }, ref) => (
        <TabsContext.Provider value={{ value, onValueChange }}>
            <div ref={ref} className={className} {...props} />
        </TabsContext.Provider>
    )
)
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}
            {...props}
        />
    )
)
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }>(
    ({ className, value, ...props }, ref) => {
        const { value: selectedValue, onValueChange } = React.useContext(TabsContext)
        const isSelected = selectedValue === value

        return (
            <button
                ref={ref}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onValueChange(value)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 
            ${isSelected ? "bg-background text-foreground shadow-sm" : "hover:bg-accent hover:text-accent-foreground"} ${className}`}
                {...props}
            />
        )
    }
)
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
    ({ className, value, ...props }, ref) => {
        const { value: selectedValue } = React.useContext(TabsContext)
        if (selectedValue !== value) return null
        return (
            <div
                ref={ref}
                role="tabpanel"
                className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
                {...props}
            />
        )
    }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }

```

## File: src/components/ui/toaster.tsx
```tsx
"use client"

import * as React from "react"

import { X } from "lucide-react"
import { useToast } from "./use-toast"

// Simple visual component for the toast
export function Toaster() {
    const { toasts, dismiss } = useToast()

    return (
        <div className="fixed bottom-0 right-0 z-[100] flex flex-col gap-2 p-4 max-w-[420px] w-full">
            {toasts.map(function ({ id, title, description, action, variant, ...props }) {


                let variantStyles = "bg-white text-slate-950 border border-slate-200 dark:bg-slate-950 dark:text-slate-50 dark:border-slate-800"
                if (variant === "destructive") {
                    variantStyles = "destructive group border-destructive bg-destructive text-destructive-foreground dark:border-destructive dark:bg-destructive dark:text-destructive-foreground"
                } else if (variant === "success") {
                    variantStyles = "border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-200"
                }

                return (
                    <div
                        key={id}
                        className={`group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all ${variantStyles}`}
                        {...props}
                    >
                        <div className="grid gap-1">
                            {title && <div className="text-sm font-semibold">{title}</div>}
                            {description && (
                                <div className="text-sm opacity-90">{description}</div>
                            )}
                        </div>
                        {action}
                        <button
                            onClick={() => dismiss(id)}
                            className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

```

## File: src/components/ui/use-toast.ts
```ts
"use client"

// Inspired by shadcn/ui toast implementation
// Simplified for this project without external "radix-ui" dependency if possible, 
// but using basic React state for "toast" management.

import * as React from "react"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = {
    id: string
    title?: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
    variant?: "default" | "destructive" | "success"
}

let count = 0

function genId() {
    count = (count + 1) % Number.MAX_SAFE_INTEGER
    return count.toString()
}

type Action =

    | {
        type: "ADD_TOAST"
        toast: ToasterToast
    }
    | {
        type: "UPDATE_TOAST"
        toast: Partial<ToasterToast>
    }
    | {
        type: "DISMISS_TOAST"
        toastId?: ToasterToast["id"]
    }
    | {
        type: "REMOVE_TOAST"
        toastId?: ToasterToast["id"]
    }


interface State {
    toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
    if (toastTimeouts.has(toastId)) {
        return
    }

    const timeout = setTimeout(() => {
        toastTimeouts.delete(toastId)
        dispatch({
            type: "REMOVE_TOAST",
            toastId: toastId,
        })
    }, TOAST_REMOVE_DELAY)

    toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case "ADD_TOAST":
            return {
                ...state,
                toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
            }

        case "UPDATE_TOAST":
            return {
                ...state,
                toasts: state.toasts.map((t) =>
                    t.id === action.toast.id ? { ...t, ...action.toast } : t
                ),
            }

        case "DISMISS_TOAST": {
            const { toastId } = action

            // ! Side effects ! - This is poor practice in reducer but standard in this specific shadcn implementation copy
            if (toastId) {
                addToRemoveQueue(toastId)
            } else {
                state.toasts.forEach((toast) => {
                    addToRemoveQueue(toast.id)
                })
            }

            return {
                ...state,
                toasts: state.toasts.map((t) =>
                    t.id === toastId || toastId === undefined
                        ? {
                            ...t,
                            open: false,
                        }
                        : t
                ),
            }
        }
        case "REMOVE_TOAST":
            if (action.toastId === undefined) {
                return {
                    ...state,
                    toasts: [],
                }
            }
            return {
                ...state,
                toasts: state.toasts.filter((t) => t.id !== action.toastId),
            }
        default:
            return state
    }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
    memoryState = reducer(memoryState, action)
    listeners.forEach((listener) => {
        listener(memoryState)
    })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
    const id = genId()

    const update = (props: ToasterToast) =>
        dispatch({
            type: "UPDATE_TOAST",
            toast: { ...props, id },
        })
    const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

    dispatch({
        type: "ADD_TOAST",
        toast: {
            ...props,
            id,
        },
    })

    // Auto dismiss after 5s
    setTimeout(() => {
        dismiss()
    }, 5000)

    return {
        id: id,
        dismiss,
        update,
    }
}

function useToast() {
    const [state, setState] = React.useState<State>(memoryState)

    React.useEffect(() => {
        listeners.push(setState)
        return () => {
            const index = listeners.indexOf(setState)
            if (index > -1) {
                listeners.splice(index, 1)
            }
        }
    }, [state])

    return {
        ...state,
        toast,
        dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
    }
}

export { useToast, toast }

```

## File: src/lib/admin.ts
```ts
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

```

## File: src/lib/adminData.ts
```ts
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


```

## File: src/lib/fileParser.ts
```ts
import { PinConfig } from '@/lib/types';

export async function parseFile(file: File): Promise<string> {
    const fileType = file.name.split('.').pop()?.toLowerCase();

    switch (fileType) {
        case 'xlsx':
        case 'xls':
            return parseExcel(file);
        case 'docx':
            return parseWord(file);
        case 'pdf':
            return parsePDF(file);
        case 'txt':
        case 'csv':
            return parseText(file);
        default:
            throw new Error(`Unsupported file type: .${fileType}`);
    }
}

async function parseText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || '');
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

async function parseExcel(file: File): Promise<string> {
    // Dynamic import for xlsx
    const XLSX = (await import('xlsx')).default;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                let text = '';
                // Read all sheets
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    text += json.map((row: any) => row.join(' ')).join('\n') + '\n';
                });

                resolve(text);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
}

async function parseWord(file: File): Promise<string> {
    // Dynamic import for mammoth
    const mammoth = (await import('mammoth')).default;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const result = await mammoth.extractRawText({ arrayBuffer });
                resolve(result.value);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsArrayBuffer(file);
    });
}

async function parsePDF(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();

        // Dynamic import for pdfjs-dist
        const pdfjsLib = await import('pdfjs-dist');

        // Set worker source
        // Set worker source to local file (copied via webpack in next.config.ts)
        pdfjsLib.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.min.mjs';

        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        let text = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map((item: any) => item.str);
            text += strings.join(' ') + '\n';
        }

        return text;
    } catch (error) {
        throw new Error('Failed to parse PDF: ' + (error as any).message);
    }
}


```

## File: src/lib/geminiService.ts
```ts
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedTextResponse, PinConfig } from "./types";

// Helper to poll Replicate status
const pollReplicate = async (getUrl: string, apiKey: string): Promise<string> => {
    while (true) {
        const response = await fetch(getUrl, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Replicate polling error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status === 'succeeded') {
            return data.output[0] || data.output;
        } else if (data.status === 'failed' || data.status === 'canceled') {
            throw new Error(`Replicate generation failed: ${data.error}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
    }
};

const generateReplicateImage = async (prompt: string, config: PinConfig, apiKey: string): Promise<string> => {
    if (!apiKey) throw new Error("Replicate API Key is missing. Please add it in Settings.");

    let modelVersion = "";
    const inputs: Record<string, unknown> = { prompt };

    switch (config.model) {
        case 'flux-schnell':
            modelVersion = "black-forest-labs/flux-schnell";
            inputs.aspect_ratio = config.ratio === '9:16' ? '9:16' : (config.ratio === '2:3' ? '2:3' : '9:16');
            break;
        case 'flux-dev':
            modelVersion = "black-forest-labs/flux-dev";
            inputs.aspect_ratio = config.ratio === '9:16' ? '9:16' : (config.ratio === '2:3' ? '2:3' : '9:16');
            break;
        case 'sdxl-turbo':
            modelVersion = "stability-ai/sdxl-turbo";
            if (config.ratio === '9:16') { inputs.width = 576; inputs.height = 1024; }
            else if (config.ratio === '2:3') { inputs.width = 672; inputs.height = 1008; }
            else if (config.ratio === '1:2') { inputs.width = 512; inputs.height = 1024; }
            else { inputs.width = 768; inputs.height = 768; }
            inputs.guidance_scale = 0.0;
            inputs.num_inference_steps = 2;
            break;
        case 'ideogram':
            modelVersion = "ideogram-ai/ideogram-v2";
            inputs.aspect_ratio = config.ratio === '1:2' ? '9:16' : config.ratio;
            break;
        case 'seedream4':
            modelVersion = "black-forest-labs/flux-dev";
            inputs.aspect_ratio = config.ratio === '9:16' ? '9:16' : '2:3';
            inputs.prompt = `SeeDream4 Style, ${prompt}`;
            break;
        case 'pruna':
            modelVersion = "stability-ai/sdxl-turbo"; // Using SDXL Turbo as the efficient/cheap option
            inputs.width = 576; inputs.height = 1024;
            inputs.guidance_scale = 0.0;
            inputs.num_inference_steps = 2;
            break;
        default:
            modelVersion = "black-forest-labs/flux-schnell";
    }

    const response = await fetch("https://api.replicate.com/v1/models/" + modelVersion + "/predictions", {
        method: "POST",
        headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: inputs })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`Replicate API Error: ${err.detail || response.statusText}`);
    }

    const prediction = await response.json();
    return await pollReplicate(prediction.urls.get, apiKey);
};

// Analyze the URL to generate prompts and SEO data
export const generatePinDetails = async (
    url: string,
    config: PinConfig,
    textRules: string = '',
    imageRules: string = '',
    interests: string = '',
    targetKeyword: string = '',
    googleApiKey: string
): Promise<GeneratedTextResponse> => {
    if (!googleApiKey) throw new Error("Google API Key is missing. Please check your settings.");

    const ai = new GoogleGenAI({ apiKey: googleApiKey });

    try {
        let styleInstruction = "";
        switch (config.style) {
            case 'basic_top': styleInstruction = "The image should have clear space at the TOP for text, or include the title text at the top in a modern font."; break;
            case 'basic_middle': styleInstruction = "The image should have the title text overlaying the center/middle of the image in a bold, readable font."; break;
            case 'basic_bottom': styleInstruction = "The image should have clear space at the BOTTOM for text, or include the title text at the bottom."; break;
            case 'collage': styleInstruction = "The image should appear as a collage of 2-3 related images."; break;
            case 'custom': styleInstruction = "Follow the brand guidelines for image style."; break;
        }

        if (config.websiteUrl) {
            styleInstruction += ` IMPORTANT: You MUST include the website URL "${config.websiteUrl}" as small, readable text at the bottom center of the image.`;
        }

        const productModeInstruction = config.contentType === 'product'
            ? `
      CRITICAL PRODUCT VISUALIZATION INSTRUCTIONS:
      1. IDENTIFY the specific physical product being sold or discussed at the URL.
      2. The 'visualPrompt' MUST describe a photorealistic, high-end product photography shot of this specific item.
      3. SETTING: Place the product in a completely natural, real-life environment where it is typically used.
      4. ANGLES: Use dynamic, eye-catching camera angles. Avoid boring front-on shots.
      5. LIGHTING: Use natural, cinematic lighting (golden hour, dappled light, or soft window light).
      6. Do NOT create generic abstract images. Show the PRODUCT prominently.
      `
            : '';

        const keywordContext = targetKeyword ? `Target SEO Keyword: "${targetKeyword}"` : 'Identify the most effective SEO Target Keyword for this content.';
        const promptContext = interests ? `Additional Focus Interests/Keywords: ${interests}` : '';

        const processedTextRules = textRules
            .replace(/\$\{url\}/g, url)
            .replace(/\$\{interestsNote\}/g, interests ? ` Note on interests: ${interests}` : '');

        const systemInstruction = `You are an expert Pinterest content strategist using advanced NLP techniques for high-conversion copy.
    
    TEXT PROMPT RULES (Titles/Descriptions):
    ${processedTextRules}

    IMAGE PROMPT RULES (Visuals):
    ${imageRules}
    
    TEXT HANDLING GUARDRAILS:
    - You are free to be creative with the visual style (vibrant, poster-style, etc.) as requested.
    - HOWEVER, when describing text overlays in the 'visualPrompt', you MUST strictly instruct the image generator to:
      1. Write the title text EXACTLY ONCE.
      2. Ensure there are NO repeated words.
      3. Do NOT fill the background with random text or "word clouds".
      4. If the design is busy, use a solid backing shape behind the single title text to ensure legibility.
    
    ${productModeInstruction}
    
    If reference images are provided, use them to accurately describe the product's color, shape, and features in the 'visualPrompt', but ALWAYS place it in a new, creative scene as described above.`;

        const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

        if (config.referenceImages && config.referenceImages.length > 0) {
            config.referenceImages.forEach(imgData => {
                try {
                    const base64Data = imgData.split(',')[1];
                    const mimeMatch = imgData.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
                    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                    contents.push({ inlineData: { mimeType, data: base64Data } });
                } catch (e) {
                    console.warn("Failed to parse reference image for Gemini", e);
                }
            });
        }

        contents.push({
            text: `Analyze this URL string and predict the content to create a high-converting Pinterest Pin configuration. 
      URL: ${url}
      ${promptContext}
      ${keywordContext}
      
      Configuration:
      - Aspect Ratio: ${config.ratio}
      - Style Goal: ${styleInstruction}

      I need:
      1. A Target Keyword (If provided, use it. If not, extract the best one).
      2. A visual image prompt for the generative AI following the IMAGE PROMPT RULES and TEXT HANDLING GUARDRAILS. 
         ${['ideogram', 'flux-schnell', 'flux-dev', 'sdxl-turbo', 'seedream4'].includes(config.model) ? 'Optimize prompt for Replicate/Flux/SDXL models (detailed, descriptive).' : 'Optimize for Gemini/Imagen.'}
         IMPORTANT: In the generated Visual Prompt, if the rules ask to include text (e.g. {title}), replace {title} with the actual "title" you generated.
      3. A catchy title following TEXT PROMPT RULES.
      4. A SEO-optimized description following TEXT PROMPT RULES.
      5. 3-5 relevant hashtags.
      `
        });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: contents },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        targetKeyword: { type: Type.STRING, description: "The main SEO keyword targeted." },
                        visualPrompt: { type: Type.STRING, description: "Detailed prompt for image generation." },
                        title: { type: Type.STRING, description: "Catchy headline for the pin." },
                        description: { type: Type.STRING, description: "Engaging description for the pin." },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["targetKeyword", "visualPrompt", "title", "description", "tags"]
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as GeneratedTextResponse;
        }
        throw new Error("No response from Gemini");
    } catch (error) {
        console.error("Error generating pin details:", error);
        throw error;
    }
};

// Regenerate ONLY text based on new keywords
export const regeneratePinText = async (
    url: string,
    targetKeyword: string,
    interests: string,
    textRules: string,
    imageRules: string,
    googleApiKey: string
): Promise<GeneratedTextResponse> => {
    if (!googleApiKey) throw new Error("Google API Key is missing. Please check your settings.");
    const ai = new GoogleGenAI({ apiKey: googleApiKey });

    const processedTextRules = textRules
        .replace(/\$\{url\}/g, url)
        .replace(/\$\{interestsNote\}/g, interests ? ` Note on interests: ${interests}` : '');

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Regenerate Pinterest text content for this URL: ${url}
            
            IMPORTANT: The user has explicitly changed the target keyword.
            NEW TARGET KEYWORD: "${targetKeyword}"
            Annotated Interests: "${interests}"

            Instruction:
            1. IGNORE any previous keyword context if it conflicts with the NEW TARGET KEYWORD.
            2. Rewrite the Title, Description, and Visual Prompt to focus 100% on "${targetKeyword}".

            Follow these rules:
            TEXT RULES:
            ${processedTextRules}

            IMAGE RULES:
            ${imageRules}
            
            CRITICAL VISUAL PROMPT RULE: 
            - Ensure the visual prompt reflects the NEW keyword.
            - STRICTLY FORBID repeating words or random text stickers. 
            - Title text must appear ONCE.

            IMPORTANT: In the 'visualPrompt', if the IMAGE RULES ask to include text (e.g. {title}), replace {title} with the actual new "title" you generated.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        targetKeyword: { type: Type.STRING },
                        visualPrompt: { type: Type.STRING },
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["title", "description", "tags"]
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as GeneratedTextResponse;
        }
        throw new Error("No response from Gemini");
    } catch (error) {
        console.error("Error regenerating text:", error);
        throw error;
    }
};

// Apply overlays (Logo and CTA) to a base image using HTML Canvas
const applyOverlays = async (baseImageUrl: string, config: PinConfig): Promise<string> => {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject("Canvas context not supported");
            return;
        }

        const baseImg = new Image();
        baseImg.crossOrigin = "anonymous";

        baseImg.onload = () => {
            canvas.width = baseImg.width;
            canvas.height = baseImg.height;
            ctx.drawImage(baseImg, 0, 0);

            // Draw CTA Button
            if (config.ctaText) {
                const text = config.ctaText;
                const bgColor = config.ctaColor || '#E60023';
                const textColor = config.ctaTextColor || '#FFFFFF';
                const position = config.ctaPosition || 'bottom-center';

                const fontSize = canvas.width * 0.045;
                ctx.font = `bold ${fontSize}px sans-serif`;
                const metrics = ctx.measureText(text);

                const hPadding = fontSize * 1.5;
                const vPadding = fontSize * 0.8;
                const btnWidth = metrics.width + (hPadding * 2);
                const btnHeight = fontSize + (vPadding * 2);

                const margin = canvas.width * 0.05;
                let x = 0;
                let y = 0;

                if (position === 'bottom-right') {
                    x = canvas.width - btnWidth - margin;
                    y = canvas.height - btnHeight - margin;
                } else if (position === 'bottom-left') {
                    x = margin;
                    y = canvas.height - btnHeight - margin;
                } else if (position === 'top-right') {
                    x = canvas.width - btnWidth - margin;
                    y = margin;
                } else if (position === 'top-left') {
                    x = margin;
                    y = margin;
                } else if (position === 'center') {
                    x = (canvas.width - btnWidth) / 2;
                    y = (canvas.height - btnHeight) / 2;
                } else {
                    x = (canvas.width - btnWidth) / 2;
                    y = canvas.height - btnHeight - margin;
                }

                ctx.shadowColor = 'rgba(0,0,0,0.3)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                ctx.fillStyle = bgColor;
                ctx.beginPath();
                const r = btnHeight / 2;
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + btnWidth - r, y);
                ctx.quadraticCurveTo(x + btnWidth, y, x + btnWidth, y + r);
                ctx.quadraticCurveTo(x + btnWidth, y + btnHeight, x + btnWidth - r, y + btnHeight);
                ctx.lineTo(x + r, y + btnHeight);
                ctx.quadraticCurveTo(x, y + btnHeight, x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.closePath();
                ctx.fill();

                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.fillStyle = textColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, x + (btnWidth / 2), y + (btnHeight / 2) + (fontSize * 0.05));
            }

            // Draw Logo
            if (config.logoData) {
                const logoImg = new Image();
                logoImg.onload = () => {
                    const sizePercent = config.logoSize || 20;
                    const position = config.logoPosition || 'bottom-right';

                    const logoWidth = canvas.width * (sizePercent / 100);
                    const logoHeight = logoWidth * (logoImg.height / logoImg.width);

                    const paddingX = canvas.width * 0.05;
                    const paddingY = canvas.height * 0.05;

                    let x = 0;
                    let y = 0;

                    if (position === 'top-left') {
                        x = paddingX; y = paddingY;
                    } else if (position === 'top-right') {
                        x = canvas.width - logoWidth - paddingX; y = paddingY;
                    } else if (position === 'bottom-left') {
                        x = paddingX; y = canvas.height - logoHeight - paddingY;
                    } else if (position === 'bottom-right') {
                        x = canvas.width - logoWidth - paddingX; y = canvas.height - logoHeight - paddingY;
                    } else if (position === 'center') {
                        x = (canvas.width - logoWidth) / 2; y = (canvas.height - logoHeight) / 2;
                    } else if (position === 'top-center') {
                        x = (canvas.width - logoWidth) / 2; y = paddingY;
                    } else if (position === 'bottom-center') {
                        x = (canvas.width - logoWidth) / 2; y = canvas.height - logoHeight - paddingY;
                    }

                    ctx.shadowColor = 'rgba(0,0,0,0.3)';
                    ctx.shadowBlur = 5;
                    ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);

                    resolve(canvas.toDataURL('image/png'));
                };
                logoImg.onerror = () => {
                    console.warn("Logo failed to load");
                    resolve(canvas.toDataURL('image/png'));
                };
                logoImg.src = config.logoData;
            } else {
                resolve(canvas.toDataURL('image/png'));
            }
        };

        baseImg.onerror = async () => {
            try {
                const response = await fetch(baseImageUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    const localUrl = reader.result as string;
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => {
                        canvas.width = fallbackImg.width;
                        canvas.height = fallbackImg.height;
                        ctx.drawImage(fallbackImg, 0, 0);
                        resolve(localUrl);
                    };
                    fallbackImg.src = localUrl;
                };
                reader.readAsDataURL(blob);
            } catch {
                reject("Failed to load base image (CORS)");
            }
        };

        baseImg.src = baseImageUrl;
    });
};

// Generate the actual image based on the prompt
export const generatePinImage = async (
    prompt: string,
    config: PinConfig,
    googleApiKey: string,
    replicateApiKey?: string
): Promise<string> => {
    let generatedImageUrl = "";

    if (['ideogram', 'flux-schnell', 'flux-dev', 'sdxl-turbo', 'seedream4'].includes(config.model)) {
        if (!replicateApiKey) throw new Error("Please add your Replicate API Token in Settings.");
        generatedImageUrl = await generateReplicateImage(prompt, config, replicateApiKey);
    } else {
        if (!googleApiKey) throw new Error("Google API Key is missing. Please check your settings.");
        const ai = new GoogleGenAI({ apiKey: googleApiKey });

        try {
            let targetRatio = "9:16";
            if (config.ratio === '2:3') targetRatio = '3:4';

            if (config.model === 'gemini-2.5-flash-image' || config.model === 'gemini-3-pro-image-preview') {
                const requestConfig: Record<string, unknown> = {
                    imageConfig: {
                        aspectRatio: targetRatio,
                        numberOfImages: 1,
                    }
                };
                if (config.model === 'gemini-3-pro-image-preview') {
                    (requestConfig.imageConfig as Record<string, unknown>).imageSize = config.imageSize || "1K";
                }

                const contents: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
                if (config.referenceImages && config.referenceImages.length > 0) {
                    config.referenceImages.forEach(imgData => {
                        try {
                            const base64Data = imgData.split(',')[1];
                            const mimeMatch = imgData.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
                            const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                            contents.push({ inlineData: { mimeType, data: base64Data } });
                        } catch (e) {
                            console.warn("Ref image error", e);
                        }
                    });
                }
                contents.push({ text: prompt });

                const response = await ai.models.generateContent({
                    model: config.model,
                    contents: { parts: contents },
                    config: requestConfig
                });

                let foundImage = false;
                for (const part of response.candidates?.[0]?.content?.parts || []) {
                    if ('inlineData' in part && part.inlineData) {
                        generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
                        foundImage = true;
                        break;
                    }
                }
                if (!foundImage) throw new Error("No image data received from Gemini");

            } else if (config.model === 'imagen-4.0-generate-001') {
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: prompt,
                    config: { numberOfImages: 1, aspectRatio: config.ratio, outputMimeType: 'image/jpeg' },
                });
                if (response.generatedImages?.[0]?.image?.imageBytes) {
                    generatedImageUrl = `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
                } else {
                    throw new Error("No image data received from Imagen");
                }
            }
        } catch (error) {
            console.error("Error generating image:", error);
            throw error;
        }
    }

    if ((config.logoData || config.ctaText) && generatedImageUrl) {
        try {
            return await applyOverlays(generatedImageUrl, config);
        } catch (e) {
            console.warn("Failed to apply overlays:", e);
            return generatedImageUrl;
        }
    }

    return generatedImageUrl;
};

// Edit an existing image using Gemini
export const editPinImage = async (
    base64Image: string,
    prompt: string,
    googleApiKey: string
): Promise<string> => {
    if (!googleApiKey) throw new Error("Google API Key is missing. Please check your settings.");
    const ai = new GoogleGenAI({ apiKey: googleApiKey });

    try {
        const base64Data = base64Image.split(',')[1];
        const mimeMatch = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Data } },
                    { text: prompt }
                ]
            },
            config: { imageConfig: { aspectRatio: "9:16" } }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if ('inlineData' in part && part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image data returned from edit");
    } catch (error) {
        console.error("Error editing image:", error);
        throw error;
    }
};

// Chat with Gemini
export const chatWithGemini = async (
    message: string,
    history: Array<{ role: string; text: string }> = [],
    googleApiKey: string
): Promise<string> => {
    if (!googleApiKey) return "Please enter your Google API Key in settings to chat.";

    const ai = new GoogleGenAI({ apiKey: googleApiKey });
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: history.map(h => ({
            role: h.role as 'user' | 'model',
            parts: [{ text: h.text }]
        }))
    });
    const result = await chat.sendMessage({ message });
    return result.text || "I didn't get that.";
};

```

## File: src/lib/imgbbService.ts
```ts
/**
 * ImgBB Image Hosting Service
 * Uploads images to ImgBB and returns public URLs
 */

const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';

/**
 * Upload a base64 image to ImgBB
 */
export async function uploadToImgBB(base64Image: string, apiKey: string): Promise<string> {
    if (!apiKey) {
        throw new Error('ImgBB API key is required');
    }

    // Remove data URI prefix if present
    let cleanBase64 = base64Image;
    if (base64Image.includes(',')) {
        cleanBase64 = base64Image.split(',')[1];
    }

    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('image', cleanBase64);

    try {
        const response = await fetch(IMGBB_API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to upload image to ImgBB');
        }

        const data = await response.json();

        if (data.success && data.data?.url) {
            return data.data.url;
        } else {
            throw new Error('Invalid response from ImgBB');
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('ImgBB upload error:', error);
        throw new Error(`ImgBB upload failed: ${errorMessage}`);
    }
}

/**
 * Upload multiple images to ImgBB
 */
export async function uploadMultipleToImgBB(
    images: { id: string; base64: string }[],
    apiKey: string
): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    for (const image of images) {
        try {
            const url = await uploadToImgBB(image.base64, apiKey);
            results.set(image.id, url);
        } catch (error) {
            console.error(`Failed to upload image ${image.id}:`, error);
            results.set(image.id, '');
        }
    }

    return results;
}

```

## File: src/lib/supabase-admin.ts
```ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Supabase Admin Init Error: Missing Environment Variables', {
            url: !!supabaseUrl,
            key: !!serviceRoleKey
        })
        return null
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
        return null
    }
}

```

## File: src/lib/supabase-server.ts
```ts
"use server";

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch {

                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch {

                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

```

## File: src/lib/supabase.ts
```ts
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

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
}

export async function getUser() {
    const supabase = createClient()
    if (!supabase) return { user: null, error: { message: "System Error: Database configuration missing." } as any }

    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
}

export async function getSession() {
    const supabase = createClient()
    if (!supabase) return { session: null, error: { message: "System Error: Database configuration missing." } as any }

    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
}

```

## File: src/lib/types.ts
```ts
export type PinStyle = 'basic_top' | 'basic_middle' | 'basic_bottom' | 'collage' | 'custom';
export type AspectRatio = '9:16' | '2:3' | '1:2';
export type ContentType = 'article' | 'product';
export type ImageModel =
    | 'gemini-2.5-flash-image'
    | 'imagen-4.0-generate-001'
    | 'gemini-3-pro-image-preview'
    | 'ideogram'
    | 'flux-schnell'
    | 'flux-dev'
    | 'sdxl-turbo'
    | 'seedream4'
    | 'pruna';

export type ImageSize = '1K' | '2K' | '4K';
export type LogoPosition =
    | 'top-left' | 'top-center' | 'top-right'
    | 'center'
    | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface PinConfig {
    style: PinStyle;
    ratio: AspectRatio;
    model: ImageModel;
    contentType: ContentType;
    websiteUrl?: string;
    referenceImages?: string[];
    imageSize?: ImageSize;
    logoData?: string;
    logoPosition?: LogoPosition;
    logoSize?: number;
    ctaText?: string;
    ctaColor?: string;
    ctaTextColor?: string;
    ctaPosition?: LogoPosition;
}

export interface PinData {
    id: string;
    url: string;
    status: 'idle' | 'analyzing' | 'ready_for_generation' | 'generating_image' | 'complete' | 'error';
    targetKeyword: string;
    annotatedInterests: string;
    visualPrompt: string;
    title: string;
    description: string;
    tags: string[];
    imageUrl?: string;
    error?: string;
    config: PinConfig;
}

export interface GeneratedTextResponse {
    targetKeyword?: string;
    visualPrompt: string;
    title: string;
    description: string;
    tags: string[];
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
    isLoading?: boolean;
}

export type PostInterval = '30' | '60' | '120' | '180';

export interface CSVPinData {
    id: string;
    title: string;
    description: string;
    mediaUrl: string;
    link: string;
    pinterestBoard: string;
    publishDate: string;
    thumbnail: string;
    keywords: string;
}

export interface CSVSettings {
    imgbbApiKey: string;
    postInterval: PostInterval;
    pinsPerDay: number;
}

```

## File: src/lib/wpService.ts
```ts
import { WPCredentials, ArticleData } from "@/components/article-writer/types";

interface WPPostResponse {
    id: number;
    link: string;
    title: { rendered: string };
    content: { rendered: string };
    status: string;
    [key: string]: unknown;

}

export class WPService {
    private url: string;
    private authHeader: string;

    constructor(creds: WPCredentials) {
        this.url = creds.url.replace(/\/$/, ""); // Remove trailing slash
        // Basic Auth for WordPress Application Passwords
        this.authHeader = `Basic ${btoa(`${creds.user}:${creds.password}`)}`;
    }

    /**
     * Create a new post in WordPress
     */
    async createPost(article: ArticleData): Promise<WPPostResponse> {
        const endpoint = `${this.url}/wp-json/wp/v2/posts`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.authHeader
                },
                body: JSON.stringify({
                    title: article.title,
                    content: article.content,
                    status: 'draft', // Always draft for safety
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `WordPress Error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error: unknown) {

            console.error("WP Create Post Error:", error);
            throw error;
        }
    }

    /**
     * Validate connection by checking the user endpoint
     */
    async validateConnection(): Promise<boolean> {
        const endpoint = `${this.url}/wp-json/wp/v2/users/me`;
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': this.authHeader
                }
            });
            return response.status === 200;
        } catch {

            return false;
        }
    }
}

```

## File: supabase/migrations/20260131_add_tool_visibility.sql
```sql
-- Create tools table to manage global visibility
CREATE TABLE IF NOT EXISTS public.tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_globally_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on tools
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read tools (filtering happens in app logic or via RLS if strict)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Everyone can read tools" ON public.tools;
    CREATE POLICY "Everyone can read tools" ON public.tools
        FOR SELECT USING (true);
END
$$;

-- Only admins can update tools
-- Note: You'll need to ensure your admin check logic (e.g. app_metadata or specific table) matches here.
-- For now, we'll allow service role (admin dashboard actions) to manage this.

-- Create user_tool_visibility table for per-user overrides
CREATE TABLE IF NOT EXISTS public.user_tool_visibility (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tool_id TEXT REFERENCES public.tools(id) ON DELETE CASCADE,
    is_visible BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, tool_id)
);

-- Enable RLS
ALTER TABLE public.user_tool_visibility ENABLE ROW LEVEL SECURITY;

-- Users can read their own visibility settings
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can read own visibility" ON public.user_tool_visibility;
    CREATE POLICY "Users can read own visibility" ON public.user_tool_visibility
        FOR SELECT
        USING (auth.uid() = user_id);
END
$$;

-- Admins/Service Role can manage all
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins can manage visibility" ON public.user_tool_visibility;
    CREATE POLICY "Admins can manage visibility" ON public.user_tool_visibility
        FOR ALL
        USING (true);
END
$$;

-- Seed initial tools (Using ON CONFLICT to avoid errors if they exist)
INSERT INTO public.tools (id, name, description, is_globally_visible)
VALUES 
    ('article-writer', 'PinVerse Master Writer', 'Turn keywords into SEO articles and Pinterest assets.', true),
    ('bulk-pin-creator', 'Bulk Pin Creator', 'Generate hundreds of Pinterest pins with AI.', true),
    ('pinterest-scheduler', 'Pinterest Scheduler', 'Schedule your pins for optimal posting times.', true),
    ('keyword-research', 'Keyword Research', 'Find high-traffic Pinterest keywords.', false), -- Hidden by default
    ('analytics', 'Analytics Dashboard', 'Track your Pinterest performance.', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

```

## File: supabase/migrations/20260131_fix_security_and_performance.sql
```sql
-- Fix: function_search_path_mutable
-- Addressing: Function `public.handle_new_user` has a role mutable search_path
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- Fix: rls_policy_always_true AND multiple_permissive_policies
-- Addressing: Table `public.activities` has overly permissive policies
-- Strategy:
-- 1. Drop the permissive "Authenticated can insert" policy (which was likely "true")
-- 2. Re-create it with a proper check ensuring users can only insert their own activities
-- 3. Drop the "Anyone can read activities" policy to resolve the multiple policies conflict.
--    This assumes "Users can view their own activities" is the desired policy for SELECT.

-- Drop known bad/redundant policies
DROP POLICY IF EXISTS "Authenticated can insert" ON public.activities;
DROP POLICY IF EXISTS "Anyone can read activities" ON public.activities;

-- Re-create INSERT policy securely
CREATE POLICY "Authenticated can insert"
ON public.activities
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Verify/Ensure "Users can view their own activities" exists (Best effort idempotency)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'activities'
        AND policyname = 'Users can view their own activities'
    ) THEN
        CREATE POLICY "Users can view their own activities"
        ON public.activities
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Fix: unindexed_foreign_keys
-- Addressing: Missing indexes on foreign keys for performance
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_articles_user_id ON public.generated_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_keywords_user_id ON public.user_keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_user_products_user_id ON public.user_products(user_id);

```

