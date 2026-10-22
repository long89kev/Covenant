'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { auditSource, decisionTone, parseMeta, reasonText, txRef, utc, type AuditEvent } from '@/lib/ui/model'
import { HashWithCopy, SourceTag, StatusTag } from './primitives'

function EvidenceDrawer({ e, dialog, onClose }: { e: AuditEvent | null; dialog: React.RefObject<HTMLDialogElement | null>; onClose: () => void }) {
  const src = e ? auditSource(e) : null
  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="ev-h" className="evidence-drawer">
      {e && src && (
        <>
          <header>
            <div><span className="mono kicker">Evidence / seq {e.seq}</span><h2 id="ev-h">{e.type}</h2></div>
            <button type="button" className="text-button" onClick={() => dialog.current?.close()} aria-label="Close evidence">Close ✕</button>
          </header>
          <div className="body">
            <dl className="kv">
              <div><dt>Verdict</dt><dd><StatusTag tone={decisionTone(e.decision)} compact>{e.decision}</StatusTag></dd></div>
              {e.reason && <div><dt>Reason</dt><dd><code className="font-mono">{e.reason}</code><br /><span className="font-normal text-ink-secondary">{e.reason.split(',').map(reasonText).join('; ')}</span></dd></div>}
              <div><dt>Source</dt><dd><SourceTag simulated={src.simulated}>{src.label}</SourceTag>{src.simulated && <span className="block font-mono text-[10px] text-warning-ink">simulated: true</span>}</dd></div>
              <div><dt>Actor</dt><dd>{e.actor}</dd></div>
              <div><dt>Time</dt><dd className="font-mono">{utc(e.ts)}</dd></div>
              {e.txId && <div><dt>Transaction</dt><dd><Link href={`/transactions/${e.txId}`} className="text-button">{txRef(e.txId)} · open inspector ↗</Link></dd></div>}
              {e.payloadHash && <div><dt>Payload SHA-256</dt><dd><HashWithCopy value={e.payloadHash} label="payload SHA-256" n={20} /></dd></div>}
              {e.hash && <div><dt>Chain hash</dt><dd><HashWithCopy value={e.hash} label="chain hash" n={20} /></dd></div>}
            </dl>
            <p className="mono kicker mt-6">Metadata</p>
            <pre className="mt-2 overflow-x-auto border border-line bg-paper2 p-3 font-mono text-[11px] whitespace-pre-wrap">{JSON.stringify(parseMeta(e.meta), null, 2)}</pre>
          </div>
        </>
      )}
    </dialog>
  )
}

// Ruled evidence ledger. Each row is a button that opens its evidence; ≤570px hides the low-priority
// SOURCE / TIME columns visually (provenance stays in the drawer and in the export).
export function AuditTable({ events }: { events: AuditEvent[] }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState<AuditEvent | null>(null)
  const show = (e: AuditEvent) => {
    setOpen(e)
    dialog.current?.showModal()
  }
  return (
    <>
      <div role="table" aria-label="Audit events, newest first. Activate a row to open its evidence.">
        <div role="row" className="audit-head">
          <span role="columnheader">REQUEST</span>
          <span role="columnheader">EVENT</span>
          <span role="columnheader">VERDICT / REASON</span>
          <span role="columnheader">SOURCE</span>
          <span role="columnheader">TIME / ACTOR</span>
        </div>
        {events.map((e) => {
          const src = auditSource(e)
          return (
            <button key={e.seq} type="button" role="row" className="audit-row" onClick={() => show(e)} data-decision={e.decision}>
              <span role="cell">{e.txId ? txRef(e.txId) : '—'}<small>#{e.seq}</small></span>
              <span role="cell"><strong>{e.type}</strong></span>
              <span role="cell"><StatusTag tone={decisionTone(e.decision)} compact>{e.decision}</StatusTag>{e.reason && <small className="mt-1">{e.reason}</small>}</span>
              <span role="cell"><SourceTag simulated={src.simulated}>{src.label}</SourceTag></span>
              <span role="cell">{e.ts.slice(0, 10)} {e.ts.slice(11, 19)}Z<small>{e.actor}</small></span>
            </button>
          )
        })}
      </div>
      <EvidenceDrawer e={open} dialog={dialog} onClose={() => setOpen(null)} />
    </>
  )
}
