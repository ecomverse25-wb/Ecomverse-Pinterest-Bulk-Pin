// ─── Hermes API Helpers ──────────────────────────────────────────────────────
// All browser-side API calls route through /api/hermes/proxy
// The proxy adds auth + HERMES_API_KEY server-side
//
// IMPORTANT: These helpers NEVER throw. On failure they return { error: "..." }
// so every page degrades gracefully when Hermes is offline.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeJson(r: Response): Promise<any> {
  try {
    return await r.json();
  } catch {
    return { error: `Hermes returned status ${r.status} (non-JSON)`, success: false };
  }
}

export async function hermesGet(path: string) {
  try {
    const r = await fetch(`/api/hermes/proxy?path=${encodeURIComponent(path)}`, {
      cache: "no-store",
    });
    const data = await safeJson(r);
    if (!r.ok) {
      console.warn(`[Hermes] GET ${path} → ${r.status}:`, data?.error || data?.detail);
      return { error: data?.error || data?.detail || `Hermes API error: ${r.status}`, success: false };
    }
    return data;
  } catch (err) {
    console.warn(`[Hermes] GET ${path} network error:`, err);
    return { error: "Cannot reach Hermes — check VPS connection", success: false };
  }
}

export async function hermesPost(path: string, body: object) {
  try {
    const r = await fetch("/api/hermes/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, body }),
    });
    const data = await safeJson(r);
    if (!r.ok) {
      console.warn(`[Hermes] POST ${path} → ${r.status}:`, data?.error || data?.detail);
      return { error: data?.error || data?.detail || `Hermes API error: ${r.status}`, success: false, ...data };
    }
    return data;
  } catch (err) {
    console.warn(`[Hermes] POST ${path} network error:`, err);
    return { error: "Cannot reach Hermes — check VPS connection", success: false };
  }
}

export async function hermesDelete(path: string) {
  try {
    const r = await fetch(
      `/api/hermes/proxy?path=${encodeURIComponent(path)}`,
      { method: "DELETE" }
    );
    const data = await safeJson(r);
    if (!r.ok) {
      console.warn(`[Hermes] DELETE ${path} → ${r.status}:`, data?.error || data?.detail);
      return { error: data?.error || data?.detail || `Hermes API error: ${r.status}`, success: false };
    }
    return data;
  } catch (err) {
    console.warn(`[Hermes] DELETE ${path} network error:`, err);
    return { error: "Cannot reach Hermes — check VPS connection", success: false };
  }
}

// ─── Format Helpers ──────────────────────────────────────────────────────────

export const formatCurrency = (n: number) => `$${(n || 0).toFixed(2)}`;
export const formatNumber = (n: number) => (n || 0).toLocaleString();
export const formatDate = (s: string) =>
  new Date(s).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
export const formatDateTime = (s: string) =>
  new Date(s).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export const formatPercent = (n: number) => `${n.toFixed(1)}%`;

export const budgetColor = (pct: number) => {
  if (pct >= 80) return { bar: "bg-red-500", text: "text-red-400" };
  if (pct >= 50) return { bar: "bg-yellow-500", text: "text-yellow-400" };
  return { bar: "bg-emerald-500", text: "text-emerald-400" };
};

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface Site {
  id: string;
  name: string;
  url: string;
  niche_id: string;
  status: string;
  keywords_available: number;
  articles_total: number;
  created_at: string;
  wp_username: string;
  wp_connected: boolean;
}

export interface NicheStats {
  keywords_available: number;
  keywords_used: number;
  articles_today: number;
  site_url: string;
  display_name: string;
  error?: string;
}

export interface Stats {
  date: string;
  products: number;
  niches: Record<string, NicheStats>;
  budget: {
    spent_today: number;
    spent_this_month: number;
    daily_limit: number;
    monthly_limit: number;
    daily_percent: number;
    monthly_percent: number;
    content_calls_today: number;
    content_calls_limit: number;
    images_today: number;
    images_limit: number;
  };
}

export interface HealthData {
  status: "online" | "offline";
  version: string;
  timestamp: string;
  models: {
    content: string;
    images: string;
    research: string;
  };
}

export interface KeywordItem {
  id: string;
  keyword: string;
  search_volume: number;
  followers: number;
  status: string;
  used_at: string | null;
}

export interface Job {
  job_id: string;
  keyword: string;
  niche: string;
  status: "running" | "complete" | "failed";
  output?: string;
  errors?: string;
  completed_at?: string;
  result?: {
    title: string;
    word_count: number;
    quality_score: number;
    post_id?: number;
    edit_url?: string;
  };
}

export interface Draft {
  id: number;
  title: string;
  edit_url: string;
  date: string;
  featured_media: number;
  niche?: string;
  word_count?: number;
}

export interface BudgetData {
  daily_limit: number;
  monthly_limit: number;
  spent_today: number;
  spent_this_month: number;
  daily_percent: number;
  monthly_percent: number;
  history?: { date: string; amount: number; articles: number }[];
}

export interface ScheduleJob {
  niche: string;
  time: string;
  count: number;
  enabled: boolean;
  last_run: string;
  next_run: string;
}

export interface Product {
  title: string;
  url: string;
  description?: string;
  price?: string;
  last_fetched?: string;
}
