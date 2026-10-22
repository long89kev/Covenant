# 01 — Scope, user stories and definition of done

## Priority model

- `P0 CRYPTO`: real Tide identity, one verified real cryptographic operation, deny path, executor verifier. Highest priority.
- `P0 DEMO`: synthetic buyer/supplier negotiation and a malicious invoice that the agent *actually* ingests and mishandles (or is marked deterministic simulation).
- `P1 GOV`: three QEA admin users, unauthorized governed role change remains pending before 2-of-3 quorum; independent finance/procurement business approvals in Forseti if supported.
- `P1 UX`: four clean screens, status/evidence display and reproducible fixtures.
- `P2`: optional LLM, observability polish, exportable audit log, screenshots, production deployment.

## User stories and acceptance criteria

### US-01 Sign in securely (P0)

As a procurement or finance user, I can authenticate with TideCloak and access role-appropriate views.
- SDK/provider and server JWT checks work end-to-end; unauthorized API calls get 401/403.
- Roles mapped from verified claims, not frontend toggle.
- A browser-bound Tide credential remains on its required client path.

### US-02 Propose a transaction (P0)

As a buyer agent, I submit a structured purchase request sourced from a synthetic quote/invoice.
- User sees prompt source, extracted beneficiary, amount and confidence/verification status.
- Request is normalized, validated, immutable after freeze; `requestId` and `nonce` are unique.
- Seller AI and buyer AI do not have direct settlement credentials.

### US-03 Cryptographically authorize (P0)

As a valid actor, I initiate signing under a pinned Tide policy.
- Actual Tide-authorized signing response for eligible request can be verified against a trusted public key.
- A denied request produces no valid authorization and leaves settlement state unchanged.
- Record policy/contract ID, signature algorithm and verification result, without recording secret/doken/token.
- If unsupported, mark `BLOCKED` and **do not pass US-03**.

### US-04 Independent execution (P0)

As an executor, I accept only exact signed canonical payloads.
- Independently verify signature, key ID, domain, payload schema, immutable content hash, expiry and single-use nonce.
- Reject a mutation to amount/beneficiary even if an earlier valid signature exists.
- Use atomic database transaction to prevent replay and race-condition double posting.

### US-05 Attack demonstration (P0)

As a judge, I can trigger the contaminated invoice scenario.
- Source text is labeled untrusted; show malicious instructions and the agent's bad proposal.
- Policy authorization is denied **by the actual signing boundary** for claims of real enforcement.
- No simulated rail balance changes; audit reasons visible.

### US-06 Separate business approvals (P1)

As finance and procurement approvers, I can endorse a $12,000 request.
- Distinct authenticated actors; prevent self-approval and duplicate approvals.
- If genuine Forseti business approver support is available, verify insufficient approvals cannot authorize signing.
- UI approvals alone never upgrade the assurance label to cryptographic.

### US-07 QEA admin tampering (P1)

As a security reviewer, I can see a request to elevate agent roles remain pending under a three-admin realm.
- At least 3 `tide-realm-admin` identities and 2 approvals required in documented config.
- Evidence originates from actual Tide QEA Approvals page/status, not a hand-built fake.
- `master` realm governance caveat documented.

### US-08 Auditability (P1)

As an auditor, I can trace an immutable transaction version through proposal → approval → signature → executor verdict.
- Each event has UTC timestamp, actor identity/pseudonymous subject, event type, correlation ID, payload hash and outcome.
- Append-only application audit trail with hash chaining as optional aid, not a substitute for a trusted external timestamp service.
- Secrets/tokens/PII omitted.

## Nonfunctional requirements

- TypeScript strict, Zod input schemas, bounded retries, idempotency keys, dependency pinning.
- All external requests time out and failure returns no authorization.
- Pages accessible by keyboard, high contrast, and clearly label real vs simulated.
- UI uses synthetic data and masked account IDs.
- All sensitive endpoint writes require server-validated JWT.
- Local setup reproducible via README and `.env.example`.

## MVP slices

**Slice A: live identity + real E2EE or authorized signing.**  
**Slice B: frozen payment DTO + independent verifier + fake ledger.**  
**Slice C: injected invoice agent and observable denial.**  
**Slice D: QEA governance, multi-person workflow, judge demo.**

## Claims ladder

| Level | What has actually been integrated? | Permitted claim |
|---|---|---|
| L0 | Only UI/local fake | Concept mockup; no Tide security claim |
| L1 | TideCloak auth | Users authenticated by TideCloak, not payment-enforced |
| L2 | Live QEA/E2EE | Real Tide-governed IAM or protected data; mock payment policy separately labeled |
| L3 | Forseti policy signs valid payload + forbids invalid + executor verifies real signature | Cryptographically enforced authorization for the demonstrated transaction class |
| L4 | Validated business approvers within policy + QEA admin changes | Full designed multi-party COVENANT demo, subject to documented trust assumptions |

Only L3/L4 justify the central "AI cannot execute an unauthorized protected payment" demo claim.

## Release definition of done

- [ ] Genuine Tide SDK integrated, package versions and environment documented.
- [ ] Signed bytes and public key origin verified, not guessed.
- [ ] Forbidden request fails cryptographic authorization, not only frontend approval.
- [ ] Independent executor fails closed on tamper/replay/expiry/unknown key.
- [ ] Three reproducible end-to-end scenarios with timestamps and screenshots.
- [ ] Automated tests pass, clean build, no tokens or secrets in Git.
- [ ] Honest README, recorded video, operational limitations explicitly disclosed.
