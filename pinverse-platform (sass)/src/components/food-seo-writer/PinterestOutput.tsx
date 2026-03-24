"use client";

import { useState } from "react";
import type { PinterestCopyResult } from "./types";

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

export default function PinterestOutput({ pinterest }: PinterestOutputProps) {
  return (
    <div>
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
