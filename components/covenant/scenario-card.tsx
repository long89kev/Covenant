'use client'

import Link from 'next/link'
import { ArrowRight, Check, Clock, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SCENARIO_META, usd, type ScenarioId } from '@/lib/ui/model'
import { StatusPill, TONE_PILL } from './primitives'

const ICON = { clean: Check, malicious_invoice: TriangleAlert, escalation: Clock }

// A fixture selector. It changes the INPUT the agents see; it never produces an authority result.
export function ScenarioCard({ id, active }: { id: ScenarioId; active?: boolean }) {
  const s = SCENARIO_META[id]
  const Icon = ICON[s.key]
  return (
    <Link
      href={`/negotiate?scenario=${id}`}
      aria-label={`${s.cta}: ${s.title}, ${usd(s.proposedMinor)}`}
      aria-current={active ? 'true' : undefined}
      className={cn('group flex h-full flex-col rounded-xl border bg-card p-4 transition-colors hover:border-cobalt/50 hover:bg-subtle', active ? 'border-cobalt bg-cobalt-soft/40' : 'border-border')}
    >
      <div className="flex items-start justify-between gap-2">
        <span aria-hidden className={cn('grid size-9 place-items-center rounded-control border', TONE_PILL[s.tone])}><Icon className="size-4" /></span>
        <StatusPill tone={s.tone === 'info' ? 'neutral' : s.tone} icon={false}>Risk · {s.risk}</StatusPill>
      </div>
      <p className="mt-3 font-bold text-ink">{s.title}</p>
      <p className="text-h3 font-bold text-ink tabular-nums">{usd(s.proposedMinor)}</p>
      <p className="mt-1 text-ink-secondary">{s.summary}</p>
      <p className="mt-3 border-t border-border pt-3 text-small text-ink-muted"><span className="font-semibold text-ink-secondary">Expected:</span> {s.expected}</p>
      <span className="mt-auto inline-flex items-center gap-1 pt-3 font-semibold text-cobalt-ink">
        {s.cta} <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}
