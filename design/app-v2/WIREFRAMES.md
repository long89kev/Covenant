# Internal App Wireframes — Editorial Authority v2

The working `index.html` is the high-fidelity reference. This document specifies the arrangement, state behavior, and migration for Next.js.

## Shell

```text
DESKTOP ≥ 1250
┌───────────────────────┬──────────────────────────────────────────────────────┐
│ COVENANT              │ COVENANT / CURRENT VIEW              SIMULATION ONLY │
│                       ├──────────────────────────────────────────────────────┤
│ 01 Overview           │                                                      │
│ 02 Agent activity     │         EDITORIAL TITLE + ONE-LINE DESCRIPTION      │
│ 03 Inspector          │                                                      │
│ 04 Governance         │         VIEW-SPECIFIC DATA / AUTHORITY CONSOLE       │
│ 05 Evidence log       │                                                      │
│                       │                                                      │
│ SIMULATED             │                                                      │
└───────────────────────┴──────────────────────────────────────────────────────┘
```

## Page 01 — Overview

```text
[Control, without compromise.]      [Sandbox metadata]
[One-line explanation]
─────────────────────────────────────────────────
 03 PROPOSALS | 01 ELIGIBLE* | 01 PENDING | 01 REJECTED
─────────────────────────────────────────────────
[Three requests / rows]           [ DARK AUTHORITY CONSOLE ]
row 1 clean proposal              AI proposal
row 2 awaiting approval           ↓ policy evaluates
row 3 malicious invoice           ↓ verifier decides
                                  [INSPECT THE BOUNDARY]
```

Scenario rows route to Inspector with the correct scenario preselected. KPI counts are explicitly labeled fixture data.

## Page 02 — Agent activity

```text
[Let them negotiate.]
┌────────────────────────────────────┬────────────────────────────┐
│ TRUST-SOURCED CONVERSATION         │ [DARK DIFF PANEL]          │
│ Buyer agent / request              │ Agreed $2,400             │
│ Seller agent / response            │       ↓                    │
│ External untrusted invoice         │ Proposed $50,000          │
│ Buyer revised request              │ [Inspect rejected]        │
└────────────────────────────────────┴────────────────────────────┘
```

A user should immediately see the untrusted input's effect, without implying a model is currently operating if this screen uses fixtures.

## Page 03 — Transaction inspector

```text
[A proposal is not permission.]
[01 Within policy] [02 Missing approval] [03 Tampered]
┌─────────────────────┬──────────────────────────┬──────────────────────┐
│ 01 / AI PROPOSAL    │ 02 / DARK AUTHORITY GATE │ 03 / EXECUTOR VERDICT│
│                     │                          │                      │
│ $2,400              │ Eligible for signing     │ WOULD ACCEPT         │
│ Beneficiary         │ Supplier: PASS           │ No signature         │
│ Purpose             │ Amount: PASS             │ No settlement        │
│ Payload integrity   │ Approvals: NOT REQUIRED  │ Fixture source       │
│                     │ Signature: NOT ISSUED    │                      │
└─────────────────────┴──────────────────────────┴──────────────────────┘
[Rule: no matching, verified proof → no actual protected execution]
```

The three zones are semantically distinct in both the data contract and UI. A live integration replaces scenario fixture data with signed proofs only after verification, never by renaming a badge.

## Page 04 — Governance

```text
[Authority has a structure.]
────────────────────────────────────────────────────────────────
01 Business authorization    What per-transaction approvers?
────────────────────────────────────────────────────────────────
02 Realm governance          Tide QEA/admin management
────────────────────────────────────────────────────────────────
03 Cryptographic signing     Forseti/Fabric execution policy
────────────────────────────────────────────────────────────────
[Statement: no live policy/signing claim in prototype]
```

These concepts must remain separate in implementation and UX.

## Page 05 — Evidence log

```text
[Show the reason.]
[MODE: SIMULATED]                     [FILTER: all/pending/rejected]
────────────────────────────────────────────────────────────────
REQ-0042       ELIGIBLE*               WITHIN_POLICY          FIXTURE
REQ-0043       PENDING                 QUORUM_MISSING         FIXTURE
REQ-0044       REJECTED                PAYLOAD_MISMATCH       FIXTURE
────────────────────────────────────────────────────────────────
```

Selecting an event opens its matching transaction. In production, evidence rows require real source, correlation ID, actor, immutable payload references and verifier results.

## Mobile behavior

- Hide desktop sidebar behind accessible menu, show persistent `SIMULATION ONLY` status in topbar.
- KPI strip: 2 columns; all requests remain accessible.
- Inspector: 3 vertically stacked columns in exact order; dark policy panel remains the focal point.
- Audit table: drop low-priority `SOURCE` visual column, but not underlying JSON provenance.
- No custom horizontal-scrolling page containers.

## Interaction inventory

1. Navigate all five pages.
2. Open any of three predefined scenarios from Overview.
3. Select all three scenarios inside Inspector; update every bound label consistently.
4. Open prompt-injection scenario from Agent Activity.
5. Filter Evidence Log and open selected event.
6. Open/close mobile navigation (click item / Escape).
7. Keyboard focus, visual status text, and preserved SIMULATED labeling.
