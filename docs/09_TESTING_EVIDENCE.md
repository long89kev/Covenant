# 09 — Testing plan, acceptance matrix and evidence capture

## Testing goals

Prove more than a polished demo: an attacker who controls invoice content, agent output, or mutable app state cannot trigger a **protected mock payment** without a genuine valid authorization and immutable transaction verification.

## Unit test categories

### `canonicalization.test.ts`

- Equivalent objects with reordered keys have identical JCS canonical bytes.
- Changing beneficiary, amount, buyer, tenant, domain or agreement hash changes payload hash and invalidates existing authorization.
- Reject floats, NaN, negative amount, unknown fields, malformed UTC timestamps, unsupported currency, duplicate nonce.
- Serialization + parsing round-trip matches known vectors.

### `policy-boundary.test.ts`

Use a local **reference checker only for fast developer feedback** (clearly labeled not Forseti). Exercise:

- $5,000.00 exact threshold allow conditional on verified destination.
- $5,000.01 requires finance+procurement; $20,000 allowed with approvals; $20,000.01 deny.
- Unverified vendor/beneficiary deny regardless of amount.
- Duplicate approver identities, self-approval and wrong roles deny.
- Wrong domain/tenant/resource/contract ID deny.

These unit tests **do not prove Tide's contract**: live integration tests must execute actual signing.

### `executor.test.ts`

- Valid real Tide authorization to trusted recipient -> one settlement.
- No signature -> 403, no settlement.
- Forged signature/private key not in trust registry -> 403.
- Mutated amount/beneficiary -> 403.
- Replay same signature -> 409, no second settlement.
- Two simultaneous requests -> exactly one settlement (DB unique nonce / transaction).
- Expired/unknown policy/other domain -> 403.
- Database flag says APPROVED but signature missing -> 403.
- Simulated authority output -> reject in live executor.

### `agent.test.ts`

- Clean supplier invoice yields approved $1,200 proposal.
- Malicious invoice produces bad structured proposal in deterministic *intentionally vulnerable agent* test (not execution).
- Agent cannot invoke payment executor or change Tide role mapping.
- Agent extra fields `isApproved` / `authorizedSignature` rejected by proposal Zod schema.

## Live integration tests (require actual Tide environment)

| Test ID | Scenario | Expected evidence |
|---|---|---|
| IT-01 | Valid OIDC session | Real verified Tide JWT, correct claims |
| IT-02 | Unauthenticated API request | HTTP 401/403 |
| IT-03 | Forseti valid sign for $1,200 | Real response + public-key verification true |
| IT-04 | Forseti sign attempt for malicious $50,000/unverified account | Genuine signer refuses; no signature accepted |
| IT-05 | Sign then mutate amount or beneficiary | Independent Ed25519 verification false |
| IT-06 | Business approval 1/2 for $12,000 | No valid sign if `EXPLICIT` contract integrated |
| IT-07 | Business approval 2/2 distinct roles | Genuine signer accepts if policy supports it |
| IT-08 | QEA 3 admins, 1 approval for governed role change | Tide console remains pending |
| IT-09 | QEA next valid approval | Tide console request commits |
| IT-10 | Tide/Fabric temporarily unavailable | No signature / settlement |

If any live integration case cannot run, annotate `BLOCKED` or `NOT_AVAILABLE`; never substitute a mock and mark it PASS.

## Adversarial end-to-end test matrix

| Attack | Prerequisite | Assertion |
|---|---|---|
| Inject invoice text | F3 genuine policy | `POLICY_DENIED` and mock rail balance unchanged |
| API status corruption | executor running | No settlement without signed payload |
| Change signed account | captured valid signature | verification rejected |
| Reuse authorized transaction | prior settlement | second post rejected/idempotent, no double credit |
| Supply own public key | attacker signed payload | trusted key pin rejects |
| Race two clients | valid signature/nonce | exactly one DB insert |
| Expired challenge | frozen tx | signer/executor rejects (each where supported) |
| Wrong organization | cross-tenant data | no authorization |
| Single QEA admin tries change | 3-admin Tide realm | still pending |

## Test automation setup

Suggested scripts after dependencies installed:

```bash
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:e2e
npm run build
```

Create scripts intentionally; these commands are target interface, not claims that they exist in the plan archive.

Use Vitest for unit/integration and Playwright for browser E2E if compatible with scaffold. Use seeded SQLite in disposable test DB. Sensitive live tests may require manual human authentication; include an explicit documented manual checklist rather than inventing automated Tide credentials.

## Evidence requirements

For each `VERIFIED` crypto capability preserve:

- Test ID, execution timestamp and Tide environment/SDK version.
- Frozen JSON field values (synthetic only), canonical payload SHA256.
- Tide policy/contract ID, recognized public key fingerprint and signature algorithm.
- Positive signature verification result or real denial (sanitized status/log).
- Executor reason code and unchanged/updated mock ledger state.
- Screenshot of actual Tide realm QEA pending threshold (redact identities when sharing).

Never store tokens, dokens, refresh tokens, passwords, private signing material, API secrets or production customer data in evidence. The signature and public key may be publishable in a synthetic demo, but check platform scope and privacy before posting.

## Manual red-team checklist

- [ ] Inspect every execute path, including server actions/background jobs, for bypass.
- [ ] Confirm authoritative allowlist is not just mutable app DB with no signed protection.
- [ ] Confirm payload signer validates all security-critical fields, not only actor role.
- [ ] Confirm a signing artifact cannot be copied to different request ID/tenant/domain.
- [ ] Confirm transaction display includes exactly the bytes/significant fields that get signed.
- [ ] Confirm no unreviewed default administrator or master realm authority is being advertised as QEA-protected.
- [ ] Confirm mock policy cannot mint an artifact accepted by live verifier.
- [ ] Confirm denied/timeout/outage does not settle, including race paths.
- [ ] Confirm no secret logs or tokens in devtools/network recordings shared publicly.

## Acceptance test report template

```markdown
### IT-03: Authorized Tide signing
Status: VERIFIED | BLOCKED | FAILED
Date/Environment:
SDK versions:
Input payload SHA256:
Policy/contract ID:
Observed signing response format:
Trusted verification key source:
Independent verifier command/test:
Outcome:
Evidence files (sanitized):
Limitations:
```
