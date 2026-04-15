"use client";

import { useEffect, useState, useCallback } from "react";
import StatusBadge from "@/components/hermes/StatusBadge";
import {
  hermesGet,
  hermesPost,
  formatCurrency,
  budgetColor,
  type Stats,
  type HealthData,
  type Job,
  type Draft,
} from "@/components/hermes/utils";

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
    </svg>
  );
}

// ─── Main Overview Page ──────────────────────────────────────────────────────
export default function HermesOverview() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [hermesOnline, setHermesOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Auto-dismiss messages
  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(t); }
  }, [message]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 8000); return () => clearTimeout(t); }
  }, [error]);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    const [healthRes, statsRes, jobsRes, draftsRes] = await Promise.allSettled([
      hermesGet("/health"),
      hermesGet("/stats"),
      hermesGet("/jobs/recent?limit=5"),
      hermesGet("/drafts"),
    ]);

    if (healthRes.status === "fulfilled" && healthRes.value?.status === "online") {
      setHermesOnline(true);
      setHealth(healthRes.value);
    } else {
      setHermesOnline(false);
    }

    if (statsRes.status === "fulfilled" && !statsRes.value?.error) {
      setStats(statsRes.value);
    }

    if (jobsRes.status === "fulfilled" && !jobsRes.value?.error) {
      setRecentJobs(jobsRes.value?.jobs || []);
    }

    if (draftsRes.status === "fulfilled" && !draftsRes.value?.error) {
      setDrafts((draftsRes.value?.drafts || []).slice(0, 5));
    }

    setLastUpdated(new Date().toLocaleTimeString());
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Quick generate — picks from keyword queue, then generates
  const quickGenerate = async (niche: string) => {
    // Step 1: pick the highest-volume available keyword
    const kwRes = await hermesGet(`/keywords/${niche}/list?limit=1&status=available`);
    if (kwRes?.error) {
      setError(kwRes.error);
      return;
    }
    const kws = kwRes?.keywords || [];
    if (kws.length === 0) {
      setError(`No available keywords in queue for ${niche}`);
      return;
    }
    const keyword = kws[0].keyword;

    // Step 2: start the generation
    const res = await hermesPost("/article/run", { niche, keyword, dry_run: true });
    if (res.success || res.job_id) {
      setMessage(`Job started for ${niche}: "${keyword}"`);
    } else {
      setError(res.detail || res.error || res.message || "Failed to start job");
    }
  };

  const budget = stats?.budget;
  const dailyPct = budget && budget.daily_limit > 0 ? (budget.spent_today / budget.daily_limit) * 100 : 0;
  const monthlyPct = budget && budget.monthly_limit > 0 ? (budget.spent_this_month / budget.monthly_limit) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-yellow-400 flex items-center gap-2">
            ⚡ Hermes Control Center
          </h1>
          <p className="text-gray-400 text-sm mt-1">Private content automation dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={hermesOnline ? "online" : "offline"} />
          {lastUpdated && <span className="text-gray-600 text-xs">Updated {lastUpdated}</span>}
          <button
            onClick={loadData}
            disabled={refreshing}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition disabled:opacity-50"
          >
            {refreshing ? <span className="flex items-center gap-1.5"><Spinner className="text-gray-300" /> Refreshing…</span> : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* Feedback banners */}
      {message && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300 text-sm flex items-center justify-between">
          {message}
          <button onClick={() => setMessage("")} className="ml-2 text-emerald-400 hover:text-white">✕</button>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ── System Status Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Hermes Brain", value: health?.models?.research || "gemini-2.5-pro", icon: "🧠" },
          { label: "Article Writer", value: health?.models?.content || "gemini-3.1-pro-preview", icon: "✍️" },
          { label: "Image Generator", value: health?.models?.images || "gemini-3.1-flash-image-preview", icon: "🎨" },
          { label: "VPS", value: "34.62.198.158", icon: "🖥️" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl p-4 bg-gray-900 border border-gray-800 flex items-center gap-3">
            <span className="text-lg">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">{item.label}</p>
              <p className="text-white text-xs font-medium truncate">{item.value}</p>
            </div>
            <span className="ml-auto text-emerald-400 text-xs">{hermesOnline ? "✅" : "❌"}</span>
          </div>
        ))}
      </div>

      {/* ── Budget Overview ──────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Budget Overview</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Daily */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">Today</span>
              <span className={`text-sm font-bold ${budgetColor(dailyPct).text}`}>
                {formatCurrency(budget?.spent_today ?? 0)} / {formatCurrency(budget?.daily_limit ?? 8.33)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${budgetColor(dailyPct).bar}`}
                style={{ width: `${Math.min(dailyPct, 100)}%` }}
              />
            </div>
          </div>
          {/* Monthly */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">This Month</span>
              <span className={`text-sm font-bold ${budgetColor(monthlyPct).text}`}>
                {formatCurrency(budget?.spent_this_month ?? 0)} / {formatCurrency(budget?.monthly_limit ?? 250)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${budgetColor(monthlyPct).bar}`}
                style={{ width: `${Math.min(monthlyPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
        {/* API Quotas */}
        <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-800 text-xs text-gray-400">
          <span>Content calls: <b className="text-white">{budget?.content_calls_today ?? 0}</b> / {budget?.content_calls_limit ?? 250}</span>
          <span>Images: <b className="text-white">{budget?.images_today ?? 0}</b> / {budget?.images_limit ?? 1000}</span>
        </div>
      </div>

      {/* ── Sites Grid ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Active Sites</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats?.niches && Object.entries(stats.niches).map(([nicheId, niche]) => (
            <div key={nicheId} className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-3 hover:border-gray-700 transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">{niche.display_name || nicheId}</p>
                  <p className="text-gray-500 text-xs truncate">{niche.site_url || ""}</p>
                </div>
                <StatusBadge status={hermesOnline ? "online" : "offline"} size="sm" />
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                  {niche.keywords_available ?? 0} keywords
                </span>
                <span className="text-gray-400">{niche.articles_today ?? 0} articles today</span>
              </div>
              <button
                onClick={() => quickGenerate(nicheId)}
                disabled={!hermesOnline}
                className="w-full py-2 rounded-lg text-xs font-semibold bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ▶ Generate
              </button>
            </div>
          ))}
          {(!stats?.niches || Object.keys(stats.niches).length === 0) && (
            <div className="col-span-full text-center py-8 text-gray-500 text-sm">
              No sites configured. Add sites in the Sites tab.
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Jobs ──────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Recent Jobs</h2>
        {recentJobs.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No recent jobs.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                  <th className="text-left pb-2 font-medium">Keyword</th>
                  <th className="text-left pb-2 font-medium">Site</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Score</th>
                  <th className="text-right pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {recentJobs.map((job) => (
                  <tr key={job.job_id} className="hover:bg-gray-800/30 transition">
                    <td className="py-2.5 text-white font-medium">{job.keyword}</td>
                    <td className="py-2.5 text-gray-400">{job.niche}</td>
                    <td className="py-2.5">
                      <span className={`text-xs font-semibold ${
                        job.status === "complete" ? "text-emerald-400" :
                        job.status === "running" ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {job.status === "complete" ? "✅" : job.status === "running" ? "🔄" : "❌"} {job.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-400">{job.result?.quality_score ? `${job.result.quality_score}/100` : "—"}</td>
                    <td className="py-2.5 text-right">
                      {job.result?.edit_url && (
                        <a href={job.result.edit_url} target="_blank" rel="noopener noreferrer" className="text-xs text-yellow-400 hover:text-yellow-300">
                          Edit →
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pending Drafts ───────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-3">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Pending Drafts ({drafts.length})
        </h2>
        {drafts.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No pending drafts.</p>
        ) : (
          <div className="space-y-2">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-gray-800/40 border border-gray-800 px-4 py-3 hover:border-gray-700 transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate">{draft.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {draft.niche && <span className="text-gray-500 text-xs">{draft.niche}</span>}
                    <span className={`text-xs ${draft.featured_media > 0 ? "text-emerald-400" : "text-yellow-500"}`}>
                      {draft.featured_media > 0 ? "✅ Image" : "⚠️ No image"}
                    </span>
                    {draft.word_count && <span className="text-gray-500 text-xs">{draft.word_count.toLocaleString()} words</span>}
                    <span className="text-gray-600 text-xs">{draft.date}</span>
                  </div>
                </div>
                <a
                  href={draft.edit_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-white transition"
                >
                  📝 Edit in WordPress →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="text-center py-4 border-t border-gray-800">
        <p className="text-gray-600 text-xs">
          Hermes Content OS v2.0 · Private Dashboard · Emarketing Solutions
        </p>
      </div>
    </div>
  );
}
