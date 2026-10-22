'use client'

import { forwardRef } from 'react'
import { LANDING_DISCLAIMER, LANDING_SCENARIO_IDS, LANDING_SCENARIOS, type LandingScenarioId } from '@/lib/landing/scenarios'

const MARK = { ok: '✓', pending: '…', blocked: '×' } as const

// The landing's one interactive object. Every visible field derives from `scenario`; the component has
// no network access and cannot authorize anything. The disclaimer is part of the console, not dismissible.
export const AuthorizationGatePlayground = forwardRef<HTMLElement, { scenario: LandingScenarioId; onSelect: (id: LandingScenarioId) => void }>(
  function AuthorizationGatePlayground({ scenario, onSelect }, ref) {
    const s = LANDING_SCENARIOS[scenario]
    const gate = s.tone
    return (
      <section ref={ref} id="playground" className="lp-console" aria-labelledby="playground-title" data-scenario={s.id} tabIndex={-1}>
        <div className="lp-console-top">
          <h2 id="playground-title" className="lp-mono m-0">COVENANT / Authorization gate</h2>
          <span className="lp-console-mode"><span className="lp-mini-dot" aria-hidden />Interactive simulation</span>
        </div>
        <div className="lp-scenarios" role="group" aria-label="Demo scenarios">
          {LANDING_SCENARIO_IDS.map((id) => (
            <button key={id} type="button" className="lp-scenario" aria-pressed={id === scenario} onClick={() => onSelect(id)} data-case={id}>
              {LANDING_SCENARIOS[id].label}
            </button>
          ))}
        </div>
        <div className="lp-console-main" aria-live="polite" aria-atomic="true">
          <div className="lp-request-head">
            <span className="lp-mono">AI proposal · REQ-0042</span>
            <span className="lp-value" data-tone={s.tone === 'blocked' ? 'blocked' : undefined} data-testid="lp-counterparty">{s.counterparty}</span>
          </div>
          <div className="lp-amount" data-testid="lp-amount">{s.amount}</div>
          <div className="lp-request-sub">{s.purpose}</div>
          <ol className="lp-flow">
            <li className="lp-flow-row">
              <span className="lp-number">01</span>
              <div><div className="lp-flow-title">Agent intent</div><div className="lp-flow-desc">{s.intent}</div></div>
              <span className="lp-flow-label">PROPOSED</span>
            </li>
            <li className="lp-flow-row">
              <span className="lp-number">02</span>
              <div><div className="lp-flow-title">Authority gate</div><div className="lp-flow-desc" data-testid="lp-policy">{s.policy}</div></div>
              <span className="lp-flow-label" data-tone={gate} data-testid="lp-policy-status">{s.policyStatus}</span>
            </li>
            <li className="lp-flow-row">
              <span className="lp-number">03</span>
              <div><div className="lp-flow-title">Independent executor</div><div className="lp-flow-desc">{s.executor}</div></div>
              <span className="lp-flow-label" data-tone={gate} data-testid="lp-executor-status">{s.executorStatus}</span>
            </li>
          </ol>
          <div className="lp-verdict" data-tone={s.tone}>
            <div>
              <div className="lp-verdict-kicker">SIMULATED AUTHORIZATION RESULT</div>
              <div className="lp-verdict-value" data-testid="lp-verdict">{s.verdict}</div>
            </div>
            <span className="lp-verdict-mark" aria-hidden>{MARK[s.tone]}</span>
          </div>
        </div>
        <p className="lp-fineprint" data-testid="lp-disclaimer">{LANDING_DISCLAIMER}</p>
      </section>
    )
  },
)
