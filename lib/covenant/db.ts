// App database (node:sqlite, built into Node 22). It is the WRITABLE, UNTRUSTED store: the executor
// never trusts a status flag in here, only frozen bytes it re-hashes and authorization it re-verifies.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export type Db = DatabaseSync

const SCHEMA = `
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  requestId TEXT NOT NULL UNIQUE,
  nonce TEXT NOT NULL UNIQUE,
  canonical TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL,
  scenario TEXT NOT NULL,
  requester TEXT NOT NULL,
  requesterName TEXT NOT NULL,
  proposal TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS approvals (
  txId TEXT NOT NULL REFERENCES transactions(id),
  subject TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL,
  txSha256 TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE (txId, subject)
);
CREATE TABLE IF NOT EXISTS settlements (
  txId TEXT NOT NULL UNIQUE REFERENCES transactions(id),
  nonce TEXT NOT NULL UNIQUE,
  payloadSha256 TEXT NOT NULL,
  amountMinor INTEGER NOT NULL,
  beneficiaryId TEXT NOT NULL,
  assurance TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  actor TEXT NOT NULL,
  type TEXT NOT NULL,
  txId TEXT,
  decision TEXT NOT NULL,
  reason TEXT,
  payloadHash TEXT,
  meta TEXT NOT NULL,
  prevHash TEXT NOT NULL,
  hash TEXT NOT NULL
);`

export function openDb(file: string): Db {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;')
  db.exec(SCHEMA)
  return db
}

let shared: Db | undefined
export const getDb = () => (shared ??= openDb(process.env.COVENANT_DB ?? path.join(process.cwd(), 'data', 'covenant.db')))

// ---- audit (append-only, hash-chained: an aid for spotting edits, not a trusted timestamp) ----

export interface AuditEvent {
  actor: string
  type: string
  txId?: string
  decision: string
  reason?: string
  payloadHash?: string
  meta?: Record<string, unknown>
}

const GENESIS = '0'.repeat(64)
const eventHash = (prev: string, r: Record<string, unknown>) =>
  crypto
    .createHash('sha256')
    .update([prev, r.ts, r.actor, r.type, r.txId ?? '', r.decision, r.reason ?? '', r.payloadHash ?? '', r.meta].join('|'))
    .digest('hex')

export function audit(db: Db, e: AuditEvent) {
  const last = db.prepare('SELECT hash FROM audit ORDER BY seq DESC LIMIT 1').get() as { hash: string } | undefined
  const prevHash = last?.hash ?? GENESIS
  const row = {
    ts: new Date().toISOString(),
    actor: e.actor,
    type: e.type,
    txId: e.txId ?? null,
    decision: e.decision,
    reason: e.reason ?? null,
    payloadHash: e.payloadHash ?? null,
    meta: JSON.stringify(e.meta ?? {}),
  }
  const hash = eventHash(prevHash, row)
  db.prepare(
    'INSERT INTO audit (ts, actor, type, txId, decision, reason, payloadHash, meta, prevHash, hash) VALUES (?,?,?,?,?,?,?,?,?,?)',
  ).run(row.ts, row.actor, row.type, row.txId, row.decision, row.reason, row.payloadHash, row.meta, prevHash, hash)
}

export function verifyAuditChain(db: Db) {
  const rows = db.prepare('SELECT * FROM audit ORDER BY seq').all() as Record<string, any>[]
  let prev = GENESIS
  for (const r of rows) {
    if (r.prevHash !== prev || eventHash(prev, r) !== r.hash) return { ok: false, brokenAt: r.seq as number, count: rows.length }
    prev = r.hash
  }
  return { ok: true, brokenAt: null, count: rows.length }
}
