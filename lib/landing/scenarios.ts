// Public landing playground fixtures (design/landing-v2). Pure data, no I/O: nothing here talks to
// TideCloak, Forseti or the executor. Every result is a SIMULATION and the copy must never claim a
// signature, a Tide verification or a completed payment — tests/landing.test.ts pins that.

export type LandingScenarioId = 'within-policy' | 'missing-approval' | 'tampered'

// ok = modeled checks pass (still unsigned) · pending = waiting on approvals · blocked = refused
export type LandingTone = 'ok' | 'pending' | 'blocked'

export interface LandingScenario {
  id: LandingScenarioId
  label: string
  amount: string
  counterparty: string
  purpose: string
  intent: string
  policy: string
  policyStatus: 'PASS' | 'PENDING' | 'DENIED'
  executor: string
  executorStatus: 'WOULD ACCEPT' | 'NOT EXECUTED' | 'REJECTED'
  verdict: 'Eligible for signing' | 'Approval required' | 'Execution blocked'
  tone: LandingTone
}

export const LANDING_SCENARIOS: Record<LandingScenarioId, LandingScenario> = {
  'within-policy': {
    id: 'within-policy',
    label: '01 / Within policy',
    amount: '$2,400.00',
    counterparty: 'Verified supplier',
    purpose: 'Industrial sensors · Proposed by Buyer Agent',
    intent: 'Structured request · policy-bound',
    policy: 'Allowlisted supplier · within limit',
    policyStatus: 'PASS',
    executor: 'Accept only authorized payloads',
    executorStatus: 'WOULD ACCEPT',
    verdict: 'Eligible for signing',
    tone: 'ok',
  },
  'missing-approval': {
    id: 'missing-approval',
    label: '02 / Missing approval',
    amount: '$12,500.00',
    counterparty: 'Verified supplier',
    purpose: 'Component order · Proposed by Buyer Agent',
    intent: 'Requires Finance + Procurement approvals',
    policy: 'Required 2 independent approvals · received 1',
    policyStatus: 'PENDING',
    executor: 'Missing required authorization',
    executorStatus: 'NOT EXECUTED',
    verdict: 'Approval required',
    tone: 'pending',
  },
  tampered: {
    id: 'tampered',
    label: '03 / Tampered',
    amount: '$50,000.00',
    counterparty: 'Unverified payee',
    purpose: 'Modified invoice · Proposed by compromised Agent',
    intent: 'Payee differs from original proposal',
    policy: 'Payee mismatch · over transaction limit',
    policyStatus: 'DENIED',
    executor: 'No valid authorization to verify',
    executorStatus: 'REJECTED',
    verdict: 'Execution blocked',
    tone: 'blocked',
  },
}

export const LANDING_SCENARIO_IDS = Object.keys(LANDING_SCENARIOS) as LandingScenarioId[]

export const LANDING_DISCLAIMER = 'Illustrative policy simulation. No Tide signature is issued by this landing page.'
