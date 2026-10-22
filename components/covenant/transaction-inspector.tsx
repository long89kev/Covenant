'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, Ban, Bot, Check, CircleDashed, Clock, Fingerprint, Gavel, Play, Repeat, ShieldCheck, Swords, UserCheck, Wrench, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  AUTO_LIMIT_MINOR, LIVE_ASSURANCE, OUTCOME_LABEL, OUTCOME_TONE, auditSource, decisionTone, executorState, lastExecutorRejection, policyChecks,
  reasonText, short, txRef, txStatus, usd, utc,
  type AuditEvent, type CheckOutcome, type PolicyResult, type Settlement, type Tone,
} from '@/lib/ui/model'
import { DataRow, Disclosure, HashWithCopy, Panel, PanelHead, SecurityEmptyState, SourceBadge, Spinner, StatusPill, TONE_ICON, TONE_PANEL, TONE_TEXT } from './primitives'

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

const CHECK_ICON: Record<CheckOutcome, typeof Check> = { FAIL: X, PENDING: Clock, PASS_SIMULATED: Check, NOT_APPLICABLE: CircleDashed, NOT_EVALUATED: CircleDashed }

function ZoneHead({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-micro font-bold tracking-[0.12em] text-ink-secondary uppercase">{n} / {title}</h2>
      {children}
    </div>
  )
}

// ---- header + primary verdict (first on mobile) ----

export function InspectorHeader({ d }: { d: Detail }) {
  const live = d.settlement?.assurance === LIVE_ASSURANCE
  const s = txStatus(d.status, d.settlement?.assurance, d.policy.decision)
  const ex = executorState(d.settlement, lastExecutorRejection(d.events))
  return (
    <section aria-label="Transaction summary" className="card mb-5 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Frozen transaction</p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-h2 font-bold text-ink">{txRef(d.id)}</span>
            <StatusPill tone={s.tone}>{s.label}</StatusPill>
          </p>
          <p className="mt-1 text-ink-secondary">
            {d.tx.buyerOrgId} → {d.tx.vendorOrgId} · <span className="font-mono">{d.tx.invoiceId}</span> · requested by {d.requester}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-[28px] leading-9 font-bold text-ink tabular-nums">{usd(d.tx.amountMinor)}</p>
          <p className="text-micro font-semibold tracking-[0.08em] text-ink-muted uppercase">{d.tx.currency} · synthetic data</p>
        </div>
      </div>
      <dl className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-3">
        <div><dt className="text-small text-ink-muted">Executor verdict</dt><dd className="mt-0.5"><StatusPill tone={ex.tone}>{ex.label}</StatusPill></dd></div>
        <div><dt className="text-small text-ink-muted">Signed payload</dt><dd className="mt-0.5 font-semibold">{live ? 'Tide signature verified by executor' : 'NONE · no Tide signature'}</dd></div>
        <div><dt className="text-small text-ink-muted">Authorization window</dt><dd className="mt-0.5 font-semibold">expires {utc(d.tx.expiresAt)}</dd></div>
      </dl>
    </section>
  )
}

// ---- 01 proposed ----

export function ProposedZone({ d }: { d: Detail }) {
  const agreed = d.negotiation.agreement
  const over = d.tx.amountMinor - agreed.totalMinor
  const payeeChanged = d.tx.beneficiaryId !== agreed.beneficiaryId
  return (
    <section aria-labelledby="zone-proposed" className="card flex flex-col p-5 sm:p-6">
      <span id="zone-proposed" className="sr-only">AI proposed</span>
      <ZoneHead n="01" title="AI proposed"><StatusPill tone="neutral"><Bot className="size-3" /> Not trusted</StatusPill></ZoneHead>
      <p className={cn('text-[30px] leading-[38px] font-bold tabular-nums', over !== 0 ? 'text-danger-ink' : 'text-ink')}>{usd(d.tx.amountMinor)}</p>
      <p className="mb-3 text-ink-secondary">AI-produced payment proposal</p>
      <dl>
        <DataRow k="Agreed payment">{usd(agreed.totalMinor)}</DataRow>
        <DataRow k="Vendor" className="font-mono text-small">{d.tx.vendorOrgId}</DataRow>
        <DataRow k="Beneficiary" className={cn('font-mono text-small break-all', payeeChanged && 'text-danger-ink')}>{d.tx.beneficiaryId}</DataRow>
        <DataRow k="Source">{d.proposal.extractedFromUntrustedDocument ? 'Untrusted invoice' : 'Agent'}</DataRow>
        <DataRow k="Frozen">{utc(d.tx.issuedAt)}</DataRow>
      </dl>
      {(over !== 0 || payeeChanged) && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger-soft p-3.5">
          <p className="text-small font-bold tracking-[0.06em] text-danger-ink uppercase">Agreement mismatch</p>
          {over !== 0 && <p className="mt-1 text-ink">AI request {over > 0 ? 'exceeds' : 'is below'} the agreed payment by <b>{usd(Math.abs(over))}</b>.</p>}
          {payeeChanged && <p className="mt-1 text-ink">Beneficiary changed from <span className="font-mono">{agreed.beneficiaryId}</span> to <b className="font-mono break-all">{d.tx.beneficiaryId}</b>.</p>}
        </div>
      )}
      <Disclosure className="mt-4" summary={d.negotiation.injectionDetected ? 'Why the agent asked for this' : "Agent's rationale"}>
        <p className="text-ink-secondary">“{d.proposal.agentRationale}”</p>
        {d.negotiation.injectionDetected && (
          <pre className="mt-2 rounded-lg border border-dashed border-danger/40 bg-danger-soft p-3 font-mono text-small whitespace-pre-wrap text-danger-ink">
            {d.negotiation.scenario.invoiceText.split('\n').slice(4).join('\n')}
          </pre>
        )}
      </Disclosure>
    </section>
  )
}

// ---- 02 authority ----

export function PolicyEvaluationPanel({ d }: { d: Detail }) {
  const rows = policyChecks(d.tx.amountMinor, d.policy)
  return (
    <div>
      <ul className="flex flex-col" aria-label="Policy checks">
        {rows.map((r) => {
          const tone = OUTCOME_TONE[r.outcome]
          const Icon = CHECK_ICON[r.outcome]
          return (
            <li key={r.id} className="flex items-start gap-2.5 border-b border-border py-2.5 last:border-b-0">
              <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', TONE_TEXT[tone])} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{r.label}</p>
                {r.reasons.map((code) => <p key={code} className="text-small text-ink-secondary"><code className="font-mono font-semibold text-danger-ink">{code}</code> · {reasonText(code)}</p>)}
                {r.note && <p className="text-small text-ink-muted">{r.note}</p>}
              </div>
              <span className={cn('shrink-0 text-micro font-bold tracking-[0.04em] uppercase', TONE_TEXT[tone])}>{OUTCOME_LABEL[r.outcome]}</span>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-small text-ink-muted">Evidence source <SourceBadge simulated>Reference evaluator · not Forseti</SourceBadge></p>
    </div>
  )
}

export function ApprovalMatrix({ d, canApprove, busy, onApprove }: { d: Detail; canApprove: (role: string) => boolean; busy: boolean; onApprove: (role: string, label: string) => void }) {
  const slots = [{ role: FINANCE, label: 'Finance' }, { role: PROCUREMENT, label: 'Procurement' }]
  if (d.tx.amountMinor <= AUTO_LIMIT_MINOR) {
    return <p className="rounded-xl border border-border bg-subtle p-3 text-ink-secondary">Business approvals not required: {usd(d.tx.amountMinor)} is within the {usd(AUTO_LIMIT_MINOR)} auto band.</p>
  }
  return (
    <div>
      <ul className="flex flex-col gap-2" aria-label="Business approvals">
        {slots.map(({ role, label }) => {
          const a = d.approvals.find((x) => x.role === role)
          const allowed = canApprove(role)
          return (
            <li key={role} className={cn('rounded-xl border p-3', a ? 'border-cobalt/25 bg-cobalt-soft/50' : 'border-dashed border-border-strong')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">{label} <span className="font-mono text-small font-normal text-ink-muted">{role}</span></p>
                {a ? <StatusPill tone="info"><UserCheck className="size-3" /> Recorded · simulated</StatusPill>
                  : d.policy.decision === 'DENY' ? <StatusPill tone="neutral">Not evaluated · denied</StatusPill> : <StatusPill tone="pending">Awaiting</StatusPill>}
              </div>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-small">
                <dt className="text-ink-muted">Organization</dt><dd>{d.tx.buyerOrgId}</dd>
                <dt className="text-ink-muted">Approver</dt><dd className="font-semibold">{a ? a.username : '—'}</dd>
                <dt className="text-ink-muted">Identity</dt><dd>TideCloak-verified token role</dd>
                <dt className="text-ink-muted">Signed evidence</dt><dd>None: app-recorded, not a Forseti approver proof{a && <> · bound to <code className="font-mono">{short(a.txSha256, 10)}</code></>}</dd>
              </dl>
              {!a && (
                <div className="mt-2.5">
                  <Button size="sm" variant="outline" disabled={busy || !allowed} onClick={() => onApprove(role, label)} aria-describedby={allowed ? undefined : `why-${role}`}>
                    Approve as {label}
                  </Button>
                  {!allowed && <p id={`why-${role}`} className="mt-1 text-small text-ink-muted">Disabled: your Tide token does not carry <code className="font-mono">{role}</code>. The server refuses it anyway (ROLE_FORBIDDEN).</p>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-small text-ink-muted">
        Two different people, neither the requester. Granting either role is a QEA-governed change in TideCloak.
        {d.policy.decision === 'DENY' && ' Approvals cannot rescue a denied payload: the executor re-checks the data rules first.'}
      </p>
    </div>
  )
}

export function AuthorityZone({ d, children }: { d: Detail; children: ReactNode }) {
  const live = d.settlement?.assurance === LIVE_ASSURANCE
  return (
    <section aria-labelledby="zone-authority" className="card flex flex-col p-5 sm:p-6">
      <span id="zone-authority" className="sr-only">Authority gate</span>
      <ZoneHead n="02" title="Authority gate">
        {live ? <StatusPill tone="verified">Live verified</StatusPill> : <StatusPill tone="pending">Simulated rules</StatusPill>}
      </ZoneHead>
      <h3 className="text-h3 font-bold text-ink">Procurement policy <span className="font-mono text-body font-semibold text-ink-secondary">{d.tx.policyVersion}</span></h3>
      <p className="mb-3 text-ink-secondary">Only the live Forseti path can produce Tide-backed authority. Requester identity: TideCloak-verified login ({d.requester}).</p>
      <PolicyEvaluationPanel d={d} />
      <h3 className="mt-5 mb-2 font-bold text-ink">Business approvals</h3>
      {children}
      <div className={cn('mt-5 rounded-xl border p-3.5', live ? TONE_PANEL.verified : 'border-border bg-subtle')}>
        <p className="font-bold text-ink">Signer source: {live ? 'Tide signature from the pinned key' : `Forseti ${d.forseti.status === 'BLOCKED' ? 'not deployed' : d.forseti.status}`}</p>
        <p className="mt-1 text-ink-secondary">
          {live
            ? 'The independent executor verified a Tide signature over these exact bytes.'
            : 'No Tide contract decision or threshold signature has been observed for this transaction. Decisions above are SIMULATED.'}
        </p>
      </div>
    </section>
  )
}

// ---- 03 executor ----

export function ExecutorVerdict({ d, busy, onExecute }: { d: Detail; busy: boolean; onExecute: () => void }) {
  const rej = lastExecutorRejection(d.events)
  const ex = executorState(d.settlement, rej)
  const Icon = ex.tone === 'danger' ? Ban : TONE_ICON[ex.tone]
  const live = d.settlement?.assurance === LIVE_ASSURANCE
  return (
    <section aria-labelledby="zone-executor" className="card flex flex-col p-5 sm:p-6 lg:col-span-2 xl:col-span-1">
      <span id="zone-executor" className="sr-only">Independent executor</span>
      <ZoneHead n="03" title="Independent executor"><StatusPill tone={ex.tone}>{ex.label}</StatusPill></ZoneHead>
      <div className={cn('flex flex-col items-center rounded-xl border p-5 text-center', TONE_PANEL[ex.tone])} data-testid="executor-verdict">
        <Icon aria-hidden className={cn('size-8', TONE_TEXT[ex.tone])} />
        <p className={cn('mt-2 text-h3 font-bold', TONE_TEXT[ex.tone])}>{ex.label}</p>
        <p className="mt-1 text-ink">{ex.detail}</p>
        {rej && !d.settlement && <p className="mt-1 font-mono text-small font-semibold text-danger-ink">{rej.reason} · {utc(rej.ts)}</p>}
      </div>
      <dl className="mt-4">
        <DataRow k="Tide signature">{live ? 'Verified (pinned key)' : 'None'}</DataRow>
        <DataRow k="Crypto verification">{live ? 'Ed25519 over exact challenge bytes' : 'Not available'}</DataRow>
        <DataRow k="Nonce">{d.settlement ? 'Consumed by settlement' : 'Unconsumed'}</DataRow>
        <DataRow k="Funds moved">$0.00 · mock rail</DataRow>
      </dl>
      <Button size="lg" className="mt-4 w-full" onClick={onExecute} disabled={busy}>
        {busy ? <><Spinner /> Executor verifying…</> : <><Play /> Simulate settlement</>}
      </Button>
      <p className="mt-2 text-small text-ink-muted">
        The executor ignores every status shown on this page: it re-hashes the frozen bytes, re-checks policy, approvals bound to this hash, expiry and the nonce. The UI never marks a transaction authorized on its own.
      </p>
    </section>
  )
}

// ---- proof, negative tests, trail ----

export function ProofDisclosure({ d }: { d: Detail }) {
  const live = d.settlement?.assurance === LIVE_ASSURANCE
  return (
    <Panel labelledBy="proof-h">
      <PanelHead id="proof-h" title="Immutable request / evidence" />
      <div className="flex flex-col gap-3">
        <dl className="rounded-xl border border-border px-4">
          <DataRow k="Frozen SHA-256"><HashWithCopy value={d.sha256} label="transaction SHA-256" /></DataRow>
          <DataRow k="Agreement SHA-256"><HashWithCopy value={d.tx.agreementSha256} label="agreement SHA-256" /></DataRow>
          <DataRow k="Nonce (single use)"><HashWithCopy value={d.tx.nonce} label="nonce" /></DataRow>
          <DataRow k="Domain" className="font-mono text-small">{d.tx.domain}</DataRow>
          <DataRow k="Contract id">
            <span className="flex flex-col items-end gap-1"><HashWithCopy value={d.tx.tideContractId} label="contract id" /><StatusPill tone="pending" icon={false}>Computed · not deployed</StatusPill></span>
          </DataRow>
        </dl>
        {live && d.trustedKey ? (
          <SecurityEmptyState icon={ShieldCheck} tone="verified" title="Tide signature verified by the executor">
            Pinned key <code className="font-mono">{d.trustedKey.keyId}</code> · SPKI fingerprint <HashWithCopy value={d.trustedKey.fingerprint} label="key fingerprint" /> · source {d.trustedKey.source}
          </SecurityEmptyState>
        ) : (
          <SecurityEmptyState icon={Fingerprint} title="NO TIDE SIGNATURE AVAILABLE">
            No real Tide signature exists for this transaction, so no proof, key fingerprint or verifier receipt is shown. A candidate Tide key is pinned in executor config but has not verified any signature.
          </SecurityEmptyState>
        )}
        <Disclosure summary="Canonical transaction (exact signed bytes)">
          <p className="mb-2 font-mono text-small text-ink-secondary">challenge = &quot;COVENANT/TXN/V1\n&quot; ‖ RFC 8785 canonical JSON</p>
          <pre className="max-h-72 overflow-auto rounded-lg bg-subtle p-3 font-mono text-small break-all whitespace-pre-wrap text-ink">{d.canonical}</pre>
        </Disclosure>
      </div>
    </Panel>
  )
}

const refused = (body: any): boolean | undefined => (body?.attempts ? body.attempts.every((a: any) => a.verdict?.ok === false) : undefined)

export function ActionResultView({ r }: { r: ActionResult }) {
  const b = r.body ?? {}
  if (b.attempts) {
    const allRefused = refused(b)
    return (
      <div className={cn('rounded-xl border p-3.5', allRefused ? TONE_PANEL.info : TONE_PANEL.danger)}>
        <p className={cn('font-bold', allRefused ? 'text-cobalt-ink' : 'text-danger-ink')}>{r.title}: {allRefused ? 'every attempt refused (expected)' : 'AN ATTEMPT WAS ACCEPTED: investigate'}</p>
        <ul className="mt-1.5 flex flex-col gap-1">
          {b.attempts.map((a: any) => (
            <li key={a.name} className="flex flex-wrap items-center gap-2">
              <span>{a.name}</span>
              {a.verdict?.ok === false ? <StatusPill tone="info" icon={false}>Refused · {a.verdict.reason}</StatusPill> : <StatusPill tone="danger">Accepted</StatusPill>}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (b.ok === true && b.receipt) {
    const live = b.receipt.assurance === LIVE_ASSURANCE
    return (
      <div className={cn('rounded-xl border p-3.5', live ? TONE_PANEL.verified : TONE_PANEL.info)}>
        <p className={cn('font-bold', live ? 'text-teal-ink' : 'text-cobalt-ink')}>{live ? 'Executor verified a Tide signature' : 'SIMULATED SETTLEMENT'} · {usd(b.receipt.amountMinor)} to <span className="font-mono">{b.receipt.beneficiaryId}</span></p>
        <p className="text-ink-secondary">Assurance {b.receipt.assurance}. Mock rail: no funds moved.</p>
      </div>
    )
  }
  if (b.ok === true) return <div className={cn('rounded-xl border p-3.5 font-semibold', TONE_PANEL.info)}>{r.title}: recorded.</div>
  const code = r.status === 401 ? 'NOT_AUTHENTICATED' : b.reason ?? b.error ?? `HTTP_${r.status}`
  return (
    <div className={cn('rounded-xl border p-3.5', TONE_PANEL.danger)}>
      <p className="font-bold text-danger-ink">{r.title}: REJECTED <code className="font-mono">{code}</code></p>
      <p className="text-ink">{reasonText(code)}{b.detail ? ` (${b.detail})` : ''}{b.hint ? ` ${b.hint}` : ''}</p>
    </div>
  )
}

export function NegativeTests({ d, busy, onRun }: { d: Detail; busy: boolean; onRun: (kind: 'forge' | 'tamper' | 'replay', title: string) => void }) {
  const expired = new Date().toISOString() > d.tx.expiresAt
  return (
    <Panel labelledBy="neg-h">
      <PanelHead id="neg-h" title={<span className="flex items-center gap-2"><Swords aria-hidden className="size-4 text-danger" /> Negative tests</span>}>
        <SourceBadge>POST /api/transactions/{'{id}'}/attack</SourceBadge>
      </PanelHead>
      <p className="mb-3 text-ink-secondary">Drills run on the server against the real executor. Forge and tamper verify hostile copies and never modify this transaction; replay re-submits a settled one. A refused attempt is the expected result.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" disabled={busy} onClick={() => onRun('forge', 'Forge a signature')}><Fingerprint /> Forge signature</Button>
        <Button variant="destructive" disabled={busy} onClick={() => onRun('tamper', 'Tamper after freeze')}><Wrench /> Tamper payload</Button>
        <Button variant="destructive" disabled={busy || !d.settlement} onClick={() => onRun('replay', 'Replay settlement')} aria-describedby="replay-why"><Repeat /> Replay</Button>
      </div>
      <p id="replay-why" className="mt-2 text-small text-ink-muted">
        {d.settlement ? 'Replay re-submits this settled transaction; the consumed nonce must be refused (NONCE_REPLAY).' : 'Replay is disabled until this transaction has a settlement to replay.'}
        {' '}Expiry: {expired ? 'the 10-minute window has passed; the executor now refuses with EXPIRED_AUTH.' : `after ${utc(d.tx.expiresAt)} the executor refuses with EXPIRED_AUTH.`}
      </p>
    </Panel>
  )
}

export function EventTimeline({ d }: { d: Detail }) {
  return (
    <Panel labelledBy="trail-h">
      <PanelHead id="trail-h" title="Authorization trail">
        <Link href={`/audit?tx=${d.id}`} className="inline-flex min-h-10 items-center gap-1 font-semibold text-cobalt-ink hover:underline">Open audit trail <ArrowRight aria-hidden className="size-4" /></Link>
      </PanelHead>
      {d.events.length === 0 ? <p className="text-ink-secondary">No events recorded.</p> : (
        <ol className="relative ml-1 border-l border-border">
          {d.events.map((e) => {
            const tone: Tone = decisionTone(e.decision)
            const src = auditSource(e)
            return (
              <li key={e.seq} className="relative pb-4 pl-5 last:pb-0">
                <span aria-hidden className={cn('absolute top-1.5 -left-[5px] size-2.5 rounded-full ring-4 ring-card', tone === 'danger' ? 'bg-danger' : tone === 'pending' ? 'bg-warning' : tone === 'info' ? 'bg-cobalt' : 'bg-neutral')} />
                <p className="font-semibold break-words text-ink">{e.type} <span className={cn('text-small font-bold', TONE_TEXT[tone])}>{e.decision}</span></p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-small text-ink-muted">
                  {utc(e.ts)} · {e.actor}{e.reason && <code className="font-mono text-danger-ink">{e.reason}</code>} <SourceBadge simulated={src.simulated}>{src.label}</SourceBadge>
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}

export function TamperedView({ d, busy, result, onExecute }: { d: { canonical: string; sha256: string }; busy: boolean; result: ActionResult | null; onExecute: () => void }) {
  return (
    <Panel labelledBy="tamper-h">
      <PanelHead id="tamper-h" title="Integrity failure"><StatusPill tone="danger">Tampered</StatusPill></PanelHead>
      <SecurityEmptyState icon={Gavel} tone="danger" title="Stored bytes were edited outside the app (PAYLOAD_TAMPERED / INVALID_SCHEMA)">
        The executor refuses this row. Try it: the request will be rejected and the rejection recorded.
      </SecurityEmptyState>
      <Button className="mt-4" disabled={busy} onClick={onExecute}>{busy ? <><Spinner /> Executor verifying…</> : <><Play /> Submit to executor anyway</>}</Button>
      <div aria-live="polite" className="mt-4 empty:hidden">{result && <ActionResultView r={result} />}</div>
      <Disclosure className="mt-4" summary="Stored bytes">
        <pre className="font-mono text-small break-all whitespace-pre-wrap">{d.canonical}</pre>
      </Disclosure>
    </Panel>
  )
}
