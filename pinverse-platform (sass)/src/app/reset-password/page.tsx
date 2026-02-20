"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState("");
    const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

    // Check if user has a valid recovery session
    useEffect(() => {
        const checkSession = async () => {
            const supabase = createClient();
            if (!supabase) {
                setError("System error. Please try again.");
                setIsValidSession(false);
                return;
            }

            // Listen for auth state changes (recovery link triggers this)
            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (event === "PASSWORD_RECOVERY") {
                    setIsValidSession(true);
                } else if (session) {
                    // User already has a session, they can reset
                    setIsValidSession(true);
                }
            });

            // Also check current session
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setIsValidSession(true);
            } else {
                // Wait a bit for the recovery event
                setTimeout(() => {
                    if (isValidSession === null) {
                        setIsValidSession(false);
                    }
                }, 2000);
            }

            return () => subscription.unsubscribe();
        };

        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setIsLoading(true);

        try {
            const supabase = createClient();
            if (!supabase) {
                setError("System error. Please try again.");
                return;
            }

            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                setError(error.message);
                return;
            }

            setIsSuccess(true);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err) {
            setError("Failed to reset password. Please try again.");
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
                    {isSuccess ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Password Reset!</h1>
                            <p className="text-slate-400 mb-6">
                                Your password has been successfully updated. Redirecting to login...
                            </p>
                            <Link href="/login" className="btn-primary inline-block">
                                Go to Login
                            </Link>
                        </div>
                    ) : isValidSession === false ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertCircle className="w-8 h-8 text-red-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Invalid or Expired Link</h1>
                            <p className="text-slate-400 mb-6">
                                This password reset link is invalid or has expired. Please request a new one.
                            </p>
                            <Link href="/forgot-password" className="btn-primary inline-block">
                                Request New Link
                            </Link>
                        </div>
                    ) : isValidSession === null ? (
                        <div className="text-center py-8">
                            <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-slate-400">Verifying your reset link...</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Lock className="w-8 h-8 text-yellow-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white text-center mb-2">Reset Password</h1>
                            <p className="text-slate-400 text-center mb-8">
                                Enter your new password below.
                            </p>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? "Updating..." : "Update Password"}
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
