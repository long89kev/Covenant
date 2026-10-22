# COVENANT — 2-minute demo script (honest fallback version)

Use only capabilities that `docs/12_EXECUTION_LOG.md` marks VERIFIED. The Forseti signer is BLOCKED, so
**never say "Tide refused the signature"**. Say "the policy (simulated today) and the executor refused it,
and the approver roles that could override it are locked behind Tide's admin quorum."

## Before recording (about 10 min)

1. `docker start sanctum-tidecloak`, then in `covenant-app`: `rm -rf data && npm run build && npm start`.
2. Three browser profiles, each logged in to http://localhost:3000 with Tide:
   - **survivor**: buyer operator (requests payments, holds no approver role)
   - **lawyer**: holds `covenant-finance`
   - **admin**: holds `covenant-procurement`
3. In a 4th tab, open the Tide console → QEA Approvals with the escalation request already filed
   (`bash scripts/realm-setup.sh escalate survivor`) and approved by **one** admin, so it shows pending.
4. Screen recorder at 1920×1080. Hide the bookmarks bar. No tokens or devtools on screen.

## Storyboard (120 s)

| Time | Screen | Say |
|---|---|---|
| 0:00–0:12 | Dashboard hero + "What is real" card | "Companies want AI agents to buy things. But an agent that can pay needs a key, and agents read documents attackers write." |
| 0:12–0:30 | Negotiate → Normal order → Freeze → Execute (as survivor) | "Two agents agree 40 pumps for $1,200. The server freezes the exact payment bytes. The executor re-checks them and settles on our mock rail." |
| 0:30–0:55 | Negotiate → Malicious invoice: red invoice box, red $50,000 diff | "Now the supplier's invoice hides an instruction. The agent falls for it and asks for $50,000 to an unknown account. We let it be fooled on purpose." |
| 0:55–1:12 | Freeze → transaction page: policy DENY reasons → Execute → REJECTED, ledger unchanged | "The policy refuses it: over the cap, wrong account. The executor refuses too: it never trusts a status flag, only the frozen bytes. The yellow banner is honest: these payment rules are simulated until Tide deploys our Forseti contract." |
| 1:12–1:30 | $12k order: Approve as finance (lawyer), Execute → APPROVAL_REQUIRED, then Approve as procurement (admin) → settles. Try Approve as survivor: disabled / ROLE_FORBIDDEN | "Bigger orders need two different people. Their roles come from Tide-signed tokens, and the agent and the requester can't approve." |
| 1:30–1:48 | Tide console: escalation request pending 1 of 2 | "Could a rogue admin just give themselves both roles? That's a Tide change request. With three realm admins it waits for a second admin to sign in their own Tide enclave. This is real Tide, not our app." |
| 1:48–2:00 | Transaction page: Forge signature / Tamper / Replay all REJECTED; then the governance page | "Forged keys, edited payments and replays all fail. AI may propose; only distributed authority may execute. COVENANT." |

## Encode and check

```bash
ffmpeg -i raw.mov -vf scale=1920:-2 -c:v libx264 -crf 28 -preset slow -an demo.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 demo.mp4   # < 120 s, < 100 MB
```

Commit it as `demo.mp4` in the repo root.
