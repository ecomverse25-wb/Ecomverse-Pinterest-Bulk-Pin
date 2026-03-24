"use client";

import { useState, useCallback, useEffect } from "react";
import type { FormInputs, ProviderSettings, ContentProvider, ImageProvider } from "./types";
import { DEFAULT_FORM_INPUTS, CONTENT_MODELS, IMAGE_MODELS } from "./lib/constants";
import { useBatchProcessing } from "./hooks/useBatchProcessing";
import InputForm from "./InputForm";
import ProgressIndicator from "./ProgressIndicator";
import SeasonalSuggestionBanner from "./SeasonalSuggestion";
import OutputTabs from "./OutputTabs";
import ExportButtons from "./ExportButtons";
import BatchProgress from "./BatchProgress";

// ─── Local Storage Key ───
const STORAGE_KEY = "food-seo-writer-v2-settings";

const DEFAULT_PROVIDER: ProviderSettings = {
  contentProvider: "gemini",
  contentModel: "gemini-2.5-flash",
  contentApiKey: "",
  imageProvider: "gemini",
  imageModel: "nano-banana-pro-preview",
  imageApiKey: "",
  useSharedKey: true,
};

// ─── Inline Styles ───
const containerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "16px 20px",
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const headerStyle: React.CSSProperties = {
  marginBottom: 24,
};

const providerCardStyle: React.CSSProperties = {
  background: "#1a2035",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "#0f1623",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 14,
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#94a3b8",
  marginBottom: 6,
};

// ─── Main Component ───

export default function FoodSeoWriter() {
  // Form state
  const [inputs, setInputs] = useState<FormInputs>(DEFAULT_FORM_INPUTS);
  const [provider, setProvider] = useState<ProviderSettings>(DEFAULT_PROVIDER);
  const [keywordError, setKeywordError] = useState<string>("");

  // Pipeline via Batch Processing (handles both single & batch)
  const {
    batchItems,
    setBatchItems,
    isBatchProcessing,
    currentBatchIndex,
    startBatch,
    stopBatch,
    internalGeneration: {
      progress,
      result,
      generating,
      fixing,
      generate,
      fixIssues,
      reset,
      abort,
    }
  } = useBatchProcessing();

  // Extra States for Multi-Provider
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [testingImage, setTestingImage] = useState(false);
  const [testImageResult, setTestImageResult] = useState<"success" | "error" | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.inputs) setInputs((prev) => ({ ...prev, ...parsed.inputs }));
        if (parsed.provider) {
          // Merge core provider settings, but overwrite API keys with specific key storage
          const p = { ...DEFAULT_PROVIDER, ...parsed.provider } as ProviderSettings;
          const contentKey = localStorage.getItem(`pinverse_content_api_key_${p.contentProvider}`);
          if (contentKey) p.contentApiKey = contentKey;
          const imageKey = localStorage.getItem(`pinverse_image_api_key_${p.imageProvider}`);
          if (imageKey) p.imageApiKey = imageKey;
          setProvider(p);
        }
      } else {
        // Initial load specific keys even if no general config
        setProvider((prev) => {
          const next = { ...prev };
          const contentKey = localStorage.getItem(`pinverse_content_api_key_${next.contentProvider}`);
          if (contentKey) next.contentApiKey = contentKey;
          const imageKey = localStorage.getItem(`pinverse_image_api_key_${next.imageProvider}`);
          if (imageKey) next.imageApiKey = imageKey;
          return next;
        });
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save general settings to localStorage (keys saved individually on Save button click)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const safeProvider = { ...provider, contentApiKey: "", imageApiKey: "" }; // Don't duplicate keys in general store
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs, provider: safeProvider }));
      } catch {
        // Ignore storage errors
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [inputs, provider]);

  const saveContentKey = () => {
    localStorage.setItem(`pinverse_content_api_key_${provider.contentProvider}`, provider.contentApiKey);
    setSavedKeys(prev => ({ ...prev, [`content_${provider.contentProvider}`]: true }));
    setTimeout(() => setSavedKeys(prev => ({ ...prev, [`content_${provider.contentProvider}`]: false })), 2000);
  };

  const saveImageKey = () => {
    localStorage.setItem(`pinverse_image_api_key_${provider.imageProvider}`, provider.imageApiKey);
    setSavedKeys(prev => ({ ...prev, [`image_${provider.imageProvider}`]: true }));
    setTimeout(() => setSavedKeys(prev => ({ ...prev, [`image_${provider.imageProvider}`]: false })), 2000);
  };

  const handleTestImage = async () => {
    setTestingImage(true);
    setTestImageResult(null);
    try {
      const { generateImageAction } = await import("@/app/actions/food-seo-writer/generate-v2");
      const keyStr = provider.useSharedKey && provider.contentProvider === provider.imageProvider ? provider.contentApiKey : provider.imageApiKey;
      const res = await generateImageAction(
        "Test Image Cookie", 
        "A beautiful test image of a fresh chocolate chip cookie on a wooden table, professional food photography", 
        "Create a stunning high-quality photo of {content}.", // promptTemplate
        "Food & Kitchen" as any, 
        "", 
        "Square 1:1" as any, 
        provider, // config
        inputs.imageSettings.imgbbApiKey // imgbbKey
      );
      if (res.success) setTestImageResult("success");
      else setTestImageResult("error");
    } catch {
      setTestImageResult("error");
    } finally {
      setTestingImage(false);
    }
  };

  // Generate handler
  const handleGenerate = useCallback(() => {
    // Validate keyword
    const words = inputs.core.mainKeyword.trim().split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 8) {
      setKeywordError("Keyword should be 2-8 words.");
      return;
    }

    // Validate API key
    if (!provider.contentApiKey) {
      setKeywordError(`Please enter your ${provider.contentProvider.toUpperCase()} API key below.`);
      return;
    }

    setKeywordError("");
    if (inputs.batch.mode === "batch") {
      startBatch(inputs, provider);
    } else {
      generate(inputs, provider);
    }
  }, [inputs, provider, generate, startBatch]);

  // Fix issues handler
  const handleFixIssues = useCallback(() => {
    fixIssues(inputs, provider);
  }, [inputs, provider, fixIssues]);

  // New generation handler
  const handleNewGeneration = useCallback(() => {
    reset();
    setBatchItems([]);
  }, [reset, setBatchItems]);

  const showResults = inputs.batch.mode === "single" && result !== null;
  const isBatchActive = inputs.batch.mode === "batch" && batchItems.length > 0;
  const showProgress = generating || progress.currentStage !== "input";
  const hideForm = showResults || isBatchActive || generating;

  return (
    <div style={containerStyle}>
      {/* ━━━ Header ━━━ */}
      <div style={headerStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                background: "linear-gradient(135deg, #10b981, #22d3ee)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                margin: 0,
              }}
            >
              🍳 Food SEO Writer v2.0
            </h1>
            <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0 0" }}>
              6-stage pipeline • 7 templates • 100-point scoring • Rank on Google, Pinterest & AI
            </p>
          </div>
          {/* ━━━ Header Right (New Action) ━━━ */}
          {(showResults || isBatchActive) && (
            <button
              onClick={handleNewGeneration}
              style={{
                padding: "8px 18px",
                background: "#334155",
                border: "1px solid #475569",
                borderRadius: 8,
                color: "#e2e8f0",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✨ New Generation
            </button>
          )}
        </div>
      </div>

      {/* ━━━ Input Phase ━━━ */}
      {!hideForm && (
        <>
          {/* Seasonal Suggestion Banner */}
          <SeasonalSuggestionBanner keyword={inputs.core.mainKeyword || undefined} />

          {/* 🤖 AI Configuration */}
          <div style={providerCardStyle}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#10b981",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              🤖 AI Configuration
            </div>

            {/* ── Content Generation ── */}
            <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: "#94a3b8", borderBottom: "1px solid #334155", paddingBottom: 6 }}>
              ── Content Generation ──
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Provider</label>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                {(["gemini", "openai", "anthropic", "replicate"] as ContentProvider[]).map(p => (
                  <label key={p} style={{ fontSize: 14, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input 
                      type="radio" 
                      name="contentProvider" 
                      value={p} 
                      checked={provider.contentProvider === p}
                      onChange={() => {
                        const key = localStorage.getItem(`pinverse_content_api_key_${p}`) || "";
                        setProvider(prev => ({ 
                          ...prev, 
                          contentProvider: p, 
                          contentModel: CONTENT_MODELS[p][0].value,
                          contentApiKey: key
                        }));
                      }}
                    />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </label>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Model</label>
                  <select
                    value={provider.contentModel}
                    onChange={(e) => setProvider((prev) => ({ ...prev, contentModel: e.target.value }))}
                    style={selectStyle}
                  >
                    {CONTENT_MODELS[provider.contentProvider].map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>API Key <span style={{ color: "#ef4444" }}>*</span></label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="password"
                      placeholder={`Enter your ${provider.contentProvider} API key`}
                      value={provider.contentApiKey}
                      onChange={(e) => setProvider(prev => ({ ...prev, contentApiKey: e.target.value }))}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button 
                      onClick={saveContentKey}
                      style={{ padding: "0 12px", background: "#334155", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0", fontSize: 13, cursor: "pointer" }}
                    >
                      💾 Save
                    </button>
                    {savedKeys[`content_${provider.contentProvider}`] && (
                      <span style={{ color: "#4ade80", fontSize: 13, display: "flex", alignItems: "center" }}>Saved ✓</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    Get yours at {{ gemini: "aistudio.google.com", openai: "platform.openai.com", anthropic: "console.anthropic.com", replicate: "replicate.com" }[provider.contentProvider]}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Image Generation ── */}
            <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: "#94a3b8", borderBottom: "1px solid #334155", paddingBottom: 6 }}>
              ── Image Generation ──
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Provider</label>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                {(["gemini", "replicate"] as ImageProvider[]).map(p => (
                  <label key={p} style={{ fontSize: 14, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input 
                      type="radio" 
                      name="imageProvider" 
                      value={p} 
                      checked={provider.imageProvider === p}
                      onChange={() => {
                        const key = localStorage.getItem(`pinverse_image_api_key_${p}`) || "";
                        setProvider(prev => ({ 
                          ...prev, 
                          imageProvider: p, 
                          imageModel: IMAGE_MODELS[p][0].value,
                          imageApiKey: key,
                          useSharedKey: p === prev.contentProvider
                        }));
                      }}
                    />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </label>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Model</label>
                  <select
                    value={provider.imageModel}
                    onChange={(e) => setProvider((prev) => ({ ...prev, imageModel: e.target.value }))}
                    style={selectStyle}
                  >
                    {IMAGE_MODELS[provider.imageProvider].map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>API Key <span style={{ color: "#ef4444" }}>*</span></label>
                  {provider.imageProvider === provider.contentProvider ? (
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 13, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={provider.useSharedKey}
                          onChange={(e) => setProvider(prev => ({ ...prev, useSharedKey: e.target.checked }))}
                        />
                        Same as content key ✓
                      </label>
                    </div>
                  ) : null}

                  {(!provider.useSharedKey || provider.imageProvider !== provider.contentProvider) && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="password"
                        placeholder={`Enter your ${provider.imageProvider} API key for images`}
                        value={provider.imageApiKey}
                        onChange={(e) => setProvider(prev => ({ ...prev, imageApiKey: e.target.value }))}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <button 
                        onClick={saveImageKey}
                        style={{ padding: "0 12px", background: "#334155", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0", fontSize: 13, cursor: "pointer" }}
                      >
                        💾 Save
                      </button>
                      {savedKeys[`image_${provider.imageProvider}`] && (
                        <span style={{ color: "#4ade80", fontSize: 13, display: "flex", alignItems: "center" }}>Saved ✓</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  type="button"
                  onClick={handleTestImage}
                  disabled={testingImage}
                  style={{
                    padding: "6px 16px",
                    background: testingImage ? "#334155" : "#0284c7",
                    border: "none",
                    borderRadius: 6,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: testingImage ? "wait" : "pointer",
                  }}
                >
                  {testingImage ? "Testing..." : "🎨 Test"}
                </button>
                {testImageResult === "success" && <span style={{ color: "#4ade80", fontSize: 13, fontWeight: 600 }}>✅ Working!</span>}
                {testImageResult === "error" && <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 600 }}>❌ Error testing API key</span>}
              </div>
            </div>
          </div>

          {/* Input Form */}
          <InputForm
            inputs={inputs}
            onUpdate={setInputs}
            onGenerate={handleGenerate}
            generating={generating}
            keywordError={keywordError}
          />
        </>
      )}

      {/* ━━━ Batch Progress ━━━ */}
      {isBatchActive && (
        <BatchProgress
          items={batchItems}
          currentIndex={currentBatchIndex}
          isProcessing={isBatchProcessing}
          onStop={stopBatch}
        />
      )}

      {/* ━━━ Progress Indicator ━━━ */}
      {showProgress && <ProgressIndicator progress={progress} />}

      {/* ━━━ Cancel Button (Single Mode) ━━━ */}
      {generating && !isBatchProcessing && (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <button
            onClick={abort}
            style={{
              padding: "8px 24px",
              background: "#7f1d1d",
              border: "1px solid #991b1b",
              borderRadius: 8,
              color: "#fca5a5",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ⛔ Cancel Generation
          </button>
        </div>
      )}

      {/* ━━━ Output Phase (Single Mode) ━━━ */}
      {showResults && result && (
        <>
          <OutputTabs
            result={result}
            keyword={inputs.core.mainKeyword}
            onFixIssues={handleFixIssues}
            fixing={fixing}
          />

          <ExportButtons result={result} keyword={inputs.core.mainKeyword} inputs={inputs} />
        </>
      )}
    </div>
  );
}
