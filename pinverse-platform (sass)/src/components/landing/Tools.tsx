import { Check } from "lucide-react";
import { getPublicVisibleTools, Tool } from "@/app/actions/tool-actions";

// Tool configuration for styling and features
const toolConfig: Record<string, {
    gradient: string;
    borderColor: string;
    hoverBorder: string;
    features: string[];
}> = {
    'bulk-pin-creator': {
        gradient: 'from-yellow-400/10 to-orange-400/10',
        borderColor: 'border-yellow-400/20',
        hoverBorder: 'hover:border-yellow-400/50',
        features: ['AI-generated content', 'Batch image generation', 'CSV export with scheduling', 'ImgBB auto-upload']
    },
    'article-writer': {
        gradient: 'from-indigo-400/10 to-purple-400/10',
        borderColor: 'border-indigo-400/20',
        hoverBorder: 'hover:border-indigo-400/50',
        features: ['Trend Research', 'SEO Article Generation', 'Auto-Pin Factory', 'WordPress Integration']
    },
    'pinterest-scheduler': {
        gradient: 'from-emerald-400/10 to-teal-400/10',
        borderColor: 'border-emerald-400/20',
        hoverBorder: 'hover:border-emerald-400/50',
        features: ['Auto-scheduling', 'Best time analysis', 'Multi-board support']
    },
    'keyword-research': {
        gradient: 'from-pink-400/10 to-rose-400/10',
        borderColor: 'border-pink-400/20',
        hoverBorder: 'hover:border-pink-400/50',
        features: ['Trending keywords', 'Competition analysis', 'SEO suggestions']
    },
    'analytics': {
        gradient: 'from-cyan-400/10 to-blue-400/10',
        borderColor: 'border-cyan-400/20',
        hoverBorder: 'hover:border-cyan-400/50',
        features: ['Pin performance', 'Traffic tracking', 'Growth metrics']
    }
};

// Default config for unknown tools
const defaultConfig = {
    gradient: 'from-slate-400/10 to-slate-500/10',
    borderColor: 'border-slate-400/20',
    hoverBorder: 'hover:border-slate-400/50',
    features: []
};

export default async function Tools() {
    const tools = await getPublicVisibleTools();

    return (
        <section id="tools" className="py-20 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">Powerful Tools, One Platform</h2>
                    <p className="text-slate-400 max-w-xl mx-auto">Access all the tools you need to dominate Pinterest marketing.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {tools.map((tool: Tool) => {
                        const config = toolConfig[tool.id] || defaultConfig;

                        return (
                            <div
                                key={tool.id}
                                className={`group relative bg-gradient-to-br ${config.gradient} border ${config.borderColor} rounded-2xl p-8 ${config.hoverBorder} transition overflow-hidden`}
                            >
                                <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                    AVAILABLE
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">{tool.name}</h3>
                                <p className="text-slate-400 mb-6">{tool.description}</p>
                                <ul className="space-y-2 mb-6">
                                    {config.features.map((feature, index) => (
                                        <li key={index} className="flex items-center gap-2 text-slate-300">
                                            <Check className="w-4 h-4 text-emerald-400" /> {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}

                    {/* Show message if no tools are visible */}
                    {tools.length === 0 && (
                        <div className="col-span-2 text-center py-12">
                            <p className="text-slate-400">Tools coming soon. Stay tuned!</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
