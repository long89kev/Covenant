'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { AppShell } from '@/components/covenant/app-shell'
import { EditorialPageHeader, GateState, Loading, StatusTag } from '@/components/covenant/primitives'
import { useApi, useCapability } from '@/components/covenant/session'
import { TransactionsTable } from '@/components/covenant/transactions-table'
import { SCENARIO_META, usd, type ScenarioId, type Tone, type TxList } from '@/lib/ui/model'
import tc from '../../tidecloak.json'

type Load<T> = { state: 'idle' | 'loading' } | { state: 'ok'; data: T } | { state: 'error'; code: string }

// Fixture rows, in the order of the reference design: clean, needs approval, malicious. The tag is the
// EXPECTED outcome of the fixture, not a result; the real result appears only after freezing.
const FIXTURES: { id: ScenarioId; tag: string }[] = [
  { id: 'legit_small_order', tag: 'Eligible*' },
  { id: 'exception_replenishment', tag: 'Pending' },
  { id: 'injected_invoice', tag: 'Rejected' },
]

// Dark console: every row is read from the live /api/health probe, never from a fixture.
function AuthorityConsole() {
  const { health: h, failed } = useCapability()
  const { authenticated, login } = useTideCloak()
  const rows: [string, string, Tone][] = h
    ? [
        ['TideCloak login', h.tidecloak.status === 'REACHABLE' ? 'Reachable' : 'Unavailable', h.tidecloak.status === 'REACHABLE' ? 'neutral' : 'danger'],
        ['Forseti policy signing', h.forseti.status === 'BLOCKED' ? 'Not deployed' : h.forseti.status, 'pending'],
        ['Independent executor', h.authorityMode === 'fallback' ? 'Simulated authority' : h.authorityMode === 'live' ? 'Live mode · no proof yet' : 'Unconfigured · fails closed',
          h.authorityMode === 'fallback' || h.authorityMode === 'live' ? 'pending' : 'danger'],
        ['Executor self-test', h.executorSelfTest === 'PASS' ? 'Pass · throwaway key' : 'Fail', h.executorSelfTest === 'PASS' ? 'neutral' : 'danger'],
        ['QEA realm quorum', 'Not observed by app', 'neutral'],
      ]
    : []
  return (
    <section className="dark-console" aria-labelledby="console-h">
      <div className="console-top"><span className="mono">Authority / Gate</span><span className="mono signal-text">Live probe</span></div>
      <h2 id="console-h">Proposal<br /><span>≠ Permission.</span></h2>
      {!h && !failed && <p role="status" className="console-caption">Probing /api/health…</p>}
      {failed && <p className="console-caption text-failure">Health probe failed (UNAVAILABLE). The executor fails closed while capability is unknown.</p>}
      {h && (
        <dl className="console-rows">
          {rows.map(([k, v, t]) => (
            <div key={k}><dt className="mono">{k}</dt><dd data-tone={t}>{v}</dd></div>
          ))}
        </dl>
      )}
      {h && <p className="console-caption">{h.forseti.reason}</p>}
      {authenticated
        ? <Link className="console-link" href="/negotiate?scenario=injected_invoice">Inject malicious invoice <span aria-hidden>↗</span></Link>
        : <button type="button" className="console-link" onClick={() => login()}>Log in with Tide to run scenarios <span aria-hidden>↗</span></button>}
    </section>
  )
}

export default function Dashboard() {
  const { authenticated } = useTideCloak()
  const { health } = useCapability()
  const api = useApi()
  const [list, setList] = useState<Load<TxList>>({ state: 'idle' })

  useEffect(() => {
    if (!authenticated) return
    setList({ state: 'loading' })
    api<TxList & { error?: string }>('/api/transactions').then((r) => setList(r.ok ? { state: 'ok', data: r.data } : { state: 'error', code: r.data.error ?? `HTTP_${r.status}` }))
  }, [authenticated, api])

  const l = list.state === 'ok' ? list.data : null
  const dash = authenticated ? (list.state === 'error' ? 'n/a' : '…') : '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  const live = health?.liveVerifiedCount ?? 0

  return (
    <AppShell crumbs={[{ label: 'Overview' }]}>
      <EditorialPageHeader id="dashboard-title" index="01" kicker="Mission control"
        title={<>Control, without<br />compromise</>}
        lede="Agents can negotiate. Permission still has to be earned."
        side={
          <div className="header-side">
            <span className="mono">Current workspace</span>
            <strong>Procurement / {tc.realm}</strong>
            <span>Synthetic invoices · mock payment rail</span>
          </div>
        } />

      <div className="metric-strip" aria-label="Server-recorded summary">
        <div data-testid="metric-frozen"><span className="mono">Frozen proposals</span><strong>{l ? pad(l.transactions.length) : dash}</strong><small>Server ledger</small></div>
        <div data-testid="metric-proof"><span className="mono">Live Tide proofs</span><strong>{health ? pad(live) : '…'}</strong><small>Executor-verified signatures</small></div>
        <div data-testid="metric-rejected"><span className="mono">Rejected</span><strong>{l ? pad(l.rejectedAttempts) : dash}</strong><small>Policy, executor, drills</small></div>
        <div data-testid="metric-simulated"><span className="mono">Settled · simulated</span><strong>{l ? pad(l.ledger.simulatedCount) : dash}</strong><small>Mock rail · no funds moved</small></div>
      </div>

      <div className="overview-grid">
        <section aria-labelledby="proposals-title" className="min-w-0">
          <div className="section-head">
            <div><span className="mono eyebrow">Threat simulation lab</span><h2 id="proposals-title">Three requests.<br />Three outcomes.</h2></div>
            <span className="mono subtle-label">/ Fixtures</span>
          </div>
          <ol className="rule-list m-0 list-none p-0">
            {FIXTURES.map(({ id, tag }, i) => {
              const s = SCENARIO_META[id]
              return (
                <li key={id}>
                  <Link className="proposal-row" href={`/negotiate?scenario=${id}`} aria-label={`${s.cta}: ${s.title}, ${usd(s.proposedMinor)}, expected ${tag}`}>
                    <span className="item-num mono">{pad(i + 1)}</span>
                    <span className="proposal-name"><strong>{s.title}</strong><small>{s.summary}</small></span>
                    <StatusTag tone={s.tone}>{tag}</StatusTag>
                    <span className="row-arrow" aria-hidden>↗</span>
                  </Link>
                </li>
              )
            })}
          </ol>
          <p className="footnote">Tags are each fixture&apos;s expected outcome. * Eligible under simulated rules only: no Tide signature exists in fallback mode. Fixtures change what the agents read, never the authority result.</p>

          <div className="section-head condensed mt-16"><h2>Recent transactions</h2><Link className="text-button" href="/transactions">All ↗</Link></div>
          {!authenticated && <p className="fine-label">Log in with Tide to see frozen transactions.</p>}
          {list.state === 'loading' && <Loading>Loading transactions…</Loading>}
          {list.state === 'error' && <GateState tone="danger" kicker={list.code} title="Could not load transactions" />}
          {l && l.transactions.length === 0 && <p className="fine-label">No transactions yet. Run a scenario and freeze its proposal to create the first one.</p>}
          {l && l.transactions.length > 0 && <TransactionsTable rows={l.transactions.slice(0, 5)} caption="Recent transactions" />}
        </section>
        <AuthorityConsole />
      </div>
    </AppShell>
  )
}
