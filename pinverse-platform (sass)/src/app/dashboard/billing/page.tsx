"use client";

import { useState } from "react";
import { Check, CreditCard, Download } from "lucide-react";

export default function BillingPage() {
    const [couponCode, setCouponCode] = useState("");
    const [couponApplied, setCouponApplied] = useState(false);

    const applyCoupon = () => {
        if (couponCode.toUpperCase() === "ECOMVERSE100") {
            setCouponApplied(true);
        }
    };

    const invoices = [
        { id: "INV-001", date: "Jan 28, 2025", amount: "$59.00", status: "Paid" },
        { id: "INV-002", date: "Dec 28, 2024", amount: "$59.00", status: "Paid" },
    ];

    return (
        <div className="max-w-2xl" style={{ color: 'var(--foreground)' }}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Billing</h1>
                <p style={{ color: 'var(--muted)' }}>Manage your subscription and payment methods.</p>
            </div>

            {/* Current Plan */}
            <div
                className="rounded-xl p-6 mb-6"
                style={{
                    background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.08), rgba(16, 185, 129, 0.08))',
                    border: '1px solid rgba(250, 204, 21, 0.2)'
                }}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Current Plan</p>
                        <h2 className="text-2xl font-bold mb-2">Pro Plan</h2>
                        <p style={{ color: 'var(--foreground)', opacity: 0.8 }}>$59/month • Renews on Feb 28, 2025</p>
                    </div>
                    <div className="text-white text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--accent)' }}>
                        ACTIVE
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button className="btn-secondary text-sm">
                        Change Plan
                    </button>
                    <button className="text-sm transition hover:opacity-80" style={{ color: '#EF4444' }}>
                        Cancel Subscription
                    </button>
                </div>
            </div>

            {/* Plan Features */}
            <div
                className="rounded-xl p-6 mb-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
                <h3 className="text-lg font-bold mb-4">Your Plan Includes</h3>
                <ul className="space-y-3">
                    <li className="flex items-center gap-3" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
                        <Check className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        All tools access
                    </li>
                    <li className="flex items-center gap-3" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
                        <Check className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        Unlimited pins
                    </li>
                    <li className="flex items-center gap-3" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
                        <Check className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        Priority support
                    </li>
                    <li className="flex items-center gap-3" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
                        <Check className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        Early access to new tools
                    </li>
                </ul>
            </div>

            {/* Payment Method */}
            <div
                className="rounded-xl p-6 mb-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
                <h3 className="text-lg font-bold mb-4">Payment Method</h3>
                <div
                    className="flex items-center gap-4 p-4 rounded-lg"
                    style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
                >
                    <div className="w-12 h-8 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB, #60A5FA)' }}>
                        <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>Expires 12/26</p>
                    </div>
                    <button className="ml-auto hover:underline text-sm" style={{ color: 'var(--primary)' }}>
                        Update
                    </button>
                </div>
            </div>

            {/* Coupon Code */}
            <div
                className="rounded-xl p-6 mb-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
                <h3 className="text-lg font-bold mb-4">Apply Coupon</h3>
                {couponApplied ? (
                    <div
                        className="rounded-lg p-4 flex items-center gap-3"
                        style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                    >
                        <Check className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        <span style={{ color: 'var(--accent)' }}>Ecomverse member discount applied! Your next billing will be $0.</span>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Enter coupon code"
                            className="flex-1 rounded-lg px-4 py-3 outline-none transition"
                            style={{
                                background: 'var(--secondary)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)'
                            }}
                        />
                        <button onClick={applyCoupon} className="btn-primary">
                            Apply
                        </button>
                    </div>
                )}
            </div>

            {/* Invoice History */}
            <div
                className="rounded-xl p-6"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
                <h3 className="text-lg font-bold mb-4">Invoice History</h3>
                <div className="space-y-3">
                    {invoices.map((invoice) => (
                        <div
                            key={invoice.id}
                            className="flex items-center justify-between p-4 rounded-lg"
                            style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
                        >
                            <div>
                                <p className="font-medium">{invoice.id}</p>
                                <p className="text-sm" style={{ color: 'var(--muted)' }}>{invoice.date}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span>{invoice.amount}</span>
                                <span className="text-sm" style={{ color: 'var(--accent)' }}>{invoice.status}</span>
                                <button className="transition hover:opacity-80" style={{ color: 'var(--muted)' }}>
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

