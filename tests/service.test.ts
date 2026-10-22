// Service-layer integration: freeze -> approve -> execute, as the API routes call it.
// Users here are plain objects standing in for an already-verified token; token verification
// itself is TideCloak's and is checked live (401 probes, real login), not mocked.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

process.env.COVENANT_DB = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'covenant-svc-')), 'svc.db')
const { createTransaction, getDetail, recordApproval, listTransactions } = await import('../lib/covenant/service.ts')
const { execute } = await import('../lib/covenant/executor.ts')
const { getDb, verifyAuditChain } = await import('../lib/covenant/db.ts')

const operator = { sub: 'op-1', username: 'operator', roles: [] as string[] }
const finance = { sub: 'fin-1', username: 'finance', roles: ['covenant-finance'] }
const procurement = { sub: 'proc-1', username: 'procurement', roles: ['covenant-procurement'] }
const cfg = { mode: 'fallback' as const, trustedKeys: [] }

test('normal order: freeze then settle exactly once', () => {
  const id = createTransaction(operator, 'legit_small_order')
  assert.equal(getDetail(id)!.policy.decision, 'ALLOW')
  assert.equal(execute(getDb(), id, { kind: 'fallback' }, cfg, 'operator').ok, true)
  assert.equal((execute(getDb(), id, { kind: 'fallback' }, cfg, 'operator') as any).reason, 'NONCE_REPLAY')
})

test('injected invoice: frozen as REJECTED, approvals cannot rescue it, executor refuses', () => {
  const id = createTransaction(operator, 'injected_invoice')
  const d = getDetail(id)!
  assert.equal(d.status, 'REJECTED')
  assert.deepEqual(d.policy.reasons, ['AMOUNT_OVER_CAP', 'BENEFICIARY_NOT_APPROVED'])
  assert.deepEqual(recordApproval(finance, id, 'covenant-finance'), { ok: true })
  assert.deepEqual(recordApproval(procurement, id, 'covenant-procurement'), { ok: true })
  assert.equal((execute(getDb(), id, { kind: 'fallback' }, cfg, 'operator') as any).reason, 'POLICY_DENIED')
})

test('$12k: role must be in the token, no self-approval, then two distinct approvers settle', () => {
  const id = createTransaction(operator, 'exception_replenishment')
  assert.deepEqual(recordApproval(operator, id, 'covenant-finance'), { ok: false, status: 403, error: 'ROLE_FORBIDDEN' })
  assert.deepEqual(recordApproval({ ...operator, roles: ['covenant-finance'] }, id, 'covenant-finance'), { ok: false, status: 403, error: 'APPROVER_NOT_DISTINCT' })
  assert.deepEqual(recordApproval(finance, id, 'covenant-admin'), { ok: false, status: 400, error: 'INVALID_SCHEMA' })
  assert.deepEqual(recordApproval(finance, id, 'covenant-finance'), { ok: true })
  assert.equal(recordApproval(finance, id, 'covenant-finance').ok, false, 'same person cannot approve twice')
  assert.equal((execute(getDb(), id, { kind: 'fallback' }, cfg, 'operator') as any).reason, 'APPROVAL_REQUIRED')
  assert.deepEqual(recordApproval(procurement, id, 'covenant-procurement'), { ok: true })
  assert.equal(execute(getDb(), id, { kind: 'fallback' }, cfg, 'operator').ok, true)
})

test('a row edited outside the app shows as TAMPERED and is refused, without breaking the list', () => {
  const id = createTransaction(operator, 'legit_small_order')
  getDb().prepare('UPDATE transactions SET canonical = ? WHERE id = ?').run('{"amountMinor":999999999}', id)
  assert.equal(listTransactions().transactions.find((t) => t.id === id)?.status, 'TAMPERED')
  assert.equal((getDetail(id) as { tampered?: true }).tampered, true)
  assert.equal((execute(getDb(), id, { kind: 'fallback' }, cfg, 'operator') as any).reason, 'PAYLOAD_TAMPERED')
})

test('ledger and audit chain reflect exactly the two settlements', () => {
  const l = listTransactions()
  assert.equal(l.ledger.settledCount, 2)
  assert.equal(l.ledger.settledMinor, 120_000 + 1_200_000)
  assert.equal(verifyAuditChain(getDb()).ok, true)
})
