import Link from "next/link";
import { Check, ArrowLeft } from "lucide-react";

export const metadata = {
    title: "Pricing - PinVerse",
    description: "Simple, transparent pricing for PinVerse Pinterest marketing tools.",
};

export default function PricingPage() {
    const plans = [
        {
            name: "Free Trial",
            description: "Try all features for 7 days",
            price: "$0",
            period: "/7 days",
            features: [
                "All tools access",
                "10 pins limit",
                "Basic support",
            ],
            cta: "Start Free Trial",
            href: "/signup",
            highlighted: false,
            buttonClass: "btn-secondary",
        },
        {
            name: "Starter",
            description: "For individual creators",
            price: "$29",
            period: "/month",
            features: [
                "2 tools access",
                "100 pins/month",
                "Priority support",
                "CSV export",
            ],
            cta: "Get Started",
            href: "/signup?plan=starter",
            highlighted: true,
            buttonClass: "btn-primary",
            badge: "MOST POPULAR",
        },
        {
            name: "Pro",
            description: "For power users & agencies",
            price: "$59",
            period: "/month",
            features: [
                "All tools access",
                "Unlimited pins",
                "Priority support",
                "Early access to new tools",
                "Custom templates",
            ],
            cta: "Go Pro",
            href: "/signup?plan=pro",
            highlighted: false,
            buttonClass: "btn-accent",
        },
    ];

    const faqs = [
        {
            question: "Can I cancel anytime?",
            answer: "Yes! You can cancel your subscription at any time. Your access will continue until the end of your current billing period.",
        },
        {
            question: "What payment methods do you accept?",
            answer: "We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe.",
        },
        {
            question: "Is there a refund policy?",
            answer: "Yes, we offer a 7-day money-back guarantee. If you're not satisfied within the first 7 days of your paid subscription, we'll give you a full refund.",
        },
        {
            question: "Do I need my own API keys?",
            answer: "Yes, you'll need to provide your own API keys for Google Gemini (free), and optionally Replicate and ImgBB. This gives you full control over your usage and costs.",
        },
        {
            question: "I'm an Ecomverse member. Do I get free access?",
            answer: "Yes! Ecomverse Skool members get free access to all PinVerse tools. Just use the coupon code ECOMVERSE100 when signing up.",
        },
    ];

    return (
        <div className="min-h-screen bg-[#0F172A]">
            {/* Navigation */}
            <nav className="border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl font-black text-white">Pin</span>
                        <span className="text-2xl font-black text-yellow-400">Verse</span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link href="/login" className="text-slate-300 hover:text-white transition">Login</Link>
                        <Link href="/signup" className="btn-primary text-sm">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-20 pb-12 px-6 text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
                <p className="text-slate-400 max-w-xl mx-auto">Choose the plan that fits your Pinterest marketing needs. All plans include a 7-day free trial.</p>
            </section>

            {/* Pricing Cards */}
            <section className="px-6 pb-20">
                <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative rounded-2xl p-8 ${plan.highlighted
                                    ? "bg-gradient-to-b from-yellow-400/10 to-transparent border-2 border-yellow-400"
                                    : "bg-slate-800/50 border border-slate-700"
                                }`}
                        >
                            {plan.badge && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 text-xs font-bold px-4 py-1 rounded-full">
                                    {plan.badge}
                                </div>
                            )}

                            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                            <p className="text-slate-400 text-sm mb-6">{plan.description}</p>

                            <div className="mb-6">
                                <span className="text-4xl font-black text-white">{plan.price}</span>
                                <span className="text-slate-400">{plan.period}</span>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                                        <Check className="w-4 h-4 text-emerald-400" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <Link href={plan.href} className={`block w-full ${plan.buttonClass} text-center`}>
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>

                <p className="text-center text-slate-500 mt-8 text-sm">
                    Are you an Ecomverse member? <Link href="/signup?coupon=ECOMVERSE100" className="text-yellow-400 hover:underline">Get free access here</Link>
                </p>
            </section>

            {/* FAQ */}
            <section className="py-20 px-6 bg-slate-900/50">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>

                    <div className="space-y-6">
                        {faqs.map((faq, i) => (
                            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-white mb-2">{faq.question}</h3>
                                <p className="text-slate-400">{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-yellow-400/10 to-emerald-400/10 border border-yellow-400/20 rounded-3xl p-12">
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
                    <p className="text-slate-400 mb-8">Start your free 7-day trial today. No credit card required.</p>
                    <Link href="/signup" className="btn-primary text-lg px-8 py-4">
                        Start Free Trial
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-slate-800">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-white">Pin</span>
                        <span className="text-lg font-black text-yellow-400">Verse</span>
                    </div>
                    <p className="text-slate-500 text-sm">© 2025 Ecomverse LLC. All rights reserved.</p>
                    <div className="flex gap-6 text-sm text-slate-400">
                        <Link href="/terms" className="hover:text-white">Terms</Link>
                        <Link href="/privacy" className="hover:text-white">Privacy</Link>
                        <Link href="/refund-policy" className="hover:text-white">Refunds</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
