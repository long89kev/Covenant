'use client'

import { useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tone } from '@/lib/ui/model'

// Editorial Authority primitives (design/app-v2). Thin rules instead of boxed cards; every status is
// words first and colour second. The 'verified' tone (lime fill) is only ever produced by
// lib/ui/model.ts from a live executor receipt — a CSS class can never grant it.

export function StatusTag({ tone, children, compact, className }: { tone: Tone; children: ReactNode; compact?: boolean; className?: string }) {
  return <span data-tone={tone} className={cn('status-tag', compact && 'compact', className)}>{children}</span>
}

// Where a value came from. Always paired with the value it qualifies.
export function SourceTag({ children, simulated }: { children: ReactNode; simulated?: boolean }) {
  return <span className="source-tag" data-simulated={simulated ? 'true' : 'false'}>{children}</span>
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn('size-4 animate-spin motion-reduce:animate-none', className)} />
}

export function Loading({ children }: { children: ReactNode }) {
  return <p role="status" className="loading"><Spinner /> {children}</p>
}

export function EditorialPageHeader({ index, kicker, title, lede, side, compact, id }: {
  index: string
  kicker: string
  title: ReactNode
  lede?: ReactNode
  side?: ReactNode
  compact?: boolean
  id: string
}) {
  return (
    <div className={cn('page-header', side && (compact ? 'inspector-header' : 'page-header-split'))}>
      <div>
        <span className="kicker mono">[ {index} — {kicker} ]</span>
        <h1 id={id} className={compact ? 'h1-compact' : undefined}>{title}<span className="period">.</span></h1>
        {lede && <p>{lede}</p>}
      </div>
      {side}
    </div>
  )
}

// Login gate, error, empty: a ruled statement, never a decorative card.
export function GateState({ tone = 'neutral', kicker, title, children, action }: { tone?: Tone; kicker: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <section className="gate-state" data-tone={tone}>
      <span className="mono kicker">{kicker}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </section>
  )
}

export function Notice({ tone = 'neutral', title, children }: { tone?: Tone; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="notice" data-tone={tone}>
      <strong>{title}</strong>
      {children}
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
      <code className="hash min-w-0 truncate" title={value}>{value.length > n ? `${value.slice(0, n)}…` : value}</code>
      <button type="button" onClick={copy} className="copy-btn" aria-label={copied ? `${label} copied` : `Copy full ${label}`}>{copied ? 'Copied' : 'Copy'}</button>
      <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
    </span>
  )
}

export function Disclosure({ summary, children, defaultOpen }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="disclosure" open={defaultOpen}>
      <summary>{summary}</summary>
      <div>{children}</div>
    </details>
  )
}
