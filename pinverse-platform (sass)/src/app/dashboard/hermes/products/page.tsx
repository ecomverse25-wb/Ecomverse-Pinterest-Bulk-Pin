"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import ConfirmModal from "@/components/hermes/ConfirmModal";
import JobMonitor from "@/components/hermes/JobMonitor";
import {
  hermesGet,
  hermesPost,
  hermesDelete,
  formatNumber,
  type Site,
  type Product,
} from "@/components/hermes/utils";

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
    </svg>
  );
}

export default function ProductsPage() {
  // Sites
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedNiche, setSelectedNiche] = useState("");
  const [sitesLoading, setSitesLoading] = useState(true);

  // Products for selected site
  const [totalProducts, setTotalProducts] = useState(0);
  const [lastSynced, setLastSynced] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncJobId, setSyncJobId] = useState<string | null>(null);

  // Upload
  const [csvText, setCsvText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  // Clear
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Feedback
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(t); }
  }, [message]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 8000); return () => clearTimeout(t); }
  }, [error]);

  // Load sites list
  useEffect(() => {
    (async () => {
      setSitesLoading(true);
      const res = await hermesGet("/sites");
      if (res?.error) {
        setError(res.error);
      } else {
        const siteList = res?.sites || [];
        setSites(siteList);
        if (siteList.length > 0 && !selectedNiche) {
          setSelectedNiche(siteList[0].niche_id);
          // Set default sitemap URL for the first site
          if (siteList[0].url) {
            setSitemapUrl(`${siteList[0].url}/product-sitemap.xml`);
          }
        }
      }
      setSitesLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When selected niche changes, update sitemap URL and reload products
  useEffect(() => {
    if (!selectedNiche) return;
    const site = sites.find((s) => s.niche_id === selectedNiche);
    if (site?.url) {
      setSitemapUrl(`${site.url}/product-sitemap.xml`);
    }
    // Reset search when switching sites
    setSearchResults([]);
    setSearchQuery("");
  }, [selectedNiche, sites]);

  // Load products for the selected site
  const loadProducts = useCallback(async () => {
    if (!selectedNiche) return;
    setLoading(true);
    const res = await hermesGet(`/products/${selectedNiche}`);
    if (res?.error) {
      // Fallback to global products endpoint for backwards compat
      const globalRes = await hermesGet("/products");
      if (!globalRes?.error) {
        setTotalProducts(globalRes?.total ?? 0);
        setLastSynced(globalRes?.last_synced || "");
        setProducts(globalRes?.sample || []);
      }
    } else {
      setTotalProducts(res?.total ?? 0);
      setLastSynced(res?.last_synced || "");
      setProducts(res?.sample || res?.products || []);
    }
    setLoading(false);
  }, [selectedNiche]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Sync from sitemap — scoped to selected site
  const handleSync = async () => {
    if (!selectedNiche) return;
    setSyncing(true);
    setError("");
    setMessage("");
    const res = await hermesPost("/products/sync", {
      sitemap_url: sitemapUrl,
      niche: selectedNiche,
    });
    if (res.success || res.job_id || res.message?.toLowerCase().includes("start")) {
      setMessage(res.message || `Sync started for ${selectedNiche}: ${sitemapUrl}`);
      if (res.job_id) setSyncJobId(res.job_id);
      else {
        setTimeout(() => loadProducts(), 3000);
      }
    } else {
      setError(res.detail || res.error || res.message || "Sync failed — Hermes API returned an error. Check VPS logs.");
    }
    setSyncing(false);
  };

  // Upload CSV — scoped to selected site
  const handleUpload = async () => {
    if (!csvText.trim() || !selectedNiche) return;
    setUploading(true);
    try {
      // Parse CSV into product objects
      const lines = csvText.trim().split("\n").filter((l) => l.trim());
      const productList = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return { name: parts[0] || "", url: parts[1] || "", description: parts[2] || "", price: parts[3] || "" };
      });
      const res = await hermesPost("/products/upload", {
        products: productList,
        niche: selectedNiche,
      });
      if (res.success) {
        setMessage(`✅ Imported ${res.imported ?? productList.length} products for ${selectedNiche}`);
        setCsvText("");
        loadProducts();
      } else {
        setError(res.detail || res.error || res.message || "Upload failed");
      }
    } catch (err) {
      console.error("[Hermes] Upload error:", err);
      setError(`Upload error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
    }
  };

  // Search — scoped to selected site
  const handleSearch = async () => {
    if (!searchQuery.trim() || !selectedNiche) return;
    setSearching(true);
    try {
      const res = await hermesGet(
        `/products/search?query=${encodeURIComponent(searchQuery)}&niche=${encodeURIComponent(selectedNiche)}&limit=10`
      );
      setSearchResults(res?.products || []);
      if ((res?.products || []).length === 0) setMessage("No products found for that query");
    } catch (err) {
      console.error("[Hermes] Search error:", err);
      setError(`Search failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSearching(false);
    }
  };

  // Clear all — scoped to selected site
  const handleClear = async () => {
    if (!selectedNiche) return;
    setClearing(true);
    try {
      const res = await hermesDelete(`/products/${selectedNiche}/clear`);
      if (res.success) {
        setMessage(`Product database cleared for ${selectedNiche}`);
        loadProducts();
      } else {
        // Fallback to global endpoint
        const globalRes = await hermesDelete("/products/clear");
        if (globalRes.success) {
          setMessage("Product database cleared");
          loadProducts();
        } else {
          setError(globalRes.detail || globalRes.error || globalRes.message || "Clear failed");
        }
      }
    } catch (err) {
      console.error("[Hermes] Clear error:", err);
      setError(`Clear failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setShowClearModal(false);
      setClearing(false);
    }
  };

  // File handlers
  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setMessage(`📄 Loaded ${file.name} — ${text.split("\n").filter(l => l.trim()).length} rows`);
    };
    reader.readAsText(file);
  };

  const selectedSite = sites.find((s) => s.niche_id === selectedNiche);

  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner className="text-yellow-400" />
        <span className="ml-3 text-gray-400 text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-yellow-400">📦 Product Management</h1>
        <p className="text-gray-400 text-sm mt-1">Manage the product database for affiliate linking — per site</p>
      </div>

      {/* Feedback */}
      {message && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300 text-sm flex items-center justify-between">
          {message}<button onClick={() => setMessage("")} className="ml-2 text-emerald-400 hover:text-white">✕</button>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm flex items-center justify-between whitespace-pre-line">
          {error}<button onClick={() => setError("")} className="ml-2 text-red-400 hover:text-white flex-shrink-0">✕</button>
        </div>
      )}

      {/* ── Site Selector ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {sites.map((site) => (
          <button
            key={site.niche_id}
            onClick={() => setSelectedNiche(site.niche_id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
              selectedNiche === site.niche_id
                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                : "bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {site.name || site.niche_id}
          </button>
        ))}
        {sites.length === 0 && (
          <p className="text-gray-500 text-sm">No sites configured. Add sites in the Sites tab first.</p>
        )}
      </div>

      {selectedNiche && (
        <>
          {/* ── Product Stats ──────────────────────────────────────────── */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl p-5 bg-gray-900 border border-gray-800">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Products for {selectedSite?.name || selectedNiche}</p>
              <p className="text-3xl font-bold text-white mt-1">{loading ? "—" : formatNumber(totalProducts)}</p>
            </div>
            <div className="rounded-xl p-5 bg-gray-900 border border-gray-800">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Last Synced</p>
              <p className="text-sm text-white mt-2">{lastSynced ? new Date(lastSynced).toLocaleString() : "Never"}</p>
            </div>
            <div className="rounded-xl p-5 bg-gray-900 border border-gray-800 flex items-center justify-center">
              <button
                onClick={loadProducts}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition disabled:opacity-50"
              >
                {loading ? <span className="flex items-center gap-2"><Spinner className="text-gray-400" /> Loading…</span> : "🔄 Refresh"}
              </button>
            </div>
          </div>

          {/* ── Sync from Sitemap ──────────────────────────────────────── */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
            <h2 className="text-lg font-bold text-white">
              Sync from Sitemap
              <span className="text-gray-500 text-xs font-normal ml-2">({selectedSite?.name || selectedNiche})</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="url"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder={`https://${selectedSite?.url || "example.com"}/product-sitemap.xml`}
                className="flex-1 rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition"
              />
              <button
                onClick={handleSync}
                disabled={syncing || !sitemapUrl.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {syncing ? <span className="flex items-center gap-2"><Spinner className="text-black" /> Syncing…</span> : "🔄 Sync Now"}
              </button>
            </div>
            {syncJobId && (
              <JobMonitor
                jobId={syncJobId}
                onComplete={() => {
                  setSyncJobId(null);
                  loadProducts();
                }}
              />
            )}
          </div>

          {/* ── Upload Products CSV ────────────────────────────────────── */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
            <h2 className="text-lg font-bold text-white">
              Upload Products CSV
              <span className="text-gray-500 text-xs font-normal ml-2">→ {selectedSite?.name || selectedNiche}</span>
            </h2>
            <p className="text-gray-400 text-sm">Format: name, url, description (optional), price (optional)</p>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileRead(file);
                e.target.value = "";
              }}
            />

            {/* File Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-yellow-500", "bg-yellow-500/5"); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-yellow-500", "bg-yellow-500/5"); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("border-yellow-500", "bg-yellow-500/5");
                const file = e.dataTransfer.files?.[0];
                if (file && (file.name.endsWith(".csv") || file.type === "text/csv" || file.type === "text/plain")) {
                  handleFileRead(file);
                } else {
                  setError("Please drop a .csv file");
                }
              }}
              className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center transition-colors cursor-pointer hover:border-gray-500"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-gray-400 text-sm">
                  <span className="text-yellow-400 font-semibold hover:underline">Click to browse</span>
                  {" "}or drag & drop a CSV file here
                </p>
                <p className="text-gray-600 text-xs">Supports .csv and .txt files</p>
              </div>
            </div>

            {/* Preview / Manual Edit */}
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={5}
              placeholder="Product Name, https://example.com/product, Description, $29.99"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 font-mono focus:outline-none focus:border-yellow-500/50 transition resize-y"
            />

            {/* Row count indicator */}
            {csvText.trim() && (
              <p className="text-gray-500 text-xs">
                {csvText.trim().split("\n").filter(l => l.trim()).length} rows ready to import to <b className="text-gray-300">{selectedSite?.name || selectedNiche}</b>
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleUpload}
                disabled={!csvText.trim() || uploading}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploading ? <span className="flex items-center gap-2"><Spinner className="text-black" /> Uploading…</span> : "⬆ Upload Products"}
              </button>
              {csvText.trim() && (
                <button
                  onClick={() => setCsvText("")}
                  className="px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white transition"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Product Search ─────────────────────────────────────────── */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
            <h2 className="text-lg font-bold text-white">
              Product Search
              <span className="text-gray-500 text-xs font-normal ml-2">in {selectedSite?.name || selectedNiche}</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="e.g. smoothie blender, air fryer..."
                className="flex-1 rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition"
              />
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition disabled:opacity-40"
              >
                {searching ? <Spinner className="text-white" /> : "🔍 Search"}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-gray-800/50 border border-gray-800 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{p.title}</p>
                      <p className="text-gray-500 text-xs truncate">{p.url}</p>
                    </div>
                    {p.price && <span className="text-emerald-400 text-sm font-semibold ml-3">{p.price}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Product Preview Table ──────────────────────────────────── */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Product Sample</h2>
              <button
                onClick={loadProducts}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:text-white border border-gray-700 transition disabled:opacity-50"
              >
                Refresh Sample
              </button>
            </div>

            {products.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No products in database for {selectedSite?.name || selectedNiche}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                      <th className="text-left pb-2 font-medium">Product Name</th>
                      <th className="text-left pb-2 font-medium">URL</th>
                      <th className="text-right pb-2 font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {products.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-800/30 transition">
                        <td className="py-2 text-white font-medium">{p.title}</td>
                        <td className="py-2 text-gray-400 text-xs truncate max-w-[200px]">
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400">{p.url}</a>
                        </td>
                        <td className="py-2 text-right text-emerald-400">{p.price || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Danger Zone ────────────────────────────────────────────── */}
          <div className="rounded-xl bg-gray-900 border border-red-500/20 p-5 space-y-3">
            <h3 className="text-sm font-bold text-red-400">⚠️ Danger Zone</h3>
            <p className="text-gray-400 text-sm">
              Clear the product database for <b className="text-gray-300">{selectedSite?.name || selectedNiche}</b>.
              Articles generated after clearing will have no products to recommend for this site.
            </p>
            <button
              onClick={() => setShowClearModal(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-500/20 transition"
            >
              Clear Products for {selectedSite?.name || selectedNiche}
            </button>
          </div>

          <ConfirmModal
            open={showClearModal}
            title={`Clear products for ${selectedSite?.name || selectedNiche}?`}
            message={`This will delete all ${formatNumber(totalProducts)} products from the ${selectedSite?.name || selectedNiche} database.`}
            consequences={[
              `All product data for ${selectedSite?.name || selectedNiche} will be permanently removed`,
              "Other sites' products are NOT affected",
              "Articles generated after clearing will have no products to recommend",
              "You'll need to sync again from the sitemap",
            ]}
            confirmLabel="Clear Products"
            confirmVariant="danger"
            onConfirm={handleClear}
            onCancel={() => setShowClearModal(false)}
            loading={clearing}
          />
        </>
      )}
    </div>
  );
}
