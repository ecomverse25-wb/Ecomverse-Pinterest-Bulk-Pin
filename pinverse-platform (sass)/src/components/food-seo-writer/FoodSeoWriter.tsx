// v1.0
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
    FoodSeoSettings, ParsedKeyword, FeaturedImageSettings,
    AffiliateLink, WritingProvider, ImageProvider, ImageStyle, ImageDimensions,
    FoodTone, FoodH2Count, TitleFormula, BatchQueueItem, KeywordAnalysis,
} from "./types";
import { RANK_MATH_WEIGHTS } from "./constants";
import { DEFAULT_WRITING_MODELS, DEFAULT_IMAGE_MODELS } from "./types";
import { DEFAULT_FOOD_SEO_SETTINGS } from "./constants";
import {
    generateFoodBulkTitlesAction, generateFoodSingleTitleAction,
    analyzeKeywordAction,
} from "@/app/actions/food-seo-writer/generate";
import { testImageProviderAction } from "@/app/actions/blog-monetizer/generate-image";
import { getUserSettingsAction, updateUserSettingsAction } from "@/app/actions/user-settings-actions";
import { useArticleGeneration } from "./hooks/useArticleGeneration";
import { usePinGeneration } from "./hooks/usePinGeneration";
import SetupTab from "./tabs/SetupTab";
import ContentStudioTab from "./tabs/ContentStudioTab";
import PinterestPinsTab from "./tabs/PinterestPinsTab";

// ─── localStorage helpers ───
function loadLS<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
        const v = localStorage.getItem(`fsw_${key}`);
        return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
}
function saveLS(key: string, value: unknown) {
    if (typeof window === "undefined") return;
    localStorage.setItem(`fsw_${key}`, JSON.stringify(value));
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
export default function FoodSeoWriter() {
    // Tab
    const [activeTab, setActiveTab] = useState<"setup" | "studio" | "pins">("setup");

    // Settings
    const [settings, setSettings] = useState<FoodSeoSettings>(() => loadLS("settings", DEFAULT_FOOD_SEO_SETTINGS));
    const [geminiKey, setGeminiKey] = useState("");
    const [replicateKey, setReplicateKey] = useState("");
    const [anthropicKey, setAnthropicKey] = useState("");
    const [openaiKey, setOpenaiKey] = useState("");
    const [imgbbKey, setImgbbKey] = useState("");

    // Keyword Analysis (AI Strategy)
    const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordAnalysis | null>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const analysisDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Provider & Model
    const [writingProvider, setWritingProvider] = useState<WritingProvider>("google");
    const [writingModel, setWritingModel] = useState("gemini-2.5-flash");
    const [imageProvider, setImageProvider] = useState<ImageProvider>("google-imagen");
    const [imageModel, setImageModel] = useState("gemini-2.5-flash-image");

    // WP
    const [wpUrl, setWpUrl] = useState(() => loadLS("wp_url", ""));
    const [wpUser, setWpUser] = useState(() => loadLS("wp_user", ""));
    const [wpPassword, setWpPassword] = useState(() => loadLS("wp_password", ""));

    // Keywords
    const [keywordMode, setKeywordMode] = useState<"single" | "file">("single");
    const [singleKeyword, setSingleKeyword] = useState("");
    const [parsedKeywords, setParsedKeywords] = useState<ParsedKeyword[]>([]);
    const [titlesGenerated, setTitlesGenerated] = useState(false);

    // Status
    const [statusMessage, setStatusMessage] = useState("");
    const [titleGenerating, setTitleGenerating] = useState(false);

    // Batch Queue
    const [batchQueue, setBatchQueue] = useState<BatchQueueItem[]>([]);

    // Image settings
    const [imageSettingsOpen, setImageSettingsOpen] = useState(false);
    const [testImageResult, setTestImageResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; url?: string; error?: string }>({ status: 'idle' });

    // Affiliates
    const [affiliatesText, setAffiliatesText] = useState(() => {
        const links = loadLS<AffiliateLink[]>("affiliateLinks", []);
        return links.map(a => `${a.productName} | ${a.url}`).join("\n");
    });

    // ─── Session Cache ───
    const SESSION_VERSION = "v1";
    useEffect(() => {
        const savedVersion = loadLS<string>("session_version", "");
        if (savedVersion !== SESSION_VERSION) {
            localStorage.removeItem("fsw_articles");
            saveLS("session_version", SESSION_VERSION);
        }
    }, []);

    // ─── Load API Keys from DB ───
    useEffect(() => {
        (async () => {
            const { settings: s } = await getUserSettingsAction();
            if (s) {
                if (s.gemini_api_key) setGeminiKey(s.gemini_api_key);
                if (s.replicate_api_key) setReplicateKey(s.replicate_api_key);
                if (s.anthropic_api_key) setAnthropicKey(s.anthropic_api_key);
                if (s.openai_api_key) setOpenaiKey(s.openai_api_key);
                if (s.imgbb_api_key) setImgbbKey(s.imgbb_api_key);
            }
        })();
    }, []);

    // ─── Settings persistence (debounced localStorage write) ───
    const settingsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const debouncedSaveSettings = useCallback((nextSettings: FoodSeoSettings) => {
        if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current);
        settingsSaveTimer.current = setTimeout(() => saveLS("settings", nextSettings), 400);
    }, []);

    const updateSettings = useCallback((patch: Partial<FoodSeoSettings>) => {
        setSettings(prev => {
            const next = { ...prev, ...patch };
            debouncedSaveSettings(next);
            return next;
        });
    }, [debouncedSaveSettings]);

    const updateFeaturedImage = useCallback((patch: Partial<FeaturedImageSettings>) => {
        setSettings(prev => {
            const next = { ...prev, featuredImage: { ...prev.featuredImage, ...patch } };
            debouncedSaveSettings(next);
            return next;
        });
    }, [debouncedSaveSettings]);

    // ─── Parse affiliates ───
    useEffect(() => {
        const links: AffiliateLink[] = affiliatesText
            .split("\n").map(l => l.trim()).filter(Boolean)
            .map(l => {
                const parts = l.split("|").map(p => p.trim());
                return { productName: parts[0] || "", url: parts[1] || "" };
            })
            .filter(a => a.productName && a.url);
        updateSettings({ affiliateLinks: links });
    }, [affiliatesText, updateSettings]);

    // ─── Hooks ───
    const articleGen = useArticleGeneration({
        settings, geminiKey, replicateKey, imgbbKey, anthropicKey, openaiKey,
        writingProvider, writingModel, imageProvider, imageModel,
        wpUrl, wpUser, wpPassword, setStatusMessage, setActiveTab,
    });

    const pinGen = usePinGeneration({
        writingModel, writingProvider,
        niche: settings.niche, wpUrl,
    });

    // ─── Auto-populate pin cards when articles exist ───
    useEffect(() => {
        const readyArticles = articleGen.articles.filter(a => a.status === "ready" || a.status === "published");
        if (readyArticles.length > 0 && pinGen.pinSets.length === 0 && !pinGen.autoPopulatedRef.current) {
            pinGen.autoPopulatePins(articleGen.articles);
        }
    }, [articleGen.articles, pinGen]);

    // ─── Memoized RankMath scoring per article ───
    const articleScores = useMemo(() => {
        if (articleGen.articles.length === 0) return new Map<string, { wordCount: number; score: number }>();
        const scores = new Map<string, { wordCount: number; score: number }>();
        for (const article of articleGen.articles) {
            if (article.status !== 'ready' && article.status !== 'published') continue;
            const wc = article.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
            let score = 0;
            const contentLower = article.content.toLowerCase();
            const kwLower = article.keyword.toLowerCase();
            const h1Match = article.content.match(/<h1[^>]*>(.*?)<\/h1>/i);
            if (h1Match && h1Match[1].toLowerCase().includes(kwLower)) score += RANK_MATH_WEIGHTS['Focus keyword in H1 title'];
            const textContent = article.content.replace(/<[^>]*>/g, ' ');
            if (textContent.split(/\s+/).slice(0, 100).join(' ').toLowerCase().includes(kwLower)) score += RANK_MATH_WEIGHTS['Focus keyword in first 100 words'];
            if (article.metaDescription.toLowerCase().includes(kwLower)) score += RANK_MATH_WEIGHTS['Focus keyword in meta description'];
            if ((article.content.match(/alt="([^"]*)"/gi) || []).some(a => a.toLowerCase().includes(kwLower))) score += RANK_MATH_WEIGHTS['Image alt text contains keyword'];
            if ((article.content.match(/<!-- INTERNAL LINK:/gi) || []).length > 0) score += RANK_MATH_WEIGHTS['Internal links present'];
            const authorityDomains = ['dietaryguidelines.gov', 'harvard', 'mayoclinic', 'cdc.gov', 'nih.gov', 'heart.org', 'usda', 'who.int'];
            if (authorityDomains.some(d => contentLower.includes(d)) || (article.content.match(/<a[^>]+href="https?:\/\/[^"]*"[^>]*>/gi) || []).some(l => !l.includes('rel="nofollow"'))) score += RANK_MATH_WEIGHTS['External DoFollow link present'];
            if (/frequently asked questions/i.test(article.content)) score += RANK_MATH_WEIGHTS['FAQ section present'];
            if (wc >= 1200) score += RANK_MATH_WEIGHTS['Word count ≥ 1200'];
            if (article.schemaMarkup && article.schemaMarkup.length > 50) score += RANK_MATH_WEIGHTS['Schema markup generated'];
            const words = textContent.toLowerCase().split(/\s+/).filter(Boolean);
            const kwWords = kwLower.split(/\s+/);
            let kwCount = 0;
            for (let ii = 0; ii <= words.length - kwWords.length; ii++) { if (words.slice(ii, ii + kwWords.length).join(' ') === kwLower) kwCount++; }
            const density = words.length > 0 ? (kwCount * kwWords.length / words.length) * 100 : 0;
            if (density >= 0.5 && density <= 1.5) score += RANK_MATH_WEIGHTS['Keyword density 0.5%-1.5%'];
            if ((article.content.match(/<h2[^>]*>/gi) || []).length >= settings.h2Count) score += RANK_MATH_WEIGHTS['H2 count matches requested'];
            if (['save this', 'meal planning', 'bookmark', 'pin this', 'save for later'].some(p => contentLower.includes(p))) score += RANK_MATH_WEIGHTS['Concluding paragraph present'];
            scores.set(article.keyword.toLowerCase(), { wordCount: wc, score });
        }
        return scores;
    }, [articleGen.articles, settings.h2Count]);

    // ─── Sync batch queue with article statuses (uses memoized scores) ───
    useEffect(() => {
        if (batchQueue.length === 0 || articleGen.articles.length === 0) return;

        setBatchQueue(prev => prev.map(queueItem => {
            const article = articleGen.articles.find(
                a => a.keyword.toLowerCase() === queueItem.keyword.toLowerCase()
            );
            if (!article) return queueItem;

            if (article.status === 'generating' && queueItem.status !== 'generating') {
                return { ...queueItem, status: 'generating' as const };
            }
            if (article.status === 'ready' || article.status === 'published') {
                if (queueItem.status === 'ready') return queueItem;
                const cached = articleScores.get(article.keyword.toLowerCase());
                return { ...queueItem, status: 'ready' as const, wordCount: cached?.wordCount ?? 0, estimatedRankMathScore: cached?.score ?? 0, articleId: article.keyword };
            }
            if (article.status === 'error' && queueItem.status !== 'error') {
                return { ...queueItem, status: 'error' as const, errorMessage: article.errorMessage || 'Generation failed' };
            }
            return queueItem;
        }));
    }, [articleGen.articles, batchQueue.length, articleScores]);


    // ─── WP Save ───
    const saveWpCreds = useCallback(() => {
        saveLS("wp_url", wpUrl);
        saveLS("wp_user", wpUser);
        saveLS("wp_password", wpPassword);
        setStatusMessage("✅ WordPress credentials saved.");
        setTimeout(() => setStatusMessage(""), 3000);
    }, [wpUrl, wpUser, wpPassword]);

    // ─── API Key Save ───
    const saveApiKey = useCallback(async (type: "gemini" | "replicate" | "imgbb" | "anthropic" | "openai", value: string) => {
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
    }, []);

    // ─── File Upload ───
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        let keywords: string[] = [];
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "txt") keywords = await parseTxtFile(await file.text());
        else if (ext === "csv") keywords = await parseCsvFile(await file.text());
        else if (ext === "xlsx") keywords = await parseXlsxFile(await file.arrayBuffer());
        else { alert("Unsupported file type."); return; }
        setParsedKeywords(keywords.map(k => ({ text: k, checked: true })));
        setTitlesGenerated(false);
        setStatusMessage(`✅ Found ${keywords.length} keywords`);
    };

    // ─── Keyword actions ───
    const toggleAll = (checked: boolean) => setParsedKeywords(prev => prev.map(k => ({ ...k, checked })));
    const removeKeyword = (idx: number) => setParsedKeywords(prev => prev.filter((_, i) => i !== idx));


    // ─── Keyword AI Analysis ───
    const handleAnalyzeKeyword = useCallback((keyword: string) => {
        if (analysisDebounceRef.current) clearTimeout(analysisDebounceRef.current);
        if (!keyword.trim() || keyword.trim().length < 3) {
            setKeywordAnalysis(null);
            return;
        }
        setAnalysisLoading(true);
        analysisDebounceRef.current = setTimeout(async () => {
            try {
                const result = await analyzeKeywordAction(
                    keyword, geminiKey, writingProvider, writingModel,
                    anthropicKey, openaiKey, replicateKey
                );
                setKeywordAnalysis(result);
                // Auto-apply AI-detected settings (unless user has manually overridden)
                updateSettings({
                    tone: result.tone,
                    h2Count: result.h2Count,
                    schemaType: result.schemaType,
                    authoritySource: result.authoritySource,
                    contentStrategy: result.contentStrategy,
                    titleFormula: result.titleFormula,
                });
            } catch {
                // Silently fail — keep previous analysis or null
            } finally {
                setAnalysisLoading(false);
            }
        }, 600);
    }, [geminiKey, writingProvider, writingModel, anthropicKey, openaiKey, replicateKey, updateSettings]);

    // ─── Generate Titles ───
    const handleGenerateTitles = useCallback(async () => {
        const checked = parsedKeywords.filter(k => k.checked).map(k => k.text);
        if (checked.length === 0) { alert("No keywords selected."); return; }

        setTitleGenerating(true);
        setStatusMessage("✨ Generating titles...");

        const result = await generateFoodBulkTitlesAction(
            checked, settings.tone, settings.niche, settings.titleFormula, settings.h2Count,
            writingModel, writingProvider,
            geminiKey, anthropicKey, openaiKey, replicateKey
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
    }, [parsedKeywords, settings.tone, settings.niche, settings.titleFormula, settings.h2Count, writingModel, writingProvider, geminiKey, anthropicKey, openaiKey, replicateKey]);

    const regenerateTitle = useCallback(async (idx: number) => {
        const kw = parsedKeywords[idx];
        if (!kw) return;
        const result = await generateFoodSingleTitleAction(
            kw.text, settings.tone, settings.niche, settings.titleFormula, settings.h2Count,
            writingModel, writingProvider,
            geminiKey, anthropicKey, openaiKey, replicateKey
        );
        if (result.success && result.title) {
            setParsedKeywords(prev => {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], generatedTitle: result.title };
                return copy;
            });
        }
    }, [parsedKeywords, settings.tone, settings.niche, settings.titleFormula, settings.h2Count, writingModel, writingProvider, geminiKey, anthropicKey, openaiKey, replicateKey]);

    // ─── Get Keywords + Titles ───
    const getKeywordsAndTitles = useCallback((): { keyword: string; title: string }[] => {
        if (keywordMode === "single") {
            return singleKeyword.trim() ? [{ keyword: singleKeyword.trim(), title: singleKeyword.trim() }] : [];
        }
        return parsedKeywords
            .filter(k => k.checked)
            .map(k => ({ keyword: k.text, title: k.generatedTitle || k.text }));
    }, [keywordMode, singleKeyword, parsedKeywords]);

    // ─── Initialize batch queue and start generation ───
    const handleStartGeneration = useCallback(() => {
        const items = getKeywordsAndTitles();
        if (items.length === 0) return;
        const queue: BatchQueueItem[] = items.map((item, index) => ({
            id: `batch-${index}-${Date.now()}`,
            keyword: item.keyword,
            status: 'queued' as const,
        }));
        setBatchQueue(queue);
        articleGen.generateAllArticles(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [articleGen]);

    // ─── Test Image API ───
    const handleTestImageApi = useCallback(async () => {
        setTestImageResult({ status: 'testing' });
        const result = await testImageProviderAction(imageProvider, imageModel, geminiKey, replicateKey);
        if (result.success && result.imageUrl) {
            setTestImageResult({ status: 'success', url: result.imageUrl });
        } else {
            setTestImageResult({ status: 'error', error: result.error || "Unknown error" });
        }
    }, [imageProvider, imageModel, geminiKey, replicateKey]);

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
                            color: activeTab === tab.key ? "#10b981" : "#94a3b8",
                            fontWeight: 600, cursor: "pointer", fontSize: 15, transition: "all 0.2s",
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

            {/* ━━━ SETUP TAB ━━━ */}
            {activeTab === "setup" && (
                <SetupTab
                    settings={settings}
                    updateSettings={updateSettings}
                    updateFeaturedImage={updateFeaturedImage}
                    geminiKey={geminiKey} setGeminiKey={setGeminiKey}
                    replicateKey={replicateKey} setReplicateKey={setReplicateKey}
                    anthropicKey={anthropicKey} setAnthropicKey={setAnthropicKey}
                    openaiKey={openaiKey} setOpenaiKey={setOpenaiKey}
                    imgbbKey={imgbbKey} setImgbbKey={setImgbbKey}
                    writingProvider={writingProvider} setWritingProvider={setWritingProvider}
                    writingModel={writingModel} setWritingModel={setWritingModel}
                    imageProvider={imageProvider} setImageProvider={setImageProvider}
                    imageModel={imageModel} setImageModel={setImageModel}
                    wpUrl={wpUrl} setWpUrl={setWpUrl}
                    wpUser={wpUser} setWpUser={setWpUser}
                    wpPassword={wpPassword} setWpPassword={setWpPassword}
                    keywordMode={keywordMode} setKeywordMode={setKeywordMode}
                    singleKeyword={singleKeyword} setSingleKeyword={setSingleKeyword}
                    parsedKeywords={parsedKeywords} setParsedKeywords={setParsedKeywords}
                    titlesGenerated={titlesGenerated}
                    affiliatesText={affiliatesText} setAffiliatesText={setAffiliatesText}
                    titleGenerating={titleGenerating}
                    generating={articleGen.generating}
                    imageSettingsOpen={imageSettingsOpen} setImageSettingsOpen={setImageSettingsOpen}
                    testImageResult={testImageResult}
                    keywordAnalysis={keywordAnalysis}
                    analysisLoading={analysisLoading}
                    onAnalyzeKeyword={handleAnalyzeKeyword}
                    onSaveApiKey={saveApiKey}
                    onSaveWpCreds={saveWpCreds}
                    onFileUpload={handleFileUpload}
                    onGenerateTitles={handleGenerateTitles}
                    onRegenerateTitle={regenerateTitle}
                    onRemoveKeyword={removeKeyword}
                    onToggleAll={toggleAll}
                    onTestImageApi={handleTestImageApi}
                    onGenerate={handleStartGeneration}
                    saveLS={saveLS}
                />
            )}

            {/* ━━━ CONTENT STUDIO TAB ━━━ */}
            {activeTab === "studio" && (
                <ContentStudioTab
                    articles={articleGen.articles}
                    generating={articleGen.generating}
                    generationProgress={articleGen.generationProgress}
                    paused={articleGen.paused}
                    wpUrl={wpUrl} wpUser={wpUser} wpPassword={wpPassword}
                    geminiKey={geminiKey} replicateKey={replicateKey}
                    imgbbKey={imgbbKey}
                    writingModel={writingModel}
                    imageProvider={imageProvider} imageModel={imageModel}
                    imageSettings={settings.featuredImage}
                    onUpdate={articleGen.updateArticle}
                    onPause={articleGen.handlePause}
                    onStop={articleGen.handleStop}
                    onPublishAll={articleGen.publishAllToWP}
                    onExportTitlesCSV={() => articleGen.exportTitlesCSV(getKeywordsAndTitles())}
                    onExportZip={articleGen.exportArticlesZip}
                    onSwitchToSetup={() => setActiveTab("setup")}
                    onSendToPins={(keyword, title, pinTitle, pinDescription) => {
                        pinGen.addArticlePinData(keyword, title, pinTitle, pinDescription);
                        setStatusMessage("📌 Pin data sent to Pinterest Pins tab!");
                        setTimeout(() => setStatusMessage(""), 3000);
                    }}
                    requestedH2Count={settings.h2Count}
                    batchQueue={batchQueue}
                />
            )}

            {/* ━━━ PINTEREST PINS TAB ━━━ */}
            {activeTab === "pins" && (
                <PinterestPinsTab
                    articles={articleGen.articles}
                    wpBaseUrl={wpUrl}
                    geminiKey={geminiKey}
                    geminiModel={writingModel}
                    targetKeyword={keywordMode === "single" ? singleKeyword : (parsedKeywords.find(k => k.checked)?.text || "")}
                    pinSets={pinGen.pinSets}
                    generatingPins={pinGen.generatingPins}
                    onGeneratePins={pinGen.generatePinsForArticles}
                    onAutoPopulate={() => pinGen.autoPopulatePins(articleGen.articles)}
                />
            )}
        </div>
    );
}
