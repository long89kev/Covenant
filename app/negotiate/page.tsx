'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTideCloak } from '@tidecloak/nextjs'
import { ArrowRight, Lock, ShieldAlert } from 'lucide-react'
import { AgentTranscript, DealSummary, type Negotiation } from '@/components/covenant/agent-transcript'
import { AppShell } from '@/components/covenant/app-shell'
import { Disclosure, PageHeading, Panel, PanelHead, SecurityEmptyState, SourceBadge, Spinner } from '@/components/covenant/primitives'
import { RequireLogin, SessionExpired, useApi } from '@/components/covenant/session'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SCENARIO_IDS, SCENARIO_META, isScenarioId, reasonText, usd } from '@/lib/ui/model'

function ScenarioSwitch({ current }: { current: string }) {
  return (
    <nav aria-label="Scenario fixture" className="flex flex-wrap gap-1 rounded-control border border-border bg-card p-1">
      {SCENARIO_IDS.map((id) => (
        <Link key={id} href={`/negotiate?scenario=${id}`} aria-current={id === current ? 'page' : undefined}
          className={cn('inline-flex min-h-9 items-center rounded-lg px-3 font-semibold transition-colors', id === current ? 'bg-cobalt-soft text-cobalt-ink ring-1 ring-cobalt/30' : 'text-ink-secondary hover:bg-subtle hover:text-ink')}>
          {SCENARIO_META[id].title}
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
  if (loadErr) return <SecurityEmptyState tone="danger" title={`Could not load the negotiation (${loadErr.code})`}>{reasonText(loadErr.code)}</SecurityEmptyState>
  if (!n) return <p role="status" className="flex items-center gap-2 text-ink-secondary"><Spinner /> Running the simulated agents…</p>

  const changed = n.agreement.totalMinor !== n.proposal.amountMinor || n.agreement.beneficiaryId !== n.proposal.beneficiaryId
  return (
    <>
      {changed && (
        <div role="alert" className="mb-5 flex gap-3 rounded-xl border border-danger/35 bg-danger-soft p-4">
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <p className="font-bold text-danger-ink">The agent obeyed text inside an untrusted invoice</p>
            <p className="text-ink">
              Agreed amount {usd(n.agreement.totalMinor)} → proposed <b>{usd(n.proposal.amountMinor)}</b>; approved beneficiary{' '}
              <span className="font-mono">{n.agreement.beneficiaryId}</span> → <b className="font-mono break-all">{n.proposal.beneficiaryId}</b>.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] min-[1440px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel labelledBy="chat-h" className="min-w-0">
          <PanelHead id="chat-h" title="Buyer ↔ Seller negotiation"><SourceBadge simulated>Simulated AI · no credentials</SourceBadge></PanelHead>
          <AgentTranscript n={n} />
          <Disclosure className="mt-5" summary="View fixture (raw server response)">
            <pre className="max-h-80 overflow-auto font-mono text-small whitespace-pre-wrap text-ink-secondary">{JSON.stringify(n, null, 2)}</pre>
          </Disclosure>
        </Panel>
        <Panel labelledBy="deal-h" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <PanelHead id="deal-h" title="Deal summary" />
          <DealSummary n={n} />
        </Panel>
      </div>

      <div className="sticky bottom-3 z-20 mt-6 flex flex-col gap-3 rounded-card border border-border bg-card/95 p-3 shadow-dialog backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:pl-5">
        <p className="flex items-center gap-2 text-ink-secondary"><Lock aria-hidden className="size-4 shrink-0" /> Freezing re-derives every byte on the server and creates an immutable transaction. It does not authorize it.</p>
        <div className="flex flex-col items-stretch gap-1 sm:items-end">
          <Button size="lg" onClick={freeze} disabled={busy} aria-describedby={freezeErr ? 'freeze-err' : undefined}>
            {busy ? <><Spinner /> Freezing…</> : <>Freeze proposal → inspector <ArrowRight /></>}
          </Button>
          <p id="freeze-err" role="status" className="text-small font-semibold text-danger-ink empty:hidden">{freezeErr && `Freeze failed: ${freezeErr} · ${reasonText(freezeErr)}`}</p>
        </div>
      </div>
    </>
  )
}

function NegotiatePage() {
  const params = useSearchParams()
  const raw = params.get('scenario')
  const scenario = isScenarioId(raw) ? raw : 'legit_small_order'
  const { authenticated } = useTideCloak()
  const meta = SCENARIO_META[scenario]
  return (
    <AppShell crumbs={[{ label: 'AI Negotiation', href: '/negotiate' }, { label: meta.title }]}>
      <PageHeading
        eyebrow="COVENANT / AI Negotiation"
        title="AI agents can negotiate. They cannot authorize."
        description={<>{meta.title}: {meta.summary}. Expected: {meta.expected}.</>}
        actions={<ScenarioSwitch current={scenario} />}
      />
      {raw && !isScenarioId(raw) && <p role="status" className="mb-4 text-small font-semibold text-warning-ink">Unknown scenario “{raw}” (INVALID_SCHEMA); showing Clean procurement.</p>}
      <RequireLogin what="the negotiation">{authenticated && <NegotiationView scenario={scenario} />}</RequireLogin>
    </AppShell>
  )
}

export default function Page() {
  return <Suspense><NegotiatePage /></Suspense>
}
