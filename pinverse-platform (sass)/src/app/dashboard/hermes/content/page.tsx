"use client";

import { useEffect, useState, useCallback } from "react";
import JobMonitor from "@/components/hermes/JobMonitor";
import {
  hermesGet,
  hermesPost,
  type Site,
  type Job,
  type Draft,
} from "@/components/hermes/utils";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
    </svg>
  );
}

export default function ContentPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [niche, setNiche] = useState("");
  const [keyword, setKeyword] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Recent jobs
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  // Drafts
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftsFilter, setDraftsFilter] = useState("all");

  // Batch
  const [batchCount, setBatchCount] = useState(0);
  const [batchRunning, setBatchRunning] = useState(false);

  // Feedback
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(t); }
  }, [message]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 8000); return () => clearTimeout(t); }
  }, [error]);

  // Load sites
  useEffect(() => {
    (async () => {
      const res = await hermesGet("/sites");
      if (res?.error) {
        setError(res.error);
      } else {
        const siteList = res?.sites || [];
        setSites(siteList);
        if (siteList.length > 0) setNiche(siteList[0].niche_id);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load recent jobs and drafts
  const loadData = useCallback(async () => {
    setJobsLoading(true);
    setDraftsLoading(true);
    const [jobsRes, draftsRes] = await Promise.allSettled([
      hermesGet("/jobs/recent?limit=10"),
      hermesGet(draftsFilter === "all" ? "/drafts" : `/drafts?niche=${draftsFilter}`),
    ]);
    if (jobsRes.status === "fulfilled" && !jobsRes.value?.error) setRecentJobs(jobsRes.value?.jobs || []);
    if (draftsRes.status === "fulfilled" && !draftsRes.value?.error) setDrafts(draftsRes.value?.drafts || []);
    setJobsLoading(false);
    setDraftsLoading(false);
  }, [draftsFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Generate single article
  const runArticle = async () => {
    if (!keyword.trim() || !niche) return;
    setGenerating(true);
    setError("");
    const res = await hermesPost("/article/run", {
      niche,
      keyword: keyword.trim(),
      dry_run: dryRun,
    });
    if (res.success || res.job_id) {
      setActiveJobId(res.job_id);
      setMessage(res.message || "Job started");
      setKeyword("");
    } else {
      setError(res.detail || res.error || res.message || "Failed to start job");
    }
    setGenerating(false);
  };

  // Pick from queue (highest volume unused keyword)
  const pickFromQueue = async () => {
    if (!niche) return;
    const res = await hermesGet(`/keywords/${niche}/list?limit=1&status=available`);
    if (res?.error) {
      setError(res.error);
      return;
    }
    const kws = res?.keywords || [];
    if (kws.length > 0) {
      setKeyword(kws[0].keyword);
      setMessage(`Picked: "${kws[0].keyword}" (vol: ${kws[0].search_volume})`);
    } else {
      setError("No available keywords in queue");
    }
  };

  // Generate batch (3 articles)
  const runBatch = async () => {
    if (!niche) return;
    setBatchRunning(true);
    setBatchCount(0);
    try {
      const res = await hermesGet(`/keywords/${niche}/list?limit=3&status=available`);
      const kws = res?.keywords || [];
      if (kws.length === 0) {
        setError("No available keywords in queue");
        setBatchRunning(false);
        return;
      }
      for (let i = 0; i < kws.length; i++) {
        setBatchCount(i + 1);
        const jobRes = await hermesPost("/article/run", {
          niche,
          keyword: kws[i].keyword,
          dry_run: dryRun,
        });
        if (jobRes.success || jobRes.job_id) {
          // Don't set activeJobId during batch to avoid double-polling
          // Wait for job to complete before starting next
          let completed = false;
          while (!completed) {
            await new Promise((r) => setTimeout(r, 5000));
            try {
              const status = await hermesGet(`/job/${jobRes.job_id}`);
              if (status.status === "complete" || status.status === "failed") {
                completed = true;
              }
            } catch { break; }
          }
        }
      }
      setMessage(`Batch complete: ${kws.length} articles processed`);
      loadData();
    } catch (err) {
      console.error("[Hermes] Batch error:", err);
      setError(`Batch error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBatchRunning(false);
      setBatchCount(0);
      setActiveJobId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-yellow-400">✍️ Content Generation</h1>
        <p className="text-gray-400 text-sm mt-1">Generate articles and review WordPress drafts</p>
      </div>

      {/* Feedback */}
      {message && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300 text-sm flex items-center justify-between">
          {message}<button onClick={() => setMessage("")} className="ml-2 text-emerald-400 hover:text-white">✕</button>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm flex items-center justify-between">
          {error}<button onClick={() => setError("")} className="ml-2 text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ── Generate New Article ────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-bold text-yellow-400">🚀 Generate New Article</h2>

        {/* Row 1: Site + Keyword */}
        <div className="grid sm:grid-cols-[1fr_2fr] gap-4">
          <div className="space-y-1.5">
            <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Site</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50 transition"
            >
              {sites.map((s) => (
                <option key={s.niche_id} value={s.niche_id}>
                  {s.name || s.niche_id}
                </option>
              ))}
              {sites.length === 0 && <option value="">No sites available</option>}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Keyword</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runArticle()}
                placeholder="e.g. best air fryer recipes"
                className="flex-1 rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition"
              />
              <button
                onClick={pickFromQueue}
                className="px-3 py-2.5 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition whitespace-nowrap"
              >
                🎯 Pick from queue
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-yellow-500"
            />
            <span className="text-sm text-white">Dry run</span>
            <span className="text-xs text-gray-400">(test only — don&apos;t publish)</span>
          </label>

          <button
            onClick={runArticle}
            disabled={!keyword.trim() || generating || batchRunning}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? (
              <span className="flex items-center gap-2"><Spinner className="text-black" /> Starting…</span>
            ) : (
              "▶ Generate Article"
            )}
          </button>

          <button
            onClick={runBatch}
            disabled={batchRunning || generating}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {batchRunning ? (
              <span className="flex items-center gap-2">
                <Spinner className="text-gray-300" /> Batch {batchCount}/3…
              </span>
            ) : (
              "Generate 3 Articles"
            )}
          </button>
        </div>
      </div>

      {/* ── Active Job Monitor ─────────────────────────────────────────── */}
      {activeJobId && (
        <JobMonitor
          jobId={activeJobId}
          onComplete={() => {
            if (!batchRunning) setActiveJobId(null);
            loadData();
          }}
        />
      )}

      {/* ── Recent Jobs ────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Jobs (Last 10)</h2>
        {jobsLoading ? (
          <div className="flex items-center justify-center py-6"><Spinner className="text-yellow-400" /><span className="ml-3 text-gray-400 text-sm">Loading…</span></div>
        ) : recentJobs.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No jobs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                  <th className="text-left pb-2 font-medium">Keyword</th>
                  <th className="text-left pb-2 font-medium">Site</th>
                  <th className="text-center pb-2 font-medium">Status</th>
                  <th className="text-center pb-2 font-medium">Score</th>
                  <th className="text-center pb-2 font-medium">Words</th>
                  <th className="text-right pb-2 font-medium">Completed</th>
                  <th className="text-right pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {recentJobs.map((job) => (
                  <tr key={job.job_id} className="hover:bg-gray-800/30 transition">
                    <td className="py-2 text-white font-medium max-w-[200px] truncate">{job.keyword}</td>
                    <td className="py-2 text-gray-400">{job.niche}</td>
                    <td className="py-2 text-center">
                      <span className={`text-xs font-semibold ${
                        job.status === "complete" ? "text-emerald-400" : job.status === "running" ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-2 text-center text-gray-400">{job.result?.quality_score ?? "—"}</td>
                    <td className="py-2 text-center text-gray-400">{job.result?.word_count?.toLocaleString() ?? "—"}</td>
                    <td className="py-2 text-right text-gray-500 text-xs">
                      {job.completed_at ? new Date(job.completed_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 text-right">
                      {job.result?.edit_url && (
                        <a href={job.result.edit_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-yellow-400 hover:text-yellow-300">Edit →</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pending Drafts ─────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Pending Drafts ({drafts.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDraftsFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition border ${
                draftsFilter === "all" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-gray-800 text-gray-400 border-gray-700"
              }`}
            >
              All sites
            </button>
            {sites.map((s) => (
              <button
                key={s.niche_id}
                onClick={() => setDraftsFilter(s.niche_id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition border ${
                  draftsFilter === s.niche_id ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" : "bg-gray-800 text-gray-400 border-gray-700"
                }`}
              >
                {s.name || s.niche_id}
              </button>
            ))}
          </div>
        </div>

        {draftsLoading ? (
          <div className="flex items-center justify-center py-6"><Spinner className="text-yellow-400" /></div>
        ) : drafts.length === 0 ? (
          <p className="text-gray-500 text-sm py-6 text-center">No pending drafts.</p>
        ) : (
          <div className="grid gap-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex flex-col sm:flex-row gap-3 rounded-xl bg-gray-800/40 border border-gray-800 p-4 hover:border-gray-700 transition"
              >
                {/* Thumbnail placeholder */}
                <div className="w-20 h-20 rounded-lg bg-gray-700/50 flex-shrink-0 flex items-center justify-center text-2xl">
                  {draft.featured_media > 0 ? "🖼" : "📝"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{draft.title}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                    {draft.niche && <span>Site: <b className="text-gray-300">{draft.niche}</b></span>}
                    {draft.word_count && <span>Words: <b className="text-gray-300">{draft.word_count.toLocaleString()}</b></span>}
                    <span className={draft.featured_media > 0 ? "text-emerald-400" : "text-yellow-500"}>
                      {draft.featured_media > 0 ? "✅ Hero image attached" : "⚠️ No image"}
                    </span>
                    <span>Date: {draft.date}</span>
                  </div>
                </div>
                <a
                  href={draft.edit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start px-4 py-2 rounded-lg text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white transition whitespace-nowrap"
                >
                  📝 Edit in WordPress →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
