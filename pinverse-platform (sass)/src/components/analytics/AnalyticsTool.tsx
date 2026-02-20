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
