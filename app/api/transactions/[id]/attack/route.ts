import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '../../../../../lib/auth'
import { canonicalize } from '../../../../../lib/covenant/canonical'
import { audit, getDb } from '../../../../../lib/covenant/db'
import { execute, verify } from '../../../../../lib/covenant/executor'
import type { Approval } from '../../../../../lib/covenant/policy'
import { executorConfig } from '../../../../../lib/covenant/runtime'
import { challengeBytes, parseCanonical } from '../../../../../lib/covenant/tx'

// Red-team drills against the real executor. forge/tamper run verify() on hostile inputs and never
// change stored state; replay re-submits a settled transaction to the real execute().
const Body = z.object({ kind: z.enum(['forge', 'tamper', 'replay']) }).strict()

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return unauthorized()
  const cfg = executorConfig()
  if (!cfg) return NextResponse.json({ ok: false, reason: 'EXECUTOR_UNCONFIGURED' }, { status: 503 })
  const body = Body.safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'INVALID_SCHEMA' }, { status: 400 })
  const id = (await params).id
  const db = getDb()
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Record<string, any> | undefined
  if (!row) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  const approvals = db.prepare('SELECT subject, role, txSha256 FROM approvals WHERE txId = ?').all(id) as unknown as Approval[]
  const input = { txId: id, canonical: row.canonical as string, storedSha256: row.sha256 as string, requester: row.requester as string, approvals }

  let attempts: { name: string; verdict: unknown }[]
  if (body.data.kind === 'forge') {
    // Attacker signs the exact challenge with their own key and offers their own public key.
    const k = crypto.generateKeyPairSync('ed25519')
    const sig = crypto.sign(null, challengeBytes(input.canonical), k.privateKey).toString('base64')
    const pub = k.publicKey.export({ format: 'der', type: 'spki' }).toString('base64')
    const trustedId = cfg.trustedKeys[0]?.keyId ?? 'none'
    attempts = [
      { name: 'Own key id + own public key', verdict: verify({ ...input, auth: { kind: 'tide-signature', keyId: 'attacker-key', signatureB64: sig, publicKeyB64: pub } }, cfg) },
      { name: 'Claims the pinned Tide key id', verdict: verify({ ...input, auth: { kind: 'tide-signature', keyId: trustedId, signatureB64: sig, publicKeyB64: pub } }, cfg) },
    ]
  } else if (body.data.kind === 'tamper') {
    const tx = parseCanonical(input.canonical)
    const evil = canonicalize({ ...tx, beneficiaryId: 'unknown-beneficiary-999', amountMinor: tx.amountMinor * 10 })
    attempts = [{ name: 'Beneficiary + amount edited after freeze', verdict: verify({ ...input, canonical: evil, auth: { kind: 'fallback' } }, cfg) }]
  } else {
    if (!db.prepare('SELECT 1 FROM settlements WHERE txId = ?').get(id)) {
      return NextResponse.json({ error: 'NOT_SETTLED_YET', hint: 'Replay needs a settled transaction.' }, { status: 409 })
    }
    attempts = [{ name: 'Re-submit a settled transaction', verdict: execute(db, id, { kind: 'fallback' }, cfg, user.username) }]
  }
  for (const a of attempts) {
    const v = a.verdict as { ok: unknown; reason?: string }
    audit(db, { actor: user.username, type: 'ATTACK_DRILL', txId: id, decision: v.ok === false ? 'REJECT' : 'ACCEPT', reason: v.reason, payloadHash: input.storedSha256, meta: { kind: body.data.kind, name: a.name } })
  }
  return NextResponse.json({ kind: body.data.kind, attempts })
}
