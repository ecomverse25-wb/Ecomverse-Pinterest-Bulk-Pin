"use client";

import { useState, useCallback } from "react";
import type { BlogArticle, PinData } from "./BlogMonetizer.types";

interface BlogMonetizerPinExportProps {
    articles: BlogArticle[];
    wpBaseUrl: string;
}

export default function BlogMonetizerPinExport({ articles, wpBaseUrl }: BlogMonetizerPinExportProps) {
    // Build pin data from all articles
    const pins: PinData[] = [];
    for (const article of articles) {
        if (article.status !== "ready" && article.status !== "published") continue;

        // Featured image pin
        if (article.featuredImageUrl) {
            pins.push({
                imageUrl: article.featuredImageUrl,
                title: article.title.slice(0, 100),
                description: `${article.metaDescription || article.title} #${article.keyword.replace(/\s+/g, "")}`,
                destinationUrl: article.wpLink || wpBaseUrl || "",
                sourceArticleKeyword: article.keyword,
                type: "featured",
            });
        }

        // Section image pins
        for (const img of article.sectionImages) {
            pins.push({
                imageUrl: img.imageUrl,
                title: img.h2Title.slice(0, 100),
                description: `${img.h2Title} - ${article.keyword} tips and inspiration #${article.keyword.replace(/\s+/g, "")}`,
                destinationUrl: article.wpLink || wpBaseUrl || "",
                sourceArticleKeyword: article.keyword,
                type: "section",
            });
        }
    }

    // Editable pin state
    const [editablePins, setEditablePins] = useState<PinData[]>(pins);

    // Sync when articles change
    const refreshPins = useCallback(() => {
        const newPins: PinData[] = [];
        for (const article of articles) {
            if (article.status !== "ready" && article.status !== "published") continue;
            if (article.featuredImageUrl) {
                newPins.push({
                    imageUrl: article.featuredImageUrl,
                    title: article.title.slice(0, 100),
                    description: `${article.metaDescription || article.title} #${article.keyword.replace(/\s+/g, "")}`,
                    destinationUrl: article.wpLink || wpBaseUrl || "",
                    sourceArticleKeyword: article.keyword,
                    type: "featured",
                });
            }
            for (const img of article.sectionImages) {
                newPins.push({
                    imageUrl: img.imageUrl,
                    title: img.h2Title.slice(0, 100),
                    description: `${img.h2Title} - ${article.keyword} tips and inspiration #${article.keyword.replace(/\s+/g, "")}`,
                    destinationUrl: article.wpLink || wpBaseUrl || "",
                    sourceArticleKeyword: article.keyword,
                    type: "section",
                });
            }
        }
        setEditablePins(newPins);
    }, [articles, wpBaseUrl]);

    const updatePin = (index: number, field: keyof PinData, value: string) => {
        setEditablePins(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    // ─── Download All as ZIP ───
    const downloadAllAsZip = async () => {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();

        for (let i = 0; i < editablePins.length; i++) {
            const pin = editablePins[i];
            try {
                const response = await fetch(pin.imageUrl);
                const blob = await response.blob();
                const ext = pin.imageUrl.includes(".png") ? "png" : "jpg";
                zip.file(`pin-${i + 1}-${pin.sourceArticleKeyword.replace(/\s+/g, "-")}.${ext}`, blob);
            } catch {
                // Skip failed downloads
            }
        }

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pinterest-pins.zip";
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─── Copy All Descriptions ───
    const copyAllDescriptions = () => {
        const text = editablePins.map(p => `${p.title}\n${p.description}\n${p.destinationUrl}`).join("\n\n---\n\n");
        navigator.clipboard.writeText(text);
    };

    if (editablePins.length === 0) {
        return (
            <div style={{
                background: "#1a2035", borderRadius: 12, border: "1px solid #334155", padding: 40, textAlign: "center",
            }}>
                <p style={{ color: "#94a3b8", fontSize: 16 }}>📌 No pins available yet.</p>
                <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>Generate articles with images first, then come back here to export Pinterest pins.</p>
                <button
                    onClick={refreshPins}
                    style={{
                        marginTop: 16, background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8,
                        color: "#e2e8f0", padding: "8px 16px", cursor: "pointer", fontSize: 14,
                    }}
                >
                    🔄 Refresh Pins
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Bulk Actions */}
            <div style={{
                display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center",
            }}>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>📌 {editablePins.length} pins ready</span>
                <button
                    onClick={downloadAllAsZip}
                    style={{
                        background: "#f0c040", color: "#0f1623", border: "none", borderRadius: 8,
                        padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14,
                    }}
                >
                    ⬇️ Download All as ZIP
                </button>
                <button
                    onClick={copyAllDescriptions}
                    style={{
                        background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8,
                        color: "#e2e8f0", padding: "8px 16px", cursor: "pointer", fontSize: 14,
                    }}
                >
                    📋 Copy All Pin Descriptions
                </button>
                <button
                    onClick={refreshPins}
                    style={{
                        background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8,
                        color: "#e2e8f0", padding: "8px 16px", cursor: "pointer", fontSize: 14,
                    }}
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Pin Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 16,
            }}>
                {editablePins.map((pin, i) => (
                    <div
                        key={i}
                        style={{
                            background: "#1a2035",
                            borderRadius: 12,
                            border: "1px solid #334155",
                            overflow: "hidden",
                        }}
                    >
                        {/* Image */}
                        <div style={{ position: "relative" }}>
                            <img
                                src={pin.imageUrl}
                                alt={pin.title}
                                style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover" }}
                            />
                            <span style={{
                                position: "absolute", top: 8, left: 8,
                                background: pin.type === "featured" ? "#f0c040" : "#3b82f6",
                                color: "#0f1623", padding: "2px 8px", borderRadius: 6,
                                fontSize: 11, fontWeight: 700,
                            }}>
                                {pin.type === "featured" ? "⭐ Featured" : "📷 Section"}
                            </span>
                        </div>

                        {/* Pin Info */}
                        <div style={{ padding: 14 }}>
                            <label style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>Pin Title (max 100)</label>
                            <input
                                type="text"
                                maxLength={100}
                                value={pin.title}
                                onChange={(e) => updatePin(i, "title", e.target.value)}
                                style={{
                                    width: "100%", background: "#0f1623", border: "1px solid #334155",
                                    borderRadius: 6, color: "#e2e8f0", padding: "6px 10px", fontSize: 13,
                                    marginBottom: 8,
                                }}
                            />

                            <label style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>Pin Description (max 500)</label>
                            <textarea
                                maxLength={500}
                                rows={3}
                                value={pin.description}
                                onChange={(e) => updatePin(i, "description", e.target.value)}
                                style={{
                                    width: "100%", background: "#0f1623", border: "1px solid #334155",
                                    borderRadius: 6, color: "#e2e8f0", padding: "6px 10px", fontSize: 13,
                                    resize: "vertical", marginBottom: 8,
                                }}
                            />

                            <label style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>Destination URL</label>
                            <input
                                type="text"
                                value={pin.destinationUrl}
                                onChange={(e) => updatePin(i, "destinationUrl", e.target.value)}
                                style={{
                                    width: "100%", background: "#0f1623", border: "1px solid #334155",
                                    borderRadius: 6, color: "#e2e8f0", padding: "6px 10px", fontSize: 13,
                                    marginBottom: 10,
                                }}
                            />

                            <div style={{ display: "flex", gap: 8 }}>
                                <a
                                    href={pin.imageUrl}
                                    download
                                    target="_blank"
                                    rel="noopener"
                                    style={{
                                        flex: 1, background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8,
                                        color: "#e2e8f0", padding: "6px 0", textAlign: "center", textDecoration: "none",
                                        fontSize: 13,
                                    }}
                                >
                                    ⬇️ Download
                                </a>
                                <a
                                    href={`https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(pin.destinationUrl)}&media=${encodeURIComponent(pin.imageUrl)}&description=${encodeURIComponent(pin.description)}`}
                                    target="_blank"
                                    rel="noopener"
                                    style={{
                                        flex: 1, background: "#e60023", border: "none", borderRadius: 8,
                                        color: "#fff", padding: "6px 0", textAlign: "center", textDecoration: "none",
                                        fontSize: 13, fontWeight: 600,
                                    }}
                                >
                                    📌 Open in Pinterest
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
