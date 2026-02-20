export interface FeatureItem {
    title: string;
    description: string;
    icon: 'Zap' | 'Shield' | 'Users';
}

export interface FeaturesContent {
    title?: string;
    subtitle?: string;
    features?: FeatureItem[];
}

const defaultFeatures: FeatureItem[] = [
    {
        title: "AI-Powered Content",
        description: "Generate optimized pin titles, descriptions, and images using advanced AI. Save hours on content creation.",
        icon: "Zap"
    },
    {
        title: "Bulk Operations",
        description: "Create and schedule hundreds of pins at once. Export directly to Pinterest with our CSV editor.",
        icon: "Shield"
    },
    {
        title: "Built for Creators",
        description: "Designed by Pinterest marketers, for Pinterest marketers. Tools that actually work.",
        icon: "Users"
    }
];

const defaultContent: FeaturesContent = {
    title: "Why Choose PinVerse?",
    subtitle: "Everything you need to scale your Pinterest presence and drive massive organic traffic.",
    features: defaultFeatures
};

import { Zap, Shield, Users } from "lucide-react";

export default function Features({ content }: { content?: FeaturesContent | null }) {
    const { title, subtitle, features } = { ...defaultContent, ...content };
    const items = features || defaultFeatures;

    const getIcon = (name: string) => {
        switch (name) {
            case 'Zap': return Zap;
            case 'Shield': return Shield;
            case 'Users': return Users;
            default: return Zap;
        }
    };

    return (
        <section id="features" className="py-20 px-6 bg-slate-900/50">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">{title}</h2>
                    <p className="text-slate-400 max-w-xl mx-auto">{subtitle}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {items.map((feature, i) => {
                        const Icon = getIcon(feature.icon);
                        const colors = [
                            { border: 'hover:border-yellow-400/50', bg: 'bg-yellow-400/10', text: 'text-yellow-400' },
                            { border: 'hover:border-emerald-400/50', bg: 'bg-emerald-400/10', text: 'text-emerald-400' },
                            { border: 'hover:border-purple-400/50', bg: 'bg-purple-400/10', text: 'text-purple-400' }
                        ];
                        const color = colors[i % colors.length];

                        return (
                            <div key={i} className={`bg-slate-800/50 border border-slate-700 rounded-2xl p-8 transition ${color.border}`}>
                                <div className={`w-14 h-14 ${color.bg} rounded-xl flex items-center justify-center mb-6`}>
                                    <Icon className={`w-7 h-7 ${color.text}`} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-slate-400">{feature.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
