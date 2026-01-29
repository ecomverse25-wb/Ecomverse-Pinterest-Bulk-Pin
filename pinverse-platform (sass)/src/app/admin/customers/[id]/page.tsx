"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
    Loader2
} from "lucide-react";
import { fetchUserById, updateUserStatus, UserProfile, fetchUserActivities, Activity as UserActivity, formatRelativeTime } from "@/lib/adminData";

export default function CustomerDetailPage() {
    const params = useParams();
    const customerId = params.id as string;

    const [customer, setCustomer] = useState<UserProfile | null>(null);
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCustomer();
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
        const newStatus = customer.status === 'suspended' ? 'active' : 'suspended';
        const { success } = await updateUserStatus(customer.id, newStatus as 'active' | 'suspended');
        if (success) {
            loadCustomer();
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

    // Calculate days since signup
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
        return styles[status];
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
                    {/* Avatar */}
                    <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0"
                        style={{ background: 'linear-gradient(135deg, #FACC15, #10B981)', color: '#0F172A' }}
                    >
                        {displayName.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
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

                    {/* Badges */}
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
                <div
                    className="rounded-xl p-5"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(250, 204, 21, 0.1)' }}>
                            <ImagePlus className="w-5 h-5 text-yellow-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{customer.pins_created.toLocaleString()}</p>
                    <p className="text-sm text-slate-400">Pins Created</p>
                </div>

                <div
                    className="rounded-xl p-5"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                            <Zap className="w-5 h-5 text-emerald-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{customer.api_calls.toLocaleString()}</p>
                    <p className="text-sm text-slate-400">API Calls</p>
                </div>

                <div
                    className="rounded-xl p-5"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                            <Activity className="w-5 h-5 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold">{new Date(customer.last_active).toLocaleDateString()}</p>
                    <p className="text-sm text-slate-400">Last Active</p>
                </div>

                <div
                    className="rounded-xl p-5"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
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
                <div
                    className="rounded-xl p-6"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
                    <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
                    <div className="space-y-4">
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
                <div
                    className="rounded-xl p-6"
                    style={{ background: '#1E293B', border: '1px solid #334155' }}
                >
                    <h2 className="text-lg font-bold mb-4">Admin Actions</h2>
                    <div className="space-y-3">
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition hover:bg-slate-700 text-left" style={{ background: '#0F172A' }}>
                            <RefreshCw className="w-5 h-5 text-blue-400" />
                            <div>
                                <p className="font-medium">Change Plan</p>
                                <p className="text-xs text-slate-400">Upgrade or downgrade subscription</p>
                            </div>
                        </button>
                        <button
                            onClick={handleStatusToggle}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition hover:bg-slate-700 text-left"
                            style={{ background: '#0F172A' }}
                        >
                            <UserX className="w-5 h-5 text-yellow-400" />
                            <div>
                                <p className="font-medium">{customer.status === 'suspended' ? 'Unsuspend Account' : 'Suspend Account'}</p>
                                <p className="text-xs text-slate-400">Temporarily disable access</p>
                            </div>
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition hover:bg-slate-700 text-left" style={{ background: '#0F172A' }}>
                            <Trash2 className="w-5 h-5 text-red-400" />
                            <div>
                                <p className="font-medium text-red-400">Delete Account</p>
                                <p className="text-xs text-slate-400">Permanently remove this user</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
