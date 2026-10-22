'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { MODE_COPY, unavailableReason, utc } from '@/lib/ui/model'
import tc from '../../tidecloak.json'
import { useCapability } from './session'

// Numbered workspace navigation. Routes are the app's real ones; deep links are unchanged.
const NAV: { href: string; n: string; label: string }[] = [
  { href: '/dashboard', n: '01', label: 'Overview' },
  { href: '/negotiate', n: '02', label: 'Agent activity' },
  { href: '/transactions', n: '03', label: 'Transaction inspector' },
  { href: '/governance', n: '04', label: 'Governance' },
  { href: '/audit', n: '05', label: 'Evidence log' },
]

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg className={className ?? 'brandmark'} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <circle cx="13" cy="17" r="9" stroke="currentColor" strokeWidth="5" />
      <circle cx="23" cy="17" r="9" stroke="#8FAE3A" strokeWidth="5" />
      <path d="M17.5 9.3c2.3 1.8 3.9 4.5 3.9 7.7s-1.6 5.9-3.9 7.7" stroke="#F1F2EB" strokeWidth="2.2" />
    </svg>
  )
}

// Short pill copy; the full sentence stays in MODE_COPY and the mode strip.
const PILL: Record<string, string> = { SIMULATED: 'Simulation only' }
const modeTone = (t: string) => (t === 'danger' ? 'danger' : t === 'verified' ? 'verified' : 'neutral')

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname()
  return (
    <nav className="side-links" aria-label="Primary">
      {NAV.map(({ href, n, label }) => {
        const active = path === href || path.startsWith(`${href}/`)
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined}>
            <span className="nav-index" aria-hidden>{n}</span>
            <span>{label}</span>
            <span className="nav-arrow" aria-hidden>↗</span>
          </Link>
        )
      })}
    </nav>
  )
}

function Identity() {
  const { authenticated, isInitializing, login, logout, getValueFromIdToken, token } = useTideCloak()
  if (isInitializing) return <p className="mono side-info">Connecting to TideCloak…</p>
  if (!authenticated) {
    return <button type="button" className="btn-ink w-full" onClick={() => login()}>Log in with Tide <span aria-hidden>↗</span></button>
  }
  const name = token ? String(getValueFromIdToken('preferred_username') ?? '') : ''
  return (
    <div className="side-identity">
      <span className="avatar" aria-hidden>{name.slice(0, 2) || '?'}</span>
      <span className="min-w-0 flex-1">
        <strong>{name}</strong>
        <small>TideCloak session · {tc.realm}</small>
      </span>
      <button type="button" className="copy-btn" onClick={() => logout()} aria-label={`Log out ${name}`}>Log out</button>
    </div>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { mode, health } = useCapability()
  const c = MODE_COPY[mode]
  return (
    <div className="sidebar">
      <Link className="brand" href="/dashboard" onClick={onNavigate} aria-label="COVENANT overview">
        <LogoMark /> <span>COVENANT</span>
      </Link>
      <div className="sidebar-intro mono">Authority workspace<br />/ {health?.authorityMode === 'live' ? 'Live authority mode' : 'Fallback authority'}</div>
      <NavList onNavigate={onNavigate} />
      <div className="side-bottom">
        <div className="side-rule" />
        <div className="mono side-info">Mode / {mode === 'SIMULATED' ? 'No live signing' : mode === 'LOADING' ? 'Probing' : 'Executor fails closed'}</div>
        <div className="sim-marker"><span className="sim-dot" data-tone={modeTone(c.tone)} />{c.pill}</div>
        <Identity />
      </div>
    </div>
  )
}

export function ModePill() {
  const { mode } = useCapability()
  const c = MODE_COPY[mode]
  return <span className="top-mode" data-testid="mode-pill"><span className="small-circle" data-tone={modeTone(c.tone)} />{PILL[mode] ?? c.pill}</span>
}

// Permanent: no close control in any mode. SIMULATED content can never appear without it.
export function CapabilityBanner() {
  const { mode, health, failed, checkedAt, refresh } = useCapability()
  const c = MODE_COPY[mode]
  const reason = mode === 'UNAVAILABLE' ? unavailableReason(health, failed) : ''
  return (
    <section aria-label="Authority mode banner" data-testid="capability-banner" data-mode={mode} data-tone={c.tone} className="mode-strip">
      <div aria-live="polite" className="flex min-w-0 gap-4">
        <span className="mono mode-label">{c.pill}</span>
        <span className="min-w-0">
          <strong>{c.title}</strong>
          {c.body && <> {c.body}</>}
          {reason && <span className="reason">Reason: {reason}</span>}
        </span>
      </div>
      <div className="mode-side">
        {checkedAt && <span className="mono">Probed {utc(checkedAt).slice(11)}</span>}
        <button type="button" className="text-button" onClick={refresh} aria-label="Re-check authority capability">Re-check</button>
      </div>
    </section>
  )
}

export interface Crumb {
  label: string
  href?: string
}

export function AppShell({ crumbs, children }: { crumbs: Crumb[]; children: ReactNode }) {
  const drawer = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const path = usePathname()
  const { authenticated, isInitializing, login } = useTideCloak()
  useEffect(() => drawer.current?.close(), [path])

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="shell">
        <aside aria-label="Workspace navigation" className="sidebar-slot"><Sidebar /></aside>

        {/* ≤840px: the sidebar becomes a modal drawer (Escape and route change close it) */}
        <dialog ref={drawer} id="nav-drawer" aria-label="Navigation" className="drawer" onClose={() => setOpen(false)}>
          <button type="button" className="text-button self-end px-5 pt-5" onClick={() => drawer.current?.close()} aria-label="Close navigation">Close ✕</button>
          <Sidebar onNavigate={() => drawer.current?.close()} />
        </dialog>

        <div className="main">
          <header className="topbar">
            <div className="top-left">
              <button type="button" className="menu-toggle" aria-label="Open navigation" aria-expanded={open} aria-controls="nav-drawer"
                onClick={() => { drawer.current?.showModal(); setOpen(true) }}>
                <span aria-hidden>☰</span>
              </button>
              <nav aria-label="Breadcrumb" className="crumbs mono">
                <span>COVENANT</span>
                {crumbs.map((c, i) => (
                  <Fragment key={i}>
                    <span aria-hidden>/</span>
                    {c.href && i < crumbs.length - 1
                      ? <Link href={c.href}>{c.label}</Link>
                      : <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>}
                  </Fragment>
                ))}
              </nav>
            </div>
            <div className="top-right">
              <ModePill />
              {!isInitializing && !authenticated
                ? <button type="button" className="text-button" onClick={() => login()}>Log in</button>
                : <span className="top-env mono">Realm / {tc.realm}</span>}
            </div>
          </header>
          <CapabilityBanner />
          <main id="main" tabIndex={-1} className="page outline-none">{children}</main>
          <footer className="app-footer">
            <span className="mono">COVENANT / Synthetic fixtures</span>
            <span>Mock payment rail. No funds move. Nothing here is a live Tide authorization unless a row says LIVE VERIFIED.</span>
          </footer>
        </div>
      </div>
    </>
  )
}
