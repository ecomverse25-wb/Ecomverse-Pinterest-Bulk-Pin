"use client";

import { useState } from "react";
import type { SchemaValidation, SchemaValidationStatus } from "./types";

interface SchemaOutputProps {
  title: string;
  schema: object | undefined;
  validations: SchemaValidation[];
}

const STATUS_ICONS: Record<SchemaValidationStatus, { icon: string; color: string }> = {
  valid: { icon: "✓", color: "#22c55e" },
  warning: { icon: "⚠", color: "#eab308" },
  error: { icon: "✗", color: "#ef4444" },
};

export default function SchemaOutput({ title, schema, validations }: SchemaOutputProps) {
  const [copied, setCopied] = useState(false);
  const schemaJson = schema ? JSON.stringify(schema, null, 2) : "";
  const scriptTag = schema
    ? `<script type="application/ld+json">\n${schemaJson}\n</script>`
    : "";

  const handleCopy = async () => {
    if (!scriptTag) return;
    await navigator.clipboard.writeText(scriptTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!schema) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: 40,
          color: "#64748b",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
        <div style={{ fontSize: 16 }}>No {title} generated for this content type</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
          {title} — JSON-LD
        </h3>
        <button
          onClick={handleCopy}
          style={{
            padding: "6px 14px",
            background: copied ? "#22c55e20" : "#334155",
            border: `1px solid ${copied ? "#22c55e" : "#475569"}`,
            borderRadius: 6,
            color: copied ? "#22c55e" : "#e2e8f0",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copied ? "✓ Copied!" : "Copy Schema"}
        </button>
      </div>

      {/* Validation Status */}
      <div
        style={{
          background: "#0f1623",
          borderRadius: 8,
          padding: 12,
          marginBottom: 14,
          border: "1px solid #334155",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>
          Validation
        </div>
        {validations.map((v, i) => {
          const si = STATUS_ICONS[v.status];
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 0",
                fontSize: 13,
              }}
            >
              <span style={{ color: si.color, fontWeight: 700, width: 16, textAlign: "center" }}>
                {si.icon}
              </span>
              <span style={{ color: v.status === "valid" ? si.color : "#e2e8f0" }}>
                {v.message}
              </span>
              {v.field && (
                <span style={{ color: "#64748b", fontSize: 11 }}>({v.field})</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Schema Code Block */}
      <div
        style={{
          background: "#0f1623",
          borderRadius: 8,
          padding: 16,
          border: "1px solid #334155",
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        <pre
          style={{
            color: "#e2e8f0",
            fontSize: 12,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            margin: 0,
          }}
        >
          <span style={{ color: "#64748b" }}>{'<script type="application/ld+json">'}</span>
          {"\n"}
          {schemaJson}
          {"\n"}
          <span style={{ color: "#64748b" }}>{"</script>"}</span>
        </pre>
      </div>

      {/* aggregateRating warning for Recipe */}
      {title === "Recipe Schema" && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "#78350f20",
            border: "1px solid #92400e",
            borderRadius: 8,
            fontSize: 12,
            color: "#fbbf24",
            lineHeight: 1.5,
          }}
        >
          ⚠️ <strong>aggregateRating</strong> is intentionally omitted. Only add it if your post has
          real user ratings. Google penalizes fake structured data ratings.
        </div>
      )}
    </div>
  );
}
