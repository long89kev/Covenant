# 11 — Researched references, validated claims and open verification points

**Research date:** 2026-10-22. Treat web results as a starting point and verify actual SDK APIs/packages, API contracts, realm permissions and policy deployment steps during implementation. Official Tide sources take precedence over secondary explanations.

## Tide challenge and official developer references

| Reference | URL | What it supports |
|---|---|---|
| UNLOCKED challenge | https://tide.org/unlocked/#challenge | Working TideCloak prototype, one new possibility, no unilateral override, public GitHub + demo video, README overview <=300 words, 2-minute / 100MB demo |
| TideCloak Quickstart | https://docs.tide.org/get-started/Tidecloak%20Quickstart | Development Docker, official Next.js scaffold, licence/enrolment process |
| Raziel MCP | https://docs.tide.org/ai-agent-pack | Official `claude mcp add tide-pack -- npx -y @tideorg/mcp`; project `.mcp.json`; security and Forseti guidance |
| Forseti programmable policy | https://docs.tide.org/Core-Concepts/forseti-engine | Policy:1, C# IAccessPolicy validation phases, ORK signing, `heimdall-tide` example, contract ID hash |
| Tide core concepts | https://docs.tide.org/Core-Concepts/core-concepts | Decentralized authority/security motivation, C# policy mechanism |
| QEA governance | https://docs.tide.org/Core-Concepts/iga-workflow | Quorum `max(1,floor(0.7*N))`, 3 admins require 2, `master` realm exempt |
| QEA admin guide | https://docs.tide.org/Admin/SetupIGA | Provision realm, enrol administrators and approve governed role changes |
| Next.js SDK reference | https://docs.tide.org/Languages/NextJS/tidecloak-nextjs-reference | `TideCloakProvider`, `useTideCloak`, JWT verification, middleware/proxy and encrypt/decrypt |
| Next.js integration intro | https://docs.tide.org/Languages/NextJS/tidecloak-nextjs-intro | Supported browser/client patterns |
| E2EE guide | https://docs.tide.org/Admin/e2ee | Tag-specific encrypt/decrypt roles and call syntax |
| KeyleSSH reference implementation | https://github.com/tide-foundation/keylessh-m2 | Open-source Policy:1 precedent, architecture / implementation pattern |
| Raziel MCP source | https://github.com/tide-foundation/raziel-mcp | MCP packages/playbooks, verify current implementation |

## Product context (differentiation; do not claim novelty prematurely)

- Google Agent Payments Protocol (AP2): https://ap2-protocol.org/ap2/agent_authorization/ — signed mandates to authorize agent payments. COVENANT must distinguish its **governed multi-party authority** rather than claim to invent mandates.
- OWASP Agentic AI threats: https://genai.owasp.org/ — agent goal hijack, tool misuse and identity/privilege problems. Locate the currently published agent security threat model when preparing pitch/README.
- IMF research on AI/agentic payments, cited in prior analysis; verify exact latest article and publication details before quoting any number or title.
- Safe multisig: https://docs.safe.global/ — shared signature control already exists; do not market this as first multisignature product.

## Verified capability notes

### A. QEA threshold and exception

Official guide gives `max(1,floor(0.7 × Nadmins))`, hence N=3 -> 2 approvals, N=2 -> 1 approval. `master` realm is not QEA governed. Application realm demo must have three enrolled admins to make a nonunilateral role-change claim.

### B. Forseti lifecycle

Official doc documents `ValidateData`, `ValidateApprovers`, `ValidateExecutor`; not every stage runs for every policy type (approvers for `EXPLICIT`, executor for `PRIVATE`). Policy code is C#; contract identity is derived from SHA-512 of source. SDK example constructs a `BaseTideRequest` and invokes the Tide sign-request flow. **It does not alone verify that our chosen custom policy can be deployed in a specific configured dev realm.**

### C. Authorized signatures and claim scope

Tide's public explanations describe threshold Ed25519 signing. Exact signing response format, key/public identity binding and payload bytes for `heimdall-tide` must be discovered from installed API and test output. Never hardcode an assumed Ed25519 signature over raw JSON just because the docs mention the algorithm.

### D. TideCloak E2EE

`doEncrypt`/`doDecrypt` accept tag arrays and string or Uint8Array content. Required roles follow `_tide_<tag>.selfencrypt` and `_tide_<tag>.selfdecrypt`. This is useful for sensitive agreement storage but **is not a substitute for policy-governed payment signatures**.

### E. Completion/scope of contest

Challenge website says demo can use mocked systems and synthetic data. This authorizes a mock payment rail and fake customer data; it does not justify mislabeling a locally simulated authorization as genuine Tide cryptography. It also appears to show a closed timer beside an explicit October 22 regional deadline; confirm submission status with organizers.

## Unverified until agent performs Phase 0

- Exact installed versions and import signatures of `@tidecloak/nextjs`, `@tidecloak/js`, `heimdall-tide` and related packages.
- Dev-realm feature entitlement for deploying arbitrary Forseti Policy:1 C# contracts.
- How to obtain and freeze validated trusted public verification key for payment authorization.
- Complete return type from `executeSignRequest` and how signed bytes relate to challenged payload.
- Production-ready C# syntax/policy APIs for amount/beneficiary allowlists, distinct approvers and organizational identities.
- Approver consent flow and limitations for `EXPLICIT` per-transaction policy.
- Whether Tide public configuration metadata can be committed to Git, depending on actual contents.

## Source-quality discipline for Claude Code

1. Prefer Tide docs + Raziel MCP playbook, then installed package source/types, then working open-source example.
2. For any security-critical integration claim, store a reproducible local test outcome.
3. Treat examples with `as any`, internal SDK fields, or undocumented methods as probes requiring validation, not reliable public APIs.
4. When a source conflicts with runtime behavior, capture the discrepancy and adjust plan and README; never silently patch around cryptographic checks.
