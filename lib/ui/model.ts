// UI presentation model. Pure functions only (no React, no Node APIs) so the browser bundle and
// `node --test` share them. Nothing here authorizes anything: it maps trusted API responses onto
// labels and tones, and its rules make it impossible for the UI to call a simulated result verified.
// Teal ('verified') is reachable ONLY from an executor receipt whose assurance is TIDE_SIGNATURE_VERIFIED.

export type ScenarioId = 'legit_small_order' | 'injected_invoice' | 'exception_replenishment'
export const SCENARIO_IDS: ScenarioId[] = ['legit_small_order', 'injected_invoice', 'exception_replenishment']
export const isScenarioId = (s: unknown): s is ScenarioId => typeof s === 'string' && (SCENARIO_IDS as string[]).includes(s)

export type Tone = 'info' | 'pending' | 'danger' | 'neutral' | 'verified'

export const usd = (minor: number) =>
  `$${(minor / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const short = (h: string | null | undefined, n = 12) => (h ? (h.length > n ? `${h.slice(0, n)}…` : h) : '')
export const utc = (iso: string) => `${iso.replace('T', ' ').slice(0, 19)} UTC`
export const txRef = (id: string) => `TX-${id.slice(0, 8).toUpperCase()}`

// ---- API response shapes (mirrors of lib/covenant/service.ts and app/api/*) ----

export interface Health {
  authorityMode: string
  tidecloak: { status: string; realm: string }
  forseti: { status: string; reason: string; contractId: string }
  trustedKey: { keyId: string; source: string; fingerprint: string } | null
  executorSelfTest: string
  liveVerifiedCount: number
  qea: { status: string; note: string }
}

export interface TxRow {
  id: string
  scenario: string
  status: string
  requester: string
  createdAt: string
  amountMinor: number
  beneficiaryId: string
  invoiceId: string
  assurance: string | null
}

export interface TxList {
  transactions: TxRow[]
  ledger: { settledCount: number; settledMinor: number; liveVerifiedCount: number; simulatedCount: number }
  rejectedAttempts: number
}

export interface AuditEvent {
  seq: number
  ts: string
  actor: string
  type: string
  txId?: string | null
  decision: string
  reason: string | null
  payloadHash: string | null
  meta?: string | null
  hash?: string
}

export interface PolicyResult {
  decision: 'ALLOW' | 'DENY' | 'NEEDS_APPROVAL'
  reasons: string[]
  label: string
}

export interface Settlement {
  assurance: string
  createdAt: string
  amountMinor: number
  beneficiaryId: string
}

// ---- capability mode (global banner) ----

export type CapabilityMode = 'SIMULATED' | 'TIDE_CONNECTED_POLICY_UNVERIFIED' | 'LIVE_VERIFIED' | 'UNAVAILABLE'

// The app-level mode is never LIVE_VERIFIED: a live verification is a property of one transaction's
// executor receipt, shown on that transaction only. Anything unknown degrades to UNAVAILABLE.
export function capabilityMode(h: Health | null, failed: boolean): CapabilityMode | 'LOADING' {
  if (failed) return 'UNAVAILABLE'
  if (!h) return 'LOADING'
  if (h.authorityMode !== 'fallback' && h.authorityMode !== 'live') return 'UNAVAILABLE'
  if (h.tidecloak.status !== 'REACHABLE') return 'UNAVAILABLE'
  return h.authorityMode === 'fallback' ? 'SIMULATED' : 'TIDE_CONNECTED_POLICY_UNVERIFIED'
}

export const MODE_COPY: Record<CapabilityMode | 'LOADING', { pill: string; title: string; body: string; tone: Tone }> = {
  LOADING: {
    pill: 'CHECKING',
    title: 'Checking authority capability…',
    body: 'Until the probe answers, treat every decision on this page as simulated.',
    tone: 'neutral',
  },
  SIMULATED: {
    pill: 'SIMULATED',
    title: 'SIMULATED · No live Tide authorization',
    body:
      'TideCloak login and approver roles are real. Payment policy runs in a local reference evaluator because the Forseti signing contract is not deployed, and settlements go to a mock rail: no funds move.',
    tone: 'pending',
  },
  TIDE_CONNECTED_POLICY_UNVERIFIED: {
    pill: 'POLICY UNVERIFIED',
    title: 'TideCloak connected. Forseti policy signing has not been verified.',
    body: 'The executor settles only a Tide signature from the pinned key. No such signature has been observed by this app yet.',
    tone: 'pending',
  },
  LIVE_VERIFIED: {
    pill: 'LIVE VERIFIED',
    title: 'LIVE VERIFIED — A real Tide-origin signature has been independently checked for this exact transaction.',
    body: '',
    tone: 'verified',
  },
  UNAVAILABLE: {
    pill: 'UNAVAILABLE',
    title: 'AUTHORITY UNAVAILABLE — No protected action will execute while verification is offline.',
    body: 'The executor fails closed. Check that TideCloak is running and AUTHORITY_MODE is set, then reload.',
    tone: 'danger',
  },
}

export function unavailableReason(h: Health | null, failed: boolean): string {
  if (failed || !h) return 'HEALTH_PROBE_FAILED'
  if (h.authorityMode !== 'fallback' && h.authorityMode !== 'live') return 'EXECUTOR_UNCONFIGURED'
  if (h.tidecloak.status !== 'REACHABLE') return 'TIDE_UNAVAILABLE'
  return ''
}

// ---- scenarios (fixture metadata; amounts are cross-checked against lib/covenant/agent.ts in tests) ----

export interface ScenarioMeta {
  key: 'clean' | 'malicious_invoice' | 'escalation'
  title: string
  summary: string
  risk: 'Low' | 'Critical' | 'Elevated'
  agreedMinor: number
  proposedMinor: number
  expected: string
  cta: string
  tone: Tone
}

export const SCENARIO_META: Record<ScenarioId, ScenarioMeta> = {
  legit_small_order: {
    key: 'clean',
    title: 'Clean procurement',
    summary: 'Approved vendor · $1,200',
    risk: 'Low',
    agreedMinor: 120_000,
    proposedMinor: 120_000,
    expected: 'Illustrative policy pass — no live signature issued',
    cta: 'Run clean scenario',
    tone: 'info',
  },
  injected_invoice: {
    key: 'malicious_invoice',
    title: 'Malicious invoice',
    summary: 'Prompt injection changed $1,200 to $50,000 and replaced the beneficiary',
    risk: 'Critical',
    agreedMinor: 120_000,
    proposedMinor: 5_000_000,
    expected: 'Rejected by simulated rule checks',
    cta: 'Inject malicious invoice',
    tone: 'danger',
  },
  exception_replenishment: {
    key: 'escalation',
    title: 'Escalation attempt',
    summary: '$12,000 exceeds the auto-approval band',
    risk: 'Elevated',
    agreedMinor: 1_200_000,
    proposedMinor: 1_200_000,
    expected: 'Finance + Procurement required · awaiting verified approval evidence',
    cta: 'Run escalation scenario',
    tone: 'pending',
  },
}

export const scenarioTitle = (id: string) => (isScenarioId(id) ? SCENARIO_META[id].title : id)

// ---- transaction status ----

export const LIVE_ASSURANCE = 'TIDE_SIGNATURE_VERIFIED'

export function txStatus(status: string, assurance?: string | null, decision?: PolicyResult['decision']): { label: string; tone: Tone } {
  if (assurance === LIVE_ASSURANCE) return { label: 'LIVE SIGNATURE VERIFIED', tone: 'verified' }
  if (status === 'TAMPERED') return { label: 'TAMPERED', tone: 'danger' }
  if (assurance || status === 'SETTLED_SIMULATED') return { label: 'SIMULATED SETTLEMENT', tone: 'info' }
  // The stored status is a snapshot from freeze time; the current policy result wins when known.
  const d = decision ?? (status === 'REJECTED' ? 'DENY' : status === 'AWAITING_APPROVAL' ? 'NEEDS_APPROVAL' : status === 'FROZEN' ? 'ALLOW' : null)
  if (d === 'DENY') return { label: 'SIMULATED DENIAL', tone: 'danger' }
  if (d === 'NEEDS_APPROVAL') return { label: 'AWAITING APPROVALS', tone: 'pending' }
  if (d === 'ALLOW') return { label: 'SIMULATED PASS', tone: 'info' }
  return { label: status, tone: 'neutral' }
}

// ---- policy evaluation rows ----

export const AUTO_LIMIT_MINOR = 500_000
export const HARD_CAP_MINOR = 2_000_000

export type CheckOutcome = 'FAIL' | 'PENDING' | 'PASS_SIMULATED' | 'NOT_APPLICABLE' | 'NOT_EVALUATED'

export interface CheckRow {
  id: string
  label: string
  outcome: CheckOutcome
  reasons: string[]
  note?: string
}

export const OUTCOME_TONE: Record<CheckOutcome, Tone> = {
  FAIL: 'danger',
  PENDING: 'pending',
  PASS_SIMULATED: 'info', // a simulated pass is never green
  NOT_APPLICABLE: 'neutral',
  NOT_EVALUATED: 'neutral',
}

export const OUTCOME_LABEL: Record<CheckOutcome, string> = {
  FAIL: 'FAIL',
  PENDING: 'PENDING',
  PASS_SIMULATED: 'PASS · SIMULATED',
  NOT_APPLICABLE: 'NOT APPLICABLE',
  NOT_EVALUATED: 'NOT EVALUATED',
}

export function policyChecks(amountMinor: number, policy: PolicyResult): CheckRow[] {
  const has = (...codes: string[]) => policy.reasons.filter((r) => codes.includes(r))
  const data = (id: string, label: string, codes: string[]): CheckRow => {
    const hit = has(...codes)
    return { id, label, outcome: hit.length ? 'FAIL' : 'PASS_SIMULATED', reasons: hit }
  }
  const rows = [
    data('policy', 'Policy identity and domain', ['UNKNOWN_POLICY']),
    data('tenant', 'Buyer tenant', ['CROSS_TENANT']),
    data('amount', `Amount within ${usd(HARD_CAP_MINOR)} hard cap`, ['AMOUNT_OVER_CAP', 'INVALID_SCHEMA']),
    data('beneficiary', 'Beneficiary pinned for this vendor', ['BENEFICIARY_NOT_APPROVED']),
    data('window', 'Authorization window (10 min)', ['EXPIRED_AUTH']),
  ]
  let approvals: CheckRow
  if (amountMinor <= AUTO_LIMIT_MINOR) {
    approvals = { id: 'approvals', label: 'Business approvals', outcome: 'NOT_APPLICABLE', reasons: [], note: `Within the ${usd(AUTO_LIMIT_MINOR)} auto band` }
  } else if (policy.decision === 'DENY') {
    approvals = { id: 'approvals', label: 'Business approvals', outcome: 'NOT_EVALUATED', reasons: [], note: 'Denied before approvals were considered' }
  } else if (policy.decision === 'NEEDS_APPROVAL') {
    approvals = { id: 'approvals', label: 'Business approvals', outcome: 'PENDING', reasons: has('APPROVAL_REQUIRED', 'APPROVER_NOT_DISTINCT'), note: 'Finance + Procurement, two different people' }
  } else {
    approvals = { id: 'approvals', label: 'Business approvals', outcome: 'PASS_SIMULATED', reasons: [], note: 'App-recorded, not Forseti approver proofs' }
  }
  return [...rows, approvals]
}

export const REASON_TEXT: Record<string, string> = {
  AMOUNT_OVER_CAP: 'Amount is over the $20,000 hard cap',
  BENEFICIARY_NOT_APPROVED: 'Beneficiary is not the pinned account for this vendor',
  APPROVAL_REQUIRED: 'Needs a Finance and a Procurement approver',
  APPROVER_NOT_DISTINCT: 'Approvers must be two different people, neither the requester',
  EXPIRED_AUTH: 'The 10-minute authorization window has expired',
  UNKNOWN_POLICY: 'Policy identity or domain does not match',
  CROSS_TENANT: 'Buyer organisation is not this tenant',
  INVALID_SCHEMA: 'Payload failed schema validation',
  PAYLOAD_TAMPERED: 'Stored bytes no longer match the frozen hash',
  UNKNOWN_KEY: 'Signature key is not the pinned Tide key',
  INVALID_SIGNATURE: 'Signature does not verify over the exact challenge bytes',
  NONCE_REPLAY: 'This nonce was already settled',
  POLICY_DENIED: 'Policy refused the payload',
  ROLE_FORBIDDEN: 'Your Tide token does not carry that approver role',
  MODE_MISMATCH: 'Live mode settles only a real Tide signature',
  EXECUTOR_UNCONFIGURED: 'Executor has no authority mode configured; it fails closed',
  TIDE_UNAVAILABLE: 'TideCloak is not reachable',
  NOT_AUTHENTICATED: 'Your session is missing or expired. Log in again.',
  NOT_FOUND: 'No transaction with this id',
  NOT_SETTLED_YET: 'Replay needs a settled transaction first',
}

export const reasonText = (code: string) => REASON_TEXT[code] ?? code

// ---- executor ----

export interface ExecutorRejection {
  reason: string
  ts: string
}

export function lastExecutorRejection(events: AuditEvent[]): ExecutorRejection | null {
  const e = [...events].reverse().find((x) => x.type === 'EXECUTOR_REJECTED')
  return e ? { reason: e.reason ?? 'REJECTED', ts: e.ts } : null
}

export function executorState(settlement: Settlement | null, rejection: ExecutorRejection | null): { label: string; tone: Tone; detail: string } {
  if (settlement?.assurance === LIVE_ASSURANCE) {
    return { label: 'TIDE SIGNATURE VERIFIED', tone: 'verified', detail: 'Executor verified a Tide signature from the pinned key. Mock rail: no real payment.' }
  }
  if (settlement) {
    return { label: 'SIMULATED SETTLEMENT', tone: 'info', detail: 'Accepted under fallback authority (SIMULATED_AUTHORITY). Mock rail: no funds moved.' }
  }
  if (rejection) return { label: 'REJECTED', tone: 'danger', detail: reasonText(rejection.reason) }
  return { label: 'NOT EXECUTED', tone: 'neutral', detail: 'NO FUNDS MOVED (DEMO)' }
}

// ---- negotiation ----

export function invoiceLines(text: string, injected: boolean): { text: string; hostile: boolean }[] {
  const lines = text.split('\n')
  const blank = lines.findIndex((l) => l.trim() === '')
  return lines.map((t, i) => ({ text: t, hostile: injected && blank >= 0 && i > blank }))
}

export function proposalDiff(agreement: { totalMinor: number; beneficiaryId: string }, proposal: { amountMinor: number; beneficiaryId: string }) {
  return [
    { field: 'Amount', agreed: usd(agreement.totalMinor), proposed: usd(proposal.amountMinor), changed: agreement.totalMinor !== proposal.amountMinor },
    { field: 'Beneficiary', agreed: agreement.beneficiaryId, proposed: proposal.beneficiaryId, changed: agreement.beneficiaryId !== proposal.beneficiaryId },
  ]
}

// ---- audit ----

export const parseMeta = (m: string | null | undefined): Record<string, unknown> => {
  try {
    const v = JSON.parse(m ?? '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

export function auditSource(e: AuditEvent): { label: string; simulated: boolean; tone: Tone } {
  switch (e.type) {
    case 'AGENT_PROPOSAL_CREATED':
      return { label: 'SIMULATED AI', simulated: true, tone: 'pending' }
    case 'SIMULATED_POLICY_DECISION':
      return { label: 'SIMULATED POLICY', simulated: true, tone: 'pending' }
    case 'APPROVAL_RECORDED':
    case 'APPROVAL_REJECTED':
      return { label: 'APP RECORD · TIDE LOGIN', simulated: true, tone: 'pending' }
    case 'TX_FROZEN':
      return { label: 'APP · TIDE LOGIN', simulated: false, tone: 'neutral' }
    case 'EXECUTOR_REJECTED':
      return { label: 'EXECUTOR', simulated: false, tone: 'neutral' }
    case 'SETTLED_SIMULATED':
      return parseMeta(e.meta).assurance === LIVE_ASSURANCE
        ? { label: 'LIVE VERIFIED', simulated: false, tone: 'verified' }
        : { label: 'SIMULATED AUTHORITY', simulated: true, tone: 'pending' }
    case 'ATTACK_DRILL':
      return { label: 'NEGATIVE TEST', simulated: false, tone: 'neutral' }
    default:
      return { label: 'APP', simulated: false, tone: 'neutral' }
  }
}

export function decisionTone(d: string): Tone {
  if (d === 'REJECT' || d === 'DENY') return 'danger'
  if (d === 'NEEDS_APPROVAL') return 'pending'
  if (d === 'ACCEPT' || d === 'ALLOW') return 'info' // accepted under simulated authority unless the source says LIVE
  return 'neutral'
}

export interface AuditFilter {
  q: string
  decision: string
  type: string
  txId: string
}

export function filterAudit(events: AuditEvent[], f: AuditFilter): AuditEvent[] {
  const q = f.q.trim().toLowerCase()
  return events.filter(
    (e) =>
      (!f.decision || e.decision === f.decision) &&
      (!f.type || e.type === f.type) &&
      (!f.txId || e.txId === f.txId) &&
      (!q || [e.type, e.reason, e.actor, e.decision, e.txId, auditSource(e).label].join(' ').toLowerCase().includes(q)),
  )
}

const SYSTEM_ACTORS = new Set(['buyer-ai (simulated)', 'reference-policy'])
const META_ALLOW = ['scenarioId', 'injectionDetected', 'amountMinor', 'beneficiaryId', 'assurance', 'kind', 'name', 'role', 'authKind', 'detail']

// Export for judges/auditors: human usernames become stable pseudonyms, meta is allow-listed, and
// every row carries its provenance. The audit log never holds tokens or keys in the first place.
export function sanitizeAudit(events: AuditEvent[], chain: unknown, exportedAt: string) {
  const people = new Map<string, string>()
  const alias = (a: string) => {
    if (SYSTEM_ACTORS.has(a)) return a
    if (!people.has(a)) people.set(a, `user-${people.size + 1}`)
    return people.get(a)!
  }
  return {
    exportedAt,
    notice: 'Synthetic data. Payment authority is SIMULATED unless a row says LIVE VERIFIED. Usernames pseudonymised.',
    chain,
    events: events.map((e) => {
      const src = auditSource(e)
      const meta = parseMeta(e.meta)
      return {
        seq: e.seq,
        ts: e.ts,
        actor: alias(e.actor),
        type: e.type,
        txId: e.txId ?? null,
        decision: e.decision,
        reason: e.reason,
        payloadHash: e.payloadHash,
        hash: e.hash ?? null,
        source: src.label,
        simulated: src.simulated,
        meta: Object.fromEntries(Object.entries(meta).filter(([k]) => META_ALLOW.includes(k))),
      }
    }),
  }
}
