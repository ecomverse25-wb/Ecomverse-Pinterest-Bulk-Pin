'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  hermesGet, hermesPost, hermesCache,
  decodeHtmlEntities, qualityBadgeColor, formatDate,
  type Draft, type Job, type Site,
} from '@/components/hermes/utils'
import JobMonitor from '@/components/hermes/JobMonitor'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className ?? ''}`} />
}

function DraftCard({ draft, onPublish, publishing }: { draft: Draft; onRefresh: () => void; onPublish?: (id: string) => void; publishing?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors">
      <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
        {draft.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.thumbnail_url} alt="" className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (<span className="text-xl">📄</span>)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium leading-snug truncate">{decodeHtmlEntities(draft.title)}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-gray-500 text-xs">{draft.niche}</span>
          {draft.has_image && (
            <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-md">✅ Hero image</span>
          )}
          {draft.quality_score !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${qualityBadgeColor(draft.quality_score)}`}>{draft.quality_score}</span>
          )}
          {draft.word_count !== undefined && (
            <span className="text-xs text-gray-500">{draft.word_count.toLocaleString()} words</span>
          )}
          <span className="text-gray-600 text-xs">Date: {draft.date}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onPublish && (
          <button onClick={() => onPublish(String(draft.id))} disabled={publishing}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs transition-all whitespace-nowrap disabled:opacity-40">
            {publishing ? '…' : '✅ Publish'}
          </button>
        )}
        <a href={draft.wp_edit_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs transition-all whitespace-nowrap">
          📝 Edit →
        </a>
      </div>
    </div>
  )
}

export default function ContentPage() {
  const [sitesLoading, setSitesLoading] = useState(true)
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [jobsLoading, setJobsLoading] = useState(true)
  const [draftsLoading, setDraftsLoading] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [totalDrafts, setTotalDrafts] = useState(0)
  const [draftFilter, setDraftFilter] = useState<'all' | string>('all')
  const [keyword, setKeyword] = useState('')
  const [dryRun, setDryRun] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publishingAll, setPublishingAll] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: string) => {
    setToast({ type, msg }); setTimeout(() => setToast(null), 5000)
  }, [])

  const loadSites = useCallback(async () => {
    setSitesLoading(true)
    try {
      const cached = hermesCache.get<Site[]>('content_sites')
      if (cached) { setSites(cached); if (!selectedSite && cached.length > 0) setSelectedSite(cached[0].niche_id) }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesGet<any>('/sites')
      const list: Site[] = (res?.sites ?? res ?? []).map((s: any) => ({
        id: s.id ?? s.niche_id, niche_id: s.niche_id ?? s.id, name: s.name ?? s.niche_id,
        url: s.url ?? '', wp_connected: s.wp_connected ?? false,
        keywords_available: s.keywords_available ?? 0, articles_today: s.articles_today ?? 0,
      }))
      setSites(list); hermesCache.set('content_sites', list)
      if (!selectedSite && list.length > 0) setSelectedSite(list[0].niche_id)
    } catch (err) { console.error('[Content] loadSites:', err) }
    finally { setSitesLoading(false) }
  }, [selectedSite])

  const loadJobs = useCallback(async () => {
    setJobsLoading(true)
    try {
      const cached = hermesCache.get<Job[]>('content_jobs'); if (cached) setJobs(cached)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesGet<any>('/jobs?limit=10')
      const list: Job[] = (res?.jobs ?? res?.items ?? res ?? []).map((j: any) => ({
        ...j, id: j.id ?? j.job_id, stage: j.stage ?? j.status ?? 'queued',
      }))
      setJobs(list); hermesCache.set('content_jobs', list)
    } catch { /* keep stale */ } finally { setJobsLoading(false) }
  }, [])

  const loadDrafts = useCallback(async (site?: string) => {
    setDraftsLoading(true)
    try {
      const cacheKey = `content_drafts_${site ?? 'all'}`
      const cached = hermesCache.get<Draft[]>(cacheKey); if (cached) setDrafts(cached)
      const params = site && site !== 'all' ? `?niche=${site}&status=draft` : '?status=draft'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesGet<any>(`/drafts${params}`)
      const list: Draft[] = (res?.drafts ?? res?.items ?? res ?? []).map((d: any) => ({
        id: d.id, title: d.title ?? '', niche: d.niche ?? d.site ?? '',
        date: d.date ?? d.created_at ?? '', has_image: d.has_image ?? d.hero_image_attached ?? false,
        wp_edit_url: d.wp_edit_url ?? d.edit_url ?? '#',
        thumbnail_url: d.thumbnail_url ?? d._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? undefined,
        quality_score: d.quality_score ?? undefined, word_count: d.word_count ?? undefined,
      }))
      setTotalDrafts(res?.total ?? res?.count ?? list.length)
      setDrafts(list); hermesCache.set(cacheKey, list)
    } catch { /* keep stale */ } finally { setDraftsLoading(false) }
  }, [])

  useEffect(() => { loadSites(); loadJobs(); loadDrafts() }, [loadSites, loadJobs, loadDrafts])

  const handlePickFromQueue = useCallback(async () => {
    if (!selectedSite) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesPost<any>('/keywords/pick', { niche: selectedSite })
      const kw = res?.keyword ?? res?.label ?? res?.keyword_text ?? ''
      const vol = res?.search_volume ?? res?.volume ?? ''
      if (kw) { setKeyword(kw); showToast('success', `Picked: "${kw}"${vol ? ` (vol: ${Number(vol).toLocaleString()})` : ''}`) }
      else showToast('error', `No available keywords in queue for ${selectedSite}`)
    } catch (err: any) { showToast('error', err?.message ?? 'Failed to pick keyword') }
  }, [selectedSite, showToast])

  const handleGenerate = useCallback(async (count = 1) => {
    if (!selectedSite) { showToast('error', 'Select a site first'); return }
    setGenerating(true); setActiveJobId(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesPost<any>('/generate', {
        niche: selectedSite, keyword: keyword || undefined, count, dry_run: dryRun,
      })
      // Bug #4: Check for error in response and show specific message
      if (res?.error || res?.detail) {
        showToast('error', `Generation failed: ${res.error || res.detail}`)
        setGenerating(false)
        return
      }
      const jobId = res?.job_id ?? res?.id
      if (jobId) { setActiveJobId(jobId); showToast('success', `🚀 Article generation started (Job: ${jobId.slice(0, 8)}...)`) }
      else { showToast('success', dryRun ? 'Dry run completed' : 'Generation started in background'); setGenerating(false)
        setTimeout(() => { loadJobs(); loadDrafts(draftFilter === 'all' ? undefined : draftFilter) }, 3000) }
    } catch (err: any) { showToast('error', `Generation failed: ${err?.message ?? 'Unknown error'}`); setGenerating(false) }
  }, [selectedSite, keyword, dryRun, showToast, loadJobs, loadDrafts, draftFilter])

  const handleJobComplete = useCallback((job: Job) => {
    setGenerating(false); setActiveJobId(null)
    showToast('success', `✅ Done: ${job.article_title ?? 'Article generated'} (score: ${job.quality_score ?? '—'})`)
    loadJobs(); loadDrafts()
  }, [showToast, loadJobs, loadDrafts])

  const handleJobFailed = useCallback((job: Job) => {
    setGenerating(false); setActiveJobId(null)
    showToast('error', `❌ Failed at ${job.stage}: ${job.error ?? 'Unknown error'}`)
  }, [showToast])

  // Missing #3: Publish a single draft
  const publishDraft = useCallback(async (draftId: string) => {
    setPublishingId(draftId)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesPost<any>(`/drafts/${draftId}/publish`, {})
      if (res.success || res.published) {
        showToast('success', `✅ Published: ${res.title || 'Article'}`)
        setDrafts(prev => prev.filter(d => String(d.id) !== draftId))
        setTotalDrafts(prev => Math.max(0, prev - 1))
      } else {
        showToast('error', `Publish failed: ${res.error || res.detail || 'Unknown error'}`)
      }
    } catch (err: any) { showToast('error', `Publish failed: ${err?.message ?? 'Unknown error'}`) }
    finally { setPublishingId(null) }
  }, [showToast])

  // Missing #3: Publish all drafts
  const publishAll = useCallback(async () => {
    if (drafts.length === 0) return
    if (!confirm(`Publish all ${drafts.length} pending drafts? This cannot be undone.`)) return
    setPublishingAll(true)
    let published = 0
    for (const draft of [...drafts]) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await hermesPost<any>(`/drafts/${draft.id}/publish`, {})
        if (res.success || res.published) {
          published++
          setDrafts(prev => prev.filter(d => d.id !== draft.id))  // same type (number === number)
          setTotalDrafts(prev => Math.max(0, prev - 1))
        }
      } catch { /* continue with next */ }
    }
    showToast('success', `✅ Published ${published} of ${drafts.length} drafts`)
    setPublishingAll(false)
    loadDrafts(draftFilter === 'all' ? undefined : draftFilter)
  }, [drafts, showToast, loadDrafts, draftFilter])

  const stageLabel = (stage: string) => ({
    queued: '⏳ Queued', research: '🔍 Research', writing: '✍️ Writing',
    publishing: '📤 Publishing', images: '🖼 Images', pinterest: '📌 Pinterest',
    complete: '✅ Complete', failed: '❌ Failed',
  }[stage] ?? stage)

  return (
    <div className="space-y-6">
      {toast && (
        <div className={['fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-sm shadow-2xl max-w-sm',
          toast.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-red-500/20 border-red-500/30 text-red-300',
        ].join(' ')}>{toast.msg}</div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">🚀 Content Generation</h1>
        <p className="text-gray-500 text-sm mt-1">Generate articles and review WordPress drafts</p>
      </div>

      {/* Generate New Article */}
      <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 space-y-4">
        <h2 className="text-yellow-400 font-semibold flex items-center gap-2">🚀 Generate New Article</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wider">Site</label>
            {sitesLoading ? (
              <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-gray-500 text-sm">
                <span className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading sites…</span>
              </div>
            ) : (
              <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-white/10 bg-[#0d1117] text-white text-sm focus:outline-none focus:border-yellow-500/50">
                {sites.length === 0 ? <option value="">No sites configured</option> :
                  sites.map(s => <option key={s.niche_id} value={s.niche_id}>{s.name} ({s.keywords_available} keywords)</option>)}
              </select>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wider">Keyword</label>
            <div className="flex gap-2">
              <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
                placeholder="e.g. best air fryer recipes"
                className="flex-1 h-10 px-3 rounded-lg border border-white/10 bg-[#0d1117] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-yellow-500/50" />
              <button onClick={handlePickFromQueue} disabled={!selectedSite || sitesLoading}
                className="flex-shrink-0 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                🎯 Pick from queue
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/10 accent-yellow-400" />
            <span className="text-gray-400 text-sm">Dry run <span className="text-gray-600">(test only — don&apos;t publish)</span></span>
          </label>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => handleGenerate(1)} disabled={generating || sitesLoading || !selectedSite}
              className={['flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                generating || !selectedSite ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-400 text-black',
              ].join(' ')}>
              {generating ? (<><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />Generating…</>) : (<>▶ Generate Article</>)}
            </button>
            <button onClick={() => handleGenerate(3)} disabled={generating || sitesLoading || !selectedSite}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              Generate 3 Articles
            </button>
          </div>
        </div>
        {generating && activeJobId && <JobMonitor jobId={activeJobId} onComplete={handleJobComplete} onFailed={handleJobFailed} />}
      </div>

      {/* Recent Jobs */}
      <div className="space-y-2">
        <h2 className="text-white font-semibold text-sm tracking-wider uppercase">Recent Jobs (Last 10)</h2>
        {jobsLoading ? (
          <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="p-6 rounded-xl border border-white/10 bg-white/5 text-center text-gray-500 text-sm">No jobs yet.</div>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => (
              <div key={job.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 text-sm">
                <span className="text-gray-400 font-mono text-xs truncate max-w-[120px]">{job.niche}</span>
                <span className="text-gray-300 flex-1 truncate">{job.keyword}</span>
                <span className="text-xs px-2 py-0.5 rounded-md border border-white/10 bg-white/5 text-gray-400 whitespace-nowrap">{stageLabel(job.stage)}</span>
                {job.quality_score !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${qualityBadgeColor(job.quality_score)}`}>{job.quality_score}</span>
                )}
                <span className="text-gray-600 text-xs whitespace-nowrap">{formatDate(job.started_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Drafts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-white font-semibold text-sm tracking-wider uppercase">Pending Drafts ({totalDrafts})</h2>
          <div className="flex items-center gap-2">
            {drafts.length > 0 && (
              <button onClick={publishAll} disabled={publishingAll}
                className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition disabled:opacity-40">
                {publishingAll ? 'Publishing…' : `✅ Publish All (${drafts.length})`}
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => { setDraftFilter('all'); loadDrafts() }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${draftFilter === 'all' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'}`}>
              All sites
            </button>
            {sites.map(s => (
              <button key={s.niche_id} onClick={() => { setDraftFilter(s.niche_id); loadDrafts(s.niche_id) }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${draftFilter === s.niche_id ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'}`}>
                {s.name}
              </button>
            ))}
        </div>
        {draftsLoading ? (
          <div className="space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : drafts.length === 0 ? (
          <div className="p-6 rounded-xl border border-white/10 bg-white/5 text-center text-gray-500 text-sm">
            No pending drafts{draftFilter !== 'all' && (<span> for <strong className="text-white">{draftFilter}</strong></span>)}.
          </div>
        ) : (
          <div className="space-y-2">
            {drafts.map(draft => (
              <DraftCard key={draft.id} draft={draft} onRefresh={() => loadDrafts(draftFilter === 'all' ? undefined : draftFilter)} onPublish={publishDraft} publishing={publishingId === String(draft.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
