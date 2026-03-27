"use client";

import React, { useState, useRef, useEffect } from "react";
import type {
  FormInputs,
  ProductLink,
  ContentType,
  WordCountTarget,
  WritingPersona,
  Tone,
  PinStyle,
  PinVariantCount,
  SeasonalOverride,
  LinkAttribute,
  ImageProvider,
  ImageStyle,
  ImageDimensions,
  PublishingMode,
  ArticleTone,
  ContentStrategy,
  H2SectionCount,
  SchemaTypeOverride,
  TitleFormula,
  AuthoritySource,
} from "./types";
import {
  CONTENT_TYPE_OPTIONS,
  WORD_COUNT_OPTIONS,
  WRITING_PERSONA_OPTIONS,
  TONE_OPTIONS,
  PIN_STYLE_OPTIONS,
  PIN_VARIANT_OPTIONS,
  SEASONAL_OVERRIDE_OPTIONS,
  LINK_ATTRIBUTE_OPTIONS,
  KEYWORD_MIN_WORDS,
  KEYWORD_MAX_WORDS,
  MAX_PRODUCT_LINKS,
  IMAGE_STYLE_OPTIONS,
  IMAGE_DIMENSION_OPTIONS,
  ARTICLE_TONE_OPTIONS,
  CONTENT_STRATEGY_OPTIONS,
  H2_SECTION_OPTIONS,
  SCHEMA_TYPE_OPTIONS,
  TITLE_FORMULA_OPTIONS,
  AUTHORITY_SOURCE_OPTIONS,
  PUBLISHING_MODE_OPTIONS,
} from "./lib/constants";
import { parseProductFile } from "./lib/product-matcher";

// ─── Shared Styles ───

const cardStyle: React.CSSProperties = {
  background: "#1a2035",
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#94a3b8",
  marginBottom: 6,
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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 70,
  resize: "vertical" as const,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "#10b981",
  marginBottom: 14,
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const toggleTrack: React.CSSProperties = {
  width: 44,
  height: 24,
  borderRadius: 12,
  cursor: "pointer",
  transition: "background 0.2s",
  display: "flex",
  alignItems: "center",
  padding: 2,
  flexShrink: 0,
};

const toggleKnob: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: 10,
  background: "white",
  transition: "transform 0.2s",
};

// ─── Toggle Component ───

function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <div
        style={{ ...toggleTrack, background: value ? "#10b981" : "#334155" }}
        onClick={() => onChange(!value)}
      >
        <div style={{ ...toggleKnob, transform: value ? "translateX(20px)" : "translateX(0)" }} />
      </div>
      <span style={{ fontSize: 14, color: "#e2e8f0" }}>{label}</span>
    </div>
  );
}

// ─── InputForm Props ───

interface InputFormProps {
  inputs: FormInputs;
  onUpdate: (inputs: FormInputs) => void;
  onGenerate: () => void;
  generating: boolean;
  keywordError?: string;
}

// ─── InputForm Component ───

export default function InputForm({
  inputs,
  onUpdate,
  onGenerate,
  generating,
  keywordError,
}: InputFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});

  const refSecondary = useRef<HTMLInputElement>(null);
  const [msgSecondary, setMsgSecondary] = useState("");
  const refQualifier = useRef<HTMLInputElement>(null);
  const [msgQualifier, setMsgQualifier] = useState("");
  const refContextual = useRef<HTMLInputElement>(null);
  const [msgContextual, setMsgContextual] = useState("");

  useEffect(() => {
    const storedLinkAttr = localStorage.getItem('pinverse_link_attribute');
    if (storedLinkAttr === 'nofollow noopener') {
      localStorage.setItem('pinverse_link_attribute', 'sponsored noopener');
    }
  }, []);

  const handleKeywordUpload = (e: React.ChangeEvent<HTMLInputElement>, current: string, updater: (val: string) => void, setMsg: (msg: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const extracted = text.split(/\r?\n/).map(line => line.split(',')[0].trim()).filter(Boolean);
      const newKw = current ? current + ", " + extracted.join(", ") : extracted.join(", ");
      updater(newKw);
      setMsg(`✓ Added ${extracted.length} keywords from file`);
      setTimeout(() => setMsg(""), 3000);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const saveToLocalStorage = (key: string, value: string, id: string) => {
    localStorage.setItem(key, value);
    setSavedKeys(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setSavedKeys(prev => ({ ...prev, [id]: false })), 2000);
  };

  // Helpers
  const updateCore = (patch: Partial<typeof inputs.core>) =>
    onUpdate({ ...inputs, core: { ...inputs.core, ...patch } });
  const updateKeywords = (patch: Partial<typeof inputs.keywords>) =>
    onUpdate({ ...inputs, keywords: { ...inputs.keywords, ...patch } });
  const updateMonetization = (patch: Partial<typeof inputs.monetization>) =>
    onUpdate({ ...inputs, monetization: { ...inputs.monetization, ...patch } });
  const updatePinterest = (patch: Partial<typeof inputs.pinterest>) =>
    onUpdate({ ...inputs, pinterest: { ...inputs.pinterest, ...patch } });
  const updateAdvanced = (patch: Partial<typeof inputs.advanced>) =>
    onUpdate({ ...inputs, advanced: { ...inputs.advanced, ...patch } });
  const updateImageSettings = (patch: Partial<typeof inputs.imageSettings>) =>
    onUpdate({ ...inputs, imageSettings: { ...inputs.imageSettings, ...patch } });
  const updateWordpress = (patch: Partial<typeof inputs.wordpress>) =>
    onUpdate({ ...inputs, wordpress: { ...inputs.wordpress, ...patch } });
  const updateBatch = (patch: Partial<typeof inputs.batch>) =>
    onUpdate({ ...inputs, batch: { ...inputs.batch, ...patch } });
  const updateOverrides = (patch: Partial<typeof inputs.overrides>) =>
    onUpdate({ ...inputs, overrides: { ...inputs.overrides, ...patch } });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseProductFile(text);
      updateMonetization({ productCatalog: parsed });
    };
    reader.readAsText(file);
  };

  // Product link handlers
  const addProductLink = () => {
    if (inputs.monetization.productLinks.length >= MAX_PRODUCT_LINKS) return;
    updateMonetization({
      productLinks: [...inputs.monetization.productLinks, { productName: "", url: "" }],
    });
  };
  const removeProductLink = (idx: number) => {
    updateMonetization({
      productLinks: inputs.monetization.productLinks.filter((_: ProductLink, i: number) => i !== idx),
    });
  };
  const updateProductLink = (idx: number, patch: Partial<ProductLink>) => {
    const links = [...inputs.monetization.productLinks];
    links[idx] = { ...links[idx], ...patch };
    updateMonetization({ productLinks: links });
  };

  // Validate keyword
  const keywordWords = inputs.core.mainKeyword.trim().split(/\s+/).filter(Boolean).length;
  const kwValid = inputs.batch.mode === "batch" 
    ? inputs.batch.keywords.filter(k => k.trim()).length > 0
    : (inputs.core.mainKeyword.trim().length > 0 &&
       keywordWords >= KEYWORD_MIN_WORDS &&
       keywordWords <= KEYWORD_MAX_WORDS);

  const canGenerate = kwValid && inputs.core.contentType && !generating;

  return (
    <div>
      {/* ━━━ GROUP 1: Core Inputs ━━━ */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>📝 Core Inputs</div>

        {/* Main/Batch Keyword */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              {inputs.batch.mode === "batch" ? "Batch Keywords (one per line)" : "Main Keyword"}{" "}
              <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <Toggle
              value={inputs.batch.mode === "batch"}
              onChange={(v) => updateBatch({ mode: v ? "batch" : "single" })}
              label="Batch Mode"
            />
          </div>

          {inputs.batch.mode === "single" ? (
            <>
              <input
                type="text"
                placeholder='e.g., "easy crockpot dinner recipes"'
                value={inputs.core.mainKeyword}
                onChange={(e) => updateCore({ mainKeyword: e.target.value })}
                style={{
                  ...inputStyle,
                  borderColor: keywordError ? "#ef4444" : inputs.core.mainKeyword && !kwValid ? "#eab308" : "#334155",
                }}
              />
              {inputs.core.mainKeyword && !kwValid && (
                <div style={{ color: "#eab308", fontSize: 12, marginTop: 4 }}>
                  Keyword should be {KEYWORD_MIN_WORDS}-{KEYWORD_MAX_WORDS} words ({keywordWords} words entered)
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ marginBottom: 12, padding: 12, background: "#0f1623", borderRadius: 8, border: "1px dashed #334155" }}>
                <label style={labelStyle}>Upload Keyword File (.txt/.csv)</label>
                <input 
                  type="file" 
                  accept=".txt,.csv" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result as string;
                      // Split by newlines and handle CSV rows simply
                      const extracted = text.split(/\r?\n/).map(line => line.split(',')[0].trim()).filter(Boolean);
                      // Append to existing, or replace? "populate the textarea"
                      updateBatch({ keywords: extracted });
                    };
                    reader.readAsText(file);
                  }} 
                  style={{ color: "#e2e8f0", fontSize: 13 }} 
                />
              </div>
              <textarea
                placeholder="Enter keywords here, one per line..."
                value={inputs.batch.keywords.join("\n")}
                onChange={(e) => updateBatch({ keywords: e.target.value.split("\n") })}
                style={{ ...textareaStyle, minHeight: 120, borderColor: keywordError ? "#ef4444" : "#334155" }}
              />
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                {inputs.batch.keywords.filter(k => k.trim()).length} keywords loaded.
              </div>
            </>
          )}

          {keywordError && (
            <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{keywordError}</div>
          )}
        </div>

        {/* Content Type + Word Count (side by side) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>
              Content Type <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={inputs.core.contentType}
              onChange={(e) => updateCore({ contentType: e.target.value as ContentType })}
              style={selectStyle}
            >
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Word Count Target</label>
            <select
              value={inputs.core.wordCountTarget}
              onChange={(e) => updateCore({ wordCountTarget: e.target.value as WordCountTarget })}
              style={selectStyle}
            >
              {WORD_COUNT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Target Site */}
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Target Site</label>
          <input
            type="url"
            placeholder="https://yourblog.com"
            value={inputs.core.targetSite}
            onChange={(e) => updateCore({ targetSite: e.target.value })}
            style={inputStyle}
          />
        </div>
      </div>

      {/* ━━━ GROUP 2: Keyword Tiers ━━━ */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>🎯 Keyword Tiers</div>
        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
          Leave empty to have AI suggest keywords during research stage
        </p>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Secondary Keywords</label>
            <button type="button" onClick={() => refSecondary.current?.click()} style={{ fontSize: 12, padding: "4px 8px", background: "#334155", color: "#e2e8f0", border: "1px solid #475569", borderRadius: 4, cursor: "pointer" }}>
              📁 Upload .txt, .CSV
            </button>
            <input type="file" accept=".txt,.csv" ref={refSecondary} style={{ display: "none" }} onChange={(e) => handleKeywordUpload(e, inputs.keywords.secondaryKeywords || "", (val) => updateKeywords({ secondaryKeywords: val }), setMsgSecondary)} />
          </div>
          <textarea
            placeholder='Comma-separated: "slow cooker chicken, crockpot beef stew"'
            value={inputs.keywords.secondaryKeywords}
            onChange={(e) => updateKeywords({ secondaryKeywords: e.target.value })}
            style={textareaStyle}
          />
          {msgSecondary && <div style={{ color: "#10b981", fontSize: 12, marginTop: 4 }}>{msgSecondary}</div>}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Qualifier Keywords</label>
            <button type="button" onClick={() => refQualifier.current?.click()} style={{ fontSize: 12, padding: "4px 8px", background: "#334155", color: "#e2e8f0", border: "1px solid #475569", borderRadius: 4, cursor: "pointer" }}>
              📁 Upload .txt, .CSV
            </button>
            <input type="file" accept=".txt,.csv" ref={refQualifier} style={{ display: "none" }} onChange={(e) => handleKeywordUpload(e, inputs.keywords.qualifierKeywords || "", (val) => updateKeywords({ qualifierKeywords: val }), setMsgQualifier)} />
          </div>
          <textarea
            placeholder='"for beginners", "under 30 minutes", "budget-friendly", "keto"'
            value={inputs.keywords.qualifierKeywords}
            onChange={(e) => updateKeywords({ qualifierKeywords: e.target.value })}
            style={textareaStyle}
          />
          {msgQualifier && <div style={{ color: "#10b981", fontSize: 12, marginTop: 4 }}>{msgQualifier}</div>}
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Contextual Keywords</label>
            <button type="button" onClick={() => refContextual.current?.click()} style={{ fontSize: 12, padding: "4px 8px", background: "#334155", color: "#e2e8f0", border: "1px solid #475569", borderRadius: 4, cursor: "pointer" }}>
              📁 Upload .txt, .CSV
            </button>
            <input type="file" accept=".txt,.csv" ref={refContextual} style={{ display: "none" }} onChange={(e) => handleKeywordUpload(e, inputs.keywords.contextualKeywords || "", (val) => updateKeywords({ contextualKeywords: val }), setMsgContextual)} />
          </div>
          <textarea
            placeholder='"comfort food, family dinner, weeknight meals"'
            value={inputs.keywords.contextualKeywords}
            onChange={(e) => updateKeywords({ contextualKeywords: e.target.value })}
            style={textareaStyle}
          />
          {msgContextual && <div style={{ color: "#10b981", fontSize: 12, marginTop: 4 }}>{msgContextual}</div>}
        </div>
      </div>

      {/* ━━━ GROUP 3: Monetization ━━━ */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>💰 Monetization</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Product Store URL</label>
            <input
              type="url"
              placeholder="https://kitchentools4u.com"
              value={inputs.monetization.productStoreUrl}
              onChange={(e) => updateMonetization({ productStoreUrl: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Amazon Affiliate Tag (Optional)</label>
            <input
              type="text"
              placeholder="e.g. foodblog-20"
              value={inputs.monetization.amazonTag || ""}
              onChange={(e) => updateMonetization({ amazonTag: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 14, padding: 12, background: "#0f1623", borderRadius: 8, border: "1px dashed #334155" }}>
          <label style={labelStyle}>Bulk Product Catalog Upload (.txt/.csv)</label>
          <input type="file" accept=".txt,.csv" onChange={handleFileUpload} style={{ color: "#e2e8f0", fontSize: 13 }} />
          {inputs.monetization.productCatalog && inputs.monetization.productCatalog.length > 0 && (
            <div style={{ fontSize: 12, color: "#10b981", marginTop: 8 }}>
              ✓ Loaded {inputs.monetization.productCatalog.length} products automatically.
            </div>
          )}
        </div>

        {/* Product Links Repeater */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            Product Links ({inputs.monetization.productLinks.length}/{MAX_PRODUCT_LINKS})
          </label>
          {inputs.monetization.productLinks.map((link: ProductLink, idx: number) => (
            <div
              key={idx}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 8 }}
            >
              <input
                type="text"
                placeholder="Product Name"
                value={link.productName}
                onChange={(e) => updateProductLink(idx, { productName: e.target.value })}
                style={inputStyle}
              />
              <input
                type="url"
                placeholder="https://..."
                value={link.url}
                onChange={(e) => updateProductLink(idx, { url: e.target.value })}
                style={inputStyle}
              />
              <button
                onClick={() => removeProductLink(idx)}
                style={{
                  background: "#991b1b",
                  border: "none",
                  borderRadius: 6,
                  color: "white",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            </div>
          ))}
          {inputs.monetization.productLinks.length < MAX_PRODUCT_LINKS && (
            <button
              onClick={addProductLink}
              style={{
                background: "transparent",
                border: "1px dashed #334155",
                borderRadius: 8,
                color: "#94a3b8",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: 13,
                width: "100%",
              }}
            >
              + Add Product Link
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
          <Toggle
            value={inputs.monetization.affiliateDisclosure}
            onChange={(v) => updateMonetization({ affiliateDisclosure: v })}
            label="Include FTC Disclosure"
          />
          <div>
            <label style={labelStyle}>Link Attribute</label>
            <select
              value={inputs.monetization.linkAttribute}
              onChange={(e) => updateMonetization({ linkAttribute: e.target.value as LinkAttribute })}
              style={selectStyle}
            >
              {LINK_ATTRIBUTE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ━━━ GROUP 3.5: AI Image Settings ━━━ */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>📸 AI Featured Image</div>
        
        <Toggle
          value={inputs.imageSettings.enabled}
          onChange={(v) => updateImageSettings({ enabled: v })}
          label="Generate Featured Image"
        />

        {inputs.imageSettings.enabled && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Style / Mood</label>
                <select
                  value={inputs.imageSettings.style}
                  onChange={(e) => updateImageSettings({ style: e.target.value as ImageStyle })}
                  style={selectStyle}
                >
                  {IMAGE_STYLE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Dimensions (Featured vs Pinterest)</label>
                <select
                  value={inputs.imageSettings.dimensions}
                  onChange={(e) => updateImageSettings({ dimensions: e.target.value as ImageDimensions })}
                  style={selectStyle}
                >
                  {IMAGE_DIMENSION_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label} ({d.ratio})</option>)}
                </select>
              </div>
            </div>
            
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>ImgBB API Key (For hosting)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="password"
                  placeholder="Required to upload images to ImgBB"
                  value={inputs.imageSettings.imgbbApiKey}
                  onChange={(e) => updateImageSettings({ imgbbApiKey: e.target.value })}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button 
                  type="button"
                  onClick={() => saveToLocalStorage("pinverse_imgbb_api_key", inputs.imageSettings.imgbbApiKey, "imgbb")}
                  style={{ padding: "0 12px", background: "#334155", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0", fontSize: 13, cursor: "pointer" }}
                >
                  💾 Save
                </button>
                {savedKeys["imgbb"] && <span style={{ color: "#4ade80", fontSize: 13, display: "flex", alignItems: "center" }}>Saved ✓</span>}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Prompt Instructions</label>
              <textarea
                value={inputs.imageSettings.promptInstructions}
                onChange={(e) => updateImageSettings({ promptInstructions: e.target.value })}
                style={textareaStyle}
              />
            </div>
          </div>
        )}
      </div>

      {/* ━━━ GROUP 3.6: WordPress Settings ━━━ */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>📰 WordPress Integration</div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>WP Site URL</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="url"
                placeholder="https://mysite.com"
                value={inputs.wordpress.siteUrl}
                onChange={(e) => updateWordpress({ siteUrl: e.target.value })}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button 
                type="button"
                onClick={() => saveToLocalStorage("pinverse_wp_url", inputs.wordpress.siteUrl, "wp_url")}
                style={{ padding: "0 12px", background: "#334155", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0", fontSize: 13, cursor: "pointer" }}
              >
                💾 Save
              </button>
              {savedKeys["wp_url"] && <span style={{ color: "#4ade80", fontSize: 13, display: "flex", alignItems: "center" }}>Saved ✓</span>}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Publishing Mode</label>
            <select
              value={inputs.wordpress.publishingMode}
              onChange={(e) => updateWordpress({ publishingMode: e.target.value as PublishingMode })}
              style={selectStyle}
            >
              {PUBLISHING_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Username</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="admin"
                value={inputs.wordpress.username}
                onChange={(e) => updateWordpress({ username: e.target.value })}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button 
                type="button"
                onClick={() => saveToLocalStorage("pinverse_wp_user", inputs.wordpress.username, "wp_user")}
                style={{ padding: "0 12px", background: "#334155", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0", fontSize: 13, cursor: "pointer" }}
              >
                💾 Save
              </button>
              {savedKeys["wp_user"] && <span style={{ color: "#4ade80", fontSize: 13, display: "flex", alignItems: "center" }}>Saved ✓</span>}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Application Password</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                placeholder="xxxx xxxx xxxx xxxx"
                value={inputs.wordpress.appPassword}
                onChange={(e) => updateWordpress({ appPassword: e.target.value })}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button 
                type="button"
                onClick={() => saveToLocalStorage("pinverse_wp_pass", inputs.wordpress.appPassword, "wp_pass")}
                style={{ padding: "0 12px", background: "#334155", border: "1px solid #475569", borderRadius: 8, color: "#e2e8f0", fontSize: 13, cursor: "pointer" }}
              >
                💾 Save
              </button>
              {savedKeys["wp_pass"] && <span style={{ color: "#4ade80", fontSize: 13, display: "flex", alignItems: "center" }}>Saved ✓</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ━━━ GROUP 4: Pinterest Options ━━━ */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>📌 Pinterest Options</div>

        <Toggle
          value={inputs.pinterest.generatePinCopy}
          onChange={(v) => updatePinterest({ generatePinCopy: v })}
          label="Generate Pin Copy"
        />

        {inputs.pinterest.generatePinCopy && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Number of Pin Variants</label>
                <select
                  value={inputs.pinterest.numberOfPinVariants}
                  onChange={(e) =>
                    updatePinterest({ numberOfPinVariants: Number(e.target.value) as PinVariantCount })
                  }
                  style={selectStyle}
                >
                  {PIN_VARIANT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} variants
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Pin Style</label>
                <select
                  value={inputs.pinterest.pinStyle}
                  onChange={(e) => updatePinterest({ pinStyle: e.target.value as PinStyle })}
                  style={selectStyle}
                >
                  {PIN_STYLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Target Boards</label>
              <textarea
                placeholder="Enter existing board names for matching (one per line)"
                value={inputs.pinterest.targetBoards}
                onChange={(e) => updatePinterest({ targetBoards: e.target.value })}
                style={textareaStyle}
              />
            </div>
          </>
        )}
      </div>

      {/* ━━━ GROUP 5: Advanced Options (Collapsible) ━━━ */}
      <div style={cardStyle}>
        <div
          style={{ ...sectionTitleStyle, cursor: "pointer", userSelect: "none" }}
          onClick={() => setAdvancedOpen(!advancedOpen)}
        >
          ⚙️ Advanced Options
          <span style={{ fontSize: 12, color: "#64748b", marginLeft: "auto" }}>
            {advancedOpen ? "▲ Collapse" : "▼ Expand"}
          </span>
        </div>

        {advancedOpen && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Writing Persona</label>
                <select
                  value={inputs.advanced.writingPersona}
                  onChange={(e) =>
                    updateAdvanced({ writingPersona: e.target.value as WritingPersona })
                  }
                  style={selectStyle}
                >
                  {WRITING_PERSONA_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tone</label>
                <select
                  value={inputs.advanced.tone}
                  onChange={(e) => updateAdvanced({ tone: e.target.value as Tone })}
                  style={selectStyle}
                >
                  {TONE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <Toggle
                value={inputs.advanced.includeRecipeCard}
                onChange={(v) => updateAdvanced({ includeRecipeCard: v })}
                label="Include Recipe Card"
              />
              <Toggle
                value={inputs.advanced.includeFaqSection}
                onChange={(v) => updateAdvanced({ includeFaqSection: v })}
                label="Include FAQ Section"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <Toggle
                value={inputs.advanced.includeNutritionInfo}
                onChange={(v) => updateAdvanced({ includeNutritionInfo: v })}
                label="Include Nutrition Info"
              />
              <Toggle
                value={inputs.advanced.aiSearchOptimization}
                onChange={(v) => updateAdvanced({ aiSearchOptimization: v })}
                label="AI Search Optimization"
              />
            </div>

            <div>
              <label style={labelStyle}>Seasonal Override</label>
              <select
                value={inputs.advanced.seasonalOverride}
                onChange={(e) =>
                  updateAdvanced({ seasonalOverride: e.target.value as SeasonalOverride })
                }
                style={selectStyle}
              >
                {SEASONAL_OVERRIDE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            
            <hr style={{ borderColor: "#334155", margin: "20px 0" }} />
            
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc", marginBottom: 14 }}>
              SEO Overrides
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Title Formula</label>
                <select
                  value={inputs.overrides.titleFormula}
                  onChange={(e) => updateOverrides({ titleFormula: e.target.value as TitleFormula })}
                  style={selectStyle}
                >
                  {TITLE_FORMULA_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Schema Type</label>
                <select
                  value={inputs.overrides.schemaType}
                  onChange={(e) => updateOverrides({ schemaType: e.target.value as SchemaTypeOverride })}
                  style={selectStyle}
                >
                  {SCHEMA_TYPE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>H2 Sections Count</label>
                <select
                  value={inputs.overrides.h2Sections}
                  onChange={(e) => updateOverrides({ h2Sections: e.target.value as H2SectionCount })}
                  style={selectStyle}
                >
                  {H2_SECTION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Authority Links Source</label>
                <select
                  value={inputs.overrides.authoritySource}
                  onChange={(e) => updateOverrides({ authoritySource: e.target.value as AuthoritySource })}
                  style={selectStyle}
                >
                  {AUTHORITY_SOURCE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ━━━ Generate Button ━━━ */}
      <button
        onClick={onGenerate}
        disabled={generating}
        style={{
          width: "100%",
          padding: "14px 24px",
          background: "linear-gradient(135deg, #10b981, #059669)",
          border: "none",
          borderRadius: 12,
          color: "white",
          fontSize: 16,
          fontWeight: 700,
          cursor: generating ? "wait" : "pointer",
          transition: "all 0.2s",
          opacity: generating ? 0.7 : 1,
        }}
      >
        {generating ? "⏳ Generating..." : "🚀 Generate Content"}
      </button>
    </div>
  );
}
