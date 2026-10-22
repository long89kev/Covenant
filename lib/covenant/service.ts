// Server-side orchestration used by the API routes. The proposal is always re-derived on the server
// from the scenario fixture; nothing the browser sends becomes transaction content.
import crypto from 'node:crypto'
import type { User } from '../auth.ts'
import { negotiate, type ScenarioId, SCENARIOS } from './agent.ts'
import { audit, getDb } from './db.ts'
import { BUYER_ORG, FINANCE_ROLE, PROCUREMENT_ROLE, evaluate, type Approval } from './policy.ts'
import { freeze, parseCanonical } from './tx.ts'

const tryParse = (canonical: string) => {
  try {
    return parseCanonical(canonical)
  } catch {
    return null
  }
}

export const isScenario = (s: unknown): s is ScenarioId => typeof s === 'string' && s in SCENARIOS

export function createTransaction(user: User, scenarioId: ScenarioId) {
  const db = getDb()
  const n = negotiate(scenarioId)
  const f = freeze(n.proposal, { buyerOrgId: BUYER_ORG, agreementSha256: n.agreementSha256 })
  const id = crypto.randomUUID()
  const policy = evaluate(f.tx, { txSha256: f.sha256, requester: user.sub, approvals: [], now: new Date() })
  const status = policy.decision === 'DENY' ? 'REJECTED' : policy.decision === 'NEEDS_APPROVAL' ? 'AWAITING_APPROVAL' : 'FROZEN'
  db.prepare(
    'INSERT INTO transactions (id, requestId, nonce, canonical, sha256, status, scenario, requester, requesterName, proposal, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
  ).run(id, f.tx.requestId, f.tx.nonce, f.canonical, f.sha256, status, scenarioId, user.sub, user.username, JSON.stringify(n.proposal), new Date().toISOString())
  audit(db, { actor: 'buyer-ai (simulated)', type: 'AGENT_PROPOSAL_CREATED', txId: id, decision: 'INFO', payloadHash: f.sha256, meta: { scenarioId, injectionDetected: n.injectionDetected, amountMinor: f.tx.amountMinor, beneficiaryId: f.tx.beneficiaryId } })
  audit(db, { actor: user.username, type: 'TX_FROZEN', txId: id, decision: 'INFO', payloadHash: f.sha256 })
  audit(db, { actor: 'reference-policy', type: 'SIMULATED_POLICY_DECISION', txId: id, decision: policy.decision, reason: policy.reasons.join(',') || undefined, payloadHash: f.sha256, meta: { note: 'Not Forseti: local reference evaluator' } })
  return id
}

export function listTransactions() {
  const db = getDb()
  const rows = db.prepare('SELECT id, canonical, status, scenario, requesterName, createdAt FROM transactions ORDER BY createdAt DESC LIMIT 50').all() as Record<string, any>[]
  const settled = db.prepare('SELECT txId, assurance, amountMinor FROM settlements').all() as Record<string, any>[]
  const assurance = new Map(settled.map((x) => [x.txId as string, x.assurance as string]))
  return {
    transactions: rows.map((r) => {
      const base = { id: r.id, scenario: r.scenario, requester: r.requesterName, createdAt: r.createdAt, assurance: assurance.get(r.id) ?? null }
      // A row edited behind the app's back must show up as evidence, not take the whole list down.
      const tx = tryParse(r.canonical)
      if (!tx) return { ...base, status: 'TAMPERED', amountMinor: 0, beneficiaryId: '?', invoiceId: '?' }
      return { ...base, status: r.status, amountMinor: tx.amountMinor, beneficiaryId: tx.beneficiaryId, invoiceId: tx.invoiceId }
    }),
    ledger: {
      settledCount: settled.length,
      settledMinor: settled.reduce((s, x) => s + Number(x.amountMinor), 0),
      // Counted from executor receipts, never from configuration.
      liveVerifiedCount: settled.filter((x) => x.assurance === 'TIDE_SIGNATURE_VERIFIED').length,
      simulatedCount: settled.filter((x) => x.assurance !== 'TIDE_SIGNATURE_VERIFIED').length,
    },
    rejectedAttempts: (db.prepare("SELECT COUNT(*) AS n FROM audit WHERE decision = 'REJECT'").get() as { n: number }).n,
  }
}

export function getDetail(id: string) {
  const db = getDb()
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Record<string, any> | undefined
  if (!row) return null
  const tx = tryParse(row.canonical)
  if (!tx) return { id, tampered: true as const, status: row.status, canonical: row.canonical as string, sha256: row.sha256 as string }
  const approvals = db.prepare('SELECT subject, username, role, txSha256, createdAt FROM approvals WHERE txId = ? ORDER BY createdAt').all(id) as Record<string, any>[]
  const settlement = db.prepare('SELECT * FROM settlements WHERE txId = ?').get(id) ?? null
  const events = db.prepare('SELECT seq, ts, actor, type, decision, reason, payloadHash, meta FROM audit WHERE txId = ? ORDER BY seq').all(id)
  const policy = evaluate(tx, { txSha256: row.sha256, requester: row.requester, approvals: approvals as unknown as Approval[], now: new Date() })
  return {
    id,
    scenario: row.scenario,
    status: row.status,
    requester: row.requesterName,
    tx,
    canonical: row.canonical,
    sha256: row.sha256,
    proposal: JSON.parse(row.proposal),
    negotiation: negotiate(row.scenario as ScenarioId),
    approvals: approvals.map(({ subject, ...a }) => ({ ...a, subjectHint: String(subject).slice(0, 8) })),
    policy,
    settlement,
    events,
  }
}

export type ApproveResult = { ok: true } | { ok: false; status: number; error: string }

// shortcut: approvals are app-DB rows (a compromised server can forge them), not Forseti approver dokens; upgrade when the contract is deployed (ValidateApprovers).
export function recordApproval(user: User, id: string, role: string): ApproveResult {
  if (role !== FINANCE_ROLE && role !== PROCUREMENT_ROLE) return { ok: false, status: 400, error: 'INVALID_SCHEMA' }
  // The role must be in the Tide-verified token; granting it to anyone is a QEA-governed change.
  if (!user.roles.includes(role)) return { ok: false, status: 403, error: 'ROLE_FORBIDDEN' }
  const db = getDb()
  const row = db.prepare('SELECT requester, sha256 FROM transactions WHERE id = ?').get(id) as Record<string, any> | undefined
  if (!row) return { ok: false, status: 404, error: 'NOT_FOUND' }
  if (row.requester === user.sub) {
    audit(db, { actor: user.username, type: 'APPROVAL_REJECTED', txId: id, decision: 'REJECT', reason: 'APPROVER_NOT_DISTINCT', payloadHash: row.sha256 })
    return { ok: false, status: 403, error: 'APPROVER_NOT_DISTINCT' }
  }
  try {
    db.prepare('INSERT INTO approvals (txId, subject, username, role, txSha256, createdAt) VALUES (?,?,?,?,?,?)').run(id, user.sub, user.username, role, row.sha256, new Date().toISOString())
  } catch {
    return { ok: false, status: 409, error: 'APPROVER_NOT_DISTINCT' }
  }
  audit(db, { actor: user.username, type: 'APPROVAL_RECORDED', txId: id, decision: 'INFO', payloadHash: row.sha256, meta: { role, assurance: 'Tide-authenticated identity, app-recorded (not a Forseti approver proof)' } })
  return { ok: true }
}
