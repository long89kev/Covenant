# COVENANT — Unified Internal App Redesign v2

A production-oriented visual direction for matching the **COVENANT Landing Redesign v2** style inside the authenticated product. Replaces the old midnight/cobalt SaaS presentation with warm paper, large editorial type, quiet rules and a dark authorization focal console.

## Preview

Open `index.html` locally (with `styles.css` and `app.js` beside it) in a browser. This is a responsive no-dependency UI **simulation**, not an authenticated Tide backend app.

Views: Overview, Agent activity, Transaction inspector, Governance, Evidence log. Inspector scenarios: within policy, missing approval, tampered invoice. Audit filter and responsive menu are interactive.

## Files

- `index.html` — page layout and semantic content.
- `styles.css` — desktop/mobile visual system.
- `app.js` — deterministic UI state/route simulations.
- `DESIGN_SYSTEM.md` — unified styles and brand migration.
- `WIREFRAMES.md` — five view wireframes and interaction inventory.
- `CLAUDE_CODE_PROMPT.md` — implementation instructions for existing Next.js codebase.
- `ACCEPTANCE_CRITERIA.md` — QA and cryptographic truthfulness requirements.
- `landing.v2.tokens.reference.json` — copied from previous landing package for alignment.
- `qa_smoke.py` — Playwright visual/interaction checks.
- `assets/` — actual browser screenshots of the prototype.

## Security boundary

**No financial transfer, Tide signature, real role grant or policy verification occurs in this static UI.** Production authorization must be implemented separately and verified server-side. The UI never displays illustrative events as real Tide enforcement.

## Claude Code handoff

Place this folder at `design/app-v2/` inside the repository. Ask Claude Code:

`Read the existing CLAUDE.md, then design/app-v2/CLAUDE_CODE_PROMPT.md. Execute the migration without altering existing Tide/Forseti business logic. Use the HTML/CSS reference, screenshots, design system and acceptance checklist as sources of truth.`
