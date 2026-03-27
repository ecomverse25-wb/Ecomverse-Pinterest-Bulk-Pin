"use client";

import { useState } from "react";
import type { PipelineResult, BulkPinCsvRow, FormInputs } from "./types";
import { useWordPressPublishing } from "./hooks/useWordPressPublishing";

interface ExportButtonsProps {
  result: PipelineResult;
  keyword: string;
  inputs: FormInputs;
}

function ExportButton({
  onClick,
  icon,
  label,
  sublabel,
  color = "#334155",
}: {
  onClick: () => void;
  icon: string;
  label: string;
  sublabel: string;
  color?: string;
}) {
  const [clicked, setClicked] = useState(false);

  return (
    <button
      onClick={() => {
        onClick();
        setClicked(true);
        setTimeout(() => setClicked(false), 2000);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "14px 18px",
        background: clicked ? "#22c55e15" : "#0f1623",
        border: `1px solid ${clicked ? "#22c55e" : color}`,
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 0.2s",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: 24, width: 34, textAlign: "center" }}>{clicked ? "✓" : icon}</span>
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: clicked ? "#22c55e" : "#e2e8f0",
          }}
        >
          {clicked ? "Done!" : label}
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>{sublabel}</div>
      </div>
    </button>
  );
}

// ─── Export Helpers ───

function copyAllToClipboard(result: PipelineResult, keyword: string) {
  const sections = [
    `# ${result.content.title}\n`,
    `**Meta Description:** ${result.content.metaDescription}\n`,
    `**URL Slug:** ${result.research.urlSlug}\n`,
    `---\n`,
    result.content.articleHtml.replace(/<[^>]*>/g, ""),
    `\n---\n`,
    `## Recipe Schema\n\`\`\`json\n${JSON.stringify(result.schemas.recipeSchema, null, 2)}\n\`\`\`\n`,
    `## FAQ Schema\n\`\`\`json\n${JSON.stringify(result.schemas.faqSchema, null, 2)}\n\`\`\`\n`,
    `## Article Schema\n\`\`\`json\n${JSON.stringify(result.schemas.articleSchema, null, 2)}\n\`\`\`\n`,
    `## Pinterest Copy\n`,
    result.pinterest.pinTitles.map((t, i) => `Title ${i + 1}: ${t.text}`).join("\n"),
    `\n`,
    result.pinterest.pinDescriptions.map((d, i) => `Description ${i + 1}: ${d.text}`).join("\n"),
    `\n`,
    `## Quality Score: ${result.quality.totalScore}/100 (${result.quality.band})\n`,
  ];

  navigator.clipboard.writeText(sections.join("\n"));
}

function exportForWordPress(result: PipelineResult) {
  const wpContent = {
    title: result.content.title,
    content: result.content.articleHtml,
    excerpt: result.content.metaDescription,
    slug: result.research.urlSlug,
    meta: {
      rank_math_focus_keyword: result.research.title,
      rank_math_description: result.content.metaDescription,
    },
    schemas: {
      recipe: result.schemas.recipeSchema,
      faq: result.schemas.faqSchema,
      article: result.schemas.articleSchema,
    },
  };

  const blob = new Blob([JSON.stringify(wpContent, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wordpress-${result.research.urlSlug || "article"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportBulkPinCsv(result: PipelineResult, keyword: string) {
  const rows: BulkPinCsvRow[] = result.pinterest.pinTitles.map((t, i) => ({
    pin_title: t.text,
    pin_description: result.pinterest.pinDescriptions[i]?.text || "",
    destination_url: `[Your Post URL]`,
    board_name: result.pinterest.boardSuggestions[0]?.name || keyword,
    tobi_text: result.pinterest.tobiOverlays[i]?.text || "",
    image_alt: `${keyword} - variant ${i + 1}`,
    image_url: result.pinterest.pinImages?.[i]?.hostedUrl || "",
  }));

  const headers = Object.keys(rows[0] || {}).join(",");
  const csvRows = rows.map((r) =>
    Object.values(r)
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [headers, ...csvRows].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bulk-pin-${keyword.replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadEverything(result: PipelineResult, keyword: string) {
  // Create a data structure that includes everything
  const everything = {
    metadata: {
      keyword,
      generatedAt: new Date().toISOString(),
      qualityScore: result.quality.totalScore,
      scoreBand: result.quality.band,
    },
    article: {
      title: result.content.title,
      metaDescription: result.content.metaDescription,
      urlSlug: result.research.urlSlug,
      wordCount: result.content.wordCount,
      html: result.content.articleHtml,
    },
    schemas: {
      recipe: result.schemas.recipeSchema,
      faq: result.schemas.faqSchema,
      article: result.schemas.articleSchema,
    },
    pinterest: {
      pinTitles: result.pinterest.pinTitles,
      pinDescriptions: result.pinterest.pinDescriptions,
      tobiOverlays: result.pinterest.tobiOverlays,
      boardSuggestions: result.pinterest.boardSuggestions,
      hiddenPins: result.pinterest.hiddenPins,
    },
    seo: {
      rankMathScore: result.seo.rankMathScore,
      checklist: result.seo.checklist,
    },
    quality: result.quality,
  };

  const blob = new Blob([JSON.stringify(everything, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `food-seo-${keyword.replace(/\s+/g, "-")}-complete.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Cross-Tool Navigation (Correction 7) ───

function sendToBlogMonetizer(result: PipelineResult) {
  const data = {
    articleContent: result.content.articleHtml,
    title: result.content.title,
    metaDescription: result.content.metaDescription,
    schemas: result.schemas,
    source: "food-seo-writer",
  };
  sessionStorage.setItem("blogMonetizer_import", JSON.stringify(data));
  window.open("/dashboard/blog-monetizer", "_blank");
}

function openInMasterWriter(result: PipelineResult) {
  const data = {
    keyword: result.research.title,
    outline: result.research.outline,
    researchResult: result.research,
    source: "food-seo-writer",
  };
  sessionStorage.setItem("masterWriter_import", JSON.stringify(data));
  window.open("/dashboard/master-writer", "_blank");
}

// ─── Component ───

export default function ExportButtons({ result, keyword, inputs }: ExportButtonsProps) {
  const { publishing, publishResult, publishToWP } = useWordPressPublishing();

  const handlePublish = async () => {
    if (publishing) return;
    await publishToWP(
      result.content.title,
      result.content.articleHtml,
      inputs,
      result.generatedImages || []
    );
  };

  return (
    <div
      style={{
        background: "#1a2035",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 20,
        marginTop: 16,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 16 }}>
        📦 Export & Integration
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <ExportButton
          icon="📋"
          label="Copy All to Clipboard"
          sublabel="Article, schemas, Pinterest copy, scores"
          onClick={() => copyAllToClipboard(result, keyword)}
        />
        <ExportButton
          icon="📰"
          label="Export for WordPress"
          sublabel="JSON with article, schemas, Rank Math meta"
          onClick={() => exportForWordPress(result)}
          color="#2563eb"
        />
        <ExportButton
          icon="📌"
          label="Export for Bulk Pin Creator"
          sublabel="CSV with pin titles, descriptions, TOBI text"
          onClick={() => exportBulkPinCsv(result, keyword)}
          color="#e60023"
        />
        <ExportButton
          icon="📥"
          label="Download Everything"
          sublabel="Complete JSON bundle with all generated data"
          onClick={() => downloadEverything(result, keyword)}
          color="#8b5cf6"
        />
      </div>

      {/* ━━━ Automated WordPress Publishing (Correction 2, 4) ━━━ */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid #334155",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 10 }}>
          DIRECT PUBLISHING
        </div>
        
        <button
          onClick={handlePublish}
          disabled={publishing}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "14px 18px",
            background: publishing ? "#1e293b" : publishResult?.success ? "#14532d" : "#0f1623",
            border: `1px solid ${publishResult?.success ? "#22c55e" : "#0284c7"}`,
            borderRadius: 10,
            cursor: publishing ? "wait" : "pointer",
            transition: "all 0.2s",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 24, width: 34, textAlign: "center" }}>
              {publishing ? "⏳" : publishResult?.success ? "✅" : "🌐"}
            </span>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: publishing ? "#94a3b8" : publishResult?.success ? "#4ade80" : "#38bdf8",
                }}
              >
                {publishing ? "Publishing to WordPress..." : "Publish to WordPress Site"}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {publishResult?.success 
                  ? "Successfully published! Click to view post." 
                  : publishResult?.error 
                    ? <span style={{ color: "#ef4444" }}>Error: {publishResult.error}</span>
                    : "Uploads featured image & posts directly via REST API"}
              </div>
            </div>
          </div>
          {publishResult?.success && publishResult.link && (
            <a 
              href={publishResult.link} 
              target="_blank" 
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#22c55e20",
                color: "#4ade80",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              View Post ↗
            </a>
          )}
        </button>
      </div>

      {/* ━━━ Cross-Tool Integration (Correction 7) ━━━ */}
      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid #334155",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 10 }}>
          PINVERSE INTEGRATIONS
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <ExportButton
            icon="💰"
            label="Send to Blog Monetizer"
            sublabel="Pass article, products, schemas for monetization"
            onClick={() => sendToBlogMonetizer(result)}
            color="#10b981"
          />
          <ExportButton
            icon="✍️"
            label="Open in Master Writer"
            sublabel="Pass keyword and outline for deeper editing"
            onClick={() => openInMasterWriter(result)}
            color="#f59e0b"
          />
        </div>
      </div>
    </div>
  );
}
