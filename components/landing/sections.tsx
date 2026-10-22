import Link from 'next/link'
import type { ReactNode } from 'react'

// Static landing sections (design/landing-v2/WIREFRAMES_AND_STATES.md). Copy is the supplied copy;
// no sections beyond the wireframe. The only interactive pieces are the two "run tampered" buttons,
// whose handler comes from the page so they share the playground's single state.

export function EditorialHero({ onFailureCase, children }: { onFailureCase: () => void; children: ReactNode }) {
  return (
    <section className="lp-hero lp-container" aria-labelledby="main-heading">
      <div className="lp-hero-copy">
        <div className="lp-eyebrow lp-mono"><span className="lp-dot" aria-hidden />Authority infrastructure / for AI agents</div>
        <h1 id="main-heading">Give agents<br />freedom.<br /><span className="lp-highlight">Not the keys.</span></h1>
        <p>Agents propose. Cryptographic policy decides what can actually execute.</p>
        <div className="lp-actions">
          <a href="#playground" className="lp-btn">Explore the boundary <span className="lp-arrow" aria-hidden>↗</span></a>
          <button type="button" className="lp-link" onClick={onFailureCase}>Run a failure case ↗</button>
        </div>
      </div>
      {children}
    </section>
  )
}

export function ProcessRail() {
  return (
    <ol className="lp-rail lp-container" aria-label="Core sequence">
      <li className="lp-rail-item"><span className="lp-rail-index">01 /</span><strong>AI proposes</strong></li>
      <li className="lp-rail-item"><span className="lp-rail-index">02 /</span><strong>Policy permits</strong></li>
      <li className="lp-rail-item"><span className="lp-rail-index">03 /</span><strong>Executor verifies</strong></li>
    </ol>
  )
}

const STEPS = [
  ['01', 'Propose freely.', 'Agents negotiate and prepare structured transactions. They never hold the execution key.'],
  ['02', 'Authorize independently.', 'Cryptographic policy checks the exact action and required approvals.'],
  ['03', 'Verify before execution.', 'An independent executor verifies the authorized payload. No valid proof, no action.'],
] as const

export function MechanismSection() {
  return (
    <section className="lp-split lp-container" id="mechanism" aria-labelledby="mechanism-h">
      <div>
        <span className="lp-section-index">[ 02 — THE MECHANISM ]</span>
        <h2 id="mechanism-h">A boundary.<br />Not a promise.</h2>
        <p>Trust isn&apos;t another checkbox in an admin panel. The authorization boundary must remain meaningful when the agent — or the application — makes a mistake.</p>
      </div>
      <ol className="lp-steps">
        {STEPS.map(([n, h, p]) => (
          <li key={n} className="lp-step"><span>{n}</span><div><h3>{h}</h3><p>{p}</p></div></li>
        ))}
      </ol>
    </section>
  )
}

export function FailureModeSection({ onRun }: { onRun: () => void }) {
  return (
    <section className="lp-case" id="threat" aria-labelledby="threat-h">
      <div className="lp-case-wrap lp-container">
        <div>
          <span className="lp-section-index">[ 03 — FAILURE BY DESIGN ]</span>
          <h2 id="threat-h">The agent can be wrong.<br /><span>The gate can say no.</span></h2>
          <p>Even a convincing prompt injection should not become a valid authorization. The transaction boundary is where a proposal becomes — or fails to become — an action.</p>
          <button type="button" className="lp-btn signal" onClick={onRun}>Run tampered request <span className="lp-arrow" aria-hidden>↗</span></button>
        </div>
        <div className="lp-ledger" role="group" aria-label="Illustrative tampered transaction rejection">
          <div className="lp-ledger-top"><span className="lp-mono">Attack / unauthorized payee</span><span className="lp-mono">Illustrative</span></div>
          <ol>
            <li className="lp-ledger-row"><div><strong>AI generates a new payee</strong><small>Request differs from approved instruction</small></div><span className="lp-marker">DEVIATION</span></li>
            <li className="lp-ledger-row"><div><strong>Policy detects mismatch</strong><small>Approved payload ≠ submitted payload</small></div><span className="lp-marker">REJECTED</span></li>
            <li className="lp-ledger-row"><div><strong>Signature not issued</strong><small>Executor has no acceptable authorization</small></div><span className="lp-marker"><i className="lp-pin" aria-hidden />BLOCKED</span></li>
          </ol>
        </div>
      </div>
    </section>
  )
}

export function FinalCTA() {
  return (
    <section className="lp-final lp-container" aria-labelledby="final-h">
      <div>
        <span className="lp-section-index">[ 04 — BUILD FOR WHAT&apos;S NEXT ]</span>
        <h2 id="final-h">Autonomy deserves<br />better boundaries.</h2>
      </div>
      <div className="lp-final-actions">
        <a href="#playground" className="lp-btn">Explore the demo <span className="lp-arrow" aria-hidden>↗</span></a>
        <Link href="/dashboard" className="lp-link">Open the operator workspace ↗</Link>
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="lp-footer lp-container" id="footer">
      <span>COVENANT / Hackathon prototype</span>
      <span>Made to demonstrate shared authority. Not a live transaction system. Payment policy runs in simulation until a Forseti contract is deployed.</span>
      <span>© 2026 COVENANT</span>
    </footer>
  )
}
