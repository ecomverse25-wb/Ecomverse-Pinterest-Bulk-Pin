'use client'

import { useEffect, useState, useCallback } from 'react'
import StatusBadge from '@/components/hermes/StatusBadge'
import ConfirmModal from '@/components/hermes/ConfirmModal'
import {
  hermesGet, hermesPost, hermesDelete, hermesPut, hermesCache,
  type Site,
} from '@/components/hermes/utils'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className ?? ''}`} />
}

const TONE_OPTIONS = [
  'warm-conversational', 'practical-helpful', 'aspirational-warm',
  'caring-authoritative', 'friendly-trendy', 'knowledgeable-inclusive',
]
const AD_NETWORKS = ['None', 'Mediavine', 'Ezoic', 'Raptive', 'AdThrive']
const CONTENT_TYPES = ['roundup', 'listicle', 'how-to', 'product-review', 'buying-guide']
const AFFILIATE_PROGRAMS = ['Amazon Associates', 'Mediavine', 'Wayfair', 'ShareASale', 'Other']

interface SiteForm {
  niche_id: string
  display_name: string
  site_url: string
  wp_username: string
  wp_app_password: string
  amazon_tag: string
  affiliate_programs: string[]
  ad_network: string
  tone: string
  content_types: string[]
}

const EMPTY_FORM: SiteForm = {
  niche_id: '', display_name: '', site_url: '', wp_username: '', wp_app_password: '',
  amazon_tag: '', affiliate_programs: [], ad_network: 'None', tone: 'warm-conversational', content_types: [],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySite = any

export default function SitesPage() {
  const [sites, setSites] = useState<AnySite[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<SiteForm>({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AnySite>(null)
  const [deleting, setDeleting] = useState(false)

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<SiteForm>({ ...EMPTY_FORM })
  const [savingEdit, setSavingEdit] = useState(false)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: any) => {
    let safeMsg = 'Unknown error'
    if (typeof msg === 'string') safeMsg = msg
    else if (msg && typeof msg === 'object') safeMsg = msg.message || msg.msg || msg.error || JSON.stringify(msg)
    setToast({ type, msg: String(safeMsg) }); setTimeout(() => setToast(null), 5000)
  }, [])

  const loadSites = useCallback(async () => {
    setLoading(true)
    try {
      const cached = hermesCache.get<AnySite[]>('sites_list')
      if (cached) setSites(cached)
      const res = await hermesGet<any>('/sites')
      if (res?.error) { showToast('error', res.error) }
      else { const list = res?.sites || []; setSites(list); hermesCache.set('sites_list', list) }
    } catch (err) { console.error('[Sites] loadSites:', err) }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { loadSites() }, [loadSites])

  // Add site
  const handleSubmit = async () => {
    if (!form.niche_id.trim() || !form.site_url.trim()) { showToast('error', 'Niche ID and Site URL are required'); return }
    setSubmitting(true)
    try {
      const res = await hermesPost<any>('/sites', form)
      if (res.success || res.message?.toLowerCase().includes('added')) {
        showToast('success', `✅ Site "${form.display_name || form.niche_id}" added successfully`)
        setForm({ ...EMPTY_FORM }); setShowAddForm(false); hermesCache.clear('sites_list'); loadSites()
      } else { showToast('error', res.detail || res.error || res.message || 'Failed to add site') }
    } catch (err) { showToast('error', `Failed to add site: ${err instanceof Error ? err.message : String(err)}`) }
    finally { setSubmitting(false) }
  }

  // Test connection
  const testConnection = async (nicheId: string) => {
    setTesting(nicheId)
    const res = await hermesPost<any>(`/sites/${nicheId}/test`, {})
    if (res.connected) {
      showToast('success', `✅ Connected to ${res.site_url}`)
      // Bug #3B: Update local state immediately so badge turns green
      setSites(prev => prev.map(s => s.niche_id === nicheId ? { ...s, wp_connected: true } : s))
      // Persist the connected status
      hermesPut(`/sites/${nicheId}`, { wp_connected: true }).catch(() => {})
      hermesCache.clear('sites_list')
    } else {
      showToast('error', `Connection failed: ${res.error || 'Unknown error'}`)
      setSites(prev => prev.map(s => s.niche_id === nicheId ? { ...s, wp_connected: false } : s))
    }
    setTesting(null)
  }

  // Delete site
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await hermesDelete<any>(`/sites/${deleteTarget.niche_id}`)
      if (res.success || res.message?.toLowerCase().includes('removed') || res.message?.toLowerCase().includes('deleted')) {
        showToast('success', `Site "${deleteTarget.name || deleteTarget.niche_id}" removed from Hermes`)
        hermesCache.clear('sites_list'); loadSites()
      } else { showToast('error', res.detail || res.error || res.message || 'Failed to delete site') }
    } catch (err) { showToast('error', `Failed to delete: ${err instanceof Error ? err.message : String(err)}`) }
    finally { setDeleteTarget(null); setDeleting(false) }
  }

  // Start inline edit
  const startEdit = (site: AnySite) => {
    setEditingId(site.niche_id)
    setEditForm({
      niche_id: site.niche_id || '',
      display_name: site.display_name || site.name || '',
      site_url: site.url || site.site_url || '',
      wp_username: site.wp_username || '',
      wp_app_password: site.wp_app_password || '',
      amazon_tag: site.amazon_tag || '',
      affiliate_programs: site.affiliate_programs || [],
      ad_network: site.ad_network || 'None',
      tone: site.tone || 'warm-conversational',
      content_types: site.content_types || [],
    })
  }

  // Save inline edit
  const saveEdit = async () => {
    if (!editingId) return
    setSavingEdit(true)
    try {
      const res = await hermesPut<any>(`/sites/${editingId}`, editForm)
      if (res.success || res.message) {
        showToast('success', `✅ Site "${editForm.display_name || editingId}" updated`)
        setEditingId(null); hermesCache.clear('sites_list'); loadSites()
      } else { showToast('error', res.detail || res.error || 'Failed to update site') }
    } catch (err) { showToast('error', `Update failed: ${err instanceof Error ? err.message : String(err)}`) }
    finally { setSavingEdit(false) }
  }

  const toggleArrayField = (field: 'affiliate_programs' | 'content_types', value: string, isEdit = false) => {
    const setter = isEdit ? setEditForm : setForm
    setter((prev) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter((v) => v !== value) : [...prev[field], value],
    }))
  }

  // Shared field renderer for both add and edit forms
  const renderFormFields = (f: SiteForm, setF: React.Dispatch<React.SetStateAction<SiteForm>>, isEdit: boolean) => (
    <>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Niche ID</label>
          <input type="text" value={f.niche_id} disabled={isEdit}
            onChange={(e) => setF((p) => ({ ...p, niche_id: e.target.value.replace(/\s/g, '_').toLowerCase() }))}
            placeholder="e.g. home_decor"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition disabled:opacity-50" />
        </div>
        <div className="space-y-1.5">
          <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Display Name</label>
          <input type="text" value={f.display_name}
            onChange={(e) => setF((p) => ({ ...p, display_name: e.target.value }))}
            placeholder="e.g. Home Decor Ideas"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition" />
        </div>
        <div className="space-y-1.5">
          <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Site URL</label>
          <input type="url" value={f.site_url}
            onChange={(e) => setF((p) => ({ ...p, site_url: e.target.value }))}
            placeholder="https://myhomedecor.com"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition" />
        </div>
        <div className="space-y-1.5">
          <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">WordPress Username</label>
          <input type="text" value={f.wp_username}
            onChange={(e) => setF((p) => ({ ...p, wp_username: e.target.value }))}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition" />
        </div>
        <div className="space-y-1.5">
          <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">WP Application Password</label>
          <input type="password" value={f.wp_app_password}
            onChange={(e) => setF((p) => ({ ...p, wp_app_password: e.target.value }))}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition" />
          <p className="text-gray-500 text-xs">Get from: WP Admin → Users → Your Profile → Application Passwords</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Amazon Associates Tag</label>
          <input type="text" value={f.amazon_tag}
            onChange={(e) => setF((p) => ({ ...p, amazon_tag: e.target.value }))}
            placeholder="e.g. mysite-20"
            className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Content Tone</label>
          <select value={f.tone} onChange={(e) => setF((p) => ({ ...p, tone: e.target.value }))}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50 transition">
            {TONE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Ad Network</label>
          <select value={f.ad_network} onChange={(e) => setF((p) => ({ ...p, ad_network: e.target.value }))}
            className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50 transition">
            {AD_NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Affiliate Programs</label>
        <div className="flex flex-wrap gap-3">
          {AFFILIATE_PROGRAMS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={f.affiliate_programs.includes(p)}
                onChange={() => toggleArrayField('affiliate_programs', p, isEdit)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-yellow-500" />
              {p}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-gray-300 text-xs font-semibold uppercase tracking-wider">Content Types</label>
        <div className="flex flex-wrap gap-3">
          {CONTENT_TYPES.map((ct) => (
            <label key={ct} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={f.content_types.includes(ct)}
                onChange={() => toggleArrayField('content_types', ct, isEdit)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-yellow-500" />
              {ct}
            </label>
          ))}
        </div>
      </div>
    </>
  )

  return (
    <div className="space-y-6">
      {toast && (
        <div className={['fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-sm shadow-2xl max-w-sm',
          toast.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-red-500/20 border-red-500/30 text-red-300',
        ].join(' ')}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">🌐 Site Management</h1>
          <p className="text-gray-400 text-sm mt-1">Manage WordPress sites connected to Hermes</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition">
          {showAddForm ? '✕ Cancel' : '+ Add Site'}
        </button>
      </div>

      {/* Add Site Form */}
      {showAddForm && (
        <div className="rounded-xl bg-gray-900 border border-yellow-500/20 p-6 space-y-5">
          <h2 className="text-lg font-bold text-white">Add New Site to Hermes</h2>
          {renderFormFields(form, setForm, false)}
          <button onClick={handleSubmit} disabled={submitting || !form.niche_id.trim() || !form.site_url.trim()}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40 disabled:cursor-not-allowed">
            {submitting ? 'Adding…' : 'Add Site to Hermes'}
          </button>
        </div>
      )}

      {/* Sites List */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        {loading && sites.length === 0 ? (
          <div className="p-5 space-y-3">{[0,1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : sites.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No sites configured yet.</p>
            <button onClick={() => setShowAddForm(true)} className="mt-3 text-yellow-400 text-sm hover:text-yellow-300">+ Add your first site</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {sites.map((site: AnySite) => (
              <div key={site.id || site.niche_id}>
                {editingId === site.niche_id ? (
                  /* ── Inline Edit Mode ───────────────────────────── */
                  <div className="p-5 space-y-5 bg-gray-800/20">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">Editing: {site.name || site.niche_id}</h3>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} disabled={savingEdit}
                          className="px-4 py-2 rounded-lg text-xs font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-50">
                          {savingEdit ? 'Saving…' : '💾 Save Changes'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="px-4 py-2 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 transition">Cancel</button>
                      </div>
                    </div>
                    {renderFormFields(editForm, setEditForm, true)}
                  </div>
                ) : (
                  /* ── Display Mode ──────────────────────────────── */
                  <div className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-gray-800/30 transition">
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-white font-medium">{site.name || site.display_name || site.niche_id}</p>
                      <p className="text-gray-500 text-xs truncate">{site.url || site.site_url || '—'}</p>
                      <span className="text-gray-600 font-mono text-[10px]">{site.niche_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={site.wp_connected ? 'online' : 'offline'}
                        label={site.wp_connected ? 'Connected' : 'Disconnected'} size="sm" />
                      <button onClick={() => testConnection(site.niche_id)} disabled={testing === site.niche_id}
                        className="text-[10px] text-gray-500 hover:text-yellow-400 transition">
                        {testing === site.niche_id ? '…' : 'Test'}
                      </button>
                    </div>
                    <div className="text-center min-w-[60px]">
                      <p className="text-emerald-400 font-semibold text-sm">{site.keywords_available ?? 0}</p>
                      <p className="text-gray-600 text-[10px]">keywords</p>
                    </div>
                    <div className="text-center min-w-[50px] hidden sm:block">
                      <p className="text-gray-400 text-sm">{site.articles_today ?? site.articles_total ?? 0}</p>
                      <p className="text-gray-600 text-[10px]">articles</p>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <button onClick={() => startEdit(site)}
                        className="px-2.5 py-1.5 rounded-lg text-xs text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 transition font-medium">✏️ Edit</button>
                      <button onClick={() => setDeleteTarget(site)}
                        className="px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition font-medium">🗑 Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name || 'site'}?`}
        message="This will remove the site from Hermes automation."
        consequences={[
          'WordPress content will NOT be deleted',
          'Keyword database for this site will be cleared',
          'Scheduled automation for this site will stop',
        ]}
        confirmLabel="Delete Site"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}
