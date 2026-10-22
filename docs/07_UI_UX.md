# 07 — Product UI/UX and judge-facing storytelling

## Visual style

Enterprise security control room, modern and restrained. Dark slate/navy surfaces with a single teal/cyan accent, ample whitespace, monospace transaction hashes, consistent badges, subtle animations. Accessible contrast, mobile-aware but optimize desktop demo. No gratuitous 3D backgrounds or confusing charts.

Core visual principle: **every transaction displays both an agent recommendation and an independently verified authority verdict**. These must not look interchangeable.

## Main navigation

- `/dashboard` — Mission Control / capability health / latest transactions / synthetic settlement balance.
- `/negotiate` — Dual agent conversation, trusted quote source vs untrusted invoice and `Freeze Proposal`.
- `/transactions/[id]` — Canonical payment, constraints, approvals, Tide sign action, signature proof, executor status.
- `/governance` — QEA explainability card; link to Tide's genuine console; current status captured from actual Tide if API permits. No fake QEA endorsements.
- `/audit` — Chronological evidence timeline, filters by request and event type.

## Screen 1 — dashboard

Hero: **"Autonomous Actions. Distributed Authority."** Undertext: "Agents decide what to propose. Tide determines whether authority can emerge." Four KPI cards: total proposals, Tide-verified authorizations, rejected attempts, simulated settlements. Show:

- **REAL TIDE CONNECTED** only if live network round-trip validated.
- **FORSETI POLICY VERIFIED** only after signed positive and denied negative test proven.
- **QEA 2-of-3 VERIFIED** only after actual realm admin setup and observed pending decision.
- Otherwise label `NOT VERIFIED`, `SIMULATED`, or `UNAVAILABLE`, never a decorative green check.

Left: three scenario cards (Normal Order, Malicious Invoice, Escalation Attempt). Right: transaction/evidence recent activity feed.

## Screen 2 — negotiation

Two-column agent chat (Buyer AI / Seller AI), procurement catalog top summary. Expandable panel for `Supplier Invoice / Untrusted Attachment` with warning styling. Timeline:

1. RFQ: 40 pump assemblies, ask quote.
2. Seller quote: $30/unit.
3. Buyer accepts $1,200.
4. Invoice arrives; clean vs injected variant toggles **input fixture**, not signing result.
5. Buyer AI produces structured `PurchaseProposal`.
6. Side-by-side diff: agreed amount/beneficiary vs proposed fields. Highlight $50,000 and beneficiary unknown.

CTA: `Freeze and request authorization` creates immutable transaction; show signer result on next screen.

## Screen 3 — transaction inspector (hero demo)

Top: amount, buyer → seller, verification status. Main split:

- Left **AI PROPOSED** card: amount, destination, extracted invoice text, provenance.
- Center **TIDE POLICY** gate: contract ID hash, role, amount cap, beneficiary allowlist, approvers, live evaluation status. Do not render unverified policy decisions as genuine Fabric output.
- Right **EXECUTOR RESULT**: cryptographic `SIGNATURE VERIFIED` or `DENIED`, audit reason code, no-funds-moved disclaimer.

Bottom: exact canonical JSON (collapsed), SHA-256, nonce masked, signature/public-key fingerprint (display short prefix, copy full), trusted policy version, event trail. A `Tamper payload` developer-demo button sends a tampered request to a test endpoint **that will be denied**, never modifies real transaction state.

## Screen 4 — governance

Educational three-column comparison:

1. *Normal app admin:* can alter local permission DB.
2. *TideCloak QEA:* governed role change requested, pending, 1/2 approvals.
3. *Committed change:* requires another enrolled admin in Tide console.

Show source banner `LIVE QEA (actual Tide)` or `EXPLANATION ONLY (no live QEA)`. Provide link to real tide-console or screenshot evidence with timestamp. Do not fake screenshots or use static SVG as a live status indicator.

## Screen 5 — audit viewer

Events: `AGENT_PROPOSAL_CREATED`, `TX_FROZEN`, `AUTH_REQUESTED`, `TIDE_POLICY_DENIED`, `TIDE_SIGNATURE_RECEIVED`, `EXECUTOR_SIGNATURE_VERIFIED`, `EXECUTOR_REJECTED`, `SETTLED_SIMULATED`, `QEA_CHANGE_REQUEST_PENDING`.

Grid fields: timestamp UTC, actor, request, policy identity, hash, verdict, error code. Search and export sanitized JSON. Include a link to raw test evidence (within repository) rather than exposing tokens.

## Interaction rules

- Disable buttons based on state for usability **but enforce restrictions again server-side**.
- Every destructive or financially significant action includes unambiguous amount/currency/beneficiary preview.
- Rejected attempts remain on-screen for judges to inspect rather than vanish.
- Refreshing must not reset transaction or allow double execution.
- Loading errors explicitly distinguish `TIDE_UNAVAILABLE` vs `POLICY_DENIED` vs `UNAUTHORIZED`.
- No modal can claim completed payment without executor receipt.
- If executing in SIMULATED mode, show always-visible `SIMULATED POLICY / NOT TIDE-AUTHORIZED` banner and disable verified executor path.

## Suggested reusable components

`AuthorityBadge`, `LiveCapabilityBanner`, `ScenarioCard`, `AgentTranscript`, `DocumentSourceLabel`, `TransactionDiff`, `PolicyEvaluationPanel`, `ApproverList`, `SignatureProofPanel`, `SettlementReceipt`, `TimelineEvent`, `AuditDrawer`, `VerificationCopyButton`.

## Responsive/accessibility checklist

- Keyboard navigation, button focus outlines, semantic table markup.
- Status meaning communicated with text/icons as well as color.
- Dialog confirmation for settlement.
- Clear text alternatives for diagrams, no micro-font for essential statuses.
- Date/time display locale-aware while backend evidence remains UTC.
- No real secrets, tokens, identities or customer data in screenshots.
