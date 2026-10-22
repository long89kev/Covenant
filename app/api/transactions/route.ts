import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, unauthorized } from '../../../lib/auth'
import { createTransaction, isScenario, listTransactions } from '../../../lib/covenant/service'

export async function GET(req: NextRequest) {
  if (!(await requireUser(req))) return unauthorized()
  return NextResponse.json(listTransactions())
}

const Body = z.object({ scenarioId: z.string() }).strict()

// Freeze: the server re-runs the agent for the scenario and freezes the canonical bytes.
export async function POST(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) return unauthorized()
  const body = Body.safeParse(await req.json().catch(() => null))
  if (!body.success || !isScenario(body.data.scenarioId)) return NextResponse.json({ error: 'INVALID_SCHEMA' }, { status: 400 })
  return NextResponse.json({ id: createTransaction(user, body.data.scenarioId) }, { status: 201 })
}
