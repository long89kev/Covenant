'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { Bot, LayoutGrid, ListChecks, LogIn, LogOut, Menu, ReceiptText, RefreshCw, ShieldCheck, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MODE_COPY, unavailableReason, utc } from '@/lib/ui/model'
import { StatusPill, TONE_ICON, TONE_PANEL, TONE_TEXT } from './primitives'
import { useCapability } from './session'

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Mission Control', icon: LayoutGrid },
  { href: '/negotiate', label: 'AI Negotiation', icon: Bot },
  { href: '/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/governance', label: 'Governance', icon: ShieldCheck },
  { href: '/audit', label: 'Audit Trail', icon: ListChecks },
]

export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('grid size-8 shrink-0 place-items-center rounded-[9px] border-2 border-cobalt bg-midnight', className)}>
      <span className="size-3 rotate-45 rounded-[2px] bg-teal" />
    </span>
  )
}

function NavList({ compact, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const path = usePathname()
  return (
    <ul className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = path === href || path.startsWith(`${href}/`)
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              aria-label={compact ? label : undefined}
              title={compact ? label : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-control border-l-2 border-transparent px-3 font-semibold text-[#c5d0e0] transition-colors hover:bg-midnight-hover hover:text-white focus-visible:outline-white',
                compact && 'justify-center px-0',
                active && 'border-cobalt bg-midnight-hover text-white',
              )}
            >
              <Icon aria-hidden className="size-[18px] shrink-0" />
              {!compact && <span>{label}</span>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function SidebarFoot() {
  return (
    <div className="mt-auto border-t border-white/10 pt-4 text-small text-[#9fb0c6]">
      <span className="inline-block rounded-md border border-warning/50 bg-warning/15 px-2 py-0.5 text-micro font-semibold tracking-wide text-[#f4c56f] uppercase">Synthetic data</span>
      <p className="mt-2">Mock payment rail · no funds move.</p>
      <p className="mt-2 font-semibold text-white">Autonomous actions.<br />Distributed authority.</p>
    </div>
  )
}

export function ModePill() {
  const { mode } = useCapability()
  const c = MODE_COPY[mode]
  return <StatusPill tone={c.tone} className="py-1" >{c.pill}</StatusPill>
}

function UserArea() {
  const { authenticated, isInitializing, login, logout, getValueFromIdToken, token } = useTideCloak()
  if (isInitializing) return <span className="text-small text-ink-muted">Connecting…</span>
  if (!authenticated) return <Button size="sm" onClick={() => login()}><LogIn /> Log in with Tide</Button>
  const name = token ? String(getValueFromIdToken('preferred_username') ?? '') : ''
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="grid size-9 place-items-center rounded-full bg-cobalt-soft font-bold text-cobalt-ink uppercase">{name.slice(0, 2) || '?'}</span>
      <span className="hidden min-w-0 flex-col leading-tight lg:flex">
        <span className="max-w-36 truncate font-semibold text-ink">{name}</span>
        <span className="text-small text-ink-muted">TideCloak session</span>
      </span>
      <Button variant="ghost" size="icon-sm" onClick={() => logout()} aria-label={`Log out ${name}`}><LogOut /></Button>
    </div>
  )
}

// Permanent: no close control in any mode. SIMULATED content can never appear without it.
export function CapabilityBanner() {
  const { mode, health, failed, checkedAt, refresh } = useCapability()
  const c = MODE_COPY[mode]
  const Icon = TONE_ICON[c.tone]
  const reason = mode === 'UNAVAILABLE' ? unavailableReason(health, failed) : ''
  return (
    <section aria-label="Authority mode banner" data-testid="capability-banner" data-mode={mode}
      className={cn('mb-6 flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-start sm:justify-between', TONE_PANEL[c.tone])}>
      <div className="flex min-w-0 gap-2.5" aria-live="polite">
        <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', TONE_TEXT[c.tone])} />
        <div className="min-w-0">
          <p className={cn('font-bold', TONE_TEXT[c.tone])}>{c.title}</p>
          {c.body && <p className="mt-0.5 text-ink-secondary">{c.body}</p>}
          {reason && <p className="mt-1 font-mono text-small font-semibold text-danger-ink">Reason: {reason}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-6.5 text-small text-ink-muted sm:pl-0">
        {checkedAt && <span>Probed {utc(checkedAt).slice(11)}</span>}
        <Button variant="ghost" size="xs" onClick={refresh} aria-label="Re-check authority capability"><RefreshCw /> Re-check</Button>
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
  const path = usePathname()
  useEffect(() => drawer.current?.close(), [path])

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only z-[100] rounded-control bg-cobalt px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">Skip to content</a>

      {/* tablet: 72px icon rail · desktop: 220px, 248px from 1440px */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col bg-midnight px-3 py-5 md:flex lg:w-[220px] lg:px-4 min-[1440px]:w-[248px]">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-1.5 text-[17px] font-bold tracking-[0.06em] text-white">
          <LogoMark /> <span className="hidden lg:inline">COVENANT</span>
        </Link>
        <p className="mb-2 hidden px-3 text-micro font-semibold tracking-[0.14em] text-[#7f91aa] uppercase lg:block">Workspace</p>
        <nav aria-label="Primary" className="lg:hidden"><NavList compact /></nav>
        <nav aria-label="Primary" className="hidden lg:block"><NavList /></nav>
        <div className="hidden lg:contents"><SidebarFoot /></div>
      </aside>

      <dialog ref={drawer} aria-label="Navigation" className="m-0 h-full max-h-none w-[280px] max-w-[85vw] bg-midnight p-4 text-white backdrop:bg-midnight/50 open:flex open:flex-col">
        <div className="mb-6 flex items-center justify-between">
          <span className="flex items-center gap-2.5 text-[17px] font-bold tracking-[0.06em]"><LogoMark /> COVENANT</span>
          <button type="button" onClick={() => drawer.current?.close()} aria-label="Close navigation" className="grid size-11 place-items-center rounded-control text-white hover:bg-midnight-hover"><X className="size-5" /></button>
        </div>
        <nav aria-label="Primary"><NavList onNavigate={() => drawer.current?.close()} /></nav>
        <SidebarFoot />
      </dialog>

      <div className="md:pl-[72px] lg:pl-[220px] min-[1440px]:pl-[248px]">
        <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:min-h-[72px] md:px-8">
          <button type="button" onClick={() => drawer.current?.showModal()} aria-label="Open navigation" className="-ml-2 grid size-11 place-items-center rounded-control text-ink hover:bg-subtle md:hidden"><Menu className="size-5" /></button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex items-center gap-2 truncate">
              <li className="hidden text-ink-muted sm:block">Workspace</li>
              {crumbs.map((c, i) => (
                <li key={i} className="flex min-w-0 items-center gap-2">
                  <span aria-hidden className={cn('text-border-strong', i === 0 && 'hidden sm:inline')}>/</span>
                  {c.href && i < crumbs.length - 1
                    ? <Link href={c.href} className="truncate text-ink-secondary hover:text-ink">{c.label}</Link>
                    : <span aria-current={i === crumbs.length - 1 ? 'page' : undefined} className="truncate font-semibold text-ink">{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
          <ModePill />
          <UserArea />
        </header>

        <main id="main" tabIndex={-1} className="mx-auto max-w-[1512px] px-4 py-5 outline-none md:px-8 md:py-8">
          <CapabilityBanner />
          {children}
          <footer className="mt-10 text-right text-micro font-semibold tracking-[0.08em] text-ink-muted uppercase">
            COVENANT · Synthetic fixtures · Mock payment rail · No funds moved
          </footer>
        </main>
      </div>
    </div>
  )
}
