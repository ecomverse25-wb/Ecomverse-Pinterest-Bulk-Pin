import Link from "next/link";
import { Check } from "lucide-react";

export interface PricingPlan {
    name: string;
    description: string;
    price: string;
    period: string;
    features: string[];
    buttonText: string;
    href: string;
    popular?: boolean;
    buttonStyle: 'secondary' | 'primary' | 'accent';
}

export interface PricingContent {
    title?: string;
    subtitle?: string;
    plans?: PricingPlan[];
    footerText?: string;
    footerLinkText?: string;
    footerLinkHref?: string;
}

const defaultPlans: PricingPlan[] = [
    {
        name: "Free Trial",
        description: "Try all features for 3 days",
        price: "$0",
        period: "/month",
        features: ["All tools access", "Unlimited pins", "Basic support"],
        buttonText: "Start Free Trial",
        href: "/signup",
        buttonStyle: "secondary"
    },
    {
        name: "Starter",
        description: "For individual creators",
        price: "$14",
        period: "/month",
        features: ["2 Tools access", "Unlimited pins", "Priority support", "CSV export"],
        buttonText: "Get Started",
        href: "/signup?plan=starter",
        buttonStyle: "primary"
    },
    {
        name: "Pro",
        description: "For power users & agencies",
        price: "$27",
        period: "/month",
        features: ["All tools access", "Unlimited pins", "Priority support", "Early access to new tools"],
        buttonText: "Go Pro",
        href: "/signup?plan=pro",
        popular: false,
        buttonStyle: "accent"
    },
    {
        name: "Pro Max",
        description: "For agencies",
        price: "$149",
        period: "/year",
        features: ["50% saving", "All tools access", "Unlimited pins", "Priority support", "Early access to new tools"],
        buttonText: "Go Pro Max",
        href: "/signup?plan=promax",
        popular: true,
        buttonStyle: "primary"
    }
];

const defaultContent: PricingContent = {
    title: "Simple, Transparent Pricing",
    subtitle: "Choose the plan that fits your Pinterest marketing needs.",
    plans: defaultPlans,
    footerText: "Are you an Ecomverse member?",
    footerLinkText: "Get free access here",
    footerLinkHref: "/signup?coupon=ECOMVERSE100"
};

export default function Pricing({ content }: { content?: PricingContent | null }) {
    const { title, subtitle, plans, footerText, footerLinkText, footerLinkHref } = { ...defaultContent, ...content };
    const items = plans || defaultPlans;

    return (
        <section id="pricing" className="py-20 px-6 bg-slate-900/50">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">{title}</h2>
                    <p className="text-slate-400 max-w-xl mx-auto">{subtitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full">
                    {items.map((plan, i) => {
                        const isPopular = plan.popular;
                        const cardClasses = isPopular
                            ? "bg-gradient-to-b from-yellow-400/10 to-transparent border-2 border-yellow-400 rounded-2xl p-8 relative"
                            : "bg-slate-800/50 border border-slate-700 rounded-2xl p-8";

                        return (
                            <div key={i} className={cardClasses}>
                                {isPopular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 text-xs font-bold px-4 py-1 rounded-full">MOST POPULAR</div>
                                )}
                                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                <p className="text-slate-400 text-sm mb-6">{plan.description}</p>
                                <div className="mb-6">
                                    <span className="text-4xl font-black text-white">{plan.price}</span>
                                    <span className="text-slate-400">{plan.period}</span>
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-slate-300 text-sm">
                                            <Check className="w-4 h-4 text-emerald-400" /> {feature}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={plan.href}
                                    className={`block w-full text-center btn-${plan.buttonStyle}`}
                                >
                                    {plan.buttonText}
                                </Link>
                            </div>
                        );
                    })}
                </div>

                <p className="text-center text-slate-500 mt-8 text-sm">
                    {footerText} <Link href={footerLinkHref || '#'} className="text-yellow-400 hover:underline">{footerLinkText}</Link>
                </p>
            </div>
        </section>
    );
}
