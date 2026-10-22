# COVENANT v2 — Landing Design System

## Design thesis

**Show the trust boundary; do not describe it in twenty feature cards.**

The emotional difference from a generic AI security startup landing page is *restraint*. Editorial black type on warm paper. One precise interactive system diagram, treated like infrastructure instrumentation. Strong hierarchy, generous negative space, no hype graphics.

### Non-negotiable anti-slop rules

- No glowing planet/robot/brain/circuit illustrations, random blobs, excessive gradients, glassmorphism, or floating dashboard mockups.
- No icon grids, fake client logos, invented compliance percentages, testimonials, usage statistics, endorsements or "enterprise-ready" security claims without evidence.
- Avoid generic marketing phrases: "revolutionizing," "next-generation," "seamless," "unlock the power of," "secure by design" unless justified by content.
- Never render more than **two CTAs** in a single section; one primary and an optional understated text action.
- Avoid decorative animation. If you add motion, keep it subtle, brief, and respect `prefers-reduced-motion`.
- Favor technical precision: the public demo is a **simulation** unless cryptographic execution is really wired and verified.

## Palette

| Token | Value | Purpose |
|---|---|---|
| `paper` | `#F1F2EB` | Main background (warm off-white) |
| `paperElevated` | `#F8F8F3` | Elevated light surface, menu |
| `ink` | `#17201E` | Titles, primary CTA, body text |
| `forest` | `#16211E` | Dark contrast section |
| `console` | `#111B19` | Interactive authorization console |
| `consoleElevated` | `#22332B` | Console verdict background |
| `secondaryText` | `#6F7871` | Supporting copy |
| `hairline` | `#D5DAD1` | Thin separators, never heavy box borders |
| `signal` | `#D5F96A` | Primary semantic authorization highlight; sparing |
| `failure` | `#F19D90` | Refusal / denial / blocked states |

**Color rule:** lime signals allowed/interactive; red signals blocked or mismatch. Also label statuses in text so color is never the sole indicator. Do not use lime for every decorative UI element.

## Typography

- Preferred: `Inter` or clean native sans stack for display and body, **without external font dependency**.
- Technical labels: native monospace stack (`ui-monospace`, SFMono-Regular, Cascadia Code, Segoe UI Mono, monospace).
- Hero desktop: `clamp(62px, 6.5vw, 110px)`, weight ~680, line-height `.965`, letter-spacing `-.084em`.
- Section heading: `clamp(45px, 5vw, 78px)`, line-height `1.05`, letter-spacing `-.075em`.
- Mobile hero: `clamp(51px, 12vw, 68px)` under 440px.
- Body: 16–19px / line-height 1.65; console detail: 10–13px monospace, labels uppercase.
- Never use tiny body text. Micro-labels are for optional structured metadata only.

## Grid and spacing

- Content max width: `1512px`; horizontal padding `clamp(24px, 5vw, 82px)`; mobile 20px.
- Main hero two columns desktop (~50/50), single column tablet/mobile under 780px.
- Hero top whitespace ~62–106px. Mechanism section ~120px top/bottom desktop; dark contrast section ~110px.
- Thin dividers structure the page; don't place all content in cards.
- Corner radii: console 12px; small status/control corners 3–6px; primary CTA 4px. Pill only for scenario chooser/top CTA.

## Components

### Global header

Small linked logo, 3 quiet nav links, one "Explore demo" pill CTA. Mobile: a single accessible menu button, collapsible nav (aria-expanded), dismiss after choosing a link.

### Primary CTA

Ink background, white text, almost-square radius, trailing arrow. Hover only subtle lift; focus ring highly visible.

### Secondary CTA

Underlined text, not another colored button.

### Authorization console

Dark panel with thin lime top indicator and small mono "INTERACTIVE SIMULATION" label. Three scenario selectors:

- `Within policy`: transaction $2,400, allowed supplier, all modeled checks pass → `Eligible for signing`, `WOULD ACCEPT`.
- `Missing approval`: transaction $12,500, 1 of 2 required approvals → `Approval required`, `NOT EXECUTED`.
- `Tampered`: transaction $50,000, unverified payee/mismatched payload → `Execution blocked`, `REJECTED`.

Each scenario updates *all* dependent labels from a single state source. **The valid state is not cryptographic proof**; it is a simulation that would need real signing and server-verification before being called authorized.

### Attack example

One lean evidence ledger, not a huge dashboard: deviation → policy rejection → no signature. It is a conceptual demonstration, not a live attack trace. No fake transaction hashes.

## Responsive and accessibility

- Target widths: 360, 390, 768, 1024, 1440, 1920.
- Zero horizontal overflow at all target widths.
- All real controls are actual `<button>` or `<a>` elements with visible focus states.
- Scenario buttons expose `aria-pressed`; result area uses `aria-live="polite"`.
- Mobile menu exposes `aria-expanded` and `aria-controls`.
- Maintain WCAG AA contrast for paragraph text, and avoid lime on paper for long readable text.
- Respect `prefers-reduced-motion`.

## Copywriting discipline

Hero: **"Give agents freedom. Not the keys."**

Subheading: "Agents propose. Cryptographic policy decides what can actually execute."

Other headings: "A boundary. Not a promise." and "The agent can be wrong. The gate can say no."

Constrain copy to one meaningful claim per section; do not invent additional feature sections unless a real user need is shown.
