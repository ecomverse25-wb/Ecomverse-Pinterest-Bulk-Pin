"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Wrench, Settings, CreditCard, LogOut, Menu, X, Sun, Moon, Shield } from "lucide-react";
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
