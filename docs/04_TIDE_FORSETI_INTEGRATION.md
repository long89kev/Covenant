# 04 — TideCloak, QEA and Forseti integration: mandatory live feasibility gates

> **Implementation note:** The official docs describe `IAccessPolicy`, `BaseTideRequest`, `TideMemory`, `createTideRequest()` and `executeSignRequest()`, but exact releases, custom policy deployment, public key discovery and request serialization must be verified **against installed packages / Raziel MCP**. Do not invent compile-ready SDK code from conceptual examples.

## Three separate systems

| Subsystem | What Tide docs establish | COVENANT use |
|---|---|---|
| TideCloak OIDC/Next.js | `@tidecloak/nextjs`, provider, useTideCloak, JWT verification | Buyer/finance/approver/authenticated users |
| QEA | Governed changes to roles/permissions; 3 admins => 2 approvals | Admin escalation attack demonstration |
| Forseti Policy:1 | C# `IAccessPolicy`: `ValidateData`, `ValidateApprovers`, `ValidateExecutor`; distributed signing | Sign precise transaction only when policy conditions hold |
| Tide E2EE (optional) | `doEncrypt`/`doDecrypt` with tag roles | Encrypt internal confidential quote/agreement, separate from settlement authorization |

## Gate F0: verify local toolchain

- Node/npm version, Docker status, OS, package resolution.
- Raziel MCP connectivity and exact available tools/playbooks; load relevant Forseti policy deployment guide.
- TideCloak dev container boot; initial realm, client, license/IdP and callback URL setup.
- Scaffold the **official TideCloak Next.js template** or integrate it in an existing compatible Next.js app.
- Confirm `useTideCloak` and server `verifyTideCloakToken` signatures in installed code.
- Record all findings in `docs/12_EXECUTION_LOG.md`.

## Gate F1: real TideCloak identity

1. Use official dev container and scaffold, follow interactive Tide enrolment (human user action).
2. Configure `tidecloak.json` (public adapter info only; confirm content before committing), permitted origins and redirect.
3. Implement login/logout and session status.
4. Verify JWT server-side on every protected endpoint, including issuer, audience and role policy according to SDK.
5. Use middleware/proxy syntax matching installed Next.js major version (`proxy.ts` on Next 16 vs `middleware.ts` on older versions as documented).
6. Prove 401/403 when unauthenticated/unauthorized.

**Completion:** A real user signs in, API recognizes roles server-side, unauthorized requests are blocked.

## Gate F2: real multi-admin QEA

1. Use Tide console to enrol Admin A, B, C into application realm with `tide-realm-admin`.
2. Note that one admin = quorum 1; two admins still quorum 1; **three admins => quorum 2** per published `max(1,floor(0.7*N))`.
3. Propose governed change: privileged role assignment to agent-service account or trusted operator (use a safe synthetic user).
4. Capture pending request after first authorizer.
5. Capture committed change after second distinct admin authorizes (only if desired for demo; otherwise keep denied).
6. Verify user receives role only after committed change and token refresh; do not assume stale JWT automatically changes.

**Important:** QEA here governs IAM configuration. It does **not by itself implement each transaction's finance/procurement business quorum.** The `master` realm is QEA-exempt.

## Gate F3: discover and deploy a real Forseti signing policy

Ask Raziel MCP for a verified **custom C# policy source + binding/deployment workflow** for contract signing of a typed canonical JSON payload. Required evidence:

- Which precise npm packages/exported interfaces and C# SDK assemblies are supported today?
- How are policy source, Policy ID/Contract ID, policy parameters and organization membership created, attested, approved and deployed?
- Does the dev realm permit custom `Policy:1` contracts? Is there an activation/license requirement?
- How exactly are arbitrary challenge bytes provided to `ValidateData`? What portions of `BaseTideRequest` are signed?
- How are `EXPLICIT` approvers collected, verified and bound to the transaction hash? Can we require distinct roles/organizations and forbid self-approval?
- How is executor doken resource/role authorization checked in `ValidateExecutor`?
- Which public key and verification format correspond to the signature returned by `executeSignRequest`? Is the returned structure a single signature, signatures array, or container? Does verification use raw Ed25519 bytes or a wrapper?
- Can the contract bind a trusted policy version/recipient allowlist without relying on a mutable backend lookup?

**Implement one literal end-to-end proof first:**

A. Form deterministic canonical payload for $1,200 to verified supplier.
B. Run the live `Policy:1` signing request with a genuine authenticated doken.
C. Read actual response, retrieve correct public key from authenticated Tide config, verify exact signed bytes using an independent Ed25519 verifier.
D. Change beneficiary and/or amount to forbidden destination/$50,000. Attempt same live policy signing route. Confirm **no valid signature** is issued and audit this fact.
E. Save sanitized logs / repeatable test, state what is proven.

Do **not** continue asserting full guarantee if either C or D fails.

## Contract behavior specification (conceptual, not drop-in C#)

`ValidateData(ctx)`:
- Extract precisely the expected request type/domain and canonical payload bytes.
- Reject extra/unknown fields and noncanonical serialization or mismatched domain/version.
- Enforce `amountMinor > 0`, currency whitelist, per-transaction cap, allowed vendor + beneficiary pair, signature expiry and policy ID/contract commitment.
- Confirm payer org and service/resource match expected parameterized context.
- Enforce agreement hash and invoice-binding format; reject malformed data.

`ValidateApprovers(ctx)` (where `EXPLICIT` contract applicable):
- For 500_001–2_000_000 minor units (i.e. $5,000.01–$20,000), require **Finance Officer + Procurement Manager**, distinct valid identities and optionally distinct organizations; prohibit requester self-approval.
- Approver proofs must be bound to this exact transaction hash and authorization context, not reusable across another request.
- Above cap reject. Under/equal $5,000, do not accidentally require high-value approval route.

`ValidateExecutor(ctx)` (where `PRIVATE` applicable):
- Doken authentic, unexpired, appropriate resource/tenant/role and context.
- No privilege just because AI generated request; signer must be a correctly scoped Tide identity.

**Rule thresholds are illustrative design parameters, not existing built-in functions.** C# signatures and source syntax must be verified in MCP/reference repository before compile.

## Policy verification and deployment evidence

Store public, nonsensitive metadata:

```text
Contract source SHA512: <observed>
Tide Contract ID: <observed>
Tide signing key / public key ID: <observed>
Payload format + exact sign challenge bytes: <observed>
Tide signing response structure: <observed>
Independent verifier algorithm/test: <observed>
Positive case: <timestamp and test ID>
Denied case: <timestamp and reason>
Policy deployment approvals: <observed>
```

**No hardcoded fabricated Contract ID or public key.** Pin observed trust anchors in authenticated config and provide rotation plan.

## Illustrative SDK architecture (recheck before implementation)

Published docs reference `@tidecloak/js` and `heimdall-tide` types `TideMemory`, `BaseTideRequest`. They show an authenticated browser flow, building a `Policy:1` request and calling Tide's signing methods. Treat such snippets as architectural reference until actual environment confirms package versions, Tide doken handling, contract provisioning and returned signature container. Avoid accessing unsupported internals without verifying version compatibility.

## Optional E2EE fallback (real Tide functionality)

If custom contract provisioning is blocked, implement an independent real Tide E2EE proof:

- Create tag `agreement` roles `_tide_agreement.selfencrypt` and `_tide_agreement.selfdecrypt` through governed QEA.
- Client encrypts a synthetic contract via `doEncrypt([{data: text, tags:['agreement']}])`.
- Backend stores only returned ciphertext; unauthorized account cannot decrypt; authorized account can.
- Capture real QEA governance role-change workflow.

**Label accurately**: "real TideCloak E2EE + QEA; payment risk rules are an illustrative local simulation." This is NOT equivalent to a production-secure COVENANT signing layer and fails L3 central signing acceptance.

## Failure and fallback ladder

1. F3 succeeds: build full COVENANT live authority boundary.
2. F3 only supports a generic Tide signing contract that checks roles but **not payload**: document a narrower integrity guarantee; prohibited $50k denial cannot be attributed to Tide policy.
3. F3 unavailable: proceed with TideCloak E2EE/QEA and explicitly isolated policy demo; never display verified settlement or genuine Forseti deny.
4. No TideCloak connection: static story/demo can be shown only as conceptual; challenge requires TideCloak integrated so mark submission blocker.

## Official references

- https://docs.tide.org/ai-agent-pack
- https://docs.tide.org/Core-Concepts/forseti-engine
- https://docs.tide.org/Core-Concepts/iga-workflow
- https://docs.tide.org/Admin/SetupIGA
- https://docs.tide.org/Languages/NextJS/tidecloak-nextjs-reference
- https://docs.tide.org/Admin/e2ee
- https://github.com/tide-foundation/keylessh-m2
