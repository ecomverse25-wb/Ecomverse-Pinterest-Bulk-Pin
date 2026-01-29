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
