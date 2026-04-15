"use client";

import { useState, useCallback } from "react";
import type { GeneratedContent, FormInputs, ProviderSettings } from "./types";
import { generateImageAction } from "@/app/actions/food-seo-writer/generate-v2";

interface ArticleOutputProps {
  content: GeneratedContent;
  keyword: string;
  inputs: FormInputs;
  provider: ProviderSettings;
  onContentUpdate?: (updatedHtml: string) => void;
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

// Count placeholders in HTML
function countMissingImages(html: string): number {
  const placeholderDivs = (html.match(/class="image-placeholder"/gi) || []).length;
  const placeholderSrcs = (html.match(/src=["']image-placeholder["']/gi) || []).length;
  return placeholderDivs + placeholderSrcs;
}

// Extract alt text from placeholder divs
function extractPlaceholderAltTexts(html: string): { altText: string; index: number }[] {
  const results: { altText: string; index: number }[] = [];
  
  // Match image-placeholder divs with their descriptive text
  const placeholderRegex = /<div[^>]*class="image-placeholder"[^>]*>[\s\S]*?<p[^>]*>(.*?)<\/p>[\s\S]*?<\/div>/gi;
  let match;
  let idx = 0;
  while ((match = placeholderRegex.exec(html)) !== null) {
    results.push({ altText: match[1].replace(/<[^>]*>/g, "").trim(), index: idx++ });
  }
  
  // Also match img tags with placeholder src
  const imgRegex = /<img[^>]*src=["']image-placeholder["'][^>]*>/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    const altMatch = match[0].match(/alt=["']([^"']*)["']/i);
    results.push({ altText: altMatch ? altMatch[1] : `Image ${idx + 1}`, index: idx++ });
  }
  
  return results;
}

export default function ArticleOutput({ content, keyword, inputs, provider, onContentUpdate }: ArticleOutputProps) {
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview");
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [regenProgress, setRegenProgress] = useState<string>("");
  const markdown = htmlToMarkdown(content.articleHtml);

  // Build display HTML with placeholder styling
  let displayHtml = content.articleHtml;
  
  // Replace markdown image placeholders with styled placeholders
  displayHtml = displayHtml.replace(/!\[([^\]]*)\]\([^)]*placeholder[^)]*\)/gi, (_match, altText) => {
    return `<div class="image-placeholder" style="background:#1e293b; border:2px dashed #475569; padding:40px; text-align:center; color:#94a3b8; border-radius:8px; margin:20px 0;">
  <span style="font-size:24px;">🖼️</span><br/>
  <span style="font-weight:bold; margin-top:8px; display:block;">AI image will be generated here</span>
  <p style="font-size:12px; margin-top:4px;">${altText}</p>
</div>`;
  });
  
  // Replace HTML img placeholders
  displayHtml = displayHtml.replace(/<img[^>]*src="[^"]*placeholder[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi, (_match, altText) => {
    return `<div class="image-placeholder" style="background:#1e293b; border:2px dashed #475569; padding:40px; text-align:center; color:#94a3b8; border-radius:8px; margin:20px 0;">
  <span style="font-size:24px;">🖼️</span><br/>
  <span style="font-weight:bold; margin-top:8px; display:block;">AI image will be generated here</span>
  <p style="font-size:12px; margin-top:4px;">${altText}</p>
</div>`;
  });

  const missingCount = countMissingImages(content.articleHtml);
  const placeholders = extractPlaceholderAltTexts(content.articleHtml);

  // Regenerate a single missing image
  const handleRegenerateOne = useCallback(async (altText: string, placeholderIdx: number) => {
    setRegeneratingIndex(placeholderIdx);
    setRegenProgress(`Generating image: "${altText.substring(0, 50)}..."`)
    
    try {
      const result = await generateImageAction(
        content.title,
        `Image Subject: ${altText}`,
        inputs.imageSettings.promptInstructions,
        inputs.imageSettings.style,
        inputs.imageSettings.colorMood,
        inputs.imageSettings.dimensions,
        provider as any,
        inputs.imageSettings.imgbbApiKey,
        'inline'
      );

      if (result.success && result.imageUrl) {
        // Replace the first matching placeholder in the raw HTML
        let updatedHtml = content.articleHtml;
        const pinDesc = `${altText} - ${keyword}`.replace(/"/g, "&quot;");
        const replacement = `<img src="${result.imageUrl}" alt="${altText.replace(/"/g, "&quot;")}" data-pin-description="${pinDesc}" />`;
        
        // Try to find and replace the placeholder div first
        const divPlaceholderRegex = new RegExp(
          `<div[^>]*class="image-placeholder"[^>]*>[\\s\\S]*?${altText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 30)}[\\s\\S]*?<\\/div>`,
          'i'
        );
        if (divPlaceholderRegex.test(updatedHtml)) {
          updatedHtml = updatedHtml.replace(divPlaceholderRegex, `<figure class="wp-block-image size-large">\n  ${replacement}\n</figure>`);
        } else {
          // Try replacing img tag with placeholder src
          const imgPlaceholderRegex = /<img[^>]*src=["']image-placeholder["'][^>]*>/i;
          updatedHtml = updatedHtml.replace(imgPlaceholderRegex, replacement);
        }
        
        if (onContentUpdate) {
          onContentUpdate(updatedHtml);
        }
        setRegenProgress(`✅ Image generated successfully!`);
      } else {
        setRegenProgress(`❌ Failed: ${result.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setRegenProgress(`❌ Error: ${err.message || "Failed to generate image"}`);
    } finally {
      setRegeneratingIndex(null);
      setTimeout(() => setRegenProgress(""), 4000);
    }
  }, [content, inputs, provider, keyword, onContentUpdate]);

  // Regenerate an existing image that was already generated
  const handleRegenerateExisting = useCallback(async (altText: string, rawHtmlToReplace: string) => {
    // Generate an ID for loading state
    setRegeneratingIndex(999); // Use special index to show loading generally or modify state to track exact image
    setRegenProgress(`Regenerating existing image: "${altText.substring(0, 50)}..."`);
    
    try {
      const result = await generateImageAction(
        content.title,
        `Image Subject: ${altText}`,
        inputs.imageSettings.promptInstructions,
        inputs.imageSettings.style,
        inputs.imageSettings.colorMood,
        inputs.imageSettings.dimensions,
        provider as any,
        inputs.imageSettings.imgbbApiKey,
        'inline'
      );

      if (result.success && result.imageUrl) {
        let updatedHtml = content.articleHtml;
        const pinDesc = `${altText} - ${keyword}`.replace(/"/g, "&quot;");
        const replacement = `<figure class="wp-block-image size-large">\n  <img src="${result.imageUrl}" alt="${altText.replace(/"/g, "&quot;")}" data-pin-description="${pinDesc}" />\n</figure>`;
        
        // Exact replace the old image/figure with the new one
        updatedHtml = updatedHtml.replace(rawHtmlToReplace, replacement);
        
        if (onContentUpdate) {
          onContentUpdate(updatedHtml);
        }
        setRegenProgress(`✅ Image regenerated successfully!`);
      } else {
        setRegenProgress(`❌ Failed: ${result.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setRegenProgress(`❌ Error: ${err.message || "Failed to generate image"}`);
    } finally {
      setRegeneratingIndex(null);
      setTimeout(() => setRegenProgress(""), 4000);
    }
  }, [content, inputs, provider, keyword, onContentUpdate]);

  // Regenerate ALL missing images
  const handleRegenerateAll = useCallback(async () => {
    if (placeholders.length === 0) return;
    setRegeneratingAll(true);
    
    let updatedHtml = content.articleHtml;
    let successCount = 0;
    
    for (let i = 0; i < placeholders.length; i++) {
      const ph = placeholders[i];
      setRegenProgress(`Generating image ${i + 1}/${placeholders.length}: "${ph.altText.substring(0, 40)}..."`);
      
      try {
        const result = await generateImageAction(
          content.title,
          `Image Subject: ${ph.altText}`,
          inputs.imageSettings.promptInstructions,
          inputs.imageSettings.style,
          inputs.imageSettings.colorMood,
          inputs.imageSettings.dimensions,
          provider as any,
          inputs.imageSettings.imgbbApiKey,
          i === 0 ? 'featured' : 'inline'
        );

        if (result.success && result.imageUrl) {
          const pinDesc = `${ph.altText} - ${keyword}`.replace(/"/g, "&quot;");
          const replacement = `<figure class="wp-block-image size-large">\n  <img src="${result.imageUrl}" alt="${ph.altText.replace(/"/g, "&quot;")}" data-pin-description="${pinDesc}" />\n</figure>`;
          
          // Replace the first placeholder div found
          const divRegex = /<div[^>]*class="image-placeholder"[^>]*>[\s\S]*?<\/div>/i;
          const imgRegex = /<img[^>]*src=["']image-placeholder["'][^>]*>/i;
          
          if (divRegex.test(updatedHtml)) {
            updatedHtml = updatedHtml.replace(divRegex, replacement);
          } else if (imgRegex.test(updatedHtml)) {
            updatedHtml = updatedHtml.replace(imgRegex, replacement);
          }
          
          successCount++;
        }
      } catch (err: any) {
        console.error(`Image ${i + 1} failed:`, err);
      }
      
      // Small delay between batches to avoid rate limiting
      if (i < placeholders.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }
    
    if (onContentUpdate && successCount > 0) {
      onContentUpdate(updatedHtml);
    }
    
    setRegenProgress(`✅ Generated ${successCount}/${placeholders.length} images`);
    setRegeneratingAll(false);
    setTimeout(() => setRegenProgress(""), 5000);
  }, [content, placeholders, inputs, provider, keyword, onContentUpdate]);

  return (
    <div>
      {/* Header with stats and buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

      {/* ━━━ Missing Images Banner + Regenerate All Button ━━━ */}
      {missingCount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            background: "linear-gradient(135deg, #78350f15, #92400e15)",
            border: "1px solid #d97706",
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🖼️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fbbf24" }}>
                {missingCount} Missing Image{missingCount > 1 ? "s" : ""} Detected
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Click individual placeholders or regenerate all at once
              </div>
            </div>
          </div>
          <button
            onClick={handleRegenerateAll}
            disabled={regeneratingAll || regeneratingIndex !== null}
            style={{
              padding: "10px 20px",
              background: regeneratingAll
                ? "#334155"
                : "linear-gradient(135deg, #d97706, #b45309)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: regeneratingAll ? "not-allowed" : "pointer",
              opacity: regeneratingAll ? 0.7 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {regeneratingAll ? "⏳ Generating..." : `🔄 Regenerate All ${missingCount} Images`}
          </button>
        </div>
      )}

      {/* Regeneration Progress */}
      {regenProgress && (
        <div
          style={{
            padding: "10px 16px",
            background: regenProgress.startsWith("✅") ? "#14532d20" : regenProgress.startsWith("❌") ? "#7f1d1d20" : "#0c4a6e20",
            border: `1px solid ${regenProgress.startsWith("✅") ? "#22c55e" : regenProgress.startsWith("❌") ? "#ef4444" : "#0284c7"}`,
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
            color: regenProgress.startsWith("✅") ? "#4ade80" : regenProgress.startsWith("❌") ? "#fca5a5" : "#7dd3fc",
            fontWeight: 600,
          }}
        >
          {regenProgress}
        </div>
      )}

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
          maxHeight: 700,
          overflowY: "auto",
        }}
      >
        {viewMode === "preview" ? (
          <div
            className="food-seo-article-preview"
            style={{
              color: "#e2e8f0",
              lineHeight: 1.8,
              fontSize: 15,
            }}
          >
            {/* Render with interactive placeholder buttons */}
              <PreviewWithImageButtons
                html={displayHtml}
                placeholders={placeholders}
                regeneratingIndex={regeneratingIndex}
                regeneratingAll={regeneratingAll}
                onRegenerate={handleRegenerateOne}
                onRegenerateExisting={handleRegenerateExisting}
              />
          </div>
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
            {content.articleHtml}
          </pre>
        )}
      </div>

      {/* Enhanced article preview styles */}
      <style>{`
        .food-seo-article-preview h1 { 
          font-size: 1.8em; 
          color: #10b981; 
          margin: 0 0 20px; 
          line-height: 1.3;
        }
        .food-seo-article-preview h2 { 
          font-size: 1.4em; 
          color: #22d3ee; 
          margin: 32px 0 16px; 
          padding-bottom: 10px;
          border-bottom: 2px solid #1e3a5f; 
          line-height: 1.3;
        }
        .food-seo-article-preview h3 { 
          font-size: 1.15em; 
          color: #34d399; 
          margin: 20px 0 10px; 
        }
        .food-seo-article-preview p { 
          margin: 0 0 16px; 
          color: #cbd5e1;
        }
        .food-seo-article-preview ul, .food-seo-article-preview ol { 
          padding-left: 24px; 
          margin: 0 0 16px; 
        }
        .food-seo-article-preview li { 
          margin-bottom: 6px; 
          color: #cbd5e1;
          line-height: 1.6;
        }
        .food-seo-article-preview strong { 
          color: #fbbf24; 
          font-weight: 700;
        }
        .food-seo-article-preview a { 
          color: #60a5fa; 
          text-decoration: underline; 
          text-decoration-color: #60a5fa40;
          text-underline-offset: 2px;
          transition: color 0.2s;
        }
        .food-seo-article-preview a:hover { 
          color: #93c5fd;
        }
        .food-seo-article-preview img { 
          max-width: 100%; 
          border-radius: 10px; 
          margin: 8px 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .food-seo-article-preview figure { 
          margin: 20px 0; 
          text-align: center;
        }
        .food-seo-article-preview figure img {
          max-width: 100%;
          border-radius: 10px;
        }
        .food-seo-article-preview figcaption {
          font-size: 12px;
          color: #64748b;
          font-style: italic;
          margin-top: 8px;
        }
        .food-seo-article-preview em, .food-seo-article-preview i {
          color: #94a3b8;
          font-style: italic;
        }
        .food-seo-article-preview blockquote {
          border-left: 3px solid #10b981;
          padding: 12px 16px;
          margin: 16px 0;
          background: #1e293b;
          border-radius: 0 8px 8px 0;
          color: #94a3b8;
          font-style: italic;
        }

        /* Recipe Card Styling */
        .food-seo-article-preview h2:has(+ p strong:first-child) {
          color: #f59e0b;
        }

        /* Practical Tip Styling - paragraphs starting with "Practical tip:" */
        .food-seo-article-preview p:has(> strong) {
          line-height: 1.7;
        }

        /* Image placeholder interactive styling */
        .food-seo-article-preview .image-placeholder {
          position: relative;
          background: linear-gradient(135deg, #1e293b, #0f172a) !important;
          border: 2px dashed #475569 !important;
          border-radius: 12px !important;
          padding: 32px !important;
          margin: 24px 0 !important;
          text-align: center;
          transition: border-color 0.3s;
        }
        .food-seo-article-preview .image-placeholder:hover {
          border-color: #d97706 !important;
        }

        /* Affiliate link styling */
        .food-seo-article-preview a.affiliate-link {
          color: #f59e0b;
          text-decoration: underline;
          text-decoration-style: dotted;
        }

        /* Jump to recipe link styling */
        .food-seo-article-preview a[href="#recipe"] {
          display: inline-block;
          padding: 8px 20px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff !important;
          text-decoration: none !important;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          margin: 12px 0;
          transition: transform 0.2s;
        }
        .food-seo-article-preview a[href="#recipe"]:hover {
          transform: translateY(-1px);
        }

        /* Nutrition facts table-like styling */
        .food-seo-article-preview p:has(> strong:first-child) + ul li,
        .food-seo-article-preview h3 + ul li {
          padding: 4px 0;
        }
      `}</style>
    </div>
  );
}

// ─── Sub-component: Preview with interactive "Generate Image" buttons on placeholders ───

function PreviewWithImageButtons({
  html,
  placeholders,
  regeneratingIndex,
  regeneratingAll,
  onRegenerate,
  onRegenerateExisting,
}: {
  html: string;
  placeholders: { altText: string; index: number }[];
  regeneratingIndex: number | null;
  regeneratingAll: boolean;
  onRegenerate: (altText: string, idx: number) => void;
  onRegenerateExisting?: (altText: string, rawHtml: string) => void;
}) {
  // Split HTML by placeholder divs AND existing image tags/figures
  const parts = html.split(/(<div[^>]*class="image-placeholder"[^>]*>[\s\S]*?<\/div>|<figure[^>]*>[\s\S]*?<img[^>]*>[\s\S]*?<\/figure>|<img[^>]+src=["'](?:(?!image-placeholder)[^"'])+["'][^>]*>)/gi);
  let placeholderCounter = 0;

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        if (/class="image-placeholder"/i.test(part)) {
          const idx = placeholderCounter++;
          const ph = placeholders[idx];
          const altText = ph?.altText || `Image ${idx + 1}`;
          const isCurrentlyGenerating = regeneratingIndex === idx || regeneratingAll;

          return (
            <div
              key={`ph-${i}`}
              style={{
                position: "relative",
                background: "linear-gradient(135deg, #1e293b, #0f172a)",
                border: "2px dashed #475569",
                borderRadius: 12,
                padding: "28px 20px",
                margin: "24px 0",
                textAlign: "center",
                transition: "border-color 0.3s",
              }}
            >
              <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>🖼️</span>
              <span style={{ fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6, fontSize: 14 }}>
                {isCurrentlyGenerating ? "Generating image..." : "AI image will be generated here"}
              </span>
              <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 16px" }}>{altText}</p>
              <button
                onClick={() => onRegenerate(altText, idx)}
                disabled={isCurrentlyGenerating}
                style={{
                  padding: "8px 20px",
                  background: isCurrentlyGenerating
                    ? "#334155"
                    : "linear-gradient(135deg, #d97706, #b45309)",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isCurrentlyGenerating ? "not-allowed" : "pointer",
                  opacity: isCurrentlyGenerating ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
              >
                {isCurrentlyGenerating ? "⏳ Generating..." : "🔄 Generate This Image"}
              </button>
            </div>
          );
        } else if (/(<figure|<img)/i.test(part) && onRegenerateExisting) {
          // This is a generated image! Let's extract the alt text from it
          const altMatch = part.match(/alt=["']([^"']+)["']/i);
          const altText = altMatch ? altMatch[1] : "Existing Image";
          const isCurrentlyGenerating = regeneratingIndex === 999 || regeneratingAll;

          return (
            <div key={`img-container-${i}`} style={{ position: "relative", marginBottom: 24 }}>
              <div dangerouslySetInnerHTML={{ __html: part }} />
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <button
                  onClick={() => onRegenerateExisting(altText, part)}
                  disabled={isCurrentlyGenerating}
                  style={{
                    padding: "6px 16px",
                    background: isCurrentlyGenerating ? "#334155" : "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    borderRadius: 6,
                    color: "#e2e8f0",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: isCurrentlyGenerating ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6
                  }}
                  onMouseEnter={(e) => {
                    const t = e.currentTarget as HTMLButtonElement;
                    if (!isCurrentlyGenerating) t.style.background = "rgba(217, 119, 6, 0.9)";
                  }}
                  onMouseLeave={(e) => {
                    const t = e.currentTarget as HTMLButtonElement;
                    if (!isCurrentlyGenerating) t.style.background = "rgba(15, 23, 42, 0.8)";
                  }}
                >
                  {isCurrentlyGenerating ? "⏳ Regenerating..." : "🔄 Regenerate Graphic"}
                </button>
              </div>
            </div>
          );
        }
        
        return <div key={`content-${i}`} dangerouslySetInnerHTML={{ __html: part }} />;
      })}
    </>
  );
}
