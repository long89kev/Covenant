'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { AppShell } from '@/components/covenant/app-shell'
import { EditorialPageHeader, GateState, Loading } from '@/components/covenant/primitives'
import { RequireLogin, SessionExpired, useApi } from '@/components/covenant/session'
import { TransactionsTable } from '@/components/covenant/transactions-table'
import type { TxList } from '@/lib/ui/model'

function List() {
  const api = useApi()
  const [r, setR] = useState<{ status: number; ok: boolean; data: TxList & { error?: string } } | null>(null)
  useEffect(() => {
    api<TxList & { error?: string }>('/api/transactions').then(setR)
  }, [api])
  if (!r) return <Loading>Loading transactions…</Loading>
  if (r.status === 401) return <SessionExpired />
  if (!r.ok) return <GateState tone="danger" kicker={r.data.error ?? `HTTP_${r.status}`} title="Could not load transactions" />
  if (r.data.transactions.length === 0) {
    return (
      <GateState kicker="Empty ledger" title="No frozen transactions yet" action={<Link className="btn-ink" href="/negotiate">Open agent activity <span aria-hidden>↗</span></Link>}>
        Freeze an agent proposal to create the first immutable transaction.
      </GateState>
    )
  }
  return <TransactionsTable rows={r.data.transactions} caption="Frozen transactions, newest first" />
}

export default function TransactionsPage() {
  const { authenticated } = useTideCloak()
  return (
    <AppShell crumbs={[{ label: 'Transaction inspector' }]}>
      <EditorialPageHeader id="tx-title" index="03" kicker="Transaction inspector" compact
        title={<>Every request,<br />frozen</>}
        lede="Each agent proposal is frozen into canonical bytes. Open one to trace proposal, authority gate and executor verdict." />
      <RequireLogin what="transactions">{authenticated && <List />}</RequireLogin>
    </AppShell>
  )
}
