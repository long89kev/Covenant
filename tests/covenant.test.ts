// Unit + adversarial tests for the COVENANT domain and executor. Run: npm test
// Signature tests use a locally generated TEST key standing in for the Tide key: they prove the
// executor's verification logic, NOT that Tide signed anything (that gate is BLOCKED, see docs/12).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { canonicalize } from '../lib/covenant/canonical.ts'
import { CONTRACT_ID, Proposal, TransactionV1, challengeBytes, freeze, parseCanonical, sha256 } from '../lib/covenant/tx.ts'
import { FINANCE_ROLE, PROCUREMENT_ROLE, evaluate, type Approval } from '../lib/covenant/policy.ts'
import { negotiate } from '../lib/covenant/agent.ts'
import { audit, openDb, verifyAuditChain, type Db } from '../lib/covenant/db.ts'
import { execute, type ExecutorConfig } from '../lib/covenant/executor.ts'

const T0 = new Date('2026-10-22T04:00:00.000Z')
const AGREEMENT = 'a'.repeat(64)
const base = (over: Partial<Proposal> = {}): Proposal => ({
  sourceScenario: 'test',
  invoiceId: 'INV-T-1',
  vendorOrgId: 'northstar-components',
  beneficiaryId: 'northstar-verified-001',
  amountMinor: 120_000,
  currency: 'USD',
  agentRationale: 'test',
  extractedFromUntrustedDocument: false,
  ...over,
})
const frozen = (over: Partial<Proposal> = {}, now = T0) =>
  freeze(base(over), { buyerOrgId: 'acme-parts', agreementSha256: AGREEMENT, now, requestId: '00000000-0000-4000-8000-000000000001', nonce: 'b'.repeat(64) })

// ---------- canonicalization ----------

test('JCS: key order does not change bytes; known vector', () => {
  assert.equal(canonicalize({ b: 1, a: 'x', c: [true, null] }), '{"a":"x","b":1,"c":[true,null]}')
  assert.equal(canonicalize({ z: { y: 1, x: 2 }, a: 0 }), canonicalize({ a: 0, z: { x: 2, y: 1 } }))
  assert.equal(canonicalize({ 'é': 1, e: 2 }), '{"e":2,"é":1}') // UTF-16 code-unit order
})

test('JCS: floats, NaN and undefined are refused', () => {
  assert.throws(() => canonicalize({ a: 1.5 }))
  assert.throws(() => canonicalize({ a: NaN }))
  assert.throws(() => canonicalize({ a: undefined }))
})

test('freeze -> canonical round-trip; every bound field changes the hash', () => {
  const f = frozen()
  assert.deepEqual(parseCanonical(f.canonical), f.tx)
  assert.equal(f.tx.tideContractId, CONTRACT_ID)
  for (const [k, v] of Object.entries({ beneficiaryId: 'x', amountMinor: 120_001, buyerOrgId: 'other', domain: 'X', agreementSha256: 'c'.repeat(64) })) {
    assert.notEqual(sha256(canonicalize({ ...f.tx, [k]: v })), f.sha256, k)
  }
  assert.ok(Object.isFrozen(f.tx))
})

test('schema rejects unknown fields, floats, zero, bad timestamps, inverted expiry', () => {
  const tx = frozen().tx
  assert.throws(() => TransactionV1.parse({ ...tx, isApproved: true }))
  assert.throws(() => TransactionV1.parse({ ...tx, amountMinor: 12.5 }))
  assert.throws(() => TransactionV1.parse({ ...tx, amountMinor: 0 }))
  assert.throws(() => TransactionV1.parse({ ...tx, amountMinor: -1 }))
  assert.throws(() => TransactionV1.parse({ ...tx, currency: 'EUR' }))
  assert.throws(() => TransactionV1.parse({ ...tx, issuedAt: '2026-10-22 04:00' }))
  assert.throws(() => TransactionV1.parse({ ...tx, expiresAt: tx.issuedAt }))
  assert.throws(() => parseCanonical(JSON.stringify(tx, null, 1)), /not canonical/)
})

test('agent proposal schema rejects smuggled authority fields', () => {
  for (const f of ['isApproved', 'policyPassed', 'hasQuorum', 'authorizedSignature']) {
    assert.throws(() => Proposal.parse({ ...base(), [f]: true }), f)
  }
})

// ---------- reference policy boundaries (NOT Forseti) ----------

const ev = (amountMinor: number, approvals: Approval[] = [], over: Partial<Proposal> = {}, now = T0) => {
  const f = frozen({ amountMinor, ...over })
  return { f, r: evaluate(f.tx, { txSha256: f.sha256, requester: 'requester', approvals: approvals.map((a) => ({ ...a, txSha256: a.txSha256 || f.sha256 })), now }) }
}
const fin = (subject: string, txSha256 = ''): Approval => ({ subject, role: FINANCE_ROLE, txSha256 })
const proc = (subject: string, txSha256 = ''): Approval => ({ subject, role: PROCUREMENT_ROLE, txSha256 })

test('policy: $5,000.00 auto-allows, $5,000.01 needs approval', () => {
  assert.equal(ev(500_000).r.decision, 'ALLOW')
  assert.deepEqual(ev(500_001).r, { decision: 'NEEDS_APPROVAL', reasons: ['APPROVAL_REQUIRED'], label: 'SIMULATED_POLICY_DECISION' })
})

test('policy: approval band needs finance + procurement from two distinct non-requesters', () => {
  assert.equal(ev(1_200_000, [fin('f'), proc('p')]).r.decision, 'ALLOW')
  assert.equal(ev(2_000_000, [fin('f'), proc('p')]).r.decision, 'ALLOW')
  assert.equal(ev(1_200_000, [fin('f')]).r.decision, 'NEEDS_APPROVAL')
  assert.deepEqual(ev(1_200_000, [fin('same'), proc('same')]).r.reasons, ['APPROVER_NOT_DISTINCT', 'APPROVAL_REQUIRED'])
  assert.deepEqual(ev(1_200_000, [fin('requester'), proc('p')]).r.reasons, ['APPROVER_NOT_DISTINCT', 'APPROVAL_REQUIRED'])
  // approvals bound to some other transaction hash do not count
  assert.equal(ev(1_200_000, [fin('f', 'd'.repeat(64)), proc('p', 'd'.repeat(64))]).r.decision, 'NEEDS_APPROVAL')
})

test('policy: hard denials regardless of approvals', () => {
  assert.deepEqual(ev(2_000_001, [fin('f'), proc('p')]).r.reasons, ['AMOUNT_OVER_CAP'])
  assert.deepEqual(ev(120_000, [], { beneficiaryId: 'unknown-beneficiary-999' }).r.reasons, ['BENEFICIARY_NOT_APPROVED'])
  assert.deepEqual(ev(120_000, [], { vendorOrgId: 'shadow-supply' }).r.reasons, ['BENEFICIARY_NOT_APPROVED'])
  assert.deepEqual(ev(120_000, [], {}, new Date(T0.getTime() + 11 * 60_000)).r.reasons, ['EXPIRED_AUTH'])
  const f = frozen()
  assert.deepEqual(evaluate({ ...f.tx, buyerOrgId: 'other-co' }, { txSha256: f.sha256, requester: 'r', approvals: [], now: T0 }).reasons, ['CROSS_TENANT'])
  assert.deepEqual(evaluate({ ...f.tx, tideContractId: 'F'.repeat(128) }, { txSha256: f.sha256, requester: 'r', approvals: [], now: T0 }).reasons, ['UNKNOWN_POLICY'])
})

// ---------- agents ----------

test('agents: clean invoice -> $1,200; injected invoice -> $50,000 to unknown beneficiary; exception -> $12,000', () => {
  const clean = negotiate('legit_small_order')
  assert.equal(clean.proposal.amountMinor, 120_000)
  assert.equal(clean.proposal.beneficiaryId, 'northstar-verified-001')
  assert.equal(clean.injectionDetected, false)
  const evil = negotiate('injected_invoice')
  assert.equal(evil.proposal.amountMinor, 5_000_000)
  assert.equal(evil.proposal.beneficiaryId, 'unknown-beneficiary-999')
  assert.equal(evil.agreementSha256, clean.agreementSha256, 'the agreement itself was not changed, only the proposal')
  assert.equal(negotiate('exception_replenishment').proposal.amountMinor, 1_200_000)
})

// ---------- executor ----------

const testKey = crypto.generateKeyPairSync('ed25519')
const cfg = (mode: ExecutorConfig['mode'], now = T0): ExecutorConfig => ({
  mode,
  now: () => now,
  trustedKeys: [{ keyId: 'test-key', publicKey: testKey.publicKey, source: 'unit-test key (not Tide)' }],
})

function store(db: Db, over: Partial<Proposal> = {}, id = 'tx1', nonce = 'b'.repeat(64)) {
  const f = freeze(base(over), { buyerOrgId: 'acme-parts', agreementSha256: AGREEMENT, now: T0, nonce })
  db.prepare('INSERT INTO transactions (id, requestId, nonce, canonical, sha256, status, scenario, requester, requesterName, proposal, createdAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, f.tx.requestId, f.tx.nonce, f.canonical, f.sha256, 'FROZEN', 'test', 'requester', 'requester', '{}', T0.toISOString())
  return f
}
const approve = (db: Db, txId: string, subject: string, role: string, txSha256: string) =>
  db.prepare('INSERT INTO approvals (txId, subject, username, role, txSha256, createdAt) VALUES (?,?,?,?,?,?)').run(txId, subject, subject, role, txSha256, T0.toISOString())
const settlements = (db: Db) => (db.prepare('SELECT COUNT(*) AS n FROM settlements').get() as { n: number }).n

test('fallback: clean order settles once, labelled SIMULATED_AUTHORITY; replay -> 409', () => {
  const db = openDb(':memory:')
  store(db)
  const v = execute(db, 'tx1', { kind: 'fallback' }, cfg('fallback'), 't')
  assert.equal(v.ok, true)
  assert.equal(v.ok && v.receipt.assurance, 'SIMULATED_AUTHORITY')
  assert.deepEqual(execute(db, 'tx1', { kind: 'fallback' }, cfg('fallback'), 't'), { ok: false, status: 409, reason: 'NONCE_REPLAY' })
  assert.equal(settlements(db), 1)
})

test('ATTACK-A/B: injected $50k, even with DB status forced to AUTHORIZED, is refused', () => {
  const db = openDb(':memory:')
  store(db, { amountMinor: 5_000_000, beneficiaryId: 'unknown-beneficiary-999' })
  db.prepare("UPDATE transactions SET status = 'AUTHORIZED'").run()
  const v = execute(db, 'tx1', { kind: 'fallback' }, cfg('fallback'), 't')
  assert.deepEqual(v, { ok: false, status: 403, reason: 'POLICY_DENIED', detail: 'AMOUNT_OVER_CAP,BENEFICIARY_NOT_APPROVED' })
  assert.equal(settlements(db), 0)
})

test('ATTACK-C: editing frozen bytes after approval is detected', () => {
  const db = openDb(':memory:')
  const f = store(db, { amountMinor: 1_200_000 })
  approve(db, 'tx1', 'f', FINANCE_ROLE, f.sha256)
  approve(db, 'tx1', 'p', PROCUREMENT_ROLE, f.sha256)
  const evil = canonicalize({ ...f.tx, amountMinor: 1_900_000 })
  // bytes edited, stored hash left alone -> hash mismatch
  db.prepare('UPDATE transactions SET canonical = ?').run(evil)
  assert.equal((execute(db, 'tx1', { kind: 'fallback' }, cfg('fallback'), 't') as any).reason, 'PAYLOAD_TAMPERED')
  // bytes AND hash edited -> the approvals were bound to the old hash, so they no longer count
  db.prepare('UPDATE transactions SET sha256 = ?').run(sha256(evil))
  assert.equal((execute(db, 'tx1', { kind: 'fallback' }, cfg('fallback'), 't') as any).reason, 'APPROVAL_REQUIRED')
  assert.equal(settlements(db), 0)
})

test('ATTACK-F: $12k with one approval or a self-approval is refused; two distinct approvers settle', () => {
  const db = openDb(':memory:')
  const f = store(db, { amountMinor: 1_200_000 })
  approve(db, 'tx1', 'f', FINANCE_ROLE, f.sha256)
  assert.equal((execute(db, 'tx1', { kind: 'fallback' }, cfg('fallback'), 't') as any).reason, 'APPROVAL_REQUIRED')
  approve(db, 'tx1', 'requester', PROCUREMENT_ROLE, f.sha256)
  assert.equal((execute(db, 'tx1', { kind: 'fallback' }, cfg('fallback'), 't') as any).reason, 'APPROVAL_REQUIRED')
  approve(db, 'tx1', 'p', PROCUREMENT_ROLE, f.sha256)
  assert.equal(execute(db, 'tx1', { kind: 'fallback' }, cfg('fallback'), 't').ok, true)
})

test('ATTACK-H: expired authorization is refused', () => {
  const db = openDb(':memory:')
  store(db)
  const v = execute(db, 'tx1', { kind: 'fallback' }, cfg('fallback', new Date(T0.getTime() + 10 * 60_000 + 1)), 't')
  assert.deepEqual(v, { ok: false, status: 403, reason: 'POLICY_DENIED', detail: 'EXPIRED_AUTH' })
})

test('live mode: fallback authorization can never settle', () => {
  const db = openDb(':memory:')
  store(db)
  assert.equal((execute(db, 'tx1', { kind: 'fallback' }, cfg('live'), 't') as any).reason, 'MODE_MISMATCH')
})

test('signature path: pinned key verifies exact challenge bytes; tamper, forged key, own pubkey all rejected', () => {
  const db = openDb(':memory:')
  const f = store(db)
  const sig = crypto.sign(null, challengeBytes(f.canonical), testKey.privateKey).toString('base64')
  const attacker = crypto.generateKeyPairSync('ed25519')
  const forged = crypto.sign(null, challengeBytes(f.canonical), attacker.privateKey).toString('base64')
  const attackerPub = attacker.publicKey.export({ format: 'der', type: 'spki' }).toString('base64')

  // ATTACK-E: attacker key + attacker-supplied public key -> the pin wins
  assert.equal((execute(db, 'tx1', { kind: 'tide-signature', keyId: 'attacker', signatureB64: forged, publicKeyB64: attackerPub }, cfg('live'), 't') as any).reason, 'UNKNOWN_KEY')
  assert.equal((execute(db, 'tx1', { kind: 'tide-signature', keyId: 'test-key', signatureB64: forged, publicKeyB64: attackerPub }, cfg('live'), 't') as any).reason, 'INVALID_SIGNATURE')
  // signature over the prefix-less JSON (wrong domain separation) is rejected
  const noPrefix = crypto.sign(null, Buffer.from(f.canonical), testKey.privateKey).toString('base64')
  assert.equal((execute(db, 'tx1', { kind: 'tide-signature', keyId: 'test-key', signatureB64: noPrefix }, cfg('live'), 't') as any).reason, 'INVALID_SIGNATURE')
  // valid signature, but payload rewritten consistently (bytes + hash) -> signature no longer matches
  const evil = canonicalize({ ...f.tx, beneficiaryId: 'northstar-verified-001x' })
  db.prepare('UPDATE transactions SET canonical = ?, sha256 = ?').run(evil, sha256(evil))
  assert.equal((execute(db, 'tx1', { kind: 'tide-signature', keyId: 'test-key', signatureB64: sig }, cfg('live'), 't') as any).reason, 'INVALID_SIGNATURE')
  db.prepare('UPDATE transactions SET canonical = ?, sha256 = ?').run(f.canonical, f.sha256)
  const ok = execute(db, 'tx1', { kind: 'tide-signature', keyId: 'test-key', signatureB64: sig }, cfg('live'), 't')
  assert.equal(ok.ok && ok.receipt.assurance, 'TIDE_SIGNATURE_VERIFIED')
  assert.equal(settlements(db), 1)
})

test('signature path still refuses a policy-invalid payload (defence in depth)', () => {
  const db = openDb(':memory:')
  const f = store(db, { amountMinor: 5_000_000, beneficiaryId: 'unknown-beneficiary-999' })
  const sig = crypto.sign(null, challengeBytes(f.canonical), testKey.privateKey).toString('base64')
  assert.equal((execute(db, 'tx1', { kind: 'tide-signature', keyId: 'test-key', signatureB64: sig }, cfg('live'), 't') as any).reason, 'POLICY_DENIED')
})

test('ATTACK-D: two connections racing on the same transaction settle exactly once', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'covenant-')), 'race.db')
  const a = openDb(file)
  const b = openDb(file)
  store(a)
  const results = [execute(a, 'tx1', { kind: 'fallback' }, cfg('fallback'), 'a'), execute(b, 'tx1', { kind: 'fallback' }, cfg('fallback'), 'b')]
  assert.equal(results.filter((r) => r.ok).length, 1)
  assert.equal(results.filter((r) => !r.ok && r.reason === 'NONCE_REPLAY').length, 1)
  assert.equal(settlements(a), 1)
})

test('audit chain verifies and detects an edited event', () => {
  const db = openDb(':memory:')
  audit(db, { actor: 'a', type: 'TX_FROZEN', decision: 'INFO' })
  audit(db, { actor: 'a', type: 'EXECUTOR_REJECTED', decision: 'REJECT', reason: 'POLICY_DENIED' })
  assert.deepEqual(verifyAuditChain(db), { ok: true, brokenAt: null, count: 2 })
  db.prepare("UPDATE audit SET decision = 'ACCEPT' WHERE seq = 2").run()
  assert.equal(verifyAuditChain(db).ok, false)
})
