import Link from "next/link";
import { Check, Lock, ArrowRight } from "lucide-react";

export default function ToolsPage() {
    const tools = [
        {
            id: "bulk-pin-creator",
            name: "Bulk Pin Creator",
            description: "Generate hundreds of Pinterest pins with AI-powered titles, descriptions, and images. Export as CSV for bulk upload.",
            features: [
                "AI-generated content",
                "Batch image generation",
                "CSV export with scheduling",
                "ImgBB auto-upload",
            ],
            status: "available",
            href: "/dashboard/tools/bulk-pin-creator",
        },
        {
            id: "pinterest-scheduler",
            name: "Pinterest Scheduler",
            description: "Schedule your pins for optimal posting times. Automate your Pinterest workflow with smart scheduling.",
            features: [
                "Auto-scheduling",
                "Best time analysis",
                "Multi-board support",
            ],
            status: "coming_soon",
            href: "#",
        },
        {
            id: "keyword-research",
            name: "Keyword Research",
            description: "Find high-traffic Pinterest keywords to optimize your pins for maximum discoverability.",
            features: [
                "Trending keywords",
                "Competition analysis",
                "SEO suggestions",
            ],
            status: "coming_soon",
            href: "#",
        },
        {
            id: "analytics",
            name: "Analytics Dashboard",
            description: "Track your Pinterest performance with detailed analytics and insights.",
            features: [
                "Pin performance",
                "Traffic tracking",
                "Growth metrics",
            ],
            status: "coming_soon",
            href: "#",
        },
    ];

    return (
        <div style={{ color: 'var(--foreground)' }}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Tools</h1>
                <p style={{ color: 'var(--muted)' }}>Access your Pinterest marketing tools.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {tools.map((tool) => (
                    <div
                        key={tool.id}
                        className="relative rounded-2xl p-6 transition"
                        style={{
                            background: tool.status === "available"
                                ? 'linear-gradient(135deg, rgba(250, 204, 21, 0.08), rgba(249, 115, 22, 0.08))'
                                : 'var(--card)',
                            border: tool.status === "available"
                                ? '1px solid rgba(250, 204, 21, 0.3)'
                                : '1px solid var(--border)'
                        }}
                    >
                        {tool.status === "available" ? (
                            <div className="absolute top-4 right-4 text-white text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--accent)' }}>
                                AVAILABLE
                            </div>
                        ) : (
                            <div className="absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1" style={{ background: 'var(--muted)', color: 'white' }}>
                                <Lock className="w-3 h-3" /> COMING SOON
                            </div>
                        )}

                        <h3
                            className={`text-xl font-bold mb-2 ${tool.status === "coming_soon" ? "opacity-60" : ""}`}
                            style={{ color: 'var(--foreground)' }}
                        >
                            {tool.name}
                        </h3>
                        <p
                            className={`mb-4 ${tool.status === "coming_soon" ? "opacity-60" : ""}`}
                            style={{ color: 'var(--muted)' }}
                        >
                            {tool.description}
                        </p>

                        <ul className={`space-y-2 mb-6 ${tool.status === "coming_soon" ? "opacity-60" : ""}`}>
                            {tool.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)', opacity: 0.9 }}>
                                    <Check className="w-4 h-4" style={{ color: tool.status === "available" ? 'var(--accent)' : 'var(--muted)' }} />
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        {tool.status === "available" ? (
                            <Link
                                href={tool.href}
                                className="inline-flex items-center gap-2 btn-primary text-sm"
                            >
                                Open Tool <ArrowRight className="w-4 h-4" />
                            </Link>
                        ) : (
                            <button
                                disabled
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm cursor-not-allowed"
                                style={{ background: 'var(--secondary)', color: 'var(--muted)' }}
                            >
                                <Lock className="w-4 h-4" /> Coming Soon
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
