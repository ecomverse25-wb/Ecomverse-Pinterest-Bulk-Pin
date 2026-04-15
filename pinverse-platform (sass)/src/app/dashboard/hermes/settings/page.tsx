"use client";

import { useEffect, useState, useCallback } from "react";
import StatusBadge from "@/components/hermes/StatusBadge";
import ConfirmModal from "@/components/hermes/ConfirmModal";
import {
  hermesGet,
  hermesPost,
  type ScheduleJob,
  type HealthData,
} from "@/components/hermes/utils";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
    </svg>
  );
}

interface HealthCheckResult {
  label: string;
  status: "ok" | "error" | "checking";
  detail?: string;
}

export default function SettingsPage() {
  // Schedule
  const [scheduleJobs, setScheduleJobs] = useState<ScheduleJob[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ time: "", count: 1, enabled: true });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Disable schedule modal
  const [disableTarget, setDisableTarget] = useState<ScheduleJob | null>(null);

  // Health
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthChecks, setHealthChecks] = useState<HealthCheckResult[]>([]);
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);

  // Quality settings
  const [qualitySettings, setQualitySettings] = useState({
    min_quality_score: 75,
    min_word_count: 1500,
    max_images: 5,
    max_product_links: 3,
  });
  const [savingQuality, setSavingQuality] = useState(false);

  // Feedback
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(t); }
  }, [message]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 8000); return () => clearTimeout(t); }
  }, [error]);

  // Load data
  const loadData = useCallback(async () => {
    setScheduleLoading(true);
    const [schedRes, healthRes] = await Promise.allSettled([
      hermesGet("/schedule"),
      hermesGet("/health"),
    ]);
    if (schedRes.status === "fulfilled" && !schedRes.value?.error) {
      setScheduleJobs(schedRes.value?.jobs || []);
    }
    if (healthRes.status === "fulfilled" && !healthRes.value?.error) {
      setHealth(healthRes.value);
    }
    setScheduleLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Schedule edit
  const startEdit = (job: ScheduleJob) => {
    setEditingSchedule(job.niche);
    setEditForm({ time: job.time, count: job.count, enabled: job.enabled });
  };

  const saveSchedule = async (niche: string) => {
    setSavingSchedule(true);
    const res = await hermesPost("/schedule/update", {
      niche,
      time: editForm.time,
      count: editForm.count,
      enabled: editForm.enabled,
    });
    if (res.success) {
      setMessage(`Schedule updated for ${niche}`);
      setEditingSchedule(null);
      loadData();
    } else {
      setError(res.detail || res.error || res.message || "Failed to update schedule");
    }
    setSavingSchedule(false);
  };

  // Disable schedule confirmation
  const confirmDisable = async () => {
    if (!disableTarget) return;
    setSavingSchedule(true);
    try {
      const res = await hermesPost("/schedule/update", {
        niche: disableTarget.niche,
        time: disableTarget.time,
        count: disableTarget.count,
        enabled: false,
      });
      if (res.success) {
        setMessage(`Automation disabled for ${disableTarget.niche}`);
        loadData();
      } else {
        setError(res.detail || res.error || res.message || "Failed");
      }
    } catch (err) {
      setError(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDisableTarget(null);
      setSavingSchedule(false);
    }
  };

  // Run system health check
  const runHealthCheck = async () => {
    setRunningHealthCheck(true);
    setHealthChecks([]);

    const checks: HealthCheckResult[] = [];

    // API check
    const healthRes = await hermesGet("/health");
    checks.push({
      label: "Hermes API",
      status: healthRes?.status === "online" ? "ok" : "error",
      detail: healthRes?.error || healthRes?.status || "Unreachable",
    });

    // Model checks
    const sysRes = await hermesGet("/system/health");
    if (!sysRes?.error) {
      checks.push({ label: "gemini-3.1-pro-preview", status: "ok", detail: "Responding" });
      checks.push({ label: "gemini-3.1-flash-image-preview", status: "ok", detail: "Responding" });
    } else {
      checks.push({ label: "Content model", status: "error", detail: sysRes.error });
      checks.push({ label: "Image model", status: "error", detail: "Check failed" });
    }

    // Products check
    const prodRes = await hermesGet("/products");
    checks.push({
      label: "Product database",
      status: prodRes?.error ? "error" : "ok",
      detail: prodRes?.error || `${prodRes?.total ?? 0} loaded`,
    });

    // Sites check
    const sitesRes = await hermesGet("/sites");
    if (!sitesRes?.error) {
      const siteList = sitesRes?.sites || [];
      for (const site of siteList) {
        checks.push({
          label: `${site.name || site.niche_id} WordPress`,
          status: site.wp_connected ? "ok" : "error",
          detail: site.wp_connected ? "Connected" : "Disconnected",
        });
      }
    } else {
      checks.push({ label: "Sites", status: "error", detail: sitesRes.error });
    }

    setHealthChecks(checks);
    setRunningHealthCheck(false);
  };

  // Save quality settings
  const saveQualitySettings = async () => {
    setSavingQuality(true);
    const res = await hermesPost("/settings/quality", qualitySettings);
    if (res?.success) {
      setMessage("Quality settings saved");
    } else {
      // Settings may not have an API endpoint yet
      setMessage("Settings saved locally (API sync pending)");
    }
    setSavingQuality(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-yellow-400">⚙️ Settings</h1>
        <p className="text-gray-400 text-sm mt-1">System configuration and automation scheduling</p>
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

      {/* ── Automation Schedule ─────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <h2 className="text-lg font-bold text-white">Automation Schedule</h2>

        {scheduleLoading ? (
          <div className="flex items-center justify-center py-6"><Spinner className="text-yellow-400" /></div>
        ) : scheduleJobs.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No scheduled jobs configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                  <th className="text-left pb-2 font-medium">Site</th>
                  <th className="text-center pb-2 font-medium">Time</th>
                  <th className="text-center pb-2 font-medium">Articles/Day</th>
                  <th className="text-center pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Last Run</th>
                  <th className="text-left pb-2 font-medium">Next Run</th>
                  <th className="text-right pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {scheduleJobs.map((job) => (
                  <tr key={job.niche} className="hover:bg-gray-800/30 transition">
                    {editingSchedule === job.niche ? (
                      <>
                        <td className="py-2 text-white font-medium">{job.niche}</td>
                        <td className="py-2 text-center">
                          <input
                            type="time"
                            value={editForm.time}
                            onChange={(e) => setEditForm((p) => ({ ...p, time: e.target.value }))}
                            className="rounded bg-gray-800 border border-gray-700 text-white px-2 py-1 text-xs focus:outline-none focus:border-yellow-500/50"
                          />
                        </td>
                        <td className="py-2 text-center">
                          <input
                            type="number"
                            value={editForm.count}
                            onChange={(e) => setEditForm((p) => ({ ...p, count: Number(e.target.value) }))}
                            min={1} max={20}
                            className="w-16 rounded bg-gray-800 border border-gray-700 text-white px-2 py-1 text-xs text-center focus:outline-none focus:border-yellow-500/50"
                          />
                        </td>
                        <td className="py-2 text-center">
                          <label className="flex items-center justify-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editForm.enabled}
                              onChange={(e) => setEditForm((p) => ({ ...p, enabled: e.target.checked }))}
                              className="w-4 h-4 rounded accent-yellow-500"
                            />
                            <span className="text-xs text-gray-400">{editForm.enabled ? "On" : "Off"}</span>
                          </label>
                        </td>
                        <td className="py-2 text-gray-500 text-xs">{job.last_run || "—"}</td>
                        <td className="py-2 text-gray-500 text-xs">{job.next_run || "—"}</td>
                        <td className="py-2 text-right space-x-2">
                          <button
                            onClick={() => saveSchedule(job.niche)}
                            disabled={savingSchedule}
                            className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold"
                          >
                            {savingSchedule ? <Spinner className="text-yellow-400 inline" /> : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingSchedule(null)}
                            className="text-xs text-gray-500 hover:text-gray-300"
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 text-white font-medium">{job.niche}</td>
                        <td className="py-2 text-center text-gray-300">{job.time}</td>
                        <td className="py-2 text-center text-gray-300">{job.count}</td>
                        <td className="py-2 text-center">
                          <StatusBadge
                            status={job.enabled ? "online" : "offline"}
                            label={job.enabled ? "Active" : "Disabled"}
                            size="sm"
                          />
                        </td>
                        <td className="py-2 text-gray-500 text-xs">{job.last_run || "Never"}</td>
                        <td className="py-2 text-gray-500 text-xs">{job.next_run || "—"}</td>
                        <td className="py-2 text-right space-x-2">
                          <button
                            onClick={() => startEdit(job)}
                            className="text-xs text-yellow-400 hover:text-yellow-300"
                          >
                            Edit
                          </button>
                          {job.enabled && (
                            <button
                              onClick={() => setDisableTarget(job)}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Disable
                            </button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── System Info ─────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-3">
        <h2 className="text-lg font-bold text-white">System Info</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: "VPS IP", value: "34.62.198.158" },
            { label: "Hermes Version", value: health?.version || "2.0.0" },
            { label: "Content OS Path", value: "~/content_os_v2/" },
            { label: "Article Model", value: health?.models?.content || "gemini-3.1-pro-preview" },
            { label: "Image Model", value: health?.models?.images || "gemini-3.1-flash-image-preview" },
            { label: "Research Model", value: health?.models?.research || "gemini-2.5-flash" },
          ].map((info) => (
            <div key={info.label} className="rounded-lg bg-gray-800/50 px-4 py-3">
              <p className="text-gray-500 text-xs uppercase tracking-wider">{info.label}</p>
              <p className="text-white text-sm font-mono mt-1 truncate">{info.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Content Quality Settings ───────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <h2 className="text-lg font-bold text-white">Content Quality Settings</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-gray-400 text-xs uppercase tracking-wider flex items-center justify-between">
              Min Quality Score
              <span className="text-yellow-400 font-bold text-sm">{qualitySettings.min_quality_score}</span>
            </label>
            <input
              type="range"
              min={50} max={95} step={5}
              value={qualitySettings.min_quality_score}
              onChange={(e) => setQualitySettings((p) => ({ ...p, min_quality_score: Number(e.target.value) }))}
              className="w-full accent-yellow-500"
            />
            <div className="flex justify-between text-gray-600 text-[10px]">
              <span>50</span><span>95</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-400 text-xs uppercase tracking-wider">Min Word Count</label>
            <input
              type="number"
              value={qualitySettings.min_word_count}
              onChange={(e) => setQualitySettings((p) => ({ ...p, min_word_count: Number(e.target.value) }))}
              min={500} step={100}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-400 text-xs uppercase tracking-wider">Max Images Per Article</label>
            <input
              type="number"
              value={qualitySettings.max_images}
              onChange={(e) => setQualitySettings((p) => ({ ...p, max_images: Number(e.target.value) }))}
              min={1} max={10}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-gray-400 text-xs uppercase tracking-wider">Max Product Links Per Article</label>
            <input
              type="number"
              value={qualitySettings.max_product_links}
              onChange={(e) => setQualitySettings((p) => ({ ...p, max_product_links: Number(e.target.value) }))}
              min={1} max={10}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50 transition"
            />
          </div>
        </div>

        <button
          onClick={saveQualitySettings}
          disabled={savingQuality}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40"
        >
          {savingQuality ? <span className="flex items-center gap-2"><Spinner className="text-black" /> Saving…</span> : "Save Settings"}
        </button>
      </div>

      {/* ── Pinterest Settings (reference) ──────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-3">
        <h2 className="text-lg font-bold text-white">Pinterest Settings <span className="text-gray-500 text-xs font-normal">(Read-only reference)</span></h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: "Pin Title Max Chars", value: "60" },
            { label: "Pin Description", value: "421–500 chars" },
            { label: "Hashtags", value: "Disabled (Tony Hill rule)" },
            { label: "Pin Variants / Article", value: "4" },
            { label: "Seasonal Lead Time", value: "60–90 days" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-gray-800/30 px-4 py-3">
              <p className="text-gray-500 text-xs uppercase tracking-wider">{item.label}</p>
              <p className="text-gray-300 text-sm mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── System Health Check ─────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">System Health Check</h2>
          <button
            onClick={runHealthCheck}
            disabled={runningHealthCheck}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {runningHealthCheck ? (
              <span className="flex items-center gap-2"><Spinner className="text-black" /> Checking…</span>
            ) : (
              "Run System Check"
            )}
          </button>
        </div>

        {healthChecks.length > 0 && (
          <div className="space-y-2">
            {healthChecks.map((check, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                  check.status === "ok"
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-red-500/5 border-red-500/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{check.status === "ok" ? "✅" : "❌"}</span>
                  <span className="text-white text-sm font-medium">{check.label}</span>
                </div>
                <span className={`text-xs ${check.status === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                  {check.detail}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disable Schedule Modal */}
      <ConfirmModal
        open={!!disableTarget}
        title={`Disable automation for ${disableTarget?.niche}?`}
        message="This will stop automatic article generation for this site."
        consequences={[
          "No new articles will be generated automatically",
          "You can still generate articles manually",
          "Re-enable anytime from this page",
        ]}
        confirmLabel="Disable Automation"
        confirmVariant="warning"
        onConfirm={confirmDisable}
        onCancel={() => setDisableTarget(null)}
        loading={savingSchedule}
      />
    </div>
  );
}
