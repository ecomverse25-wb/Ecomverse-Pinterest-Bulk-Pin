'use client'

import React, { useEffect, useState } from 'react'
import { hermesGet, Job } from './utils'

interface JobMonitorProps {
  jobId: string
  onComplete?: (job: Job) => void
  onFailed?: (job: Job) => void
}

const STAGE_LABELS: Record<string, { icon: string; label: string }> = {
  queued:     { icon: '⏳', label: 'Queued' },
  research:   { icon: '🔍', label: 'Researching keyword…' },
  writing:    { icon: '✍️', label: 'Writing article…' },
  publishing: { icon: '📤', label: 'Publishing to WordPress…' },
  images:     { icon: '🖼', label: 'Generating hero image…' },
  pinterest:  { icon: '📌', label: 'Creating Pinterest pins…' },
  complete:   { icon: '✅', label: 'Complete!' },
  failed:     { icon: '❌', label: 'Failed' },
}

const STAGE_ORDER = ['queued', 'research', 'writing', 'publishing', 'images', 'pinterest', 'complete']

export default function JobMonitor({ jobId, onComplete, onFailed }: JobMonitorProps) {
  const [job, setJob] = useState<Job | null>(null)

  useEffect(() => {
    if (!jobId) return
    let cancelled = false

    const poll = async () => {
      try {
        // Dual-field: stage/status, id/job_id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = await hermesGet<any>(`/job/${jobId}`)
        if (cancelled) return
        const normalized: Job = {
          ...raw,
          id:    raw.id    ?? raw.job_id ?? jobId,
          stage: raw.stage ?? raw.status ?? 'queued',
        }
        setJob(normalized)
        if (normalized.stage === 'complete') { onComplete?.(normalized); return }
        if (normalized.stage === 'failed')   { onFailed?.(normalized);   return }
      } catch { /* keep polling */ }
    }

    poll()
    const interval = setInterval(poll, 5_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [jobId, onComplete, onFailed])

  if (!job) {
    return (
      <div className="mt-2 p-3 rounded-xl border border-white/10 bg-white/5 animate-pulse">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-3 h-3 rounded-full bg-gray-600 animate-ping" />
          <span>Starting job…</span>
        </div>
      </div>
    )
  }

  const currentStageIdx = STAGE_ORDER.indexOf(job.stage)
  const isComplete = job.stage === 'complete'
  const isFailed   = job.stage === 'failed'
  const stageInfo  = STAGE_LABELS[job.stage] ?? { icon: '⏳', label: job.stage }

  return (
    <div className={[
      'mt-2 p-3 rounded-xl border text-xs space-y-2',
      isComplete ? 'border-green-500/30 bg-green-500/5' :
      isFailed   ? 'border-red-500/30   bg-red-500/5'   :
                   'border-white/10     bg-white/5',
    ].join(' ')}>

      {/* Current stage */}
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{stageInfo.icon}</span>
        <span className={[
          'font-medium',
          isComplete ? 'text-green-400' :
          isFailed   ? 'text-red-400'   :
                       'text-white',
        ].join(' ')}>
          {stageInfo.label}
        </span>
        {!isComplete && !isFailed && (
          <span className="ml-auto flex gap-0.5">
            {[0,1,2].map(i => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        )}
      </div>

      {/* Stage progress bar */}
      {!isFailed && (
        <div className="flex gap-0.5">
          {STAGE_ORDER.filter(s => s !== 'queued').map((s, idx) => (
            <div
              key={s}
              className={[
                'h-1 flex-1 rounded-full transition-all duration-500',
                idx < currentStageIdx     ? 'bg-green-500' :
                idx === currentStageIdx   ? 'bg-yellow-400 animate-pulse' :
                                            'bg-white/10',
              ].join(' ')}
            />
          ))}
        </div>
      )}

      {/* Result info */}
      {isComplete && (
        <div className="pt-1 border-t border-white/10 space-y-1">
          {job.article_title && (
            <p className="text-gray-300 truncate">📄 {job.article_title}</p>
          )}
          <div className="flex gap-3 text-gray-400">
            {job.quality_score !== undefined && (
              <span>Score: <span className="text-green-400 font-medium">{job.quality_score}</span></span>
            )}
            {job.word_count !== undefined && (
              <span>Words: <span className="text-blue-400 font-medium">{job.word_count.toLocaleString()}</span></span>
            )}
          </div>
        </div>
      )}

      {/* Error info */}
      {isFailed && job.error && (
        <div className="pt-1 border-t border-red-500/20">
          <p className="text-red-400 leading-relaxed break-all">{job.error}</p>
        </div>
      )}

      {/* Keyword + niche */}
      <div className="flex gap-2 text-gray-500">
        <span className="truncate max-w-[140px]">{job.keyword}</span>
        <span>·</span>
        <span>{job.niche}</span>
      </div>
    </div>
  )
}
