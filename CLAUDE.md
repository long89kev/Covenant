# Instructions to Claude Code — COVENANT

You are implementing a **real, security-credible** prototype for the Tide UNLOCKED challenge. Read `README.md` and every document in `docs/` before significant implementation. Treat `docs/08_DELIVERY_ROADMAP.md` as the task tracker. Work autonomously and implement end-to-end, not only scaffolding; do not stop after mock UIs.

## Core priorities (highest first)

1. A genuine TideCloak login + QEA configuration, and ideally a **genuine Forseti authorization signature** verified by an independent executor.
2. A convincing, reproducible scenario where a manipulated agent requests an invalid payment that **cannot be cryptographically authorized**.
3. Correct trust boundaries; security evidence and automatic failure tests.
4. Clear, elegant UI and 2-minute demo.
5. Optional LLM integration and nonessential features.

## Absolute rules

- **Investigate before coding Tide integration** using Raziel MCP, current official docs, installed package source and exported types. The docs show a Policy:1 signer pattern but do **not** prove that arbitrary custom policies are deployable in every dev setup. Test capability first.
- Never fabricate Tide-issued tokens, dokens, partial signatures, approval proofs, or policy results. Never represent a local mock as the Fabric.
- No `ALLOW_ALL`, `DEV_BYPASS`, backend-held signing key, insecure development secrets committed to Git, or production API key in browser.
- Never trust frontend authorization or agent-generated text. Validate server-side and in the signed policy. An independent executor must enforce the final cryptographic gate.
- For a security-critical path, reject on unknown state, invalid signature, stale policy, unavailable Fabric, token error, inconsistent payload, expired authority or replay; fail closed.
- A legitimate transaction MUST bind its signature to the exact canonical byte representation of amount, currency, buyer, vendor, beneficiary, invoice, agreement hash, policy identity, nonce, expiration and domain.
- After validation/signing, neither buyer nor vendor nor admin can mutate the signed transaction without invalidating verification.
- In all documentation, explicitly distinguish **business approval quorum**, **QEA admin quorum**, and **Tide ORK threshold**.
- Honor Tide's `master` realm QEA exception; do not claim absolute immunity to all possible operator or physical compromise.
- Synthetic business and invoice data only; use a mock payment rail, no actual financial transfers.
- Do not make arbitrary code execution or external transfers available to the AI agent.
- If using an external LLM API, opt-in only via server-side secret; provide a deterministic offline agent for reproducible demonstration.
- Do not update security assertions from "proposed" to "verified" until tests and observed real results are recorded in `docs/12_EXECUTION_LOG.md`.

## Initial investigation (mandatory Phase 0)

- Inspect repo contents. If a project exists, preserve user changes; scaffold only if absent.
- Check actual Node, Next.js, Tide SDK versions and their API exports.
- Connect Raziel MCP (project `.mcp.json`) and ask for a *verified* C# custom Forseti policy deployment + signing + public-key verification path, including how to authorize sign bytes from `heimdall-tide`.
- Identify whether `Policy:1` contract can validate our proposed transaction content and signatures with the installed environment.
- Verify QEA realm creation and three admin enrolment path.
- Create a smallest possible real proof: a single approved signature verified with the Tide-authenticated public key; the same signing path rejecting a forbidden request.
- Record version numbers, exact docs/commands, key IDs, signing bytes, blocker(s) and observations, not secrets.

## Development style

- TypeScript strict mode, Zod for external input validation, deterministic fixtures.
- Prefer Next.js App Router + shadcn/ui or accessible Tailwind components; choose a stable Node LTS / Next.js version compatible with the installed Tide SDK.
- Choose SQLite + Prisma or Drizzle after checking compatibility; use database transactions for replay protection and settlement state.
- Service interfaces: `TideAuthProvider`, `AuthorityGateway`, `TransactionExecutor`, `AgentRunner`, `AuditSink`. The live authority adapter and demonstrative simulator must be separable by **explicit configuration + persistent demo-state labeling**.
- Keep authentication and doken operations client-side when required by Tide's documented model; never export secrets or try to move browser-bound credentials to the backend.
- Favor end-to-end vertical slices rather than building all screens before integration.
- Run formatting, lint, typecheck, tests and build after each substantive phase. Keep evidence and a concise changelog.

## Stop conditions / integrity of claims

- If custom Forseti signing fails due to inaccessible APIs/policy provisioning, proceed on the truthful fallback without pretending otherwise. The fallback **does not satisfy the full COVENANT guarantee**.
- Real Tide signature verified by executor is a **separate completion gate**. Without it, mark the attack story as *simulated*, not *cryptographically enforced by Tide*.
- Do not include fake video footage of Tide activity or conceal that a security response is mocked.

## What to produce in the implementation repo

Running app, `.env.example`, README with observed capabilities, Docker instructions, seeded synthetic invoices, test suite, threat model, reproducible demo script, screenshots/video capture guidance and an updated `docs/12_EXECUTION_LOG.md`.

## Work loop

For each phase: (1) state deliverables and dependencies, (2) implement, (3) run checks, (4) show concrete verification evidence, (5) update the execution log with status (`NOT_STARTED`, `IN_PROGRESS`, `VERIFIED`, `BLOCKED`, `SIMULATED`), (6) continue to next phase. Do not await permission between routine steps. Ask the human only for credentials, Tide account enrolment, protected realm approvals or other steps requiring their login/action.
