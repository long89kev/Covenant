import { NextRequest, NextResponse } from 'next/server'
import { requireUser, unauthorized } from '../../../lib/auth'
import { getDb, verifyAuditChain } from '../../../lib/covenant/db'

export async function GET(req: NextRequest) {
  if (!(await requireUser(req))) return unauthorized()
  const db = getDb()
  const events = db.prepare('SELECT seq, ts, actor, type, txId, decision, reason, payloadHash, meta, hash FROM audit ORDER BY seq DESC LIMIT 500').all()
  return NextResponse.json({ chain: verifyAuditChain(db), events })
}
