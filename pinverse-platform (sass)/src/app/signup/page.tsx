"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft, Check } from "lucide-react";
import { signUp } from "@/lib/supabase";

function SignupForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const plan = searchParams.get("plan") || "trial";
    const coupon = searchParams.get("coupon") || "";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [couponCode, setCouponCode] = useState(coupon);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (!acceptTerms) {
            setError("You must accept the Terms of Service");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);

        try {
            const { data, error } = await signUp(email, password);

            if (error) {
                setError(error.message);
                return;
            }

            // Show success message (email verification may be required)
            setSuccess(true);
        } catch (err) {
            setError("Failed to create account. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const getPlanTitle = () => {
        switch (plan) {
            case "starter": return "Starter ($29/mo)";
            case "pro": return "Pro ($59/mo)";
            default: return "Free Trial (7 days)";
        }
    };

    if (success) {
        return (
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <span className="text-3xl font-black text-white">Pin</span>
                        <span className="text-3xl font-black text-yellow-400">Verse</span>
                    </Link>
                </div>

                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
                    <p className="text-slate-400 mb-6">
                        We&apos;ve sent a confirmation link to <strong className="text-white">{email}</strong>
                    </p>
                    <p className="text-slate-500 text-sm mb-6">
                        Click the link in your email to activate your account, then you can sign in.
                    </p>
                    <Link href="/login" className="btn-primary inline-block">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md">
            {/* Logo */}
            <div className="text-center mb-8">
                <Link href="/" className="inline-flex items-center gap-2">
                    <span className="text-3xl font-black text-white">Pin</span>
                    <span className="text-3xl font-black text-yellow-400">Verse</span>
                </Link>
            </div>

            {/* Signup Card */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
                <h1 className="text-2xl font-bold text-white text-center mb-2">Create Your Account</h1>
                <p className="text-slate-400 text-center mb-2">Start your Pinterest marketing journey</p>

                <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-4 py-2 text-center mb-6">
                    <span className="text-yellow-400 text-sm font-medium">Selected Plan: {getPlanTitle()}</span>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-5">
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

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="Minimum 8 characters"
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Confirm your password"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Coupon Code (Optional)</label>
                        <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="ECOMVERSE100"
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                        />
                        {couponCode === "ECOMVERSE100" && (
                            <div className="flex items-center gap-2 text-emerald-400 text-sm mt-2">
                                <Check className="w-4 h-4" /> Ecomverse member discount applied!
                            </div>
                        )}
                    </div>

                    <label className="flex items-start gap-3 text-sm text-slate-400">
                        <input
                            type="checkbox"
                            checked={acceptTerms}
                            onChange={(e) => setAcceptTerms(e.target.checked)}
                            className="mt-1 rounded border-slate-600 bg-slate-900 text-yellow-400 focus:ring-yellow-400"
                        />
                        <span>
                            I agree to the{" "}
                            <Link href="/terms" className="text-yellow-400 hover:underline">Terms of Service</Link>
                            {" "}and{" "}
                            <Link href="/privacy" className="text-yellow-400 hover:underline">Privacy Policy</Link>
                        </span>
                    </label>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                <p className="text-center text-slate-400 mt-6">
                    Already have an account?{" "}
                    <Link href="/login" className="text-yellow-400 hover:underline">Sign in</Link>
                </p>
            </div>

            <Link href="/" className="flex items-center justify-center gap-2 text-slate-500 hover:text-white transition mt-6">
                <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="w-full max-w-md">
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2">
                    <span className="text-3xl font-black text-white">Pin</span>
                    <span className="text-3xl font-black text-yellow-400">Verse</span>
                </div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
                <p className="text-slate-400">Loading...</p>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-6 py-12">
            <Suspense fallback={<LoadingFallback />}>
                <SignupForm />
            </Suspense>
        </div>
    );
}
