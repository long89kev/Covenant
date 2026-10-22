'use client'

import Link from 'next/link'
import { use, useCallback, useEffect, useState } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { AppShell } from '@/components/covenant/app-shell'
import { EditorialPageHeader, GateState, Loading } from '@/components/covenant/primitives'
import { RequireLogin, SessionExpired, useApi, useCapability } from '@/components/covenant/session'
import {
  ActionResultView, ApprovalMatrix, AuthorityZone, BoundaryRule, EventTimeline, ExecutorVerdict, InspectorHeader, NegativeTests, ProofDisclosure,
  ProposedZone, TamperedView, type ActionResult, type Detail,
} from '@/components/covenant/transaction-inspector'
import { reasonText, txRef } from '@/lib/ui/model'

type Tampered = { id: string; tampered: true; status: string; canonical: string; sha256: string }
type Load = { state: 'loading' } | { state: 'ok'; d: Detail | Tampered } | { state: 'error'; status: number; code: string }

function Inspector({ id }: { id: string }) {
  const api = useApi()
  const { token, hasRealmRole, hasClientRole } = useTideCloak()
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ActionResult | null>(null)

  const refresh = useCallback(async () => {
    const r = await api<Detail & { error?: string }>(`/api/transactions/${id}`)
    setLoad(r.ok ? { state: 'ok', d: r.data } : { state: 'error', status: r.status, code: r.data.error ?? `HTTP_${r.status}` })
  }, [api, id])

  useEffect(() => {
    refresh()
  }, [refresh])

  // One action at a time: buttons disable while busy, so a double click cannot submit twice.
  const run = async (title: string, path: string, body: object) => {
    if (busy) return
    setBusy(true)
    const r = await api(path, { method: 'POST', body: JSON.stringify(body) })
    setResult({ title, status: r.status, body: r.data })
    await refresh()
    setBusy(false)
  }

  if (load.state === 'loading') return <Loading>Loading transaction…</Loading>
  if (load.state === 'error') {
    if (load.status === 401) return <SessionExpired />
    return (
      <GateState tone="danger" kicker={load.code} title="Transaction unavailable" action={<Link className="btn-line" href="/transactions">All transactions ↗</Link>}>
        {reasonText(load.code)}
      </GateState>
    )
  }

  const execute = () => run('Simulate settlement', `/api/transactions/${id}/execute`, {})
  if ('tampered' in load.d) return <TamperedView d={load.d} busy={busy} result={result} onExecute={execute} />

  const d = load.d
  const canApprove = (role: string) => !!token && (hasRealmRole(role) || hasClientRole(role))
  return (
    <>
      <InspectorHeader d={d} />
      <div aria-live="polite" className="empty:hidden">{result && <ActionResultView r={result} />}</div>
      {/* proposal (paper) / authority gate (dark) / executor verdict (paper); stacked in this order ≤1250px */}
      <div className="inspector-grid">
        <ProposedZone d={d} />
        <AuthorityZone d={d}>
          <ApprovalMatrix d={d} canApprove={canApprove} busy={busy} onApprove={(role, label) => run(`Approve as ${label}`, `/api/transactions/${id}/approve`, { role })} />
        </AuthorityZone>
        <ExecutorVerdict d={d} busy={busy} onExecute={execute} />
      </div>
      <BoundaryRule id={d.id} />
      <div className="lower-grid">
        <div className="min-w-0">
          <ProofDisclosure d={d} />
          <NegativeTests d={d} busy={busy} onRun={(kind, title) => run(title, `/api/transactions/${id}/attack`, { kind })} />
        </div>
        <EventTimeline d={d} />
      </div>
    </>
  )
}

// App-level mode is never LIVE; a per-transaction live proof is shown only in the executor column.
function Key({ id }: { id: string }) {
  const { mode } = useCapability()
  return (
    <div className="inspector-key mono">
      <span>Frozen / {txRef(id)}</span>
      <span className="sim-label">{mode === 'SIMULATED' ? 'Simulated · no Tide proof' : mode === 'UNAVAILABLE' ? 'Authority unavailable' : 'Proof status in column 03'}</span>
    </div>
  )
}

export default function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { authenticated } = useTideCloak()
  return (
    <AppShell crumbs={[{ label: 'Transaction inspector', href: '/transactions' }, { label: txRef(id) }]}>
      <EditorialPageHeader id="inspector-title" index="03" kicker="Transaction inspector" compact
        title={<>A proposal is<br />not permission</>}
        lede="Trace the request from agent intent to independent execution."
        side={<Key id={id} />} />
      <RequireLogin what="this transaction">{authenticated && <Inspector id={id} />}</RequireLogin>
    </AppShell>
  )
}
