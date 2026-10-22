import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/landing-page'
import '../styles/landing.css'

// Public landing (design/landing-v2). The operator workspace stays at /dashboard and the other app
// routes; nothing here reads TideCloak, Forseti or the executor.
export const metadata: Metadata = {
  title: { absolute: 'COVENANT — Give agents freedom. Not the keys.' },
  description: 'COVENANT: AI agents can propose. Cryptographic policy governs execution.',
}

export default function Home() {
  return <LandingPage />
}
