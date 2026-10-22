# Acceptance Criteria — COVENANT Landing v2

## Visual

- [ ] Desktop 1440px approximates `assets/desktop_hero.png` and `assets/desktop_full.png`.
- [ ] Mobile 390px approximates `assets/mobile_hero.png` and `assets/mobile_full.png`.
- [ ] Oversized hero typography remains legible and does not overflow at 360, 390, 768, 1024, 1440, 1920.
- [ ] Only one lime accent, sparing coral/red for denial; no purple/blue gradients or stock imagery.
- [ ] No inflated "AI slop" sections: fake brands, metrics, testimonials, repetitive feature cards.
- [ ] Public page uses short, high-signal copy and intended negative space.

## Interaction

- [ ] Clicking all three scenarios changes amount, account, policy, executor, and verdict labels in sync.
- [ ] Valid scenario says `Eligible for signing`, NOT `Signed by Tide`.
- [ ] Approval scenario says `Approval required`, NOT a final rejection of a cryptographically valid transaction.
- [ ] Tampered scenario says `Execution blocked` / `REJECTED` with explicit mismatch reason.
- [ ] `Run a failure case` and dark-section CTA select tampered scenario and bring console into view.
- [ ] Mobile nav expands/collapses and links navigate to real sections.
- [ ] Keyboard navigation works; screen-reader labels exist; `prefers-reduced-motion` is respected.

## Safety/technical truthfulness

- [ ] Disclaimer is present: this landing UI is a simulation, not a live Tide signing session.
- [ ] No production payment processing, crypto signatures, or compliance guarantees are faked.
- [ ] Real app routes and existing TideCloak/Forseti integration remain unchanged.
- [ ] A compromised frontend cannot trigger real execution by changing labels; executor verification must remain outside UI.

## Engineering

- [ ] Production build succeeds; TypeScript/lint checks pass if used.
- [ ] No unnecessary dependencies or remote media dependencies.
- [ ] No horizontal scroll at specified screen widths.
- [ ] All CTA actions work; no dead buttons or anchor targets.
- [ ] Before/after screenshots and implementation summary provided.
