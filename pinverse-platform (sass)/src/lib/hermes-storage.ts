// ─── Hermes Persistent Storage ───────────────────────────────────────────────
// Uses Supabase Storage (S3-backed buckets) for data persistence.
// Falls back to filesystem for local development.
//
// WHY: Vercel serverless functions have a READ-ONLY filesystem at process.cwd().
// Writing to .hermes-*.json files silently fails on production, causing all
// keyword uploads, site configs, and settings to vanish between requests.
// Supabase Storage is persistent, works everywhere, and requires no SQL migrations.

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";

const BUCKET = "hermes-data";
let _supabase: SupabaseClient | null = null;
let _bucketReady = false;

/** Singleton admin client (service-role key bypasses RLS) */
function getAdmin(): SupabaseClient | null {
  if (_supabase) return _supabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  _supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _supabase;
}

/** Ensure the bucket exists (idempotent, runs once per cold start) */
async function ensureBucket(sb: SupabaseClient) {
  if (_bucketReady) return;
  try {
    // createBucket is idempotent-ish: returns error if already exists
    const { error } = await sb.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 10_485_760, // 10 MB
    });
    // "already exists" is not a real error
    if (error && !error.message?.includes("already exists")) {
      console.warn("[Hermes Storage] Bucket create warning:", error.message);
    }
  } catch {
    // Swallow — bucket likely exists
  }
  _bucketReady = true;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Read a JSON blob from persistent storage.
 * @param key  Logical name, e.g. "sites", "keywords", "settings"
 * @returns    Parsed JSON or `defaultValue` when nothing stored yet.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function hermesRead<T = any>(
  key: string,
  defaultValue: T
): Promise<T> {
  // ── Supabase Storage (production) ──
  const sb = getAdmin();
  if (sb) {
    try {
      await ensureBucket(sb);
      const { data, error } = await sb.storage
        .from(BUCKET)
        .download(`${key}.json`);

      if (!error && data) {
        const text = await data.text();
        return JSON.parse(text) as T;
      }
      // File not found → first run, return default
    } catch {
      // Download failed → return default
    }
  }

  // ── Filesystem fallback (local dev) ──
  try {
    const filePath = path.join(process.cwd(), `.hermes-${key}.json`);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Write a JSON blob to persistent storage.
 * @param key  Logical name, e.g. "sites", "keywords"
 * @param data Serialisable value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function hermesWrite(key: string, data: any): Promise<void> {
  const json = JSON.stringify(data, null, 2);

  // ── Supabase Storage (production) ──
  const sb = getAdmin();
  if (sb) {
    try {
      await ensureBucket(sb);
      const buffer = Buffer.from(json, "utf-8");
      const { error } = await sb.storage
        .from(BUCKET)
        .upload(`${key}.json`, buffer, {
          upsert: true,
          contentType: "application/json",
        });

      if (error) throw error;
      return; // ✅ Supabase success
    } catch (err) {
      console.warn(`[Hermes Storage] Supabase write failed for "${key}":`, err);
    }
  }

  // ── Filesystem fallback (local dev) ──
  try {
    const filePath = path.join(process.cwd(), `.hermes-${key}.json`);
    await fs.writeFile(filePath, json, "utf-8");
  } catch (err) {
    console.error(`[Hermes Storage] All storage backends failed for "${key}":`, err);
  }
}
