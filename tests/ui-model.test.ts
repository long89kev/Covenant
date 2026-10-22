// UI presentation rules (lib/ui/model.ts). These pin the honesty constraints of the design package:
// a simulated result can never render as verified, and teal is reachable only from a live receipt.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { negotiate } from '../lib/covenant/agent.ts'
import {
  SCENARIO_IDS, SCENARIO_META, auditSource, capabilityMode, executorState, filterAudit, invoiceLines, lastExecutorRejection,
  policyChecks, proposalDiff, sanitizeAudit, txStatus, type AuditEvent, type Health,
} from '../lib/ui/model.ts'

const health = (over: Partial<Health> = {}): Health => ({
  authorityMode: 'fallback',
  tidecloak: { status: 'REACHABLE', realm: 'r' },
  forseti: { status: 'BLOCKED', reason: 'x', contractId: 'C' },
  trustedKey: null,
  executorSelfTest: 'PASS',
  liveVerifiedCount: 0,
  qea: { status: 'SEE_TIDE_CONSOLE', note: '' },
  ...over,
})

test('capability mode: fallback is SIMULATED, live is only POLICY_UNVERIFIED, anything unknown is UNAVAILABLE', () => {
  assert.equal(capabilityMode(null, false), 'LOADING')
  assert.equal(capabilityMode(null, true), 'UNAVAILABLE')
  assert.equal(capabilityMode(health(), false), 'SIMULATED')
  assert.equal(capabilityMode(health({ authorityMode: 'live' }), false), 'TIDE_CONNECTED_POLICY_UNVERIFIED')
  assert.equal(capabilityMode(health({ authorityMode: 'live', liveVerifiedCount: 5 }), false), 'TIDE_CONNECTED_POLICY_UNVERIFIED', 'app-level mode is never LIVE_VERIFIED')
  assert.equal(capabilityMode(health({ authorityMode: 'UNCONFIGURED' }), false), 'UNAVAILABLE')
  assert.equal(capabilityMode(health({ tidecloak: { status: 'UNAVAILABLE', realm: 'r' } }), false), 'UNAVAILABLE')
})

test('scenario fixture amounts match what the real agent proposes', () => {
  for (const id of SCENARIO_IDS) {
    const n = negotiate(id)
    assert.equal(SCENARIO_META[id].proposedMinor, n.proposal.amountMinor, id)
    assert.equal(SCENARIO_META[id].agreedMinor, n.agreement.totalMinor, id)
  }
  assert.equal(SCENARIO_META.legit_small_order.proposedMinor, 120_000)
  assert.equal(SCENARIO_META.injected_invoice.proposedMinor, 5_000_000)
  assert.equal(SCENARIO_META.exception_replenishment.proposedMinor, 1_200_000)
})

test('status: only a TIDE_SIGNATURE_VERIFIED receipt is verified; simulated settlement and pass are info, never verified', () => {
  assert.deepEqual(txStatus('SETTLED_SIMULATED', 'TIDE_SIGNATURE_VERIFIED'), { label: 'LIVE SIGNATURE VERIFIED', tone: 'verified' })
  assert.equal(txStatus('SETTLED_SIMULATED', 'SIMULATED_AUTHORITY').tone, 'info')
  assert.equal(txStatus('FROZEN').label, 'SIMULATED PASS')
  assert.equal(txStatus('REJECTED').label, 'SIMULATED DENIAL')
  assert.equal(txStatus('AWAITING_APPROVAL').tone, 'pending')
  assert.equal(txStatus('AWAITING_APPROVAL', null, 'ALLOW').label, 'SIMULATED PASS', 'current policy wins over the freeze-time snapshot')
  assert.equal(txStatus('TAMPERED', 'TIDE_SIGNATURE_VERIFIED').tone, 'verified', 'receipt evidence is authoritative')
  for (const s of ['FROZEN', 'REJECTED', 'AWAITING_APPROVAL', 'SETTLED_SIMULATED', 'TAMPERED', 'WHATEVER']) {
    assert.notEqual(txStatus(s, 'SIMULATED_AUTHORITY').tone, 'verified', s)
    assert.notEqual(txStatus(s).tone, 'verified', s)
  }
})

test('policy rows: injected invoice fails cap and beneficiary, simulated passes are never green-equivalent', () => {
  const rows = policyChecks(5_000_000, { decision: 'DENY', reasons: ['AMOUNT_OVER_CAP', 'BENEFICIARY_NOT_APPROVED'], label: 'SIMULATED_POLICY_DECISION' })
  const by = Object.fromEntries(rows.map((r) => [r.id, r]))
  assert.equal(by.amount.outcome, 'FAIL')
  assert.equal(by.beneficiary.outcome, 'FAIL')
  assert.equal(by.window.outcome, 'PASS_SIMULATED')
  assert.equal(by.approvals.outcome, 'NOT_EVALUATED')
  const esc = policyChecks(1_200_000, { decision: 'NEEDS_APPROVAL', reasons: ['APPROVAL_REQUIRED'], label: 'SIMULATED_POLICY_DECISION' })
  assert.equal(esc.find((r) => r.id === 'approvals')!.outcome, 'PENDING')
  const clean = policyChecks(120_000, { decision: 'ALLOW', reasons: [], label: 'SIMULATED_POLICY_DECISION' })
  assert.equal(clean.find((r) => r.id === 'approvals')!.outcome, 'NOT_APPLICABLE')
  assert.ok(clean.every((r) => r.outcome !== 'FAIL'))
})

test('executor state: receipt beats rejection; no receipt and no rejection means NOT EXECUTED / no funds moved', () => {
  const ev = (type: string, reason: string | null, seq: number): AuditEvent => ({ seq, ts: `2026-10-22T00:00:0${seq}.000Z`, actor: 'a', type, decision: 'REJECT', reason, payloadHash: null })
  assert.deepEqual(executorState(null, null), { label: 'NOT EXECUTED', tone: 'neutral', detail: 'NO FUNDS MOVED (DEMO)' })
  const rej = lastExecutorRejection([ev('EXECUTOR_REJECTED', 'POLICY_DENIED', 1), ev('ATTACK_DRILL', 'INVALID_SIGNATURE', 2), ev('EXECUTOR_REJECTED', 'APPROVAL_REQUIRED', 3)])
  assert.equal(rej?.reason, 'APPROVAL_REQUIRED')
  assert.equal(executorState(null, rej).tone, 'danger')
  const simulated = { assurance: 'SIMULATED_AUTHORITY', createdAt: '', amountMinor: 1, beneficiaryId: 'b' }
  assert.equal(executorState(simulated, rej).label, 'SIMULATED SETTLEMENT')
  assert.equal(executorState({ ...simulated, assurance: 'TIDE_SIGNATURE_VERIFIED' }, null).tone, 'verified')
})

test('negotiation: hostile invoice lines are flagged (and only in the injected scenario); diff marks both fields', () => {
  const bad = negotiate('injected_invoice')
  const lines = invoiceLines(bad.scenario.invoiceText, bad.injectionDetected)
  assert.ok(lines.some((l) => l.hostile && l.text.includes('USD 50,000')))
  assert.ok(lines.filter((l) => l.text.includes('NORTHSTAR COMPONENTS')).every((l) => !l.hostile))
  const good = negotiate('legit_small_order')
  assert.ok(invoiceLines(good.scenario.invoiceText, good.injectionDetected).every((l) => !l.hostile))
  const diff = proposalDiff(bad.agreement, bad.proposal)
  assert.deepEqual(diff.map((d) => d.changed), [true, true])
  assert.equal(diff[0].proposed, '$50,000.00')
  assert.deepEqual(proposalDiff(good.agreement, good.proposal).map((d) => d.changed), [false, false])
})

const EVENTS: AuditEvent[] = [
  { seq: 1, ts: 't1', actor: 'buyer-ai (simulated)', type: 'AGENT_PROPOSAL_CREATED', txId: 'tx1', decision: 'INFO', reason: null, payloadHash: 'h', meta: '{"scenarioId":"injected_invoice","secretish":"drop-me"}' },
  { seq: 2, ts: 't2', actor: 'alice', type: 'TX_FROZEN', txId: 'tx1', decision: 'INFO', reason: null, payloadHash: 'h', meta: '{}' },
  { seq: 3, ts: 't3', actor: 'reference-policy', type: 'SIMULATED_POLICY_DECISION', txId: 'tx1', decision: 'DENY', reason: 'AMOUNT_OVER_CAP,BENEFICIARY_NOT_APPROVED', payloadHash: 'h', meta: '{}' },
  { seq: 4, ts: 't4', actor: 'bob', type: 'SETTLED_SIMULATED', txId: 'tx2', decision: 'ACCEPT', reason: null, payloadHash: 'h', meta: '{"assurance":"SIMULATED_AUTHORITY"}' },
  { seq: 5, ts: 't5', actor: 'alice', type: 'EXECUTOR_REJECTED', txId: 'tx2', decision: 'REJECT', reason: 'NONCE_REPLAY', payloadHash: 'h', meta: 'not json' },
]

test('audit source labels mark simulated provenance', () => {
  assert.equal(auditSource(EVENTS[0]).label, 'SIMULATED AI')
  assert.equal(auditSource(EVENTS[2]).simulated, true)
  assert.equal(auditSource(EVENTS[3]).label, 'SIMULATED AUTHORITY')
  assert.equal(auditSource({ ...EVENTS[3], meta: '{"assurance":"TIDE_SIGNATURE_VERIFIED"}' }).label, 'LIVE VERIFIED')
  assert.equal(auditSource(EVENTS[4]).simulated, false)
})

test('audit filters combine search, verdict, event type and transaction', () => {
  assert.deepEqual(filterAudit(EVENTS, { q: 'over_cap', decision: '', type: '', txId: '' }).map((e) => e.seq), [3])
  assert.deepEqual(filterAudit(EVENTS, { q: '', decision: 'REJECT', type: '', txId: '' }).map((e) => e.seq), [5])
  assert.deepEqual(filterAudit(EVENTS, { q: '', decision: '', type: '', txId: 'tx1' }).map((e) => e.seq), [1, 2, 3])
  assert.deepEqual(filterAudit(EVENTS, { q: 'simulated ai', decision: '', type: 'AGENT_PROPOSAL_CREATED', txId: 'tx1' }).map((e) => e.seq), [1])
  assert.equal(filterAudit(EVENTS, { q: 'nothing-matches', decision: '', type: '', txId: '' }).length, 0)
})

test('sanitized export pseudonymises people, allow-lists meta and carries simulated provenance', () => {
  const out = sanitizeAudit(EVENTS, { ok: true }, '2026-10-22T00:00:00.000Z')
  const actors = out.events.map((e) => e.actor)
  assert.deepEqual(actors, ['buyer-ai (simulated)', 'user-1', 'reference-policy', 'user-2', 'user-1'])
  assert.ok(!JSON.stringify(out).includes('alice') && !JSON.stringify(out).includes('bob'))
  assert.ok(!JSON.stringify(out).includes('drop-me'))
  assert.equal(out.events[0].meta.scenarioId, 'injected_invoice')
  assert.equal(out.events[2].simulated, true)
  assert.deepEqual(out.events[4].meta, {}, 'unparseable meta degrades to empty')
})
