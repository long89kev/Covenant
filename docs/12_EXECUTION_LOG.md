# 12 — Implementation execution log

> Maintained by Claude Code. No credentials, Tide tokens or dokens are recorded here.
> Statuses: `NOT_STARTED`, `IN_PROGRESS`, `VERIFIED`, `BLOCKED`, `SIMULATED`.

## Baseline

- Started: 2026-10-22 13:06 ICT (06:06 UTC)
- Current capability level: **L2 implemented, pending human login evidence**. The L3 gate (a real Forseti signature) is **BLOCKED**.
- Application repository: `covenant-app/` (this repo)
- Runtime: Linux 6.12, Node v22.19.0, npm 10.9.3, Docker (container `sanctum-tidecloak`, image `tideorg/tidecloak-dev:latest`, port 8080)
- Tide realm: `sanctum-demo` (reused from the team's earlier prototype; already licensed, IGA on, users enrolled). Client `sanctum-app`; `http://localhost:3000` origin signed in the adapter.
- Tide SDK versions (installed): `@tidecloak/nextjs` 0.14.40, `@tidecloak/js` 0.14.41, `@tidecloak/react` 0.14.33, `@tidecloak/verify` 0.14.33, `heimdall-tide` 0.14.41; `next` 16.4.2, `react` 19.3.1; `zod` 3.25.76
- Tide ORK threshold (from adapter): `thresholdT` 14 of `thresholdN` 20
- Tide policy/contract deployment: **not possible** (see F3)
- QEA administrator count: 2 enrolled `tide-realm-admin` (admin, lawyer) per the team's notes, so quorum is 1. A third admin is needed for 2-of-3 (human action).

## Phase tracking

| Phase | Status | Evidence | Blocker / next action |
|---|---|---|---|
| 0 — Tide feasibility | **BLOCKED (F3)** / VERIFIED (F0) | See investigation notes 1–3 | Custom Forseti deploy is done by the Tide team only |
| 1 — Identity | VERIFIED (login) | Human TideCloak login on localhost:3000 used for the note 7 run; 401 probes (note 5) | DPoP still off (see debt) |
| 2 — Transaction domain | VERIFIED | `npm test`: canonical/schema/boundary tests pass (note 4) | — |
| 3 — Signer + executor | Executor VERIFIED (test key); live Tide signer **BLOCKED** | Signature-path tests use a local TEST key; no Tide signature exists | Tide team deploys `policies/CovenantPaymentPolicy.cs` |
| 4 — Agent attack demo | VERIFIED (deterministic) / **SIMULATED** policy | Agent tests + service tests pass | — |
| 5 — QEA/business approvers | IN_PROGRESS | Roles + script ready (`scripts/realm-setup.sh`) | Human: create roles, approve grants, enrol 3rd admin, capture pending screenshot |
| 6 — UX | VERIFIED (real login + real data, note 7) | 34/34 Playwright shell checks; live run of all 3 scenarios through the UI; `docs/screenshots/live-*.png` | — |
| 7 — Test + release | IN_PROGRESS | 33/33 unit tests, 34/34 E2E, typecheck clean, build OK | Video, public repo, submission |

## Real capability matrix

| Capability | Status | Evidence |
|---|---|---|
| TideCloak OIDC user login | IN_PROGRESS | Same realm/client/adapter logged in successfully for the earlier prototype; needs a fresh human login on COVENANT |
| Protected server API JWT validation | VERIFIED (negative path) | Note 5: 401 with no token on 7 protected route/method pairs, and 401 for a forged token. Positive path needs a real login |
| 3-admin Tide QEA pending request | NOT_STARTED | Needs the 3rd admin plus a console screenshot |
| Real Forseti policy deployed | **BLOCKED** | Note 2 |
| Real valid Tide signature externally verified | **BLOCKED** | No deployed contract, so no signature to verify |
| Real malicious request denied by Tide | **BLOCKED** | Denial is the **reference policy (SIMULATED)** + executor, not Tide |
| Real business quorum within Forseti policy | **BLOCKED** | Contract written (`ValidateApprovers`), not deployed. The app's approval check is SIMULATED |
| Executor signature + replay protections | VERIFIED (with TEST key) | Note 4: forged key, own-pubkey, wrong prefix, tamper, replay, race, expiry all rejected |
| Deterministic agent injection scenario | VERIFIED | `agents:` test: $50,000 to `unknown-beneficiary-999` |
| Real Tide E2EE fallback | NOT_STARTED (deferred) | Not built: it protects confidentiality, not payment authorization, and adds no demo value here |

## Investigation notes

### 1. F0 toolchain (VERIFIED)
```text
Date/time UTC: 2026-10-22 06:06
Command: node -v; npm -v; docker ps; which dotnet jq ffmpeg
Observed: Node v22.19.0, npm 10.9.3, sanctum-tidecloak Up (8080); jq, ffmpeg present; dotnet NOT installed
Implication: the C# contract cannot be compile-checked locally
Status: VERIFIED
```

### 2. F3 custom Forseti Policy:1 signing (BLOCKED)
```text
Date/time UTC: 2026-10-22 06:10
Source: Tide Agent Pack (Raziel MCP) v1.9.33 — tide_canon "custom-contracts", tide_scenario "policy-governed-signing"
Observed (verbatim): "Deploying a custom Forseti contract is not self-service. You can write the contract and
  compile-check it here. Uploading it to a realm or the network is experimental, test-network only, and done
  by the Tide team (info@tide.org ...). Do not upload it yourself, and do not reconstruct an upload step."
  and: built-in RelationshipAttestation:1 "throws unless the policy names only PolicyEnabledEncryption:1 /
  PolicyEnabledDecryption:1 ... it cannot authorise a signature."
SDK check: @tidecloak/react 0.14.33 useTideCloak() exposes initializeTideRequest / executeSignRequest, so the
  client signing API exists. What is missing is a deployed contract plus a committed signing policy for a role.
Decision: proceed on the documented fallback (ADR-01). Write the contract for the Tide team; do not upload it.
Status: BLOCKED (external: Tide team deployment)
```

### 3. Pinned verification key candidate
```text
Source: tidecloak.json (realm adapter export) — gVVK (32 bytes hex) keyed by vendorId 0268c3be-...
Canon: "a Policy's keyId IS the vendorId", so a deployed contract would sign with the realm key.
Observed: gVVK parses as an Ed25519 public key; SPKI SHA-256 fingerprint ea69e4cf744f67a5...
Implication: CANDIDATE trust anchor only. No real Tide signature has been verified against it.
Status: IN_PROGRESS
```

### 4. Domain + executor tests (VERIFIED)
```text
Command: npm test   (node --test, Node type stripping)
Observed: tests 24, pass 24, fail 0. Typecheck (tsc --noEmit): clean
Covered: JCS vectors; schema rejects unknown fields/floats/0/bad timestamps; proposal rejects
  isApproved/policyPassed/hasQuorum/authorizedSignature; $5,000.00 / $5,000.01 / $20,000.00 / $20,000.01
  boundaries; self-approval, same-person-both-roles, approvals bound to another hash; ATTACK-A/B (status forced
  AUTHORIZED), C (bytes edited; bytes+hash edited), D (two DB connections race -> exactly one settlement),
  E (attacker key + own public key -> UNKNOWN_KEY; claims pinned key id -> INVALID_SIGNATURE; prefix-less
  signature rejected), F, H; live mode rejects fallback auth (MODE_MISMATCH); audit chain edit detected
Limitation: the signature tests use a locally generated TEST key standing in for Tide. They prove the
  executor's verification logic, not that Tide signed anything.
Contract id bound into every transaction (SHA-512 of policies/CovenantPaymentPolicy.cs, computed, NOT observed
  from a deployment): 91C29091889F1360...3058 (full value served by /api/health)
```

### 5. Running app probes (VERIFIED, negative path)
```text
Command: npm run build && npm start; curl probes
Observed: /api/health -> {"authorityMode":"fallback","tidecloak":{"status":"REACHABLE"},"forseti":{"status":"BLOCKED"},
  "executorSelfTest":"PASS"}
  Unauthenticated GET /api/transactions, /api/audit, /api/negotiations -> 401
  Unauthenticated POST /api/transactions, .../execute, .../approve, .../attack -> 401
  Forged EdDSA bearer -> 401 NOT_AUTHENTICATED
Tide doctor (check-only): 11 PASS, 3 WARN, 2 FAIL. The FAILs are static next.config rewrite checks; the relay
  is served by the scaffold's route handler, and the doctor's live checks on that URL PASS (200, byte-exact,
  Allow-CSP-From). WARN: DPoP not enabled (kept off; this realm's working login used Bearer); Forseti contract
  present (expected; goes to the Tide team).
Status: VERIFIED (negative path)
```

### 6. UI design package v1.0 (2026-10-22, VERIFIED for the unauthenticated shell)
Source of truth: `COVENANT_UI_Design_Package/01_DESIGN_SYSTEM.md`, `02_WIREFRAMES.md`, `03_CLAUDE_CODE_HANDOFF.md`.
- Light "Operational Trust" theme from `design.tokens.json` (`app/globals.css`); AppShell with 248/220/72 px
  sidebar, mobile drawer, breadcrumbs, skip link, permanent CapabilityBanner and header mode pill.
- Routes: `/dashboard` (Mission Control; `/` redirects), `/negotiate`, `/transactions`, `/transactions/[id]`,
  `/governance`, `/audit`. Components in `components/covenant/`; presentation rules in `lib/ui/model.ts`.
- Honesty rules enforced in code and tests: app-level mode is never LIVE_VERIFIED; teal only from an executor
  receipt with `TIDE_SIGNATURE_VERIFIED`; simulated passes render cobalt with "SIMULATED"; proof panel says
  `NO TIDE SIGNATURE AVAILABLE`; settlement button reads "Simulate settlement"; Governance shows QEA as
  "not observed by app" and cites this log (quorum 1 until a 3rd admin).
- Additive API fields only: `/api/health.liveVerifiedCount` and per-row `assurance` + ledger counts in
  `listTransactions` (both counted from settlement receipts). No security logic changed.
- Evidence: `npm test` 33/33 (9 new UI-model tests); `npm run test:e2e` 34 passed / 2 viewport skips at
  1440×900 and 390×844: no horizontal overflow on 5 routes, banner present and not dismissible, KPI
  "Authorized with proof" = 0, fixture amounts, login gate, UNAVAILABLE states (health failure, TideCloak down,
  executor unconfigured), live-mode-without-proof = POLICY_UNVERIFIED, skip link, aria-current, drawer.
- Not covered by automation: authenticated flows in a browser (no auth bypass exists by design). They were
  rendered once from pure fixtures via a temporary route (deleted) at 1440/1100/390 px with no overflow; the
  service-level flows (clean, injection, approvals, replay) remain covered by `tests/service.test.ts`.
- No eslint is configured in this project; lint was not run.

### 7. Live UI run with a real TideCloak login (2026-10-22 08:38–08:39 UTC, VERIFIED)
A human logged in with Tide (user `admin`) in a Playwright-driven Chromium window; the script then clicked
through the real UI. No token was read or stored by the script. Results, cross-checked in the audit table:
- Clean $1,200 (TX-EAAD77C6): SIMULATED PASS → `SETTLED_SIMULATED` (assurance SIMULATED_AUTHORITY);
  replay drill → `NONCE_REPLAY`.
- Malicious invoice $50,000 → unknown-beneficiary-999 (TX-3043659F): SIMULATED DENIAL
  (AMOUNT_OVER_CAP, BENEFICIARY_NOT_APPROVED); execute → `POLICY_DENIED`; forge drill → `UNKNOWN_KEY` and
  `INVALID_SIGNATURE`; tamper drill → `PAYLOAD_TAMPERED`.
- Escalation $12,000 (TX-BF213E32): AWAITING APPROVALS; execute → `APPROVAL_REQUIRED`. Approvals not run
  (needs separate Finance and Procurement accounts).
- All authority decisions are the SIMULATED reference policy; no Tide signature was involved.

## Architecture decision records

### ADR-2026-10-22-01 — Truthful fallback: L2 with a simulated payment policy
Context: F3 BLOCKED (note 2), and the deadline is 2026-10-22 18:00 ICT.
Chosen approach:
- Real Tide: login; server-side token verification against the pinned realm JWK; approver roles
  (`covenant-finance`, `covenant-procurement`) that exist only in TideCloak and can only be granted through QEA
  change requests; the AI agent has no Tide identity or credential at all.
- SIMULATED (always labelled): payment rules (cap, allowlist, approval band) run in `lib/covenant/policy.ts`,
  which mirrors the written contract.
- Executor: separate module with its own config (`AUTHORITY_MODE` must be `live` or `fallback`, otherwise it
  fails closed). It ignores DB status, re-hashes the frozen bytes, re-evaluates policy, requires approvals bound
  to the exact hash, and consumes the nonce atomically. Its live path accepts only an Ed25519 signature from the
  pinned Tide key. Every fallback receipt is stamped `SIMULATED_AUTHORITY`.
Consequences: does NOT satisfy the central COVENANT guarantee. A compromised app server or DB could forge
  approval rows or settle a fallback transaction; only a deployed Forseti contract removes that.
Follow-up: send the contract to the Tide team; when it is deployed, switch to `AUTHORITY_MODE=live`.

### ADR-2026-10-22-02 — Reuse realm `sanctum-demo`
Context: free tier allows 5 licences per realm, and failed enrolments consume them; this realm is already
licensed and enrolled. Consequence: the client id stays `sanctum-app`. A fresh realm can be bootstrapped with `npm run init`.

### ADR-2026-10-22-03 — node:sqlite + hand-rolled JCS, no ORM
The built-in `node:sqlite` provides UNIQUE constraints and `BEGIN IMMEDIATE` transactions for replay safety
without a native dependency. JCS is limited to strings, safe integers, booleans, null, arrays and objects (floats
refused), so no number-formatting edge cases exist; covered by test vectors.

## Resolved issues / security debt

- **Gap to L3:** no real Tide signature or Tide denial. Payment denial is SIMULATED.
- **App-side approvals:** approver identity is Tide-verified, but the approval record lives in the app DB and is not a Forseti approver proof.
- **DPoP off:** bearer tokens could be replayed until they expire. Enable `useDPoP` once a login can be re-tested.
- **QEA quorum is 1** until a third `tide-realm-admin` is enrolled.
- **Contract not compiled:** two API names are marked UNVERIFIED in the contract header.
- `master` realm is not QEA-governed (disclosed in the UI and README).
- Fixed during build: the agent's regex captured a trailing period in the beneficiary id (caught by test).
- Fixed after review (2026-10-22): (1) the setup script read the master admin password from `.env`, which
  Next.js loads into the app server; it now reads `.env.admin` (gitignored), so the app process holds no admin
  credential; (2) refused attack drills are shown green, not in the "breach" style; (3) a DB row edited into
  non-canonical bytes shows as TAMPERED instead of crashing the list (new test); (4) removed an unused scenario
  list endpoint and fields; (5) the setup script now fails loudly on a wrong admin password.

## Latest demo rehearsal

- Date: 2026-10-22 08:39 UTC (UI run, note 7)
- Normal real signing: BLOCKED (fallback settles, labelled SIMULATED_AUTHORITY)
- Forbidden real signing: BLOCKED (reference policy + executor deny, labelled SIMULATED)
- External verifier: executor self-test PASS (ephemeral key)
- Actual QEA: pending (needs a 3rd admin + screenshot)
- Simulated components: agents, payment policy, mock rail
- Test summary: 33/33 unit + 34/34 Playwright pass, typecheck clean, build OK
- Video file / repo: pending
