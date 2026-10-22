import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '../../../lib/auth'
import { negotiate } from '../../../lib/covenant/agent'
import { isScenario } from '../../../lib/covenant/service'

// Deterministic, side-effect free: shows what the (simulated) agents would negotiate and propose.
export async function GET(req: NextRequest) {
  if (!(await requireUser(req))) return unauthorized()
  const id = req.nextUrl.searchParams.get('scenario')
  if (!isScenario(id)) return NextResponse.json({ error: 'INVALID_SCHEMA' }, { status: 400 })
  return NextResponse.json(negotiate(id))
}
