"use client";

import type { PipelineProgress, PipelineStage } from "./types";
import { PIPELINE_STAGES } from "./lib/constants";

interface ProgressIndicatorProps {
  progress: PipelineProgress;
}

export default function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  return (
    <div
      style={{
        background: "#1a2035",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
      }}
    >
      {/* ━━━ Stage Indicators ━━━ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        {PIPELINE_STAGES.map((stage, idx) => {
          const status = progress.stages[stage.key];
          const isActive = status === "active";
          const isCompleted = status === "completed";
          const isError = status === "error";

          return (
            <div key={stage.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              {/* Stage Circle */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 700,
                    border: `2px solid ${
                      isCompleted
                        ? "#22c55e"
                        : isActive
                          ? "#10b981"
                          : isError
                            ? "#ef4444"
                            : "#334155"
                    }`,
                    background: isCompleted
                      ? "#22c55e20"
                      : isActive
                        ? "#10b98120"
                        : isError
                          ? "#ef444420"
                          : "transparent",
                    color: isCompleted
                      ? "#22c55e"
                      : isActive
                        ? "#10b981"
                        : isError
                          ? "#ef4444"
                          : "#64748b",
                    transition: "all 0.3s",
                    position: "relative",
                  }}
                >
                  {isCompleted ? (
                    "✓"
                  ) : isActive ? (
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        border: "3px solid #10b981",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  ) : isError ? (
                    "✗"
                  ) : (
                    "○"
                  )}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isActive || isCompleted ? "#e2e8f0" : "#64748b",
                    marginTop: 6,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector Line */}
              {idx < PIPELINE_STAGES.length - 1 && (
                <div
                  style={{
                    height: 2,
                    flex: "0 0 40px",
                    background: isCompleted ? "#22c55e" : "#334155",
                    margin: "0 -4px",
                    marginBottom: 24,
                    transition: "background 0.3s",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ━━━ Live Log ━━━ */}
      <div
        style={{
          background: "#0f1623",
          borderRadius: 8,
          padding: 12,
          maxHeight: 160,
          overflowY: "auto",
          fontFamily: "monospace",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {progress.logs.length === 0 ? (
          <div style={{ color: "#64748b" }}>Waiting to start...</div>
        ) : (
          progress.logs.map((log, i) => (
            <div key={i} style={{ color: i === progress.logs.length - 1 ? "#10b981" : "#94a3b8" }}>
              {log}
            </div>
          ))
        )}
      </div>

      {/* Error display */}
      {progress.error && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "#7f1d1d20",
            border: "1px solid #991b1b",
            borderRadius: 8,
            color: "#fca5a5",
            fontSize: 13,
          }}
        >
          ❌ {progress.error}
        </div>
      )}

      {/* CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
