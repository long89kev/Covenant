'use client'

import { useState, type ComponentType, type ReactNode } from 'react'
import { Check, CircleDashed, Clock, Copy, Info, Loader2, OctagonX, ShieldCheck, type LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/ui/model'

// Tone → classes. Teal ('verified') is only ever produced by lib/ui/model.ts from a live executor receipt.
export const TONE_PILL: Record<Tone, string> = {
  info: 'border-cobalt/20 bg-cobalt-soft text-cobalt-ink',
  pending: 'border-warning/35 bg-warning-soft text-warning-ink',
  danger: 'border-danger/30 bg-danger-soft text-danger-ink',
  neutral: 'border-border bg-neutral-soft text-ink-secondary',
  verified: 'border-teal/35 bg-teal-soft text-teal-ink',
}

export const TONE_PANEL: Record<Tone, string> = {
  info: 'border-cobalt/20 bg-cobalt-soft/60',
  pending: 'border-warning/35 bg-warning-soft',
  danger: 'border-danger/30 bg-danger-soft',
  neutral: 'border-border bg-subtle',
  verified: 'border-teal/35 bg-teal-soft',
}

export const TONE_TEXT: Record<Tone, string> = {
  info: 'text-cobalt-ink',
  pending: 'text-warning-ink',
  danger: 'text-danger-ink',
  neutral: 'text-ink-secondary',
  verified: 'text-teal-ink',
}

export const TONE_ICON: Record<Tone, ComponentType<LucideProps>> = {
  info: Info,
  pending: Clock,
  danger: OctagonX,
  neutral: CircleDashed,
  verified: ShieldCheck,
}

// Every status is icon + words, never colour alone.
export function StatusPill({ tone, children, className, icon = true }: { tone: Tone; children: ReactNode; className?: string; icon?: boolean }) {
  const Icon = TONE_ICON[tone]
  return (
    <span className={cn('inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-micro font-semibold tracking-[0.04em] whitespace-nowrap uppercase', TONE_PILL[tone], className)}>
      {icon && <Icon aria-hidden className="size-3" />}
      {children}
    </span>
  )
}

// Where a value came from. Always paired with the value it qualifies.
export function SourceBadge({ children, simulated, className }: { children: ReactNode; simulated?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex w-fit items-center gap-1 rounded-md border px-1.5 py-px font-mono text-[10.5px] leading-4 font-semibold tracking-wide whitespace-nowrap uppercase',
      simulated ? 'border-warning/35 bg-warning-soft text-warning-ink' : 'border-border bg-subtle text-ink-secondary', className)}>
      {children}
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn('size-4 animate-spin', className)} />
}

export function Panel({ children, className, labelledBy, as: As = 'section' }: { children: ReactNode; className?: string; labelledBy?: string; as?: 'section' | 'div' | 'article' }) {
  return <As aria-labelledby={labelledBy} className={cn('card p-5 sm:p-6', className)}>{children}</As>
}

export function PanelHead({ id, title, children, className }: { id?: string; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2', className)}>
      <h2 id={id} className="text-h3 font-semibold text-ink">{title}</h2>
      {children}
    </div>
  )
}

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow: string; title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-1.5 text-[26px] leading-[34px] font-bold tracking-tight text-balance text-ink sm:text-h1">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-ink-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function KpiCard({ label, value, hint, icon: Icon, tone = 'neutral' }: { label: string; value: ReactNode; hint: string; icon: ComponentType<LucideProps>; tone?: Tone }) {
  return (
    <div className="card relative p-5">
      <p className="pr-10 text-small font-semibold text-ink-secondary">{label}</p>
      <p className={cn('mt-2 text-kpi font-bold tabular-nums', tone === 'danger' ? 'text-danger-ink' : tone === 'verified' ? 'text-teal-ink' : 'text-ink')}>{value}</p>
      <p className="mt-1 text-small text-ink-muted">{hint}</p>
      <span aria-hidden className="absolute top-4 right-4 grid size-9 place-items-center rounded-control bg-cobalt-soft text-cobalt"><Icon className="size-4" /></span>
    </div>
  )
}

export function HashWithCopy({ value, label, n = 16 }: { value: string; label: string; n?: number }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
      <code className="min-w-0 truncate font-mono text-small font-medium text-ink" title={value}>{value.length > n ? `${value.slice(0, n)}…` : value}</code>
      <button type="button" onClick={copy} aria-label={copied ? `${label} copied` : `Copy full ${label}`}
        className="grid size-7 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-subtle hover:text-ink">
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </button>
      <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
    </span>
  )
}

export function SecurityEmptyState({ icon: Icon = CircleDashed, title, children, action, tone = 'neutral', className }: {
  icon?: ComponentType<LucideProps>
  title: string
  children?: ReactNode
  action?: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-start gap-2 rounded-xl border border-dashed p-5', TONE_PANEL[tone], className)}>
      <p className={cn('flex items-center gap-2 font-semibold', TONE_TEXT[tone])}><Icon aria-hidden className="size-4 shrink-0" /> {title}</p>
      {children && <div className="text-ink-secondary">{children}</div>}
      {action}
    </div>
  )
}

export function DataRow({ k, children, className }: { k: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <dt className="shrink-0 text-ink-secondary">{k}</dt>
      <dd className={cn('min-w-0 text-right font-semibold break-words text-ink', className)}>{children}</dd>
    </div>
  )
}

export function Disclosure({ summary, children, className, defaultOpen }: { summary: ReactNode; children: ReactNode; className?: string; defaultOpen?: boolean }) {
  return (
    <details className={cn('group rounded-xl border border-border bg-card', className)} open={defaultOpen}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {summary}
        <span aria-hidden className="text-ink-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-border px-4 py-3">{children}</div>
    </details>
  )
}
