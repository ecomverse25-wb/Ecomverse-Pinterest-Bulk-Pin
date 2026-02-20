"use client";

import { useState } from "react";
import { X, Loader2, Plus, Check } from "lucide-react";
import { createCustomerAction } from "@/app/actions/admin-actions";
import { useToast } from "@/components/ui/use-toast";

interface AddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddCustomerModal({ isOpen, onClose, onSuccess }: AddCustomerModalProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        fullName: "",
        plan: "free" as "free" | "starter" | "pro" | "promax" | "enterprise"
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await createCustomerAction(formData);

            if (result.success) {
                toast({
                    title: "Success",
                    description: "Customer created successfully",
                    variant: "success",
                });
                onSuccess();
                onClose();
                setFormData({ email: "", password: "", fullName: "", plan: "free" }); // Reset
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to create customer",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Plus className="w-5 h-5 text-yellow-400" />
                        Add Customer
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Full Name <span className="text-slate-500">(Optional)</span>
                        </label>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            placeholder="John Doe"
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Email Address <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="john@example.com"
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Password <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition"
                        />
                        <p className="text-xs text-slate-500 mt-1">Min. 8 characters</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Subscription Plan <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['free', 'starter', 'pro', 'promax', 'enterprise'].map((plan) => (
                                <button
                                    key={plan}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, plan: plan as any })}
                                    className={`
                                        relative px-3 py-2 rounded-lg text-sm font-medium capitalize border transition
                                        ${formData.plan === plan
                                            ? 'bg-yellow-400/10 border-yellow-400 text-yellow-400'
                                            : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                                        }
                                    `}
                                >
                                    {plan === 'promax' ? 'Pro Max' : plan}
                                    {formData.plan === plan && (
                                        <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition border border-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 rounded-lg font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Create Customer
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
