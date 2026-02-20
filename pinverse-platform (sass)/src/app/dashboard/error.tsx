"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Dashboard Error:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 mb-6 max-w-md">
                We encountered an error while loading this page. This might be a temporary issue.
            </p>

            <div className="w-full max-w-md bg-slate-950/50 border border-red-900/20 rounded-lg p-4 mb-6 text-left">
                <p className="font-mono text-xs text-red-400 break-all">
                    {error.message}
                </p>
            </div>

            <button
                onClick={() => reset()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-md font-medium transition-colors"
            >
                Try Again
            </button>
        </div>
    );
}
