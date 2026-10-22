import Link from 'next/link'
import { AppShell } from '@/components/covenant/app-shell'
import { EditorialPageHeader, SourceTag, StatusTag } from '@/components/covenant/primitives'
import type { Tone } from '@/lib/ui/model'
import tc from '../../tidecloak.json'

export const metadata = { title: 'Governance' }

// Three controls kept apart in data and UI: per-transaction business approval, realm-admin QEA, and the
// Tide ORK threshold. Live QEA state lives in the Tide console and is never mirrored here as a fake
// indicator; the last recorded observation is cited with its source.
export default function Governance() {
  const consoleUrl = `${String(tc['auth-server-url']).replace(/\/$/, '')}/realms/${tc.realm}/tide-console/`
  const layers: { n: string; name: string; question: string; value: string; unit: string; status: [string, Tone]; source: string; simulated: boolean; body: React.ReactNode }[] = [
    {
      n: '01', name: 'Business authorization', question: 'Who approves this specific high-impact transaction?',
      value: 'Finance + Procurement', unit: 'Per transaction above $5,000 · product policy',
      status: ['Simulated', 'pending'], source: 'Reference evaluator + executor', simulated: true,
      body: <>Two different people, neither of them the requester, each holding a TideCloak role (<code>covenant-finance</code>, <code>covenant-procurement</code>). Identity is Tide-verified; the approval record is an app-DB row, not a Forseti approver proof.</>,
    },
    {
      n: '02', name: 'Realm governance', question: 'Who can change privileges and administrator policy?',
      value: 'TideCloak QEA', unit: 'Per IAM change · quorum max(1, ⌊0.7 × admins⌋)',
      status: ['Not observed by app', 'neutral'], source: 'Tide console', simulated: false,
      body: <>Granting a role is a change request that commits only when enough <code>tide-realm-admin</code> users sign it in their own Tide enclaves. The app server holds no admin credential. A business approval is <b>not</b> a QEA change.</>,
    },
    {
      n: '03', name: 'Cryptographic signing', question: 'When can an accepted payload obtain a usable authorization signature?',
      value: `Tide ORK · ${String(tc.thresholdT)} of ${String(tc.thresholdN)}`, unit: 'Per cryptographic operation · Forseti contract not deployed',
      status: ['Configured · not signing payments', 'neutral'], source: 'tidecloak.json adapter export', simulated: false,
      body: <>Logins are produced by independent Tide ORK nodes holding key shares; no server, admin or AI holds the whole key. A deployed Forseti contract would run the payment policy on this layer. It is not deployed here, so no payment signature exists.</>,
    },
  ]
  const escalation = ['A rogue admin grants themself both approver roles', 'TideCloak files a change request instead of applying it', 'It stays pending until a different admin signs, if the quorum is ≥ 2']

  return (
    <AppShell crumbs={[{ label: 'Governance' }]}>
      <EditorialPageHeader id="governance-title" index="04" kicker="Governance"
        title={<>Authority has<br />a structure</>}
        lede="Business approvals, IAM governance and signing thresholds are different controls. None of them stands in for another." />

      <div className="governance-list">
        {layers.map((l) => (
          <article key={l.n} className="gov-row" aria-labelledby={`layer-${l.n}`}>
            <span className="mono gov-n">{l.n} /</span>
            <div>
              <h2 id={`layer-${l.n}`}>{l.name}</h2>
              <p><b className="text-ink">{l.question}</b> {l.body}</p>
            </div>
            <div className="gov-side">
              <strong>{l.value}</strong>
              <span>{l.unit}</span>
              <StatusTag tone={l.status[1]} compact>{l.status[0]}</StatusTag>
              <span>Source <SourceTag simulated={l.simulated}>{l.source}</SourceTag></span>
            </div>
          </article>
        ))}
      </div>

      <div className="compare">
        <section aria-labelledby="rbac-h">
          <div className="section-head small"><h2 id="rbac-h">Traditional admin (RBAC)</h2></div>
          <ul>
            <li>One administrator can edit the local access-control list.</li>
            <li>The backend holds the keys and is trusted to enforce them.</li>
            <li>A compromised admin account or server can authorize anything.</li>
          </ul>
        </section>
        <section aria-labelledby="qea-h">
          <div className="section-head small"><h2 id="qea-h">TideCloak QEA · {tc.realm}</h2><StatusTag tone="neutral" compact>Not observed by app</StatusTag></div>
          <dl className="kv">
            <div><dt>Live verification</dt><dd>UNAVAILABLE · not read by this app</dd></div>
            <div><dt>Last recorded observation</dt><dd><SourceTag>docs/12_EXECUTION_LOG.md</SourceTag></dd></div>
          </dl>
          <p className="gov-text mt-3 text-[13px] leading-relaxed text-ink-secondary">
            QEA quorum is <b className="text-ink">1</b> until a third <code>tide-realm-admin</code> is enrolled, so today a single admin can still approve a role change. QEA evidence for the demo: pending.
          </p>
        </section>
      </div>

      <section aria-labelledby="esc-h" className="mt-14">
        <div className="section-head small"><h2 id="esc-h">Escalation attempt</h2><span className="mono subtle-label">Educational · not a live QEA workflow</span></div>
        <ol className="steps">
          {escalation.map((s, i) => <li key={s}><span className="mono">Step 0{i + 1}</span>{s}</li>)}
        </ol>
        <div className="mt-6 flex flex-wrap gap-6">
          <a className="text-button" href={consoleUrl} target="_blank" rel="noreferrer">Open QEA approvals in the Tide console ↗</a>
          <Link className="text-button" href="/audit">Read recorded evidence ↗</Link>
        </div>
      </section>

      <div className="note-panel">
        <span className="mono">Scope / caveat</span>
        <p>
          No QEA approval or distributed signature is simulated as live evidence here. The TideCloak <code>master</code> realm is not governed by QEA: its operator can still change
          infrastructure, take the system offline or alter what this app displays. Claims are scoped to the application realm <code>{tc.realm}</code>.
        </p>
      </div>
    </AppShell>
  )
}
