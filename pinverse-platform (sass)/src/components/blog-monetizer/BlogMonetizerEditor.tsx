"use client";

import { useState } from "react";
import type { BlogArticle, WPCredentials, FeaturedImageSettings, ImageProvider, ImageDimensions, SectionImage } from "./BlogMonetizer.types";
import { publishBlogToWPAction } from "@/app/actions/blog-monetizer/generate";
import { generateFeaturedImageAction, generateH2ImageAction } from "@/app/actions/blog-monetizer/generate-image";

interface BlogMonetizerEditorProps {
    article: BlogArticle;
    index: number;
    wpCredentials: WPCredentials;
    geminiKey: string;
    replicateKey: string;
    imgbbKey: string;
    imageSettings: FeaturedImageSettings;
    geminiModel: string;
    imageProvider: ImageProvider;
    imageModel: string;
    onUpdate: (index: number, updated: BlogArticle) => void;
    onSwitchToSetup: () => void;
}

export default function BlogMonetizerEditor({
    article,
    index,
    wpCredentials,
    geminiKey,
    replicateKey,
    imgbbKey,
    imageSettings,
    geminiModel,
    imageProvider,
    imageModel,
    onUpdate,
    onSwitchToSetup,
}: BlogMonetizerEditorProps) {
    const [publishing, setPublishing] = useState(false);
    const [regeneratingImage, setRegeneratingImage] = useState(false);
    const [regeneratingAllImages, setRegeneratingAllImages] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState(false);
    const [customPrompt, setCustomPrompt] = useState(article.featuredImagePrompt || "");
    const [expanded, setExpanded] = useState(false);

    // ─── WP Publish ───
    const handlePublishToWP = async () => {
        if (!wpCredentials.url || !wpCredentials.user || !wpCredentials.password) {
            alert("WordPress credentials are not set.");
            return;
        }
        setPublishing(true);
        const result = await publishBlogToWPAction(
            article.title,
            article.content,
            article.featuredImageUrl,
            wpCredentials.url,
            wpCredentials.user,
            wpCredentials.password
        );
        if (result.success) {
            onUpdate(index, { ...article, status: "published", wpLink: result.link, wpPostId: result.id });
        } else {
            alert(result.error || "Failed to publish.");
        }
        setPublishing(false);
    };

    // ─── Regenerate Featured Image ───
    const handleRegenerateImage = async (promptOverride?: string) => {
        const needsReplicateKey = imageProvider === "replicate";
        const needsGeminiKey = imageProvider === "google-imagen";
        if (needsReplicateKey && !replicateKey) { alert("Replicate API key required."); return; }
        if (needsGeminiKey && !geminiKey) { alert("Gemini API key required for Google Imagen."); return; }

        setRegeneratingImage(true);
        const summary = article.content.replace(/<[^>]*>/g, " ").slice(0, 800);

        const result = await generateFeaturedImageAction(
            article.title,
            summary,
            promptOverride || imageSettings.promptTemplate,
            imageSettings.style,
            imageSettings.colorMood,
            imageSettings.dimensions,
            geminiKey,
            replicateKey,
            imgbbKey,
            geminiModel,
            imageProvider,
            imageModel,
        );

        if (result.success && result.imageUrl) {
            onUpdate(index, {
                ...article,
                featuredImageUrl: result.imageUrl,
                featuredImagePrompt: result.prompt,
            });
            if (result.prompt) setCustomPrompt(result.prompt);
        } else {
            alert(result.error || "Image generation failed.");
        }
        setRegeneratingImage(false);
    };

    // ─── Regenerate Images Only (no article text regen) ───
    const handleRegenerateImagesOnly = async () => {
        setRegeneratingAllImages(true);

        const content = article.content;
        const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
        const h2Headings: string[] = [];
        let h2Match;
        while ((h2Match = h2Regex.exec(content)) !== null) {
            h2Headings.push(h2Match[1].replace(/<[^>]*>/g, ""));
        }

        let newFeaturedUrl = article.featuredImageUrl;
        let newFeaturedPrompt = article.featuredImagePrompt;
        let newImageError: string | undefined;
        const newSectionImages: SectionImage[] = [];

        // Featured image
        try {
            const summary = content.replace(/<[^>]*>/g, " ").slice(0, 800);
            const featResult = await generateFeaturedImageAction(
                article.title, summary,
                imageSettings.promptTemplate,
                imageSettings.style,
                imageSettings.colorMood,
                imageSettings.dimensions,
                geminiKey, replicateKey, imgbbKey, geminiModel,
                imageProvider, imageModel,
            );
            if (featResult.success && featResult.imageUrl) {
                newFeaturedUrl = featResult.imageUrl;
                newFeaturedPrompt = featResult.prompt;
            } else {
                newImageError = featResult.error || "Featured image failed";
            }
        } catch (err) {
            newImageError = err instanceof Error ? err.message : "Featured image error";
        }

        // H2 section images
        for (let j = 0; j < h2Headings.length; j++) {
            try {
                const secResult = await generateH2ImageAction(
                    h2Headings[j], "blog", replicateKey, imgbbKey,
                    imageProvider, imageModel, geminiKey,
                    imageSettings.dimensions,
                );
                if (secResult.success && secResult.imageUrl) {
                    newSectionImages.push({ h2Index: j, h2Title: h2Headings[j], imageUrl: secResult.imageUrl });
                }
            } catch (err) {
                console.error(`Section image ${j} regen failed:`, err);
            }
        }

        onUpdate(index, {
            ...article,
            featuredImageUrl: newFeaturedUrl,
            featuredImagePrompt: newFeaturedPrompt,
            sectionImages: newSectionImages.length > 0 ? newSectionImages : article.sectionImages,
            imageError: newImageError,
        });
        setRegeneratingAllImages(false);
    };

    // ─── Copy Meta Description ───
    const copyMeta = () => {
        navigator.clipboard.writeText(article.metaDescription);
    };

    // ─── Status Badge ───
    const statusColors: Record<string, string> = {
        pending: "#94a3b8",
        generating: "#f0c040",
        ready: "#10b981",
        error: "#ef4444",
        published: "#3b82f6",
    };

    return (
        <div style={{
            background: "#1a2035",
            borderRadius: 12,
            border: "1px solid #334155",
            marginBottom: 16,
            overflow: "hidden",
        }}>
            {/* Header */}
            <div
                style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    borderBottom: expanded ? "1px solid #334155" : "none",
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <span style={{
                        background: statusColors[article.status] || "#94a3b8",
                        width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                    }} />
                    <div style={{ minWidth: 0 }}>
                        <h3 style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {article.title || article.keyword}
                        </h3>
                        <p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 0 0" }}>
                            🔑 {article.keyword} · {article.wordCount || 0} words · {article.status.toUpperCase()}
                            {article.imageError && (
                                <span style={{ color: "#ef4444", marginLeft: 8, fontWeight: 600, fontSize: 12 }}>
                                    {article.imageError.length > 80 ? article.imageError.slice(0, 80) + "…" : article.imageError}
                                </span>
                            )}
                            {article.imageError && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onSwitchToSetup(); }}
                                    style={{
                                        marginLeft: 8, background: "#1e2a3a", border: "1px solid #475569",
                                        borderRadius: 6, color: "#f0c040", padding: "2px 8px",
                                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                                    }}
                                >
                                    🔄 Switch Provider
                                </button>
                            )}
                            {article.wpLink && (
                                <a href={article.wpLink} target="_blank" rel="noopener" style={{ color: "#f0c040", marginLeft: 8 }}>View on WP →</a>
                            )}
                        </p>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                    {article.status === "ready" && wpCredentials.url && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePublishToWP(); }}
                            disabled={publishing}
                            style={{
                                background: publishing ? "#334155" : "#f0c040",
                                color: "#0f1623",
                                border: "none",
                                borderRadius: 8,
                                padding: "6px 14px",
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: publishing ? "not-allowed" : "pointer",
                            }}
                        >
                            {publishing ? "Sending..." : "📤 Send to WP"}
                        </button>
                    )}
                    <span style={{ color: "#94a3b8", fontSize: 18 }}>{expanded ? "▼" : "▶"}</span>
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div style={{ padding: 20 }}>
                    {/* Image Error Banner + Retry */}
                    {article.imageError && (
                        <div style={{
                            background: "#2a1a1a", border: "1px solid #7f1d1d", borderRadius: 8,
                            padding: 12, marginBottom: 16, display: "flex", alignItems: "center",
                            justifyContent: "space-between", gap: 12, flexWrap: "wrap",
                        }}>
                            <p style={{ color: "#fca5a5", fontSize: 13, margin: 0, flex: 1, minWidth: 200 }}>
                                {article.imageError}
                            </p>
                            <button
                                onClick={handleRegenerateImagesOnly}
                                disabled={regeneratingAllImages}
                                style={{
                                    background: "#f0c040", color: "#0f1623", border: "none",
                                    borderRadius: 8, padding: "8px 16px", fontWeight: 600,
                                    fontSize: 13, cursor: regeneratingAllImages ? "not-allowed" : "pointer",
                                    flexShrink: 0,
                                }}
                            >
                                {regeneratingAllImages ? "⏳ Regenerating..." : "🖼️ Regenerate Images Only"}
                            </button>
                        </div>
                    )}
                    {article.metaDescription && (
                        <div style={{
                            background: "#0f1623",
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 16,
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>META DESCRIPTION</span>
                                <p style={{ color: "#e2e8f0", fontSize: 14, margin: "4px 0 0 0" }}>{article.metaDescription}</p>
                            </div>
                            <button onClick={copyMeta} style={{
                                background: "#1e2a3a", border: "1px solid #334155", borderRadius: 6,
                                color: "#e2e8f0", padding: "6px 10px", cursor: "pointer", fontSize: 13, flexShrink: 0,
                            }}>📋 Copy</button>
                        </div>
                    )}

                    {/* Featured Image */}
                    {article.featuredImageUrl && (
                        <div style={{ marginBottom: 20 }}>
                            <h4 style={{ color: "#f0c040", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>✨ Featured Image</h4>
                            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
                                <img
                                    src={article.featuredImageUrl}
                                    alt={article.title}
                                    style={{ width: "100%", maxHeight: 500, objectFit: "cover", borderRadius: 12 }}
                                />
                                <span style={{
                                    position: "absolute", bottom: 8, left: 8,
                                    background: "rgba(0,0,0,0.7)", color: "#f0c040", padding: "2px 8px",
                                    borderRadius: 6, fontSize: 11, fontWeight: 600,
                                }}>AI Generated</span>
                            </div>

                            {/* Image Controls */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                                <button
                                    onClick={() => handleRegenerateImage()}
                                    disabled={regeneratingImage}
                                    style={{
                                        background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8,
                                        color: "#e2e8f0", padding: "6px 12px", cursor: "pointer", fontSize: 13,
                                    }}
                                >
                                    {regeneratingImage ? "⏳ Generating..." : "♻️ Regenerate"}
                                </button>
                                <button
                                    onClick={() => setEditingPrompt(!editingPrompt)}
                                    style={{
                                        background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8,
                                        color: "#e2e8f0", padding: "6px 12px", cursor: "pointer", fontSize: 13,
                                    }}
                                >
                                    ✏️ Edit Prompt
                                </button>
                                <a
                                    href={article.featuredImageUrl}
                                    download
                                    target="_blank"
                                    rel="noopener"
                                    style={{
                                        background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8,
                                        color: "#e2e8f0", padding: "6px 12px", textDecoration: "none", fontSize: 13,
                                    }}
                                >
                                    ⬇️ Download
                                </a>
                            </div>

                            {/* Editable prompt */}
                            {editingPrompt && (
                                <div style={{ marginTop: 8 }}>
                                    <textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        rows={3}
                                        style={{
                                            width: "100%", background: "#0f1623", border: "1px solid #334155",
                                            borderRadius: 8, color: "#e2e8f0", padding: 10, fontSize: 13,
                                            resize: "vertical",
                                        }}
                                    />
                                    <button
                                        onClick={() => handleRegenerateImage(customPrompt)}
                                        disabled={regeneratingImage}
                                        style={{
                                            marginTop: 8, background: "#f0c040", color: "#0f1623",
                                            border: "none", borderRadius: 8, padding: "6px 14px",
                                            fontWeight: 600, fontSize: 13, cursor: "pointer",
                                        }}
                                    >
                                        {regeneratingImage ? "⏳ Regenerating..." : "🚀 Regenerate with Custom Prompt"}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Section Images Grid */}
                    {article.sectionImages.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <h4 style={{ color: "#f0c040", marginBottom: 8, fontSize: 14, fontWeight: 600 }}>🖼️ Section Images</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                                {article.sectionImages.map((img, i) => (
                                    <div key={i} style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
                                        <img
                                            src={img.imageUrl}
                                            alt={img.h2Title}
                                            style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover" }}
                                        />
                                        <span style={{
                                            position: "absolute", bottom: 6, left: 6,
                                            background: "rgba(0,0,0,0.7)", color: "#e2e8f0", padding: "2px 8px",
                                            borderRadius: 6, fontSize: 11, maxWidth: "calc(100% - 20px)",
                                            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                                        }}>{img.h2Title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Article Content Preview */}
                    <div style={{
                        background: "#1a2035",
                        borderRadius: 8,
                        border: "1px solid #334155",
                        padding: 24,
                        maxHeight: 600,
                        overflowY: "auto",
                    }}>
                        <style>{`
                            .bm-article-preview h1 { color: #ffffff; font-size: 2rem; font-weight: 700; margin-bottom: 16px; line-height: 1.3; }
                            .bm-article-preview h2 { color: #f0c040; font-size: 22px; font-weight: 600; margin: 24px 0 12px 0; }
                            .bm-article-preview h3 { color: #e2e8f0; font-size: 18px; font-weight: 600; margin: 16px 0 8px 0; }
                            .bm-article-preview p { color: #e2e8f0; font-size: 15px; line-height: 1.7; margin-bottom: 12px; }
                            .bm-article-preview ul, .bm-article-preview ol { color: #e2e8f0; padding-left: 24px; margin-bottom: 12px; }
                            .bm-article-preview li { margin-bottom: 6px; line-height: 1.6; }
                            .bm-article-preview a { color: #f0c040; }
                            .bm-article-preview img { max-width: 100%; border-radius: 12px; margin: 12px 0; aspect-ratio: 2/3; object-fit: cover; }
                        `}</style>
                        <div
                            className="bm-article-preview"
                            dangerouslySetInnerHTML={{ __html: renderArticleWithAdPlaceholders(article.content) }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Render ad placeholders as styled boxes ───
function renderArticleWithAdPlaceholders(html: string): string {
    return html.replace(
        /<!--\s*AD UNIT[^>]*-->/gi,
        `<div style="border:2px dashed #334155;background:#0f1623;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
            <span style="color:#94a3b8;font-size:14px;">📢 Ad Placement — 300×250 or 728×90</span>
        </div>`
    );
}
