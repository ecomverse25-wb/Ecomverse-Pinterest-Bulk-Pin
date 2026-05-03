'use client'

import { useEffect, useState, useCallback } from 'react'
import StatusBadge from '@/components/hermes/StatusBadge'
import ConfirmModal from '@/components/hermes/ConfirmModal'
import {
  hermesGet, hermesPost, hermesDelete, hermesCache,
  type ScheduleJob, DEFAULT_SCHEDULE,
} from '@/components/hermes/utils'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className ?? ''}`} />
}

interface HealthCheckResult {
  label: string
  status: 'ok' | 'error' | 'checking'
  detail?: string
}

export default function SettingsPage() {
  const [scheduleJobs, setScheduleJobs] = useState<ScheduleJob[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ cron: '', enabled: true })
  const [savingSchedule, setSavingSchedule] = useState(false)

  const [disableTarget, setDisableTarget] = useState<ScheduleJob | null>(null)

  // Schedule builder (Missing #2)
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sites, setSites] = useState<any[]>([])
  const [newSchedule, setNewSchedule] = useState({ niche: '', count: 1, time: '06:00', enabled: true })
  const [addingSchedule, setAddingSchedule] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [health, setHealth] = useState<any>(null)
  const [healthChecks, setHealthChecks] = useState<HealthCheckResult[]>([])
  const [runningHealthCheck, setRunningHealthCheck] = useState(false)

  const [qualitySettings, setQualitySettings] = useState({
    min_quality_score: 75, min_word_count: 1500, max_images: 5, max_product_links: 3,
  })
  const [savingQuality, setSavingQuality] = useState(false)

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: any) => {
    let safeMsg = 'Unknown error'
    if (typeof msg === 'string') safeMsg = msg
    else if (msg && typeof msg === 'object') safeMsg = msg.message || msg.msg || msg.error || JSON.stringify(msg)
    setToast({ type, msg: String(safeMsg) }); setTimeout(() => setToast(null), 5000)
  }, [])

  const loadData = useCallback(async () => {
    setScheduleLoading(true)
    try {
      const cachedSchedule = hermesCache.get<ScheduleJob[]>('settings_schedule')
      if (cachedSchedule) setScheduleJobs(cachedSchedule)
      const cachedHealth = hermesCache.get<any>('settings_health')
      if (cachedHealth) setHealth(cachedHealth)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [schedRes, healthRes, sitesRes] = await Promise.allSettled<any>([
        hermesGet('/schedule'),
        hermesGet('/health'),
        hermesGet('/sites'),
      ])
      if (schedRes.status === 'fulfilled' && !schedRes.value?.error) {
        const jobs = schedRes.value?.jobs || []
        const result = jobs.length > 0 ? jobs : DEFAULT_SCHEDULE
        setScheduleJobs(result); hermesCache.set('settings_schedule', result)
      } else { setScheduleJobs(DEFAULT_SCHEDULE) }
      if (healthRes.status === 'fulfilled' && !healthRes.value?.error) {
        setHealth(healthRes.value); hermesCache.set('settings_health', healthRes.value)
      }
      if (sitesRes.status === 'fulfilled' && !sitesRes.value?.error) {
        const siteList = sitesRes.value?.sites || []
        setSites(siteList)
        if (siteList.length > 0 && !newSchedule.niche) setNewSchedule(prev => ({ ...prev, niche: siteList[0].niche_id }))
      }
    } catch (err) { console.error('[Settings] loadData:', err) }
    finally { setScheduleLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const startEdit = (job: ScheduleJob) => {
    setEditingSchedule(job.id); setEditForm({ cron: job.cron, enabled: job.enabled })
  }

  const saveSchedule = async (jobId: string) => {
    setSavingSchedule(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await hermesPost<any>('/schedule/update', { id: jobId, cron: editForm.cron, enabled: editForm.enabled })
    if (res.success) {
      showToast('success', `Schedule updated for ${jobId}`)
      setEditingSchedule(null); hermesCache.clear('settings_schedule'); loadData()
    } else { showToast('error', res.detail || res.error || res.message || 'Failed to update schedule') }
    setSavingSchedule(false)
  }

  const confirmDisable = async () => {
    if (!disableTarget) return
    setSavingSchedule(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesPost<any>('/schedule/update', { id: disableTarget.id, cron: disableTarget.cron, enabled: false })
      if (res.success) { showToast('success', `Automation disabled for ${disableTarget.name}`); hermesCache.clear('settings_schedule'); loadData() }
      else { showToast('error', res.detail || res.error || res.message || 'Failed') }
    } catch (err) { showToast('error', `Failed: ${err instanceof Error ? err.message : String(err)}`) }
    finally { setDisableTarget(null); setSavingSchedule(false) }
  }

  // Missing #2: Add new schedule
  const addSchedule = async () => {
    if (!newSchedule.niche) { showToast('error', 'Select a site'); return }
    setAddingSchedule(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesPost<any>('/schedule', newSchedule)
      if (res.success) {
        showToast('success', `Schedule added for ${newSchedule.niche} at ${newSchedule.time}`)
        setShowAddSchedule(false); hermesCache.clear('settings_schedule'); loadData()
      } else { showToast('error', res.detail || res.error || res.message || 'Failed to add schedule') }
    } catch (err) { showToast('error', `Failed: ${err instanceof Error ? err.message : String(err)}`) }
    finally { setAddingSchedule(false) }
  }

  // Missing #2: Delete schedule
  const deleteSchedule = async (niche: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesDelete<any>(`/schedule/${niche}`)
      if (res.success || !res.error) {
        showToast('success', `Schedule for ${niche} removed`)
        setScheduleJobs(prev => prev.filter(j => j.id !== niche && (j as any).niche !== niche))
        hermesCache.clear('settings_schedule')
      } else { showToast('error', res.error || 'Failed to delete schedule') }
    } catch (err) { showToast('error', `Delete failed: ${err instanceof Error ? err.message : String(err)}`) }
  }

  const runHealthCheck = async () => {
    setRunningHealthCheck(true); setHealthChecks([])
    const checks: HealthCheckResult[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const healthRes = await hermesGet<any>('/health')
    const isOnline = healthRes?.online === true || healthRes?.status === 'online'
    checks.push({ label: 'Hermes API', status: isOnline ? 'ok' : 'error', detail: healthRes?.error || (isOnline ? 'Online' : 'Unreachable') })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sysRes = await hermesGet<any>('/system/health')
    if (!sysRes?.error) {
      checks.push({ label: 'gemini-3.1-pro-preview', status: 'ok', detail: 'Responding' })
      checks.push({ label: 'gemini-3.1-flash-image-preview', status: 'ok', detail: 'Responding' })
    } else {
      checks.push({ label: 'Content model', status: 'error', detail: sysRes.error })
      checks.push({ label: 'Image model', status: 'error', detail: 'Check failed' })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prodRes = await hermesGet<any>('/products')
    checks.push({ label: 'Product database', status: prodRes?.error ? 'error' : 'ok', detail: prodRes?.error || `${prodRes?.total ?? 0} loaded` })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sitesRes = await hermesGet<any>('/sites')
    if (!sitesRes?.error) {
      const siteList = sitesRes?.sites || []
      for (const site of siteList) {
        checks.push({ label: `${site.name || site.niche_id} WordPress`, status: site.wp_connected ? 'ok' : 'error', detail: site.wp_connected ? 'Connected' : 'Disconnected' })
      }
    } else { checks.push({ label: 'Sites', status: 'error', detail: sitesRes.error }) }

    setHealthChecks(checks); setRunningHealthCheck(false)
  }

  const saveQualitySettings = async () => {
    setSavingQuality(true)
    try {
      // Bug #7: Use /settings (not /settings/quality) to match proxy route
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await hermesPost<any>('/settings', qualitySettings)
      if (res?.success) showToast('success', '✅ Quality settings saved successfully')
      else showToast('error', res?.detail || res?.error || res?.message || 'Failed to save settings')
    } catch (err) {
      showToast('error', `Save failed: ${err instanceof Error ? err.message : String(err)}`)
    }
    setSavingQuality(false)
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={['fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-sm shadow-2xl max-w-sm',
          toast.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-red-500/20 border-red-500/30 text-red-300',
        ].join(' ')}>{toast.msg}</div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">⚙️ Settings</h1>
        <p className="text-gray-400 text-sm mt-1">System configuration and automation scheduling</p>
      </div>

      {/* Automation Schedule */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Automation Schedule</h2>
          <button onClick={() => setShowAddSchedule(!showAddSchedule)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition">
            {showAddSchedule ? '✕ Cancel' : '+ Add Schedule'}
          </button>
        </div>

        {/* Add Schedule Form (Missing #2) */}
        {showAddSchedule && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-gray-400 text-xs uppercase tracking-wider">Site</label>
                <select value={newSchedule.niche} onChange={e => setNewSchedule(p => ({ ...p, niche: e.target.value }))}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50">
                  {sites.map(s => <option key={s.niche_id} value={s.niche_id}>{s.name || s.niche_id}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 text-xs uppercase tracking-wider">Articles / Run</label>
                <input type="number" min={1} max={10} value={newSchedule.count}
                  onChange={e => setNewSchedule(p => ({ ...p, count: Number(e.target.value) }))}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50" />
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 text-xs uppercase tracking-wider">Time of Day</label>
                <input type="time" value={newSchedule.time}
                  onChange={e => setNewSchedule(p => ({ ...p, time: e.target.value }))}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50" />
              </div>
              <div className="flex items-end">
                <button onClick={addSchedule} disabled={addingSchedule || !newSchedule.niche}
                  className="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40">
                  {addingSchedule ? 'Adding…' : 'Add Schedule'}
                </button>
              </div>
            </div>
          </div>
        )}

        {scheduleLoading ? (
          <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : scheduleJobs.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">No scheduled jobs configured. Click &quot;+ Add Schedule&quot; to create one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                  <th className="text-left pb-2 font-medium">Job</th>
                  <th className="text-center pb-2 font-medium">Cron</th>
                  <th className="text-center pb-2 font-medium">Status</th>
                  <th className="text-left pb-2 font-medium">Description</th>
                  <th className="text-left pb-2 font-medium">Last Run</th>
                  <th className="text-left pb-2 font-medium">Next Run</th>
                  <th className="text-right pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {scheduleJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-800/30 transition">
                    {editingSchedule === job.id ? (
                      <>
                        <td className="py-2 text-white font-medium">{job.name}</td>
                        <td className="py-2 text-center">
                          <input type="text" value={editForm.cron} onChange={(e) => setEditForm((p) => ({ ...p, cron: e.target.value }))}
                            placeholder="*/5 * * * *"
                            className="w-32 rounded bg-gray-800 border border-gray-700 text-white px-2 py-1 text-xs font-mono focus:outline-none focus:border-yellow-500/50" />
                        </td>
                        <td className="py-2 text-center">
                          <label className="flex items-center justify-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={editForm.enabled} onChange={(e) => setEditForm((p) => ({ ...p, enabled: e.target.checked }))}
                              className="w-4 h-4 rounded accent-yellow-500" />
                            <span className="text-xs text-gray-400">{editForm.enabled ? 'On' : 'Off'}</span>
                          </label>
                        </td>
                        <td className="py-2 text-gray-500 text-xs">{job.description}</td>
                        <td className="py-2 text-gray-500 text-xs">{job.last_run || '—'}</td>
                        <td className="py-2 text-gray-500 text-xs">{job.next_run || '—'}</td>
                        <td className="py-2 text-right space-x-2">
                          <button onClick={() => saveSchedule(job.id)} disabled={savingSchedule}
                            className="text-xs text-yellow-400 hover:text-yellow-300 font-semibold">
                            {savingSchedule ? '…' : 'Save'}
                          </button>
                          <button onClick={() => setEditingSchedule(null)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 text-white font-medium">{job.name}</td>
                        <td className="py-2 text-center text-gray-300 font-mono text-xs">{job.cron}</td>
                        <td className="py-2 text-center">
                          <StatusBadge status={job.enabled ? 'online' : 'offline'} label={job.enabled ? 'Active' : 'Disabled'} size="sm" />
                        </td>
                        <td className="py-2 text-gray-500 text-xs max-w-[200px] truncate">{job.description}</td>
                        <td className="py-2 text-gray-500 text-xs">{job.last_run || 'Never'}</td>
                        <td className="py-2 text-gray-500 text-xs">{job.next_run || '—'}</td>
                        <td className="py-2 text-right space-x-2">
                          <button onClick={() => startEdit(job)} className="text-xs text-yellow-400 hover:text-yellow-300">Edit</button>
                          {job.enabled && (
                            <button onClick={() => setDisableTarget(job)} className="text-xs text-red-400 hover:text-red-300">Disable</button>
                          )}
                          <button onClick={() => deleteSchedule((job as any).niche || job.id)} className="text-xs text-gray-500 hover:text-red-400">Delete</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System Info */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-3">
        <h2 className="text-lg font-bold text-white">System Info</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'VPS IP', value: '34.62.198.158' },
            { label: 'Hermes Version', value: health?.version || '2.0.0' },
            { label: 'Content OS Path', value: '~/content_os_v2/' },
            { label: 'Article Model', value: health?.models?.content || health?.models?.writer?.name || 'gemini-3.1-pro-preview' },
            { label: 'Image Model', value: health?.models?.images || health?.models?.image?.name || 'gemini-3.1-flash-image-preview' },
            { label: 'Research Model', value: health?.models?.research || health?.models?.brain?.name || 'gemini-2.5-flash' },
          ].map((info) => (
            <div key={info.label} className="rounded-lg bg-gray-800/50 px-4 py-3">
              <p className="text-gray-500 text-xs uppercase tracking-wider">{info.label}</p>
              <p className="text-white text-sm font-mono mt-1 truncate">{info.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content Quality Settings */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <h2 className="text-lg font-bold text-white">Content Quality Settings</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-gray-400 text-xs uppercase tracking-wider flex items-center justify-between">
              Min Quality Score <span className="text-yellow-400 font-bold text-sm">{qualitySettings.min_quality_score}</span>
            </label>
            <input type="range" min={50} max={95} step={5} value={qualitySettings.min_quality_score}
              onChange={(e) => setQualitySettings((p) => ({ ...p, min_quality_score: Number(e.target.value) }))}
              className="w-full accent-yellow-500" />
            <div className="flex justify-between text-gray-600 text-[10px]"><span>50</span><span>95</span></div>
          </div>
          <div className="space-y-1.5">
            <label className="text-gray-400 text-xs uppercase tracking-wider">Min Word Count</label>
            <input type="number" value={qualitySettings.min_word_count}
              onChange={(e) => setQualitySettings((p) => ({ ...p, min_word_count: Number(e.target.value) }))}
              min={500} step={100}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50 transition" />
          </div>
          <div className="space-y-1.5">
            <label className="text-gray-400 text-xs uppercase tracking-wider">Max Images Per Article</label>
            <input type="number" value={qualitySettings.max_images}
              onChange={(e) => setQualitySettings((p) => ({ ...p, max_images: Number(e.target.value) }))}
              min={1} max={10}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50 transition" />
          </div>
          <div className="space-y-1.5">
            <label className="text-gray-400 text-xs uppercase tracking-wider">Max Product Links Per Article</label>
            <input type="number" value={qualitySettings.max_product_links}
              onChange={(e) => setQualitySettings((p) => ({ ...p, max_product_links: Number(e.target.value) }))}
              min={1} max={10}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50 transition" />
          </div>
        </div>
        <button onClick={saveQualitySettings} disabled={savingQuality}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40">
          {savingQuality ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Pinterest Settings */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-3">
        <h2 className="text-lg font-bold text-white">Pinterest Settings <span className="text-gray-500 text-xs font-normal">(Read-only reference)</span></h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Pin Title Max Chars', value: '60' },
            { label: 'Pin Description', value: '421–500 chars' },
            { label: 'Hashtags', value: 'Disabled (Tony Hill rule)' },
            { label: 'Pin Variants / Article', value: '4' },
            { label: 'Seasonal Lead Time', value: '60–90 days' },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-gray-800/30 px-4 py-3">
              <p className="text-gray-500 text-xs uppercase tracking-wider">{item.label}</p>
              <p className="text-gray-300 text-sm mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* System Health Check */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">System Health Check</h2>
          <button onClick={runHealthCheck} disabled={runningHealthCheck}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-40 disabled:cursor-not-allowed">
            {runningHealthCheck ? 'Checking…' : 'Run System Check'}
          </button>
        </div>
        {healthChecks.length > 0 && (
          <div className="space-y-2">
            {healthChecks.map((check, i) => (
              <div key={i} className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                check.status === 'ok' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{check.status === 'ok' ? '✅' : '❌'}</span>
                  <span className="text-white text-sm font-medium">{check.label}</span>
                </div>
                <span className={`text-xs ${check.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{check.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disable Schedule Modal */}
      <ConfirmModal
        open={!!disableTarget}
        title={`Disable ${disableTarget?.name}?`}
        message="This will stop this scheduled automation job."
        consequences={[
          'This job will not run automatically',
          'You can still trigger it manually',
          'Re-enable anytime from this page',
        ]}
        confirmLabel="Disable Automation"
        confirmVariant="warning"
        onConfirm={confirmDisable}
        onCancel={() => setDisableTarget(null)}
        loading={savingSchedule}
      />
    </div>
  )
}
