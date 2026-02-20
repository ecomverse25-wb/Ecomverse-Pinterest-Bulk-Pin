"use client";

import { useEffect, useState } from "react";
import { getUser } from "@/lib/supabase";
import { isAdmin, ADMIN_EMAILS } from "@/lib/admin";

export default function AdminDebugPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const { user } = await getUser();
            setUser(user);
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return <div className="p-8 text-white">Loading debug info...</div>;

    const userEmail = user?.email?.toLowerCase() || "No user logged in";
    const isUserAdmin = isAdmin(user?.email);

    // Check match against list
    const exactMatch = ADMIN_EMAILS.includes(userEmail);

    return (
        <div className="p-8 max-w-2xl mx-auto bg-slate-800 text-white rounded-xl mt-10 shadow-xl border border-slate-700">
            <h1 className="text-2xl font-bold mb-6 text-yellow-400">Admin Access Debugger</h1>

            <div className="space-y-6">
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase mb-2">Current User</h2>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${user ? "bg-emerald-400" : "bg-red-400"}`}></div>
                        <code className="text-lg bg-black px-2 py-1 rounded">{userEmail}</code>
                    </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase mb-2">Access Status</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between border-b border-slate-800 pb-2">
                            <span>Is Admin (Client Check):</span>
                            <span className={isUserAdmin ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                {isUserAdmin ? "YES" : "NO"}
                            </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-800 pb-2">
                            <span>Exact List Match:</span>
                            <span className={exactMatch ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                {exactMatch ? "YES" : "NO"}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase mb-2">Allowed Emails</h2>
                    <p className="text-xs text-slate-500 mb-2">These are loaded from ADMIN_EMAILS environment variable:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm bg-black p-3 rounded font-mono text-slate-300">
                        {ADMIN_EMAILS.map((email, i) => (
                            <li key={i} className={email === userEmail ? "text-emerald-400 font-bold" : ""}>
                                {email} {email === userEmail && "(YOU)"}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-yellow-400/10 border border-yellow-400/20 p-4 rounded-lg">
                    <h3 className="font-bold text-yellow-400 mb-1">Diagnosis</h3>
                    {isUserAdmin ? (
                        <p className="text-sm text-yellow-100">
                            ✅ Client-side check PASSES. You should see the Admin Panel icon.
                            <br />If you click it and get redirected back, the <strong>Server-Side Middleware</strong> environment variables might differ from Client-Side.
                        </p>
                    ) : (
                        <p className="text-sm text-yellow-100">
                            ❌ Client-side check FAILS. Your email is NOT in the allowed list.
                            <br />Please update <strong>ADMIN_EMAILS</strong> in Hostinger to include <code>{userEmail}</code>.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
