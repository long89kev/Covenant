import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '../../../../lib/auth'
import { getDetail } from '../../../../lib/covenant/service'
import { FORSETI, trustedKeyInfo } from '../../../../lib/covenant/runtime'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireUser(req))) return unauthorized()
  const detail = getDetail((await params).id)
  if (!detail) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  return NextResponse.json({ ...detail, forseti: FORSETI, trustedKey: trustedKeyInfo(), authorityMode: process.env.AUTHORITY_MODE ?? null })
}
