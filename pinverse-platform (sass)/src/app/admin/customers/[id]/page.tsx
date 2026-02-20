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

    const handlePlanChange = async (newPlan: 'free' | 'starter' | 'pro' | 'promax' | 'enterprise') => {
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
            starter: { bg: "rgba(16, 185, 129, 0.2)", color: "#10B981", label: "Starter" },
            pro: { bg: "rgba(250, 204, 21, 0.2)", color: "#FACC15", label: "Pro Plan" },
            promax: { bg: "rgba(249, 115, 22, 0.2)", color: "#F97316", label: "Pro Max" },
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
                            {(['free', 'starter', 'pro', 'promax', 'enterprise'] as const).map((plan) => (
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
