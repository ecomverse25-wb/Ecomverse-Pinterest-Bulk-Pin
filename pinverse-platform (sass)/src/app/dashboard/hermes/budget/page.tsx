"use client";

import { useEffect, useState, useCallback } from "react";
import {
  hermesGet,
  hermesPost,
  formatCurrency,
  formatNumber,
  budgetColor,
  type BudgetData,
  type Stats,
} from "@/components/hermes/utils";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
    </svg>
  );
}

export default function BudgetPage() {
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(250);
  const [saving, setSaving] = useState(false);

  // Feedback
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(t); }
  }, [message]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 8000); return () => clearTimeout(t); }
  }, [error]);

  const loadBudget = useCallback(async () => {
    setLoading(true);
    const [budgetRes, statsRes] = await Promise.allSettled([
      hermesGet("/budget"),
      hermesGet("/stats"),
    ]);
    if (budgetRes.status === "fulfilled" && !budgetRes.value?.error) {
      setBudget(budgetRes.value);
      setEditValue(budgetRes.value.monthly_limit || 250);
    }
    if (statsRes.status === "fulfilled" && !statsRes.value?.error) {
      setStats(statsRes.value);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadBudget(); }, [loadBudget]);

  const handleSaveBudget = async () => {
    setSaving(true);
    const res = await hermesPost("/budget/update", { monthly_limit: editValue });
    if (res.success) {
      setMessage(`Budget updated to ${formatCurrency(editValue)}/month`);
      setEditing(false);
      loadBudget();
    } else {
      setError(res.detail || res.error || res.message || "Failed to update budget");
    }
    setSaving(false);
  };

  const dailyLimit = budget ? (budget.daily_limit || (budget.monthly_limit > 0 ? budget.monthly_limit / 30 : 8.33)) : 8.33;
  const dailyPct = budget && dailyLimit > 0 ? (budget.spent_today / dailyLimit) * 100 : 0;
  const monthlyPct = budget && budget.monthly_limit > 0 ? (budget.monthly_percent || (budget.spent_this_month / budget.monthly_limit) * 100) : 0;

  // Projections
  const projectedMonthly = budget
    ? budget.spent_today * 30
    : 0;
  const daysRemaining = budget && budget.spent_today > 0
    ? Math.floor((budget.monthly_limit - budget.spent_this_month) / budget.spent_today)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner className="text-yellow-400" />
        <span className="ml-3 text-gray-400 text-sm">Loading budget data…</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-yellow-400">💰 Budget & Usage</h1>
        <p className="text-gray-400 text-sm mt-1">Financial control and API usage tracking</p>
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

      {/* ── Budget Settings ────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Budget Settings</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
            >
              ✏️ Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="flex items-center gap-3">
            <label className="text-gray-400 text-sm">Monthly budget ($):</label>
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(Number(e.target.value))}
              min={10}
              step={10}
              className="w-32 rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50 transition"
            />
            <span className="text-gray-500 text-xs">Daily: {formatCurrency(editValue / 30)}</span>
            <button
              onClick={handleSaveBudget}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-50"
            >
              {saving ? <Spinner className="text-black" /> : "Save"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">Monthly Limit</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(budget?.monthly_limit ?? 250)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider">Daily Equivalent</p>
              <p className="text-2xl font-bold text-gray-400">{formatCurrency(dailyLimit)}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Current Period Usage ────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-5">
        <h2 className="text-lg font-bold text-white">Current Period Usage</h2>

        {/* Monthly */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm font-medium">Monthly</span>
            <span className={`text-lg font-bold ${budgetColor(monthlyPct).text}`}>
              {formatCurrency(budget?.spent_this_month ?? 0)}
              <span className="text-gray-500 text-sm font-normal"> / {formatCurrency(budget?.monthly_limit ?? 250)}</span>
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${budgetColor(monthlyPct).bar}`}
              style={{ width: `${Math.min(monthlyPct, 100)}%` }}
            />
          </div>
          <p className="text-gray-600 text-xs text-right">{monthlyPct.toFixed(1)}% used</p>
        </div>

        {/* Daily */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm font-medium">Today</span>
            <span className={`text-lg font-bold ${budgetColor(dailyPct).text}`}>
              {formatCurrency(budget?.spent_today ?? 0)}
              <span className="text-gray-500 text-sm font-normal"> / {formatCurrency(dailyLimit)}</span>
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-gray-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${budgetColor(dailyPct).bar}`}
              style={{ width: `${Math.min(dailyPct, 100)}%` }}
            />
          </div>
          <p className="text-gray-600 text-xs text-right">{dailyPct.toFixed(1)}% used</p>
        </div>
      </div>

      {/* ── API Quotas ─────────────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            label: "gemini-3.1-pro-preview",
            sublabel: "Content writing",
            used: stats?.budget?.content_calls_today ?? 0,
            limit: stats?.budget?.content_calls_limit ?? 250,
          },
          {
            label: "gemini-3.1-flash-image",
            sublabel: "Image generation",
            used: stats?.budget?.images_today ?? 0,
            limit: stats?.budget?.images_limit ?? 1000,
          },
          {
            label: "gemini-2.5-flash",
            sublabel: "Research + SEO",
            used: 0,
            limit: 10000,
          },
        ].map((q) => {
          const pct = q.limit > 0 ? (q.used / q.limit) * 100 : 0;
          return (
            <div key={q.label} className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-3">
              <p className="text-white text-sm font-semibold truncate">{q.label}</p>
              <p className="text-gray-500 text-xs">{q.sublabel}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${budgetColor(pct).text}`}>{formatNumber(q.used)}</span>
                <span className="text-gray-500 text-sm">/ {formatNumber(q.limit)}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${budgetColor(pct).bar}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Spending History ───────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Spending History (Last 30 Days)</h2>
        {budget?.history && budget.history.length > 0 ? (
          <>
            {/* CSS Bar Chart */}
            <div className="flex items-end gap-1 h-32">
              {budget.history.map((day, i) => {
                const maxAmount = Math.max(...budget.history!.map((d) => d.amount), 1);
                const h = (day.amount / maxAmount) * 100;
                const pct = (day.amount / dailyLimit) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${formatCurrency(day.amount)} (${day.articles} articles)`}>
                    <div
                      className={`w-full rounded-t transition-all ${budgetColor(pct).bar} hover:opacity-80`}
                      style={{ height: `${Math.max(h, 2)}%`, minHeight: "2px" }}
                    />
                  </div>
                );
              })}
            </div>
            {/* Table */}
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-900">
                  <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                    <th className="text-left pb-2 font-medium">Date</th>
                    <th className="text-center pb-2 font-medium">Articles</th>
                    <th className="text-right pb-2 font-medium">Cost</th>
                    <th className="text-right pb-2 font-medium">Budget %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {budget.history.map((day, i) => (
                    <tr key={i} className="hover:bg-gray-800/30">
                      <td className="py-1.5 text-gray-300">{day.date}</td>
                      <td className="py-1.5 text-center text-gray-400">{day.articles}</td>
                      <td className="py-1.5 text-right text-white font-medium">{formatCurrency(day.amount)}</td>
                      <td className="py-1.5 text-right text-gray-400">{((day.amount / dailyLimit) * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-sm py-4 text-center">No spending history available yet.</p>
        )}
      </div>

      {/* ── Projections ────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
        <h2 className="text-lg font-bold text-white mb-4">Projections</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-800/50 p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Projected Monthly Spend</p>
            <p className={`text-2xl font-bold mt-1 ${budgetColor((projectedMonthly / (budget?.monthly_limit ?? 250)) * 100).text}`}>
              {formatCurrency(projectedMonthly)}
            </p>
            <p className="text-gray-500 text-xs mt-1">Based on today&apos;s spending rate</p>
          </div>
          <div className="rounded-lg bg-gray-800/50 p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Days Remaining in Budget</p>
            <p className="text-2xl font-bold text-white mt-1">
              {daysRemaining !== null ? `${daysRemaining} days` : "∞"}
            </p>
            <p className="text-gray-500 text-xs mt-1">Before monthly limit is reached</p>
          </div>
        </div>
      </div>
    </div>
  );
}
