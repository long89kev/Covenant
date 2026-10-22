'use client'

import { useCallback, useRef, useState } from 'react'
import type { LandingScenarioId } from '@/lib/landing/scenarios'
import { AuthorizationGatePlayground } from './authorization-gate-playground'
import { LandingHeader } from './landing-header'
import { EditorialHero, FailureModeSection, FinalCTA, LandingFooter, MechanismSection, ProcessRail } from './sections'

// Public landing. One state variable drives the playground; both failure CTAs set it to `tampered`
// and bring the console into view (instantly when the user prefers reduced motion).
export function LandingPage() {
  const [scenario, setScenario] = useState<LandingScenarioId>('within-policy')
  const console_ = useRef<HTMLElement>(null)

  const runTampered = useCallback(() => {
    setScenario('tampered')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    console_.current?.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'center' })
    console_.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="lp-root">
      <a href="#playground" className="skip-link">Skip to the authorization demo</a>
      <LandingHeader />
      <main id="top">
        <EditorialHero onFailureCase={runTampered}>
          <AuthorizationGatePlayground ref={console_} scenario={scenario} onSelect={setScenario} />
        </EditorialHero>
        <ProcessRail />
        <MechanismSection />
        <FailureModeSection onRun={runTampered} />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
