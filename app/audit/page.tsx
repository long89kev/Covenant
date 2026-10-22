'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTideCloak } from '@tidecloak/nextjs'
import { AppShell } from '@/components/covenant/app-shell'
import { AuditTable } from '@/components/covenant/audit-table'
import { EditorialPageHeader, GateState, Loading } from '@/components/covenant/primitives'
import { RequireLogin, SessionExpired, useApi } from '@/components/covenant/session'
import { filterAudit, sanitizeAudit, txRef, type AuditEvent } from '@/lib/ui/model'

interface AuditResponse {
  chain: { ok: boolean; count: number; brokenAt: number | null }
  events: AuditEvent[]
  error?: string
}

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

  if (!r) return <Loading>Loading evidence log…</Loading>
  if (r.status === 401) return <SessionExpired />
  if (!r.ok) return <GateState tone="danger" kicker={r.data.error ?? `HTTP_${r.status}`} title="Could not load the evidence log" />

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
      <div className="chain-line">
        <span>Hash chain (app-side): <b data-tone={chain.ok ? undefined : 'danger'}>{chain.ok ? `Intact · ${chain.count} events` : `Broken at #${chain.brokenAt}`}</b></span>
        <span>Append-only and hash-chained, which helps detect edits. Not a trusted timestamp; a full server compromise could rewrite it.</span>
      </div>
      <div className="audit-controls">
        <span role="status" className="mono">{events.length} of {all.length} server events{filtered ? ' · filtered' : ''}</span>
        <div className="controls">
          <label className="field" htmlFor="q"><span className="mono">Search</span>
            <input id="q" type="search" placeholder="Actor, reason code, event…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className="field" htmlFor="verdict"><span className="mono">Verdict</span>
            <select id="verdict" value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="">All verdicts</option>
              {decisions.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="etype"><span className="mono">Event</span>
            <select id="etype" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All events</option>
              {types.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <button type="button" className="btn-line" onClick={exportJson} disabled={events.length === 0}>Export sanitized JSON</button>
        </div>
      </div>
      {txId && (
        <p className="chain-line">
          <span>Correlated transaction <b className="font-mono">{txRef(txId)}</b></span>
          <button type="button" className="text-button" onClick={() => router.replace('/audit')}>Clear ✕</button>
        </p>
      )}
      {events.length === 0
        ? <GateState kicker={all.length === 0 ? 'Empty' : 'audit_no_matches'} title={all.length === 0 ? 'No events recorded yet' : 'No events match these filters'}>{all.length === 0 ? 'Run a scenario to create the first events.' : 'Clear a filter to widen the search.'}</GateState>
        : <AuditTable events={events} />}
      <p className="footnote">Rows marked with a simulated source are simulated authority. Only a LIVE VERIFIED source comes from an executor-verified Tide signature. Exports pseudonymise usernames.</p>
    </>
  )
}

function AuditPage() {
  const { authenticated } = useTideCloak()
  return (
    <AppShell crumbs={[{ label: 'Evidence log' }]}>
      <EditorialPageHeader id="audit-title" index="05" kicker="Evidence log"
        title={<>Show the<br />reason</>}
        lede="Every consequential state change has a source, a reason and an actor. Select a row to open its evidence." />
      <RequireLogin what="the audit trail">{authenticated && <AuditView />}</RequireLogin>
    </AppShell>
  )
}

export default function Page() {
  return <Suspense><AuditPage /></Suspense>
}
