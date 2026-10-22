'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTideCloak } from '@tidecloak/nextjs'
import { Download, Link2, Link2Off, Search, X } from 'lucide-react'
import { AppShell } from '@/components/covenant/app-shell'
import { AuditTable } from '@/components/covenant/audit-table'
import { PageHeading, Panel, SecurityEmptyState, Spinner } from '@/components/covenant/primitives'
import { RequireLogin, SessionExpired, useApi } from '@/components/covenant/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { filterAudit, sanitizeAudit, txRef, type AuditEvent } from '@/lib/ui/model'

interface AuditResponse {
  chain: { ok: boolean; count: number; brokenAt: number | null }
  events: AuditEvent[]
  error?: string
}

const select = 'h-11 rounded-control border border-border bg-card px-3 text-body text-ink hover:border-border-strong focus-visible:border-cobalt'

function AuditView() {
  const api = useApi()
  const router = useRouter()
  const txId = useSearchParams().get('tx') ?? ''
  const [r, setR] = useState<{ status: number; ok: boolean; data: AuditResponse } | null>(null)
  const [q, setQ] = useState('')
  const [decision, setDecision] = useState('')
  const [type, setType] = useState('')

  useEffect(() => {
    api<AuditResponse>('/api/audit').then(setR)
  }, [api])

  const all = useMemo(() => r?.data.events ?? [], [r])
  const events = useMemo(() => filterAudit(all, { q, decision, type, txId }), [all, q, decision, type, txId])
  const decisions = useMemo(() => [...new Set(all.map((e) => e.decision))].sort(), [all])
  const types = useMemo(() => [...new Set(all.map((e) => e.type))].sort(), [all])

  if (!r) return <p role="status" className="flex items-center gap-2 text-ink-secondary"><Spinner /> Loading audit log…</p>
  if (r.status === 401) return <SessionExpired />
  if (!r.ok) return <SecurityEmptyState tone="danger" title={`Could not load the audit log (${r.data.error ?? `HTTP_${r.status}`})`} />

  const chain = r.data.chain
  const exportJson = () => {
    const doc = { filter: { q, decision, type, txId }, ...sanitizeAudit(events, chain, new Date().toISOString()) }
    const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `covenant-audit-sanitized-${Date.now()}.json` })
    a.click()
    URL.revokeObjectURL(url)
  }
  const filtered = q || decision || type || txId

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className={cn('card flex items-center gap-3 p-4 sm:col-span-1', !chain.ok && 'border-danger/40')}>
          <span aria-hidden className={cn('grid size-10 place-items-center rounded-control', chain.ok ? 'bg-cobalt-soft text-cobalt' : 'bg-danger-soft text-danger')}>{chain.ok ? <Link2 className="size-5" /> : <Link2Off className="size-5" />}</span>
          <div>
            <p className="text-small text-ink-muted">Hash chain (app-side)</p>
            <p className={cn('font-bold', chain.ok ? 'text-ink' : 'text-danger-ink')}>{chain.ok ? `Intact · ${chain.count} events` : `Broken at #${chain.brokenAt}`}</p>
          </div>
        </div>
        <p className="card p-4 text-small text-ink-secondary sm:col-span-2">
          Append-only and hash-chained, which helps detect edits. It is not a trusted timestamp, and a full server compromise could rewrite it. Exports pseudonymise usernames and mark simulated provenance per row.
        </p>
      </div>

      <Panel>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative flex-1">
            <label htmlFor="q" className="mb-1 block text-small font-semibold text-ink-secondary">Search</label>
            <Search aria-hidden className="pointer-events-none absolute bottom-3.5 left-3 size-4 text-ink-muted" />
            <Input id="q" className="pl-9" placeholder="Actor, reason code, event…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:flex">
            <div>
              <label htmlFor="verdict" className="mb-1 block text-small font-semibold text-ink-secondary">Verdict</label>
              <select id="verdict" className={cn(select, 'w-full')} value={decision} onChange={(e) => setDecision(e.target.value)}>
                <option value="">All</option>
                {decisions.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="etype" className="mb-1 block text-small font-semibold text-ink-secondary">Event</label>
              <select id="etype" className={cn(select, 'w-full')} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All</option>
                {types.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={exportJson} disabled={events.length === 0}><Download /> Export sanitized JSON</Button>
        </div>
        {txId && (
          <p className="mb-3 flex flex-wrap items-center gap-2 text-ink-secondary">
            Correlated transaction <span className="font-mono font-semibold text-ink">{txRef(txId)}</span>
            <Button variant="ghost" size="xs" onClick={() => router.replace('/audit')}><X /> Clear</Button>
          </p>
        )}
        <p role="status" className="mb-2 text-small text-ink-muted">{events.length} of {all.length} events{filtered ? ' match the filters' : ''}</p>
        {events.length === 0
          ? <SecurityEmptyState title={all.length === 0 ? 'No events recorded yet' : 'No events match these filters (audit_no_matches)'}>{all.length === 0 ? 'Run a scenario to create the first events.' : 'Clear a filter to widen the search.'}</SecurityEmptyState>
          : <AuditTable events={events} />}
      </Panel>
    </>
  )
}

function AuditPage() {
  const { authenticated } = useTideCloak()
  return (
    <AppShell crumbs={[{ label: 'Audit Trail' }]}>
      <PageHeading eyebrow="COVENANT / Audit Trail" title="Audit every decision." description="Who proposed the action, what the rule evaluation claimed, and what the independent executor did. Each row names its source." />
      <RequireLogin what="the audit trail">{authenticated && <AuditView />}</RequireLogin>
    </AppShell>
  )
}

export default function Page() {
  return <Suspense><AuditPage /></Suspense>
}
