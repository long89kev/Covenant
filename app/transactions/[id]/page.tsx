'use client'

import Link from 'next/link'
import { use, useCallback, useEffect, useState } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { ListChecks } from 'lucide-react'
import { AppShell } from '@/components/covenant/app-shell'
import { PageHeading, SecurityEmptyState, Spinner } from '@/components/covenant/primitives'
import { RequireLogin, SessionExpired, useApi } from '@/components/covenant/session'
import {
  ActionResultView, ApprovalMatrix, AuthorityZone, EventTimeline, ExecutorVerdict, InspectorHeader, NegativeTests, ProofDisclosure, ProposedZone, TamperedView,
  type ActionResult, type Detail,
} from '@/components/covenant/transaction-inspector'
import { Button } from '@/components/ui/button'
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

  if (load.state === 'loading') return <p role="status" className="flex items-center gap-2 text-ink-secondary"><Spinner /> Loading transaction…</p>
  if (load.state === 'error') {
    if (load.status === 401) return <SessionExpired />
    return (
      <SecurityEmptyState tone="danger" title={`Transaction unavailable (${load.code})`} action={<Button variant="outline" asChild><Link href="/transactions">All transactions</Link></Button>}>
        {reasonText(load.code)}
      </SecurityEmptyState>
    )
  }

  const execute = () => run('Simulate settlement', `/api/transactions/${id}/execute`, {})
  if ('tampered' in load.d) return <TamperedView d={load.d} busy={busy} result={result} onExecute={execute} />

  const d = load.d
  const canApprove = (role: string) => !!token && (hasRealmRole(role) || hasClientRole(role))
  return (
    <>
      <InspectorHeader d={d} />
      <div aria-live="polite" className="mb-5 empty:hidden">{result && <ActionResultView r={result} />}</div>
      {/* 34 / 34 / 32 at ≥1280px; two columns with the executor full width below; one column on mobile */}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[34fr_34fr_32fr]">
        <ProposedZone d={d} />
        <AuthorityZone d={d}>
          <ApprovalMatrix d={d} canApprove={canApprove} busy={busy} onApprove={(role, label) => run(`Approve as ${label}`, `/api/transactions/${id}/approve`, { role })} />
        </AuthorityZone>
        <ExecutorVerdict d={d} busy={busy} onExecute={execute} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <ProofDisclosure d={d} />
          <NegativeTests d={d} busy={busy} onRun={(kind, title) => run(title, `/api/transactions/${id}/attack`, { kind })} />
        </div>
        <EventTimeline d={d} />
      </div>
    </>
  )
}

export default function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { authenticated } = useTideCloak()
  return (
    <AppShell crumbs={[{ label: 'Transactions', href: '/transactions' }, { label: txRef(id) }]}>
      <PageHeading
        eyebrow="COVENANT / Transactions"
        title="Transaction Inspector"
        description="The same frozen transaction, examined from three independent perspectives: what the AI proposed, what the authority gate decided, and what the executor verified."
        actions={<Button variant="outline" asChild><Link href={`/audit?tx=${id}`}><ListChecks /> Open audit trail</Link></Button>}
      />
      <RequireLogin what="this transaction">{authenticated && <Inspector id={id} />}</RequireLogin>
    </AppShell>
  )
}
