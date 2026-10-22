# COVENANT — Unified Product Design System v2

Status: visual concept and implementation specification; not a live Tide/Forseti integration.

## North star

**One product, two contexts:** the public landing page explains the trust boundary; the internal app makes that boundary inspectable. Carry the same brand values into a denser workspace without recreating a marketing hero on every screen.

Reference source of truth: `COVENANT_Landing_Redesign_v2/design.tokens.json`, `DESIGN_SYSTEM.md`, and the included screenshots. **Exact palette matching is intentional.**

### Personality
- Editorial, precise, architectural, restrained, confident.
- Neither a generic blue SaaS dashboard nor an AI-generated “cyber” sci-fi control room.
- Security source-of-truth visible in every consequential state.
- One dominant dark console per critical view. The rest is quiet paper and rules.

## Foundation tokens

| Token | Value | Role |
|---|---|---|
| `--paper` | `#F1F2EB` | App canvas, same as landing |
| `--paper2` | `#F8F8F3` | Elevated light surface (sparingly) |
| `--ink` | `#17201E` | Body and titles |
| `--muted` | `#6F7871` | Supporting content |
| `--line` | `#D5DAD1` | 1px hairlines and grid |
| `--console` | `#111B19` | Authorization focal area |
| `--console2` | `#22332B` | In-console inner surface |
| `--signal` | `#D5F96A` | Authorized/selected accent, rare |
| `--failure` | `#F19D90` | Denied/tampered states |

Additional toned text colors are acceptable if contrast is measured. **Do not replace lime with cobalt/teal or import the old UI kit's blue status palette.** Use text alongside colors, never color alone for a security decision.

### Type
- Display and body: `Inter, ui-sans-serif, system-ui, -apple-system, Helvetica Neue, Arial, sans-serif`.
- Metadata: `ui-monospace, SFMono-Regular, Cascadia Code, Segoe UI Mono, monospace`.
- Desktop page H1: `clamp(54px, 5.5vw, 90px)` / line-height `.97` / tracking `-.079em`; progressively smaller on narrow screens.
- In-product section titles: 28–40px / line-height ~1.1 / tracking `-.06em`.
- Body: 13–16px. High-impact verdict: >=27px. Tiny mono reserved for optional labels, not critical instructions.
- Monetary amounts: consistent tabular figures where practical.

### Spatial system
- Desktop left navigation: ~258px; muted paper surface; **not** a black/cobalt sidebar.
- Workspace padding: `clamp(26px,5vw,85px)`. Desktop topbar 94px. Section whitespace often 40–70px.
- Layout mostly thin horizontal separators; no repeated bordered cards for every number.
- Accent console 10–12px radius; controls 3–5px; status tags nearly square.
- Content density: structured data can be dense, but use 13–16px line-height-conscious typography; aim for legible scanning.

## Information architecture

| Route | Screen | Visually dominant object |
|---|---|---|
| `/dashboard` | Overview | Large editorial intro + compact metrics rail + dark boundary console |
| `/negotiate` | Agent activity | Trust-labeled transcript + change/diff panel |
| `/transactions/[id]` | Transaction inspector | Three-stage ledger, dark authority column, verdict |
| `/governance` | Governance | Three authority layers in ruled rows |
| `/audit` | Evidence log | Filterable evidence ledger with source provenance |

## Key patterns

### 1. App shell
One-paper canvas with monochrome sidebar, thin dividers, numbered navigation, small simulation status near top. On mobile, collapse navigation into an accessible menu. Do not invent fake customer avatars, logos, activity counts, or role verification.

### 2. Transaction inspector
Three distinct zones: AI Proposal (paper) / Authority Gate (dark) / Executor Verdict (paper). The key anti-slop pattern is the contrast **within** this three-stage comparison. Do not turn it into three rounded, elevated cards with repeated status icons.

### 3. Security state matrix
- `SIMULATED`: immutable visible provenance (global mode + per-view statement).
- `ELIGIBLE_IN_SIMULATION`: lime status with clear no-signature qualification.
- `PENDING_APPROVAL`: warm muted/amber text, `NOT EXECUTED`.
- `POLICY_REJECTED`: restrained red/coral text + explicit reason code.
- `TIDE_CONNECTED_UNVERIFIED`: neutral; never claim signed.
- `LIVE_VERIFIED`: only when verifier actually validates Tide-issued signature on exact canonical payload and signer scope; source & timestamp must be visible.
- `TIDE_UNAVAILABLE`: explicit failure mode; no fallback to live-success visuals.

### 4. AI content provenance
Messages should be labeled `AGENT`, `UNTRUSTED DOCUMENT`, or `SIGNED EVIDENCE` from trusted sources. Prompt injection should be shown as a change in proposed fields rather than dramatic “hacker mode” animation.

### 5. Buttons and inputs
Primary button ink-on-paper OR lime-on-console only; secondary link underline; destructive action requires plain language confirmation. Inputs square-ish and low chrome. Every action/route accessible by keyboard, no fake disabled CTA.

### 6. Responsive
At <=840px, sidebar becomes dismissible drawer; at <=570px metrics become 2 x 2, stacked inspector columns, data tables reduce low-priority columns without truncating critical verdict. No horizontal document scrolling at 390, 768, 1440px.

## Strict forbidden patterns

1. Gradients, glowing backgrounds, glassmorphism, huge illustrations, gradient-border feature cards.
2. Blinking “verified” shield effects; generic stock photos or random icons.
3. Fake public keys/hashes, fabricated evidence proofs, fake Tide endorsements.
4. Green "100% compliance" unless a real, defensible metric exists.
5. Treating Tide QEA admin governance as automatically equivalent to per-transaction business approval.
6. UI checkmarks that stand in for real cryptographic authorization.
7. Overstuffing an operational screen with marketing slogans.

## Quality bar
At a glance, the visitor should recognize the landing and app belong to the *same brand*. At two seconds, an operator should be able to tell what the agent proposed, what policy decided, and whether the independent executor accepted it. At ten seconds, they should be able to inspect why.
