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
