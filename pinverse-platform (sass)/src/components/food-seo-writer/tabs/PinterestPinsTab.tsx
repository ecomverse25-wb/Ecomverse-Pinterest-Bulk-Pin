"use client";

import React, { useState } from "react";
import type { FoodArticle } from "../types";
import type { ArticlePinSet, FoodPinCard } from "../hooks/usePinGeneration";
import BlogMonetizerPinExport from "@/components/blog-monetizer/BlogMonetizerPinExport";

// ─── Styles ───
const cardStyle: React.CSSProperties = { background: "#1a2035", borderRadius: 12, border: "1px solid #334155", padding: 20, marginBottom: 16 };
const secondaryBtnStyle: React.CSSProperties = { background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", padding: "8px 16px", cursor: "pointer", fontSize: 14 };
const greenBtnStyle: React.CSSProperties = { background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 };

// ─── Pin type labels ───
const PIN_TYPE_BADGES: Record<FoodPinCard['type'], { label: string; color: string; bg: string }> = {
    'featured': { label: '⭐ Featured', color: '#f0c040', bg: '#f0c04015' },
    'howto': { label: '📖 How-To', color: '#3b82f6', bg: '#3b82f615' },
    'curiosity': { label: '❓ Curiosity', color: '#a855f7', bg: '#a855f715' },
    'from-article': { label: '✍️ From Article', color: '#10b981', bg: '#10b98115' },
    'from-studio': { label: '📨 From Studio', color: '#ec4899', bg: '#ec489915' },
};

interface PinterestPinsTabProps {
    articles: FoodArticle[];
    wpBaseUrl: string;
    geminiKey: string;
    geminiModel: string;
    targetKeyword: string;
    pinSets: ArticlePinSet[];
    generatingPins: boolean;
    onGeneratePins: (articles: FoodArticle[]) => void;
    onAutoPopulate: () => void;
}

export default function PinterestPinsTab({
    articles, wpBaseUrl, geminiKey, geminiModel,
    targetKeyword, pinSets, generatingPins, onGeneratePins, onAutoPopulate,
}: PinterestPinsTabProps) {
    const [showVariations, setShowVariations] = useState<Record<number, boolean>>({});

    const readyArticles = articles.filter(a => a.status === "ready" || a.status === "published");

    return (
        <div>
            {/* Food SEO Pin Variations Panel */}
            <div style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ color: "#10b981", fontSize: 16, fontWeight: 700, margin: 0 }}>
                        🍳 Food SEO Pin Variations
                    </h3>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {targetKeyword && (
                            <span style={{
                                background: "#10b98120", border: "1px solid #10b98140",
                                borderRadius: 6, padding: "4px 10px", color: "#10b981", fontSize: 12, fontWeight: 600,
                            }}>
                                🎯 {targetKeyword}
                            </span>
                        )}
                        {readyArticles.length > 0 && pinSets.length === 0 && (
                            <button onClick={onAutoPopulate} style={secondaryBtnStyle}>
                                📌 Auto-Fill Pin Cards
                            </button>
                        )}
                        <button
                            onClick={() => onGeneratePins(articles)}
                            disabled={generatingPins || readyArticles.length === 0}
                            style={{
                                ...greenBtnStyle,
                                opacity: generatingPins || readyArticles.length === 0 ? 0.6 : 1,
                            }}
                        >
                            {generatingPins ? "⏳ Generating..." : `🎨 Generate AI Pin Text (${readyArticles.length} articles)`}
                        </button>
                    </div>
                </div>

                {readyArticles.length === 0 && pinSets.length === 0 && (
                    <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", padding: 20 }}>
                        No articles ready yet. Generate articles first in the Setup tab.
                    </p>
                )}

                {/* Summary: total pin cards */}
                {pinSets.length > 0 && (
                    <div style={{
                        display: "flex", gap: 16, marginBottom: 16, padding: "8px 16px",
                        background: "#0f1623", borderRadius: 8, border: "1px solid #334155",
                    }}>
                        <span style={{ color: "#94a3b8", fontSize: 13 }}>
                            📊 {pinSets.length} articles × 3 pins = <strong style={{ color: "#10b981" }}>{pinSets.reduce((acc, ps) => acc + ps.variations.length, 0)} pin cards</strong>
                        </span>
                        <span style={{ color: "#94a3b8", fontSize: 13 }}>
                            ✅ Filled: <strong style={{ color: "#10b981" }}>{pinSets.reduce((acc, ps) => acc + ps.variations.filter(v => v.pinTitle).length, 0)}</strong>
                        </span>
                        <span style={{ color: "#94a3b8", fontSize: 13 }}>
                            ⬜ Empty: <strong style={{ color: "#ef4444" }}>{pinSets.reduce((acc, ps) => acc + ps.variations.filter(v => !v.pinTitle).length, 0)}</strong>
                        </span>
                    </div>
                )}

                {/* Pin Sets */}
                {pinSets.map((pinSet, i) => (
                    <div key={i} style={{
                        background: "#0f1623", border: "1px solid #334155",
                        borderRadius: 10, padding: 16, marginBottom: 12,
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div>
                                <h4 style={{ color: "#e2e8f0", margin: 0, fontSize: 14 }}>{pinSet.articleTitle}</h4>
                                <span style={{ color: "#64748b", fontSize: 12 }}>Keyword: {pinSet.articleKeyword}</span>
                            </div>
                            <button
                                onClick={() => setShowVariations(prev => ({ ...prev, [i]: !prev[i] }))}
                                style={secondaryBtnStyle}
                            >
                                {showVariations[i] ? "Hide" : "Show"} {pinSet.variations.length} Pins
                            </button>
                        </div>

                        {pinSet.generating && (
                            <p style={{ color: "#10b981", fontSize: 13, fontWeight: 600 }}>⏳ Generating AI text for How-To & Curiosity pins...</p>
                        )}

                        {showVariations[i] && pinSet.variations.length > 0 && (
                            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                                {pinSet.variations.map((variation, vi) => {
                                    const badge = PIN_TYPE_BADGES[variation.type] || PIN_TYPE_BADGES['featured'];
                                    const isEmpty = !variation.pinTitle;

                                    return (
                                        <div key={vi} style={{
                                            background: "#1a2035", border: `1px solid ${isEmpty ? '#ef444440' : '#334155'}`,
                                            borderRadius: 8, padding: 12,
                                        }}>
                                            {/* Card header */}
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span style={{
                                                        fontSize: 11, fontWeight: 700, padding: "2px 8px",
                                                        borderRadius: 4, color: badge.color, background: badge.bg,
                                                    }}>
                                                        {badge.label}
                                                    </span>
                                                    <span style={{ color: "#94a3b8", fontSize: 12 }}>
                                                        Pin #{variation.variationNumber}
                                                    </span>
                                                </div>
                                                {!isEmpty && (
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(`${variation.pinTitle}\n\n${variation.pinDescription}`)}
                                                        style={{ ...secondaryBtnStyle, padding: "4px 8px", fontSize: 11 }}
                                                    >
                                                        📋 Copy All
                                                    </button>
                                                )}
                                            </div>

                                            {isEmpty ? (
                                                <p style={{ color: "#ef4444", fontSize: 13, margin: 0, fontStyle: "italic" }}>
                                                    ⬜ Empty — click &ldquo;Generate AI Pin Text&rdquo; to fill
                                                </p>
                                            ) : (
                                                <>
                                                    {/* Pin Title */}
                                                    <div style={{ marginBottom: 8 }}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                                            <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>PIN TITLE</span>
                                                            <span style={{ color: variation.pinTitle.length > 100 ? "#ef4444" : "#64748b", fontSize: 11 }}>
                                                                {variation.pinTitle.length}/100
                                                            </span>
                                                        </div>
                                                        <p style={{
                                                            color: "#e2e8f0", fontSize: 14, fontWeight: 600,
                                                            background: "#0f1623", borderRadius: 6, padding: "6px 10px", margin: 0,
                                                        }}>
                                                            {variation.pinTitle}
                                                        </p>
                                                    </div>

                                                    {/* Pin Description */}
                                                    <div style={{ marginBottom: 8 }}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                                            <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>PIN DESCRIPTION</span>
                                                            <span style={{ color: variation.pinDescription.length > 500 ? "#ef4444" : "#64748b", fontSize: 11 }}>
                                                                {variation.pinDescription.length}/500
                                                            </span>
                                                        </div>
                                                        <p style={{
                                                            color: "#cbd5e1", fontSize: 13,
                                                            background: "#0f1623", borderRadius: 6, padding: "6px 10px", margin: 0,
                                                            whiteSpace: "pre-wrap",
                                                        }}>
                                                            {variation.pinDescription}
                                                        </p>
                                                    </div>
                                                </>
                                            )}

                                            {/* Card metadata row */}
                                            <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                                                {variation.imageUrl && (
                                                    <span style={{ color: "#64748b", fontSize: 11 }}>
                                                        🖼️ Image: ✅
                                                    </span>
                                                )}
                                                {!variation.imageUrl && (
                                                    <span style={{ color: "#64748b", fontSize: 11 }}>
                                                        🖼️ Image: —
                                                    </span>
                                                )}
                                                {variation.destinationUrl && (
                                                    <span style={{ color: "#64748b", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                                                        🔗 {variation.destinationUrl}
                                                    </span>
                                                )}
                                                <span style={{ color: "#64748b", fontSize: 11 }}>
                                                    🎯 {variation.targetKeyword}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Standard Blog Monetizer Pin Export (for image overlays, etc.) */}
            <div style={{ marginTop: 16 }}>
                <h3 style={{ color: "#10b981", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                    📌 Pin Image Generator
                </h3>
                <BlogMonetizerPinExport
                    articles={articles as any[]}
                    wpBaseUrl={wpBaseUrl}
                    geminiKey={geminiKey}
                    geminiModel={geminiModel}
                />
            </div>
        </div>
    );
}
