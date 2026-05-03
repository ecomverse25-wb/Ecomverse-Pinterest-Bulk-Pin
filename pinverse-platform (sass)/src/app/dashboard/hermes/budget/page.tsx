'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  hermesGet, hermesPost, hermesCache,
  formatCurrency, formatNumber,
} from '@/components/hermes/utils'

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/10 ${className ?? ''}`} />
}

function pctBarColor(pct: number): string {
  if (pct >= 80) return 'bg-red-500'
  if (pct >= 50) return 'bg-yellow-500'
  return 'bg-emerald-500'
}
function pctTextColor(pct: number): string {
  if (pct >= 80) return 'text-red-400'
  if (pct >= 50) return 'text-yellow-400'
  return 'text-emerald-400'
}

export default function BudgetPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [budget, setBudget] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(250)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = useCallback((type: 'success' | 'error', msg: any) => {
    let safeMsg = 'Unknown error'
    if (typeof msg === 'string') safeMsg = msg
    else if (msg && typeof msg === 'object') safeMsg = msg.message || msg.msg || msg.error || JSON.stringify(msg)
    setToast({ type, msg: String(safeMsg) }); setTimeout(() => setToast(null), 5000)
  }, [])

  const loadBudget = useCallback(async () => {
    setLoading(true)
    try {
      // Show cached immediately
      const cachedBudget = hermesCache.get<any>('budget_data')
      const cachedStats = hermesCache.get<any>('budget_stats')
      if (cachedBudget) { setBudget(cachedBudget); setEditValue(cachedBudget.month_limit || cachedBudget.monthly_limit || 250) }
      if (cachedStats) setStats(cachedStats)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [budgetRes, statsRes] = await Promise.allSettled<any>([
        hermesGet('/budget'),
        hermesGet('/stats'),
      ])
      if (budgetRes.status === 'fulfilled' && !budgetRes.value?.error) {
        setBudget(budgetRes.value)
        setEditValue(budgetRes.value.month_limit || budgetRes.value.monthly_limit || 250)
        hermesCache.set('budget_data', budgetRes.value)
      }
      if (statsRes.status === 'fulfilled' && !statsRes.value?.error) {
        setStats(statsRes.value)
        hermesCache.set('budget_stats', statsRes.value)
      }
    } catch (err) { console.error('[Budget] loadBudget:', err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadBudget() }, [loadBudget])

  const handleSaveBudget = async () => {
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await hermesPost<any>('/budget', { monthly_limit: editValue })
    if (res.success) {
      showToast('success', `Budget updated to ${formatCurrency(editValue)}/month`)
      setEditing(false); loadBudget()
    } else {
      showToast('error', res.detail || res.error || res.message || 'Failed to update budget')
    }
    setSaving(false)
  }

  const monthlyLimit = budget?.month_limit ?? budget?.monthly_limit ?? 250
  const dailyLimit = budget?.today_limit ?? budget?.daily_limit ?? (monthlyLimit > 0 ? monthlyLimit / 30 : 8.33)
  const dailySpent = budget?.today_usd ?? budget?.spent_today ?? 0
  const monthlySpent = budget?.month_usd ?? budget?.spent_this_month ?? 0
  const dailyPct = dailyLimit > 0 ? (dailySpent / dailyLimit) * 100 : 0
  const monthlyPct = monthlyLimit > 0 ? (budget?.monthly_percent ?? (monthlySpent / monthlyLimit) * 100) : 0

  const contentCalls = budget?.content_calls ?? stats?.budget?.content_calls ?? stats?.budget?.content_calls_today ?? 0
  const contentLimit = budget?.content_limit ?? stats?.budget?.content_limit ?? stats?.budget?.content_calls_limit ?? 250
  const imageCalls = budget?.image_calls ?? stats?.budget?.image_calls ?? stats?.budget?.images_today ?? 0
  const imageLimit = budget?.image_limit ?? stats?.budget?.image_limit ?? stats?.budget?.images_limit ?? 1000

  const projectedMonthly = dailySpent * 30
  const daysRemaining = dailySpent > 0 ? Math.floor((monthlyLimit - monthlySpent) / dailySpent) : null

  return (
    <div className="space-y-6">
      {toast && (
        <div className={['fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-sm shadow-2xl max-w-sm',
          toast.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-red-500/20 border-red-500/30 text-red-300',
        ].join(' ')}>{toast.msg}</div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">💰 Budget & Usage</h1>
        <p className="text-gray-500 text-sm mt-1">Financial control and API usage tracking</p>
      </div>

      {loading && !budget ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <div className="grid sm:grid-cols-3 gap-4">
            {[0,1,2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        </div>
      ) : (
        <>
          {/* Budget Settings */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Budget Settings</h2>
              {!editing && (
                <button onClick={() => setEditing(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition">
                  ✏️ Edit
                </button>
              )}
            </div>
            {editing ? (
              <div className="flex items-center gap-3">
                <label className="text-gray-400 text-sm">Monthly budget ($):</label>
                <input type="number" value={editValue} onChange={(e) => setEditValue(Number(e.target.value))} min={10} step={10}
                  className="w-32 rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50 transition" />
                <span className="text-gray-500 text-xs">Daily: {formatCurrency(editValue / 30)}</span>
                <button onClick={handleSaveBudget} disabled={saving}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-yellow-500 hover:bg-yellow-400 text-black transition disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 transition">Cancel</button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Monthly Limit</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(monthlyLimit)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wider">Daily Equivalent</p>
                  <p className="text-2xl font-bold text-gray-400">{formatCurrency(dailyLimit)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Current Period Usage */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-5">
            <h2 className="text-lg font-bold text-white">Current Period Usage</h2>
            {[
              { label: 'Monthly', spent: monthlySpent, limit: monthlyLimit, pct: monthlyPct },
              { label: 'Today', spent: dailySpent, limit: dailyLimit, pct: dailyPct },
            ].map(row => (
              <div key={row.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm font-medium">{row.label}</span>
                  <span className={`text-lg font-bold ${pctTextColor(row.pct)}`}>
                    {formatCurrency(row.spent)}
                    <span className="text-gray-500 text-sm font-normal"> / {formatCurrency(row.limit)}</span>
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-gray-800 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${pctBarColor(row.pct)}`}
                    style={{ width: `${Math.min(row.pct, 100)}%` }} />
                </div>
                <p className="text-gray-600 text-xs text-right">{row.pct.toFixed(1)}% used</p>
              </div>
            ))}
          </div>

          {/* API Quotas */}
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'gemini-3.1-pro-preview', sublabel: 'Content writing', used: contentCalls, limit: contentLimit },
              { label: 'gemini-3.1-flash-image', sublabel: 'Image generation', used: imageCalls, limit: imageLimit },
              { label: 'gemini-2.5-flash', sublabel: 'Research + SEO', used: 0, limit: 10000 },
            ].map(q => {
              const pct = q.limit > 0 ? (q.used / q.limit) * 100 : 0
              return (
                <div key={q.label} className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-3">
                  <p className="text-white text-sm font-semibold truncate">{q.label}</p>
                  <p className="text-gray-500 text-xs">{q.sublabel}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-bold ${pctTextColor(pct)}`}>{formatNumber(q.used)}</span>
                    <span className="text-gray-500 text-sm">/ {formatNumber(q.limit)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pctBarColor(pct)}`}
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Spending History */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Spending History (Last 30 Days)</h2>
            {budget?.history && budget.history.length > 0 ? (
              <>
                <div className="flex items-end gap-1 h-32">
                  {budget.history.map((day: any, i: number) => {
                    const maxAmount = Math.max(...budget.history.map((d: any) => d.amount), 1)
                    const h = (day.amount / maxAmount) * 100
                    const pct = dailyLimit > 0 ? (day.amount / dailyLimit) * 100 : 0
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1"
                        title={`${day.date}: ${formatCurrency(day.amount)} (${day.articles} articles)`}>
                        <div className={`w-full rounded-t transition-all ${pctBarColor(pct)} hover:opacity-80`}
                          style={{ height: `${Math.max(h, 2)}%`, minHeight: '2px' }} />
                      </div>
                    )
                  })}
                </div>
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
                      {budget.history.map((day: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-800/30">
                          <td className="py-1.5 text-gray-300">{day.date}</td>
                          <td className="py-1.5 text-center text-gray-400">{day.articles}</td>
                          <td className="py-1.5 text-right text-white font-medium">{formatCurrency(day.amount)}</td>
                          <td className="py-1.5 text-right text-gray-400">{dailyLimit > 0 ? ((day.amount / dailyLimit) * 100).toFixed(0) : 0}%</td>
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

          {/* Projections */}
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
            <h2 className="text-lg font-bold text-white mb-4">Projections</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-800/50 p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider">Projected Monthly Spend</p>
                <p className={`text-2xl font-bold mt-1 ${pctTextColor(monthlyLimit > 0 ? (projectedMonthly / monthlyLimit) * 100 : 0)}`}>
                  {formatCurrency(projectedMonthly)}
                </p>
                <p className="text-gray-500 text-xs mt-1">Based on today&apos;s spending rate</p>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider">Days Remaining in Budget</p>
                <p className="text-2xl font-bold text-white mt-1">{daysRemaining !== null ? `${daysRemaining} days` : '∞'}</p>
                <p className="text-gray-500 text-xs mt-1">Before monthly limit is reached</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
