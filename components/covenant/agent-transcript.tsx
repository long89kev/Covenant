'use client'

import { Bot, FileWarning, Lock, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { invoiceLines, proposalDiff, usd } from '@/lib/ui/model'
import { HashWithCopy, SourceBadge, StatusPill } from './primitives'

export interface Negotiation {
  scenario: { id: string; invoiceId: string; invoiceText: string; quantity: number; unitPriceMinor: number }
  transcript: { from: 'buyer-ai' | 'seller-ai' | 'system'; text: string }[]
  agreement: { buyerOrgId: string; vendorOrgId: string; sku: string; quantity: number; unitPriceMinor: number; totalMinor: number; beneficiaryId: string }
  agreementSha256: string
  proposal: { amountMinor: number; beneficiaryId: string; vendorOrgId: string; invoiceId: string; agentRationale: string; currency: string; extractedFromUntrustedDocument: boolean }
  injectionDetected: boolean
}

function AgentBubble({ from, children, label }: { from: 'buyer-ai' | 'seller-ai'; children: React.ReactNode; label?: React.ReactNode }) {
  const seller = from === 'seller-ai'
  return (
    <li className={cn('flex max-w-[92%] items-end gap-2 sm:max-w-[80%]', seller ? 'flex-row-reverse self-end' : 'self-start')}>
      <span aria-hidden className={cn('grid size-8 shrink-0 place-items-center rounded-full', seller ? 'bg-violet-soft text-violet' : 'bg-cobalt-soft text-cobalt')}>
        {seller ? <Store className="size-4" /> : <Bot className="size-4" />}
      </span>
      <div className={cn('min-w-0 rounded-2xl border px-4 py-2.5', seller ? 'rounded-br-md border-violet/20 bg-violet-soft' : 'rounded-bl-md border-cobalt/15 bg-cobalt-soft/70')}>
        <p className={cn('mb-0.5 flex flex-wrap items-center gap-1.5 text-small font-bold', seller ? 'text-violet' : 'text-cobalt-ink')}>
          {seller ? 'Seller Agent · Northstar' : 'Buyer Agent · Acme Parts'} {label}
        </p>
        <div className="text-ink">{children}</div>
      </div>
    </li>
  )
}

// The supplier invoice is DATA, never instructions. Injected lines are highlighted, not hidden.
export function UntrustedDocument({ n }: { n: Negotiation }) {
  const lines = invoiceLines(n.scenario.invoiceText, n.injectionDetected)
  return (
    <li className="self-stretch">
      <figure className="rounded-xl border-2 border-dashed border-danger/45 bg-card" aria-labelledby="invoice-cap">
        <figcaption id="invoice-cap" className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-danger/30 px-4 py-2.5">
          <span className="flex items-center gap-2 font-bold text-ink"><FileWarning aria-hidden className="size-4 text-danger" /> Invoice <span className="font-mono text-small text-ink-secondary">{n.scenario.invoiceId}</span></span>
          <StatusPill tone="danger">Untrusted input</StatusPill>
        </figcaption>
        <pre className="overflow-x-auto p-4 font-mono text-small leading-6 whitespace-pre-wrap text-ink">
          {lines.map((l, i) => l.hostile
            ? <mark key={i} className="block rounded-sm bg-danger-soft px-1 text-danger-ink ring-1 ring-danger/25">{l.text || ' '}</mark>
            : <span key={i} className="block px-1">{l.text || ' '}</span>)}
        </pre>
        {n.injectionDetected && (
          <p className="border-t border-dashed border-danger/30 px-4 py-2.5 text-small font-semibold text-danger-ink">
            Highlighted lines are a prompt injection: text addressed to the AI that tries to change the payment.
          </p>
        )}
      </figure>
    </li>
  )
}

export function AgentTranscript({ n }: { n: Negotiation }) {
  const turns = n.transcript
  const before = turns.slice(0, -1)
  const last = turns[turns.length - 1]
  return (
    <ol className="flex flex-col gap-3" aria-label="Agent conversation">
      {before.map((t, i) =>
        t.from === 'system' ? (
          <li key={i} className="self-center text-center">
            <span className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-border bg-subtle px-3 py-1.5 text-small text-ink-secondary">
              <Lock aria-hidden className="size-3.5" /> {t.text} <SourceBadge>Trusted quote · hashed</SourceBadge>
            </span>
          </li>
        ) : (
          <AgentBubble key={i} from={t.from}>{t.text}</AgentBubble>
        ),
      )}
      <UntrustedDocument n={n} />
      {last && last.from !== 'system' && (
        <AgentBubble from={last.from} label={<SourceBadge simulated>AI-generated proposal</SourceBadge>}>
          <p>{last.text}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border border-border bg-card p-2.5 text-small">
            <dt className="text-ink-muted">amount</dt><dd className={cn('font-mono font-semibold', n.proposal.amountMinor !== n.agreement.totalMinor && 'text-danger-ink')}>{usd(n.proposal.amountMinor)} {n.proposal.currency}</dd>
            <dt className="text-ink-muted">beneficiary</dt><dd className={cn('font-mono font-semibold break-all', n.proposal.beneficiaryId !== n.agreement.beneficiaryId && 'text-danger-ink')}>{n.proposal.beneficiaryId}</dd>
            <dt className="text-ink-muted">invoice</dt><dd className="font-mono">{n.proposal.invoiceId}</dd>
          </dl>
        </AgentBubble>
      )}
    </ol>
  )
}

export function DealSummary({ n }: { n: Negotiation }) {
  const diff = proposalDiff(n.agreement, n.proposal)
  const changed = diff.some((d) => d.changed)
  return (
    <div className="flex flex-col gap-4">
      <dl>
        <div className="flex justify-between gap-3 border-b border-border py-2"><dt className="text-ink-secondary">Agreed total</dt><dd className="font-bold tabular-nums">{usd(n.agreement.totalMinor)}</dd></div>
        <div className="flex justify-between gap-3 border-b border-border py-2"><dt className="text-ink-secondary">Terms</dt><dd className="text-right font-semibold">{n.agreement.quantity} × {usd(n.agreement.unitPriceMinor)}</dd></div>
        <div className="flex justify-between gap-3 border-b border-border py-2"><dt className="text-ink-secondary">Vendor</dt><dd className="font-mono text-small font-semibold">{n.agreement.vendorOrgId}</dd></div>
        <div className="flex justify-between gap-3 border-b border-border py-2"><dt className="text-ink-secondary">Approved beneficiary</dt><dd className="font-mono text-small font-semibold break-all">{n.agreement.beneficiaryId}</dd></div>
        <div className="flex justify-between gap-3 border-b border-border py-2"><dt className="text-ink-secondary">Invoice source</dt><dd><StatusPill tone="danger" icon={false}>Untrusted</StatusPill></dd></div>
        <div className="flex items-center justify-between gap-3 py-2"><dt className="text-ink-secondary">Agreement SHA-256</dt><dd><HashWithCopy value={n.agreementSha256} label="agreement SHA-256" n={10} /></dd></div>
      </dl>

      <section aria-labelledby="diff-h" className={cn('rounded-xl border p-4', changed ? 'border-danger/35 bg-danger-soft' : 'border-border bg-subtle')}>
        <h3 id="diff-h" className={cn('mb-2 text-small font-bold tracking-[0.08em] uppercase', changed ? 'text-danger-ink' : 'text-ink-secondary')}>
          {changed ? 'Agreed vs proposed · mismatch' : 'Agreed vs proposed · match'}
        </h3>
        <table className="w-full text-small">
          <thead className="sr-only"><tr><th scope="col">Field</th><th scope="col">Agreed</th><th scope="col">Proposed</th></tr></thead>
          <tbody>
            {diff.map((d) => (
              <tr key={d.field} className="align-top">
                <th scope="row" className="py-1 pr-2 text-left font-semibold text-ink-secondary">{d.field}</th>
                <td className="py-1 font-mono break-all text-ink">{d.agreed}</td>
                <td className="px-1 py-1 text-ink-muted" aria-hidden>→</td>
                <td className={cn('py-1 font-mono break-all', d.changed ? 'font-bold text-danger-ink' : 'text-ink')}>
                  {d.proposed}{d.changed && <span className="sr-only"> (changed)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="rounded-xl border border-border bg-subtle p-3 font-semibold text-ink">
        The agent can be wrong. Authorization must not rely on its reasoning.
      </p>
      <details className="text-small">
        <summary className="cursor-pointer font-semibold text-ink-secondary">Agent&apos;s stated rationale</summary>
        <p className="mt-1.5 text-ink-secondary">“{n.proposal.agentRationale}”</p>
      </details>
    </div>
  )
}
