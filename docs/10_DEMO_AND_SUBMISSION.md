# 10 — High-impact demo, submission and judge questions

## One-sentence thesis

**"We deliberately let the AI get fooled — but it still cannot make an unauthorized protected payment, because Tide's distributed cryptographic authority stands between a proposal and an executable signature."**

Only use this exact assertion if the live Forseti denial and independent verifier have been demonstrated. Otherwise use "This prototype explores..." and disclose the simulated boundary.

## Suggested 120-second video storyboard

| Time | Image/actions | Spoken message |
|---|---|---|
| 0:00–0:15 | Dashboard, Buyer AI ↔ Vendor AI | "Companies want AI to transact, but giving an agent payment authority creates an unacceptable trust bottleneck." |
| 0:15–0:35 | Clean negotiation and $1,200 proposal | "Our agents agree on an order without direct access to the settlement rail." |
| 0:35–0:48 | Real Tide Policy:1 signing + signature verifier | "This authorization is produced only after Tide policy checks the immutable transaction. The rail independently verifies the cryptographic result." |
| 0:48–1:13 | Invoice prompt injection -> $50,000/new beneficiary | "Now an untrusted invoice successfully manipulates the agent into proposing a fraudulent payment." |
| 1:13–1:29 | Actual Tide policy denial; executor unchanged | "The proposal reaches the authority gate. Tide refuses a valid signature, and the executor does not settle." |
| 1:29–1:47 | Actual Tide QEA request with 1 of 2 required admin approvals | "Even the administrator cannot simply expand the agent's permissions without the realm's approval quorum." |
| 1:47–2:00 | Receipt/side-by-side + product tagline | "AI autonomy does not have to require unilateral authority. COVENANT: autonomous actions, distributed authority." |

**Alternates:** If real Forseti business approvers work, optionally replace part of admin clip with $12k 1/2 → 2/2 approvals; still distinguish QEA and per-transaction quorum. If real signer is blocked, avoid the bold claims above and show only honest E2EE/QEA capability.

## Live demo narrator checklist

1. Start Docker, Tide realm, app and synthetic DB. Verify auth session and live badge.
2. Preload normal transaction, malicious invoice fixture, verified allowlist, known hashes.
3. **Positive control:** live approved $1,200 -> genuine signature -> independent verifier -> simulated receipt.
4. **Attack case:** inject invoice -> AI requests $50k/new account -> actual live signer denies -> rail unchanged.
5. **Adversary check:** try edit beneficiary with prior valid signature -> verifier denies.
6. **Governance:** show 3 QEA admins / 2 required, 1 admin role change request still pending.
7. End with audit evidence and an explicit note that payments are simulated, Tide authority is real only where verified.

## READMEs for submission

Official contest page asks for a **public GitHub repo**, a **project overview <=300 words answering five official prompts at top of README**, and an **MP4 under 2 minutes / 100 MB**. The exact five prompt labels are rendered dynamically by the contest website: retrieve and copy the official rubric labels before final submission instead of guessing their wording.

Suggested **content** for the five answers (adapt to exact rubric headings, and modify according to implementation evidence):

1. **Possibility:** enterprise AI buyer/vendor agents complete orders automatically while high-impact execution remains cryptographically constrained.
2. **Trust bottleneck:** central payment APIs, privileged server/admin and AI prompt susceptibility make autonomous payment risky.
3. **Who benefits:** finance/procurement teams, suppliers and enterprise agent platform developers.
4. **Role of Tide:** TideCloak identity + QEA protects privileged changes; deployed Forseti Policy:1 validates authorization for exact signed payment payload; executor checks valid Ed25519 signature.
5. **What demo proves:** manipulated agent is allowed to propose an unauthorized transaction but no valid Tide authorization is emitted and no simulated settlement happens; normal request succeeds.

**Never state items 4–5 as demonstrated facts without live proof.** Keep technical setup and threat model in lower README sections / docs so overview stays <=300 words.

## Judges' hard questions + precise answers

**Q: Isn't this just `if (amount > 5000) reject`?**  
A: Application code may implement display checks, but the executor requires an independently verifiable Tide-issued cryptographic artifact bound to exact amount and destination. We demonstrate live policy denial, not merely a hidden button.

**Q: AP2 and signed payment mandates already exist. What's new?**  
A: We focus on distributed governance over agent privileges and protected signing policy in a multi-stakeholder enterprise workflow, not inventing agent payment signatures.

**Q: Can a malicious admin bypass your controls?**  
A: Under the governed Tide application realm, three `tide-realm-admin` users imply a two-approval threshold for role changes. QEA doesn't cover the master realm; we disclose this boundary.

**Q: Can prompt injection still succeed?**  
A: Yes; our deliberately vulnerable agent demonstrates that agent reasoning may fail. Our protected transaction executor rejects unauthorized effects.

**Q: Do you execute real money?**  
A: No, our rail is a deterministic mock. The signature/authorization test is real Tide only if the live integration gate has passed; execution semantics model a verifier-integrated real rail.

**Q: What if the application server is compromised?**  
A: It may falsify proposals/logs or cause DoS. It cannot generate an accepted signature under the configured live policy without Fabric participation, assuming no alternate executor bypass and authenticated verifier trust anchor; we test this bounded claim.

**Q: How do you prove your signatures are real?**  
A: Show exact signed bytes hash, actual Tide contract ID and trusted public key source, signature verification result, and denial of altered challenge.

## Submission checklist

- [ ] Public GitHub repository with source; no secrets.
- [ ] README overview at top <=300 words using **exact five official prompts**.
- [ ] Setup script and prerequisites documented; synthetic fixture reset.
- [ ] MP4 <120 seconds and <100 MB committed (or per current organizer instructions).
- [ ] Live integration evidence and clear disclaimer for mock rail and any simulated agent.
- [ ] Reproducible positive, malicious and admin governance cases.
- [ ] Screenshots/test evidence redacted, recorded within permitted accounts.
- [ ] Confirm the official submission portal accepts entries before claiming submission.

## Source of submission requirements

https://tide.org/unlocked/#challenge — fetched/checked 2026-10-22; page currently displays conflicting closed-countdown text and listed regional deadline. Confirm current organizer status separately.
