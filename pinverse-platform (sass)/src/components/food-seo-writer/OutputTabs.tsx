"use client";

import { useState } from "react";
import type { PipelineResult, FormInputs, ProviderSettings } from "./types";
import ArticleOutput from "./ArticleOutput";
import SchemaOutput from "./SchemaOutput";
import PinterestOutput from "./PinterestOutput";
import SeoChecklist from "./SeoChecklist";
import QualityScore from "./QualityScore";

interface OutputTabsProps {
  result: PipelineResult;
  keyword: string;
  onFixIssues: () => void;
  fixing: boolean;
  inputs: FormInputs;
  provider: ProviderSettings;
  onContentUpdate?: (updatedHtml: string) => void;
}

const TABS = [
  { key: "article" as const, label: "📝 Article", icon: "1" },
  { key: "recipe-schema" as const, label: "🍳 Recipe Schema", icon: "2" },
  { key: "faq-schema" as const, label: "❓ FAQ Schema", icon: "3" },
  { key: "article-schema" as const, label: "📄 Article Schema", icon: "4" },
  { key: "pinterest" as const, label: "📌 Pinterest Copy", icon: "5" },
  { key: "seo" as const, label: "🔍 SEO Checklist", icon: "6" },
  { key: "quality" as const, label: "⭐ Quality Score", icon: "7" },
];

type TabKey = (typeof TABS)[number]["key"];

export default function OutputTabs({ result, keyword, onFixIssues, fixing, inputs, provider, onContentUpdate }: OutputTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("article");

  return (
    <div>
      {/* ━━━ Tab Navigation ━━━ */}
      <div
        style={{
          display: "flex",
          gap: 2,
          background: "#1a2035",
          borderRadius: "12px 12px 0 0",
          padding: 4,
          overflowX: "auto",
          border: "1px solid #334155",
          borderBottom: "none",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? "#0f1623" : "transparent",
              border: activeTab === tab.key ? "1px solid #334155" : "1px solid transparent",
              borderBottom: activeTab === tab.key ? "1px solid #0f1623" : "1px solid transparent",
              borderRadius: "8px 8px 0 0",
              padding: "10px 14px",
              color: activeTab === tab.key ? "#10b981" : "#94a3b8",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
              whiteSpace: "nowrap",
              transition: "all 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ━━━ Tab Content ━━━ */}
      <div
        style={{
          background: "#1a2035",
          border: "1px solid #334155",
          borderTop: "none",
          borderRadius: "0 0 12px 12px",
          padding: 20,
          minHeight: 400,
        }}
      >
        {activeTab === "article" && (
          <ArticleOutput content={result.content} keyword={keyword} inputs={inputs} provider={provider} onContentUpdate={onContentUpdate} />
        )}
        {activeTab === "recipe-schema" && (
          <SchemaOutput
            title="Recipe Schema"
            schema={result.schemas.recipeSchema}
            validations={result.schemas.recipeValidation}
          />
        )}
        {activeTab === "faq-schema" && (
          <SchemaOutput
            title="FAQ Schema"
            schema={result.schemas.faqSchema}
            validations={result.schemas.faqValidation}
          />
        )}
        {activeTab === "article-schema" && (
          <SchemaOutput
            title="Article Schema"
            schema={result.schemas.articleSchema}
            validations={result.schemas.articleValidation}
          />
        )}
        {activeTab === "pinterest" && (
          <PinterestOutput pinterest={result.pinterest} keyword={keyword} inputs={inputs} provider={provider} />
        )}
        {activeTab === "seo" && (
          <SeoChecklist seo={result.seo} keyword={keyword} />
        )}
        {activeTab === "quality" && (
          <QualityScore
            quality={result.quality}
            onFixIssues={onFixIssues}
            fixing={fixing}
          />
        )}
      </div>

      {/* ━━━ Instruction Note for Schema Tabs ━━━ */}
      {(activeTab === "recipe-schema" || activeTab === "faq-schema" || activeTab === "article-schema") && (
        <div
          style={{
            marginTop: 8,
            padding: "10px 16px",
            background: "#1e293b",
            borderRadius: 8,
            fontSize: 13,
            color: "#94a3b8",
            textAlign: "center",
          }}
        >
          Paste these into <strong style={{ color: "#e2e8f0" }}>Rank Math → Edit Schema → Custom Schema</strong> on your WordPress post
        </div>
      )}
    </div>
  );
}
