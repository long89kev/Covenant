'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { auditSource, decisionTone, parseMeta, reasonText, short, txRef, utc, type AuditEvent } from '@/lib/ui/model'
import { HashWithCopy, SourceBadge, StatusPill } from './primitives'

function EvidenceDrawer({ e, dialog, onClose }: { e: AuditEvent | null; dialog: React.RefObject<HTMLDialogElement | null>; onClose: () => void }) {
  const src = e ? auditSource(e) : null
  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="ev-h"
      className="m-0 ml-auto h-full max-h-none w-full max-w-[520px] bg-card p-0 text-ink shadow-dialog backdrop:bg-midnight/40 open:flex open:flex-col">
      {e && src && (
        <>
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 id="ev-h" className="text-h3 font-bold">Event #{e.seq}</h2>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Close evidence" className="grid size-10 place-items-center rounded-control hover:bg-subtle"><X className="size-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <dl className="flex flex-col gap-3">
              <div><dt className="text-small text-ink-muted">Event</dt><dd className="font-semibold">{e.type}</dd></div>
              <div><dt className="text-small text-ink-muted">Verdict</dt><dd><StatusPill tone={decisionTone(e.decision)}>{e.decision}</StatusPill></dd></div>
              {e.reason && <div><dt className="text-small text-ink-muted">Reason</dt><dd><code className="font-mono font-semibold">{e.reason}</code> · {e.reason.split(',').map(reasonText).join('; ')}</dd></div>}
              <div><dt className="text-small text-ink-muted">Source</dt><dd><SourceBadge simulated={src.simulated}>{src.label}</SourceBadge>{src.simulated && <span className="ml-2 text-small text-warning-ink">simulated: true</span>}</dd></div>
              <div><dt className="text-small text-ink-muted">Actor</dt><dd>{e.actor}</dd></div>
              <div><dt className="text-small text-ink-muted">Time</dt><dd className="font-mono">{utc(e.ts)}</dd></div>
              {e.txId && <div><dt className="text-small text-ink-muted">Transaction</dt><dd><Link href={`/transactions/${e.txId}`} className="inline-flex items-center gap-1 font-semibold text-cobalt-ink hover:underline">{txRef(e.txId)} <ArrowRight aria-hidden className="size-4" /></Link></dd></div>}
              {e.payloadHash && <div><dt className="text-small text-ink-muted">Payload SHA-256</dt><dd><HashWithCopy value={e.payloadHash} label="payload SHA-256" n={24} /></dd></div>}
              {e.hash && <div><dt className="text-small text-ink-muted">Chain hash</dt><dd><HashWithCopy value={e.hash} label="chain hash" n={24} /></dd></div>}
              <div><dt className="text-small text-ink-muted">Metadata</dt><dd><pre className="mt-1 overflow-x-auto rounded-lg bg-subtle p-3 font-mono text-small whitespace-pre-wrap">{JSON.stringify(parseMeta(e.meta), null, 2)}</pre></dd></div>
            </dl>
          </div>
        </>
      )}
    </dialog>
  )
}

// Desktop: table, row click (or the row's button) opens the evidence drawer. Mobile: event cards.
export function AuditTable({ events }: { events: AuditEvent[] }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState<AuditEvent | null>(null)
  const show = (e: AuditEvent) => {
    setOpen(e)
    dialog.current?.showModal()
  }
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left">
          <caption className="sr-only">Audit events, newest first. Activate a row to open its evidence.</caption>
          <thead>
            <tr className="border-b border-border text-micro font-semibold tracking-[0.08em] text-ink-muted uppercase">
              <th scope="col" className="px-3 py-2.5">Time (UTC)</th>
              <th scope="col" className="px-3 py-2.5">Actor</th>
              <th scope="col" className="px-3 py-2.5">Event</th>
              <th scope="col" className="px-3 py-2.5">Transaction</th>
              <th scope="col" className="px-3 py-2.5">Verdict / reason</th>
              <th scope="col" className="px-3 py-2.5">Source</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const src = auditSource(e)
              return (
                <tr key={e.seq} onClick={() => show(e)} className="cursor-pointer border-b border-border last:border-b-0 hover:bg-subtle">
                  <td className="px-3 py-3 font-mono text-small whitespace-nowrap">{e.ts.slice(0, 10)}<br />{e.ts.slice(11, 19)}Z</td>
                  <td className="max-w-40 truncate px-3 py-3">{e.actor}</td>
                  <td className="px-3 py-3">
                    <button type="button" onClick={(ev) => { ev.stopPropagation(); show(e) }} className="text-left font-semibold text-ink hover:text-cobalt-ink hover:underline">
                      {e.type}<span className="sr-only">, event {e.seq}: open evidence</span>
                    </button>
                  </td>
                  <td className="px-3 py-3 font-mono text-small">{e.txId ? txRef(e.txId) : '—'}</td>
                  <td className="px-3 py-3">
                    <StatusPill tone={decisionTone(e.decision)}>{e.decision}</StatusPill>
                    {e.reason && <span className="mt-1 block max-w-56 font-mono text-small break-words text-ink-secondary">{e.reason}</span>}
                  </td>
                  <td className="px-3 py-3"><SourceBadge simulated={src.simulated}>{src.label}</SourceBadge></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-2 md:hidden" aria-label="Audit events">
        {events.map((e) => {
          const src = auditSource(e)
          return (
            <li key={e.seq}>
              <button type="button" onClick={() => show(e)} className={cn('flex w-full flex-col items-start gap-1.5 rounded-xl border border-border p-3 text-left hover:bg-subtle')}>
                <span className="flex w-full items-center justify-between gap-2"><span className="font-semibold break-all">{e.type}</span><StatusPill tone={decisionTone(e.decision)}>{e.decision}</StatusPill></span>
                {e.reason && <span className="font-mono text-small break-all text-ink-secondary">{e.reason}</span>}
                <span className="flex flex-wrap items-center gap-1.5 text-small text-ink-muted">{utc(e.ts)} · {e.actor} <SourceBadge simulated={src.simulated}>{src.label}</SourceBadge></span>
                {e.txId && <span className="font-mono text-small text-ink-muted">{txRef(e.txId)} · {short(e.payloadHash, 10)}</span>}
              </button>
            </li>
          )
        })}
      </ul>
      <EvidenceDrawer e={open} dialog={dialog} onClose={() => setOpen(null)} />
    </>
  )
}
