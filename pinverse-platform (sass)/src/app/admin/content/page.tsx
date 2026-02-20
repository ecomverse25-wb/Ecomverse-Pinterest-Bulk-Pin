"use client";

import { useState, useEffect } from "react";
import { getSiteContentAction, updateSiteContentAction, ContentSectionKey } from "@/app/actions/content-actions";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, LayoutTemplate, MessageSquare, Tag, Users, Check, Plus, Trash2 } from "lucide-react";

// Types corresponding to our components
import { HeroContent } from "@/components/landing/Hero";
import { FeaturesContent } from "@/components/landing/Features";
import { PricingContent } from "@/components/landing/Pricing";
import { TestimonialsContent } from "@/components/landing/Testimonials";
import { FooterContent } from "@/components/landing/Footer";

import { TabButton, SectionCard, InputGroup, LoadingSpinner } from "./components";

export default function ContentEditor() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<ContentSectionKey>('hero');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // State for each section
    const [hero, setHero] = useState<HeroContent>({});
    const [features, setFeatures] = useState<FeaturesContent>({});
    const [pricing, setPricing] = useState<PricingContent>({});
    const [testimonials, setTestimonials] = useState<TestimonialsContent>({});
    const [footer, setFooter] = useState<FooterContent>({});

    // Load initial data
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Fetch all in parallel
                const [h, f, p, t, ft] = await Promise.all([
                    getSiteContentAction('hero'),
                    getSiteContentAction('features'),
                    getSiteContentAction('pricing'),
                    getSiteContentAction('testimonials'),
                    getSiteContentAction('footer')
                ]);

                if (h.content) setHero(h.content);
                if (f.content) setFeatures(f.content);
                if (p.content) setPricing(p.content);
                if (t.content) setTestimonials(t.content);
                if (ft.content) setFooter(ft.content);

            } catch (err) {
                console.error(err);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to load content"
                });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            let result;
            let currentContent;

            switch (activeTab) {
                case 'hero': currentContent = hero; break;
                case 'features': currentContent = features; break;
                case 'pricing': currentContent = pricing; break;
                case 'testimonials': currentContent = testimonials; break;
                case 'footer': currentContent = footer; break;
                default: return;
            }

            result = await updateSiteContentAction(activeTab, currentContent);

            if (result.success) {
                toast({
                    variant: "success",
                    title: "Saved",
                    description: `${activeTab.toUpperCase()} updated successfully!`
                });
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: err.message
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="max-w-5xl mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white">Content Editor</h1>
                    <p className="text-slate-400">Manage your landing page text and configuration.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary px-6 py-2 flex items-center gap-2"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Sidebar Tabs */}
                <div className="col-span-3 space-y-2">
                    <TabButton active={activeTab === 'hero'} onClick={() => setActiveTab('hero')} icon={LayoutTemplate} label="Hero Section" />
                    <TabButton active={activeTab === 'features'} onClick={() => setActiveTab('features')} icon={Check} label="Features" />
                    <TabButton active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')} icon={Tag} label="Pricing" />
                    <TabButton active={activeTab === 'testimonials'} onClick={() => setActiveTab('testimonials')} icon={Users} label="Testimonials" />
                    <TabButton active={activeTab === 'footer'} onClick={() => setActiveTab('footer')} icon={MessageSquare} label="Footer" />
                </div>

                {/* Main Content Area */}
                <div className="col-span-9">
                    {activeTab === 'hero' && (
                        <div className="space-y-6">
                            <SectionCard title="Header Content">
                                <InputGroup label="Badge Text" value={hero.badge} onChange={(v: string) => setHero({ ...hero, badge: v })} />
                                <InputGroup label="Primary Title (White)" value={hero.titlePrimary} onChange={(v: string) => setHero({ ...hero, titlePrimary: v })} />
                                <InputGroup label="Secondary Title (Yellow)" value={hero.titleSecondary} onChange={(v: string) => setHero({ ...hero, titleSecondary: v })} />
                                <InputGroup label="Description" type="textarea" value={hero.description} onChange={(v: string) => setHero({ ...hero, description: v })} />
                            </SectionCard>
                            <SectionCard title="Call to Actions">
                                <InputGroup label="Primary Button Text" value={hero.ctaPrimary} onChange={(v: string) => setHero({ ...hero, ctaPrimary: v })} />
                                <InputGroup label="Secondary Button Text" value={hero.ctaSecondary} onChange={(v: string) => setHero({ ...hero, ctaSecondary: v })} />
                            </SectionCard>
                        </div>
                    )}

                    {activeTab === 'features' && (
                        <div className="space-y-6">
                            <SectionCard title="Section Headlines">
                                <InputGroup label="Title" value={features.title} onChange={(v: string) => setFeatures({ ...features, title: v })} />
                                <InputGroup label="Subtitle" value={features.subtitle} onChange={(v: string) => setFeatures({ ...features, subtitle: v })} />
                            </SectionCard>
                            <div className="bg-yellow-400/10 border border-yellow-400/20 p-4 rounded-lg text-yellow-400 text-sm">
                                Note: Feature items editing is currently JSON-only or code-based. Simple text fields provided for headlines.
                            </div>
                        </div>
                    )}

                    {/* Pricing section with Plan Editor */}
                    {activeTab === 'pricing' && (
                        <div className="space-y-6">
                            <SectionCard title="Section Headlines">
                                <InputGroup label="Title" value={pricing.title} onChange={(v: string) => setPricing({ ...pricing, title: v })} />
                                <InputGroup label="Subtitle" value={pricing.subtitle} onChange={(v: string) => setPricing({ ...pricing, subtitle: v })} />
                            </SectionCard>

                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-white">Pricing Plans</h3>
                                    <button
                                        onClick={() => {
                                            const newPlans = [...(pricing.plans || [])];
                                            newPlans.push({
                                                name: "New Plan",
                                                description: "Plan description",
                                                price: "$0",
                                                period: "/month",
                                                features: ["Feature 1"],
                                                buttonText: "Get Started",
                                                href: "/signup",
                                                buttonStyle: "primary"
                                            });
                                            setPricing({ ...pricing, plans: newPlans });
                                        }}
                                        className="flex items-center gap-1 text-xs font-bold text-yellow-400 hover:text-yellow-300 transition"
                                    >
                                        <Plus className="w-3 h-3" /> Add Plan
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {(pricing.plans || []).map((plan, idx) => (
                                        <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 relative">
                                            <button
                                                onClick={() => {
                                                    const newPlans = [...(pricing.plans || [])];
                                                    newPlans.splice(idx, 1);
                                                    setPricing({ ...pricing, plans: newPlans });
                                                }}
                                                className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>

                                            <div className="grid grid-cols-2 gap-4">
                                                <InputGroup label="Plan Name" value={plan.name} onChange={(v: string) => {
                                                    const newPlans = [...(pricing.plans || [])];
                                                    newPlans[idx] = { ...newPlans[idx], name: v };
                                                    setPricing({ ...pricing, plans: newPlans });
                                                }} />
                                                <InputGroup label="Price" value={plan.price} onChange={(v: string) => {
                                                    const newPlans = [...(pricing.plans || [])];
                                                    newPlans[idx] = { ...newPlans[idx], price: v };
                                                    setPricing({ ...pricing, plans: newPlans });
                                                }} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <InputGroup label="Period" value={plan.period} onChange={(v: string) => {
                                                    const newPlans = [...(pricing.plans || [])];
                                                    newPlans[idx] = { ...newPlans[idx], period: v };
                                                    setPricing({ ...pricing, plans: newPlans });
                                                }} />
                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-slate-400 mb-1">Button Style</label>
                                                    <select
                                                        value={plan.buttonStyle}
                                                        onChange={(e) => {
                                                            const newPlans = [...(pricing.plans || [])];
                                                            newPlans[idx] = { ...newPlans[idx], buttonStyle: e.target.value as any };
                                                            setPricing({ ...pricing, plans: newPlans });
                                                        }}
                                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-400"
                                                    >
                                                        <option value="primary">Primary (Yellow)</option>
                                                        <option value="secondary">Secondary (Slate)</option>
                                                        <option value="accent">Accent (Emerald)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <InputGroup label="Description" value={plan.description} onChange={(v: string) => {
                                                const newPlans = [...(pricing.plans || [])];
                                                newPlans[idx] = { ...newPlans[idx], description: v };
                                                setPricing({ ...pricing, plans: newPlans });
                                            }} />

                                            <div className="grid grid-cols-2 gap-4">
                                                <InputGroup label="Button Text" value={plan.buttonText} onChange={(v: string) => {
                                                    const newPlans = [...(pricing.plans || [])];
                                                    newPlans[idx] = { ...newPlans[idx], buttonText: v };
                                                    setPricing({ ...pricing, plans: newPlans });
                                                }} />
                                                <InputGroup label="Link Href" value={plan.href} onChange={(v: string) => {
                                                    const newPlans = [...(pricing.plans || [])];
                                                    newPlans[idx] = { ...newPlans[idx], href: v };
                                                    setPricing({ ...pricing, plans: newPlans });
                                                }} />
                                            </div>

                                            <div className="flex items-center gap-2 mb-4">
                                                <input
                                                    type="checkbox"
                                                    id={`popular-${idx}`}
                                                    checked={plan.popular}
                                                    onChange={(e) => {
                                                        const newPlans = [...(pricing.plans || [])];
                                                        newPlans[idx] = { ...newPlans[idx], popular: e.target.checked };
                                                        setPricing({ ...pricing, plans: newPlans });
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-yellow-400 focus:ring-yellow-400"
                                                />
                                                <label htmlFor={`popular-${idx}`} className="text-sm text-slate-300 cursor-pointer">Mark as Most Popular</label>
                                            </div>

                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-slate-400 mb-1">Features (One per line)</label>
                                                <textarea
                                                    value={plan.features.join("\n")}
                                                    onChange={(e) => {
                                                        const newPlans = [...(pricing.plans || [])];
                                                        newPlans[idx] = {
                                                            ...newPlans[idx],
                                                            features: e.target.value.split(/\r?\n/).filter(f => f.trim() !== "")
                                                        };
                                                        setPricing({ ...pricing, plans: newPlans });
                                                    }}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-400 min-h-[100px]"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <SectionCard title="Footer Link">
                                <InputGroup label="Footer Text" value={pricing.footerText} onChange={(v: string) => setPricing({ ...pricing, footerText: v })} />
                                <InputGroup label="Link Text" value={pricing.footerLinkText} onChange={(v: string) => setPricing({ ...pricing, footerLinkText: v })} />
                                <InputGroup label="Link Href" value={pricing.footerLinkHref} onChange={(v: string) => setPricing({ ...pricing, footerLinkHref: v })} />
                            </SectionCard>
                        </div>
                    )}

                    {activeTab === 'testimonials' && (
                        <div className="space-y-6">
                            <SectionCard title="Section Headlines">
                                <InputGroup label="Title" value={testimonials.title} onChange={(v: string) => setTestimonials({ ...testimonials, title: v })} />
                            </SectionCard>
                        </div>
                    )}

                    {activeTab === 'footer' && (
                        <div className="space-y-6">
                            <SectionCard title="Brand">
                                <InputGroup label="Brand First Part (White)" value={footer.brandNamePart1} onChange={(v: string) => setFooter({ ...footer, brandNamePart1: v })} />
                                <InputGroup label="Brand Second Part (Yellow)" value={footer.brandNamePart2} onChange={(v: string) => setFooter({ ...footer, brandNamePart2: v })} />
                                <InputGroup label="Description" value={footer.description} onChange={(v: string) => setFooter({ ...footer, description: v })} />
                                <InputGroup label="Copyright Text" value={footer.copyright} onChange={(v: string) => setFooter({ ...footer, copyright: v })} />
                            </SectionCard>

                            {/* Company Links Editor */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-white">Company Links</h3>
                                    <button
                                        onClick={() => {
                                            const newLinks = [...(footer.companyLinks || [])];
                                            newLinks.push({ label: "New Link", href: "/" });
                                            setFooter({ ...footer, companyLinks: newLinks });
                                        }}
                                        className="flex items-center gap-1 text-xs font-bold text-yellow-400 hover:text-yellow-300 transition"
                                    >
                                        <Plus className="w-3 h-3" /> Add Link
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {(footer.companyLinks || []).map((link, idx) => (
                                        <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 relative">
                                            <button
                                                onClick={() => {
                                                    const newLinks = [...(footer.companyLinks || [])];
                                                    newLinks.splice(idx, 1);
                                                    setFooter({ ...footer, companyLinks: newLinks });
                                                }}
                                                className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <div className="grid grid-cols-2 gap-4 pr-8">
                                                <InputGroup label="Label" value={link.label} onChange={(v: string) => {
                                                    const newLinks = [...(footer.companyLinks || [])];
                                                    newLinks[idx] = { ...newLinks[idx], label: v };
                                                    setFooter({ ...footer, companyLinks: newLinks });
                                                }} />
                                                <InputGroup label="URL" value={link.href} onChange={(v: string) => {
                                                    const newLinks = [...(footer.companyLinks || [])];
                                                    newLinks[idx] = { ...newLinks[idx], href: v };
                                                    setFooter({ ...footer, companyLinks: newLinks });
                                                }} />
                                            </div>
                                        </div>
                                    ))}
                                    {(!footer.companyLinks || footer.companyLinks.length === 0) && (
                                        <p className="text-slate-500 text-sm italic">No company links. Click "Add Link" to create one.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
