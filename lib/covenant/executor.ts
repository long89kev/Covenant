// Independent mock-rail executor. It is the only code that can create a settlement, and it trusts
// nothing the app tells it: not the transaction status, not a "this was approved" flag, not a public
// key supplied with the request. It re-hashes the frozen bytes, re-validates them, re-verifies the
// authorization, and consumes the nonce atomically. No money moves; settlements are synthetic.
import crypto from 'node:crypto'
import { audit, type Db } from './db.ts'
import { evaluate, type Approval } from './policy.ts'
import { challengeBytes, parseCanonical, sha256 } from './tx.ts'

export interface TrustedKey {
  keyId: string
  publicKey: crypto.KeyObject
  source: string
}

export type AuthorityMode = 'live' | 'fallback'

export interface ExecutorConfig {
  // live: only a Tide signature from a pinned key settles. fallback: the reference policy plus
  // Tide-authenticated approvals settles, and every receipt says SIMULATED_AUTHORITY.
  mode: AuthorityMode
  trustedKeys: TrustedKey[]
  now?: () => Date
}

export type Authorization =
  | { kind: 'tide-signature'; keyId: string; signatureB64: string; publicKeyB64?: string }
  | { kind: 'fallback' }

export type Assurance = 'TIDE_SIGNATURE_VERIFIED' | 'SIMULATED_AUTHORITY'

export type ExecutorReason =
  | 'NOT_FOUND'
  | 'PAYLOAD_TAMPERED'
  | 'INVALID_SCHEMA'
  | 'MODE_MISMATCH'
  | 'UNKNOWN_KEY'
  | 'INVALID_SIGNATURE'
  | 'POLICY_DENIED'
  | 'APPROVAL_REQUIRED'
  | 'NONCE_REPLAY'

export type Verdict =
  | { ok: true; receipt: { txId: string; nonce: string; payloadSha256: string; amountMinor: number; beneficiaryId: string; assurance: Assurance; settledAt: string } }
  | Rejection

export type Rejection = { ok: false; status: 403 | 404 | 409; reason: ExecutorReason; detail?: string }

export interface ExecutionInput {
  txId: string
  canonical: string
  storedSha256: string
  requester: string
  approvals: Approval[]
  auth: Authorization
}

// Pure verification: everything except the atomic nonce consumption.
export function verify(input: ExecutionInput, cfg: ExecutorConfig): Rejection | { ok: 'verified'; assurance: Assurance } {
  const now = (cfg.now ?? (() => new Date()))()
  if (sha256(input.canonical) !== input.storedSha256) return { ok: false, status: 403, reason: 'PAYLOAD_TAMPERED' }
  let tx
  try {
    tx = parseCanonical(input.canonical)
  } catch (e) {
    return { ok: false, status: 403, reason: 'INVALID_SCHEMA', detail: String((e as Error).message).slice(0, 200) }
  }

  let assurance: Assurance
  const auth = input.auth
  if (auth.kind === 'tide-signature') {
    // The trust anchor is the pinned registry. A publicKeyB64 sent along with the request is ignored.
    const key = cfg.trustedKeys.find((k) => k.keyId === auth.keyId)
    if (!key) return { ok: false, status: 403, reason: 'UNKNOWN_KEY' }
    let valid = false
    try {
      valid = crypto.verify(null, challengeBytes(input.canonical), key.publicKey, Buffer.from(auth.signatureB64, 'base64'))
    } catch {
      valid = false
    }
    if (!valid) return { ok: false, status: 403, reason: 'INVALID_SIGNATURE' }
    assurance = 'TIDE_SIGNATURE_VERIFIED'
  } else {
    if (cfg.mode !== 'fallback') return { ok: false, status: 403, reason: 'MODE_MISMATCH', detail: 'live mode settles only Tide signatures' }
    assurance = 'SIMULATED_AUTHORITY'
  }

  // Data rules apply on both paths (defence in depth; the deployed contract would enforce them too).
  // On the signature path approvals are the contract's job, so only data-level reasons block here.
  const policy = evaluate(tx, { txSha256: input.storedSha256, requester: input.requester, approvals: input.approvals, now })
  if (policy.decision === 'DENY') return { ok: false, status: 403, reason: 'POLICY_DENIED', detail: policy.reasons.join(',') }
  if (policy.decision === 'NEEDS_APPROVAL' && assurance === 'SIMULATED_AUTHORITY') {
    return { ok: false, status: 403, reason: 'APPROVAL_REQUIRED', detail: policy.reasons.join(',') }
  }
  return { ok: 'verified', assurance }
}

// Load from the store, verify, then settle atomically. Status flags in the DB are deliberately ignored.
export function execute(db: Db, txId: string, auth: Authorization, cfg: ExecutorConfig, actor: string): Verdict {
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId) as Record<string, any> | undefined
  if (!row) return { ok: false, status: 404, reason: 'NOT_FOUND' }
  const approvals = db.prepare('SELECT subject, role, txSha256 FROM approvals WHERE txId = ?').all(txId) as unknown as Approval[]
  const v = verify(
    { txId, canonical: row.canonical, storedSha256: row.sha256, requester: row.requester, approvals, auth },
    cfg,
  )
  if (v.ok !== 'verified') {
    audit(db, { actor, type: 'EXECUTOR_REJECTED', txId, decision: 'REJECT', reason: v.reason, payloadHash: row.sha256, meta: { detail: v.detail, authKind: auth.kind } })
    return v
  }

  const tx = parseCanonical(row.canonical)
  const settledAt = new Date().toISOString()
  db.exec('BEGIN IMMEDIATE')
  try {
    db.prepare(
      'INSERT INTO settlements (txId, nonce, payloadSha256, amountMinor, beneficiaryId, assurance, createdAt) VALUES (?,?,?,?,?,?,?)',
    ).run(txId, tx.nonce, row.sha256, tx.amountMinor, tx.beneficiaryId, v.assurance, settledAt)
    db.prepare("UPDATE transactions SET status = 'SETTLED_SIMULATED' WHERE id = ?").run(txId)
    audit(db, { actor, type: 'SETTLED_SIMULATED', txId, decision: 'ACCEPT', payloadHash: row.sha256, meta: { assurance: v.assurance, amountMinor: tx.amountMinor } })
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    if (/UNIQUE/i.test(String((e as Error).message))) {
      audit(db, { actor, type: 'EXECUTOR_REJECTED', txId, decision: 'REJECT', reason: 'NONCE_REPLAY', payloadHash: row.sha256 })
      return { ok: false, status: 409, reason: 'NONCE_REPLAY' }
    }
    throw e
  }
  return {
    ok: true,
    receipt: { txId, nonce: tx.nonce, payloadSha256: row.sha256, amountMinor: tx.amountMinor, beneficiaryId: tx.beneficiaryId, assurance: v.assurance, settledAt },
  }
}
