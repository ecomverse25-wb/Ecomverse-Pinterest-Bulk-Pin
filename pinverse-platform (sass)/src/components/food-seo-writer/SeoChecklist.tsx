"use client";

import type { SeoOptimizationResult } from "./types";

interface SeoChecklistProps {
  seo: SeoOptimizationResult;
  keyword: string;
}

export default function SeoChecklist({ seo, keyword }: SeoChecklistProps) {
  const passedCount = seo.checklist.filter((c) => c.passed).length;
  const totalCount = seo.checklist.length;
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* ━━━ Score Header ━━━ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#e2e8f0" }}>
            Rank Math SEO Score Estimate
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
            Focus keyword: <strong style={{ color: "#10b981" }}>{keyword}</strong>
          </div>
        </div>
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: "50%",
            border: `4px solid ${seo.rankMathScore >= 80 ? "#22c55e" : seo.rankMathScore >= 60 ? "#eab308" : "#ef4444"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 800,
            color: seo.rankMathScore >= 80 ? "#22c55e" : seo.rankMathScore >= 60 ? "#eab308" : "#ef4444",
          }}
        >
          {seo.rankMathScore}
        </div>
      </div>

      {/* ━━━ Summary Bar ━━━ */}
      <div
        style={{
          background: "#0f1623",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: "1px solid #334155",
        }}
      >
        <span style={{ color: "#94a3b8", fontSize: 13 }}>
          {passedCount} of {totalCount} checks passed ({passRate}%)
        </span>
        <div
          style={{
            width: 120,
            height: 6,
            borderRadius: 3,
            background: "#334155",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${passRate}%`,
              height: "100%",
              borderRadius: 3,
              background: passRate >= 80 ? "#22c55e" : passRate >= 60 ? "#eab308" : "#ef4444",
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      {/* ━━━ Checklist Items ━━━ */}
      {seo.checklist.map((check, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "10px 14px",
            background: i % 2 === 0 ? "#0f1623" : "transparent",
            borderRadius: 6,
          }}
        >
          <span
            style={{
              fontSize: 16,
              color: check.passed ? "#22c55e" : "#ef4444",
              fontWeight: 700,
              width: 20,
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            {check.passed ? "✓" : "✗"}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{check.name}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{check.details}</div>
            {check.autoFixApplied && (
              <div
                style={{
                  fontSize: 11,
                  color: "#10b981",
                  marginTop: 4,
                  fontStyle: "italic",
                }}
              >
                ✨ Auto-fixed during SEO optimization stage
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
