"use client";

import { useState } from "react";
import type { GeneratedContent } from "./types";

interface ArticleOutputProps {
  content: GeneratedContent;
  keyword: string;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
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
        transition: "all 0.2s",
      }}
    >
      {copied ? "✓ Copied!" : label}
    </button>
  );
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<li>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<\/?ul[^>]*>/gi, "\n")
    .replace(/<\/?ol[^>]*>/gi, "\n")
    .replace(/<p>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function ArticleOutput({ content, keyword }: ArticleOutputProps) {
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview");
  const markdown = htmlToMarkdown(content.articleHtml);

  let displayHtml = content.articleHtml;
  displayHtml = displayHtml.replace(/!\[([^\]]*)\]\([^)]*placeholder[^)]*\)/gi, (match, altText) => {
    return `<div class="image-placeholder" style="background:#1e293b; border:2px dashed #475569; padding:40px; text-align:center; color:#94a3b8; border-radius:8px; margin:20px 0;">
  <span style="font-size:24px;">🖼️</span><br/>
  <span style="font-weight:bold; margin-top:8px; display:block;">AI image will be generated here</span>
  <p style="font-size:12px; margin-top:4px;">${altText}</p>
</div>`;
  });
  displayHtml = displayHtml.replace(/<img[^>]*src="[^"]*placeholder[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi, (match, altText) => {
    return `<div class="image-placeholder" style="background:#1e293b; border:2px dashed #475569; padding:40px; text-align:center; color:#94a3b8; border-radius:8px; margin:20px 0;">
  <span style="font-size:24px;">🖼️</span><br/>
  <span style="font-weight:bold; margin-top:8px; display:block;">AI image will be generated here</span>
  <p style="font-size:12px; margin-top:4px;">${altText}</p>
</div>`;
  });

  return (
    <div>
      {/* Header with stats and buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: 14, color: "#94a3b8" }}>
            <strong style={{ color: "#e2e8f0" }}>{content.wordCount}</strong> words
          </span>
          <span style={{ fontSize: 14, color: "#94a3b8" }}>
            Title: <strong style={{ color: "#e2e8f0" }}>{content.title.length}</strong> chars
          </span>
          <span style={{ fontSize: 14, color: "#94a3b8" }}>
            Meta: <strong style={{ color: "#e2e8f0" }}>{content.metaDescription.length}</strong> chars
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setViewMode(viewMode === "preview" ? "html" : "preview")}
            style={{
              padding: "6px 14px",
              background: "#334155",
              border: "1px solid #475569",
              borderRadius: 6,
              color: "#e2e8f0",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {viewMode === "preview" ? "View HTML" : "View Preview"}
          </button>
          <CopyButton text={content.articleHtml} label="Copy as HTML" />
          <CopyButton text={markdown} label="Copy as Markdown" />
        </div>
      </div>

      {/* Title display */}
      <div
        style={{
          padding: "12px 16px",
          background: "#0f1623",
          borderRadius: 8,
          marginBottom: 12,
          border: "1px solid #334155",
        }}
      >
        <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>SEO TITLE:</span>
        <div style={{ fontSize: 16, color: "#e2e8f0", fontWeight: 600, marginTop: 4 }}>
          {content.title}
        </div>
      </div>

      {/* Meta description display */}
      <div
        style={{
          padding: "12px 16px",
          background: "#0f1623",
          borderRadius: 8,
          marginBottom: 12,
          border: "1px solid #334155",
        }}
      >
        <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>META DESCRIPTION:</span>
        <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{content.metaDescription}</div>
      </div>

      {/* FTC Disclosure (if present) */}
      {content.ftcDisclosure && (
        <div
          style={{
            padding: "12px 16px",
            background: "#1e293b",
            borderRadius: 8,
            marginBottom: 12,
            borderLeft: "3px solid #eab308",
            fontStyle: "italic",
            fontSize: 13,
            color: "#94a3b8",
            lineHeight: 1.5,
          }}
        >
          {content.ftcDisclosure}
        </div>
      )}

      {/* Content display */}
      <div
        style={{
          background: "#0f1623",
          borderRadius: 8,
          border: "1px solid #334155",
          padding: 20,
          maxHeight: 600,
          overflowY: "auto",
        }}
      >
        {viewMode === "preview" ? (
          <div
            className="food-seo-article-preview"
            style={{
              color: "#e2e8f0",
              lineHeight: 1.7,
              fontSize: 14,
            }}
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        ) : (
          <pre
            style={{
              color: "#94a3b8",
              fontSize: 12,
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {displayHtml}
          </pre>
        )}
      </div>

      {/* Inline styles for the preview */}
      <style>{`
        .food-seo-article-preview h1 { font-size: 1.6em; color: #10b981; margin: 0 0 16px; }
        .food-seo-article-preview h2 { font-size: 1.3em; color: #22c55e; margin: 24px 0 12px; border-bottom: 1px solid #334155; padding-bottom: 8px; }
        .food-seo-article-preview h3 { font-size: 1.1em; color: #34d399; margin: 16px 0 8px; }
        .food-seo-article-preview p { margin: 0 0 12px; }
        .food-seo-article-preview ul, .food-seo-article-preview ol { padding-left: 20px; margin: 0 0 12px; }
        .food-seo-article-preview li { margin-bottom: 4px; }
        .food-seo-article-preview strong { color: #fbbf24; }
        .food-seo-article-preview a { color: #60a5fa; text-decoration: underline; }
        .food-seo-article-preview img { max-width: 100%; border-radius: 8px; }
      `}</style>
    </div>
  );
}
