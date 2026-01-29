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
import { fetchAllUsers, updateUserStatus, UserProfile } from "@/lib/adminData";

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
        const { users: fetchedUsers, error: fetchError } = await fetchAllUsers();
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
        const { success, error } = await updateUserStatus(userId, newStatus as 'active' | 'suspended');
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
