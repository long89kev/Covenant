# 13 — Copy/paste prompts for Claude Code

## Primary prompt — start autonomous implementation

```text
You are the principal full-stack and security engineer implementing COVENANT for the TIDE UNLOCKED hackathon.

Read README.md, CLAUDE.md and ALL docs/00_*.md through docs/12_*.md in this workspace before coding. This project is intended to win on technical novelty, real-world relevance, and a judge-visible demonstration of Tide's Emergent Authority.

Build the application end to end in this workspace using the official TideCloak Next.js starter where compatible. Immediately connect and use Tide Raziel MCP from .mcp.json. Treat official docs and real installed SDK types as the authority, not guesses.

FIRST PRIORITY: Prove actual custom Forseti Policy:1 capability: real positive Tide signature on exact transaction challenge, independently verify with a genuine Tide public key, then real negative signer denial for amount/beneficiary disallowed by policy. Before implementing speculative complex features, record what is available and any blockers in docs/12_EXECUTION_LOG.md.

Only then implement immutable canonical transactions, independent signature-validating mock payment executor, concurrency-safe nonce replay prevention, buyer/seller agent negotiation fixtures, indirect prompt-injection scenario, Tide QEA 3-admin workflow, UI, adversarial tests and demo. Follow docs/08_DELIVERY_ROADMAP.md in priority order. Keep code secure and runnable.

Never claim simulated approvals or locally generated signatures are Tide/Forseti enforcement. If custom signing is unsupported or blocked, implement a real Tide E2EE + QEA fallback, clearly label the transaction policy simulation, and honestly document the reduced guarantees. The fallback cannot be reported as completion of the central COVENANT signing requirement.

Use strict TypeScript/Zod, tests and observable evidence, not only a frontend. Run lint, typecheck, tests and build. Maintain execution log with actual results after every phase. No actual funds or production secrets. Ask me only for the human account enrolment/admin approvals/credentials that cannot be automated; otherwise proceed autonomously.

Deliver a clean, responsive enterprise dashboard plus a judge-ready 2-minute demo script and <=300-word README overview aligned to the five official prompts after inspecting the live contest page. State what's real Tide, what's mock rail, and what's simulated AI.
```

## Prompt — hard integration review

```text
Audit the current COVENANT implementation as if you were a hostile judge. Compare it with CLAUDE.md, docs/03_THREAT_MODEL.md and docs/09_TESTING_EVIDENCE.md. Enumerate every path where an AI, admin, app server, database edit or unknown key could create a settlement without a genuine policy-compliant Tide authorization. Execute available negative tests and publish evidence. Reclassify any unverified claim as SIMULATED or BLOCKED. Fix highest-severity issues first.
```

## Prompt — demo preparation

```text
Create a reproducible 120-second demo and contest README for COVENANT. Use only the capabilities that docs/12_EXECUTION_LOG.md marks VERIFIED. Show one legitimate signed transaction, one compromised AI proposal rejected at the real Tide signing boundary (only if proven), one tampered signature rejected by the independent executor, and a real QEA pending change if available. Clearly label fake ledger/AI fixtures; no fabricated screens or vendor promises.
```

## Prompt — fallback if custom Forseti signing is unavailable

```text
We cannot currently deploy or invoke a custom Forseti contract in this environment. Follow the fallback in docs/04_TIDE_FORSETI_INTEGRATION.md: build real TideCloak OIDC, 3-admin QEA and Tide E2EE protection for sensitive contract data, while keeping any mock transaction policy strictly and visibly SIMULATED. Preserve a clean integration seam for future Forseti signing, document exactly what stopped real signing, and do not misrepresent the challenge guarantee.
```

## Expected final handover from Claude Code

1. List of changed/added files and how to run app.
2. Actual working Tide features with exact evidence.
3. Status of real signer/genuine public-key verification/denial.
4. All failing/skipped tests and why.
5. Screenshots/demo scripts and README.
6. Explicit security limitations and next steps.
