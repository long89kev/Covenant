import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '../../../../../lib/auth'
import { getDb } from '../../../../../lib/covenant/db'
import { execute, type Authorization } from '../../../../../lib/covenant/executor'
import { executorConfig } from '../../../../../lib/covenant/runtime'

// Either a Tide signature over the frozen challenge (live path) or nothing (fallback path).
// Any publicKey in the body is ignored by the executor: the trust anchor is pinned server config.
const Body = z.union([
  z.object({ keyId: z.string().max(128), signatureB64: z.string().max(256), publicKeyB64: z.string().max(512).optional() }).strict(),
  z.object({}).strict(),
])

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return unauthorized()
  const cfg = executorConfig()
  if (!cfg) return NextResponse.json({ ok: false, reason: 'EXECUTOR_UNCONFIGURED' }, { status: 503 })
  const body = Body.safeParse(await req.json().catch(() => ({})))
  if (!body.success) return NextResponse.json({ ok: false, reason: 'INVALID_SCHEMA' }, { status: 400 })
  const auth: Authorization = 'signatureB64' in body.data ? { kind: 'tide-signature', ...body.data } : { kind: 'fallback' }
  const v = execute(getDb(), (await params).id, auth, cfg, user.username)
  return NextResponse.json(v, { status: v.ok ? 200 : v.status })
}
