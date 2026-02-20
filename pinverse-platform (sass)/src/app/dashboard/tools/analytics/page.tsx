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
