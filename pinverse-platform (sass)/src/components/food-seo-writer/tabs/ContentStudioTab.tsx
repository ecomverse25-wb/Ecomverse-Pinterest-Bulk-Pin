"use client";

import React, { useState, useMemo, useRef } from "react";
import type { FoodArticle, FeaturedImageSettings, ImageProvider, WritingProvider, WPCredentials, BatchQueueItem } from "../types";
import { RANK_MATH_WEIGHTS, RANK_MATH_MAX } from "../constants";
import BlogMonetizerEditor from "@/components/blog-monetizer/BlogMonetizerEditor";

// ─── Styles ───
const cardStyle: React.CSSProperties = { background: "#1a2035", borderRadius: 12, border: "1px solid #334155", padding: 20, marginBottom: 16 };
const secondaryBtnStyle: React.CSSProperties = { background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", padding: "8px 16px", cursor: "pointer", fontSize: 14 };
const greenBtnStyle: React.CSSProperties = { background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 };

// ─── SEO Check helpers ───

function checkKeywordInH1(content: string, keyword: string): boolean {
    const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (!h1Match) return false;
    return h1Match[1].toLowerCase().includes(keyword.toLowerCase());
}

function checkKeywordInFirst100Words(content: string, keyword: string): boolean {
    const textContent = content.replace(/<[^>]*>/g, " ").trim();
    const first100 = textContent.split(/\s+/).slice(0, 100).join(" ");
    return first100.toLowerCase().includes(keyword.toLowerCase());
}

function checkKeywordInMeta(metaDescription: string, keyword: string): boolean {
    return metaDescription.toLowerCase().includes(keyword.toLowerCase());
}

function checkKeywordInImageAlt(content: string, keyword: string): boolean {
    const altMatches = content.match(/alt="([^"]*)"/gi) || [];
    return altMatches.some(alt => alt.toLowerCase().includes(keyword.toLowerCase()));
}

function countInternalLinks(content: string): number {
    return (content.match(/<!-- INTERNAL LINK:/gi) || []).length;
}

function checkExternalDoFollowLink(content: string): boolean {
    const contentLower = content.toLowerCase();
    // Check for known authority domain names in links or inline references
    const authorityDomains = [
        'dietaryguidelines.gov', 'harvard', 'hsph.harvard.edu',
        'mayoclinic', 'mayo clinic', 'cdc.gov', 'nih.gov',
        'heart.org', 'american heart association',
        'usda', 'who.int',
    ];
    const hasAuthority = authorityDomains.some(domain => contentLower.includes(domain));
    if (hasAuthority) return true;
    // Fallback: check for any external dofollow link
    const externalLinks = content.match(/<a[^>]+href="https?:\/\/[^"]*"[^>]*>/gi) || [];
    return externalLinks.some(link => !link.includes('rel="nofollow"') && !link.includes("rel='nofollow'"));
}

function checkFaqSection(content: string): boolean {
    return /frequently asked questions/i.test(content);
}

function getWordCount(content: string): number {
    return content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
}

function getKeywordDensity(content: string, keyword: string): number {
    const text = content.replace(/<[^>]*>/g, " ").toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);
    const keywordLower = keyword.toLowerCase();
    const keywordWords = keywordLower.split(/\s+/);
    let count = 0;
    for (let i = 0; i <= words.length - keywordWords.length; i++) {
        const slice = words.slice(i, i + keywordWords.length).join(" ");
        if (slice === keywordLower) count++;
    }
    const totalWords = words.length;
    return totalWords > 0 ? (count * keywordWords.length / totalWords) * 100 : 0;
}

function countH2s(content: string): number {
    return (content.match(/<h2[^>]*>/gi) || []).length;
}

function checkConcludingParagraph(content: string): boolean {
    const contentLower = content.toLowerCase();
    // Check for Pinterest save CTA or meal planning references
    return contentLower.includes('save this') ||
        contentLower.includes('meal planning') ||
        contentLower.includes('bookmark') ||
        contentLower.includes('pin this') ||
        contentLower.includes('save for later');
}

// ─── Component ───

interface ContentStudioTabProps {
    articles: FoodArticle[];
    generating: boolean;
    generationProgress: { current: number; total: number };
    paused: boolean;
    wpUrl: string;
    wpUser: string;
    wpPassword: string;
    geminiKey: string;
    replicateKey: string;
    imgbbKey: string;
    writingModel: string;
    imageProvider: ImageProvider;
    imageModel: string;
    imageSettings: FeaturedImageSettings;
    onUpdate: (index: number, article: FoodArticle) => void;
    onPause: () => void;
    onStop: () => void;
    onPublishAll: () => void;
    onExportTitlesCSV: () => void;
    onExportZip: () => void;
    onSwitchToSetup: () => void;
    onSendToPins: (keyword: string, title: string, pinTitle: string, pinDescription: string) => void;
    requestedH2Count: number;
    batchQueue: BatchQueueItem[];
}

export default function ContentStudioTab({
    articles, generating, generationProgress, paused,
    wpUrl, wpUser, wpPassword, geminiKey, replicateKey, imgbbKey,
    writingModel, imageProvider, imageModel, imageSettings,
    onUpdate, onPause, onStop, onPublishAll, onExportTitlesCSV, onExportZip,
    onSwitchToSetup, onSendToPins, requestedH2Count, batchQueue,
}: ContentStudioTabProps) {
    const [expandedSeo, setExpandedSeo] = useState<number | null>(null);
    const [expandedPinterest, setExpandedPinterest] = useState<number | null>(null);
    const [expandedSchema, setExpandedSchema] = useState<number | null>(null);
    const [batchExpanded, setBatchExpanded] = useState(true);
    const articleListRef = useRef<HTMLDivElement>(null);

    return (
        <div>
            {/* Progress */}
            {generating && (
                <div style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                            ⚡ {generationProgress.current} / {generationProgress.total} articles
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={onPause} style={secondaryBtnStyle}>
                                {paused ? "▶️ Resume" : "⏸️ Pause"}
                            </button>
                            <button onClick={onStop} style={{ ...secondaryBtnStyle, color: "#ef4444" }}>
                                ⏹️ Stop
                            </button>
                        </div>
                    </div>
                    <div style={{ background: "#0f1623", borderRadius: 8, height: 8, overflow: "hidden" }}>
                        <div style={{
                            width: `${(generationProgress.current / Math.max(generationProgress.total, 1)) * 100}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #10b981, #059669)",
                            borderRadius: 8, transition: "width 0.3s",
                        }} />
                    </div>
                </div>
            )}

            {/* Bulk Actions */}
            {articles.length > 0 && !generating && (
                <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    {wpUrl && (
                        <button onClick={onPublishAll} style={greenBtnStyle}>
                            📤 Publish All to WordPress
                        </button>
                    )}
                    <button onClick={onExportTitlesCSV} style={secondaryBtnStyle}>⬇️ Export Titles as CSV</button>
                    <button onClick={onExportZip} style={secondaryBtnStyle}>⬇️ Export All as ZIP</button>
                </div>
            )}

            {/* Batch Queue Panel */}
            {batchQueue.length > 1 && (
                <BatchQueuePanel
                    batchQueue={batchQueue}
                    isExpanded={batchExpanded}
                    onToggle={() => setBatchExpanded(prev => !prev)}
                    generating={generating}
                    articleListRef={articleListRef}
                />
            )}

            {/* Articles */}
            <div ref={articleListRef}>
            {articles.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
                    <p style={{ color: "#94a3b8", fontSize: 16 }}>📝 No articles yet.</p>
                    <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>Go to Setup tab to configure and generate articles.</p>
                </div>
            ) : (
                articles.map((article, i) => (
                    <div key={i}>
                        {/* SEO Compliance Panel */}
                        {article.status === "ready" && (
                            <SEOCompliancePanel
                                article={article}
                                isExpanded={expandedSeo === i}
                                onToggle={() => setExpandedSeo(expandedSeo === i ? null : i)}
                                requestedH2Count={requestedH2Count}
                            />
                        )}

                        {/* Pinterest Assets Panel */}
                        {article.status === "ready" && (article.pinTitle || article.pinDescription) && (
                            <PinterestAssetsPanel
                                article={article}
                                isExpanded={expandedPinterest === i}
                                onToggle={() => setExpandedPinterest(expandedPinterest === i ? null : i)}
                                onSendToPins={() => onSendToPins(article.keyword, article.title, article.pinTitle || "", article.pinDescription || "")}
                            />
                        )}

                        {/* Schema Preview Panel */}
                        {article.status === "ready" && article.schemaMarkup && (
                            <SchemaPreviewPanel
                                article={article}
                                isExpanded={expandedSchema === i}
                                onToggle={() => setExpandedSchema(expandedSchema === i ? null : i)}
                                wpUrl={wpUrl}
                                wpUser={wpUser}
                                wpPassword={wpPassword}
                            />
                        )}

                        {/* Article Editor (from Blog Monetizer) */}
                        <BlogMonetizerEditor
                            article={article as any}
                            index={i}
                            wpCredentials={{ url: wpUrl, user: wpUser, password: wpPassword }}
                            geminiKey={geminiKey}
                            replicateKey={replicateKey}
                            imgbbKey={imgbbKey}
                            imageSettings={imageSettings}
                            geminiModel={writingModel}
                            imageProvider={imageProvider}
                            imageModel={imageModel}
                            onUpdate={(idx: number, updated: any) => onUpdate(idx, updated as FoodArticle)}
                            onSwitchToSetup={onSwitchToSetup}
                        />
                    </div>
                ))
            )}
            </div>
        </div>
    );
}

function getWeightForCheck(label: string): number {
    for (const [key, weight] of Object.entries(RANK_MATH_WEIGHTS)) {
        if (label.startsWith(key)) return weight;
    }
    if (label.includes('image alt text')) return 8;
    return 0;
}

// ─── SEO Compliance Panel ───

function SEOCompliancePanel({ article, isExpanded, onToggle, requestedH2Count }: {
    article: FoodArticle; isExpanded: boolean; onToggle: () => void; requestedH2Count: number;
}) {
    const checks = useMemo(() => {
        const wordCount = getWordCount(article.content);
        const density = getKeywordDensity(article.content, article.keyword);
        const h2Count = countH2s(article.content);
        const internalCount = countInternalLinks(article.content);

        return [
            { label: "Focus keyword in H1 title", pass: checkKeywordInH1(article.content, article.keyword) },
            { label: "Focus keyword in first 100 words", pass: checkKeywordInFirst100Words(article.content, article.keyword) },
            { label: "Focus keyword in meta description", pass: checkKeywordInMeta(article.metaDescription, article.keyword) },
            { label: "Image alt text contains keyword", pass: checkKeywordInImageAlt(article.content, article.keyword) },
            { label: `Internal links present (${internalCount} found)`, pass: internalCount > 0 },
            { label: "External DoFollow link present", pass: checkExternalDoFollowLink(article.content) },
            { label: "FAQ section present", pass: checkFaqSection(article.content) },
            { label: `Word count ≥ 1200 (${wordCount} words)`, pass: wordCount >= 1200 },
            { label: "Schema markup generated", pass: !!article.schemaMarkup && article.schemaMarkup.length > 50 },
            { label: `Keyword density 0.5%-1.5% (${density.toFixed(2)}%)`, pass: density >= 0.5 && density <= 1.5 },
            { label: `H2 count matches requested (${h2Count}/${requestedH2Count})`, pass: h2Count >= requestedH2Count },
            { label: "Concluding paragraph present", pass: checkConcludingParagraph(article.content) },
        ];
    }, [article, requestedH2Count]);

    const passCount = checks.filter(c => c.pass).length;
    const totalChecks = checks.length;

    // ─── Rank Math Estimated Score ───
    const rankMathScore = useMemo(() => {
        return checks.reduce((sum, check) => {
            if (check.pass) return sum + getWeightForCheck(check.label);
            return sum;
        }, 0);
    }, [checks]);

    const scoreColor = rankMathScore >= 75 ? '#10b981' : rankMathScore >= 55 ? '#f59e0b' : '#ef4444';
    const scoreBg = rankMathScore >= 75 ? '#10b98115' : rankMathScore >= 55 ? '#f59e0b15' : '#ef444415';
    const scoreMessage = rankMathScore >= 75
        ? '🟢 Ready to publish — Rank Math Good'
        : rankMathScore >= 55
            ? '🟡 Review suggestions below before publishing'
            : '🔴 Fix issues below before sending to WordPress';

    // SVG circular progress
    const circleRadius = 38;
    const circleCircumference = 2 * Math.PI * circleRadius;
    const circleOffset = circleCircumference - (rankMathScore / RANK_MATH_MAX) * circleCircumference;

    return (
        <div style={{
            ...cardStyle,
            border: "1px solid #10b98140",
            background: "#0f1623",
        }}>
            <button onClick={onToggle} style={{
                background: "transparent", border: "none", color: "#10b981",
                fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%",
                textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
                <span>✅ SEO Score Checklist — {passCount}/{totalChecks} checks</span>
                <span style={{ color: "#94a3b8" }}>{isExpanded ? "▼" : "▶"}</span>
            </button>

            {isExpanded && (
                <div style={{ marginTop: 12 }}>
                    {/* ── Rank Math Score Card ── */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: 20,
                        background: scoreBg, border: `1px solid ${scoreColor}40`,
                        borderRadius: 10, padding: "16px 20px", marginBottom: 16,
                    }}>
                        {/* Circular Progress */}
                        <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
                            <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: "rotate(-90deg)" }}>
                                {/* Background circle */}
                                <circle cx="45" cy="45" r={circleRadius} fill="none"
                                    stroke="#334155" strokeWidth="6" />
                                {/* Progress circle */}
                                <circle cx="45" cy="45" r={circleRadius} fill="none"
                                    stroke={scoreColor} strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray={circleCircumference}
                                    strokeDashoffset={circleOffset}
                                    style={{ transition: "stroke-dashoffset 0.5s ease" }} />
                            </svg>
                            <div style={{
                                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            }}>
                                <span style={{ color: scoreColor, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
                                    {rankMathScore}
                                </span>
                                <span style={{ color: "#64748b", fontSize: 11, fontWeight: 600 }}>
                                    /{RANK_MATH_MAX}
                                </span>
                            </div>
                        </div>

                        {/* Score Text */}
                        <div>
                            <h4 style={{ color: "#e2e8f0", margin: 0, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                                Estimated Rank Math Score
                            </h4>
                            <p style={{ color: scoreColor, margin: 0, fontSize: 13, fontWeight: 600 }}>
                                {scoreMessage}
                            </p>
                        </div>
                    </div>

                    {/* ── Checklist ── */}
                    {checks.map((check, i) => {
                        const weight = getWeightForCheck(check.label);
                        return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 14 }}>
                                <span style={{ color: check.pass ? "#10b981" : "#ef4444", fontWeight: 700, width: 16, textAlign: "center" }}>
                                    {check.pass ? "✓" : "✗"}
                                </span>
                                <span style={{ color: check.pass ? "#e2e8f0" : "#94a3b8", flex: 1 }}>{check.label}</span>
                                <span style={{ color: check.pass ? scoreColor : "#475569", fontSize: 11, fontWeight: 600, minWidth: 24, textAlign: "right" }}>
                                    {check.pass ? `+${weight}` : weight}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Pinterest Assets Panel ───

function PinterestAssetsPanel({ article, isExpanded, onToggle, onSendToPins }: {
    article: FoodArticle; isExpanded: boolean; onToggle: () => void; onSendToPins: () => void;
}) {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div style={{
            ...cardStyle,
            border: "1px solid #ec489940",
            background: "#0f1623",
        }}>
            <button onClick={onToggle} style={{
                background: "transparent", border: "none", color: "#ec4899",
                fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%",
                textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
                <span>📌 Pinterest Assets</span>
                <span style={{ color: "#94a3b8" }}>{isExpanded ? "▼" : "▶"}</span>
            </button>

            {isExpanded && (
                <div style={{ marginTop: 12 }}>
                    {/* Pin Title */}
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <label style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Pin Title</label>
                            <span style={{ color: (article.pinTitle?.length || 0) > 100 ? "#ef4444" : "#64748b", fontSize: 12 }}>
                                {article.pinTitle?.length || 0}/100
                            </span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <div style={{
                                flex: 1, background: "#1a2035", border: "1px solid #334155",
                                borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 14,
                            }}>
                                {article.pinTitle || "—"}
                            </div>
                            <button onClick={() => copyToClipboard(article.pinTitle || "")} style={secondaryBtnStyle}>📋</button>
                        </div>
                    </div>

                    {/* Pin Description */}
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <label style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Pin Description</label>
                            <span style={{ color: (article.pinDescription?.length || 0) > 500 ? "#ef4444" : "#64748b", fontSize: 12 }}>
                                {article.pinDescription?.length || 0}/500
                            </span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <div style={{
                                flex: 1, background: "#1a2035", border: "1px solid #334155",
                                borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 13,
                                maxHeight: 100, overflowY: "auto",
                            }}>
                                {article.pinDescription || "—"}
                            </div>
                            <button onClick={() => copyToClipboard(article.pinDescription || "")} style={secondaryBtnStyle}>📋</button>
                        </div>
                    </div>

                    <button onClick={onSendToPins} style={{
                        ...secondaryBtnStyle,
                        background: "#ec489920", border: "1px solid #ec4899",
                        color: "#ec4899", fontWeight: 700,
                    }}>
                        📌 Send to Pinterest Pins Tab
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Schema Preview Panel ───

function SchemaPreviewPanel({ article, isExpanded, onToggle, wpUrl, wpUser, wpPassword }: {
    article: FoodArticle; isExpanded: boolean; onToggle: () => void;
    wpUrl: string; wpUser: string; wpPassword: string;
}) {
    const [injecting, setInjecting] = useState(false);
    const [injectResult, setInjectResult] = useState<string | null>(null);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const injectSchemaToWP = async () => {
        if (!article.wpPostId || !wpUrl || !wpUser || !wpPassword || !article.schemaMarkup) {
            setInjectResult("❌ Article must be published to WordPress first");
            return;
        }

        setInjecting(true);
        try {
            const auth = btoa(`${wpUser}:${wpPassword}`);
            const baseUrl = wpUrl.replace(/\/$/, "");

            // Wrap schema in script tag and prepend to content
            const schemaScript = `<script type="application/ld+json">\n${article.schemaMarkup}\n</script>\n`;
            const newContent = schemaScript + article.content;

            const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts/${article.wpPostId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Basic ${auth}`,
                },
                body: JSON.stringify({ content: newContent }),
            });

            if (response.ok) {
                setInjectResult("✅ Schema injected into WordPress post!");
            } else {
                setInjectResult("❌ Failed to inject schema");
            }
        } catch {
            setInjectResult("❌ Error injecting schema");
        }
        setInjecting(false);
    };

    return (
        <div style={{
            ...cardStyle,
            border: "1px solid #3b82f640",
            background: "#0f1623",
        }}>
            <button onClick={onToggle} style={{
                background: "transparent", border: "none", color: "#3b82f6",
                fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%",
                textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
                <span>🔧 Schema Markup (JSON-LD)</span>
                <span style={{ color: "#94a3b8" }}>{isExpanded ? "▼" : "▶"}</span>
            </button>

            {isExpanded && (
                <div style={{ marginTop: 12 }}>
                    <pre style={{
                        background: "#1a2035", border: "1px solid #334155",
                        borderRadius: 8, padding: 12, color: "#e2e8f0", fontSize: 12,
                        overflow: "auto", maxHeight: 300, whiteSpace: "pre-wrap",
                    }}>
                        {article.schemaMarkup || "No schema generated"}
                    </pre>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button onClick={() => copyToClipboard(article.schemaMarkup || "")} style={secondaryBtnStyle}>
                            📋 Copy Schema
                        </button>
                        <button onClick={injectSchemaToWP} disabled={injecting || !article.wpPostId}
                            style={{ ...secondaryBtnStyle, opacity: (!article.wpPostId) ? 0.5 : 1 }}>
                            {injecting ? "⏳ Injecting..." : "💉 Inject into WordPress"}
                        </button>
                    </div>
                    {injectResult && (
                        <p style={{ color: injectResult.startsWith("✅") ? "#10b981" : "#ef4444", fontSize: 13, marginTop: 8 }}>
                            {injectResult}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Batch Queue Panel ───

const STATUS_CONFIG: Record<BatchQueueItem['status'], { icon: string; color: string; label: string }> = {
    queued: { icon: '⏳', color: '#64748b', label: 'Queued' },
    generating: { icon: '🔄', color: '#10b981', label: 'Generating...' },
    ready: { icon: '✅', color: '#10b981', label: 'Ready' },
    error: { icon: '❌', color: '#ef4444', label: 'Failed' },
};

function BatchQueuePanel({ batchQueue, isExpanded, onToggle, generating, articleListRef }: {
    batchQueue: BatchQueueItem[];
    isExpanded: boolean;
    onToggle: () => void;
    generating: boolean;
    articleListRef: React.RefObject<HTMLDivElement | null>;
}) {
    const readyCount = batchQueue.filter(q => q.status === 'ready').length;
    const generatingCount = batchQueue.filter(q => q.status === 'generating').length;
    const queuedCount = batchQueue.filter(q => q.status === 'queued').length;
    const errorCount = batchQueue.filter(q => q.status === 'error').length;
    const totalCount = batchQueue.length;
    const progressPercent = totalCount > 0 ? (readyCount / totalCount) * 100 : 0;

    const currentlyGenerating = batchQueue.find(q => q.status === 'generating');

    let footerMessage = '';
    if (readyCount === totalCount) {
        footerMessage = `✅ All ${totalCount} articles ready — publish all to WordPress`;
    } else if (errorCount > 0 && generatingCount === 0 && queuedCount === 0) {
        footerMessage = `${errorCount} failed — check keywords and retry`;
    } else if (generating && currentlyGenerating) {
        footerMessage = `Generating "${currentlyGenerating.keyword}"...`;
    } else if (queuedCount === totalCount) {
        footerMessage = 'Generation not started';
    } else if (errorCount > 0) {
        footerMessage = `${errorCount} failed — check keywords and retry`;
    } else {
        footerMessage = `${readyCount}/${totalCount} complete`;
    }

    const handleView = (keyword: string) => {
        if (!articleListRef.current) return;
        const cards = articleListRef.current.querySelectorAll('[data-article-keyword]');
        for (const card of cards) {
            if ((card as HTMLElement).dataset.articleKeyword?.toLowerCase() === keyword.toLowerCase()) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                (card as HTMLElement).style.outline = '2px solid #10b981';
                setTimeout(() => { (card as HTMLElement).style.outline = ''; }, 2000);
                break;
            }
        }
    };

    return (
        <div style={{
            ...cardStyle,
            border: '1px solid #10b98133',
            background: '#0f1623',
        }}>
            <button onClick={onToggle} style={{
                background: 'transparent', border: 'none', color: '#10b981',
                fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%',
                textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <span>⚡ Batch Processing</span>
                <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>
                    {readyCount}/{totalCount} complete {isExpanded ? '▼' : '▶'}
                </span>
            </button>

            {isExpanded && (
                <div style={{ marginTop: 12 }}>
                    {/* Summary counters */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                        <span style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>✅ {readyCount} Ready</span>
                        <span style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>🔄 {generatingCount} Generating</span>
                        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>⏳ {queuedCount} Queued</span>
                        <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>❌ {errorCount} Failed</span>
                    </div>

                    {/* Queue list */}
                    <div style={{
                        maxHeight: 280, overflowY: batchQueue.length > 6 ? 'auto' : 'visible',
                        borderRadius: 8, border: '1px solid #334155',
                    }}>
                        {batchQueue.map((item) => {
                            const cfg = STATUS_CONFIG[item.status];
                            return (
                                <div key={item.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '8px 12px',
                                    borderBottom: '1px solid #1e293b',
                                    borderLeft: item.status === 'generating'
                                        ? '2px solid #10b981'
                                        : item.status === 'error'
                                            ? '2px solid #ef4444'
                                            : '2px solid transparent',
                                    background: item.status === 'generating' ? '#10b98108' : 'transparent',
                                }}>
                                    {/* Status icon */}
                                    <span style={{
                                        fontSize: 14, minWidth: 20, textAlign: 'center',
                                        animation: item.status === 'generating' ? 'spin 1s linear infinite' : undefined,
                                    }}>
                                        {cfg.icon}
                                    </span>

                                    {/* Keyword */}
                                    <span style={{
                                        color: '#e2e8f0', fontSize: 13, flex: 1,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        maxWidth: 250,
                                    }}>
                                        {item.keyword.length > 40 ? item.keyword.slice(0, 40) + '…' : item.keyword}
                                    </span>

                                    {/* Right side — status-dependent */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                                        {item.status === 'queued' && (
                                            <span style={{ color: '#64748b', fontSize: 12 }}>Queued</span>
                                        )}
                                        {item.status === 'generating' && (
                                            <span style={{ color: '#10b981', fontSize: 12, fontStyle: 'italic' }}>Generating...</span>
                                        )}
                                        {item.status === 'ready' && (
                                            <>
                                                <span style={{ color: '#10b981', fontSize: 12 }}>
                                                    {item.wordCount} words · Score: {item.estimatedRankMathScore}/{RANK_MATH_MAX}
                                                </span>
                                                <button
                                                    onClick={() => handleView(item.keyword)}
                                                    style={{
                                                        background: '#10b98120', border: '1px solid #10b98140',
                                                        borderRadius: 4, padding: '2px 8px', color: '#10b981',
                                                        fontSize: 11, cursor: 'pointer', fontWeight: 600,
                                                    }}
                                                >
                                                    View
                                                </button>
                                            </>
                                        )}
                                        {item.status === 'error' && (
                                            <span style={{ color: '#ef4444', fontSize: 12 }}>
                                                {(item.errorMessage || 'Failed').length > 50
                                                    ? (item.errorMessage || 'Failed').slice(0, 50) + '…'
                                                    : (item.errorMessage || 'Failed')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Progress bar */}
                    <div style={{
                        background: '#1e293b', borderRadius: 4, height: 4,
                        marginTop: 12, overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: '#10b981',
                            borderRadius: 4,
                            transition: 'width 0.3s ease',
                        }} />
                    </div>

                    {/* Footer message */}
                    <p style={{
                        color: readyCount === totalCount ? '#10b981'
                            : errorCount > 0 ? '#ef4444'
                            : '#94a3b8',
                        fontSize: 12, marginTop: 8, marginBottom: 0, fontWeight: 600,
                    }}>
                        {footerMessage}
                    </p>
                </div>
            )}
        </div>
    );
}
