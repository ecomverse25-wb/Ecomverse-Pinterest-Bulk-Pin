"use client";

import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex items-center">
                        <span className="text-2xl font-black text-white">Pin</span>
                        <span className="text-2xl font-black text-yellow-400">Verse</span>
                    </div>
                </Link>
                <div className="hidden md:flex items-center gap-8">
                    <Link href="#features" className="text-slate-300 hover:text-white transition">Features</Link>
                    <Link href="#tools" className="text-slate-300 hover:text-white transition">Tools</Link>
                    <Link href="#pricing" className="text-slate-300 hover:text-white transition">Pricing</Link>
                    <Link href="/login" className="text-slate-300 hover:text-white transition">Login</Link>
                    <Link href="/signup" className="btn-primary text-sm">Get Started</Link>
                </div>
            </div>
        </nav>
    );
}
