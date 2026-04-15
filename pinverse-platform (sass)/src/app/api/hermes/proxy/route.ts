import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { promises as fs } from "fs";
import path from "path";

const HERMES_URL = process.env.HERMES_API_URL || "http://34.62.198.158:8080";
const HERMES_KEY = process.env.HERMES_API_KEY || "";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

// ─── Local Sites Store (fallback when VPS lacks /sites endpoints) ────────────
// Sites are stored in a JSON file so they survive restarts.
const SITES_FILE = path.join(process.cwd(), ".hermes-sites.json");
const KEYWORDS_FILE = path.join(process.cwd(), ".hermes-keywords.json");
const SETTINGS_FILE = path.join(process.cwd(), ".hermes-settings.json");
const BUDGET_FILE = path.join(process.cwd(), ".hermes-budget.json");
const SCHEDULE_FILE = path.join(process.cwd(), ".hermes-schedule.json");

interface LocalSite {
  id: string;
  niche_id: string;
  name: string;
  display_name: string;
  url: string;
  wp_username: string;
  wp_app_password: string;
  wp_connected: boolean;
  affiliate_programs: string[];
  ad_network: string;
  tone: string;
  content_types: string[];
  keywords_available: number;
  articles_total: number;
  status: string;
  created_at: string;
}

async function readSites(): Promise<LocalSite[]> {
  try {
    const raw = await fs.readFile(SITES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeSites(sites: LocalSite[]): Promise<void> {
  await fs.writeFile(SITES_FILE, JSON.stringify(sites, null, 2), "utf-8");
}

// ─── Local Keywords Store (fallback when VPS lacks keyword endpoints) ────────

interface LocalKeyword {
  id: string;
  keyword: string;
  search_volume: number;
  followers: number;
  url: string;
  niche: string;
  status: "available" | "used";
  used_at: string | null;
  created_at: string;
}

interface KeywordsStore {
  [niche: string]: LocalKeyword[];
}

async function readKeywords(): Promise<KeywordsStore> {
  try {
    const raw = await fs.readFile(KEYWORDS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeKeywords(store: KeywordsStore): Promise<void> {
  await fs.writeFile(KEYWORDS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

// Parse CSV content supporting two formats:
// Format A: ID, Label, URL, Search Volume, Followers (PinClicks export)
// Format B: Keyword, Search Volume (simple 2-column)
function parseCsvToKeywords(csvContent: string, niche: string): LocalKeyword[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const keywords: LocalKeyword[] = [];
  const seen = new Set<string>();

  // Detect format from header or first data row
  const firstLine = lines[0].toLowerCase();
  const hasHeader =
    firstLine.includes("label") ||
    firstLine.includes("keyword") ||
    firstLine.includes("search volume") ||
    firstLine.includes("followers") ||
    firstLine.includes("id,");
  const startIdx = hasHeader ? 1 : 0;

  // Determine format: count commas in first data line
  const sampleLine = lines[startIdx] || lines[0];
  const commaCount = (sampleLine.match(/,/g) || []).length;
  const isFormatA = commaCount >= 3; // ID,Label,URL,Volume,Followers (4+ commas) or ID,Label,URL,Volume (3+ commas)

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Smart CSV parse handling quoted fields
    const fields = parseCSVLine(line);

    let keyword = "";
    let searchVolume = 0;
    let followers = 0;
    let url = "";
    let id = "";

    if (isFormatA && fields.length >= 4) {
      // Format A: ID, Label, URL, Search Volume, Followers
      id = fields[0].trim();
      keyword = fields[1].trim().replace(/^"|"$/g, "");
      url = fields[2].trim();
      searchVolume = parseInt(fields[3].trim(), 10) || 0;
      followers = fields.length >= 5 ? parseInt(fields[4].trim(), 10) || 0 : 0;
    } else if (fields.length >= 2) {
      // Format B: Keyword, Search Volume
      keyword = fields[0].trim().replace(/^"|"$/g, "");
      searchVolume = parseInt(fields[1].trim(), 10) || 0;
    } else if (fields.length === 1) {
      // Single keyword per line
      keyword = fields[0].trim().replace(/^"|"$/g, "");
    }

    if (!keyword) continue;

    // Skip duplicates
    const normalizedKey = keyword.toLowerCase();
    if (seen.has(normalizedKey)) continue;
    seen.add(normalizedKey);

    keywords.push({
      id: id || `kw_${Date.now()}_${i}`,
      keyword,
      search_volume: searchVolume,
      followers,
      url,
      niche,
      status: "available",
      used_at: null,
      created_at: new Date().toISOString(),
    });
  }

  return keywords;
}

// Parse a single CSV line, respecting quoted fields
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// ─── Keywords CRUD helpers (local fallback) ──────────────────────────────────

async function handleKeywordsStats(niche: string): Promise<NextResponse> {
  const store = await readKeywords();
  const kws = store[niche] || [];
  const available = kws.filter((k) => k.status === "available").length;
  const used = kws.filter((k) => k.status === "used").length;
  return NextResponse.json({ available, used, total: kws.length, success: true });
}

async function handleKeywordsList(niche: string, status?: string, limit = 500): Promise<NextResponse> {
  const store = await readKeywords();
  let kws = store[niche] || [];
  if (status && status !== "all") {
    kws = kws.filter((k) => k.status === status);
  }
  return NextResponse.json({ keywords: kws.slice(0, limit), success: true });
}

/** Update the keywords_available count on the matching local site */
async function syncSiteKeywordCount(niche: string): Promise<void> {
  try {
    const store = await readKeywords();
    const kws = store[niche] || [];
    const available = kws.filter((k) => k.status === "available").length;
    const sites = await readSites();
    const idx = sites.findIndex((s) => s.niche_id === niche);
    if (idx >= 0) {
      sites[idx].keywords_available = available;
      await writeSites(sites);
    }
  } catch { /* best-effort */ }
}

async function handleKeywordsUpload(niche: string, body: Record<string, unknown>): Promise<NextResponse> {
  const csvContent = String(body.csv_content || body.csvContent || "");
  const parsed = body.keywords as LocalKeyword[] | undefined;

  let newKeywords: LocalKeyword[] = [];

  if (parsed && Array.isArray(parsed) && parsed.length > 0) {
    // Pre-parsed keywords from the client
    newKeywords = parsed.map((k, i) => ({
      id: k.id || `kw_${Date.now()}_${i}`,
      keyword: k.keyword,
      search_volume: k.search_volume || 0,
      followers: k.followers || 0,
      url: k.url || "",
      niche,
      status: "available" as const,
      used_at: null,
      created_at: new Date().toISOString(),
    }));
  } else if (csvContent) {
    // Parse CSV server-side
    newKeywords = parseCsvToKeywords(csvContent, niche);
  }

  if (newKeywords.length === 0) {
    return NextResponse.json({ error: "No valid keywords found in CSV", success: false }, { status: 400 });
  }

  const store = await readKeywords();
  const existing = store[niche] || [];
  const existingSet = new Set(existing.map((k) => k.keyword.toLowerCase()));
  const toAdd = newKeywords.filter((k) => !existingSet.has(k.keyword.toLowerCase()));
  const skipped = newKeywords.length - toAdd.length;

  store[niche] = [...existing, ...toAdd];
  await writeKeywords(store);

  // Keep site card in sync
  await syncSiteKeywordCount(niche);

  return NextResponse.json({
    success: true,
    imported: toAdd.length,
    skipped,
    keyword_count: toAdd.length,
    total: store[niche].length,
    message: `Imported ${toAdd.length} keywords${skipped > 0 ? ` (${skipped} duplicates skipped)` : ""}`,
  });
}

async function handleKeywordsReset(niche: string): Promise<NextResponse> {
  const store = await readKeywords();
  const kws = store[niche] || [];
  let resetCount = 0;
  for (const kw of kws) {
    if (kw.status === "used") {
      kw.status = "available";
      kw.used_at = null;
      resetCount++;
    }
  }
  store[niche] = kws;
  await writeKeywords(store);

  // Keep site card in sync
  await syncSiteKeywordCount(niche);

  return NextResponse.json({ success: true, reset: resetCount, message: `Reset ${resetCount} keywords to available` });
}

// ─── Local Products Store (fallback per-site) ────────────────────────────────

const PRODUCTS_FILE = path.join(process.cwd(), ".hermes-products.json");

interface LocalProduct {
  title: string;
  url: string;
  description: string;
  price: string;
  last_fetched: string;
}

interface ProductsStore {
  [niche: string]: {
    products: LocalProduct[];
    last_synced: string;
  };
}

async function readProducts(): Promise<ProductsStore> {
  try {
    const raw = await fs.readFile(PRODUCTS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeProducts(store: ProductsStore): Promise<void> {
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

async function handleProductsGet(niche: string): Promise<NextResponse> {
  const store = await readProducts();
  const data = store[niche] || { products: [], last_synced: "" };
  return NextResponse.json({
    total: data.products.length,
    last_synced: data.last_synced,
    sample: data.products.slice(0, 20),
    products: data.products.slice(0, 20),
    success: true,
  });
}

async function handleProductsUpload(niche: string, body: Record<string, unknown>): Promise<NextResponse> {
  const incoming = body.products as Record<string, unknown>[] | undefined;
  if (!incoming || !Array.isArray(incoming) || incoming.length === 0) {
    return NextResponse.json({ error: "No products provided", success: false }, { status: 400 });
  }

  const store = await readProducts();
  const existing = store[niche]?.products || [];
  const existingUrls = new Set(existing.map((p) => p.url.toLowerCase()));

  const newProducts: LocalProduct[] = incoming
    .filter((p) => p.url && !existingUrls.has(String(p.url).toLowerCase()))
    .map((p) => ({
      title: String(p.title || p.name || ""),
      url: String(p.url || ""),
      description: String(p.description || ""),
      price: String(p.price || ""),
      last_fetched: new Date().toISOString(),
    }));

  store[niche] = {
    products: [...existing, ...newProducts],
    last_synced: new Date().toISOString(),
  };
  await writeProducts(store);

  return NextResponse.json({
    success: true,
    imported: newProducts.length,
    total: store[niche].products.length,
    message: `Imported ${newProducts.length} products`,
  });
}

async function handleProductsSearch(niche: string, query: string): Promise<NextResponse> {
  const store = await readProducts();
  const products = store[niche]?.products || [];
  const q = query.toLowerCase();
  const results = products
    .filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    .slice(0, 10);
  return NextResponse.json({ products: results, success: true });
}

async function handleProductsClear(niche: string): Promise<NextResponse> {
  const store = await readProducts();
  const count = store[niche]?.products?.length || 0;
  store[niche] = { products: [], last_synced: "" };
  await writeProducts(store);
  return NextResponse.json({ success: true, cleared: count, message: `Cleared ${count} products for ${niche}` });
}

// ─── Local Settings Store (quality settings persist across refreshes) ────────

interface LocalSettings {
  min_quality_score: number;
  min_word_count: number;
  max_images: number;
  max_product_links: number;
  updated_at: string;
}

const DEFAULT_SETTINGS: LocalSettings = {
  min_quality_score: 75,
  min_word_count: 1500,
  max_images: 5,
  max_product_links: 3,
  updated_at: "",
};

async function readSettings(): Promise<LocalSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf-8");
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function writeSettings(settings: LocalSettings): Promise<void> {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

async function handleSettingsGet(): Promise<NextResponse> {
  const settings = await readSettings();
  return NextResponse.json({ ...settings, success: true });
}

async function handleSettingsPost(body: Record<string, unknown>): Promise<NextResponse> {
  const current = await readSettings();
  const updated: LocalSettings = {
    min_quality_score: typeof body.min_quality_score === "number" ? body.min_quality_score : current.min_quality_score,
    min_word_count: typeof body.min_word_count === "number" ? body.min_word_count : current.min_word_count,
    max_images: typeof body.max_images === "number" ? body.max_images : current.max_images,
    max_product_links: typeof body.max_product_links === "number" ? body.max_product_links : current.max_product_links,
    updated_at: new Date().toISOString(),
  };
  await writeSettings(updated);
  return NextResponse.json({ ...updated, success: true });
}

// ─── Local Budget Store (budget persists across refreshes) ───────────────────

interface LocalBudget {
  daily_limit: number;
  monthly_limit: number;
  spent_today: number;
  spent_this_month: number;
  monthly_percent: number;
  content_calls_today: number;
  content_calls_limit: number;
  images_today: number;
  images_limit: number;
  history: { date: string; amount: number; articles: number }[];
  updated_at: string;
}

const DEFAULT_BUDGET: LocalBudget = {
  daily_limit: 8.33,
  monthly_limit: 250,
  spent_today: 0,
  spent_this_month: 0,
  monthly_percent: 0,
  content_calls_today: 0,
  content_calls_limit: 250,
  images_today: 0,
  images_limit: 1000,
  history: [],
  updated_at: "",
};

async function readBudget(): Promise<LocalBudget> {
  try {
    const raw = await fs.readFile(BUDGET_FILE, "utf-8");
    return { ...DEFAULT_BUDGET, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_BUDGET };
  }
}

async function writeBudget(budget: LocalBudget): Promise<void> {
  await fs.writeFile(BUDGET_FILE, JSON.stringify(budget, null, 2), "utf-8");
}

async function handleBudgetGet(): Promise<NextResponse> {
  const budget = await readBudget();
  return NextResponse.json({ ...budget, success: true });
}

async function handleBudgetPost(body: Record<string, unknown>): Promise<NextResponse> {
  const current = await readBudget();
  if (typeof body.monthly_limit === "number") {
    current.monthly_limit = body.monthly_limit;
    current.daily_limit = body.monthly_limit / 30;
  }
  if (typeof body.daily_limit === "number") {
    current.daily_limit = body.daily_limit;
  }
  current.updated_at = new Date().toISOString();
  await writeBudget(current);
  return NextResponse.json({ ...current, success: true });
}

// ─── Local Schedule Store (schedule persists across refreshes) ───────────────

interface LocalScheduleJob {
  niche: string;
  time: string;
  count: number;
  enabled: boolean;
  last_run: string;
  next_run: string;
}

async function readSchedule(): Promise<LocalScheduleJob[]> {
  try {
    const raw = await fs.readFile(SCHEDULE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeSchedule(jobs: LocalScheduleJob[]): Promise<void> {
  await fs.writeFile(SCHEDULE_FILE, JSON.stringify(jobs, null, 2), "utf-8");
}

async function handleScheduleGet(): Promise<NextResponse> {
  const jobs = await readSchedule();
  return NextResponse.json({ jobs, success: true });
}

async function handleSchedulePost(body: Record<string, unknown>): Promise<NextResponse> {
  const jobs = await readSchedule();
  const niche = String(body.niche || "");
  if (!niche) {
    return NextResponse.json({ error: "niche is required", success: false }, { status: 400 });
  }

  const existing = jobs.findIndex((j) => j.niche === niche);
  const job: LocalScheduleJob = {
    niche,
    time: String(body.time || "06:00"),
    count: typeof body.count === "number" ? body.count : 1,
    enabled: body.enabled !== false,
    last_run: existing >= 0 ? jobs[existing].last_run : "",
    next_run: "",
  };

  // Calculate next run time
  const [hours, minutes] = job.time.split(":").map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  job.next_run = job.enabled ? next.toISOString() : "";

  if (existing >= 0) {
    jobs[existing] = job;
  } else {
    jobs.push(job);
  }

  await writeSchedule(jobs);
  return NextResponse.json({ ...job, success: true });
}

// Verify the current user is an admin before proxying any request
async function verifyAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const email = data?.user?.email;
    if (!email) return false;
    // Check against env var first, then hardcoded fallback
    if (ADMIN_EMAIL && email === ADMIN_EMAIL) return true;
    // Fallback: check known admin emails
    const knownAdmins = ["ecomverse25@gmail.com", "admin@pinverse.io"];
    return knownAdmins.includes(email.toLowerCase());
  } catch {
    return false;
  }
}

// Forward request to Hermes VPS
async function hermesRequest(
  path: string,
  method = "GET",
  body?: object
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${HERMES_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${HERMES_KEY}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Safely parse JSON — some Hermes endpoints may return non-JSON (HTML error pages, etc)
    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: `Hermes returned status ${res.status} with non-JSON body`, success: false };
    }

    return { data, ok: res.ok, status: res.status };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ─── Sites CRUD helpers (LOCAL-FIRST — always persist locally) ───────────────
// The local JSON store is the source of truth. VPS data is merged on top when
// available, but a VPS failure (or VPS returning an empty list) must NEVER hide
// sites that were successfully saved locally.

async function handleSitesGet(_sitesPath: string): Promise<NextResponse> {
  // Always read local store — this is the source of truth
  const localSites = await readSites();

  // Optionally merge VPS data (enrich local records, discover VPS-only sites)
  try {
    const { data, ok } = await hermesRequest("/sites");
    if (ok && Array.isArray(data?.sites) && data.sites.length > 0) {
      const localById = new Map(localSites.map((s) => [s.niche_id, s]));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const vpsSite of data.sites as any[]) {
        const nid = vpsSite.niche_id || vpsSite.id;
        if (!localById.has(nid)) {
          // VPS-only site — add to local for persistence
          localSites.push({
            id: String(vpsSite.id || nid),
            niche_id: String(nid),
            name: String(vpsSite.name || vpsSite.display_name || nid),
            display_name: String(vpsSite.display_name || vpsSite.name || nid),
            url: String(vpsSite.url || vpsSite.site_url || ""),
            wp_username: String(vpsSite.wp_username || ""),
            wp_app_password: "",
            wp_connected: Boolean(vpsSite.wp_connected),
            affiliate_programs: [],
            ad_network: "None",
            tone: "warm-conversational",
            content_types: [],
            keywords_available: vpsSite.keywords_available ?? 0,
            articles_total: vpsSite.articles_total ?? 0,
            status: "active",
            created_at: vpsSite.created_at || new Date().toISOString(),
          });
        } else {
          // Enrich local record with live VPS stats
          const local = localById.get(nid)!;
          if (vpsSite.wp_connected !== undefined) local.wp_connected = vpsSite.wp_connected;
          if (typeof vpsSite.articles_total === "number") local.articles_total = vpsSite.articles_total;
        }
      }
      await writeSites(localSites);
    }
  } catch { /* VPS unreachable — local store is authoritative */ }

  return NextResponse.json({ sites: localSites });
}

async function handleSitesPost(body: Record<string, unknown>): Promise<NextResponse> {
  const nicheId = String(body.niche_id || "").trim();
  if (!nicheId) {
    return NextResponse.json({ error: "niche_id is required", success: false }, { status: 400 });
  }

  // ① Always save locally first
  const sites = await readSites();
  if (sites.find((s) => s.niche_id === nicheId)) {
    return NextResponse.json({ error: `Site "${nicheId}" already exists`, success: false }, { status: 409 });
  }
  sites.push(bodyToSite(body));
  await writeSites(sites);

  // ② Best-effort sync to VPS
  try {
    await hermesRequest("/sites", "POST", body);
  } catch { /* non-blocking */ }

  return NextResponse.json({ success: true, message: `Site "${nicheId}" added` });
}

async function handleSitesDelete(nicheId: string): Promise<NextResponse> {
  // ① Always delete from local store first
  const sites = await readSites();
  const before = sites.length;
  const filtered = sites.filter((s) => s.niche_id !== nicheId);
  await writeSites(filtered);

  // ② Best-effort sync to VPS
  try {
    await hermesRequest(`/sites/${nicheId}`, "DELETE");
  } catch { /* non-blocking */ }

  if (filtered.length < before) {
    return NextResponse.json({ success: true, message: `Site "${nicheId}" removed` });
  }
  return NextResponse.json({ success: true, message: `Site "${nicheId}" not found but treated as deleted` });
}

function bodyToSite(body: Record<string, unknown>): LocalSite {
  return {
    id: String(body.niche_id || Date.now()),
    niche_id: String(body.niche_id || ""),
    name: String(body.display_name || body.niche_id || ""),
    display_name: String(body.display_name || body.niche_id || ""),
    url: String(body.site_url || ""),
    wp_username: String(body.wp_username || ""),
    wp_app_password: String(body.wp_app_password || ""),
    wp_connected: false,
    affiliate_programs: Array.isArray(body.affiliate_programs) ? body.affiliate_programs as string[] : [],
    ad_network: String(body.ad_network || "None"),
    tone: String(body.tone || "warm-conversational"),
    content_types: Array.isArray(body.content_types) ? body.content_types as string[] : [],
    keywords_available: 0,
    articles_total: 0,
    status: "active",
    created_at: new Date().toISOString(),
  };
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reqPath = req.nextUrl.searchParams.get("path") || "/health";

  // Sites: use local-backed handler
  if (reqPath === "/sites" || reqPath === "/sites/") {
    return handleSitesGet(reqPath);
  }

  // Keywords: extract niche and handle locally when VPS fails
  const kwListMatch = reqPath.match(/^\/keywords\/([^/]+)\/list/);
  const kwStatsMatch = !kwListMatch && reqPath.match(/^\/keywords\/([^/]+)$/);

  // Products: extract niche from per-site product paths
  const prodNicheMatch = reqPath.match(/^\/products\/([^/?]+)$/);
  const prodSearchMatch = reqPath.startsWith("/products/search");

  try {
    const { data, ok, status } = await hermesRequest(reqPath);

    // If VPS returned success, use it
    if (ok) return NextResponse.json(data);

    // Mock missing / forbidden endpoints (404 or 403)
    if (status === 404 || status === 403) {
      // Per-site products
      if (prodNicheMatch && prodNicheMatch[1] !== "search" && prodNicheMatch[1] !== "sync" && prodNicheMatch[1] !== "upload" && prodNicheMatch[1] !== "clear") {
        return handleProductsGet(prodNicheMatch[1]);
      }
      // Product search with niche param
      if (prodSearchMatch) {
        const qIdx = reqPath.indexOf("?");
        const params = qIdx >= 0 ? new URLSearchParams(reqPath.slice(qIdx + 1)) : new URLSearchParams();
        const niche = params.get("niche") || "";
        const query = params.get("query") || "";
        if (niche && query) return handleProductsSearch(niche, query);
        return NextResponse.json({ products: [], success: true });
      }
      // Global products fallback
      if (reqPath === "/products" || reqPath === "/products/") {
        return NextResponse.json({ total: 0, last_synced: "", sample: [] });
      }
      if (reqPath.startsWith("/sites")) {
        return handleSitesGet(reqPath);
      }
      if (reqPath.startsWith("/schedule")) {
        return handleScheduleGet();
      }
      if (reqPath.startsWith("/budget")) {
        return handleBudgetGet();
      }
      if (reqPath.startsWith("/settings")) {
        return handleSettingsGet();
      }
      // Keywords list — local fallback
      if (kwListMatch) {
        const niche = kwListMatch[1];
        const qIdx = reqPath.indexOf("?");
        const params = qIdx >= 0 ? new URLSearchParams(reqPath.slice(qIdx + 1)) : new URLSearchParams();
        const statusParam = params.get("status") || undefined;
        const limitParam = parseInt(params.get("limit") || "500", 10);
        return handleKeywordsList(niche, statusParam, limitParam);
      }
      // Keywords stats — local fallback
      if (kwStatsMatch) {
        return handleKeywordsStats(kwStatsMatch[1]);
      }
      if (reqPath.startsWith("/keywords") && reqPath.includes("/list")) {
        return NextResponse.json({ keywords: [], success: true });
      }
      if (reqPath.startsWith("/keywords/")) {
        return NextResponse.json({ available: 0, used: 0, total: 0, success: true });
      }
      if (reqPath.startsWith("/jobs/recent")) {
        return NextResponse.json({ jobs: [] });
      }
      if (reqPath.startsWith("/drafts")) {
        return NextResponse.json({ drafts: [] });
      }
    }

    return NextResponse.json(data, { status });
  } catch (err) {
    // VPS unreachable — provide safe fallbacks for read-only endpoints
    if (reqPath === "/health") {
      return NextResponse.json({ status: "offline", version: "2.0.0", error: "VPS unreachable" });
    }
    if (reqPath.startsWith("/sites")) {
      return handleSitesGet(reqPath);
    }
    // Products fallback when VPS is unreachable
    if (prodNicheMatch && prodNicheMatch[1] !== "search") {
      return handleProductsGet(prodNicheMatch[1]);
    }
    if (prodSearchMatch) {
      return NextResponse.json({ products: [], success: true });
    }
    if (reqPath === "/products" || reqPath === "/products/") {
      return NextResponse.json({ total: 0, last_synced: "", sample: [] });
    }
    // Keywords fallback when VPS is unreachable
    if (kwListMatch) {
      return handleKeywordsList(kwListMatch[1]);
    }
    if (kwStatsMatch) {
      return handleKeywordsStats(kwStatsMatch[1]);
    }
    return NextResponse.json(
      { error: "Cannot reach Hermes — check VPS connection", details: String(err) },
      { status: 502 }
    );
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { path: reqPath, body } = await req.json();

    // Sites: use local-backed handler
    if (reqPath === "/sites" || reqPath === "/sites/") {
      return handleSitesPost(body || {});
    }

    // Settings
    if (reqPath === "/settings" || reqPath === "/settings/") {
      try {
        const { data, ok, status } = await hermesRequest(reqPath, "POST", body);
        if (ok && data?.success) return NextResponse.json(data);
        if (status !== 403 && status !== 404) return NextResponse.json(data, { status });
      } catch { /* fall through */ }
      return handleSettingsPost(body || {});
    }

    // Budget
    if (reqPath === "/budget" || reqPath === "/budget/") {
      try {
        const { data, ok, status } = await hermesRequest(reqPath, "POST", body);
        if (ok && data?.success) return NextResponse.json(data);
        if (status !== 403 && status !== 404) return NextResponse.json(data, { status });
      } catch { /* fall through */ }
      return handleBudgetPost(body || {});
    }

    // Schedule
    if (reqPath === "/schedule" || reqPath === "/schedule/") {
      try {
        const { data, ok, status } = await hermesRequest(reqPath, "POST", body);
        if (ok && data?.success) return NextResponse.json(data);
        if (status !== 403 && status !== 404) return NextResponse.json(data, { status });
      } catch { /* fall through */ }
      return handleSchedulePost(body || {});
    }

    // Test connection — special handling
    if (typeof reqPath === "string" && /^\/sites\/[^/]+\/test$/.test(reqPath)) {
      try {
        const { data, ok } = await hermesRequest(reqPath, "POST", body);
        if (ok) return NextResponse.json(data);
      } catch { /* fall through */ }
      // Fallback: try to test WordPress connection directly from site config
      const match = reqPath.match(/^\/sites\/([^/]+)\/test$/);
      if (match) {
        const sites = await readSites();
        const site = sites.find((s) => s.niche_id === match[1]);
        if (site && site.url && site.wp_username && site.wp_app_password) {
          try {
            const wpRes = await fetch(`${site.url}/wp-json/wp/v2/posts?per_page=1&status=draft`, {
              headers: {
                Authorization: "Basic " + Buffer.from(`${site.wp_username}:${site.wp_app_password}`).toString("base64"),
              },
            });
            if (wpRes.ok) {
              return NextResponse.json({ connected: true, site_url: site.url });
            }
            return NextResponse.json({ connected: false, error: `WordPress returned ${wpRes.status}`, site_url: site.url });
          } catch (wpErr) {
            return NextResponse.json({ connected: false, error: String(wpErr), site_url: site.url });
          }
        }
        return NextResponse.json({ connected: false, error: "Site not found or missing credentials" });
      }
    }

    // Keywords upload — local-backed handler with VPS-first approach
    const kwUploadMatch = typeof reqPath === "string" && reqPath.match(/^\/keywords\/([^/]+)\/upload$/);
    if (kwUploadMatch) {
      const niche = kwUploadMatch[1];
      // Try VPS first
      try {
        const { data, ok, status } = await hermesRequest(reqPath, "POST", body);
        if (ok && data?.success) return NextResponse.json(data);
        // If 403 or 404, fall through to local handler
        if (status !== 403 && status !== 404) {
          return NextResponse.json(data, { status });
        }
      } catch { /* VPS unreachable — fall through */ }
      // Local fallback
      return handleKeywordsUpload(niche, body || {});
    }

    // Keywords reset — local-backed handler
    const kwResetMatch = typeof reqPath === "string" && reqPath.match(/^\/keywords\/([^/]+)\/reset$/);
    if (kwResetMatch) {
      const niche = kwResetMatch[1];
      try {
        const { data, ok, status } = await hermesRequest(reqPath, "POST", body);
        if (ok && data?.success) return NextResponse.json(data);
        if (status !== 403 && status !== 404) {
          return NextResponse.json(data, { status });
        }
      } catch { /* fall through */ }
      return handleKeywordsReset(niche);
    }

    // Products upload — per-site, local-backed
    if (typeof reqPath === "string" && (reqPath === "/products/upload" || reqPath === "/products/upload/")) {
      const niche = String(body?.niche || "");
      if (niche) {
        try {
          const { data, ok, status } = await hermesRequest(reqPath, "POST", body);
          if (ok && data?.success) return NextResponse.json(data);
          if (status !== 403 && status !== 404) return NextResponse.json(data, { status });
        } catch { /* fall through */ }
        return handleProductsUpload(niche, body || {});
      }
    }

    // Products sync — pass niche through to VPS, no local fallback needed for sync

    const { data, ok, status } = await hermesRequest(reqPath, "POST", body);
    return NextResponse.json(data, ok ? undefined : { status });
  } catch (err) {
    return NextResponse.json(
      { error: "Cannot reach Hermes — check VPS connection", details: String(err) },
      { status: 502 }
    );
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reqPath = req.nextUrl.searchParams.get("path") || "";

  // Sites: use local-backed handler
  const siteMatch = reqPath.match(/^\/sites\/([^/]+)$/);
  if (siteMatch) {
    return handleSitesDelete(siteMatch[1]);
  }

  // Keywords reset via DELETE — local fallback
  const kwResetMatch = reqPath.match(/^\/keywords\/([^/]+)\/reset$/);
  if (kwResetMatch) {
    try {
      const { data, ok, status } = await hermesRequest(reqPath, "DELETE");
      if (ok) return NextResponse.json(data);
      if (status !== 403 && status !== 404) return NextResponse.json(data, { status });
    } catch { /* fall through */ }
    return handleKeywordsReset(kwResetMatch[1]);
  }

  // Products clear via DELETE — per-site local fallback
  const prodClearMatch = reqPath.match(/^\/products\/([^/]+)\/clear$/);
  if (prodClearMatch) {
    try {
      const { data, ok, status } = await hermesRequest(reqPath, "DELETE");
      if (ok) return NextResponse.json(data);
      if (status !== 403 && status !== 404) return NextResponse.json(data, { status });
    } catch { /* fall through */ }
    return handleProductsClear(prodClearMatch[1]);
  }

  // Global product clear fallback
  if (reqPath === "/products/clear" || reqPath === "/products/clear/") {
    try {
      const { data, ok, status } = await hermesRequest(reqPath, "DELETE");
      if (ok) return NextResponse.json(data);
      if (status !== 403 && status !== 404) return NextResponse.json(data, { status });
    } catch { /* fall through */ }
    return NextResponse.json({ success: true, message: "Cleared (no local data)" });
  }

  try {
    const { data, ok, status } = await hermesRequest(reqPath, "DELETE");
    return NextResponse.json(data, ok ? undefined : { status });
  } catch (err) {
    return NextResponse.json(
      { error: "Cannot reach Hermes — check VPS connection", details: String(err) },
      { status: 502 }
    );
  }
}
