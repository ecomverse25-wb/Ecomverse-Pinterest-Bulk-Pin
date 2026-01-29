"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { resetPassword } from "@/lib/supabase";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const { error } = await resetPassword(email);

            if (error) {
                setError(error.message);
                return;
            }

            setIsSubmitted(true);
        } catch (err) {
            setError("Failed to send reset email. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-6">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <span className="text-3xl font-black text-white">Pin</span>
                        <span className="text-3xl font-black text-yellow-400">Verse</span>
                    </Link>
                </div>

                {/* Card */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                    {isSubmitted ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
                            <p className="text-slate-400 mb-6">
                                We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>
                            </p>
                            <p className="text-slate-500 text-sm mb-6">
                                Didn&apos;t receive the email? Check your spam folder or try again.
                            </p>
                            <Link href="/login" className="btn-secondary inline-block">
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Mail className="w-8 h-8 text-yellow-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white text-center mb-2">Forgot Password?</h1>
                            <p className="text-slate-400 text-center mb-8">
                                No worries! Enter your email and we&apos;ll send you a reset link.
                            </p>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="you@example.com"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? "Sending..." : "Send Reset Link"}
                                </button>
                            </form>

                            <p className="text-center text-slate-400 mt-6">
                                Remember your password?{" "}
                                <Link href="/login" className="text-yellow-400 hover:underline">Sign in</Link>
                            </p>
                        </>
                    )}
                </div>

                <Link href="/" className="flex items-center justify-center gap-2 text-slate-500 hover:text-white transition mt-6">
                    <ArrowLeft className="w-4 h-4" /> Back to home
                </Link>
            </div>
        </div>
    );
}
