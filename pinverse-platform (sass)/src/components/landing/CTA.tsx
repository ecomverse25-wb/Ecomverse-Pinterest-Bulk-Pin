"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTA() {
    return (
        <section className="py-20 px-6">
            <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-yellow-400/10 to-emerald-400/10 border border-yellow-400/20 rounded-3xl p-12">
                <h2 className="text-4xl font-bold text-white mb-4">Ready to Dominate Pinterest?</h2>
                <p className="text-slate-400 mb-8">Start your free 7-day trial today. No credit card required.</p>
                <Link href="/signup" className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2">
                    Start Free Trial <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        </section>
    );
}
