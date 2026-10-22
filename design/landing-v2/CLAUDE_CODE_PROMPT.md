# Claude Code — Implementation Prompt (paste the content below into Claude Code)

You are implementing the **public landing page v2** for the existing **COVENANT** application, a system in which AI agents can propose transactions while Tide/Forseti-backed policy can govern cryptographic execution.

## Inspect the repository first

1. Read the existing `CLAUDE.md`, `README.md`, package manifests, router structure, styling stack, and any Tide/Forseti and auth-related docs. Do not overwrite them.
2. Locate `COVENANT_Landing_Redesign_v2/` (it may be under `design/landing-v2/`). Read `README.md`, `DESIGN_SYSTEM.md`, `WIREFRAMES_AND_STATES.md`, `design.tokens.json`, `ACCEPTANCE_CRITERIA.md`, then open/reference `index.html` and screenshots under `assets/`.
3. Detect the app's existing framework and route layout. Reuse its packages/components where appropriate. Do not introduce a new app, new design framework, or unnecessary third-party dependencies.

## Mission

Implement **this specific landing design** in the existing application. It replaces the rejected previous marketing landing, **not the authenticated enterprise dashboard**. Maintain pixel-level visual fidelity to `index.html` and `assets/desktop_hero.png`/`mobile_hero.png`.

### Look & feel — non-negotiable

- Editorial, restrained, premium infrastructure product: warm paper (`#F1F2EB`), dark ink (`#17201E`), dark authorization console (`#111B19`), one signal accent (`#D5F96A`), soft failure accent (`#F19D90`).
- Bold oversized typography, asymmetrical 2-column desktop hero, thin rules, intentional generous whitespace, quiet mono labels.
- NO 3D illustration, robot imagery, floating neon shapes, blue-purple gradients, glass cards, excessive glowing shadows, stock art, fake clients, fake awards, lorem ipsum, mock metrics, social proof or generic 3-column feature card parade.
- DO NOT redesign it into the usual SaaS template. Use the reference HTML as the design source of truth.
- Minimal copy. Do not add sections absent from the supplied wireframes. Preserve the hero headline exactly: **"Give agents freedom. Not the keys."**

## Page architecture

Public route `/` (or existing public landing route if the router is already configured), preserving existing `/app`, auth, Tide routes, API handlers, and middleware. Sections in order:

1. Slim header: compact COVENANT brand mark, three nav anchors, one "Explore demo" CTA, mobile menu.
2. Split hero: oversized editorial headline & one concise sentence on the left; dark interactive `AuthorizationGatePlayground` on the right.
3. Single thin horizontal 3-stage strip: AI proposes / Policy permits / Executor verifies.
4. Mechanism: "A boundary. Not a promise." left, three numbered editorial explanations right.
5. Full-width dark section: "The agent can be wrong. The gate can say no." and a small attack evidence ledger.
6. Final short CTA and footer.

## Interactive authorization playground

Implement with *typed local demonstration data* and a single state variable. Three scenarios:

- `within-policy`: `$2,400`, verified supplier, PASS, WOULD ACCEPT, Eligible for signing.
- `missing-approval`: `$12,500`, only 1 of 2 independent approvals, PENDING, NOT EXECUTED, Approval required.
- `tampered`: `$50,000`, payee mismatch / amount over limit, DENIED, REJECTED, Execution blocked.

Updates to all visible amount/supplier/intent/policy/executor/verdict fields must derive from the selected scenario. `Run a failure case` and `Run tampered request` set `tampered` then scroll to the playground. Scenario selectors use actual buttons and `aria-pressed`; use `aria-live="polite"` for changed result messaging. The mobile nav is functional and accessible.

**Security communication invariant**: The landing playground is a **simulation**. Show a persistent readable simulation disclaimer. Do not invoke Tide/Forseti unless genuine verified integration exists. Do NOT display `Tide verified`, `signed`, actual signature hashes, completed payments, or authority assurances merely because the user clicked a button. Even the within-policy state must read `Eligible for signing` / `WOULD ACCEPT`, never claim a real signature was produced. The real app's independent executor remains the only place signed payloads are verified.

## Technical implementation

- Prefer existing Next.js App Router + TypeScript + Tailwind if that is what the project already uses. If CSS Modules already exist, use them instead. Reuse CSS tokens rather than inventing a second set.
- Modular components suggested: `LandingHeader`, `EditorialHero`, `AuthorizationGatePlayground`, `ProcessRail`, `MechanismSection`, `FailureModeSection`, `FinalCTA`, `LandingFooter`.
- Scenario data should be structured/typed and pure. Avoid scattering scenario strings across components.
- Implement responsive layouts at 360/390/768/1024/1440/1920px. No horizontal overflow or clipped labels. Keep buttons keyboard-accessible, visible focus states, accessible contrast, and reduced-motion support.
- Prefer CSS/SVG for the simple brand mark, as used in `index.html`; no remote hero image request, no unnecessary icon dependencies.
- No secret/token requirements for the landing. Do not ask for admin credentials or embed real financial information.
- Existing application routes and TideCloak/Forseti flows must remain unchanged and working.

## Validation and deliverables

1. Implement in app using existing conventions.
2. Run lint/typecheck/build and existing tests.
3. Add automated tests for each scenario and mobile menu, plus screenshot checks if Playwright exists. Compare against supplied screenshots (allow reasonable browser font differences).
4. Capture desktop 1440x900 and mobile 390x844 screens and visually inspect both. Fix overflow, awkward wrap and spacing.
5. Ensure the public landing does not claim cryptographic guarantees that are only simulated.
6. Give me: file-by-file change summary, routes affected, test results, screenshots, any deviations with justification, and exact commands to run the app.

## Definition of done

Implementation should feel like a **minimal infrastructure product with one strong demonstration of a trust boundary**, not a generic AI company website. Do not stop at scaffolding or placeholders. Complete the integration and validation in the current work session.
