'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { Bot } from 'lucide-react'
import { AppShell } from '@/components/covenant/app-shell'
import { PageHeading, Panel, SecurityEmptyState, Spinner } from '@/components/covenant/primitives'
import { RequireLogin, SessionExpired, useApi } from '@/components/covenant/session'
import { TransactionsTable } from '@/components/covenant/transactions-table'
import { Button } from '@/components/ui/button'
import type { TxList } from '@/lib/ui/model'

function List() {
  const api = useApi()
  const [r, setR] = useState<{ status: number; ok: boolean; data: TxList & { error?: string } } | null>(null)
  useEffect(() => {
    api<TxList & { error?: string }>('/api/transactions').then(setR)
  }, [api])
  if (!r) return <p role="status" className="flex items-center gap-2 text-ink-secondary"><Spinner /> Loading transactions…</p>
  if (r.status === 401) return <SessionExpired />
  if (!r.ok) return <SecurityEmptyState tone="danger" title={`Could not load transactions (${r.data.error ?? `HTTP_${r.status}`})`} />
  if (r.data.transactions.length === 0) {
    return (
      <SecurityEmptyState title="No frozen transactions yet" action={<Button asChild><Link href="/negotiate"><Bot /> Open AI Negotiation</Link></Button>}>
        Freeze an agent proposal to create the first immutable transaction.
      </SecurityEmptyState>
    )
  }
  return <Panel><TransactionsTable rows={r.data.transactions} caption="Frozen transactions, newest first" /></Panel>
}

export default function TransactionsPage() {
  const { authenticated } = useTideCloak()
  return (
    <AppShell crumbs={[{ label: 'Transactions' }]}>
      <PageHeading eyebrow="COVENANT / Transactions" title="Frozen transactions" description="Every agent proposal frozen into canonical bytes. Open one to inspect its proposal, authority gate and executor verdict." />
      <RequireLogin what="transactions">{authenticated && <List />}</RequireLogin>
    </AppShell>
  )
}
