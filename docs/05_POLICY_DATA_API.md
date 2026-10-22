# 05 — Policy specification, canonical data and API contract

## Domain constants (prototype)

- Currency: USD only; encode all money as integer **minor units** (cents); never use JS floating-point values for money.
- Demo buyer: `acme-parts`.
- Demo approved vendor: `northstar-components`, beneficiary `northstar-verified-001`.
- Demo hostile vendor: `shadow-supply`, beneficiary `unknown-beneficiary-999`.
- Automatic limit: 500,000 cents ($5,000.00), eligible only for approved vendor/beneficiary and other checks.
- Manual approval band: 500,001–2,000,000 cents ($5,000.01–$20,000.00); require finance + procurement independent approvals in real Forseti if capable.
- Over $20,000: deny for v1, regardless of approvers.
- `policyVersion = "covenant-procurement-v1"`; bind to actual contract ID after observed deployment.
- Expiry: default 10 minutes for proposed payment authorization (configurable, verify in contract/executor).
- Signing key identity: **obtained from authenticated Tide source and pinned**; not client-supplied.

## Canonical transaction JSON (schema-level illustration)

```json
{
  "schemaVersion": "covenant.tx.v1",
  "domain": "COVENANT/PROCUREMENT/PAYMENT/V1",
  "requestId": "00000000-0000-4000-8000-000000000001",
  "buyerOrgId": "acme-parts",
  "vendorOrgId": "northstar-components",
  "invoiceId": "INV-NS-1001",
  "agreementSha256": "<64 hex chars of frozen agreement>",
  "beneficiaryId": "northstar-verified-001",
  "currency": "USD",
  "amountMinor": 120000,
  "nonce": "<secure random 32-byte hex>",
  "policyVersion": "covenant-procurement-v1",
  "tideContractId": "<observed actual Tide policy/contract ID>",
  "issuedAt": "2026-10-22T04:00:00.000Z",
  "expiresAt": "2026-10-22T04:10:00.000Z"
}
```

Angle-bracket fields are **placeholders, not valid request fixture values**. Generate valid deterministic fixtures with seeded test entropy, and secure random nonces outside tests.

## Integrity rules

- Validate with strict Zod schema, including rejection of unknown fields. Check ISO UTC timestamps and `issuedAt < expiresAt`.
- Do not trust `amount` parsed as a formatted string. Use `amountMinor` integer (`Number.isSafeInteger`, `>0`).
- Canonicalization algorithm: RFC 8785 (JCS) implementation after inspection of compatibility, with recorded test vectors. Never sign naive `JSON.stringify()` with unspecified field order across languages.
- Domain separation must be included within the **actual bytes Tide signs** and Forseti checks. Determine Tide-specific wrapping from live API, not assumption.
- `agreementSha256` binds the accepted B2B order; invoice hash optionally include if invoice is important to the decision.
- Recipient allowlist MUST be a trustworthy policy configuration/committed source, not a buyer-submitted `approved: true` field.
- Contract source ID, Tide key identity, tenant and resource identity must be authenticated and checked. An attacker must not be able to substitute a verification key stored on the transaction.
- Recompute payload digest from immutable stored bytes before rail execution; do not use body supplied by requester when posting.
- Approver signatures (if applicable) bind `transactionSha256`, requester, domain, policy version, expiry and nonce.

## Database entities (SQLite in MVP)

### `organizations`

`id PK`, `name`, `kind` (`BUYER`, `VENDOR`, `FINANCE`, `PROCUREMENT`), `status`.

### `users`

`id PK`, `tideSubject UNIQUE`, `orgId FK`, `displayName`, `displayRole` (display only; effective permission from Tide claims), `createdAt`.

### `vendors`

`id PK`, `orgId`, `beneficiaryId`, `approvalState`, `updatedAt`; treat app DB allowlist as **untrusted** unless tied to committed policy or independently signed registry.

### `rfqs` and `quotes`

`id`, `buyerOrgId`, `vendorOrgId`, `itemSku`, `quantity`, `unitPriceMinor`, `currency`, `sourceText`, `sourceLabel`, `trustedSourceHash`, `createdAt`.

### `transactions`

`id PK`, `requestId UNIQUE`, `buyerOrgId`, `status`, `canonicalBytes BASE64/TEXT UNIQUE?`, `canonicalSha256`, `tideContractId`, `nonce UNIQUE`, `issuedAt`, `expiresAt`, `originScenario`, `createdAt`; only `status` and audit metadata change, never frozen payload.

### `approvals`

`id`, `transactionId`, `tideSubject`, `approverRole`, `approverOrgId`, `decision`, `proofRef`, `transactionHash`, `createdAt`, unique `(transactionId,tideSubject)`; database records alone are informational, **not Forseti quorum proofs**.

### `authorizations`

`id`, `transactionId`, `keyId`, `policyContractId`, `algorithm`, `verifiedSignatureB64`, `actualSignedBytesHash`, `tideAuthResult` (`REAL`, `DENIED`, `SIMULATED`), `createdAt`; never allow simulated record to execute verified settlement path.

### `settlements`

`id`, `transactionId UNIQUE`, `nonce UNIQUE`, `payloadSha256`, `signatureSha256`, `status` (`SETTLED_SIMULATED`), `createdAt`; transactional uniqueness provides idempotency.

### `audit_events`

`id`, `correlationId`, `transactionId?`, `timestampUtc`, `actor`, `eventType`, `decision`, `reasonCode`, `payloadHash`, `metadataRedactedJson`, `previousEventHash?`, `eventHash?`.

## Strict transaction state transitions

`DRAFT -> FROZEN -> {AWAITING_APPROVAL | AUTHORIZATION_REQUESTED} -> {AUTHORIZED | REJECTED} -> SETTLED_SIMULATED`.

- Reject illegal transitions centrally. Use DB transaction/compare-and-swap on previous status.
- Timeout/offline/no signature => `REJECTED` or `AUTHORIZATION_FAILED`, never `AUTHORIZED`.
- Never allow app APIs to set `AUTHORIZED` directly. Only a verified real Tide signature qualifies.

## API routes (proposed, implementation-level contract)

| Route | Method | Actor | Request | Response / important checks |
|---|---|---|---|---|
| `/api/me` | GET | logged-in user | — | Trusted Tide subject + role claims |
| `/api/scenarios` | GET | logged-in user | — | Seed fixtures and scenario descriptions |
| `/api/negotiations` | POST | buyer operator | scenarioId | Runs restricted agent simulation, returns proposal and source provenance |
| `/api/transactions` | POST | buyer operator | proposalId, exact normalized fields | Zod parse, freeze canonical bytes, return hash/id |
| `/api/transactions/:id` | GET | relevant stakeholder | — | Frozen payload, signature status and audit trail |
| `/api/transactions/:id/authorize` | POST or client-side SDK orchestration | authorized Tide user | frozen request reference | Creates actual Tide signing attempt; server stores only verified result; never forwards doken to server merely for convenience |
| `/api/approvals` | POST | named finance/procurement person | txId, decision | Record user decision; if Policy:1 supports it, orchestrate real approval proof separately |
| `/api/transactions/:id/execute` | POST | authorized actor, rail boundary | verified auth reference | Independently verify signature + nonces; 409 on replay |
| `/api/audit` | GET | auditor role | filters | Redacted ordered events |
| `/api/security/health` | GET | authenticated | — | REAL / SIMULATED / BLOCKED capability badges from actual checks |

**Implementation note:** In modern Next.js dynamic route syntax is `[id]`; route descriptions here use `:id` for readability. Do not expose privileged `/execute` endpoint that any unauthenticated caller can hit.

## Executor verification algorithm (reference pseudocode; not yet implementation)

```text
execute(txId, authorizationArtifact):
  authenticate caller and load immutable frozen canonical bytes from store
  enforce implementation is configured for LIVE_TIDE_SIGNATURE mode
  assert authorizationArtifact.source == verified Tide signing path
  assert artifact's keyId is present in independently pinned allowed key registry
  assert actualSignedBytes exactly match the expected challenge (incl domain)
  assert Ed25519.verify(signature, actualSignedBytes, trustedPublicKey) == true
  parse immutable canonical payload; reject unknown/malformed fields
  assert domain/schema/policy ID/contract ID/tenant match pinned configuration
  assert 0 < amountMinor <= maxSupported and currency == USD
  assert beneficiary/vendor allowed by trusted policy or signed registry
  assert nowUTC in [issuedAt, expiresAt] with justified skew policy
  assert agreement hash matches frozen agreement
  DB TRANSACTION:
     assert nonce unused and transaction status == AUTHORIZED
     insert settlement unique(txId, nonce)
     mark transaction SETTLED_SIMULATED
     insert audit event
  return synthetic receipt (no money moved)
```

**Policy divergence hazard:** avoid implementing a weaker executor allowlist than signer policy or vice versa. Negative tests must cover both layers.

## Error / audit reason codes

`TIDE_AUTH_UNAVAILABLE`, `NOT_AUTHENTICATED`, `ROLE_FORBIDDEN`, `INVALID_SCHEMA`, `UNKNOWN_POLICY`, `POLICY_DENIED`, `APPROVAL_REQUIRED`, `APPROVER_NOT_DISTINCT`, `UNKNOWN_KEY`, `INVALID_SIGNATURE`, `PAYLOAD_TAMPERED`, `EXPIRED_AUTH`, `NONCE_REPLAY`, `AMOUNT_OVER_CAP`, `BENEFICIARY_NOT_APPROVED`, `CROSS_TENANT`, `SETTLEMENT_CONFLICT`, `SIMULATION_ONLY`.
