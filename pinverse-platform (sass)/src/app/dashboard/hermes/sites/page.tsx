"use client";

import { useEffect, useState, useCallback } from "react";
import StatusBadge from "@/components/hermes/StatusBadge";
import ConfirmModal from "@/components/hermes/ConfirmModal";
import {
  hermesGet,
  hermesPost,
  hermesDelete,
  formatDate,
  type Site,
} from "@/components/hermes/utils";

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
    </svg>
  );
}

// ─── Add Site Form Defaults ──────────────────────────────────────────────────
const TONE_OPTIONS = [
  "warm-conversational",
  "practical-helpful",
  "aspirational-warm",
  "caring-authoritative",
  "friendly-trendy",
  "knowledgeable-inclusive",
];
const AD_NETWORKS = ["None", "Mediavine", "Ezoic", "Raptive", "AdThrive"];
const CONTENT_TYPES = ["roundup", "listicle", "how-to", "product-review", "buying-guide"];
const AFFILIATE_PROGRAMS = ["Amazon Associates", "Mediavine", "Wayfair", "ShareASale", "Other"];

const EMPTY_FORM = {
  niche_id: "",
  display_name: "",
  site_url: "",
  wp_username: "",
  wp_app_password: "",
  affiliate_programs: [] as string[],
  ad_network: "None",
  tone: "warm-conversational",
  content_types: [] as string[],
};

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(t); }
  }, [message]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 8000); return () => clearTimeout(t); }
  }, [error]);

  const loadSites = useCallback(async () => {
    setLoading(true);
    const res = await hermesGet("/sites");
    if (res?.error) {
      setError(res.error);
    } else {
      setSites(res?.sites || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSites(); }, [loadSites]);

  const handleSubmit = async () => {
    if (!form.niche_id.trim() || !form.site_url.trim()) {
      setError("Niche ID and Site URL are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await hermesPost("/sites", form);
      if (res.success || res.message?.toLowerCase().includes("added")) {
        setMessage(`✅ Site "${form.display_name || form.niche_id}" added successfully`);
        setForm({ ...EMPTY_FORM });
        setShowAddForm(false);
        loadSites();
      } else {
        setError(res.detail || res.error || res.message || "Failed to add site");
      }
    } catch (err) {
      setError(`Failed to add site: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  const testConnection = async (nicheId: string) => {
    setTesting(nicheId);
    const res = await hermesPost(`/sites/${nicheId}/test`, {});
    if (res.connected) {
      setMessage(`✅ Connected to ${res.site_url}`);
    } else {
      setError(`Connection failed: ${res.error || "Unknown error"}`);
    }
    setTesting(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await hermesDelete(`/sites/${deleteTarget.niche_id}`);
      if (res.success || res.message?.toLowerCase().includes("removed") || res.message?.toLowerCase().includes("deleted")) {
        setMessage(`Site "${deleteTarget.name || deleteTarget.niche_id}" removed from Hermes`);
        loadSites();
      } else {
        setError(res.detail || res.error || res.message || "Failed to delete site");
      }
    } catch (err) {
      setError(`Failed to delete site: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeleteTarget(null);
      setDeleting(false);
    }
  };

  const toggleArrayField = (field: "affiliate_programs" | "content_types", value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-yellow-400">🌐 Site Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage WordPress sites connected to Hermes</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition"
        >
          {showAddForm ? "✕ Cancel" : "+ Add Site"}
        </button>
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

      {/* ── Add Site Form ──────────────────────────────────────────────── */}
      {showAddForm && (
        <div className="rounded-xl bg-gray-900 border border-yellow-500/20 p-6 space-y-5">
          <h2 className="text-lg font-bold text-white">Add New Site to Hermes</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Niche ID */}
            <div className="space-y-1.5">
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Niche ID</label>
              <input
                type="text" value={form.niche_id}
                onChange={(e) => setForm((p) => ({ ...p, niche_id: e.target.value.replace(/\s/g, "_").toLowerCase() }))}
                placeholder="e.g. home_decor"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition"
              />
            </div>
            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Display Name</label>
              <input
                type="text" value={form.display_name}
                onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                placeholder="e.g. Home Decor Ideas"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition"
              />
            </div>
            {/* Site URL */}
            <div className="space-y-1.5">
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Site URL</label>
              <input
                type="url" value={form.site_url}
                onChange={(e) => setForm((p) => ({ ...p, site_url: e.target.value }))}
                placeholder="https://myhomedecor.com"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition"
              />
            </div>
            {/* WP Username */}
            <div className="space-y-1.5">
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">WordPress Username</label>
              <input
                type="text" value={form.wp_username}
                onChange={(e) => setForm((p) => ({ ...p, wp_username: e.target.value }))}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition"
              />
            </div>
            {/* WP App Password */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">WordPress Application Password</label>
              <input
                type="password" value={form.wp_app_password}
                onChange={(e) => setForm((p) => ({ ...p, wp_app_password: e.target.value }))}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition"
              />
              <p className="text-gray-500 text-xs">Get from: WP Admin → Users → Your Profile → Application Passwords</p>
            </div>
          </div>

          {/* Tone & Ad Network */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Content Tone</label>
              <select
                value={form.tone}
                onChange={(e) => setForm((p) => ({ ...p, tone: e.target.value }))}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50 transition"
              >
                {TONE_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Ad Network</label>
              <select
                value={form.ad_network}
                onChange={(e) => setForm((p) => ({ ...p, ad_network: e.target.value }))}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50 transition"
              >
                {AD_NETWORKS.map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
            </div>
          </div>

          {/* Affiliate Programs */}
          <div className="space-y-2">
            <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Affiliate Programs</label>
            <div className="flex flex-wrap gap-3">
              {AFFILIATE_PROGRAMS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.affiliate_programs.includes(p)}
                    onChange={() => toggleArrayField("affiliate_programs", p)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-yellow-500"
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>

          {/* Content Types */}
          <div className="space-y-2">
            <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Content Types</label>
            <div className="flex flex-wrap gap-3">
              {CONTENT_TYPES.map((ct) => (
                <label key={ct} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.content_types.includes(ct)}
                    onChange={() => toggleArrayField("content_types", ct)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-yellow-500"
                  />
                  {ct}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !form.niche_id.trim() || !form.site_url.trim()}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? <span className="flex items-center gap-2"><Spinner className="text-black" /> Adding…</span> : "Add Site to Hermes"}
          </button>
        </div>
      )}

      {/* ── Sites List ─────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="text-yellow-400" />
            <span className="ml-3 text-gray-400 text-sm">Loading sites…</span>
          </div>
        ) : sites.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No sites configured yet.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-3 text-yellow-400 text-sm hover:text-yellow-300"
            >
              + Add your first site
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800 bg-gray-900/50">
                  <th className="text-left px-5 py-3 font-medium">Site</th>
                  <th className="text-left px-5 py-3 font-medium">Niche ID</th>
                  <th className="text-center px-5 py-3 font-medium">Connection</th>
                  <th className="text-center px-5 py-3 font-medium">Keywords</th>
                  <th className="text-center px-5 py-3 font-medium">Articles</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {sites.map((site) => (
                  <tr key={site.id || site.niche_id} className="hover:bg-gray-800/30 transition">
                    <td className="px-5 py-3">
                      <p className="text-white font-medium">{site.name}</p>
                      <p className="text-gray-500 text-xs">{site.url}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-400 font-mono text-xs">{site.niche_id}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <StatusBadge status={site.wp_connected ? "online" : "offline"} label={site.wp_connected ? "Connected" : "Disconnected"} size="sm" />
                        <button
                          onClick={() => testConnection(site.niche_id)}
                          disabled={testing === site.niche_id}
                          className="text-[10px] text-gray-500 hover:text-yellow-400 transition"
                        >
                          {testing === site.niche_id ? <Spinner className="text-yellow-400" /> : "Test"}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center text-emerald-400 font-semibold">{site.keywords_available ?? 0}</td>
                    <td className="px-5 py-3 text-center text-gray-400">{site.articles_total ?? 0}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setDeleteTarget(site)}
                        className="text-xs text-red-400 hover:text-red-300 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name || "site"}?`}
        message="This will remove the site from Hermes automation."
        consequences={[
          "WordPress content will NOT be deleted",
          "Keyword database for this site will be cleared",
          "Scheduled automation for this site will stop",
        ]}
        confirmLabel="Delete Site"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
