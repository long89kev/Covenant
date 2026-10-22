# 03 — Threat model, security invariants and honest limitations

## Scope

A Tide-protected signing authority releases an Ed25519 authorization only for a policy-permitted, exact B2B payment instruction. A mock settlement executor checks the signature and constraints. AI and supplier-supplied documents are untrusted.

## Assets

1. Signing authority and public-key/policy identity binding.
2. Integrity of amount, currency, beneficiary, vendor, quote, agreement and payment destination.
3. Independence of approvals and governed policy changes.
4. Confidentiality of Tide credentials and any encrypted contracts.
5. One-time authorization and integrity of the synthetic ledger.
6. Audit evidence of rejected and accepted attempts.

## Adversaries and capabilities

| Attacker | Assumed access | Desired outcome |
|---|---|---|
| Malicious supplier | Quote/invoice/PDF/text bytes | Make AI change payee/amount, bypass approval |
| Compromised buyer AI | Entire agent prompt/context + tool suggestions | Create unauthorized execution or new policy |
| Compromised application server | Read/write app DB and route code | Fabric signature without compliant authority |
| One compromised admin | Initiate realm permission change | Give AI privileged access, bypass 2-of-3 QEA |
| Malicious approver | One valid identity | Self-approve or reuse old approval |
| Network attacker | Retry/capture authorization artifacts | Replay accepted payment |
| Malicious browser or compromised human device | Alter proposals/approval display | Trick real users or redirect authorized payments |

## Security invariants (tests required)

- **I1:** Every executed synthetic payment has a real Ed25519 signature, verifiable from the committed allowed public key over exact canonical transaction bytes.
- **I2:** Signatures are not reusable across nonce, expiry, policy ID, domain, amount, beneficiary or agreement.
- **I3:** UI, DB and API write privileges cannot directly set `SETTLED_SIMULATED` without independent executor verification and atomic nonce consumption.
- **I4:** AI agent never holds broad settlement credential nor Tide administrative credentials.
- **I5:** Untrusted invoice text cannot become system instructions or a role/approval proof; it may at most contaminate an untrusted proposal.
- **I6:** Changing a governed Tide realm permission under 3 QEA admins requires 2 actual approvals; 1 admin is not sufficient.
- **I7:** Unknown verification keys, policy versions, timeouts, signature failures and exceptions reject authorization.
- **I8:** Business-approval threshold is cryptographically enforced if and only if real Forseti approver validation is verified. A DB count is never sufficient.
- **I9:** No token/doken, private material or production secrets appear in logs, commits or video.
- **I10:** The system explicitly states master-realm and trusted-verifier assumptions.

## Threat-to-control map

| Threat | Control | Negative test |
|---|---|---|
| Prompt injection via invoice | Treat output as proposal; Forseti verifies exact structured conditions | Agent proposes $50k to new account; no live Tide signature |
| Backend DB status tampering | Executor ignores status flags, verifies signed message | Manually set status=APPROVED; direct execute denied |
| Backend tries bypass | No separate unrestricted mock rail endpoint | Call rail directly without signature, 403 |
| Payload substitution | Signed bytes bind beneficiary, amount, invoice, etc. | Mutate one field post-sign; reject |
| Replay attack | Unique nonce + atomic consumed-at ledger | Repeat signed request; only one posting |
| Cross-tenant injection | Buyer/vendor/issuer/contract/resource part of signed payload | Use another org's signed artifact; reject |
| Compromised admin | QEA governed role mapping (3 admins / 2 votes) | First approval only => pending |
| One finance approver | Distinct-org and no-self-approval under Forseti, if supported | Repeat approver or requester as approver => reject |
| Expired contract/grant | Time-bound signed authorization + trusted verifier clock | Replay expired payload => reject |
| Signature key spoofing | Trusted out-of-band key registry | Inject self-generated key in payload => reject |
| Partial outage | Fail closed, visible retry UX | Disable signing service => no settlement |
| Malicious UX | Human-readable details cryptographically bound where possible; signed challenge transparency | Display beneficiary A while signing B => test mismatch |

## Critical assumptions and exclusions

- Tide's ORK and browser-bound protocol security claims are based on Tide architecture and must be used through supported SDK.
- The public key used by the executor is provisioned from an **authenticated Tide source**; never accept `publicKey` supplied by requester as trust anchor.
- The independent executor runs as a separate boundary (a distinct service or strictly isolated module with independent config); a fully compromised executor can still create fictional "settlements" in the mock system. Do not claim protection from malicious real banks or arbitrary settlement providers.
- QEA does not govern the TideCloak `master` realm. Physical/cloud infrastructure superuser may alter displayed data or disable the system; integrity guarantees must be scoped to cryptographic authority and verifier.
- A malicious authorized human quorum can approve harmful actions. Cryptography enforces policy, not sound business judgment.
- Signing policy must inspect signed payment **payload**, not only requester's roles. A role-only signer would permit a prompt-injected agent to authorize any request within that role.
- If a user signs malicious bytes due to deceptive UI, cryptographic verification can only prove the exact bytes were signed; add clear human transaction review.
- Revocation does not reverse a previously settled payment or undo data already disclosed.
- The platform does not prove an invoice is genuine, that a vendor account is honest, or that an AI's recommendation is economically sound.

## Attack drill design

1. `ATTACK-A`: indirect prompt injection, beneficiary substitution + extreme amount.
2. `ATTACK-B`: backend-level `APPROVED` status injection and direct POST to executor.
3. `ATTACK-C`: mutate the signed beneficiary without re-signing.
4. `ATTACK-D`: replay exact signed transaction twice concurrently.
5. `ATTACK-E`: malicious actor signs with an unknown private key and includes own public key.
6. `ATTACK-F`: remove required second business approval (if Forseti policy deployed).
7. `ATTACK-G`: QEA role escalation with 1 of 3 admins.
8. `ATTACK-H`: expired grant, wrong domain, wrong policy ID or wrong tenant.

Each attack produces verdict, audit event, and invariant assertion. Run attacks in a deterministic test harness against the real signing boundary where possible.
