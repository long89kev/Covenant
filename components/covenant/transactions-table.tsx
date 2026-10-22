'use client'

import Link from 'next/link'
import { scenarioTitle, txRef, txStatus, usd, utc, type TxRow } from '@/lib/ui/model'
import { StatusTag } from './primitives'

// Ruled list: one row per frozen transaction, the whole row links to its inspector. No horizontal scroll.
export function TransactionsTable({ rows, caption }: { rows: TxRow[]; caption: string }) {
  return (
    <ol className="rule-list m-0 list-none p-0" aria-label={caption}>
      {rows.map((t, i) => {
        const s = txStatus(t.status, t.assurance)
        return (
          <li key={t.id}>
            <Link href={`/transactions/${t.id}`} className="proposal-row">
              <span className="item-num mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="proposal-name">
                <strong>{txRef(t.id)} · {scenarioTitle(t.scenario)}</strong>
                <small>{usd(t.amountMinor)} → <span className="font-mono">{t.beneficiaryId}</span> · {utc(t.createdAt)}</small>
              </span>
              <StatusTag tone={s.tone}>{s.label}</StatusTag>
              <span className="row-arrow" aria-hidden>↗</span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
