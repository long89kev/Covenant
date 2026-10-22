// REFERENCE policy evaluator. It mirrors policies/CovenantPaymentPolicy.cs so the app and the executor
// apply the same rules, but it runs in this Node process: it is NOT Forseti and NOT Tide enforcement.
// Every decision it produces is labelled SIMULATED_POLICY_DECISION in the UI and audit log.
import { CONTRACT_ID, DOMAIN, POLICY_VERSION, type TransactionV1 } from './tx.ts'

export const BUYER_ORG = 'acme-parts'
export const AUTO_LIMIT = 500_000 // $5,000.00
export const MAX_CENTS = 2_000_000 // $20,000.00
// Pinned in code (and in the contract's Allowlist param), never read from the writable app DB.
export const ALLOWLIST: Readonly<Record<string, string>> = Object.freeze({
  'northstar-components': 'northstar-verified-001',
})

// Approver roles are TideCloak client roles; granting them is a QEA-governed change.
export const FINANCE_ROLE = 'covenant-finance'
export const PROCUREMENT_ROLE = 'covenant-procurement'

export type ReasonCode =
  | 'UNKNOWN_POLICY'
  | 'CROSS_TENANT'
  | 'INVALID_SCHEMA'
  | 'AMOUNT_OVER_CAP'
  | 'BENEFICIARY_NOT_APPROVED'
  | 'EXPIRED_AUTH'
  | 'APPROVAL_REQUIRED'
  | 'APPROVER_NOT_DISTINCT'

export interface Approval {
  subject: string // Tide-verified token `sub` of the approver
  role: typeof FINANCE_ROLE | typeof PROCUREMENT_ROLE
  txSha256: string // the exact transaction hash the approver was shown
}

export interface PolicyResult {
  decision: 'ALLOW' | 'DENY' | 'NEEDS_APPROVAL'
  reasons: ReasonCode[]
  label: 'SIMULATED_POLICY_DECISION'
}

export function evaluate(
  tx: TransactionV1,
  ctx: { txSha256: string; requester: string; approvals: Approval[]; now: Date },
): PolicyResult {
  const deny: ReasonCode[] = []
  if (tx.domain !== DOMAIN || tx.policyVersion !== POLICY_VERSION || tx.tideContractId !== CONTRACT_ID) deny.push('UNKNOWN_POLICY')
  if (tx.buyerOrgId !== BUYER_ORG) deny.push('CROSS_TENANT')
  if (tx.currency !== 'USD' || !Number.isSafeInteger(tx.amountMinor) || tx.amountMinor <= 0) deny.push('INVALID_SCHEMA')
  if (tx.amountMinor > MAX_CENTS) deny.push('AMOUNT_OVER_CAP')
  if (ALLOWLIST[tx.vendorOrgId] !== tx.beneficiaryId) deny.push('BENEFICIARY_NOT_APPROVED')
  const now = ctx.now.toISOString()
  if (now < tx.issuedAt || now > tx.expiresAt) deny.push('EXPIRED_AUTH')
  if (deny.length) return { decision: 'DENY', reasons: deny, label: 'SIMULATED_POLICY_DECISION' }

  if (tx.amountMinor <= AUTO_LIMIT) return { decision: 'ALLOW', reasons: [], label: 'SIMULATED_POLICY_DECISION' }

  // Only approvals bound to this exact hash count; the requester can never approve their own payment.
  const bound = ctx.approvals.filter((a) => a.txSha256 === ctx.txSha256)
  const reasons: ReasonCode[] = []
  if (bound.some((a) => a.subject === ctx.requester)) reasons.push('APPROVER_NOT_DISTINCT')
  const others = bound.filter((a) => a.subject !== ctx.requester)
  const finance = others.filter((a) => a.role === FINANCE_ROLE)
  const procurement = others.filter((a) => a.role === PROCUREMENT_ROLE)
  const distinctPair = finance.some((f) => procurement.some((p) => p.subject !== f.subject))
  if (!distinctPair) {
    if (finance.length && procurement.length) reasons.push('APPROVER_NOT_DISTINCT')
    reasons.push('APPROVAL_REQUIRED')
    return { decision: 'NEEDS_APPROVAL', reasons, label: 'SIMULATED_POLICY_DECISION' }
  }
  return { decision: 'ALLOW', reasons: [], label: 'SIMULATED_POLICY_DECISION' }
}
