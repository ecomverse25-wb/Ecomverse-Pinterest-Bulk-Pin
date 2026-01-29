"use client";

import Link from "next/link";
import { TrendingUp, Clock, Wrench, Settings, ArrowRight } from "lucide-react";

export default function DashboardPage() {
    return (
        <div className="max-w-6xl mx-auto" style={{ color: 'var(--foreground)' }}>
            {/* Welcome Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
                <p style={{ color: 'var(--muted)' }}>Here's an overview of your PinVerse activity.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div
                    className="rounded-xl p-6 shadow-sm"
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(250, 204, 21, 0.1)' }}>
                            <Wrench className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Active</span>
                    </div>
                    <p className="text-3xl font-bold mb-1">1</p>
                    <p style={{ color: 'var(--muted)' }} className="text-sm">Available Tools</p>
                </div>

                <div
                    className="rounded-xl p-6 shadow-sm"
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                            <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold mb-1">0</p>
                    <p style={{ color: 'var(--muted)' }} className="text-sm">Pins Created This Month</p>
                </div>

                <div
                    className="rounded-xl p-6 shadow-sm"
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'rgba(250, 204, 21, 0.1)' }}>
                            <Clock className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold mb-1">Pro</p>
                    <p style={{ color: 'var(--muted)' }} className="text-sm">Current Plan</p>
                </div>
            </div>

            {/* Quick Actions */}
            <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
                <Link
                    href="/dashboard/tools"
                    className="rounded-xl p-6 flex items-center justify-between group transition hover:shadow-lg"
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div>
                        <h3 className="font-semibold mb-1" style={{ color: 'var(--primary)' }}>Go to Tools</h3>
                        <p style={{ color: 'var(--muted)' }} className="text-sm">Access your Pinterest marketing tools</p>
                    </div>
                    <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition" style={{ color: 'var(--primary)' }} />
                </Link>
                <Link
                    href="/dashboard/account"
                    className="rounded-xl p-6 flex items-center justify-between group transition hover:shadow-lg"
                    style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)'
                    }}
                >
                    <div>
                        <h3 className="font-semibold mb-1">Account Settings</h3>
                        <p style={{ color: 'var(--muted)' }} className="text-sm">Manage your API keys and profile</p>
                    </div>
                    <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition" style={{ color: 'var(--muted)' }} />
                </Link>
            </div>

            {/* Getting Started Section */}
            <div
                className="rounded-xl p-6"
                style={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)'
                }}
            >
                <h2 className="text-xl font-bold mb-4">Getting Started</h2>
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'var(--primary)', color: '#0F172A' }}>1</div>
                        <div>
                            <h3 className="font-medium">Add Your API Keys</h3>
                            <p style={{ color: 'var(--muted)' }} className="text-sm">Go to Account Settings and add your <span style={{ color: 'var(--accent)' }}>Google Gemini API</span> key to enable AI features.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'var(--primary)', color: '#0F172A' }}>2</div>
                        <div>
                            <h3 className="font-medium">Create Your First Pins</h3>
                            <p style={{ color: 'var(--muted)' }} className="text-sm">Use the <span style={{ color: 'var(--accent)' }}>Bulk Pin Creator</span> to generate stunning pins from your URLs.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'var(--primary)', color: '#0F172A' }}>3</div>
                        <div>
                            <h3 className="font-medium">Export to Pinterest</h3>
                            <p style={{ color: 'var(--muted)' }} className="text-sm">Use the <span style={{ color: 'var(--accent)' }}>CSV Editor</span> to schedule and bulk upload your pins to Pinterest.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

