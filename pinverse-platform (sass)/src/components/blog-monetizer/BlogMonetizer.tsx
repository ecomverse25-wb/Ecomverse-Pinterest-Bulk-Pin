"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
    BlogMonetizerSettings, ParsedKeyword, BlogArticle,
    WPCredentials, FeaturedImageSettings, AffiliateLink,
    Tone, ArticleLength, H2Count, ImageStyle, ImageDimensions, SectionImage,
    WritingProvider, ImageProvider,
} from "./BlogMonetizer.types";
import {
    DEFAULT_SETTINGS, TONE_OPTIONS, ARTICLE_LENGTH_OPTIONS,
    H2_COUNT_OPTIONS, IMAGE_STYLE_OPTIONS, IMAGE_DIMENSION_OPTIONS,
    DEFAULT_IMAGE_PROMPT_TEMPLATE,
    WRITING_MODELS_BY_PROVIDER, IMAGE_MODELS_BY_PROVIDER,
    DEFAULT_WRITING_MODELS, DEFAULT_IMAGE_MODELS,
} from "./BlogMonetizer.types";
import {
    generateBulkTitlesAction, generateSingleTitleAction,
    generateBlogArticleAction, matchAffiliateLinksAction,
    publishBlogToWPAction,
} from "@/app/actions/blog-monetizer/generate";
import {
    generateFeaturedImageAction, generateH2ImageAction,
} from "@/app/actions/blog-monetizer/generate-image";
import BlogMonetizerEditor from "./BlogMonetizerEditor";
import BlogMonetizerPinExport from "./BlogMonetizerPinExport";
import { getUserSettingsAction, updateUserSettingsAction } from "@/app/actions/user-settings-actions";

// ─── Provider Labels ───
const WRITING_PROVIDER_OPTIONS: { value: WritingProvider; label: string }[] = [
    { value: "google", label: "Google Gemini" },
    { value: "claude", label: "Anthropic Claude" },
    { value: "openai", label: "OpenAI" },
    { value: "replicate", label: "Replicate (DeepSeek/Open Models)" },
];
const IMAGE_PROVIDER_OPTIONS: { value: ImageProvider; label: string }[] = [
    { value: "google-imagen", label: "Google Imagen" },
    { value: "replicate", label: "Replicate" },
];

// ─── localStorage helpers ───
function loadLS<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
        const v = localStorage.getItem(`bm_${key}`);
        return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
}
function saveLS(key: string, value: unknown) {
    if (typeof window === "undefined") return;
    localStorage.setItem(`bm_${key}`, JSON.stringify(value));
}

// ─── File parsers ───
async function parseTxtFile(text: string): Promise<string[]> {
    return text.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
}

async function parseCsvFile(text: string): Promise<string[]> {
    const Papa = (await import("papaparse")).default;
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });
    const headers = result.meta.fields || [];
    const kwHeaders = ["keyword", "keywords", "key word", "target keyword", "query", "term"];
    const kwCol = headers.find(h => kwHeaders.includes(h.toLowerCase())) || headers[0];
    if (!kwCol) return [];
    return (result.data as Record<string, string>[])
        .map(row => (row[kwCol] || "").trim())
        .filter(Boolean);
}

async function parseXlsxFile(buffer: ArrayBuffer): Promise<string[]> {
    const XLSX = (await import("xlsx")).default;
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (data.length === 0) return [];

    const headerRow = data[0].map(h => String(h || "").toLowerCase().trim());
    const kwHeaders = ["keyword", "keywords", "key word", "target keyword", "query", "term"];
    let colIdx = headerRow.findIndex(h => kwHeaders.includes(h));
    if (colIdx === -1) colIdx = 0;

    return data.slice(1).map(row => String(row[colIdx] || "").trim()).filter(Boolean);
}

// ─── Main Component ───
export default function BlogMonetizer() {
    // ─── Tab state ───
    const [activeTab, setActiveTab] = useState<"setup" | "studio" | "pins">("setup");

    // ─── Settings ───
    const [settings, setSettings] = useState<BlogMonetizerSettings>(() => loadLS("settings", DEFAULT_SETTINGS));
    const [geminiKey, setGeminiKey] = useState("");
    const [replicateKey, setReplicateKey] = useState("");
    const [imgbbKey, setImgbbKey] = useState("");
    const [anthropicKey, setAnthropicKey] = useState("");
    const [openaiKey, setOpenaiKey] = useState("");

    // ─── Provider & Model selections ───
    const [writingProvider, setWritingProvider] = useState<WritingProvider>("google");
    const [writingModel, setWritingModel] = useState("gemini-2.5-flash");
    const [imageProvider, setImageProvider] = useState<ImageProvider>("google-imagen");
    const [imageModel, setImageModel] = useState("imagen-3.0-generate-002");

    // WP
    const [wpUrl, setWpUrl] = useState(() => loadLS("wp_url", ""));
    const [wpUser, setWpUser] = useState(() => loadLS("wp_user", ""));
    const [wpPassword, setWpPassword] = useState(() => loadLS("wp_password", ""));

    // ─── Keyword state ───
    const [keywordMode, setKeywordMode] = useState<"single" | "file">("single");
    const [singleKeyword, setSingleKeyword] = useState("");
    const [parsedKeywords, setParsedKeywords] = useState<ParsedKeyword[]>([]);
    const [titlesGenerated, setTitlesGenerated] = useState(false);

    // ─── Articles ───
    const [articles, setArticles] = useState<BlogArticle[]>([]);
    const [generating, setGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
    const [paused, setPaused] = useState(false);
    const pausedRef = useRef(false);
    const stoppedRef = useRef(false);

    // ─── Status messages ───
    const [statusMessage, setStatusMessage] = useState("");
    const [titleGenerating, setTitleGenerating] = useState(false);

    // ─── Image settings collapsed ───
    const [imageSettingsOpen, setImageSettingsOpen] = useState(false);

    // Affiliates textarea
    const [affiliatesText, setAffiliatesText] = useState(() => {
        const links = loadLS<AffiliateLink[]>("affiliateLinks", []);
        return links.map(a => `${a.productName} | ${a.url}`).join("\n");
    });

    // ─── Load API Keys from DB ───
    useEffect(() => {
        (async () => {
            const { settings: s } = await getUserSettingsAction();
            if (s) {
                if (s.gemini_api_key) setGeminiKey(s.gemini_api_key);
                if (s.replicate_api_key) setReplicateKey(s.replicate_api_key);
                if (s.imgbb_api_key) setImgbbKey(s.imgbb_api_key);
                if (s.anthropic_api_key) setAnthropicKey(s.anthropic_api_key);
                if (s.openai_api_key) setOpenaiKey(s.openai_api_key);
            }
        })();
    }, []);

    // ─── Persist settings to localStorage ───
    const updateSettings = useCallback((patch: Partial<BlogMonetizerSettings>) => {
        setSettings(prev => {
            const next = { ...prev, ...patch };
            saveLS("settings", next);
            return next;
        });
    }, []);

    const updateFeaturedImage = useCallback((patch: Partial<FeaturedImageSettings>) => {
        setSettings(prev => {
            const next = { ...prev, featuredImage: { ...prev.featuredImage, ...patch } };
            saveLS("settings", next);
            return next;
        });
    }, []);

    // ─── Parse affiliates text ───
    useEffect(() => {
        const links: AffiliateLink[] = affiliatesText
            .split("\n")
            .map(l => l.trim())
            .filter(Boolean)
            .map(l => {
                const parts = l.split("|").map(p => p.trim());
                return { productName: parts[0] || "", url: parts[1] || "" };
            })
            .filter(a => a.productName && a.url);
        updateSettings({ affiliateLinks: links });
    }, [affiliatesText, updateSettings]);

    // Save WP
    const saveWpCreds = () => {
        saveLS("wp_url", wpUrl);
        saveLS("wp_user", wpUser);
        saveLS("wp_password", wpPassword);
        setStatusMessage("✅ WordPress credentials saved.");
        setTimeout(() => setStatusMessage(""), 3000);
    };

    // Save API key
    const saveApiKey = async (type: "gemini" | "replicate" | "imgbb" | "anthropic" | "openai", value: string) => {
        if (!value) return;
        const payload: Record<string, string> = {};
        if (type === "gemini") payload.gemini_api_key = value;
        if (type === "replicate") payload.replicate_api_key = value;
        if (type === "imgbb") payload.imgbb_api_key = value;
        if (type === "anthropic") payload.anthropic_api_key = value;
        if (type === "openai") payload.openai_api_key = value;
        await updateUserSettingsAction(payload);
        setStatusMessage(`✅ ${type.toUpperCase()} key saved.`);
        setTimeout(() => setStatusMessage(""), 3000);
    };

    // ─── Get the correct API key for writing ───
    const getWritingApiKey = () => {
        switch (writingProvider) {
            case "google": return geminiKey;
            case "claude": return anthropicKey;
            case "openai": return openaiKey;
            case "replicate": return replicateKey;
        }
    };
    const getWritingKeyLabel = () => {
        switch (writingProvider) {
            case "google": return "Gemini";
            case "claude": return "Anthropic";
            case "openai": return "OpenAI";
            case "replicate": return "Replicate";
        }
    };

    // ─── File Upload Handler ───
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        let keywords: string[] = [];
        const ext = file.name.split(".").pop()?.toLowerCase();

        if (ext === "txt") {
            const text = await file.text();
            keywords = await parseTxtFile(text);
        } else if (ext === "csv") {
            const text = await file.text();
            keywords = await parseCsvFile(text);
        } else if (ext === "xlsx") {
            const buffer = await file.arrayBuffer();
            keywords = await parseXlsxFile(buffer);
        } else {
            alert("Unsupported file type. Use .txt, .csv, or .xlsx");
            return;
        }

        setParsedKeywords(keywords.map(k => ({ text: k, checked: true })));
        setTitlesGenerated(false);
        setStatusMessage(`✅ Found ${keywords.length} keywords`);
    };

    // ─── Select All / Deselect All ───
    const toggleAll = (checked: boolean) => {
        setParsedKeywords(prev => prev.map(k => ({ ...k, checked })));
    };

    const removeKeyword = (idx: number) => {
        setParsedKeywords(prev => prev.filter((_, i) => i !== idx));
    };

    // ─── Generate Titles ───
    const handleGenerateTitles = async () => {
        const checked = parsedKeywords.filter(k => k.checked).map(k => k.text);
        if (checked.length === 0) { alert("No keywords selected."); return; }
        const wKey = getWritingApiKey();
        if (!wKey) { alert(`${getWritingKeyLabel()} API key required.`); return; }

        setTitleGenerating(true);
        setStatusMessage("✨ Generating titles... (1 API call)");

        const result = await generateBulkTitlesAction(
            checked, settings.tone, settings.niche, geminiKey, writingModel,
            writingProvider, anthropicKey, openaiKey, replicateKey
        );

        if (result.success && result.titles) {
            setParsedKeywords(prev => prev.map(k => {
                const match = result.titles!.find(t => t.keyword.toLowerCase() === k.text.toLowerCase());
                return match ? { ...k, generatedTitle: match.title } : k;
            }));
            setTitlesGenerated(true);
            setStatusMessage(`✅ Generated ${result.titles.length} titles`);
        } else {
            setStatusMessage(`❌ ${result.error}`);
        }
        setTitleGenerating(false);
    };

    // Regenerate single title
    const regenerateTitle = async (idx: number) => {
        const kw = parsedKeywords[idx];
        if (!kw || !getWritingApiKey()) return;
        const result = await generateSingleTitleAction(
            kw.text, settings.tone, settings.niche, geminiKey, writingModel,
            writingProvider, anthropicKey, openaiKey, replicateKey
        );
        if (result.success && result.title) {
            setParsedKeywords(prev => {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], generatedTitle: result.title };
                return copy;
            });
        }
    };

    // ─── Article Update Handler ───
    const updateArticle = (index: number, updated: BlogArticle) => {
        setArticles(prev => {
            const copy = [...prev];
            copy[index] = updated;
            return copy;
        });
    };

    // ─── Generate Articles ───
    const getKeywordsAndTitles = (): { keyword: string; title: string }[] => {
        if (keywordMode === "single") {
            return singleKeyword.trim() ? [{ keyword: singleKeyword.trim(), title: singleKeyword.trim() }] : [];
        }
        return parsedKeywords
            .filter(k => k.checked)
            .map(k => ({ keyword: k.text, title: k.generatedTitle || k.text }));
    };

    const generateAllArticles = async () => {
        const items = getKeywordsAndTitles();
        if (items.length === 0) { alert("No keywords to generate."); return; }
        if (!geminiKey) { alert("Gemini API key required."); return; }

        setGenerating(true);
        pausedRef.current = false;
        stoppedRef.current = false;
        setPaused(false);
        setGenerationProgress({ current: 0, total: items.length });
        setActiveTab("studio");

        const newArticles: BlogArticle[] = items.map(item => ({
            keyword: item.keyword,
            title: item.title,
            content: "",
            metaDescription: "",
            wordCount: 0,
            sectionImages: [],
            status: "pending" as const,
        }));
        setArticles(newArticles);

        for (let i = 0; i < newArticles.length; i++) {
            if (stoppedRef.current) break;

            // Wait if paused
            while (pausedRef.current) {
                await new Promise(r => setTimeout(r, 500));
                if (stoppedRef.current) break;
            }
            if (stoppedRef.current) break;

            setGenerationProgress({ current: i + 1, total: newArticles.length });
            const item = items[i];

            // Update status
            setArticles(prev => {
                const copy = [...prev];
                copy[i] = { ...copy[i], status: "generating" };
                return copy;
            });
            setStatusMessage(`⚡ Generating article text: "${item.keyword}" (${i + 1}/${newArticles.length})`);

            try {
                // Step 1: Generate article text
                const artResult = await generateBlogArticleAction(
                    item.title, item.keyword, settings.niche,
                    settings.tone, settings.articleLength, settings.h2Count,
                    geminiKey, writingModel, writingProvider,
                    anthropicKey, openaiKey, replicateKey
                );

                if (!artResult.success || !artResult.content) {
                    setArticles(prev => {
                        const copy = [...prev];
                        copy[i] = { ...copy[i], status: "error", errorMessage: artResult.error };
                        return copy;
                    });
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }

                let finalContent = artResult.content;

                // Extract AI-generated title from the H1 tag in the content
                let generatedTitle = item.title;
                const h1Match = finalContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
                if (h1Match) {
                    generatedTitle = h1Match[1].replace(/<[^>]*>/g, "").trim();
                }

                // Step 2: Inject affiliate links
                if (settings.affiliateLinks.length > 0) {
                    setStatusMessage(`🔗 Injecting affiliate links: "${item.keyword}"`);
                    const affResult = await matchAffiliateLinksAction(
                        finalContent, settings.affiliateLinks, geminiKey, writingModel,
                        writingProvider, anthropicKey, openaiKey, replicateKey
                    );
                    if (affResult.success && affResult.injectedHtml) {
                        finalContent = affResult.injectedHtml;
                    }
                }

                // Step 3: Generate images (featured + H2)
                const sectionImages: SectionImage[] = [];
                const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
                const h2Headings: string[] = [];
                let h2Match;
                while ((h2Match = h2Regex.exec(finalContent)) !== null) {
                    h2Headings.push(h2Match[1].replace(/<[^>]*>/g, ""));
                }

                let imageError: string | undefined;
                let featuredImageUrl: string | undefined;
                let featuredImagePrompt: string | undefined;

                const hasImageKey = imageProvider === "google-imagen" ? !!geminiKey : !!replicateKey;

                if (hasImageKey) {
                    // Featured image
                    setStatusMessage(`🖼️ Generating featured image: "${item.keyword}"`);
                    try {
                        const summary = finalContent.replace(/<[^>]*>/g, " ").slice(0, 800);
                        const featResult = await generateFeaturedImageAction(
                            generatedTitle, summary,
                            settings.featuredImage.promptTemplate,
                            settings.featuredImage.style,
                            settings.featuredImage.colorMood,
                            settings.featuredImage.dimensions,
                            geminiKey, replicateKey, imgbbKey, writingModel,
                            imageProvider, imageModel
                        );
                        if (featResult.success && featResult.imageUrl) {
                            featuredImageUrl = featResult.imageUrl;
                            featuredImagePrompt = featResult.prompt;
                        } else {
                            imageError = featResult.error || "Featured image generation failed";
                            console.error("[BlogMonetizer] Featured image failed:", featResult.error);
                        }
                    } catch (err) {
                        imageError = err instanceof Error ? err.message : "Featured image error";
                        console.error("[BlogMonetizer] Featured image exception:", err);
                    }

                    // H2 section images — generate sequentially with progress
                    for (let j = 0; j < h2Headings.length; j++) {
                        setStatusMessage(`🎨 Generating section images: ${j + 1}/${h2Headings.length} — "${item.keyword}"`);
                        try {
                            const secResult = await generateH2ImageAction(
                                h2Headings[j], settings.niche, replicateKey, imgbbKey,
                                imageProvider, imageModel, geminiKey,
                                settings.featuredImage.dimensions
                            );
                            if (secResult.success && secResult.imageUrl) {
                                sectionImages.push({
                                    h2Index: j,
                                    h2Title: h2Headings[j],
                                    imageUrl: secResult.imageUrl,
                                });
                            }
                        } catch (err) {
                            console.error(`[BlogMonetizer] Section image ${j} failed:`, err);
                        }
                    }
                } else {
                    imageError = `${imageProvider === "google-imagen" ? "Gemini" : "Replicate"} API key not set — images skipped`;
                }

                // Inject section images into HTML (after each H2)
                if (sectionImages.length > 0) {
                    // Sort by index descending to preserve positions
                    const sorted = [...sectionImages].sort((a, b) => b.h2Index - a.h2Index);
                    for (const img of sorted) {
                        const h2CloseRegex = /<\/h2>/gi;
                        let count = 0;
                        finalContent = finalContent.replace(h2CloseRegex, (match) => {
                            if (count === img.h2Index) {
                                count++;
                                return `${match}
<div style="margin:12px 0;position:relative;">
  <img src="${img.imageUrl}" alt="${img.h2Title}" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:12px;" />
  <span style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.7);color:#f0c040;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;">AI Generated</span>
</div>`;
                            }
                            count++;
                            return match;
                        });
                    }
                }

                // Step 4: Mark ready with extracted title
                setStatusMessage(`✅ Complete: "${generatedTitle}"`);
                setArticles(prev => {
                    const copy = [...prev];
                    copy[i] = {
                        ...copy[i],
                        title: generatedTitle,
                        content: finalContent,
                        metaDescription: artResult.metaDescription || "",
                        wordCount: artResult.wordCount || 0,
                        featuredImageUrl,
                        featuredImagePrompt,
                        sectionImages,
                        imageError,
                        status: "ready",
                    };
                    return copy;
                });

            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Unknown error";

                // Rate limit handling
                if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
                    setStatusMessage("⏳ Rate limit hit, waiting 30s...");
                    await new Promise(r => setTimeout(r, 30000));
                    i--; // Retry
                    continue;
                }

                setArticles(prev => {
                    const copy = [...prev];
                    copy[i] = { ...copy[i], status: "error", errorMessage: msg };
                    return copy;
                });
            }

            // Delay between articles
            if (i < newArticles.length - 1) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        setGenerating(false);
        const readyCount = articles.filter(a => a.status === "ready").length;
        setStatusMessage(`✅ Generation complete! ${readyCount} articles ready.`);
    };

    // ─── Bulk WP Publish ───
    const publishAllToWP = async () => {
        if (!wpUrl || !wpUser || !wpPassword) { alert("WordPress credentials required."); return; }

        const readyArticles = articles.filter(a => a.status === "ready");
        for (let i = 0; i < readyArticles.length; i++) {
            setStatusMessage(`📤 Publishing... ${i + 1}/${readyArticles.length}`);
            const art = readyArticles[i];
            const result = await publishBlogToWPAction(art.title, art.content, art.featuredImageUrl, wpUrl, wpUser, wpPassword);
            if (result.success) {
                const idx = articles.indexOf(art);
                if (idx !== -1) {
                    updateArticle(idx, { ...art, status: "published", wpLink: result.link, wpPostId: result.id });
                }
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        setStatusMessage("✅ All articles published to WordPress!");
    };

    // ─── Export functions ───
    const exportTitlesCSV = () => {
        const rows = getKeywordsAndTitles();
        const csv = "keyword,title\n" + rows.map(r => `"${r.keyword}","${r.title}"`).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "blog-monetizer-titles.csv"; a.click();
        URL.revokeObjectURL(url);
    };

    const exportArticlesZip = async () => {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const art of articles.filter(a => a.status === "ready" || a.status === "published")) {
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${art.title}</title></head><body>${art.content}</body></html>`;
            zip.file(`${art.keyword.replace(/\s+/g, "-")}.html`, html);
        }
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url; a.download = "blog-articles.zip"; a.click();
        URL.revokeObjectURL(url);
    };

    // ─── Pause / Stop ───
    const handlePause = () => {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
    };
    const handleStop = () => {
        stoppedRef.current = true;
        pausedRef.current = false;
        setPaused(false);
    };

    // ─── Shared Styles ───
    const cardStyle: React.CSSProperties = { background: "#1a2035", borderRadius: 12, border: "1px solid #334155", padding: 20, marginBottom: 16 };
    const inputStyle: React.CSSProperties = { width: "100%", background: "#0f1623", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", padding: "8px 12px", fontSize: 14 };
    const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
    const labelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 };
    const goldBtnStyle: React.CSSProperties = { background: "#f0c040", color: "#0f1623", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 };
    const secondaryBtnStyle: React.CSSProperties = { background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", padding: "8px 16px", cursor: "pointer", fontSize: 14 };

    // ─── Tab Navigation ───
    const tabs = [
        { key: "setup" as const, label: "⚙️ Setup", icon: "1" },
        { key: "studio" as const, label: "📝 Content Studio", icon: "2" },
        { key: "pins" as const, label: "📌 Pinterest Pins", icon: "3" },
    ];

    return (
        <div style={{ color: "#e2e8f0" }}>
            {/* Tab Navigation */}
            <div style={{
                display: "grid", gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
                background: "#1a2035", borderRadius: 12, padding: 4, marginBottom: 20,
                border: "1px solid #334155",
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            background: activeTab === tab.key ? "#0f1623" : "transparent",
                            border: activeTab === tab.key ? "1px solid #334155" : "1px solid transparent",
                            borderRadius: 8, padding: "10px 16px",
                            color: activeTab === tab.key ? "#f0c040" : "#94a3b8",
                            fontWeight: 600, cursor: "pointer", fontSize: 15,
                            transition: "all 0.2s",
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Status Bar */}
            {statusMessage && (
                <div style={{
                    background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8,
                    padding: "8px 16px", marginBottom: 16, color: "#e2e8f0", fontSize: 14,
                }}>
                    {statusMessage}
                </div>
            )}

            {/* ━━━━━━━━ SETUP TAB ━━━━━━━━ */}
            {activeTab === "setup" && (
                <div>
                    {/* API Keys & Models */}
                    <div style={cardStyle}>
                        <h3 style={{ color: "#f0c040", fontSize: 16, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>🔑 API Keys & Models</h3>

                        {/* ── Writing Provider ── */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ ...labelStyle, fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>✍️ Writing Provider</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                                {WRITING_PROVIDER_OPTIONS.map(p => (
                                    <label key={p.value} style={{
                                        display: "flex", alignItems: "center", gap: 6,
                                        background: writingProvider === p.value ? "#1e3a5f" : "#1e2a3a",
                                        border: `1px solid ${writingProvider === p.value ? "#f0c040" : "#334155"}`,
                                        borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: "#e2e8f0",
                                    }}>
                                        <input type="radio" name="writingProvider" value={p.value}
                                            checked={writingProvider === p.value}
                                            onChange={() => { setWritingProvider(p.value); setWritingModel(DEFAULT_WRITING_MODELS[p.value]); }}
                                            style={{ accentColor: "#f0c040" }} />
                                        {p.label}
                                    </label>
                                ))}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Writing Model</label>
                                    <select value={writingModel} onChange={e => setWritingModel(e.target.value)} style={selectStyle}>
                                        {WRITING_MODELS_BY_PROVIDER[writingProvider].map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>
                                        {writingProvider === "google" ? "Gemini" : writingProvider === "claude" ? "Anthropic" : writingProvider === "openai" ? "OpenAI" : "Replicate"} API Key
                                    </label>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        {writingProvider === "google" && (
                                            <><input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AI..." style={{ ...inputStyle, flex: 1 }} />
                                                <button onClick={() => saveApiKey("gemini", geminiKey)} style={secondaryBtnStyle}>💾</button></>
                                        )}
                                        {writingProvider === "claude" && (
                                            <><input type="password" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} placeholder="sk-ant-..." style={{ ...inputStyle, flex: 1 }} />
                                                <button onClick={() => saveApiKey("anthropic", anthropicKey)} style={secondaryBtnStyle}>💾</button></>
                                        )}
                                        {writingProvider === "openai" && (
                                            <><input type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} placeholder="sk-..." style={{ ...inputStyle, flex: 1 }} />
                                                <button onClick={() => saveApiKey("openai", openaiKey)} style={secondaryBtnStyle}>💾</button></>
                                        )}
                                        {writingProvider === "replicate" && (
                                            <><input type="password" value={replicateKey} onChange={e => setReplicateKey(e.target.value)} placeholder="r8_..." style={{ ...inputStyle, flex: 1 }} />
                                                <button onClick={() => saveApiKey("replicate", replicateKey)} style={secondaryBtnStyle}>💾</button></>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr style={{ border: "none", borderTop: "1px solid #334155", margin: "16px 0" }} />

                        {/* ── Image Provider ── */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ ...labelStyle, fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>🖼️ Image Provider</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                                {IMAGE_PROVIDER_OPTIONS.map(p => (
                                    <label key={p.value} style={{
                                        display: "flex", alignItems: "center", gap: 6,
                                        background: imageProvider === p.value ? "#1e3a5f" : "#1e2a3a",
                                        border: `1px solid ${imageProvider === p.value ? "#f0c040" : "#334155"}`,
                                        borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: "#e2e8f0",
                                    }}>
                                        <input type="radio" name="imageProvider" value={p.value}
                                            checked={imageProvider === p.value}
                                            onChange={() => { setImageProvider(p.value); setImageModel(DEFAULT_IMAGE_MODELS[p.value]); }}
                                            style={{ accentColor: "#f0c040" }} />
                                        {p.label}
                                    </label>
                                ))}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Image Model</label>
                                    <select value={imageModel} onChange={e => setImageModel(e.target.value)} style={selectStyle}>
                                        {IMAGE_MODELS_BY_PROVIDER[imageProvider].map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    {/* Show image key field — shared if same provider as writing */}
                                    {imageProvider === "google-imagen" && writingProvider !== "google" && (
                                        <>
                                            <label style={labelStyle}>Gemini API Key <span style={{ color: "#64748b", fontSize: 11 }}>(for Imagen)</span></label>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AI..." style={{ ...inputStyle, flex: 1 }} />
                                                <button onClick={() => saveApiKey("gemini", geminiKey)} style={secondaryBtnStyle}>💾</button>
                                            </div>
                                        </>
                                    )}
                                    {imageProvider === "google-imagen" && writingProvider === "google" && (
                                        <p style={{ color: "#64748b", fontSize: 12, margin: "8px 0 0 0" }}>✅ Using same Gemini key as writing</p>
                                    )}
                                    {imageProvider === "replicate" && writingProvider !== "replicate" && (
                                        <>
                                            <label style={labelStyle}>Replicate API Key</label>
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <input type="password" value={replicateKey} onChange={e => setReplicateKey(e.target.value)} placeholder="r8_..." style={{ ...inputStyle, flex: 1 }} />
                                                <button onClick={() => saveApiKey("replicate", replicateKey)} style={secondaryBtnStyle}>💾</button>
                                            </div>
                                        </>
                                    )}
                                    {imageProvider === "replicate" && writingProvider === "replicate" && (
                                        <p style={{ color: "#64748b", fontSize: 12, margin: "8px 0 0 0" }}>✅ Using same Replicate key as writing</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <hr style={{ border: "none", borderTop: "1px solid #334155", margin: "16px 0" }} />

                        {/* ── ImgBB ── */}
                        <div>
                            <label style={labelStyle}>ImgBB API Key <span style={{ color: "#64748b", fontSize: 11 }}>(permanent image hosting)</span></label>
                            <div style={{ display: "flex", gap: 8 }}>
                                <input type="password" value={imgbbKey} onChange={e => setImgbbKey(e.target.value)} placeholder="ImgBB key..." style={{ ...inputStyle, flex: 1 }} />
                                <button onClick={() => saveApiKey("imgbb", imgbbKey)} style={secondaryBtnStyle}>💾</button>
                            </div>
                        </div>
                    </div>

                    {/* Blog Settings */}
                    <div style={cardStyle}>
                        <h3 style={{ color: "#f0c040", fontSize: 16, fontWeight: 700, marginBottom: 12, marginTop: 0 }}>📝 Blog Settings</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                            <div style={{ gridColumn: "span 2" }}>
                                <label style={labelStyle}>Blog Niche</label>
                                <input type="text" value={settings.niche} onChange={e => updateSettings({ niche: e.target.value })} placeholder='e.g. "home decor", "personal finance"' style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Tone</label>
                                <select value={settings.tone} onChange={e => updateSettings({ tone: e.target.value as Tone })} style={selectStyle}>
                                    {TONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Article Length</label>
                                <select value={settings.articleLength} onChange={e => updateSettings({ articleLength: e.target.value as ArticleLength })} style={selectStyle}>
                                    {ARTICLE_LENGTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} ({o.words})</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>H2 Sections</label>
                                <select value={settings.h2Count} onChange={e => updateSettings({ h2Count: Number(e.target.value) as H2Count })} style={selectStyle}>
                                    {H2_COUNT_OPTIONS.map(n => <option key={n} value={n}>{n} sections</option>)}
                                </select>
                            </div>
                            <div style={{ gridColumn: "span 3" }}>
                                <label style={labelStyle}>Affiliate Links (one per line: ProductName | URL)</label>
                                <textarea rows={4} value={affiliatesText} onChange={e => { setAffiliatesText(e.target.value); saveLS("affiliatesText", e.target.value); }} placeholder={'Best Standing Desk | https://amazon.com/dp/...\nErgonomic Chair | https://amazon.com/dp/...'} style={{ ...inputStyle, resize: "vertical" }} />
                            </div>
                        </div>
                    </div>

                    {/* WordPress */}
                    <div style={cardStyle}>
                        <h3 style={{ color: "#f0c040", fontSize: 16, fontWeight: 700, marginBottom: 12, marginTop: 0 }}>🌐 WordPress Integration</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                            <div>
                                <label style={labelStyle}>Website URL</label>
                                <input type="text" value={wpUrl} onChange={e => setWpUrl(e.target.value)} placeholder="https://mysite.com" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>WP Username</label>
                                <input type="text" value={wpUser} onChange={e => setWpUser(e.target.value)} placeholder="admin" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>App Password</label>
                                <input type="password" value={wpPassword} onChange={e => setWpPassword(e.target.value)} placeholder="abcd efgh ..." style={inputStyle} />
                            </div>
                            <button onClick={saveWpCreds} style={secondaryBtnStyle}>💾 Save</button>
                        </div>
                    </div>

                    {/* Keyword Input */}
                    <div style={cardStyle}>
                        <h3 style={{ color: "#f0c040", fontSize: 16, fontWeight: 700, marginBottom: 12, marginTop: 0 }}>🔍 Keywords</h3>

                        {/* Toggle */}
                        <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#0f1623", borderRadius: 8, overflow: "hidden", border: "1px solid #334155" }}>
                            <button
                                onClick={() => setKeywordMode("single")}
                                style={{
                                    flex: 1, background: keywordMode === "single" ? "#1e2a3a" : "transparent",
                                    color: keywordMode === "single" ? "#f0c040" : "#94a3b8",
                                    border: "none", padding: "10px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14,
                                }}
                            >
                                Single Keyword
                            </button>
                            <button
                                onClick={() => setKeywordMode("file")}
                                style={{
                                    flex: 1, background: keywordMode === "file" ? "#1e2a3a" : "transparent",
                                    color: keywordMode === "file" ? "#f0c040" : "#94a3b8",
                                    border: "none", padding: "10px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14,
                                }}
                            >
                                Upload Keyword File
                            </button>
                        </div>

                        {keywordMode === "single" ? (
                            <div>
                                <label style={labelStyle}>Target Keyword</label>
                                <input type="text" value={singleKeyword} onChange={e => setSingleKeyword(e.target.value)} placeholder="e.g. small kitchen ideas" style={inputStyle} />
                            </div>
                        ) : (
                            <div>
                                {/* File Upload */}
                                <div style={{
                                    border: "2px dashed #334155", borderRadius: 12, padding: 24, textAlign: "center",
                                    marginBottom: 16, cursor: "pointer",
                                }}>
                                    <input
                                        type="file"
                                        accept=".txt,.csv,.xlsx"
                                        onChange={handleFileUpload}
                                        style={{ display: "none" }}
                                        id="keyword-file-upload"
                                    />
                                    <label htmlFor="keyword-file-upload" style={{ cursor: "pointer", color: "#94a3b8" }}>
                                        <p style={{ fontSize: 16, marginBottom: 4 }}>📂 Click to upload keyword file</p>
                                        <p style={{ fontSize: 13, color: "#64748b" }}>Accepted: .txt, .csv, .xlsx</p>
                                    </label>
                                </div>

                                {/* Keyword List */}
                                {parsedKeywords.length > 0 && (
                                    <div>
                                        <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                                            <span style={{ color: "#10b981", fontSize: 14, fontWeight: 600 }}>
                                                ✅ Found {parsedKeywords.length} keywords
                                            </span>
                                            <button onClick={() => toggleAll(true)} style={{ ...secondaryBtnStyle, padding: "4px 10px", fontSize: 12 }}>
                                                Select All
                                            </button>
                                            <button onClick={() => toggleAll(false)} style={{ ...secondaryBtnStyle, padding: "4px 10px", fontSize: 12 }}>
                                                Deselect All
                                            </button>
                                        </div>
                                        <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #334155", borderRadius: 8 }}>
                                            {parsedKeywords.map((kw, i) => (
                                                <div key={i} style={{
                                                    display: "flex", alignItems: "center", gap: 10, padding: "6px 12px",
                                                    borderBottom: "1px solid #1e2a3a",
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={kw.checked}
                                                        onChange={() => setParsedKeywords(prev => {
                                                            const copy = [...prev];
                                                            copy[i] = { ...copy[i], checked: !copy[i].checked };
                                                            return copy;
                                                        })}
                                                    />
                                                    <span style={{ flex: 1, color: "#e2e8f0", fontSize: 14 }}>{kw.text}</span>
                                                    <button onClick={() => removeKeyword(i)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>✗</button>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Generate Titles Button */}
                                        <div style={{ marginTop: 16 }}>
                                            <button onClick={handleGenerateTitles} disabled={titleGenerating} style={{ ...goldBtnStyle, opacity: titleGenerating ? 0.6 : 1 }}>
                                                {titleGenerating ? "✨ Generating titles..." : "📝 Generate Article Titles"}
                                            </button>
                                        </div>

                                        {/* Titles Table */}
                                        {titlesGenerated && (
                                            <div style={{ marginTop: 16 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                                    <h4 style={{ color: "#e2e8f0", margin: 0 }}>Generated Titles</h4>
                                                    <button onClick={handleGenerateTitles} style={{ ...secondaryBtnStyle, fontSize: 12 }}>♻️ Regenerate All</button>
                                                </div>
                                                <div style={{ border: "1px solid #334155", borderRadius: 8, overflow: "hidden" }}>
                                                    {parsedKeywords.filter(k => k.checked && k.generatedTitle).map((kw, i) => {
                                                        const realIdx = parsedKeywords.indexOf(kw);
                                                        return (
                                                            <div key={i} style={{
                                                                display: "grid", gridTemplateColumns: "200px 1fr auto",
                                                                gap: 12, padding: "8px 12px", borderBottom: "1px solid #1e2a3a",
                                                                alignItems: "center",
                                                            }}>
                                                                <span style={{ color: "#94a3b8", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kw.text}</span>
                                                                <input
                                                                    type="text"
                                                                    value={kw.generatedTitle || ""}
                                                                    onChange={e => {
                                                                        setParsedKeywords(prev => {
                                                                            const copy = [...prev];
                                                                            copy[realIdx] = { ...copy[realIdx], generatedTitle: e.target.value };
                                                                            return copy;
                                                                        });
                                                                    }}
                                                                    style={{ ...inputStyle, padding: "4px 8px" }}
                                                                />
                                                                <div style={{ display: "flex", gap: 4 }}>
                                                                    <button onClick={() => regenerateTitle(realIdx)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 16 }}>♻️</button>
                                                                    <button onClick={() => removeKeyword(realIdx)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 16 }}>🗑</button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Featured Image Settings (Collapsible) */}
                    <div style={cardStyle}>
                        <button
                            onClick={() => setImageSettingsOpen(!imageSettingsOpen)}
                            style={{
                                background: "transparent", border: "none", color: "#f0c040",
                                fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%",
                                textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
                            }}
                        >
                            <span>🖼️ Featured Image Settings</span>
                            <span style={{ color: "#94a3b8" }}>{imageSettingsOpen ? "▼" : "▶"}</span>
                        </button>

                        {imageSettingsOpen && (
                            <div style={{ marginTop: 16 }}>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={labelStyle}>AI Image Prompt Instructions</label>
                                    <textarea
                                        rows={6}
                                        value={settings.featuredImage.promptTemplate}
                                        onChange={e => updateFeaturedImage({ promptTemplate: e.target.value })}
                                        style={{ ...inputStyle, resize: "vertical" }}
                                    />
                                    <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                                        💡 Use {"{" + "title" + "}"} for article title and {"{" + "content" + "}"} for article summary
                                    </p>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <div>
                                        <label style={labelStyle}>Image Style</label>
                                        <select value={settings.featuredImage.style} onChange={e => updateFeaturedImage({ style: e.target.value as ImageStyle })} style={selectStyle}>
                                            {IMAGE_STYLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Color Mood (optional)</label>
                                        <input type="text" value={settings.featuredImage.colorMood} onChange={e => updateFeaturedImage({ colorMood: e.target.value })} placeholder="e.g. warm neutrals, sage green and white" style={inputStyle} />
                                    </div>
                                </div>

                                <div style={{ marginTop: 12 }}>
                                    <label style={labelStyle}>Image Dimensions</label>
                                    <div style={{ display: "flex", gap: 12 }}>
                                        {IMAGE_DIMENSION_OPTIONS.map(o => (
                                            <label key={o.value} style={{
                                                display: "flex", alignItems: "center", gap: 6,
                                                color: settings.featuredImage.dimensions === o.value ? "#f0c040" : "#94a3b8",
                                                cursor: "pointer", fontSize: 14,
                                            }}>
                                                <input
                                                    type="radio"
                                                    name="img-dim"
                                                    value={o.value}
                                                    checked={settings.featuredImage.dimensions === o.value}
                                                    onChange={e => updateFeaturedImage({ dimensions: e.target.value as ImageDimensions })}
                                                />
                                                {o.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Generate Button */}
                    <div style={{ textAlign: "center", marginTop: 20 }}>
                        <button
                            onClick={generateAllArticles}
                            disabled={generating}
                            style={{
                                ...goldBtnStyle,
                                fontSize: 18,
                                padding: "14px 40px",
                                opacity: generating ? 0.6 : 1,
                            }}
                        >
                            {generating ? "⏳ Generating..." : "🚀 Start Generating Articles"}
                        </button>
                    </div>
                </div>
            )}

            {/* ━━━━━━━━ CONTENT STUDIO TAB ━━━━━━━━ */}
            {activeTab === "studio" && (
                <div>
                    {/* Progress */}
                    {generating && (
                        <div style={cardStyle}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                                    ⚡ {generationProgress.current} / {generationProgress.total} articles
                                </span>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button onClick={handlePause} style={secondaryBtnStyle}>
                                        {paused ? "▶️ Resume" : "⏸️ Pause"}
                                    </button>
                                    <button onClick={handleStop} style={{ ...secondaryBtnStyle, color: "#ef4444" }}>
                                        ⏹️ Stop
                                    </button>
                                </div>
                            </div>
                            <div style={{ background: "#0f1623", borderRadius: 8, height: 8, overflow: "hidden" }}>
                                <div style={{
                                    width: `${(generationProgress.current / Math.max(generationProgress.total, 1)) * 100}%`,
                                    height: "100%",
                                    background: "linear-gradient(90deg, #f0c040, #f97316)",
                                    borderRadius: 8,
                                    transition: "width 0.3s",
                                }} />
                            </div>
                        </div>
                    )}

                    {/* Bulk Actions */}
                    {articles.length > 0 && !generating && (
                        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                            {wpUrl && (
                                <button onClick={publishAllToWP} style={goldBtnStyle}>
                                    📤 Publish All to WordPress
                                </button>
                            )}
                            <button onClick={exportTitlesCSV} style={secondaryBtnStyle}>⬇️ Export Titles as CSV</button>
                            <button onClick={exportArticlesZip} style={secondaryBtnStyle}>⬇️ Export All as ZIP</button>
                        </div>
                    )}

                    {/* Articles List */}
                    {articles.length === 0 ? (
                        <div style={{ ...cardStyle, textAlign: "center", padding: 40 }}>
                            <p style={{ color: "#94a3b8", fontSize: 16 }}>📝 No articles yet.</p>
                            <p style={{ color: "#64748b", fontSize: 14, marginTop: 8 }}>Go to Setup tab to configure and generate articles.</p>
                        </div>
                    ) : (
                        articles.map((article, i) => (
                            <BlogMonetizerEditor
                                key={i}
                                article={article}
                                index={i}
                                wpCredentials={{ url: wpUrl, user: wpUser, password: wpPassword }}
                                geminiKey={geminiKey}
                                replicateKey={replicateKey}
                                imgbbKey={imgbbKey}
                                imageSettings={settings.featuredImage}
                                geminiModel={writingModel}
                                imageProvider={imageProvider}
                                imageModel={imageModel}
                                onUpdate={updateArticle}
                                onSwitchToSetup={() => setActiveTab("setup")}
                            />
                        ))
                    )}
                </div>
            )}

            {/* ━━━━━━━━ PINTEREST PINS TAB ━━━━━━━━ */}
            {activeTab === "pins" && (
                <BlogMonetizerPinExport articles={articles} wpBaseUrl={wpUrl} />
            )}
        </div>
    );
}
