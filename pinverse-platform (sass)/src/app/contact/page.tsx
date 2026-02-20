"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle, AlertCircle } from "lucide-react";
import { sendContactEmail } from "./actions";

export default function ContactPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);

        try {
            const result = await sendContactEmail(formData);

            if (result.success) {
                setIsSubmitted(true);
            } else {
                setError(result.error || "Something went wrong.");
            }
        } catch (err) {
            setError("An unexpected error occurred.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

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
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
                    <p className="text-slate-400 max-w-xl mx-auto">Have a question or need help? We&apos;re here for you. Send us a message and we&apos;ll respond as soon as possible.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Contact Info */}
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-yellow-400/10 rounded-xl flex items-center justify-center">
                                    <Mail className="w-6 h-6 text-yellow-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium">Email Support</h3>
                                    <a href="mailto:support@pinverse.io" className="text-yellow-400 hover:underline">support@pinverse.io</a>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-400/10 rounded-xl flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-medium">Response Time</h3>
                                    <p className="text-slate-400">Within 24-48 hours</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                            <h3 className="text-white font-medium mb-2">Business Address</h3>
                            <p className="text-slate-400">
                                Ecomverse LLC<br />
                                United States
                            </p>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                        {isSubmitted ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Message Sent!</h2>
                                <p className="text-slate-400">Thank you for contacting us. We&apos;ll get back to you soon.</p>
                                <button
                                    onClick={() => setIsSubmitted(false)}
                                    className="mt-6 text-sm text-yellow-400 hover:text-yellow-300 underline"
                                >
                                    Send another message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        required
                                        placeholder="John Doe"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        placeholder="you@example.com"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                                    <select
                                        name="subject"
                                        required
                                        defaultValue=""
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                                    >
                                        <option value="" disabled>Select a topic</option>
                                        <option value="General Inquiry">General Inquiry</option>
                                        <option value="Technical Support">Technical Support</option>
                                        <option value="Billing Question">Billing Question</option>
                                        <option value="Feature Request">Feature Request</option>
                                        <option value="Partnership">Partnership</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                                    <textarea
                                        name="message"
                                        required
                                        rows={5}
                                        placeholder="How can we help you?"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? "Sending..." : (
                                        <>
                                            <Send className="w-4 h-4" /> Send Message
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-8 mt-12">
                <div className="max-w-4xl mx-auto px-6 text-center text-slate-500 text-sm">
                    © 2025 Ecomverse LLC. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
