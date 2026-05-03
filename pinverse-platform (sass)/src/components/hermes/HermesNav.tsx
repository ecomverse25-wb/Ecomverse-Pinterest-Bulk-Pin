'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import StatusBadge, { StatusType } from './StatusBadge'
import { hermesGet } from './utils'

const NAV_ITEMS = [
  { href: '/dashboard/hermes',          label: 'Overview',  icon: '🏠' },
  { href: '/dashboard/hermes/sites',    label: 'Sites',     icon: '🌐' },
  { href: '/dashboard/hermes/keywords', label: 'Keywords',  icon: '🔑' },
  { href: '/dashboard/hermes/products', label: 'Products',  icon: '📦' },
  { href: '/dashboard/hermes/content',  label: 'Content',   icon: '🚀' },
  { href: '/dashboard/hermes/budget',   label: 'Budget',    icon: '💰' },
  { href: '/dashboard/hermes/settings', label: 'Settings',  icon: '⚙️' },
]

export default function HermesNav() {
  const pathname = usePathname()
  // null = loading — never flash red on init (Bug #1 fix)
  const [online, setOnline]   = useState<boolean | null>(null)
  const [version, setVersion] = useState('v2.0.0')
  const [lastChecked, setLastChecked] = useState<string | undefined>()
  const [responseMs, setResponseMs]   = useState<number | undefined>()
  const [errorMsg, setErrorMsg]       = useState<string | undefined>()

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const t0 = Date.now()
      try {
        // Dual-field support: VPS may return { online } or { status: 'online' }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await hermesGet<any>('/health')
        if (cancelled) return
        const isOnline = res?.online === true || res?.status === 'online'
        setOnline(isOnline)
        setResponseMs(Date.now() - t0)
        setLastChecked(new Date().toLocaleTimeString())
        setErrorMsg(isOnline ? undefined : (res?.error ?? 'VPS unreachable'))
        if (res?.version) setVersion(res.version)
      } catch (err: any) {
        if (!cancelled) {
          setOnline(false)
          setResponseMs(Date.now() - t0)
          setLastChecked(new Date().toLocaleTimeString())
          setErrorMsg(err?.message ?? 'Connection failed')
        }
      }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const statusType: StatusType =
    online === null ? 'loading' : online ? 'online' : 'offline'

  return (
    <nav className="flex flex-col h-full bg-[#0a0f1a] border-r border-white/10">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 text-lg">⚡</span>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Hermes</p>
            <p className="text-gray-500 text-xs leading-tight">Control Center</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <ul className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard/hermes' && pathname.startsWith(item.href))
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                  active
                    ? 'bg-yellow-500/20 text-yellow-400 font-medium'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white',
                ].join(' ')}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 space-y-1.5">
        <StatusBadge
          status={statusType}
          size="sm"
          tooltip={{ last_checked: lastChecked, response_ms: responseMs, error: errorMsg }}
        />
        <p className="text-gray-600 text-xs font-mono">{version}</p>
        <Link
          href="/dashboard"
          className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
        >
          ← Back to PinVerse
        </Link>
      </div>
    </nav>
  )
}
