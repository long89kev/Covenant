'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTideCloak } from '@tidecloak/nextjs'
import { AgentTranscript, DealSummary, type Negotiation } from '@/components/covenant/agent-transcript'
import { AppShell } from '@/components/covenant/app-shell'
import { Disclosure, EditorialPageHeader, GateState, Loading, SourceTag, Spinner } from '@/components/covenant/primitives'
import { RequireLogin, SessionExpired, useApi } from '@/components/covenant/session'
import { SCENARIO_META, isScenarioId, reasonText, type ScenarioId } from '@/lib/ui/model'

const ORDER: ScenarioId[] = ['legit_small_order', 'exception_replenishment', 'injected_invoice']

function ScenarioSwitch({ current }: { current: string }) {
  return (
    <nav aria-label="Scenario fixture" className="scenario-switch">
      {ORDER.map((id, i) => (
        <Link key={id} href={`/negotiate?scenario=${id}`} aria-current={id === current ? 'page' : undefined} className="scenario">
          0{i + 1} / {SCENARIO_META[id].title}
        </Link>
      ))}
    </nav>
  )
}

function NegotiationView({ scenario }: { scenario: string }) {
  const api = useApi()
  const router = useRouter()
  const [n, setN] = useState<Negotiation | null>(null)
  const [loadErr, setLoadErr] = useState<{ status: number; code: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [freezeErr, setFreezeErr] = useState('')

  useEffect(() => {
    setN(null)
    setLoadErr(null)
    api<Negotiation & { error?: string }>(`/api/negotiations?scenario=${scenario}`).then((r) =>
      r.ok ? setN(r.data) : setLoadErr({ status: r.status, code: r.data.error ?? `HTTP_${r.status}` }),
    )
  }, [api, scenario])

  // Freeze: the server re-runs the agent from the fixture id and freezes canonical bytes. The browser
  // sends only the scenario id; nothing displayed here becomes transaction content.
  const freeze = async () => {
    if (busy) return
    setBusy(true)
    setFreezeErr('')
    const r = await api<{ id?: string; error?: string }>('/api/transactions', { method: 'POST', body: JSON.stringify({ scenarioId: scenario }) })
    if (r.ok && r.data.id) {
      router.push(`/transactions/${r.data.id}`)
      return
    }
    setFreezeErr(r.status === 401 ? 'NOT_AUTHENTICATED' : r.data.error ?? `HTTP_${r.status}`)
    setBusy(false)
  }

  if (loadErr?.status === 401) return <SessionExpired />
  if (loadErr) return <GateState tone="danger" kicker={loadErr.code} title="Could not load the negotiation">{reasonText(loadErr.code)}</GateState>
  if (!n) return <Loading>Running the simulated agents…</Loading>

  const changed = n.agreement.totalMinor !== n.proposal.amountMinor || n.agreement.beneficiaryId !== n.proposal.beneficiaryId
  const action = (
    <>
      <button type="button" className="action-primary" onClick={freeze} disabled={busy} aria-describedby={freezeErr ? 'freeze-err' : undefined}>
        {busy ? <><span>Freezing…</span><Spinner /></> : <><span>{changed ? 'Freeze and inspect the rejected proposal' : 'Freeze proposal → inspector'}</span><span aria-hidden>↗</span></>}
      </button>
      <p id="freeze-err" role="status" className="study-note font-mono text-failure empty:hidden">{freezeErr && `Freeze failed: ${freezeErr} · ${reasonText(freezeErr)}`}</p>
    </>
  )
  return (
    <div className="two-col">
      <section aria-labelledby="chat-h" className="min-w-0">
        <div className="section-head condensed"><h2 id="chat-h">Negotiation trace</h2><SourceTag simulated>Simulated AI · no credentials</SourceTag></div>
        {changed && <p role="alert" className="sr-only">The agent obeyed text inside an untrusted invoice: amount and beneficiary no longer match the agreement.</p>}
        <AgentTranscript n={n} />
        <Disclosure summary="View fixture (raw server response)"><pre>{JSON.stringify(n, null, 2)}</pre></Disclosure>
      </section>
      <DealSummary n={n} action={action} />
    </div>
  )
}

function NegotiatePage() {
  const params = useSearchParams()
  const raw = params.get('scenario')
  const scenario = isScenarioId(raw) ? raw : 'legit_small_order'
  const { authenticated } = useTideCloak()
  const meta = SCENARIO_META[scenario]
  return (
    <AppShell crumbs={[{ label: 'Agent activity', href: '/negotiate' }, { label: meta.title }]}>
      <EditorialPageHeader id="negotiation-title" index="02" kicker="Agent activity"
        title={<>Let them<br />negotiate</>}
        lede="Untrusted documents can change an agent's proposal. They cannot become authority." />
      <ScenarioSwitch current={scenario} />
      <p className="footnote -mt-4 mb-8">{meta.title}: {meta.summary}. Expected: {meta.expected}.</p>
      {raw && !isScenarioId(raw) && <p role="status" className="footnote mb-6 text-warning-ink">Unknown scenario “{raw}” (INVALID_SCHEMA); showing Clean procurement.</p>}
      <RequireLogin what="the negotiation">{authenticated && <NegotiationView scenario={scenario} />}</RequireLogin>
    </AppShell>
  )
}

export default function Page() {
  return <Suspense><NegotiatePage /></Suspense>
}
