# COVENANT — Landing v2 / Editorial Authority

A minimalist responsive landing page for **COVENANT**, designed to replace the previous, text-heavy, generic SaaS landing concept.

## Open the visual prototype

Open `index.html` in a modern browser. It has **no runtime dependencies** and includes working interactions: switch among three authorization scenarios, launch the attack scenario from two CTA buttons, and use the mobile navigation.

> This is a design prototype. The authorization playground simulates policy outcomes and **does not call TideCloak/Forseti, issue cryptographic signatures, or execute payments**.

## What is in this handoff?

| File | Purpose |
| --- | --- |
| `index.html` | Pixel-level reference implementation, responsive, self-contained |
| `assets/desktop_hero.png` | Desktop hero screenshot at 1440px |
| `assets/desktop_full.png` | Full desktop page reference |
| `assets/desktop_attack.png` | Tampered-transaction state |
| `assets/mobile_hero.png`, `assets/mobile_full.png` | Mobile screenshots at 390px |
| `DESIGN_SYSTEM.md` | Design principles, typography, colors, spacing, interaction rules |
| `WIREFRAMES_AND_STATES.md` | Responsive page anatomy, content, states |
| `design.tokens.json` | Machine-readable styling tokens |
| `CLAUDE_CODE_PROMPT.md` | Ready-to-paste Claude Code implementation prompt |
| `ACCEPTANCE_CRITERIA.md` | Test and handoff requirements |
| `qa_smoke.py` | Optional screenshot + interaction smoke test using Playwright |

## Visual direction

- **Editorial product design**, Swiss-style spacing and typography; minimal text and no stock art.
- **Warm paper and deep forest ink**, with **one signal-lime accent**. No purple-blue glow, shiny 3D planet, generated partner logos, fake trust badges, or invented metrics.
- **One meaningful interactive visual:** the authorization boundary. It directly communicates "AI proposes, policy permits, executor verifies."
- **Structure:** hero + live-looking simulation (clearly labeled), thin 3-step strip, concise mechanism, adversarial failure example, final CTA.

## Integration position

When implemented inside an existing COVENANT Next.js app:

1. Public landing page `/`.
2. Existing COVENANT application routes (e.g. `/app`) remain intact; inspect the actual repository before choosing routes.
3. Keep the interactive landing demo explicitly in *simulation mode* until a validated Tide/Forseti backend has been connected. If the actual system is integrated later, represent genuine proof states separately and only after server-side verification.
4. Follow the **existing** project's Tide/Forseti architecture/security constraints. This package is a frontend visual handoff, not a replacement for the original system implementation plan.

## Copy/paste into Claude Code

Read `CLAUDE_CODE_PROMPT.md`. Paste its contents into Claude Code from the project root, with this folder present under `design/landing-v2/` (or adjust the path once).
