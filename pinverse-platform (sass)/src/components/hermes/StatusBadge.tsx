'use client'

import React, { useState } from 'react'

export type StatusType = 'online' | 'offline' | 'loading'

interface TooltipData {
  last_checked?: string
  response_ms?: number
  error?: string
}

interface StatusBadgeProps {
  status: StatusType
  label?: string
  tooltip?: TooltipData
  size?: 'sm' | 'md'
}

const CONFIG: Record<StatusType, {
  dot: string
  text: string
  defaultLabel: string
  pulse: boolean
  glow: string
}> = {
  online:  { dot: 'bg-green-500',  text: 'text-green-400',  defaultLabel: 'Online',    pulse: false, glow: 'shadow-[0_0_6px_2px_rgba(74,222,128,0.4)]' },
  offline: { dot: 'bg-red-500',    text: 'text-red-400',    defaultLabel: 'Offline',   pulse: false, glow: '' },
  loading: { dot: 'bg-gray-400',   text: 'text-gray-400',   defaultLabel: 'Checking…', pulse: true,  glow: '' },
}

export default function StatusBadge({ status, label, tooltip, size = 'md' }: StatusBadgeProps) {
  const [show, setShow] = useState(false)
  const cfg = CONFIG[status]
  const dotSize  = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div
      className="relative inline-flex items-center gap-1.5 select-none"
      onMouseEnter={() => tooltip && setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {/* Dot */}
      <span className={[
        'rounded-full flex-shrink-0',
        dotSize, cfg.dot, cfg.glow,
        cfg.pulse ? 'animate-pulse' : '',
      ].filter(Boolean).join(' ')} />

      {/* Label */}
      <span className={`${textSize} font-medium ${cfg.text}`}>
        {label ?? cfg.defaultLabel}
      </span>

      {/* Tooltip — Improvement #2 */}
      {tooltip && show && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-60 rounded-xl border border-white/10 bg-[#0d1117] p-3 shadow-2xl text-xs text-gray-300 space-y-1.5 pointer-events-none">
          {tooltip.last_checked && (
            <div className="flex justify-between gap-2">
              <span className="text-gray-500 flex-shrink-0">Last checked</span>
              <span className="text-right">{tooltip.last_checked}</span>
            </div>
          )}
          {tooltip.response_ms !== undefined && (
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Response time</span>
              <span>{tooltip.response_ms}ms</span>
            </div>
          )}
          {tooltip.error ? (
            <div className="pt-1.5 border-t border-white/10">
              <p className="text-red-400 break-all leading-relaxed">{tooltip.error}</p>
            </div>
          ) : status === 'online' ? (
            <div className="pt-1.5 border-t border-white/10 text-green-400">
              All systems operational
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
