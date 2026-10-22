'use client'

import type { ReactNode } from 'react'
import { invoiceLines, proposalDiff, usd } from '@/lib/ui/model'
import { HashWithCopy, SourceTag } from './primitives'

export interface Negotiation {
  scenario: { id: string; invoiceId: string; invoiceText: string; quantity: number; unitPriceMinor: number }
  transcript: { from: 'buyer-ai' | 'seller-ai' | 'system'; text: string }[]
  agreement: { buyerOrgId: string; vendorOrgId: string; sku: string; quantity: number; unitPriceMinor: number; totalMinor: number; beneficiaryId: string }
  agreementSha256: string
  proposal: { amountMinor: number; beneficiaryId: string; vendorOrgId: string; invoiceId: string; agentRationale: string; currency: string; extractedFromUntrustedDocument: boolean }
  injectionDetected: boolean
}

const ACTOR = { 'buyer-ai': 'Buyer agent · Acme Parts', 'seller-ai': 'Seller agent · Northstar' } as const

function Message({ actor, n, source, children, className }: { actor: string; n: number; source: ReactNode; children: ReactNode; className?: string }) {
  return (
    <li className={className ? `message ${className}` : 'message'}>
      <span className="mono message-actor">{actor} / {String(n).padStart(2, '0')} {source}</span>
      {children}
    </li>
  )
}

// Provenance on every turn: AGENT (simulated, untrusted output), TRUSTED QUOTE (hashed server fixture),
// UNTRUSTED DOCUMENT (data, never instructions; injected lines are highlighted, not hidden).
export function AgentTranscript({ n }: { n: Negotiation }) {
  const turns = n.transcript
  const before = turns.slice(0, -1)
  const last = turns[turns.length - 1]
  const lines = invoiceLines(n.scenario.invoiceText, n.injectionDetected)
  let k = 0
  return (
    <ol className="m-0 list-none p-0" aria-label="Agent conversation">
      {before.map((t, i) =>
        t.from === 'system'
          ? <Message key={i} n={++k} actor="System" className="system" source={<SourceTag>Trusted quote · hashed</SourceTag>}><p>{t.text}</p></Message>
          : <Message key={i} n={++k} actor={ACTOR[t.from]} source={<SourceTag simulated>Agent · simulated</SourceTag>}><p>{t.text}</p></Message>,
      )}
      <Message n={++k} actor={`Untrusted document · ${n.scenario.invoiceId}`} className="untrusted" source={null}>
        <pre aria-label="Invoice text">
          {lines.map((l, i) => l.hostile ? <mark key={i}>{l.text || ' '}</mark> : <span key={i} className="block">{l.text || ' '}</span>)}
        </pre>
        <span className="mono document-tag">
          External input · not authority{n.injectionDetected && ' · highlighted lines are a prompt injection addressed to the AI'}
        </span>
      </Message>
      {last && last.from !== 'system' && (
        <Message n={++k} actor={ACTOR[last.from]} source={<SourceTag simulated>AI-generated proposal</SourceTag>}>
          <p>{last.text}</p>
          <dl className="message-fields">
            <dt>Amount</dt><dd className={n.proposal.amountMinor !== n.agreement.totalMinor ? 'changed' : undefined}>{usd(n.proposal.amountMinor)} {n.proposal.currency}</dd>
            <dt>Beneficiary</dt><dd className={n.proposal.beneficiaryId !== n.agreement.beneficiaryId ? 'changed' : undefined}>{n.proposal.beneficiaryId}</dd>
            <dt>Invoice</dt><dd>{n.proposal.invoiceId}</dd>
          </dl>
        </Message>
      )}
    </ol>
  )
}

// Dark diff panel: agreed terms (hashed at agreement time) vs what the agent now proposes.
export function DealSummary({ n, action }: { n: Negotiation; action: ReactNode }) {
  const diff = proposalDiff(n.agreement, n.proposal)
  const changed = diff.some((d) => d.changed)
  const [amount, payee] = diff
  return (
    <aside className="right-study" aria-labelledby="diff-h">
      <span className="mono">{changed ? 'The failure case / simulated agents' : 'Agreed vs proposed / simulated agents'}</span>
      <h2 id="diff-h">{changed ? <>AI can change<br />its mind.<br /><em>Policy doesn&apos;t.</em></> : <>Proposal<br />matches the deal.<br /><em>Still not permission.</em></>}</h2>
      <div className="diff" role="group" aria-label={changed ? 'Agreed versus proposed: mismatch' : 'Agreed versus proposed: match'}>
        <div><span>AGREED</span><strong>{amount.agreed}</strong><small>{payee.agreed}</small></div>
        <div className="diff-vs" aria-hidden>→</div>
        <div>
          <span>PROPOSED</span>
          <strong className={amount.changed ? 'changed' : undefined}>{amount.proposed}{amount.changed && <span className="sr-only"> (changed)</span>}</strong>
          <small className={payee.changed ? 'changed' : undefined}>{payee.proposed}{payee.changed && <span className="sr-only"> (changed)</span>}</small>
        </div>
      </div>
      <dl className="console-rows mt-0 border-t-0">
        <div><dt className="mono">Terms</dt><dd>{n.agreement.quantity} × {usd(n.agreement.unitPriceMinor)}</dd></div>
        <div><dt className="mono">Vendor</dt><dd className="font-mono text-[12px]">{n.agreement.vendorOrgId}</dd></div>
        <div><dt className="mono">Agreement SHA-256</dt><dd className="[&_.hash]:text-paper [&_.copy-btn]:text-[#A9BAA9]"><HashWithCopy value={n.agreementSha256} label="agreement SHA-256" n={10} /></dd></div>
      </dl>
      <p className="study-note">The agent can be wrong. <b>Authorization must not rely on its reasoning</b>: freezing re-derives every byte on the server and creates an immutable transaction. It does not authorize it.</p>
      {action}
    </aside>
  )
}
