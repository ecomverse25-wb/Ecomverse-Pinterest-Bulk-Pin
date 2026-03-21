"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { KeywordData, KeywordIntelligence } from "../utils/keywordIntelligence";
import { parseKeywordCSV, getKeywordIntelligence, formatSearchVolume } from "../utils/keywordIntelligence";
import type {
    FoodSeoSettings, WritingProvider, ImageProvider, ImageStyle, ImageDimensions,
    ParsedKeyword, FeaturedImageSettings, ContentStrategy, FoodTone, FoodH2Count,
    TitleFormula, SchemaType, AuthoritySource, FaqCount, KeywordAnalysis,
} from "../types";
import {
    WRITING_MODELS_BY_PROVIDER, IMAGE_MODELS_BY_PROVIDER,
    DEFAULT_WRITING_MODELS, DEFAULT_IMAGE_MODELS,
    IMAGE_STYLE_OPTIONS, IMAGE_DIMENSION_OPTIONS,
} from "../types";
import {
    CONTENT_STRATEGY_OPTIONS, FOOD_TONE_OPTIONS, FOOD_H2_OPTIONS,
    TITLE_FORMULA_OPTIONS, SCHEMA_TYPE_OPTIONS, AUTHORITY_SOURCE_OPTIONS,
    FAQ_COUNT_OPTIONS, STRATEGY_DEFAULTS, INTENT_LABELS,
} from "../constants";

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

// ─── Styles ───
const cardStyle: React.CSSProperties = { background: "#1a2035", borderRadius: 12, border: "1px solid #334155", padding: 20, marginBottom: 16 };
const inputStyle: React.CSSProperties = { width: "100%", background: "#0f1623", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", padding: "8px 12px", fontSize: 14 };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
const labelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 };
const goldBtnStyle: React.CSSProperties = { background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 };
const secondaryBtnStyle: React.CSSProperties = { background: "#1e2a3a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", padding: "8px 16px", cursor: "pointer", fontSize: 14 };

interface SetupTabProps {
    settings: FoodSeoSettings;
    updateSettings: (patch: Partial<FoodSeoSettings>) => void;
    updateFeaturedImage: (patch: Partial<FeaturedImageSettings>) => void;
    geminiKey: string; setGeminiKey: (v: string) => void;
    replicateKey: string; setReplicateKey: (v: string) => void;
    anthropicKey: string; setAnthropicKey: (v: string) => void;
    openaiKey: string; setOpenaiKey: (v: string) => void;
    imgbbKey: string; setImgbbKey: (v: string) => void;
    writingProvider: WritingProvider; setWritingProvider: (v: WritingProvider) => void;
    writingModel: string; setWritingModel: (v: string) => void;
    imageProvider: ImageProvider; setImageProvider: (v: ImageProvider) => void;
    imageModel: string; setImageModel: (v: string) => void;
    wpUrl: string; setWpUrl: (v: string) => void;
    wpUser: string; setWpUser: (v: string) => void;
    wpPassword: string; setWpPassword: (v: string) => void;
    keywordMode: "single" | "file"; setKeywordMode: (v: "single" | "file") => void;
    singleKeyword: string; setSingleKeyword: (v: string) => void;
    parsedKeywords: ParsedKeyword[]; setParsedKeywords: (v: React.SetStateAction<ParsedKeyword[]>) => void;
    titlesGenerated: boolean;
    affiliatesText: string; setAffiliatesText: (v: string) => void;
    titleGenerating: boolean;
    generating: boolean;
    imageSettingsOpen: boolean; setImageSettingsOpen: (v: boolean) => void;
    testImageResult: { status: 'idle' | 'testing' | 'success' | 'error'; url?: string; error?: string };
    keywordAnalysis: KeywordAnalysis | null;
    analysisLoading: boolean;
    onAnalyzeKeyword: (keyword: string) => void;
    onSaveApiKey: (type: "gemini" | "replicate" | "imgbb" | "anthropic" | "openai", value: string) => void;
    onSaveWpCreds: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onGenerateTitles: () => void;
    onRegenerateTitle: (idx: number) => void;
    onRemoveKeyword: (idx: number) => void;
    onToggleAll: (checked: boolean) => void;
    onTestImageApi: () => void;
    onGenerate: () => void;
    saveLS: (key: string, value: unknown) => void;
}

export default function SetupTab(props: SetupTabProps) {
    const {
        settings, updateSettings, updateFeaturedImage,
        geminiKey, setGeminiKey, replicateKey, setReplicateKey,
        anthropicKey, setAnthropicKey, openaiKey, setOpenaiKey,
        imgbbKey, setImgbbKey,
        writingProvider, setWritingProvider, writingModel, setWritingModel,
        imageProvider, setImageProvider, imageModel, setImageModel,
        wpUrl, setWpUrl, wpUser, setWpUser, wpPassword, setWpPassword,
        keywordMode, setKeywordMode, singleKeyword, setSingleKeyword,
        parsedKeywords, setParsedKeywords, titlesGenerated,
        affiliatesText, setAffiliatesText,
        titleGenerating, generating, imageSettingsOpen, setImageSettingsOpen,
        testImageResult,
        keywordAnalysis, analysisLoading, onAnalyzeKeyword,
        onSaveApiKey, onSaveWpCreds, onFileUpload,
        onGenerateTitles, onRegenerateTitle, onRemoveKeyword, onToggleAll,
        onTestImageApi, onGenerate, saveLS,
    } = props;

    // ─── API Key Visibility Logic ───
    const showGeminiKey = writingProvider === 'google' || imageProvider === 'google-imagen';
    const showReplicateKey = writingProvider === 'replicate' || imageProvider === 'replicate';
    const showAnthropicKey = writingProvider === 'claude';
    const showOpenaiKey = writingProvider === 'openai';

    // Is the key shared between writing + image provider?
    const geminiShared = writingProvider === 'google' && imageProvider === 'google-imagen';
    const replicateShared = writingProvider === 'replicate' && imageProvider === 'replicate';

    // Which keys are needed only for writing vs only for images?
    const geminiForImageOnly = writingProvider !== 'google' && imageProvider === 'google-imagen';
    const replicateForImageOnly = writingProvider !== 'replicate' && imageProvider === 'replicate';

    // Validation: which required keys are missing?
    const missingWritingKey =
        (writingProvider === 'google' && !geminiKey) ? 'Gemini' :
        (writingProvider === 'replicate' && !replicateKey) ? 'Replicate' :
        (writingProvider === 'claude' && !anthropicKey) ? 'Anthropic' :
        (writingProvider === 'openai' && !openaiKey) ? 'OpenAI' : null;

    const missingImageKey =
        (imageProvider === 'google-imagen' && !geminiKey) ? 'Gemini' :
        (imageProvider === 'replicate' && !replicateKey) ? 'Replicate' : null;

    // ─── Keyword Intelligence State ───
    const [csvData, setCsvData] = useState<KeywordData[]>([]);
    const [intelligence, setIntelligence] = useState<KeywordIntelligence | null>(null);
    const [intelExpanded, setIntelExpanded] = useState(true);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ─── Debounced intelligence lookup on keyword change ───
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (csvData.length === 0 || singleKeyword.trim().length <= 3) {
            setIntelligence(null);
            return;
        }

        debounceRef.current = setTimeout(() => {
            const result = getKeywordIntelligence(singleKeyword, csvData);
            setIntelligence(result);
        }, 400);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [singleKeyword, csvData]);

    // ─── CSV parsing side-effect on file upload ───
    const originalOnFileUpload = onFileUpload;
    const handleFileUploadWithIntel = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        // Run original upload handler
        originalOnFileUpload(e);

        // Also parse CSV for intelligence data
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result;
            if (typeof text === 'string') {
                const parsed = parseKeywordCSV(text);
                if (parsed.length > 0) {
                    setCsvData(parsed);
                }
            }
        };
        reader.readAsText(file);
    }, [originalOnFileUpload]);

    // ─── Select related keyword ───
    const selectRelatedKeyword = useCallback((label: string) => {
        setSingleKeyword(label);
        setKeywordMode('single');
        if (csvData.length > 0) {
            const result = getKeywordIntelligence(label, csvData);
            setIntelligence(result);
        }
    }, [csvData, setSingleKeyword, setKeywordMode]);

    // ─── Competition badge helper ───
    const getCompetitionBadgeStyle = (level: 'LOW' | 'MEDIUM' | 'HIGH'): React.CSSProperties => {
        const colors = {
            LOW: { bg: '#10b98120', border: '#10b98140', text: '#10b981' },
            MEDIUM: { bg: '#f59e0b20', border: '#f59e0b40', text: '#f59e0b' },
            HIGH: { bg: '#ef444420', border: '#ef444440', text: '#ef4444' },
        };
        const c = colors[level];
        return {
            background: c.bg, border: `1px solid ${c.border}`, color: c.text,
            borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
            display: 'inline-block',
        };
    };

    return (
        <div>
            {/* ── API Keys & Models ── */}
            <div style={cardStyle}>
                <h3 style={{ color: "#10b981", fontSize: 16, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>🔑 API Keys & Models</h3>

                {/* Writing Provider */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ ...labelStyle, fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>✍️ Writing Provider</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        {WRITING_PROVIDER_OPTIONS.map(p => (
                            <label key={p.value} style={{
                                display: "flex", alignItems: "center", gap: 6,
                                background: writingProvider === p.value ? "#064e3b" : "#1e2a3a",
                                border: `1px solid ${writingProvider === p.value ? "#10b981" : "#334155"}`,
                                borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: "#e2e8f0",
                            }}>
                                <input type="radio" name="writingProvider" value={p.value}
                                    checked={writingProvider === p.value}
                                    onChange={() => { setWritingProvider(p.value); setWritingModel(DEFAULT_WRITING_MODELS[p.value]); }}
                                    style={{ accentColor: "#10b981" }} />
                                {p.label}
                            </label>
                        ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Writing Model</label>
                            <select value={writingModel} onChange={e => setWritingModel(e.target.value)} style={selectStyle}>
                                {WRITING_MODELS_BY_PROVIDER[writingProvider].map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                {/* Writing provider API key */}
                {writingProvider === 'google' && !geminiForImageOnly && (
                    <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Gemini API Key {geminiShared && <span style={{ color: '#10b981', fontSize: 11 }}>(shared with Google Imagen images)</span>}</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="Gemini API key..." style={{ ...inputStyle, flex: 1 }} />
                            <button onClick={() => onSaveApiKey('gemini', geminiKey)} style={secondaryBtnStyle}>💾</button>
                        </div>
                    </div>
                )}
                {writingProvider === 'replicate' && !replicateForImageOnly && (
                    <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Replicate API Key {replicateShared && <span style={{ color: '#10b981', fontSize: 11 }}>(shared with Replicate images)</span>}</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="password" value={replicateKey} onChange={e => setReplicateKey(e.target.value)} placeholder="Replicate API key..." style={{ ...inputStyle, flex: 1 }} />
                            <button onClick={() => onSaveApiKey('replicate', replicateKey)} style={secondaryBtnStyle}>💾</button>
                        </div>
                    </div>
                )}
                {showAnthropicKey && (
                    <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Anthropic API Key</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="password" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)} placeholder="Anthropic API key..." style={{ ...inputStyle, flex: 1 }} />
                            <button onClick={() => onSaveApiKey('anthropic', anthropicKey)} style={secondaryBtnStyle}>💾</button>
                        </div>
                    </div>
                )}
                {showOpenaiKey && (
                    <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>OpenAI API Key</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} placeholder="OpenAI API key..." style={{ ...inputStyle, flex: 1 }} />
                            <button onClick={() => onSaveApiKey('openai', openaiKey)} style={secondaryBtnStyle}>💾</button>
                        </div>
                    </div>
                )}

                <hr style={{ border: "none", borderTop: "1px solid #334155", margin: "16px 0" }} />

                {/* Image Provider */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ ...labelStyle, fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>🖼️ Image Provider</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        {IMAGE_PROVIDER_OPTIONS.map(p => (
                            <label key={p.value} style={{
                                display: "flex", alignItems: "center", gap: 6,
                                background: imageProvider === p.value ? "#064e3b" : "#1e2a3a",
                                border: `1px solid ${imageProvider === p.value ? "#10b981" : "#334155"}`,
                                borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: "#e2e8f0",
                            }}>
                                <input type="radio" name="imageProvider" value={p.value}
                                    checked={imageProvider === p.value}
                                    onChange={() => { setImageProvider(p.value); setImageModel(DEFAULT_IMAGE_MODELS[p.value]); }}
                                    style={{ accentColor: "#10b981" }} />
                                {p.label}
                            </label>
                        ))}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Image Model</label>
                            <div style={{ display: "flex", gap: 8 }}>
                                <select value={imageModel} onChange={e => setImageModel(e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                                    {IMAGE_MODELS_BY_PROVIDER[imageProvider].map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                                <button onClick={onTestImageApi} disabled={testImageResult.status === 'testing'} style={secondaryBtnStyle}>
                                    {testImageResult.status === 'testing' ? '⏳ Testing...' : '🧪 Test'}
                                </button>
                            </div>
                            {testImageResult.status === 'success' && (
                                <div style={{ marginTop: 8, padding: 8, background: "#10b98120", border: "1px solid #10b981", borderRadius: 8 }}>
                                    <p style={{ color: "#10b981", fontSize: 13, margin: 0, fontWeight: 600 }}>✅ Working!</p>
                                </div>
                            )}
                            {testImageResult.status === 'error' && (
                                <div style={{ marginTop: 8, padding: 8, background: "#ef444420", border: "1px solid #ef4444", borderRadius: 8 }}>
                                    <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>❌ {testImageResult.error}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Image provider API key — only if different from writing provider */}
                {geminiForImageOnly && (
                    <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Gemini API Key <span style={{ color: '#f59e0b', fontSize: 11 }}>(required for Google Imagen images)</span></label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="Gemini API key for images..." style={{ ...inputStyle, flex: 1 }} />
                            <button onClick={() => onSaveApiKey('gemini', geminiKey)} style={secondaryBtnStyle}>💾</button>
                        </div>
                    </div>
                )}
                {replicateForImageOnly && (
                    <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Replicate API Key <span style={{ color: '#f59e0b', fontSize: 11 }}>(required for Replicate images)</span></label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="password" value={replicateKey} onChange={e => setReplicateKey(e.target.value)} placeholder="Replicate API key for images..." style={{ ...inputStyle, flex: 1 }} />
                            <button onClick={() => onSaveApiKey('replicate', replicateKey)} style={secondaryBtnStyle}>💾</button>
                        </div>
                    </div>
                )}

                <hr style={{ border: "none", borderTop: "1px solid #334155", margin: "16px 0" }} />

                {/* ImgBB */}
                <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>ImgBB API Key <span style={{ color: "#64748b", fontSize: 11 }}>(permanent image hosting)</span></label>
                    <div style={{ display: "flex", gap: 8 }}>
                        <input type="password" value={imgbbKey} onChange={e => setImgbbKey(e.target.value)} placeholder="ImgBB key..." style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={() => onSaveApiKey("imgbb", imgbbKey)} style={secondaryBtnStyle}>💾</button>
                    </div>
                </div>

                {/* Validation error banners */}
                {missingWritingKey && (
                    <div style={{ padding: 8, background: '#ef444420', border: '1px solid #ef4444', borderRadius: 8, marginBottom: 8 }}>
                        <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>❌ {missingWritingKey} API key is required for writing</p>
                    </div>
                )}
                {missingImageKey && !(missingWritingKey && missingImageKey === missingWritingKey) && (
                    <div style={{ padding: 8, background: '#ef444420', border: '1px solid #ef4444', borderRadius: 8, marginBottom: 8 }}>
                        <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>❌ {missingImageKey} API key is required for image generation</p>
                    </div>
                )}
            </div>

            {/* ── SEO Strategy Settings ── */}
            <div style={{ ...cardStyle, border: "1px solid #10b98140" }}>
                <h3 style={{ color: "#10b981", fontSize: 16, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>🎯 SEO Strategy Settings</h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    {/* Niche */}
                    <div>
                        <label style={labelStyle}>Blog Niche</label>
                        <input type="text" value={settings.niche} onChange={e => updateSettings({ niche: e.target.value })}
                            placeholder="e.g. healthy recipes, Italian food, vegan cooking" style={inputStyle} />
                    </div>

                    {/* FAQ Count */}
                    <div>
                        <label style={labelStyle}>FAQ Questions (People Also Ask)</label>
                        <select value={settings.faqCount} onChange={e => updateSettings({ faqCount: Number(e.target.value) as FaqCount })} style={selectStyle}>
                            {FAQ_COUNT_OPTIONS.map(o => <option key={o} value={o}>{o} questions</option>)}
                        </select>
                    </div>

                    {/* Publish Mode */}
                    <div>
                        <label style={labelStyle}>Publishing Mode</label>
                        <select value={settings.publishMode} onChange={e => updateSettings({ publishMode: e.target.value as 'draft' | 'publish' })} style={selectStyle}>
                            <option value="publish">Publish Immediately</option>
                            <option value="draft">Save as Draft</option>
                        </select>
                    </div>
                </div>

                {/* ── AI Strategy Preview ── */}
                {keywordAnalysis && (
                    <div style={{
                        marginBottom: 16, padding: 16, background: "#0f1623",
                        border: `1px solid ${keywordAnalysis.isFallback ? '#f59e0b40' : '#10b98140'}`,
                        borderRadius: 10,
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <h4 style={{ color: "#10b981", fontSize: 14, fontWeight: 700, margin: 0 }}>
                                🤖 AI Strategy Preview
                            </h4>
                            {keywordAnalysis.isFallback && (
                                <span style={{ color: "#f59e0b", fontSize: 11, background: "#f59e0b15", padding: "2px 8px", borderRadius: 6 }}>
                                    ⚠️ Estimated — verify settings
                                </span>
                            )}
                        </div>

                        <p style={{ color: "#94a3b8", fontSize: 12, margin: "0 0 12px", fontStyle: "italic" }}>
                            &ldquo;{keywordAnalysis.keyword}&rdquo;
                        </p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                            <div style={{ background: "#1e2a3a", borderRadius: 8, padding: "8px 10px" }}>
                                <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Intent</span>
                                <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>
                                    {INTENT_LABELS[keywordAnalysis.intent]?.emoji} {INTENT_LABELS[keywordAnalysis.intent]?.label}
                                </span>
                            </div>
                            <div style={{ background: "#1e2a3a", borderRadius: 8, padding: "8px 10px" }}>
                                <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Strategy</span>
                                <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>
                                    {keywordAnalysis.contentStrategy === 'pillar' ? '🏛️ Pillar' : '🔗 Cluster'}
                                </span>
                            </div>
                            <div style={{ background: "#1e2a3a", borderRadius: 8, padding: "8px 10px" }}>
                                <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Schema</span>
                                <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>
                                    📊 {keywordAnalysis.schemaType}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                            <div style={{ background: "#1e2a3a", borderRadius: 8, padding: "8px 10px" }}>
                                <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>H2 Sections</span>
                                <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{keywordAnalysis.h2Count} sections</span>
                            </div>
                            <div style={{ background: "#1e2a3a", borderRadius: 8, padding: "8px 10px" }}>
                                <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Tone</span>
                                <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>
                                    {FOOD_TONE_OPTIONS.find(o => o.value === keywordAnalysis.tone)?.label || keywordAnalysis.tone}
                                </span>
                            </div>
                            <div style={{ background: "#1e2a3a", borderRadius: 8, padding: "8px 10px" }}>
                                <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>Authority</span>
                                <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>
                                    {AUTHORITY_SOURCE_OPTIONS.find(o => o.value === keywordAnalysis.authoritySource)?.label?.split(' (')[0] || keywordAnalysis.authoritySource}
                                </span>
                            </div>
                        </div>

                        {keywordAnalysis.suggestedTitle && keywordAnalysis.suggestedTitle !== keywordAnalysis.keyword && (
                            <div style={{ background: "#064e3b30", border: "1px solid #10b98130", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                                <span style={{ color: "#64748b", fontSize: 11, display: "block", marginBottom: 2 }}>Suggested Title</span>
                                <span style={{ color: "#10b981", fontSize: 13, fontWeight: 600 }}>&ldquo;{keywordAnalysis.suggestedTitle}&rdquo;</span>
                            </div>
                        )}

                        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748b" }}>
                            <span>📝 ~{keywordAnalysis.estimatedWordCount.toLocaleString()} words</span>
                            {keywordAnalysis.pinterestBoardSuggestion && (
                                <span>📌 Board: {keywordAnalysis.pinterestBoardSuggestion}</span>
                            )}
                        </div>

                        {keywordAnalysis.searchIntentReason && (
                            <p style={{ color: "#64748b", fontSize: 11, marginTop: 8, marginBottom: 0, fontStyle: "italic" }}>
                                💡 {keywordAnalysis.searchIntentReason}
                            </p>
                        )}
                    </div>
                )}

                {analysisLoading && (
                    <div style={{ marginBottom: 16, padding: 12, background: "#0f1623", border: "1px solid #334155", borderRadius: 10, textAlign: "center" }}>
                        <span style={{ color: "#10b981", fontSize: 13 }}>🤖 Analyzing keyword strategy...</span>
                    </div>
                )}

                {/* ── Advanced Override (Collapsible) ── */}
                <div style={{ marginBottom: 16 }}>
                    <button
                        onClick={() => setAdvancedOpen(prev => !prev)}
                        style={{
                            background: "transparent", border: "1px solid #334155", borderRadius: 8,
                            color: "#64748b", fontSize: 12, padding: "6px 12px", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center",
                        }}
                    >
                        {advancedOpen ? '▼' : '▶'} ✏️ Override Settings (advanced){!advancedOpen && ' — AI settings are already optimized'}
                    </button>

                    {advancedOpen && (
                        <div style={{ marginTop: 12, padding: 12, background: "#0f162320", border: "1px dashed #33415580", borderRadius: 8 }}>
                            <p style={{ color: "#f59e0b", fontSize: 11, margin: "0 0 12px", textAlign: "center" }}>
                                ⚠️ These overrides replace AI-detected settings for all keywords
                            </p>

                            {/* Tone */}
                            <div style={{ marginBottom: 12 }}>
                                <label style={labelStyle}>Article Tone</label>
                                <select value={settings.tone} onChange={e => updateSettings({ tone: e.target.value as FoodTone })} style={selectStyle}>
                                    {FOOD_TONE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>

                            {/* Content Strategy */}
                            <div style={{ marginBottom: 12 }}>
                                <label style={labelStyle}>Content Strategy</label>
                                <div style={{ display: "flex", gap: 0, background: "#0f1623", borderRadius: 8, overflow: "hidden", border: "1px solid #334155" }}>
                                    {CONTENT_STRATEGY_OPTIONS.map(o => (
                                        <button
                                            key={o.value}
                                            onClick={() => {
                                                const defaults = STRATEGY_DEFAULTS[o.value];
                                                updateSettings({ contentStrategy: o.value as ContentStrategy, h2Count: defaults.h2Count });
                                            }}
                                            title={o.tooltip}
                                            style={{
                                                flex: 1, background: settings.contentStrategy === o.value ? "#064e3b" : "transparent",
                                                color: settings.contentStrategy === o.value ? "#10b981" : "#94a3b8",
                                                border: "none", padding: "8px 12px", fontWeight: 600, cursor: "pointer", fontSize: 13,
                                            }}
                                        >
                                            {o.emoji} {o.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                                <div>
                                    <label style={labelStyle}>H2 Sections</label>
                                    <select value={settings.h2Count} onChange={e => updateSettings({ h2Count: Number(e.target.value) as FoodH2Count })} style={selectStyle}>
                                        {FOOD_H2_OPTIONS.map(o => <option key={o} value={o}>{o} sections</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Schema Type</label>
                                    <select value={settings.schemaType} onChange={e => updateSettings({ schemaType: e.target.value as SchemaType })} style={selectStyle}>
                                        {SCHEMA_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Title Formula</label>
                                    <select value={settings.titleFormula} onChange={e => updateSettings({ titleFormula: e.target.value as TitleFormula })} style={selectStyle}>
                                        {TITLE_FORMULA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Authority Source</label>
                                    <select value={settings.authoritySource} onChange={e => updateSettings({ authoritySource: e.target.value as AuthoritySource })} style={selectStyle}>
                                        {AUTHORITY_SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Internal Link Topics */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Internal Link Topics</label>
                    <textarea rows={3} value={settings.internalLinkTopics}
                        onChange={e => updateSettings({ internalLinkTopics: e.target.value })}
                        placeholder={"Enter related topics, one per line:\nhealthy breakfast recipes\neasy meal prep\nlow calorie dinners"}
                        style={{ ...inputStyle, resize: "vertical" }} />
                    <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                        AI will insert placeholder links to these related topics within the article
                    </p>
                </div>

                {/* Pinterest Output Toggle */}
                <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                    <label style={{ ...labelStyle, marginBottom: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input type="checkbox" checked={settings.pinterestOutput}
                            onChange={e => updateSettings({ pinterestOutput: e.target.checked })}
                            style={{ accentColor: "#10b981", width: 18, height: 18 }} />
                        <span style={{ color: "#e2e8f0", fontSize: 14 }}>📌 Generate Pinterest Assets</span>
                    </label>
                    <span style={{ color: "#64748b", fontSize: 12 }}>Pin titles, descriptions & 3 pin variations per article</span>
                </div>

                {/* Amazon Affiliate Tag */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Amazon Affiliate Tag (optional)</label>
                    <input type="text" value={settings.amazonAffiliateTag || ''}
                        onChange={e => updateSettings({ amazonAffiliateTag: e.target.value })}
                        placeholder="e.g. yourtag-20 — leave blank to skip product links"
                        style={inputStyle} />
                    <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                        If left blank, product mentions will appear as plain bold text without links.
                    </p>
                </div>

                {/* Affiliate Links */}
                <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Affiliate Links (one per line: ProductName | URL)</label>
                    <textarea rows={4} value={affiliatesText}
                        onChange={e => setAffiliatesText(e.target.value)}
                        placeholder={"Best Air Fryer | https://amazon.com/dp/...\nKitchenAid Mixer | https://amazon.com/dp/..."}
                        style={{ ...inputStyle, resize: "vertical" }} />
                </div>

                {/* Store Product Links (New Feature) */}
                <div>
                    <label style={labelStyle}>🛒 Store Product Links File (optional)</label>
                    <input type="file" accept=".csv,.txt"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                const text = ev.target?.result as string;
                                const products = text.split("\n")
                                    .map(line => line.trim())
                                    .filter(line => line.includes("|"))
                                    .map(line => {
                                      const parts = line.split("|").map(p => p.trim());
                                      return { name: parts[0] || "", url: parts[1] || "", description: parts[2] || "" };
                                    })
                                    .filter(p => p.name && p.url);
                                updateSettings({ storeProducts: products });
                            };
                            reader.readAsText(file);
                        }}
                        style={{ ...inputStyle, cursor: "pointer", padding: "6px" }} />
                    <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                        Upload a file with your store's products. Format: ProductName | URL (one per line). AI will automatically match and insert the most relevant product into each recipe section.
                    </p>
                    {settings.storeProducts && settings.storeProducts.length > 0 && (
                        <p style={{ color: "#10b981", fontSize: 13, marginTop: 8, fontWeight: 600 }}>
                            ✅ {settings.storeProducts.length} products loaded — AI will match them to your content
                        </p>
                    )}
                </div>
            </div>

            {/* ── WordPress Integration ── */}
            <div style={cardStyle}>
                <h3 style={{ color: "#10b981", fontSize: 16, fontWeight: 700, marginBottom: 12, marginTop: 0 }}>🌐 WordPress Integration</h3>
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
                    <button onClick={onSaveWpCreds} style={secondaryBtnStyle}>💾 Save</button>
                </div>
            </div>

            {/* ── Keywords ── */}
            <div style={cardStyle}>
                <h3 style={{ color: "#10b981", fontSize: 16, fontWeight: 700, marginBottom: 12, marginTop: 0 }}>🔍 Keywords</h3>

                {/* Toggle */}
                <div style={{ display: "flex", gap: 0, marginBottom: 16, background: "#0f1623", borderRadius: 8, overflow: "hidden", border: "1px solid #334155" }}>
                    <button onClick={() => setKeywordMode("single")} style={{
                        flex: 1, background: keywordMode === "single" ? "#1e2a3a" : "transparent",
                        color: keywordMode === "single" ? "#10b981" : "#94a3b8",
                        border: "none", padding: "10px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14,
                    }}>Single Keyword</button>
                    <button onClick={() => setKeywordMode("file")} style={{
                        flex: 1, background: keywordMode === "file" ? "#1e2a3a" : "transparent",
                        color: keywordMode === "file" ? "#10b981" : "#94a3b8",
                        border: "none", padding: "10px 16px", fontWeight: 600, cursor: "pointer", fontSize: 14,
                    }}>Upload Keyword File</button>
                </div>

                {keywordMode === "single" ? (
                    <div>
                        <label style={labelStyle}>Target Keyword</label>
                        <input type="text" value={singleKeyword} onChange={e => setSingleKeyword(e.target.value)}
                            placeholder="e.g. healthy dinner recipes" style={inputStyle} />
                    </div>
                ) : (
                    <div>
                        <div style={{ border: "2px dashed #334155", borderRadius: 12, padding: 24, textAlign: "center", marginBottom: 16, cursor: "pointer" }}>
                            <input type="file" accept=".txt,.csv,.xlsx" onChange={handleFileUploadWithIntel} style={{ display: "none" }} id="fsw-keyword-file-upload" />
                            <label htmlFor="fsw-keyword-file-upload" style={{ cursor: "pointer", color: "#94a3b8" }}>
                                <p style={{ fontSize: 16, marginBottom: 4 }}>📂 Click to upload keyword file</p>
                                <p style={{ fontSize: 13, color: "#64748b" }}>Accepted: .txt, .csv, .xlsx</p>
                            </label>
                        </div>

                        {parsedKeywords.length > 0 && (
                            <div>
                                <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                                    <span style={{ color: "#10b981", fontSize: 14, fontWeight: 600 }}>
                                        ✅ Found {parsedKeywords.length} keywords
                                    </span>
                                    <button onClick={() => onToggleAll(true)} style={{ ...secondaryBtnStyle, padding: "4px 10px", fontSize: 12 }}>Select All</button>
                                    <button onClick={() => onToggleAll(false)} style={{ ...secondaryBtnStyle, padding: "4px 10px", fontSize: 12 }}>Deselect All</button>
                                </div>
                                <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #334155", borderRadius: 8 }}>
                                    {parsedKeywords.map((kw, i) => (
                                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", borderBottom: "1px solid #1e2a3a" }}>
                                            <input type="checkbox" checked={kw.checked}
                                                onChange={() => setParsedKeywords(prev => {
                                                    const arr = typeof prev === 'function' ? prev : prev;
                                                    const copy = [...(Array.isArray(arr) ? arr : [])];
                                                    copy[i] = { ...copy[i], checked: !copy[i].checked };
                                                    return copy;
                                                })} />
                                            <span style={{ flex: 1, color: "#e2e8f0", fontSize: 14 }}>{kw.text}</span>
                                            <button onClick={() => onRemoveKeyword(i)} style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>✗</button>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginTop: 16 }}>
                                    <button onClick={onGenerateTitles} disabled={titleGenerating} style={{ ...goldBtnStyle, opacity: titleGenerating ? 0.6 : 1 }}>
                                        {titleGenerating ? "✨ Generating titles..." : "📝 Generate Article Titles"}
                                    </button>
                                </div>

                                {titlesGenerated && (
                                    <div style={{ marginTop: 16 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                            <h4 style={{ color: "#e2e8f0", margin: 0 }}>Generated Titles</h4>
                                            <button onClick={onGenerateTitles} style={{ ...secondaryBtnStyle, fontSize: 12 }}>♻️ Regenerate All</button>
                                        </div>
                                        <div style={{ border: "1px solid #334155", borderRadius: 8, overflow: "hidden" }}>
                                            {parsedKeywords.filter(k => k.checked && k.generatedTitle).map((kw, i) => {
                                                const realIdx = parsedKeywords.indexOf(kw);
                                                return (
                                                    <div key={i} style={{
                                                        display: "grid", gridTemplateColumns: "200px 1fr auto",
                                                        gap: 12, padding: "8px 12px", borderBottom: "1px solid #1e2a3a", alignItems: "center",
                                                    }}>
                                                        <span style={{ color: "#94a3b8", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{kw.text}</span>
                                                        <input type="text" value={kw.generatedTitle || ""}
                                                            onChange={e => {
                                                                setParsedKeywords(prev => {
                                                                    const copy = [...(Array.isArray(prev) ? prev : [])];
                                                                    copy[realIdx] = { ...copy[realIdx], generatedTitle: e.target.value };
                                                                    return copy;
                                                                });
                                                            }}
                                                            style={{ ...inputStyle, padding: "4px 8px" }} />
                                                        <div style={{ display: "flex", gap: 4 }}>
                                                            <button onClick={() => onRegenerateTitle(realIdx)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 16 }}>♻️</button>
                                                            <button onClick={() => onRemoveKeyword(realIdx)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 16 }}>🗑</button>
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

            {/* ── Keyword Intelligence Panel ── */}
            {intelligence !== null && csvData.length > 0 && (
                <div style={{
                    ...cardStyle,
                    border: '1px solid #f59e0b33',
                    background: '#0f1623',
                }}>
                    {/* Header */}
                    <button onClick={() => setIntelExpanded(prev => !prev)} style={{
                        background: 'transparent', border: 'none', color: '#f59e0b',
                        fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%',
                        textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div>
                            <span>📊 Keyword Intelligence</span>
                            <span style={{ color: '#64748b', fontSize: 12, fontWeight: 400, marginLeft: 8 }}>From your uploaded CSV</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={getCompetitionBadgeStyle(intelligence.competitionLevel)}>
                                {intelligence.competitionLevel} COMPETITION
                            </span>
                            <span style={{ color: '#94a3b8' }}>{intelExpanded ? '▼' : '▶'}</span>
                        </div>
                    </button>

                    {intelExpanded && (
                        <div style={{ marginTop: 12 }}>
                            {/* Section 1: Exact Match Stats */}
                            {intelligence.exact ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                    <div style={{
                                        background: '#1a2035', border: '1px solid #334155', borderRadius: 8,
                                        padding: 16, textAlign: 'center',
                                    }}>
                                        <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            Pinterest Search Volume
                                        </p>
                                        <p style={{ color: '#10b981', fontSize: 28, fontWeight: 800, margin: 0 }}>
                                            {formatSearchVolume(intelligence.exact.searchVolume)}
                                        </p>
                                    </div>
                                    <div style={{
                                        background: '#1a2035', border: '1px solid #334155', borderRadius: 8,
                                        padding: 16, textAlign: 'center',
                                    }}>
                                        <p style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: 1 }}>
                                            Pinterest Followers
                                        </p>
                                        <p style={{ color: '#10b981', fontSize: 28, fontWeight: 800, margin: 0 }}>
                                            {formatSearchVolume(intelligence.exact.followers)}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ color: '#f59e0b', fontSize: 13, marginBottom: 12 }}>
                                    ⚠️ Keyword not found in your CSV
                                </p>
                            )}

                            {/* Section 2: Recommendation */}
                            <div style={{ marginBottom: 12 }}>
                                <p style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', margin: 0 }}>
                                    💡 {intelligence.recommendation}
                                </p>
                            </div>

                            {/* Section 3: Related Keywords Table */}
                            {intelligence.related.length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                                        ⚡ Related keywords in your CSV
                                    </p>
                                    <div style={{ border: '1px solid #334155', borderRadius: 8, overflow: 'hidden' }}>
                                        {/* Table header */}
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: '1fr 120px 120px',
                                            padding: '6px 12px', background: '#1a2035',
                                            borderBottom: '1px solid #334155',
                                        }}>
                                            <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Keyword</span>
                                            <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Search Volume</span>
                                            <span style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Competition</span>
                                        </div>
                                        {/* Table rows */}
                                        {intelligence.related.map((rel) => {
                                            const relLevel = rel.searchVolume > 1_000_000 ? 'HIGH' as const
                                                : rel.searchVolume >= 100_000 ? 'MEDIUM' as const
                                                : 'LOW' as const;
                                            const isLow = relLevel === 'LOW';
                                            return (
                                                <div
                                                    key={rel.id}
                                                    onClick={() => selectRelatedKeyword(rel.label)}
                                                    style={{
                                                        display: 'grid', gridTemplateColumns: '1fr 120px 120px',
                                                        padding: '8px 12px',
                                                        borderBottom: '1px solid #1e293b',
                                                        cursor: 'pointer',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1e2a3a'; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                                >
                                                    <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: isLow ? 700 : 400 }}>
                                                        {rel.label}
                                                    </span>
                                                    <span style={{ color: '#e2e8f0', fontSize: 13, textAlign: 'right' }}>
                                                        {formatSearchVolume(rel.searchVolume)}
                                                    </span>
                                                    <span style={{ textAlign: 'right' }}>
                                                        <span style={getCompetitionBadgeStyle(relLevel)}>
                                                            {relLevel}
                                                        </span>
                                                        {isLow && (
                                                            <span style={{ color: '#10b981', fontSize: 10, marginLeft: 4, fontWeight: 600 }}>
                                                                ← Target this
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Section 4: Pinterest URL */}
                            {intelligence.exact && intelligence.exact.url && (
                                <a
                                    href={intelligence.exact.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#f59e0b', fontSize: 12, textDecoration: 'none' }}
                                >
                                    🔗 View on Pinterest →
                                </a>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Featured Image Settings (Collapsible) ── */}
            <div style={cardStyle}>
                <button onClick={() => setImageSettingsOpen(!imageSettingsOpen)}
                    style={{
                        background: "transparent", border: "none", color: "#10b981",
                        fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%",
                        textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                    <span>🖼️ Featured Image Settings</span>
                    <span style={{ color: "#94a3b8" }}>{imageSettingsOpen ? "▼" : "▶"}</span>
                </button>

                {imageSettingsOpen && (
                    <div style={{ marginTop: 16 }}>
                        <div style={{ marginBottom: 12 }}>
                            <label style={labelStyle}>AI Image Prompt Instructions</label>
                            <textarea rows={6} value={settings.featuredImage.promptTemplate}
                                onChange={e => updateFeaturedImage({ promptTemplate: e.target.value })}
                                style={{ ...inputStyle, resize: "vertical" }} />
                            <p style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                                💡 Use {"{title}"} for article title and {"{content}"} for article summary
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
                                <input type="text" value={settings.featuredImage.colorMood} onChange={e => updateFeaturedImage({ colorMood: e.target.value })} placeholder="e.g. warm, rustic, golden hour" style={inputStyle} />
                            </div>
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <label style={labelStyle}>Image Dimensions</label>
                            <div style={{ display: "flex", gap: 12 }}>
                                {IMAGE_DIMENSION_OPTIONS.map(o => (
                                    <label key={o.value} style={{
                                        display: "flex", alignItems: "center", gap: 6,
                                        color: settings.featuredImage.dimensions === o.value ? "#10b981" : "#94a3b8",
                                        cursor: "pointer", fontSize: 14,
                                    }}>
                                        <input type="radio" name="img-dim" value={o.value}
                                            checked={settings.featuredImage.dimensions === o.value}
                                            onChange={e => updateFeaturedImage({ dimensions: e.target.value as ImageDimensions })} />
                                        {o.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Generate Button ── */}
            <div style={{ textAlign: "center", marginTop: 20 }}>
                <button onClick={onGenerate} disabled={generating}
                    style={{
                        ...goldBtnStyle,
                        fontSize: 18, padding: "14px 40px",
                        opacity: generating ? 0.6 : 1,
                        background: "linear-gradient(135deg, #10b981, #059669)",
                    }}>
                    {generating ? "⏳ Generating..." : "🚀 Start Generating Food SEO Articles"}
                </button>
            </div>
        </div>
        </div>
    );
}
