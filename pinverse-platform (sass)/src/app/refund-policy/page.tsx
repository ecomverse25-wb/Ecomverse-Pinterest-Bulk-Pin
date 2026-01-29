import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Refund Policy - PinVerse",
    description: "Refund Policy for PinVerse Pinterest marketing tools.",
};

export default function RefundPolicyPage() {
    return (
        <div className="min-h-screen bg-[#0F172A]">
            {/* Header */}
            <nav className="border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl font-black text-white">Pin</span>
                        <span className="text-xl font-black text-yellow-400">Verse</span>
                    </Link>
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                </div>
            </nav>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <h1 className="text-4xl font-bold text-white mb-2">Refund Policy</h1>
                <p className="text-slate-500 mb-8">Last updated: January 2025</p>

                <div className="prose prose-invert prose-slate max-w-none">
                    <div className="space-y-8 text-slate-300">

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Our Commitment</h2>
                            <p>At PinVerse, we want you to be completely satisfied with your purchase. We offer a straightforward refund policy to give you peace of mind.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">7-Day Money-Back Guarantee</h2>
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 my-4">
                                <p className="text-emerald-400 font-medium">If you&apos;re not satisfied with PinVerse within the first 7 days of your paid subscription, we&apos;ll give you a full refund—no questions asked.</p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Eligibility for Refund</h2>
                            <p>To be eligible for a refund:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Your refund request must be made within <strong>7 days</strong> of your initial subscription payment</li>
                                <li>This is your first subscription to PinVerse</li>
                                <li>You have not previously received a refund from us</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Non-Refundable Items</h2>
                            <p>The following are not eligible for refunds:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Subscription renewals after the initial 7-day period</li>
                                <li>Accounts that have been suspended or terminated for violating our Terms of Service</li>
                                <li>Partial month refunds for cancellations</li>
                                <li>Third-party API costs (these are charged by external providers)</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">How to Request a Refund</h2>
                            <p>To request a refund:</p>
                            <ol className="list-decimal pl-6 space-y-2 mt-4">
                                <li>Send an email to <strong>support@pinverse.io</strong></li>
                                <li>Include your account email address</li>
                                <li>Include the subject line: &quot;Refund Request&quot;</li>
                                <li>Briefly explain why you&apos;re requesting a refund (optional but helpful)</li>
                            </ol>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Processing Time</h2>
                            <p>Once we receive your refund request:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>We will review your request within <strong>1-2 business days</strong></li>
                                <li>If approved, your refund will be processed within <strong>5-10 business days</strong></li>
                                <li>The refund will be credited to your original payment method</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Subscription Cancellation</h2>
                            <p>If you simply want to cancel your subscription without a refund:</p>
                            <ul className="list-disc pl-6 space-y-2 mt-4">
                                <li>Go to your <Link href="/dashboard/billing" className="text-yellow-400 hover:underline">Billing Settings</Link></li>
                                <li>Click &quot;Cancel Subscription&quot;</li>
                                <li>Your access will continue until the end of your current billing period</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
                            <p>If you have any questions about our refund policy, please contact us:</p>
                            <ul className="list-none mt-4 space-y-2">
                                <li><strong>Email:</strong> support@pinverse.io</li>
                                <li><strong>Response Time:</strong> Within 24-48 hours</li>
                            </ul>
                        </section>

                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-8">
                <div className="max-w-4xl mx-auto px-6 text-center text-slate-500 text-sm">
                    © 2025 Ecomverse LLC. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
