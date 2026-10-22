import Link from 'next/link'
import { ArrowRight, Cpu, ExternalLink, KeyRound, ReceiptText, ServerCog, ShieldCheck, type LucideIcon } from 'lucide-react'
import { AppShell } from '@/components/covenant/app-shell'
import { PageHeading, Panel, PanelHead, SourceBadge, StatusPill } from '@/components/covenant/primitives'
import { Button } from '@/components/ui/button'
import type { Tone } from '@/lib/ui/model'
import tc from '../../tidecloak.json'

export const metadata = { title: 'Governance' }

const code = 'rounded-md border border-border bg-subtle px-1.5 py-0.5 font-mono text-small text-ink'

// Explanation plus truthfully sourced status. Live QEA state lives in the Tide console and is never
// mirrored here as a fake indicator; the last recorded observation is cited with its source.
export default function Governance() {
  const consoleUrl = `${String(tc['auth-server-url']).replace(/\/$/, '')}/realms/${tc.realm}/tide-console/`
  const layers: { icon: LucideIcon; name: string; unit: string; value: string; status: [string, Tone]; source: string; simulated: boolean; body: React.ReactNode }[] = [
    {
      icon: ReceiptText,
      name: 'Business approval quorum',
      unit: 'Per transaction above $5,000',
      value: 'Finance + Procurement',
      status: ['Simulated', 'pending'],
      source: 'Reference evaluator + executor',
      simulated: true,
      body: <>Two different people, neither of them the requester, each holding a TideCloak role (<code className={code}>covenant-finance</code>, <code className={code}>covenant-procurement</code>). Their identity is Tide-verified, but the approval record is an app-DB row, not a Forseti approver proof.</>,
    },
    {
      icon: KeyRound,
      name: 'TideCloak QEA admin quorum',
      unit: 'Per IAM change (e.g. granting an approver role)',
      value: 'max(1, ⌊0.7 × admins⌋)',
      status: ['Not observed by app', 'neutral'],
      source: 'Tide console',
      simulated: false,
      body: <>Granting a role is a change request that commits only when enough <code className={code}>tide-realm-admin</code> users sign it in their own Tide enclaves. The app server holds no admin credential. A business approval is <b>not</b> a QEA change.</>,
    },
    {
      icon: Cpu,
      name: 'Tide ORK cryptographic threshold',
      unit: 'Per cryptographic operation',
      value: `${String(tc.thresholdT)} of ${String(tc.thresholdN)} nodes`,
      status: ['Configured', 'neutral'],
      source: 'tidecloak.json adapter export',
      simulated: false,
      body: <>Logins are produced by independent Tide ORK nodes holding key shares; no server, admin or AI holds the whole key. A deployed Forseti contract would run its payment policy on this layer. It is not deployed here.</>,
    },
  ]
  const escalation = ['A rogue admin grants themself both approver roles', 'TideCloak files a change request instead of applying it', 'It stays pending until a different admin signs, if the quorum is ≥ 2']

  return (
    <AppShell crumbs={[{ label: 'Governance' }]}>
      <PageHeading
        eyebrow="COVENANT / Governance"
        title="Governance without a master key."
        description="Three distinct control layers that must not be confused: transaction approvals, realm-administrator QEA, and distributed cryptographic signing."
        actions={<Button variant="outline" asChild><a href={consoleUrl} target="_blank" rel="noreferrer">View Tide console <ExternalLink /></a></Button>}
      />

      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        <Panel labelledBy="rbac-h">
          <PanelHead id="rbac-h" title={<span className="flex items-center gap-2"><ServerCog aria-hidden className="size-5 text-ink-muted" /> Traditional admin (RBAC)</span>} />
          <ul className="flex flex-col gap-2 text-ink-secondary">
            <li>· One administrator can edit the local access-control list.</li>
            <li>· The backend holds the keys and is trusted to enforce them.</li>
            <li>· A compromised admin account or server can authorize anything.</li>
          </ul>
        </Panel>
        <Panel labelledBy="qea-h" className="border-cobalt/25">
          <PanelHead id="qea-h" title={<span className="flex items-center gap-2"><ShieldCheck aria-hidden className="size-5 text-cobalt" /> TideCloak QEA</span>}>
            <StatusPill tone="neutral">Not observed by app</StatusPill>
          </PanelHead>
          <dl className="flex flex-col gap-2">
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-ink-secondary">Realm</dt><dd className="font-mono font-semibold">{tc.realm}</dd></div>
            <div className="flex flex-wrap justify-between gap-2"><dt className="text-ink-secondary">Live verification</dt><dd className="font-semibold">UNAVAILABLE / NOT READ by this app</dd></div>
            <div className="flex flex-col gap-1">
              <dt className="text-ink-secondary">Last recorded observation <SourceBadge>docs/12_EXECUTION_LOG.md</SourceBadge></dt>
              <dd className="rounded-xl border border-warning/35 bg-warning-soft p-3 text-ink">QEA quorum is <b>1</b> until a third <code className={code}>tide-realm-admin</code> is enrolled, so today a single admin can still approve a role change. QEA evidence for the demo: pending.</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <h2 className="mb-3 text-h2 font-bold text-ink">Three quorums, kept apart</h2>
      <ul className="mb-6 grid gap-5 lg:grid-cols-3">
        {layers.map(({ icon: Icon, name, unit, value, status, source, simulated, body }, i) => (
          <li key={name}>
            <Panel as="article" labelledBy={`layer-${i}`} className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-2">
                <span aria-hidden className="grid size-10 place-items-center rounded-control bg-cobalt-soft text-cobalt"><Icon className="size-5" /></span>
                <StatusPill tone={status[1]}>{status[0]}</StatusPill>
              </div>
              <h3 id={`layer-${i}`} className="mt-4 text-h3 font-bold text-ink">{name}</h3>
              <p className="text-small text-ink-muted">{unit}</p>
              <p className="mt-2 text-[20px] leading-7 font-bold text-ink">{value}</p>
              <p className="mt-2 text-ink-secondary">{body}</p>
              <p className="mt-auto flex flex-wrap items-center gap-1.5 pt-4 text-small text-ink-muted">Source <SourceBadge simulated={simulated}>{source}</SourceBadge></p>
            </Panel>
          </li>
        ))}
      </ul>

      <Panel labelledBy="esc-h">
        <PanelHead id="esc-h" title="Escalation attempt (educational)">
          <StatusPill tone="neutral" icon={false}>Not a live QEA workflow</StatusPill>
        </PanelHead>
        <ol className="grid gap-3 md:grid-cols-3">
          {escalation.map((s, i) => (
            <li key={s} className="flex items-start gap-3 rounded-xl border border-border bg-subtle p-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-cobalt text-small font-bold text-white">{i + 1}</span>
              <span className="font-semibold text-ink">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-ink-secondary">
          Scope and caveat: the TideCloak <code className={code}>master</code> realm is not governed by QEA; its operator can still change infrastructure,
          for example take the system offline or alter what this app displays. Claims here are scoped to the application realm <code className={code}>{tc.realm}</code>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" asChild><a href={consoleUrl} target="_blank" rel="noreferrer">QEA approvals in Tide <ExternalLink /></a></Button>
          <Button variant="ghost" asChild><Link href="/audit">Read recorded evidence <ArrowRight /></Link></Button>
        </div>
      </Panel>
    </AppShell>
  )
}
