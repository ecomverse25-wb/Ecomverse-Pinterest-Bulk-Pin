import React from "react";
import type { BatchItem } from "./hooks/useBatchProcessing";

interface BatchProgressProps {
  items: BatchItem[];
  currentIndex: number;
  isProcessing: boolean;
  onStop: () => void;
}

export default function BatchProgress({ items, currentIndex, isProcessing, onStop }: BatchProgressProps) {
  const completed = items.filter(i => i.status === "completed").length;
  const total = items.length;
  const percent = Math.round((completed / total) * 100) || 0;

  return (
    <div style={{ background: "#1a2035", border: "1px solid #334155", borderRadius: 12, padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: "0 0 4px 0", color: "#f8fafc", fontSize: 16 }}>Batch Processing</h3>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: 14 }}>
            Completed {completed} of {total} keywords ({percent}%)
          </p>
        </div>
        {isProcessing && (
          <button
            onClick={onStop}
            style={{
              padding: "8px 16px",
              background: "#7f1d1d",
              border: "1px solid #991b1b",
              borderRadius: 6,
              color: "#fca5a5",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Stop Batch
          </button>
        )}
      </div>

      <div style={{ background: "#0f1623", borderRadius: 6, overflow: "hidden", height: 8, marginBottom: 20 }}>
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, idx) => {
          let bg = "#1e293b";
          let color = "#94a3b8";
          let icon = "⚪";

          if (item.status === "processing") {
            bg = "#1d4ed820";
            color = "#60a5fa";
            icon = "🔄";
          } else if (item.status === "completed") {
            bg = "#14532d30";
            color = "#4ade80";
            icon = "✅";
          } else if (item.status === "error") {
            bg = "#7f1d1d30";
            color = "#f87171";
            icon = "❌";
          }

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: bg,
                border: "1px solid #334155",
                borderRadius: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span>{icon}</span>
                <span style={{ color: "#f8fafc", fontSize: 14, fontWeight: 500 }}>{item.keyword}</span>
              </div>
              <div style={{ color, fontSize: 13 }}>
                {item.status === "processing" ? "Processing..." :
                 item.status === "completed" ? "Done" :
                 item.status === "error" ? "Failed" : "Pending"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
