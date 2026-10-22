'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { scenarioTitle, txRef, txStatus, usd, utc, type TxRow } from '@/lib/ui/model'
import { StatusPill } from './primitives'

// Desktop: table with row links. Mobile: one card per transaction (no horizontal scroll).
export function TransactionsTable({ rows, caption }: { rows: TxRow[]; caption: string }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border text-micro font-semibold tracking-[0.08em] text-ink-muted uppercase">
              <th scope="col" className="px-3 py-2.5">Transaction</th>
              <th scope="col" className="px-3 py-2.5">Scenario</th>
              <th scope="col" className="px-3 py-2.5 text-right">Amount</th>
              <th scope="col" className="px-3 py-2.5">Beneficiary</th>
              <th scope="col" className="px-3 py-2.5">Authorization</th>
              <th scope="col" className="px-3 py-2.5"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const s = txStatus(t.status, t.assurance)
              return (
                <tr key={t.id} className="border-b border-border last:border-b-0 hover:bg-subtle">
                  <td className="px-3 py-3">
                    <span className="font-mono font-semibold text-ink">{txRef(t.id)}</span>
                    <span className="block text-small text-ink-muted">{utc(t.createdAt)}</span>
                  </td>
                  <td className="px-3 py-3">{scenarioTitle(t.scenario)}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{usd(t.amountMinor)}</td>
                  <td className="max-w-48 truncate px-3 py-3 font-mono text-small text-ink-secondary">{t.beneficiaryId}</td>
                  <td className="px-3 py-3"><StatusPill tone={s.tone}>{s.label}</StatusPill></td>
                  <td className="px-3 py-3 text-right">
                    <Link href={`/transactions/${t.id}`} className="inline-flex min-h-10 items-center gap-1 rounded-control px-2 font-semibold text-cobalt-ink hover:bg-cobalt-soft">
                      Open <span className="sr-only">transaction {txRef(t.id)}</span><ArrowRight aria-hidden className="size-4" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden" aria-label={caption}>
        {rows.map((t) => {
          const s = txStatus(t.status, t.assurance)
          return (
            <li key={t.id}>
              <Link href={`/transactions/${t.id}`} className="flex flex-col gap-1.5 rounded-xl border border-border p-3 hover:bg-subtle">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold">{txRef(t.id)}</span>
                  <span className="font-semibold tabular-nums">{usd(t.amountMinor)}</span>
                </span>
                <StatusPill tone={s.tone}>{s.label}</StatusPill>
                <span className="text-small text-ink-muted">{scenarioTitle(t.scenario)} · <span className="font-mono break-all">{t.beneficiaryId}</span></span>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
