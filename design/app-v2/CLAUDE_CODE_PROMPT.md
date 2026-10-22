# Claude Code — COVENANT Internal UI Migration Prompt

You are implementing **only a UI/UX redesign** of an existing COVENANT application. Preserve the trust architecture and working behavior. Do not rewrite Tide/Forseti integration or substitute mocks for live authorization.

## First: inspect the repository

1. Read root `CLAUDE.md`, existing auth/backend contracts, the preexisting COVENANT delivery plan, and every installed Tide SDK integration.
2. Read `design/app-v2/DESIGN_SYSTEM.md`, `WIREFRAMES.md`, and `ACCEPTANCE_CRITERIA.md`.
3. Read `design/app-v2/index.html`, `styles.css`, and `app.js`. Inspect `assets/dashboard_1440.png`, `assets/inspector_tampered_1440.png`, and the mobile screenshots. These are the **visual source of truth**.
4. Compare `design/app-v2/landing.v2.tokens.reference.json` against the project's current landing v2 tokens. Maintain exact brand palette parity.
5. Create a brief file-by-file refactor plan, distinguishing presentation changes from existing data/service behavior.

## Target design

**Editorial Authority**: warm-paper canvas, dark ink typography, lime only as signal, dark green forensic console, numbered navigation, thin separators, generous whitespace, no fake brand proof. This is an operator workspace, not a marketing page or template dashboard.

Routes to migrate:
- `/dashboard` — Mission Control / Overview.
- `/negotiate` — agent messages and untrusted source display.
- `/transactions/[id]` — transaction inspector (the critical demo screen).
- `/governance` — visibly separate business approvals, Tide QEA, and Forseti signing constraints.
- `/audit` — filterable evidence ledger with truthful provenance.

Apply existing project's actual routes when different; do **not** break deep links.

## Integration principles

- Keep TideCloak auth, sessions, role scopes, QEA, actual Forseti signing, authorization APIs, independent executor and verifier logic unchanged except strictly necessary typed view-model adapters.
- Every visual `VERIFIED` claim must derive from actual server-side verification of a Tide-issued cryptographic proof bound to canonical payload; otherwise say `SIMULATED`, `NOT VERIFIED`, or `TIDE UNAVAILABLE` as appropriate.
- Model `proposal`, `policyDecision`, `signingEvidence`, and `executorDecision` as different types; they are not interchangeable. No static CSS color or UI role grant proves authorization.
- Prevent bypass: execution UI invokes existing independently verified execution endpoint. Do not wire actions to direct payment/settlement API paths.
- No fake QEA approvals. Per-transaction approvals, realm governance, and threshold signing are three independent controls.
- If live capabilities are missing, display explicit non-misleading UI and document which behavior is simulated.
- Preserve event auditability and error states.

## Implementation sequence

1. Extract single shared token source from landing v2 into `src/styles/tokens.css` or Tailwind theme variables. Ensure landing and app import the same color/type/spacing tokens.
2. Build accessible `WorkspaceShell`, `WorkspaceNav`, `SystemModeIndicator`, `EditorialPageHeader`, `RuleList`, `AuthorityConsole`, and `StatusText` primitives. Prefer thin rules over boxed cards.
3. Migrate Overview to this shell and tokens. It should resemble `dashboard_1440.png` visually (not pixel-perfect if live data differs).
4. Migrate `TransactionInspector` with three visually distinct panels and *real capability-aware* authority/executor states. This screen is first priority if time is limited.
5. Migrate Agent Activity with provenance-marked messages and proposed-vs-agreed diffs.
6. Migrate Governance with independent type-safe views for business approvals, Tide QEA, signing. Avoid “quorum 2/3” copy unless sourced from actual realm configuration or clearly labeled example.
7. Migrate Evidence Log with filters and real backend event provenance. If data is mocked, clearly mark every row.
8. Implement mobile responsive navigation and stacked Inspector, accessible focus, keyboard support and reduced motion.
9. QA at 390, 768, 1024, 1440px; run lint, typecheck, build, unit/integration/E2E, inspect screenshots; fix issues before reporting completion.

## Visual constraints — do not improvise

- No blue primary UI. The previous cobalt/navy product design is superseded by the landing v2 palette.
- No gradient heroes, glassmorphism, robot imagery, neon glow, stock art, fake logos, floating cards, giant icon grids, excessive shadows or shiny gradient buttons.
- Do not add made-up compliance statistics, hash proofs, customer names or real-world payment statuses.
- Avoid unnecessary copy and boxes. Make data dense where needed but calm.
- Treat screenshot reference as composition and visual rhythm, not authoritative fixture data.

## Completion package

Return a short implementation report: modified files, component mapping, screenshots desktop/mobile, build/test results, known gaps, exact `LIVE` vs `SIMULATED` capabilities, and proof source for every live authorization state. Do not claim Tide implementation is complete because frontend scenarios work.

## Mandatory acceptance

All checks in `ACCEPTANCE_CRITERIA.md` must pass, with explicit exceptions only if existing infrastructure blocks them. Preserve existing security functionality at all times.
