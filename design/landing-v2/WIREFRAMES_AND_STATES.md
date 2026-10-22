# Landing Wireframes, States & Navigation

## Desktop, 1440px

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ COVENANT /01                      Mechanism  The boundary  About   Explore ↗ │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  • AUTHORITY INFRASTRUCTURE     ┌──────────────────────────────────────────┐ │
│                                │ COVENANT / AUTHORIZATION GATE            │ │
│  Give agents                   │ [Within policy] [Missing approval] [...] │ │
│  freedom.                      │ AI PROPOSAL REQ-0042                       │ │
│  Not the keys.                 │ $2,400.00                                 │ │
│                                │ ──────────────────────────────────────── │ │
│  Short product sentence        │ 01 Agent intent           PROPOSED        │ │
│                                │ 02 Authority gate         PASS            │ │
│  [Explore the boundary ↗]      │ 03 Independent executor  WOULD ACCEPT    │ │
│  Run a failure case ↗          │ ──────────────────────────────────────── │ │
│                                │ ELIGIBLE FOR SIGNING               ✓     │ │
│                                │ [Simulation disclaimer]                  │ │
│                                └──────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│ 01 / AI proposes          02 / Policy permits          03 / Executor verifies│
├──────────────────────────────────────────────────────────────────────────────┤
│ A boundary.                    │ 01 Propose freely.                       │
│ Not a promise.                 │ 02 Authorize independently.             │
│ Brief context, not sales copy. │ 03 Verify before execution.             │
├──────────────────────────────────────────────────────────────────────────────┤
│ [DARK SECTION]                                                             │
│ The agent can be wrong.        │ ATTACK / UNAUTHORIZED PAYEE              │
│ The gate can say no.           │ Deviation → Policy rejection → Blocked  │
│ [Run tampered request ↗]       │                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Autonomy deserves better boundaries.                [Explore the demo ↗]   │
├──────────────────────────────────────────────────────────────────────────────┤
│ COVENANT / DESIGN PROTOTYPE                                 © 2026           │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mobile, 390px

```text
┌────────────────────────────────┐
│ LOGO COVENANT              ☰   │
├────────────────────────────────┤
│ • AUTHORITY INFRASTRUCTURE     │
│                                │
│ Give agents                    │
│ freedom.                       │
│ Not the keys.                  │
│                                │
│ Short claim                    │
│ [Explore the boundary ↗]       │
│ Run a failure case ↗           │
│                                │
│ ┌────────────────────────────┐ │
│ │ POLICY GATE / SIMULATION   │ │
│ │ [within] [approval]        │ │
│ │ [tampered]                 │ │
│ │                            │ │
│ │ $2,400.00                  │ │
│ │ Agent intent               │ │
│ │ Authority gate             │ │
│ │ Executor                   │ │
│ │ VERDICT                    │ │
│ └────────────────────────────┘ │
├────────────────────────────────┤
│ 01 / AI proposes               │
│ 02 / Policy permits            │
│ 03 / Executor verifies         │
├────────────────────────────────┤
│ A boundary.                    │
│ Not a promise.                 │
│ [3 numbered rows]              │
├────────────────────────────────┤
│ [DARK SECTION]                 │
│ The gate can say no.           │
│ [Attack ledger]                │
├────────────────────────────────┤
│ Final CTA & footer             │
└────────────────────────────────┘
```

## Required interactions

| Interaction | Required outcome |
|---|---|
| Click scenario `Within policy` | Shows $2,400, PASS, WOULD ACCEPT, Eligible for signing |
| Click `Missing approval` | Shows $12,500, PENDING, NOT EXECUTED, Approval required |
| Click `Tampered` | Shows $50,000, DENIED, REJECTED, Execution blocked |
| `Run a failure case` hero CTA | Switches to `Tampered` and scrolls to the console |
| `Run tampered request` dark CTA | Same behavior |
| `Explore the boundary` | Scrolls to the console |
| Mobile hamburger | Opens accessible navigation, close on selecting a link |

## Implementation caution

The landing does **not** access actual Tide keys. In the full product, its embedded simulation must be treated separately from `/app` authorization and signing. UI logic never provides authorization. The actual executor must verify signed transaction data and refuse missing/invalid signatures independently of the frontend.
