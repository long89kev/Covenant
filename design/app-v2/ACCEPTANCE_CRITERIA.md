# COVENANT Unified App UI — Acceptance Checklist

## Visual
- [ ] App and landing use identical base palette: `#F1F2EB`, `#17201E`, `#111B19`, `#D5F96A`, `#F19D90`.
- [ ] Navigation is muted light paper, not dark navy/cobalt.
- [ ] Clear visual distinction between AI proposal, authority gate, executor verdict.
- [ ] No generic SaaS icon grids, invented metrics, large shadows, gradient/glow visual effects.
- [ ] Responsive at 390, 768, 1024, 1440px; no horizontal page overflow.

## Interaction
- [ ] Five app sections navigable with keyboard and mouse.
- [ ] Three demo scenarios independently selectable with consistent values across screens.
- [ ] Agent malicious invoice links to matching rejected inspector state.
- [ ] Audit filters and detail routing work.
- [ ] Mobile menu toggles with `aria-expanded`, closes after route selection and Escape.
- [ ] Focus is visible; color is not the only indicator; reduced-motion respected.

## Cryptographic honesty
- [ ] `SIMULATED` label remains whenever local fixture is shown.
- [ ] No `Verified by Tide` without actual verification of Tide signature and binding.
- [ ] Simulated eligible does not appear as settled, signed or successfully executed.
- [ ] Missing approval and mismatched payload show correct reason codes and no authorization claim.
- [ ] Tide QEA (admin IAM) never presented as transaction quorum by default.
- [ ] Live mode shows connectivity/error cases with truthful provenance.

## Engineering
- [ ] Existing backend contracts, auth, TideCloak, Forseti and verifier not regressed.
- [ ] Design tokens centrally defined and shared with landing.
- [ ] TypeScript data state stores proposal, policy, signing, executor separately.
- [ ] Lint, typecheck, production build pass; existing tests preserved.
- [ ] Automated scenario E2E tests pass and screenshots inspected.

## Current static prototype status
- [x] Standalone HTML/CSS/JS implementing five example screens.
- [x] Three modeled inspector scenarios + three deep links from Overview.
- [x] Mobile nav, audit filter, responsive inspector, screen reader state semantics.
- [x] Playwright smoke checks at 390, 768, 1440px using local DOM fixture.
- [ ] No real Tide signing, realm integration, settlement, authentication or backend. **This is expected for a UI concept.**
