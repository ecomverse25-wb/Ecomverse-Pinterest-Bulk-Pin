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
