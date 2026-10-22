// Landing playground fixtures (lib/landing/scenarios.ts). The public page is a simulation: these pin
// the required values per scenario and forbid any copy that would claim a real signature or payment.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LANDING_DISCLAIMER, LANDING_SCENARIOS, LANDING_SCENARIO_IDS } from '../lib/landing/scenarios.ts'

test('three scenarios with the required amounts, statuses and verdicts', () => {
  assert.deepEqual(LANDING_SCENARIO_IDS, ['within-policy', 'missing-approval', 'tampered'])
  const v = LANDING_SCENARIOS['within-policy']
  assert.equal(v.amount, '$2,400.00'); assert.equal(v.policyStatus, 'PASS'); assert.equal(v.executorStatus, 'WOULD ACCEPT'); assert.equal(v.verdict, 'Eligible for signing')
  const a = LANDING_SCENARIOS['missing-approval']
  assert.equal(a.amount, '$12,500.00'); assert.equal(a.policyStatus, 'PENDING'); assert.equal(a.executorStatus, 'NOT EXECUTED'); assert.equal(a.verdict, 'Approval required')
  assert.equal(a.tone, 'pending', 'missing approval is not presented as a final rejection')
  const t = LANDING_SCENARIOS.tampered
  assert.equal(t.amount, '$50,000.00'); assert.equal(t.policyStatus, 'DENIED'); assert.equal(t.executorStatus, 'REJECTED'); assert.equal(t.verdict, 'Execution blocked')
  assert.match(t.policy, /mismatch/i, 'tampered states an explicit mismatch reason')
})

test('no scenario claims a signature, Tide verification or a completed payment', () => {
  const forbidden = /signed by tide|tide verified|verified by tide|signature (issued|verified)|\bpaid\b|settled|payment (sent|complete|authorized)|authorized by tide|is authorized/i
  for (const id of LANDING_SCENARIO_IDS) {
    const text = Object.values(LANDING_SCENARIOS[id]).join(' ')
    assert.doesNotMatch(text, forbidden, id)
  }
  assert.match(LANDING_DISCLAIMER, /simulation/i)
  assert.match(LANDING_DISCLAIMER, /No Tide signature/)
})
