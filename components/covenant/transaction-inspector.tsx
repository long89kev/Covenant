'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  AUTO_LIMIT_MINOR, LIVE_ASSURANCE, OUTCOME_LABEL, OUTCOME_TONE, auditSource, decisionTone, executorState, lastExecutorRejection, policyChecks,
  reasonText, short, txRef, txStatus, usd, utc,
  type AuditEvent, type PolicyResult, type Settlement, type Tone,
} from '@/lib/ui/model'
import { Disclosure, HashWithCopy, Notice, SourceTag, Spinner, StatusTag } from './primitives'

export const FINANCE = 'covenant-finance'
export const PROCUREMENT = 'covenant-procurement'

export interface Detail {
  id: string
  scenario: string
  status: string
  requester: string
  tx: {
    invoiceId: string; buyerOrgId: string; vendorOrgId: string; beneficiaryId: string; amountMinor: number; currency: string
    nonce: string; policyVersion: string; tideContractId: string; issuedAt: string; expiresAt: string; agreementSha256: string; domain: string
  }
  canonical: string
  sha256: string
  proposal: { agentRationale: string; extractedFromUntrustedDocument: boolean }
  negotiation: { scenario: { invoiceText: string }; injectionDetected: boolean; agreement: { totalMinor: number; beneficiaryId: string; vendorOrgId: string } }
  approvals: { username: string; role: string; txSha256: string; createdAt: string; subjectHint: string }[]
  policy: PolicyResult
  settlement: (Settlement & { nonce: string; payloadSha256: string }) | null
  events: AuditEvent[]
  forseti: { status: string; reason: string }
  trustedKey: { keyId: string; fingerprint: string; source: string } | null
  authorityMode: string | null
}

export type ActionResult = { title: string; status: number; body: any }

const isLive = (d: Detail) => d.settlement?.assurance === LIVE_ASSURANCE

// Policy decision → gate headline. Fallback authority can only ever say "simulated"; the word
// "signed" never appears unless the executor verified a Tide signature (isLive).
function gateHeadline(d: Detail): { text: string; tone: Tone } {
  if (d.policy.decision === 'DENY') return { text: 'Execution blocked', tone: 'danger' }
  if (d.policy.decision === 'NEEDS_APPROVAL') return { text: 'Approval required', tone: 'pending' }
  return isLive(d) ? { text: 'Signed by Tide · verified', tone: 'verified' } : { text: 'Eligible under simulated rules', tone: 'info' }
}

// ---- page key + summary line ----

export function InspectorHeader({ d }: { d: Detail }) {
  const s = txStatus(d.status, d.settlement?.assurance, d.policy.decision)
  return (
    <section aria-label="Transaction summary" className="tx-summary">
      <StatusTag tone={s.tone}>{s.label}</StatusTag>
      <span><b>{d.tx.buyerOrgId}</b> → <b>{d.tx.vendorOrgId}</b></span>
      <span>Requested by <b>{d.requester}</b> · TideCloak login</span>
      <span>Window expires <b>{utc(d.tx.expiresAt)}</b></span>
      <span>{d.tx.currency} · synthetic data</span>
    </section>
  )
}

function Eyebrow({ n, title, side }: { n: string; title: string; side?: ReactNode }) {
  return (
    <div className="column-eyebrow mono">
      <span>{n}</span>
      <span>{title}</span>
      {side}
    </div>
  )
}

// ---- 01 AI proposal (paper) ----

export function ProposedZone({ d }: { d: Detail }) {
  const agreed = d.negotiation.agreement
  const over = d.tx.amountMinor - agreed.totalMinor
  const payeeChanged = d.tx.beneficiaryId !== agreed.beneficiaryId
  const mismatch = over !== 0 || payeeChanged
  return (
    <section aria-labelledby="zone-proposed" className="inspection-column proposal-col">
      <span id="zone-proposed" className="sr-only">01 AI proposal</span>
      <Eyebrow n="01" title="AI proposal" />
      <div className="column-content">
        <span className="mono muted">Submitted amount</span>
        <strong className={mismatch ? 'display-amount changed' : 'display-amount'}>{usd(d.tx.amountMinor)}</strong>
        <dl className="m-0">
          <div className="fieldline"><dt>Agreed payment</dt><dd>{usd(agreed.totalMinor)}</dd></div>
          <div className="fieldline"><dt>Vendor</dt><dd className="font-mono">{d.tx.vendorOrgId}</dd></div>
          <div className="fieldline"><dt>Beneficiary</dt><dd className={payeeChanged ? 'changed font-mono' : 'font-mono'}>{d.tx.beneficiaryId}</dd></div>
          <div className="fieldline"><dt>Source</dt><dd>{d.proposal.extractedFromUntrustedDocument ? 'Untrusted invoice' : 'Agent'}</dd></div>
          <div className="fieldline"><dt>Agreement</dt><dd className={mismatch ? 'changed' : undefined}>{mismatch ? 'MISMATCH' : 'MATCH'}</dd></div>
          <div className="fieldline"><dt>Frozen</dt><dd>{utc(d.tx.issuedAt)}</dd></div>
        </dl>
        {mismatch && (
          <div className="mismatch">
            <span className="mono">Agreement mismatch</span>
            {over !== 0 && <>Request {over > 0 ? 'exceeds' : 'is below'} the agreed payment by <b>{usd(Math.abs(over))}</b>. </>}
            {payeeChanged && <>Beneficiary changed from <code className="font-mono">{agreed.beneficiaryId}</code> to <b className="font-mono break-all">{d.tx.beneficiaryId}</b>.</>}
          </div>
        )}
        <Disclosure summary={d.negotiation.injectionDetected ? 'Why the agent asked for this' : "Agent's rationale"}>
          <p className="m-0">“{d.proposal.agentRationale}”</p>
          {d.negotiation.injectionDetected && <pre>{d.negotiation.scenario.invoiceText.split('\n').slice(4).join('\n')}</pre>}
        </Disclosure>
        <div className="spacer-line" />
        <p className="fine-label">The agent&apos;s output is a request. It carries no execution authority.</p>
      </div>
    </section>
  )
}

// ---- 02 authority gate (dark console) ----

export function ApprovalMatrix({ d, canApprove, busy, onApprove }: { d: Detail; canApprove: (role: string) => boolean; busy: boolean; onApprove: (role: string, label: string) => void }) {
  const slots = [{ role: FINANCE, label: 'Finance' }, { role: PROCUREMENT, label: 'Procurement' }]
  if (d.tx.amountMinor <= AUTO_LIMIT_MINOR) {
    return <div className="gate-check"><span>Business approvals</span><strong data-tone="neutral">Not required</strong></div>
  }
  return (
    <ul className="m-0 list-none p-0" aria-label="Business approvals">
      {slots.map(({ role, label }) => {
        const a = d.approvals.find((x) => x.role === role)
        const allowed = canApprove(role)
        return (
          <li key={role} className="approval-slot">
            <div className="slot-head">
              <span>{label} approver <code className="font-mono text-[10px] text-[#8EA58F]">{role}</code></span>
              {a ? <strong className="font-mono text-[10px] text-signal">RECORDED · SIMULATED</strong>
                : d.policy.decision === 'DENY' ? <strong className="font-mono text-[10px] text-[#8EA58F]">NOT EVALUATED</strong>
                : <strong className="font-mono text-[10px] text-[var(--wait-console)]">AWAITING</strong>}
            </div>
            <p>
              {a ? <>Approved by <b className="text-paper">{a.username}</b> (Tide-verified token role). App-recorded, not a Forseti approver proof · bound to <code className="font-mono">{short(a.txSha256, 10)}</code>.</>
                : 'Identity is a TideCloak-verified token role. The approval itself is an app record, not a Forseti approver proof.'}
            </p>
            {!a && (
              <>
                <button type="button" className="btn-console" disabled={busy || !allowed} onClick={() => onApprove(role, label)} aria-describedby={allowed ? undefined : `why-${role}`}>
                  Approve as {label}
                </button>
                {!allowed && <p id={`why-${role}`}>Disabled: your Tide token does not carry <code className="font-mono">{role}</code>. The server refuses it anyway (ROLE_FORBIDDEN).</p>}
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function AuthorityZone({ d, children }: { d: Detail; children: ReactNode }) {
  const live = isLive(d)
  const head = gateHeadline(d)
  const rows = policyChecks(d.tx.amountMinor, d.policy).filter((r) => r.id !== 'approvals')
  const approvals = policyChecks(d.tx.amountMinor, d.policy).find((r) => r.id === 'approvals')
  return (
    <section aria-labelledby="zone-authority" className="inspection-column authority-col">
      <span id="zone-authority" className="sr-only">02 Authority gate</span>
      <Eyebrow n="02" title="Authority gate" side={<small>{live ? 'LIVE' : 'SIMULATION'}</small>} />
      <div className="column-content">
        <span className="mono muted-dark">{live ? 'Executor-verified Tide signature' : 'Reference evaluator · not Forseti'}</span>
        <div className="gate-decision" data-tone={head.tone} data-testid="gate-decision">{head.text}</div>
        <ul className="m-0 list-none p-0" aria-label="Policy checks">
          {rows.map((r) => (
            <li key={r.id} className="gate-check">
              <div>
                <span>{r.label}</span>
                {r.reasons.map((code) => <small key={code}><code>{code}</code> · {reasonText(code)}</small>)}
              </div>
              <strong data-tone={OUTCOME_TONE[r.outcome] === 'info' ? undefined : OUTCOME_TONE[r.outcome]}>{OUTCOME_LABEL[r.outcome]}</strong>
            </li>
          ))}
          {approvals && (
            <li className="gate-check">
              <div><span>{approvals.label}</span>{approvals.note && <small>{approvals.note}</small>}</div>
              <strong data-tone={OUTCOME_TONE[approvals.outcome] === 'info' ? undefined : OUTCOME_TONE[approvals.outcome]}>{OUTCOME_LABEL[approvals.outcome]}</strong>
            </li>
          )}
        </ul>
        <span className="mono muted-dark gate-subhead">Business approvals / {d.tx.policyVersion}</span>
        {children}
        <div className="gate-divider" />
        <div className="mono authority-caption">
          {live
            ? <>Signer: Tide signature from the pinned key.<br />Verified by the independent executor over these exact bytes.</>
            : <>Forseti {d.forseti.status === 'BLOCKED' ? 'contract not deployed' : d.forseti.status.toLowerCase()}.<br />No Tide signature generated. Decisions above are simulated.</>}
        </div>
      </div>
    </section>
  )
}

// ---- 03 executor verdict (paper) ----

export function ExecutorVerdict({ d, busy, onExecute }: { d: Detail; busy: boolean; onExecute: () => void }) {
  const rej = lastExecutorRejection(d.events)
  const ex = executorState(d.settlement, rej)
  const live = isLive(d)
  return (
    <section aria-labelledby="zone-executor" className="inspection-column execution-col">
      <span id="zone-executor" className="sr-only">03 Executor verdict</span>
      <Eyebrow n="03" title="Executor verdict" />
      <div className="column-content">
        <span className="mono muted">Independent executor</span>
        <strong className="exec-verdict" data-tone={ex.tone} data-testid="executor-verdict">{ex.label}</strong>
        <p className="exec-detail">{ex.detail}{rej && !d.settlement && <><br /><code className="font-mono font-semibold text-danger-ink">{rej.reason} · {utc(rej.ts)}</code></>}</p>
        <dl className="m-0">
          <div className="fieldline"><dt>Tide signature</dt><dd>{live ? 'VERIFIED · PINNED KEY' : 'NOT ISSUED'}</dd></div>
          <div className="fieldline"><dt>Crypto verification</dt><dd>{live ? 'Ed25519 over challenge bytes' : 'NOT AVAILABLE'}</dd></div>
          <div className="fieldline"><dt>Settlement</dt><dd>{d.settlement ? (live ? 'MOCK RAIL · VERIFIED' : 'SIMULATED · MOCK RAIL') : 'NOT EXECUTED'}</dd></div>
          <div className="fieldline"><dt>Nonce</dt><dd>{d.settlement ? 'CONSUMED' : 'UNCONSUMED'}</dd></div>
          <div className="fieldline"><dt>Funds moved</dt><dd>$0.00</dd></div>
        </dl>
        <div className="spacer-line" />
        <button type="button" className="btn-ink w-full" onClick={onExecute} disabled={busy}>
          {busy ? <><span>Executor verifying…</span><Spinner /></> : <><span>{d.authorityMode === 'live' ? 'Submit to executor' : 'Simulate settlement'}</span><span aria-hidden>↗</span></>}
        </button>
        <p className="fine-label mt-3">The executor ignores every status on this page: it re-hashes the frozen bytes and re-checks policy, approvals bound to this hash, expiry and the nonce.</p>
      </div>
    </section>
  )
}

export function BoundaryRule({ id }: { id: string }) {
  return (
    <div className="inspector-foot">
      <span className="mono">Boundary rule</span>
      <p>No matching, verified Tide signature, no protected action. Simulated results are never presented as live Tide verification.</p>
      <Link className="text-button" href={`/audit?tx=${id}`}>Open evidence log ↗</Link>
    </div>
  )
}

// ---- proof, negative tests, trail ----

export function ProofDisclosure({ d }: { d: Detail }) {
  const live = isLive(d)
  return (
    <section aria-labelledby="proof-h" className="ruled-section">
      <div className="section-head small"><h2 id="proof-h">Immutable request</h2><span className="mono subtle-label">Evidence</span></div>
      <dl className="kv">
        <div><dt>Frozen SHA-256</dt><dd><HashWithCopy value={d.sha256} label="transaction SHA-256" /></dd></div>
        <div><dt>Agreement SHA-256</dt><dd><HashWithCopy value={d.tx.agreementSha256} label="agreement SHA-256" /></dd></div>
        <div><dt>Nonce (single use)</dt><dd><HashWithCopy value={d.tx.nonce} label="nonce" /></dd></div>
        <div><dt>Domain</dt><dd className="hash">{d.tx.domain}</dd></div>
        <div><dt>Contract id <SourceTag simulated>Computed · not deployed</SourceTag></dt><dd><HashWithCopy value={d.tx.tideContractId} label="contract id" /></dd></div>
      </dl>
      {live && d.trustedKey ? (
        <Notice tone="verified" title="Tide signature verified by the executor">
          Pinned key <code className="font-mono">{d.trustedKey.keyId}</code> · SPKI fingerprint <HashWithCopy value={d.trustedKey.fingerprint} label="key fingerprint" /> · source {d.trustedKey.source}
        </Notice>
      ) : (
        <Notice title="No Tide signature available">
          No real Tide signature exists for this transaction, so no proof, key fingerprint or verifier receipt is shown. A candidate Tide key is pinned in executor config but has not verified any signature.
        </Notice>
      )}
      <Disclosure summary="Canonical transaction (exact signed bytes)">
        <p className="m-0 font-mono">challenge = &quot;COVENANT/TXN/V1\n&quot; ‖ RFC 8785 canonical JSON</p>
        <pre>{d.canonical}</pre>
      </Disclosure>
    </section>
  )
}

const refused = (body: any): boolean | undefined => (body?.attempts ? body.attempts.every((a: any) => a.verdict?.ok === false) : undefined)

export function ActionResultView({ r }: { r: ActionResult }) {
  const b = r.body ?? {}
  if (b.attempts) {
    const allRefused = refused(b)
    return (
      <div className="result-line" data-tone={allRefused ? 'info' : 'danger'}>
        <strong>{r.title}: {allRefused ? 'every attempt refused (expected)' : 'AN ATTEMPT WAS ACCEPTED: investigate'}</strong>
        <ul>
          {b.attempts.map((a: any) => (
            <li key={a.name} className="flex flex-wrap items-center gap-2">
              <span>{a.name}</span>
              {a.verdict?.ok === false ? <StatusTag tone="info" compact>Refused · {a.verdict.reason}</StatusTag> : <StatusTag tone="danger" compact>Accepted</StatusTag>}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (b.ok === true && b.receipt) {
    const live = b.receipt.assurance === LIVE_ASSURANCE
    return (
      <div className="result-line" data-tone={live ? 'verified' : 'info'}>
        <strong>{live ? 'Executor verified a Tide signature' : 'SIMULATED SETTLEMENT'} · {usd(b.receipt.amountMinor)} to <span className="font-mono">{b.receipt.beneficiaryId}</span></strong>
        Assurance {b.receipt.assurance}. Mock rail: no funds moved.
      </div>
    )
  }
  if (b.ok === true) return <div className="result-line"><strong>{r.title}: recorded.</strong></div>
  const code = r.status === 401 ? 'NOT_AUTHENTICATED' : b.reason ?? b.error ?? `HTTP_${r.status}`
  return (
    <div className="result-line" data-tone="danger">
      <strong>{r.title}: REJECTED <code>{code}</code></strong>
      {reasonText(code)}{b.detail ? ` (${b.detail})` : ''}{b.hint ? ` ${b.hint}` : ''}
    </div>
  )
}

export function NegativeTests({ d, busy, onRun }: { d: Detail; busy: boolean; onRun: (kind: 'forge' | 'tamper' | 'replay', title: string) => void }) {
  const expired = new Date().toISOString() > d.tx.expiresAt
  return (
    <section aria-labelledby="neg-h" className="ruled-section">
      <div className="section-head small"><h2 id="neg-h">Negative tests</h2><span className="mono subtle-label">POST /attack</span></div>
      <p>Drills run on the server against the real executor. Forge and tamper verify hostile copies and never modify this transaction; replay re-submits a settled one. A refused attempt is the expected result.</p>
      <div className="drills">
        <button type="button" className="btn-line fail" disabled={busy} onClick={() => onRun('forge', 'Forge a signature')}>Forge signature</button>
        <button type="button" className="btn-line fail" disabled={busy} onClick={() => onRun('tamper', 'Tamper after freeze')}>Tamper payload</button>
        <button type="button" className="btn-line fail" disabled={busy || !d.settlement} onClick={() => onRun('replay', 'Replay settlement')} aria-describedby="replay-why">Replay</button>
      </div>
      <p id="replay-why" className="footnote">
        {d.settlement ? 'Replay re-submits this settled transaction; the consumed nonce must be refused (NONCE_REPLAY).' : 'Replay is disabled until this transaction has a settlement to replay.'}
        {' '}Expiry: {expired ? 'the 10-minute window has passed; the executor now refuses with EXPIRED_AUTH.' : `after ${utc(d.tx.expiresAt)} the executor refuses with EXPIRED_AUTH.`}
      </p>
    </section>
  )
}

export function EventTimeline({ d }: { d: Detail }) {
  return (
    <section aria-labelledby="trail-h" className="ruled-section">
      <div className="section-head small"><h2 id="trail-h">Authorization trail</h2><Link href={`/audit?tx=${d.id}`} className="text-button">Evidence log ↗</Link></div>
      {d.events.length === 0 ? <p>No events recorded.</p> : (
        <ol className="timeline">
          {d.events.map((e) => {
            const src = auditSource(e)
            return (
              <li key={e.seq}>
                <b>{e.type}</b>
                <StatusTag tone={decisionTone(e.decision)} compact>{e.decision}</StatusTag>
                <span>{utc(e.ts)} · {e.actor}{e.reason && <> · <code className="text-danger-ink">{e.reason}</code></>} · <SourceTag simulated={src.simulated}>{src.label}</SourceTag></span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export function TamperedView({ d, busy, result, onExecute }: { d: { canonical: string; sha256: string }; busy: boolean; result: ActionResult | null; onExecute: () => void }) {
  return (
    <section aria-labelledby="tamper-h" className="ruled-section">
      <div className="section-head small"><h2 id="tamper-h" className="text-danger-ink">Integrity failure</h2><StatusTag tone="danger">Tampered</StatusTag></div>
      <Notice tone="danger" title="Stored bytes were edited outside the app (PAYLOAD_TAMPERED / INVALID_SCHEMA)">
        The executor refuses this row. Try it: the request will be rejected and the rejection recorded.
      </Notice>
      <button type="button" className="btn-ink mt-6" disabled={busy} onClick={onExecute}>{busy ? <>Executor verifying… <Spinner /></> : <>Submit to executor anyway <span aria-hidden>↗</span></>}</button>
      <div aria-live="polite" className="mt-6 empty:hidden">{result && <ActionResultView r={result} />}</div>
      <Disclosure summary="Stored bytes"><pre>{d.canonical}</pre></Disclosure>
    </section>
  )
}
