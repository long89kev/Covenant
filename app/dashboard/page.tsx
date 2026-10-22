'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { ArrowRight, Ban, FileText, Lock, LogIn, ShieldCheck } from 'lucide-react'
import { AppShell } from '@/components/covenant/app-shell'
import { Disclosure, KpiCard, PageHeading, Panel, PanelHead, SecurityEmptyState, SourceBadge, Spinner, StatusPill } from '@/components/covenant/primitives'
import { ScenarioCard } from '@/components/covenant/scenario-card'
import { useApi, useCapability } from '@/components/covenant/session'
import { TransactionsTable } from '@/components/covenant/transactions-table'
import { Button } from '@/components/ui/button'
import { SCENARIO_IDS, auditSource, decisionTone, type AuditEvent, type Tone, type TxList } from '@/lib/ui/model'

type Load<T> = { state: 'idle' | 'loading' } | { state: 'ok'; data: T } | { state: 'error'; code: string }

function Capability() {
  const { health: h, mode, failed } = useCapability()
  const rows: [string, string, Tone][] = h
    ? [
        ['TideCloak login', h.tidecloak.status === 'REACHABLE' ? 'Reachable' : 'Unavailable', h.tidecloak.status === 'REACHABLE' ? 'info' : 'danger'],
        ['Forseti policy signing', h.forseti.status === 'BLOCKED' ? 'Not deployed' : h.forseti.status, 'pending'],
        ['Independent executor', h.authorityMode === 'fallback' ? 'Simulated authority' : h.authorityMode === 'live' ? 'Live mode · no proof yet' : 'Unconfigured · fails closed',
          h.authorityMode === 'fallback' || h.authorityMode === 'live' ? 'pending' : 'danger'],
        ['Executor self-test', h.executorSelfTest === 'PASS' ? 'Pass · test key' : 'Fail', h.executorSelfTest === 'PASS' ? 'neutral' : 'danger'],
        ['Live Tide signatures verified', String(h.liveVerifiedCount ?? 0), (h.liveVerifiedCount ?? 0) > 0 ? 'verified' : 'neutral'],
        ['QEA realm quorum', 'Not observed by app', 'neutral'],
      ]
    : []
  return (
    <Panel labelledBy="cap">
      <PanelHead id="cap" title="Authority capability">
        <StatusPill tone={mode === 'UNAVAILABLE' ? 'danger' : 'pending'}>{mode === 'LOADING' ? 'Checking' : 'Not verified'}</StatusPill>
      </PanelHead>
      {!h && !failed && <p role="status" className="flex items-center gap-2 text-ink-secondary"><Spinner /> Probing /api/health…</p>}
      {failed && <SecurityEmptyState tone="danger" title="Health probe failed (UNAVAILABLE)">The executor fails closed while capability is unknown.</SecurityEmptyState>}
      {h && (
        <dl>
          {rows.map(([k, v, t]) => (
            <div key={k} className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
              <dt className="font-semibold text-ink">{k}</dt>
              <dd><StatusPill tone={t} icon={false}>{v}</StatusPill></dd>
            </div>
          ))}
        </dl>
      )}
      {h && (
        <Disclosure className="mt-4" summary="Why live authority is disabled">
          <p className="text-ink-secondary">{h.forseti.reason}</p>
          <p className="mt-2 text-ink-secondary">The executor self-test signs with a throwaway key generated on each probe: it proves the verifier logic, not that Tide signed anything. QEA state lives in the Tide console and is not read by this app.</p>
        </Disclosure>
      )}
      <p className="mt-4 rounded-xl border border-border bg-subtle p-3 text-small text-ink-secondary">Every value above comes from a live probe. A capability is marked verified only after observed evidence.</p>
    </Panel>
  )
}

function EventPreview({ events }: { events: Load<AuditEvent[]> }) {
  return (
    <Panel labelledBy="events">
      <PanelHead id="events" title="Security event preview">
        <Link href="/audit" className="inline-flex min-h-10 items-center gap-1 font-semibold text-cobalt-ink hover:underline">Audit trail <ArrowRight aria-hidden className="size-4" /></Link>
      </PanelHead>
      {events.state === 'loading' && <p role="status" className="flex items-center gap-2 text-ink-secondary"><Spinner /> Loading events…</p>}
      {events.state === 'error' && <SecurityEmptyState tone="danger" title={`Could not load events (${events.code})`} />}
      {events.state === 'idle' && <p className="text-ink-secondary">Log in to see recorded events.</p>}
      {events.state === 'ok' && events.data.length === 0 && <p className="text-ink-secondary">No events yet. Run a scenario to create one.</p>}
      {events.state === 'ok' && events.data.length > 0 && (
        <ol className="flex flex-col">
          {events.data.slice(0, 5).map((e) => {
            const src = auditSource(e)
            const tone = decisionTone(e.decision)
            return (
              <li key={e.seq} className="flex gap-3 border-b border-border py-3 last:border-b-0">
                <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${tone === 'danger' ? 'bg-danger' : tone === 'pending' ? 'bg-warning' : 'bg-cobalt'}`} />
                <div className="min-w-0">
                  <p className="font-semibold break-words text-ink">{e.type}{e.reason && <span className="font-mono text-small font-medium text-ink-secondary"> · {e.reason}</span>}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-small text-ink-muted">{e.actor} <SourceBadge simulated={src.simulated}>{src.label}</SourceBadge></p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}

export default function Dashboard() {
  const { authenticated, login } = useTideCloak()
  const { health } = useCapability()
  const api = useApi()
  const [list, setList] = useState<Load<TxList>>({ state: 'idle' })
  const [events, setEvents] = useState<Load<AuditEvent[]>>({ state: 'idle' })

  useEffect(() => {
    if (!authenticated) return
    setList({ state: 'loading' })
    setEvents({ state: 'loading' })
    api<TxList & { error?: string }>('/api/transactions').then((r) => setList(r.ok ? { state: 'ok', data: r.data } : { state: 'error', code: r.data.error ?? `HTTP_${r.status}` }))
    api<{ events: AuditEvent[]; error?: string }>('/api/audit').then((r) => setEvents(r.ok ? { state: 'ok', data: r.data.events } : { state: 'error', code: r.data.error ?? `HTTP_${r.status}` }))
  }, [authenticated, api])

  const l = list.state === 'ok' ? list.data : null
  const dash = authenticated ? (list.state === 'error' ? 'n/a' : '…') : '—'

  return (
    <AppShell crumbs={[{ label: 'Mission Control' }]}>
      <section className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between" aria-labelledby="hero">
        <div>
          <p className="eyebrow">COVENANT / Mission Control</p>
          <h1 id="hero" className="mt-2 text-[28px] leading-[36px] font-bold tracking-tight text-ink sm:text-display">Autonomous Actions.<br />Distributed Authority.</h1>
          <p className="mt-3 max-w-2xl text-[15px] text-ink-secondary">Your AI can negotiate and propose. Only verifiable authority can execute protected actions.</p>
          <p className="mt-1 text-small font-semibold text-ink-muted">Agents propose. Authority must be independently verified.</p>
        </div>
        {authenticated
          ? <Button size="lg" asChild><Link href="/negotiate?scenario=injected_invoice">Inject malicious invoice <ArrowRight /></Link></Button>
          : <Button size="lg" onClick={() => login()}><LogIn /> Log in with Tide to run scenarios</Button>}
      </section>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={FileText} label="Frozen proposals" value={l ? l.transactions.length : dash} hint="Agent proposals frozen into immutable bytes" />
        <KpiCard icon={ShieldCheck} label="Authorized with proof" value={health ? health.liveVerifiedCount ?? 0 : '…'} hint="Executor-verified Tide signatures" tone={(health?.liveVerifiedCount ?? 0) > 0 ? 'verified' : 'neutral'} />
        <KpiCard icon={Ban} label="Rejected attempts" value={l ? l.rejectedAttempts : dash} hint="Policy, executor and drill rejections" tone={l && l.rejectedAttempts > 0 ? 'danger' : 'neutral'} />
        <KpiCard icon={Lock} label="Settlements (simulated)" value={l ? l.ledger.simulatedCount : dash} hint="Mock rail · no funds moved" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel labelledBy="lab">
            <PanelHead id="lab" title="Threat simulation lab"><StatusPill tone="neutral" icon={false}>3 fixtures</StatusPill></PanelHead>
            <p className="-mt-2 mb-4 text-ink-secondary">Pick an input fixture. It changes what the agents read, never the authority result. Agents are deterministic and simulated (no LLM).</p>
            <ul className="grid gap-3 md:grid-cols-3">
              {SCENARIO_IDS.map((id) => <li key={id}><ScenarioCard id={id} /></li>)}
            </ul>
          </Panel>

          <Panel labelledBy="recent">
            <PanelHead id="recent" title="Recent transactions">
              <Link href="/transactions" className="inline-flex min-h-10 items-center gap-1 font-semibold text-cobalt-ink hover:underline">All transactions <ArrowRight aria-hidden className="size-4" /></Link>
            </PanelHead>
            {!authenticated && <p className="text-ink-secondary">Log in with Tide to see frozen transactions.</p>}
            {list.state === 'loading' && <p role="status" className="flex items-center gap-2 text-ink-secondary"><Spinner /> Loading transactions…</p>}
            {list.state === 'error' && <SecurityEmptyState tone="danger" title={`Could not load transactions (${list.code})`} />}
            {l && l.transactions.length === 0 && <SecurityEmptyState title="No transactions yet">Run a scenario and freeze its proposal to create the first one.</SecurityEmptyState>}
            {l && l.transactions.length > 0 && <TransactionsTable rows={l.transactions.slice(0, 6)} caption="Recent transactions" />}
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <Capability />
          <EventPreview events={events} />
        </div>
      </div>
    </AppShell>
  )
}
