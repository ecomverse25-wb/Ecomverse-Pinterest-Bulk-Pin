"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    BarChart3,
    ArrowLeft,
    Shield,
    Menu,
    X,
    FileText
} from "lucide-react";
import { useState } from "react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Middleware handles auth verification and redirection.
    // We can assume if we're here, we are authorized.
    // For specific user data display (Avatar), we might fetch it client side if needed,
    // or pass it down. For now, we'll keep the layout simple.

    const navigation = [
        { name: "Overview", href: "/admin", icon: LayoutDashboard },
        { name: "Content", href: "/admin/content", icon: FileText },
        { name: "Customers", href: "/admin/customers", icon: Users },
        { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ];

    const isActive = (href: string) => {
        if (href === "/admin") {
            return pathname === "/admin";
        }
        return pathname.startsWith(href);
    };

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
                            <span className="text-lg">A</span>
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
