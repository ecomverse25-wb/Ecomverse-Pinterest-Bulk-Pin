"use client";

import { useMemo } from "react";
import { getSeasonalSuggestion, getKeywordSeasonality } from "./lib/seasonal-calendar";

interface SeasonalSuggestionProps {
  keyword?: string;
}

export default function SeasonalSuggestionBanner({ keyword }: SeasonalSuggestionProps) {
  const seasonal = useMemo(() => getSeasonalSuggestion(), []);
  const keywordTip = useMemo(
    () => (keyword ? getKeywordSeasonality(keyword) : null),
    [keyword]
  );

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #14532d20, #064e3b20)",
        border: "1px solid #22c55e30",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ fontSize: 24, flexShrink: 0 }}>📅</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#22c55e", marginBottom: 4 }}>
            Seasonal Content Tip — {seasonal.currentMonth}
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
            Pinterest users search 60-90 days ahead. Create content for:{" "}
            <strong style={{ color: "#e2e8f0" }}>{seasonal.suggestedContent}</strong> (peaks{" "}
            {seasonal.pinterestPeakPeriod}).
          </div>
          {keywordTip && (
            <div
              style={{
                marginTop: 8,
                padding: "8px 12px",
                background: "#0f162320",
                borderRadius: 6,
                fontSize: 13,
                color: "#fbbf24",
                border: "1px solid #fbbf2430",
              }}
            >
              {keywordTip}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
