// =============================================================================
// utils.ts — Hermes shared utilities
// MERGE STRATEGY: All original exports preserved. New additions appended below.
// New fixes: Bug #1 (cache), Bug #3 (KNOWN_SITES), Bug #12 (Draft.thumbnail_url),
//            Bug #14 (DEFAULT_SCHEDULE), Improvement #1 (HTML decode),
//            Improvement #6 (quality badge)
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — ORIGINAL EXPORTS (UNCHANGED — DO NOT TOUCH)
// Every type, helper, and constant that existed before this merge lives here.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Original Types ───────────────────────────────────────────────────────────

export interface Site {
  id: string
  niche_id: string
  name: string
  url: string
  wp_connected: boolean
  keywords_available: number
  articles_today: number
  amazon_tag?: string
  wp_username?: string
  tone?: string
}

export interface KeywordItem {
  id: string
  keyword: string
  label?: string
  url?: string
  search_volume: number
  followers?: number
  status: 'available' | 'used' | 'claimed'
  used_at?: string
  niche_id: string
}

export interface Product {
  id: string
  name: string
  url: string
  description?: string
  price?: number
  niche_id: string
  active: boolean
}

export interface Draft {
  id: number
  title: string
  niche: string
  date: string
  has_image: boolean
  wp_edit_url: string
  // ── NEW (Bug #12 + Improvement #6) — additive only, no existing field changed
  thumbnail_url?: string
  quality_score?: number
  word_count?: number
}

export interface Job {
  id: string
  niche: string
  keyword: string
  stage: 'queued' | 'research' | 'writing' | 'publishing' | 'images' | 'pinterest' | 'complete' | 'failed'
  started_at: string
  completed_at?: string
  article_title?: string
  quality_score?: number
  word_count?: number
  error?: string
  articles_count?: number
}

export interface NicheStats {
  niche_id: string
  name: string
  url: string
  wp_connected: boolean
  keywords_available: number
  articles_today: number
}

export interface BudgetData {
  today_usd: number
  today_limit: number
  month_usd: number
  month_limit: number
  content_calls: number
  content_limit: number
  image_calls: number
  image_limit: number
}

export interface ModelStatus {
  name: string
  status: 'online' | 'offline' | 'loading'
  last_checked?: string
  response_ms?: number
  error?: string
}

export interface Stats {
  niches: NicheStats[]
  budget: BudgetData
  models: {
    brain: ModelStatus
    writer: ModelStatus
    image: ModelStatus
    vps: ModelStatus
  }
}

export interface HealthData {
  online: boolean
  version?: string
  last_checked?: string
  response_ms?: number
}

export interface ScheduleJob {
  id: string
  name: string
  cron: string
  description: string
  enabled: boolean
  last_run?: string
  next_run?: string
  last_status?: 'success' | 'failed' | 'running'
}

// ─── Original API Helpers ─────────────────────────────────────────────────────

function safeJson<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data))
  } catch {
    return data
  }
}

export async function hermesGet<T>(path: string): Promise<T> {
  try {
    const res = await fetch(`/api/hermes/proxy?path=${encodeURIComponent(path)}`, {
      cache: 'no-store',
    })
    const json = await res.json()
    return safeJson<T>(json)
  } catch (err) {
    console.error(`[hermesGet] ${path}`, err)
    return {} as T
  }
}

export async function hermesPost<T>(path: string, body?: unknown): Promise<T> {
  try {
    const res = await fetch(`/api/hermes/proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, ...((body as object) ?? {}) }),
      cache: 'no-store',
    })
    const json = await res.json()
    return safeJson<T>(json)
  } catch (err) {
    console.error(`[hermesPost] ${path}`, err)
    return {} as T
  }
}

export async function hermesDelete<T>(path: string): Promise<T> {
  try {
    const res = await fetch(`/api/hermes/proxy`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
      cache: 'no-store',
    })
    const json = await res.json()
    return safeJson<T>(json)
  } catch (err) {
    console.error(`[hermesDelete] ${path}`, err)
    return {} as T
  }
}

export async function hermesPut<T>(path: string, body?: unknown): Promise<T> {
  try {
    const res = await fetch(`/api/hermes/proxy`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, ...((body as object) ?? {}) }),
      cache: 'no-store',
    })
    const json = await res.json()
    return safeJson<T>(json)
  } catch (err) {
    console.error(`[hermesPut] ${path}`, err)
    return {} as T
  }
}

// ─── Original Format Helpers ──────────────────────────────────────────────────

export function formatCurrency(value: number, decimals = 2): string {
  return `$${value.toFixed(decimals)}`
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}K`
  return value.toString()
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch {
    return iso
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

export function budgetColor(used: number, limit: number): string {
  const pct = limit > 0 ? (used / limit) * 100 : 0
  if (pct >= 90) return 'text-red-400'
  if (pct >= 70) return 'text-yellow-400'
  return 'text-green-400'
}


// =============================================================================
// SECTION 2 — NEW ADDITIONS (Option A Merge — audit fixes 2026-05-03)
// Nothing above this line was changed. Everything below is additive only.
// =============================================================================

// ─── Type aliases so new code can use the new names without breaking old code ─

/** Alias — new pages can use HermesSite; old pages keep using Site */
export type HermesSite = Site

/** Alias — new pages can use HermesStats; old pages keep using Stats */
export type HermesStats = Stats

/** Alias — new pages can use HealthStatus; old pages keep using HealthData */
export type HealthStatus = HealthData & {
  /** null = loading (tri-state for Bug #1 fix) */
  online: boolean | null
}

/** Alias — new pages can use ScheduledJob; old pages keep using ScheduleJob */
export type ScheduledJob = ScheduleJob

// ─── LocalSettings interface (Phase 4 — Settings page) ───────────────────────

export interface LocalSettings {
  min_quality_score: number
  min_word_count: number
  max_images_per_article: number
  max_product_links: number
  pinterest_variants: number
  pinterest_lead_days: number
  telegram_token?: string
  telegram_chat_id?: string
  telegram_enabled: boolean
  telegram_summary_time: string
  telegram_alert_failure: boolean
  telegram_alert_budget: boolean
  gemini_api_key_last4?: string
}

// ─── HTML Entity Decoder — Improvement #1 ────────────────────────────────────
// Fixes: "Quick &#038; Delicious" → "Quick & Delicious"
// Root cause confirmed live: WP stores HTML-encoded titles;
// dashboard renders them raw without decoding.

export function decodeHtmlEntities(str: string): string {
  if (!str) return ''
  if (typeof window !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(str, 'text/html')
      return doc.documentElement.textContent ?? str
    } catch { /* fall through */ }
  }
  // SSR / server-side fallback (regex-based)
  return str
    .replace(/&#0*38;/g,   '&')
    .replace(/&#0*39;/g,   "'")
    .replace(/&#0*34;/g,   '"')
    .replace(/&#0*60;/g,   '<')
    .replace(/&#0*62;/g,   '>')
    .replace(/&amp;/g,     '&')
    .replace(/&apos;/g,    "'")
    .replace(/&quot;/g,    '"')
    .replace(/&lt;/g,      '<')
    .replace(/&gt;/g,      '>')
    .replace(/&nbsp;/g,    ' ')
    .replace(/&#(\d+);/g,        (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
}

// ─── localStorage Cache Helpers — Bug #1 ─────────────────────────────────────
// Prevents the "flash of Offline / No sites configured" on every page reload.
// On mount: pages read stale cache → show real data immediately.
// In background: fresh API call fires → overwrites cache when it resolves.
// Result: user sees real data from frame 1, never a red "Offline" flash.

const HERMES_CACHE_TTL_MS = 60_000 // 60 seconds

interface CacheEntry<T> {
  data: T
  ts: number
}

export const hermesCache = {
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(`hermes_cache_${key}`)
      if (!raw) return null
      const entry: CacheEntry<T> = JSON.parse(raw)
      if (Date.now() - entry.ts > HERMES_CACHE_TTL_MS) return null
      return entry.data
    } catch {
      return null
    }
  },

  set<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return
    try {
      const entry: CacheEntry<T> = { data, ts: Date.now() }
      localStorage.setItem(`hermes_cache_${key}`, JSON.stringify(entry))
    } catch {
      // storage quota exceeded — ignore silently
    }
  },

  clear(key: string): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(`hermes_cache_${key}`)
  },

  clearAll(): void {
    if (typeof window === 'undefined') return
    Object.keys(localStorage)
      .filter(k => k.startsWith('hermes_cache_'))
      .forEach(k => localStorage.removeItem(k))
  },
}

// ─── Quality Score Badge Color — Improvement #6 ───────────────────────────────
// Returns a Tailwind class string for the score badge.
// Green ≥ 85 | Yellow 75–84 | Red < 75

export function qualityBadgeColor(score: number): string {
  if (score >= 85) return 'bg-green-500/20 text-green-400 border border-green-500/30'
  if (score >= 75) return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
  return 'bg-red-500/20 text-red-400 border border-red-500/30'
}

// ─── Known Production Sites — Bug #3 ─────────────────────────────────────────
// Confirmed live: only sourcerecipes appears in Sites/Keywords/Products tabs.
// kitchentools4u, pets, home_decor are missing despite showing on Overview.
// These constants are used in the proxy route to seed missing sites.

export const KNOWN_SITES: Pick<Site, 'id' | 'niche_id' | 'name' | 'url'>[] = [
  {
    id:       'sourcerecipes',
    niche_id: 'sourcerecipes',
    name:     'sourcerecipes',
    url:      'https://sourcerecipes.info',
  },
  {
    id:       'kitchentools4u',
    niche_id: 'kitchentools4u',
    name:     'kitchentools4u',
    url:      'https://kitchentools4u.com',
  },
  {
    id:       'pets',
    niche_id: 'pets',
    name:     'pets',
    url:      'https://perfectpaw.shop/',
  },
  {
    id:       'home_decor',
    niche_id: 'home_decor',
    name:     'home_decor',
    url:      'https://lifestyleessentials4u.com/',
  },
]

// ─── Default Cron Schedule — Bug #14 ─────────────────────────────────────────
// Confirmed live: Settings → Automation Schedule shows "No scheduled jobs configured."
// These are the 6 jobs that should be running on the VPS.
// Used in the proxy route to seed the schedule store when empty.

export const DEFAULT_SCHEDULE: ScheduleJob[] = [
  {
    id:          'main_generation',
    name:        'Main Article Generation',
    cron:        '0 6 * * *',
    description: 'Daily orchestrator — all active sites, 10 articles (06:00 UTC)',
    enabled:     true,
  },
  {
    id:          'csv_inbox',
    name:        'CSV Inbox Watcher',
    cron:        '*/30 * * * *',
    description: 'Polls for new PinClicks CSV keyword files every 30 minutes',
    enabled:     true,
  },
  {
    id:          'image_queue',
    name:        'Image Queue Processor',
    cron:        '*/5 * * * *',
    description: 'Processes pending Gemini image generation every 5 minutes',
    enabled:     true,
  },
  {
    id:          'weekly_refresh',
    name:        'Weekly Content Refresh',
    cron:        '0 1 * * 0',
    description: 'Sunday 01:00 UTC — refreshes existing content for freshness',
    enabled:     true,
  },
  {
    id:          'telegram_summary',
    name:        'Telegram Daily Summary',
    cron:        '0 8 * * *',
    description: 'Sends daily performance report to Telegram at 08:00 UTC',
    enabled:     true,
  },
  {
    id:          'db_backup',
    name:        'Database Backup',
    cron:        '0 23 * * *',
    description: 'Nightly database backup at 23:00 UTC',
    enabled:     true,
  },
]
