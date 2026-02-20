export default function SetupErrorPage() {
    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-xl bg-slate-800 border border-red-500/30 rounded-2xl p-8 shadow-2xl">
                <h1 className="text-3xl font-bold text-red-500 mb-4">Configuration Error</h1>
                <p className="text-lg text-slate-300 mb-6">
                    The application cannot start because the database connection details are missing.
                </p>

                <div className="bg-slate-950 p-6 rounded-lg text-left border border-slate-700">
                    <p className="text-yellow-400 font-medium mb-3">Required Environment Variables:</p>
                    <ul className="space-y-2 font-mono text-sm text-slate-400">
                        <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            NEXT_PUBLIC_SUPABASE_URL
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            NEXT_PUBLIC_SUPABASE_ANON_KEY
                        </li>
                    </ul>
                </div>

                <div className="mt-8">
                    <p className="text-slate-400 text-sm mb-4">
                        If you are the site owner, please add these variables in your hosting dashboard (Hostinger/Vercel).
                    </p>
                    <a
                        href="/"
                        className="inline-block bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-bold transition-colors"
                    >
                        Try Again
                    </a>
                </div>
            </div>
        </div>
    );
}
