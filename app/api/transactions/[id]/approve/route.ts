import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '../../../../../lib/auth'
import { recordApproval } from '../../../../../lib/covenant/service'

const Body = z.object({ role: z.string() }).strict()

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req)
  if (!user) return unauthorized()
  const body = Body.safeParse(await req.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'INVALID_SCHEMA' }, { status: 400 })
  const r = recordApproval(user, (await params).id, body.data.role)
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status })
}
