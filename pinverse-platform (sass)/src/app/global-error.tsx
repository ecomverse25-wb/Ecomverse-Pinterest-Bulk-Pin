"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global Error:", error);
    }, [error]);

    return (
        <html>
            <body className="bg-slate-900 text-white min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-800 p-6 rounded-lg border border-red-500/50 shadow-xl">
                    <h2 className="text-2xl font-bold text-red-500 mb-4">Critical System Error</h2>
                    <p className="text-slate-300 mb-4">
                        The application encountered a critical error and could not load.
                    </p>
                    <div className="bg-slate-950 p-4 rounded text-xs font-mono text-red-400 mb-6 overflow-auto max-h-48 border border-red-900/50">
                        {error.message || "Unknown Error"}
                        {error.digest && <div className="mt-2 text-slate-500">Digest: {error.digest}</div>}
                    </div>
                    <button
                        onClick={() => reset()}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </body>
        </html>
    );
}
