"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { hermesGet, type Job } from "./utils";

interface JobMonitorProps {
  jobId: string | null;
  onComplete?: () => void;
}

export default function JobMonitor({ jobId, onComplete }: JobMonitorProps) {
  const [job, setJob] = useState<Job | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      stopPolling();
      return;
    }

    // Initial fetch
    hermesGet(`/job/${jobId}`)
      .then(setJob)
      .catch(() => {});

    // Poll every 5 seconds
    pollRef.current = setInterval(async () => {
      try {
        const res = await hermesGet(`/job/${jobId}`);
        setJob(res);
        if (res.status === "complete" || res.status === "failed") {
          stopPolling();
          onComplete?.();
        }
      } catch {
        // keep polling
      }
    }, 5000);

    return stopPolling;
  }, [jobId, stopPolling, onComplete]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [job?.output]);

  if (!job) return null;

  const statusStyle =
    job.status === "running"
      ? "border-yellow-500/40 bg-yellow-500/5"
      : job.status === "complete"
      ? "border-emerald-500/40 bg-emerald-500/5"
      : "border-red-500/40 bg-red-500/5";

  const statusIcon =
    job.status === "running" ? "🔄" : job.status === "complete" ? "✅" : "❌";

  const statusLabel =
    job.status === "running"
      ? "Running…"
      : job.status === "complete"
      ? "Complete"
      : "Failed";

  // Progress stages (cosmetic — derived from output text)
  const output = job.output || "";
  const stages = [
    { label: "Research outline", done: output.includes("outline") || output.includes("research") },
    { label: "Article generation", done: output.includes("article") || output.includes("writing") },
    { label: "SEO extraction", done: output.includes("seo") || output.includes("meta") },
    { label: "Product link matching", done: output.includes("product") || output.includes("affiliate") },
    { label: "Image generation (hero)", done: output.includes("hero") || output.includes("featured") },
    { label: "Inline images", done: output.includes("inline") || output.includes("image") },
    { label: "WordPress publish", done: job.status === "complete" },
  ];

  return (
    <div className={`rounded-xl border p-5 space-y-4 ${statusStyle}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-lg">
            {job.status === "running" ? (
              <span className="inline-block animate-spin">🔄</span>
            ) : (
              statusIcon
            )}
          </span>
          <div>
            <span
              className={`text-sm font-semibold ${
                job.status === "running"
                  ? "text-yellow-400"
                  : job.status === "complete"
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {statusLabel}
            </span>
            <span className="text-gray-400 text-sm ml-3">
              Keyword:{" "}
              <span className="text-white font-medium">{job.keyword}</span>
            </span>
          </div>
        </div>
        <span className="text-gray-500 text-xs font-mono">{job.job_id}</span>
      </div>

      {/* Progress Stages */}
      {job.status === "running" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {stages.map((s, i) => (
            <div
              key={i}
              className={`text-xs flex items-center gap-1.5 ${
                s.done ? "text-emerald-400" : "text-gray-600"
              }`}
            >
              <span>{s.done ? "✓" : "○"}</span>
              {s.label}
            </div>
          ))}
        </div>
      )}

      {/* Live Output */}
      {job.output && (
        <pre
          ref={outputRef}
          className="max-h-72 overflow-y-auto rounded-lg bg-gray-950 border border-gray-800 p-3 text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed"
        >
          {job.output.slice(-2000)}
        </pre>
      )}

      {/* Errors */}
      {job.errors && (
        <div className="rounded-lg bg-red-950/50 border border-red-500/20 p-3 text-xs text-red-300 font-mono whitespace-pre-wrap">
          {job.errors}
        </div>
      )}

      {/* Result */}
      {job.status === "complete" && job.result && (
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-800">
          <div className="text-sm text-white font-medium">
            {job.result.title}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{job.result.word_count?.toLocaleString()} words</span>
            <span>Score: {job.result.quality_score}/100</span>
          </div>
          {job.result.edit_url && (
            <a
              href={job.result.edit_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition"
            >
              📝 Edit in WordPress →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
