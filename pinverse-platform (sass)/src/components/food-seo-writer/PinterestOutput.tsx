"use client";

import { useState } from "react";
import type { PinterestCopyResult, FormInputs, ProviderSettings, GeneratedImage } from "./types";
import { generateImageAction } from "@/app/actions/food-seo-writer/generate-v2";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        padding: "4px 10px",
        background: copied ? "#22c55e20" : "#334155",
        border: `1px solid ${copied ? "#22c55e" : "#475569"}`,
        borderRadius: 4,
        color: copied ? "#22c55e" : "#94a3b8",
        fontSize: 11,
        cursor: "pointer",
      }}
    >
      {copied ? "✓" : "Copy"}
    </button>
  );
}

interface PinterestOutputProps {
  pinterest: PinterestCopyResult;
  keyword: string;
  inputs: FormInputs;
  provider: ProviderSettings;
}

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#e2e8f0",
  marginBottom: 10,
  marginTop: 20,
};

const itemCard: React.CSSProperties = {
  background: "#0f1623",
  border: "1px solid #334155",
  borderRadius: 8,
  padding: 12,
  marginBottom: 8,
};

export default function PinterestOutput({ pinterest, keyword, inputs, provider }: PinterestOutputProps) {
  const [images, setImages] = useState<GeneratedImage[]>(pinterest.pinImages || []);
  const [showRegenOptions, setShowRegenOptions] = useState(false);
  const [regenerateTitle, setRegenerateTitle] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenProgress, setRegenProgress] = useState({ done: 0, total: 0 });

  const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;

  const handleExportCsv = () => {
    const headers = [
      "pin_image_url", "pin_title", "pin_description", "tobi_text", 
      "board_suggestion", "board_description", "og_title", "og_description", "og_image"
    ];
    
    // Parse OG once
    const ogTitle = pinterest.ogMetaTags?.match(/og:title" content="([^"]+)"/)?.[1] || "";
    const ogDesc = pinterest.ogMetaTags?.match(/og:description" content="([^"]+)"/)?.[1] || "";
    const ogImg = pinterest.ogMetaTags?.match(/og:image" content="([^"]+)"/)?.[1] || "";

    const rows: string[] = [headers.join(",")];
    const numRows = Math.max(
      pinterest.pinTitles.length,
      pinterest.pinDescriptions.length,
      images.length
    );

    for (let i = 0; i < numRows; i++) {
      // For images, if we run out, repeat the last one
      const imgObj = images[i] || images[images.length - 1] || { hostedUrl: "" };
      const row = [
        escapeCsv(imgObj.hostedUrl || ""),
        escapeCsv(pinterest.pinTitles[i]?.text || ""),
        escapeCsv(pinterest.pinDescriptions[i]?.text || ""),
        escapeCsv(pinterest.tobiOverlays[i]?.text || ""),
        escapeCsv(pinterest.boardSuggestions[i]?.name || ""),
        escapeCsv(pinterest.boardSuggestions[i]?.description || ""),
        escapeCsv(ogTitle),
        escapeCsv(ogDesc),
        escapeCsv(ogImg)
      ];
      rows.push(row.join(","));
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `${keyword.replace(/\s+/g, '-')}-pinterest-${dateStr}.csv`;
    link.click();
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setRegenProgress({ done: 0, total: pinterest.pinTitles.length });
    setShowRegenOptions(false);
    
    const newImages = [...images];
    
    for (let i = 0; i < pinterest.pinTitles.length; i++) {
      const pinTitleText = pinterest.pinTitles[i]?.text || "";
      const textOverlay = regenerateTitle.trim() || pinTitleText;
      const promptTemplate = inputs.imageSettings.promptInstructions;
      const pinPrompt = `Pinterest pin image for: "${pinTitleText}". Food photography style. Vertical portrait format. Include the text "${textOverlay}" as a bold overlay at the bottom of the image with a dark semi-transparent background strip.`;
      
      let finalUrl = "";
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await generateImageAction(
            pinTitleText,
            pinPrompt,
            promptTemplate,
            inputs.imageSettings.style,
            inputs.imageSettings.colorMood,
            "Pinterest Portrait 2:3",
            provider as any,
            inputs.imageSettings.imgbbApiKey,
            'pin'
          );
          if (res.success && res.imageUrl) {
            finalUrl = res.imageUrl;
            break;
          }
        } catch (e) {
          // ignore loop
        }
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
      }

      if (finalUrl) {
        newImages[i] = { sectionHeading: `Pin Variant ${i + 1}`, altText: textOverlay, hostedUrl: finalUrl };
        setImages([...newImages]);
      }
      setRegenProgress(prev => ({ ...prev, done: prev.done + 1 }));
    }
    
    setIsRegenerating(false);
  };

  return (
    <div>
      {/* Top Banner Actions */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={handleExportCsv}
          style={{
            padding: "8px 16px",
            background: "#0ea5e920",
            border: "1px solid #0ea5e9",
            borderRadius: 6,
            color: "#38bdf8",
            fontSize: 13,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          📥 Export Pinterest CSV
        </button>

        <button
          onClick={() => setShowRegenOptions(!showRegenOptions)}
          disabled={isRegenerating}
          style={{
            padding: "8px 16px",
            background: "#ca8a0420",
            border: "1px solid #ca8a04",
            borderRadius: 6,
            color: "#fde047",
            fontSize: 13,
            cursor: isRegenerating ? "not-allowed" : "pointer",
            fontWeight: 600,
            opacity: isRegenerating ? 0.5 : 1
          }}
        >
          {isRegenerating ? `⏳ Regenerating (${regenProgress.done}/${regenProgress.total})...` : "🔄 Regenerate Pin Images"}
        </button>
      </div>

      {showRegenOptions && !isRegenerating && (
        <div style={{ background: "#0f1623", border: "1px solid #334155", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: "12px" }}>Regenerate Pin Images</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: "8px" }}>Title overlay (optional — leave blank to reuse variant titles):</div>
          <input 
            type="text"
            value={regenerateTitle}
            onChange={(e) => setRegenerateTitle(e.target.value)}
            placeholder="Custom title text..."
            style={{ width: "100%", padding: "8px 12px", background: "#1e293b", border: "1px solid #475569", borderRadius: 4, color: "#fff", marginBottom: "12px" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleRegenerate} style={{ padding: "6px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600}}>🔄 Regenerate All</button>
            <button onClick={() => setShowRegenOptions(false)} style={{ padding: "6px 12px", background: "#334155", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}>✕ Cancel</button>
          </div>
        </div>
      )}

      {/* ━━━ Generated Pin Images ━━━ */}
      {images && images.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={sectionTitle}>📸 Generated Pin Images</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {images.map((img, i) => (
              <div key={i} style={{ ...itemCard, padding: 8, textAlign: "center" }}>
                <img 
                  src={img.hostedUrl} 
                  alt={img.altText} 
                  style={{ width: "100%", height: "auto", borderRadius: 4, aspectRatio: "2/3", objectFit: "cover", border: "1px solid #334155" }} 
                />
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {img.altText}
                </div>
                <a 
                  href={img.hostedUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: "inline-block", marginTop: 8, fontSize: 12, color: "#38bdf8", textDecoration: "none" }}
                >
                  View Full Size
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ━━━ Pin Titles ━━━ */}
      <div style={sectionTitle}>📌 Pin Title Variants</div>
      {pinterest.pinTitles.map((t, i) => (
        <div key={i} style={{ ...itemCard, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, color: "#e2e8f0" }}>{t.text}</div>
            <div style={{ fontSize: 11, color: t.charCount <= 100 ? "#22c55e" : "#ef4444", marginTop: 4 }}>
              {t.charCount} chars {t.charCount > 100 ? "(over limit)" : "✓"}
            </div>
          </div>
          <CopyBtn text={t.text} />
        </div>
      ))}

      {/* ━━━ Pin Descriptions ━━━ */}
      <div style={sectionTitle}>📝 Pin Description Variants</div>
      {pinterest.pinDescriptions.map((d, i) => (
        <div key={i} style={itemCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#10b981" }}>Variant {i + 1}</span>
            <CopyBtn text={d.text} />
          </div>
          <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>{d.text}</div>
          <div
            style={{
              fontSize: 11,
              color: d.charCount >= 100 && d.charCount <= 500 ? "#22c55e" : "#eab308",
              marginTop: 6,
            }}
          >
            {d.charCount} chars {d.charCount >= 100 && d.charCount <= 500 ? "✓" : "(outside 100-500 range)"}
          </div>
        </div>
      ))}

      {/* ━━━ TOBI Overlays ━━━ */}
      <div style={sectionTitle}>🎯 TOBI Text Overlays (Text Over Background Image)</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
        {pinterest.tobiOverlays.map((t, i) => (
          <div key={i} style={{ ...itemCard, textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>
              {t.text}
            </div>
            <div style={{ fontSize: 11, color: t.wordCount <= 8 ? "#22c55e" : "#ef4444" }}>
              {t.wordCount} words {t.wordCount <= 8 ? "✓" : "(over 8 word limit)"}
            </div>
          </div>
        ))}
      </div>

      {/* ━━━ Board Suggestions ━━━ */}
      <div style={sectionTitle}>📋 Board Suggestions</div>
      {pinterest.boardSuggestions.map((b, i) => (
        <div key={i} style={itemCard}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#10b981" }}>{b.name}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{b.description}</div>
        </div>
      ))}

      {/* ━━━ Hidden Pins ━━━ */}
      <div style={sectionTitle}>👻 Hidden Pin Copies (for team members)</div>
      {pinterest.hiddenPins.map((h, i) => (
        <div key={i} style={itemCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{h.title}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{h.description}</div>
              <div style={{ fontSize: 11, color: "#10b981", marginTop: 4 }}>TOBI: {h.tobiText}</div>
            </div>
            <CopyBtn text={`Title: ${h.title}\nDescription: ${h.description}\nTOBI: ${h.tobiText}`} />
          </div>
        </div>
      ))}

      {/* ━━━ OG Meta Tags ━━━ */}
      {pinterest.ogMetaTags && (
        <>
          <div style={sectionTitle}>🏷️ OG Meta Tags</div>
          <div style={itemCard}>
            <pre style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "pre-wrap", margin: 0, fontFamily: "monospace" }}>
              {pinterest.ogMetaTags}
            </pre>
            <div style={{ marginTop: 8 }}>
              <CopyBtn text={pinterest.ogMetaTags} />
            </div>
          </div>
        </>
      )}

      {/* ━━━ Image Size Recommendation ━━━ */}
      <div
        style={{
          marginTop: 20,
          padding: "12px 16px",
          background: "#14532d20",
          border: "1px solid #22c55e30",
          borderRadius: 8,
          fontSize: 13,
          color: "#94a3b8",
          lineHeight: 1.5,
        }}
      >
        📐 <strong style={{ color: "#e2e8f0" }}>Pinterest Image Spec:</strong> 1000×1500px (2:3 ratio),
        high quality, text overlay readable on mobile. Use TOBI text with high-contrast background
        for best save rates.
      </div>
    </div>
  );
}
