"use client";

import { useEffect, useState } from "react";
import { checkEnvVarsAction } from "./actions";

export default function EnvDebugPage() {
    const [envStatus, setEnvStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const result = await checkEnvVarsAction();
                setEnvStatus(result);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="p-8 text-white">Loading env debug info...</div>;
    if (error) return <div className="p-8 text-red-400">Error: {error}</div>;

    return (
        <div className="p-8 max-w-2xl mx-auto bg-slate-800 text-white rounded-xl mt-10 shadow-xl border border-slate-700">
            <h1 className="text-2xl font-bold mb-6 text-yellow-400">Server Environment Variables Check</h1>

            <div className="space-y-6">
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase mb-4">Variable Status</h2>
                    <div className="space-y-3">
                        {Object.entries(envStatus).map(([key, info]: [string, any]) => (
                            <div key={key} className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="font-mono text-sm">{key}</span>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${info.exists ? 'bg-emerald-900 text-emerald-400' : 'bg-red-900 text-red-400'}`}>
                                        {info.exists ? "PRESENT" : "MISSING"}
                                    </span>
                                    {info.exists && (
                                        <span className="text-xs text-slate-500 font-mono">
                                            Len: {info.length} | Start: {info.start}...
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-blue-400/10 border border-blue-400/20 p-4 rounded-lg">
                    <h3 className="font-bold text-blue-400 mb-1">Troubleshooting</h3>
                    <p className="text-sm text-blue-100">
                        If <strong>SUPABASE_SERVICE_ROLE_KEY</strong> is MISSING:
                        <br />1. Check if the variable name has spaces in Hostinger.
                        <br />2. Try converting the value to a single line if it was pasted with newlines.
                        <br />3. Verify you are editing the correct environment (Production).
                    </p>
                </div>
            </div>
        </div>
    );
}
