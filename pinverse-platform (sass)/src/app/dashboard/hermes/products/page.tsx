'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import ConfirmModal from '@/components/hermes/ConfirmModal'
import JobMonitor from '@/components/hermes/JobMonitor'
import {
  hermesGet, hermesPost, hermesDelete, hermesCache, formatNumber, KNOWN_SITES,
} from '@/components/hermes/utils'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className ?? ''}`} />
}

export default function ProductsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sites, setSites] = useState<any[]>([])
  const [selectedNiche, setSelectedNiche] = useState('')
  const [sitesLoading, setSitesLoading] = useState(true)

  const [totalProducts, setTotalProducts] = useState(0)
  const [lastSynced, setLastSynced] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [sitemapUrl, setSitemapUrl] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncJobId, setSyncJobId] = useState<string | null>(null)
  const [syncPolling, setSyncPolling] = useState(false)

  const [csvText, setCsvText] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const [showClearModal, setShowClearModal] = useState(false)
  const [clearing, setClearing] = useState(false)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: any) => {
    let safeMsg = 'Unknown error'
    if (typeof msg === 'string') safeMsg = msg
    else if (msg && typeof msg === 'object') {
      safeMsg = msg.message || msg.msg || msg.error || JSON.stringify(msg)
    }
    setToast({ type, msg: String(safeMsg) }); setTimeout(() => setToast(null), 5000)
  }, [])

  // Derive a proper sitemap URL — uses KNOWN_SITES as authoritative source to fix wrong URLs in stored data
  const deriveSitemapUrl = (nicheId: string, fallbackUrl?: string): string => {
    // 1. Check KNOWN_SITES for the correct, verified URL
    const knownSite = KNOWN_SITES.find(s => s.niche_id === nicheId)
    const rawUrl = knownSite?.url || fallbackUrl || ''
    if (!rawUrl) return ''
    let base = rawUrl.trim().replace(/\/+$/, '')
    if (!base.startsWith('http://') && !base.startsWith('https://')) base = `https://${base}`
    return `${base}/product-sitemap.xml`
  }

  // Load sites
  useEffect(() => {
    (async () => {
      setSitesLoading(true)
      const cached = hermesCache.get<any[]>('product_sites')
      if (cached) {
        setSites(cached)
        if (cached.length > 0 && !selectedNiche) {
          setSelectedNiche(cached[0].niche_id)
          setSitemapUrl(deriveSitemapUrl(cached[0].niche_id, cached[0].url))
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesGet<any>('/sites')
      if (res?.error) { showToast('error', res.error) }
      else {
        const list = res?.sites || []
        setSites(list); hermesCache.set('product_sites', list)
        if (list.length > 0 && !selectedNiche) {
          setSelectedNiche(list[0].niche_id)
          setSitemapUrl(deriveSitemapUrl(list[0].niche_id, list[0].url))
        }
      }
      setSitesLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When niche changes, ALWAYS update sitemap URL using KNOWN_SITES as truth
  useEffect(() => {
    if (!selectedNiche) return
    const site = sites.find((s) => s.niche_id === selectedNiche)
    console.log('[Products Page] Niche changed to:', selectedNiche, 'Found site:', site)
    setSitemapUrl(deriveSitemapUrl(selectedNiche, site?.url))
    setSearchResults([]); setSearchQuery('')
  }, [selectedNiche, sites])

  const loadProducts = useCallback(async () => {
    if (!selectedNiche) return
    setLoading(true)
    try {
      const cacheKey = `products_${selectedNiche}`
      const cached = hermesCache.get<any>(cacheKey)
      if (cached) { setTotalProducts(cached.total ?? 0); setLastSynced(cached.last_synced || ''); setProducts(cached.sample || []) }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesGet<any>(`/products/${selectedNiche}`)
      if (res?.error) {
        const globalRes = await hermesGet<any>('/products')
        if (!globalRes?.error) {
          setTotalProducts(globalRes?.total ?? 0); setLastSynced(globalRes?.last_synced || ''); setProducts(globalRes?.sample || [])
        }
      } else {
        setTotalProducts(res?.total ?? 0); setLastSynced(res?.last_synced || ''); setProducts(res?.sample || res?.products || [])
        hermesCache.set(cacheKey, res)
      }
    } catch { /* keep stale */ }
    finally { setLoading(false) }
  }, [selectedNiche])

  useEffect(() => { loadProducts() }, [loadProducts])

  const handleSync = async () => {
    if (!selectedNiche) return
    setSyncing(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await hermesPost<any>('/products/sync', { sitemap_url: sitemapUrl, niche: selectedNiche })
    if (res.success || res.job_id || res.message?.toLowerCase().includes('start')) {
      showToast('success', res.message || `Sync started for ${selectedNiche}: ${sitemapUrl}`)
      if (res.job_id) setSyncJobId(res.job_id)
      // Bug #6: Start polling to update counter + lastSynced
      const prevLastSynced = lastSynced
      setSyncPolling(true)
      let attempts = 0
      const pollInterval = setInterval(async () => {
        attempts++
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pollRes = await hermesGet<any>(`/products/${selectedNiche}`)
          if (!pollRes?.error) {
            setTotalProducts(pollRes?.total ?? 0)
            setLastSynced(pollRes?.last_synced || '')
            setProducts(pollRes?.sample || pollRes?.products || [])
            hermesCache.set(`products_${selectedNiche}`, pollRes)
            // Stop if lastSynced changed or we have products
            if ((pollRes?.last_synced && pollRes.last_synced !== prevLastSynced) || attempts >= 10) {
              clearInterval(pollInterval)
              setSyncPolling(false)
              if (pollRes?.last_synced && pollRes.last_synced !== prevLastSynced) {
                showToast('success', `✅ Sync complete: ${pollRes.total} products loaded`)
              }
            }
          }
        } catch { /* keep polling */ }
        if (attempts >= 10) { clearInterval(pollInterval); setSyncPolling(false) }
      }, 3000)
    } else {
      showToast('error', res.detail || res.error || res.message || 'Sync failed')
    }
    setSyncing(false)
  }

  // Parse a single CSV line respecting quoted fields (e.g. "Glass Pineapple Coffee Mug, Straw")
  const parseCsvLine = (line: string): string[] => {
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = '' }
      else current += ch
    }
    fields.push(current.trim())
    return fields
  }

  // Normalize header names: case-insensitive + aliases
  const normalizeHeader = (h: string): string => {
    const key = h.trim().toLowerCase().replace(/^"|"$/g, '')
    if (key === 'link' || key === 'product link' || key === 'product_link' || key === 'product url' || key === 'product_url') return 'url'
    if (key === 'image' || key === 'image_url' || key === 'image url' || key === 'img' || key === 'thumbnail') return 'image_url'
    if (key === 'title' || key === 'product name' || key === 'product_name' || key === 'product') return 'name'
    if (key === 'desc') return 'description'
    return key // name, url, description, price pass through as-is
  }

  const handleUpload = async () => {
    console.log('[Products Page] Upload Products button clicked')
    if (!csvText.trim() || !selectedNiche) return
    setUploading(true)
    try {
      const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim())
      if (lines.length === 0) { showToast('error', 'No data found'); setUploading(false); return }

      // Detect if the first line is a header row
      const firstFields = parseCsvLine(lines[0])
      const normalized = firstFields.map(normalizeHeader)
      const knownColumns = ['name', 'url', 'description', 'price', 'image_url']
      const isHeaderRow = normalized.some(h => knownColumns.includes(h))

      let productList: { name: string; url: string; description: string; price: string; image_url: string }[]

      if (isHeaderRow) {
        // Header-based parsing — map columns by name
        const headerMap = normalized
        const dataLines = lines.slice(1)
        productList = dataLines.map((line) => {
          const fields = parseCsvLine(line)
          const row: Record<string, string> = {}
          headerMap.forEach((col, idx) => { row[col] = (fields[idx] || '').replace(/^"|"$/g, '') })
          return {
            name: row.name || '',
            url: row.url || '',
            description: row.description || '',
            price: row.price || '',
            image_url: row.image_url || '',
          }
        }).filter(p => p.name || p.url)
      } else {
        // Positional fallback: name, url, description, price
        productList = lines.map((line) => {
          const parts = parseCsvLine(line)
          return {
            name: (parts[0] || '').replace(/^"|"$/g, ''),
            url: (parts[1] || '').replace(/^"|"$/g, ''),
            description: (parts[2] || '').replace(/^"|"$/g, ''),
            price: (parts[3] || '').replace(/^"|"$/g, ''),
            image_url: '',
          }
        }).filter(p => p.name || p.url)
      }

      console.log(`[Products Page] Parsed ${productList.length} products. isHeaderRow:`, isHeaderRow)
      if (productList.length === 0) { showToast('error', 'No valid products found in CSV'); setUploading(false); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesPost<any>('/products/upload', { products: productList, niche: selectedNiche })
      console.log('[Products Page] API Response:', res)
      if (res.success) {
        showToast('success', `✅ Imported ${res.imported ?? productList.length} products for ${selectedNiche}`)
        setCsvText(''); hermesCache.clear(`products_${selectedNiche}`); loadProducts()
      } else { showToast('error', res.detail || res.error || res.message || 'Upload failed') }
    } catch (err) { 
      console.error('[Products Page] Upload Error:', err)
      showToast('error', `Upload error: ${err instanceof Error ? err.message : String(err)}`) 
    }
    finally { setUploading(false) }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !selectedNiche) return
    setSearching(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesGet<any>(`/products/search?query=${encodeURIComponent(searchQuery)}&niche=${encodeURIComponent(selectedNiche)}&limit=10`)
      setSearchResults(res?.products || [])
      if ((res?.products || []).length === 0) showToast('success', 'No products found for that query')
    } catch (err) { showToast('error', `Search failed: ${err instanceof Error ? err.message : String(err)}`) }
    finally { setSearching(false) }
  }

  const handleClear = async () => {
    if (!selectedNiche) return
    setClearing(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesDelete<any>(`/products/${selectedNiche}/clear`)
      if (res.success) {
        showToast('success', `Product database cleared for ${selectedNiche}`)
        hermesCache.clear(`products_${selectedNiche}`); loadProducts()
      } else {
        const globalRes = await hermesDelete<any>('/products/clear')
        if (globalRes.success) { showToast('success', 'Product database cleared'); loadProducts() }
        else { showToast('error', globalRes.detail || globalRes.error || globalRes.message || 'Clear failed') }
      }
    } catch (err) { showToast('error', `Clear failed: ${err instanceof Error ? err.message : String(err)}`) }
    finally { setShowClearModal(false); setClearing(false) }
  }

  const handleFileRead = (file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvText(text); showToast('success', `📄 Loaded ${file.name} — ${text.split('\n').filter(l => l.trim()).length} rows`)
    }
    reader.readAsText(file)
  }

  const selectedSite = sites.find((s) => s.niche_id === selectedNiche)

  return (
    <div className="space-y-6">
      {toast && (
        <div className={['fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-sm shadow-2xl max-w-sm',
          toast.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-red-500/20 border-red-500/30 text-red-300',
        ].join(' ')}>{toast.msg}</div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">📦 Product Management</h1>
        <p className="text-gray-400 text-sm mt-1">Manage the product database for affiliate linking — per site</p>
      </div>

      {/* Site Selector */}
      {sitesLoading ? (
        <div className="flex gap-2">{[0,1,2].map(i => <Skeleton key={i} className="h-10 w-28 rounded-lg" />)}</div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {sites.map((site) => (
            <button key={site.niche_id} onClick={() => setSelectedNiche(site.niche_id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
                selectedNiche === site.niche_id
                  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-800 hover:text-white'
              }`}>
              {site.name || site.niche_id}
            </button>
          ))}
          {sites.length === 0 && <p className="text-gray-500 text-sm">No sites configured. Add sites in the Sites tab first.</p>}
        </div>
      )}

      {selectedNiche && (
        <>
          {/* Product Stats */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className={`rounded-xl p-5 bg-gray-900 border border-gray-800 ${syncPolling ? 'animate-pulse' : ''}`}>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Products for {selectedSite?.name || selectedNiche}</p>
              <p className="text-3xl font-bold text-white mt-1">{loading ? '—' : formatNumber(totalProducts)}</p>
              {syncPolling && <p className="text-yellow-400 text-xs mt-1 animate-pulse">Syncing…</p>}
            </div>
            <div className={`rounded-xl p-5 bg-gray-900 border border-gray-800 ${syncPolling ? 'animate-pulse' : ''}`}>
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Last Synced</p>
              <p className="text-sm text-white mt-2">{lastSynced ? new Date(lastSynced).toLocaleString() : 'Never'}</p>
              {syncPolling && <p className="text-yellow-400 text-xs mt-1 animate-pulse">Waiting for update…</p>}
            </div>
            <div className="rounded-xl p-5 bg-gray-900 border border-gray-800 flex items-center justify-center">
              <button onClick={loadProducts} disabled={loading || syncPolling}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition disabled:opacity-50">
                {loading || syncPolling ? 'Loading…' : '🔄 Refresh'}
              </button>
            </div>
          </div>

          {/* Sync from Sitemap */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
            <h2 className="text-lg font-bold text-white">
              Sync from Sitemap <span className="text-gray-500 text-xs font-normal ml-2">({selectedSite?.name || selectedNiche})</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="url" value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)}
                placeholder={`https://${selectedSite?.url || 'example.com'}/product-sitemap.xml`}
                className="flex-1 rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition" />
              <button onClick={handleSync} disabled={syncing || !sitemapUrl.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                {syncing ? 'Syncing…' : '🔄 Sync Now'}
              </button>
            </div>
            {syncJobId && <JobMonitor jobId={syncJobId} onComplete={() => { setSyncJobId(null); loadProducts() }} />}
          </div>

          {/* Upload CSV */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
            <h2 className="text-lg font-bold text-white">
              Upload Products CSV <span className="text-gray-500 text-xs font-normal ml-2">→ {selectedSite?.name || selectedNiche}</span>
            </h2>
            <p className="text-gray-400 text-sm">Supported: <span className="text-gray-300 font-mono text-xs">Name,Link,Image</span> or <span className="text-gray-300 font-mono text-xs">name,url,description,price</span> — headers auto-detected</p>
            <input ref={fileInputRef} type="file" accept=".csv,.txt,text/csv" className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileRead(file); e.target.value = '' }} />
            <div
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-yellow-500', 'bg-yellow-500/5') }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-yellow-500', 'bg-yellow-500/5') }}
              onDrop={(e) => {
                e.preventDefault(); e.currentTarget.classList.remove('border-yellow-500', 'bg-yellow-500/5')
                const file = e.dataTransfer.files?.[0]
                if (file && (file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain')) handleFileRead(file)
                else showToast('error', 'Please drop a .csv file')
              }}
              className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center transition-colors cursor-pointer hover:border-gray-500"
              onClick={() => fileInputRef.current?.click()}>
              <div className="flex flex-col items-center gap-2">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-gray-400 text-sm"><span className="text-yellow-400 font-semibold hover:underline">Click to browse</span> or drag &amp; drop a CSV file here</p>
                <p className="text-gray-600 text-xs">Supports .csv and .txt files</p>
              </div>
            </div>
            <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={5}
              placeholder={"Name,Link,Image\nGlass Pineapple Coffee Mug,https://example.com/product,https://img.example.com/photo.jpg"}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 font-mono focus:outline-none focus:border-yellow-500/50 transition resize-y" />
            {csvText.trim() && (
              <p className="text-gray-500 text-xs">{csvText.trim().split('\n').filter(l => l.trim()).length} rows ready to import to <b className="text-gray-300">{selectedSite?.name || selectedNiche}</b></p>
            )}
            <div className="flex items-center gap-3">
              <button onClick={handleUpload} disabled={!csvText.trim() || uploading}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40 disabled:cursor-not-allowed">
                {uploading ? 'Uploading…' : '⬆ Upload Products'}
              </button>
              {csvText.trim() && (
                <button onClick={() => setCsvText('')} className="px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white transition">Clear</button>
              )}
            </div>
          </div>

          {/* Product Search */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
            <h2 className="text-lg font-bold text-white">
              Product Search <span className="text-gray-500 text-xs font-normal ml-2">in {selectedSite?.name || selectedNiche}</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. smoothie blender, air fryer..."
                className="flex-1 rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition" />
              <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition disabled:opacity-40">
                {searching ? '…' : '🔍 Search'}
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

          {/* Product Preview Table */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Product Sample</h2>
              <button onClick={loadProducts} disabled={loading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:text-white border border-gray-700 transition disabled:opacity-50">
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
                        <td className="py-2 text-right text-emerald-400">{p.price || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl bg-gray-900 border border-red-500/20 p-5 space-y-3">
            <h3 className="text-sm font-bold text-red-400">⚠️ Danger Zone</h3>
            <p className="text-gray-400 text-sm">
              Clear the product database for <b className="text-gray-300">{selectedSite?.name || selectedNiche}</b>.
              Articles generated after clearing will have no products to recommend for this site.
            </p>
            <button onClick={() => setShowClearModal(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-500/20 transition">
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
              'Articles generated after clearing will have no products to recommend',
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
  )
}
