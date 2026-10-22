# 00 — Product vision and strategy

## Elevator pitch

**COVENANT: Autonomous Actions, Distributed Authority.** A shared B2B procurement workspace where buyer-side and seller-side AI agents negotiate terms, but no agent, single operator, or unilateral administrator can authorize a protected payment unless business rules, trusted identities, and independent approvals satisfy a policy enforced at the cryptographic signing boundary.

## Product in one sentence

A cryptographically governed execution layer for enterprise AI agents: **AI may propose, but only distributed authority may execute.**

## Buyer persona and market pull

- **Economic buyer:** CFO/CISO/Head of Procurement at companies deploying automated purchasing agents.
- **Operators:** procurement manager, finance officer, vendor sales representative, security admin, auditor.
- **Pain:** high-value automated workflows otherwise require long-lived powerful API credentials or an application-admin-enforced approval service that operators could bypass.
- **Why now:** agentic systems generate plausible but fallible plans and process untrusted documents. This makes high-impact authorization a separate, deterministic security problem.

## Representative real-world use case

Buyer Acme Parts needs 400 replacement pump assemblies from supplier Northstar Components. Buyer AI and seller AI reach a $4,800 agreement. A supplier-supplied PDF invoice later contains an indirect prompt injection redirecting the buyer agent to pay $50,000 to a new beneficiary. The compromised AI proposes the transfer, but the authority layer denies the signature; the mock rail rejects it.

A second legitimate $12,000 replenishment order requires separate sign-off by a finance officer and a procurement manager. This approval rule must be enforced inside the authorized signing flow to substantiate the strongest claim.

## Differentiator and competitor-conscious positioning

Do not claim the first AI payment mandate or first multisignature payment. Payment authorization mandates exist (e.g. Google AP2) and shared-signature treasuries exist (e.g. Safe). Our intended differentiation is **distributed governance of *who can authorize agents*, combined with payload-constrained Tide cryptographic execution**, especially across mutually distrusting company departments/organizations.

**Not:** another procurement dashboard, generic AI guardrails, OTP approval, or RBAC-only payment service.

**Why Tide is essential:** App/backend cannot grant itself a Fabric-approved signature by modifying local business rules; governance protects permissions and Forseti constrains eligible cryptographic operations. The external settlement simulation must verify the signature instead of trusting the UI.

## User journeys

1. Buyer agent reads RFQ and approved supplier list; seller agent proposes a quote; buyer agent drafts exact agreement and payment request.
2. For low-value, validated request: Tide permits cryptographic authorization; executor verifies and posts synthetic settlement.
3. For high-value order: independent roles approve before authorization; until then, the signed operation must be unavailable.
4. For injected/malicious invoice: the agent may be deceived, but the authority boundary denies it and executor stays unchanged.
5. Compromised admin tries to assign stronger agent role; Tide QEA keeps it pending until quorum. Do not conflate this with payment approval.
6. Auditor inspects transaction hash, policy ID, approver provenance, reasons, signing result, verification result and simulated rail status.

## Key design principles

- **Separation of intelligence and authority:** AI output is untrusted input, not a privileged command.
- **Externally enforced authority:** no payment path without verified authorization on immutable transaction bytes.
- **Failure must be visible:** rejected attempt should include nonsecret reasons and evidence, rather than disappearing from UI.
- **Adversarial-by-design demo:** show a successful prompt injection followed by a failed unauthorized settlement.
- **No magic claims:** QEA protects governed configuration in its supported scope; Forseti signing must be integrated and tested; the mock rail is not a real bank.

## Key measurable outcomes (prototype)

- Zero unauthorized mock settlements in prescribed attack suite.
- 100% of accepted mock settlements have independently verified signature, acceptable policy/key ID, valid nonce and expiry.
- One real TideCloak authenticated identity; ideally three QEA admins and live Forseti policy signer.
- Deterministic demo flows: approved, denied prompt injection, waiting for approvals, and attempted admin escalation.
- README judges can verify Tide necessity in under two minutes.

## Exclusions

No real funds, banking connection, production fintech compliance, custody of payment instruments, autonomous web browsing, blockchain requirement, proprietary fraud-detection claim, or 24/7 fault-tolerant service.

## Success narrative for judges

**Constraint:** companies hesitate to give AI agents access to high-impact transactional power.

**New possibility:** two enterprise agents can finish most of a purchase autonomously while issuance of execution authority remains distributed and nonunilateral.

**Crucial proof:** show a malformed/evil transaction denied by real Tide policy signing and rejected by the executor even when the application UI/AI would like it to run.
