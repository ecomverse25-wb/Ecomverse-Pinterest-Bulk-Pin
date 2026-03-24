"use client";

import type { QualityScoreResult } from "./types";
import { SCORE_BANDS } from "./lib/constants";

interface QualityScoreProps {
  quality: QualityScoreResult;
  onFixIssues: () => void;
  fixing: boolean;
}

export default function QualityScore({ quality, onFixIssues, fixing }: QualityScoreProps) {
  const bandConfig = SCORE_BANDS.find(
    (b) => quality.totalScore >= b.min && quality.totalScore <= b.max
  ) || SCORE_BANDS[SCORE_BANDS.length - 1];

  const hasFixableIssues = quality.categories.some((cat) =>
    cat.checks.some((c) => c.earnedPoints < c.maxPoints && c.fixSuggestion)
  );

  return (
    <div>
      {/* ━━━ Score Header ━━━ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 24,
          padding: 20,
          background: "#0f1623",
          borderRadius: 12,
          border: "1px solid #334155",
        }}
      >
        {/* Score Circle */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            border: `6px solid ${bandConfig.color}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, color: bandConfig.color }}>
            {quality.totalScore}
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>/ {quality.maxScore}</div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: bandConfig.color, marginBottom: 4 }}>
            {quality.band}
          </div>
          <div style={{ fontSize: 14, color: "#94a3b8" }}>{bandConfig.action}</div>
          {quality.blockedIssues.length > 0 && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                background: "#7f1d1d20",
                border: "1px solid #991b1b",
                borderRadius: 6,
                fontSize: 12,
                color: "#fca5a5",
                lineHeight: 1.5,
              }}
            >
              ⛔ <strong>Must fix before publishing:</strong>{" "}
              {quality.blockedIssues[0]}
            </div>
          )}
        </div>

        {/* Fix Issues Button (Correction 6) */}
        {hasFixableIssues && (
          <button
            onClick={onFixIssues}
            disabled={fixing}
            style={{
              padding: "12px 24px",
              background: fixing
                ? "#334155"
                : "linear-gradient(135deg, #f59e0b, #d97706)",
              border: "none",
              borderRadius: 10,
              color: "white",
              fontSize: 14,
              fontWeight: 700,
              cursor: fixing ? "not-allowed" : "pointer",
              flexShrink: 0,
              opacity: fixing ? 0.7 : 1,
            }}
          >
            {fixing ? "⏳ Fixing..." : "🔧 Fix Issues"}
          </button>
        )}
      </div>

      {/* ━━━ Category Cards ━━━ */}
      {quality.categories.map((cat, catIdx) => (
        <div
          key={catIdx}
          style={{
            background: "#0f1623",
            border: "1px solid #334155",
            borderRadius: 10,
            padding: 16,
            marginBottom: 12,
          }}
        >
          {/* Category Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{cat.name}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>
              {cat.earnedPoints}/{cat.maxPoints}
            </div>
          </div>

          {/* Category Progress Bar */}
          <div
            style={{
              width: "100%",
              height: 6,
              borderRadius: 3,
              background: "#334155",
              marginBottom: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(cat.earnedPoints / cat.maxPoints) * 100}%`,
                height: "100%",
                borderRadius: 3,
                background:
                  cat.earnedPoints / cat.maxPoints >= 0.8
                    ? "#22c55e"
                    : cat.earnedPoints / cat.maxPoints >= 0.6
                      ? "#eab308"
                      : "#ef4444",
                transition: "width 0.3s",
              }}
            />
          </div>

          {/* Individual Checks */}
          {cat.checks.map((check, checkIdx) => (
            <div
              key={checkIdx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "6px 0",
                borderBottom:
                  checkIdx < cat.checks.length - 1 ? "1px solid #1e293b" : "none",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color:
                    check.earnedPoints === check.maxPoints
                      ? "#22c55e"
                      : check.earnedPoints > 0
                        ? "#eab308"
                        : "#ef4444",
                  fontWeight: 700,
                  width: 16,
                  flexShrink: 0,
                }}
              >
                {check.earnedPoints === check.maxPoints ? "✓" : check.earnedPoints > 0 ? "◐" : "✗"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#e2e8f0" }}>
                  {check.name}{" "}
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    ({check.earnedPoints}/{check.maxPoints})
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{check.criteria}</div>
                {check.issue && (
                  <div style={{ fontSize: 11, color: "#ef4444", marginTop: 2 }}>⚠ {check.issue}</div>
                )}
                {check.fixSuggestion && (
                  <div style={{ fontSize: 11, color: "#fbbf24", marginTop: 2 }}>
                    💡 {check.fixSuggestion}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
