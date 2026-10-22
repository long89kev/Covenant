// TransactionV1: the exact object whose canonical bytes an authority signs and the executor verifies.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { canonicalize } from './canonical.ts'

export const DOMAIN = 'COVENANT/PROCUREMENT/PAYMENT/V1'
export const SCHEMA_VERSION = 'covenant.tx.v1'
export const POLICY_VERSION = 'covenant-procurement-v1'
// Domain separation inside the signed bytes: challenge = SIGN_PREFIX || canonical JSON.
export const SIGN_PREFIX = 'COVENANT/TXN/V1\n'
export const AUTH_TTL_MS = 10 * 60 * 1000

// SHA-512 of the contract source, uppercase hex: the id Forseti would give it. Computed, NOT observed
// from a deployment (custom contract deployment is BLOCKED; see docs/12_EXECUTION_LOG.md).
export const CONTRACT_ID = crypto
  .createHash('sha512')
  .update(fs.readFileSync(path.join(process.cwd(), 'policies', 'CovenantPaymentPolicy.cs')))
  .digest('hex')
  .toUpperCase()

// Ids are restricted so the contract's canonical-JSON scanner is exact (no quotes, commas, escapes).
const Id = z.string().regex(/^[A-Za-z0-9._:-]{1,64}$/)
const Hex64 = z.string().regex(/^[0-9a-f]{64}$/)
const IsoUtc = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
const Cents = z.number().int().positive().refine(Number.isSafeInteger)

export const TransactionV1 = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    domain: z.literal(DOMAIN),
    requestId: z.string().uuid(),
    buyerOrgId: Id,
    vendorOrgId: Id,
    invoiceId: Id,
    agreementSha256: Hex64,
    beneficiaryId: Id,
    currency: z.literal('USD'),
    amountMinor: Cents,
    nonce: Hex64,
    policyVersion: z.literal(POLICY_VERSION),
    tideContractId: z.string().regex(/^[0-9A-F]{128}$/),
    issuedAt: IsoUtc,
    expiresAt: IsoUtc,
  })
  .strict()
  .refine((t) => t.issuedAt < t.expiresAt, 'issuedAt must precede expiresAt')
export type TransactionV1 = z.infer<typeof TransactionV1>

// What the (untrusted) agent may hand over. .strict() rejects isApproved, policyPassed, hasQuorum,
// authorizedSignature and any other field an injected prompt might try to smuggle in.
export const Proposal = z
  .object({
    sourceScenario: Id,
    invoiceId: Id,
    vendorOrgId: Id,
    beneficiaryId: Id,
    amountMinor: Cents,
    currency: z.literal('USD'),
    agentRationale: z.string().max(500),
    extractedFromUntrustedDocument: z.boolean(),
  })
  .strict()
export type Proposal = z.infer<typeof Proposal>

export const sha256 = (s: string | Buffer) => crypto.createHash('sha256').update(s).digest('hex')

export interface Frozen {
  tx: TransactionV1
  canonical: string // the exact JCS text; stored as-is, never re-serialised from user input
  sha256: string // sha256(canonical)
}

export function freeze(
  p: Proposal,
  ctx: { buyerOrgId: string; agreementSha256: string; now?: Date; requestId?: string; nonce?: string },
): Frozen {
  const now = ctx.now ?? new Date()
  const tx = TransactionV1.parse({
    schemaVersion: SCHEMA_VERSION,
    domain: DOMAIN,
    requestId: ctx.requestId ?? crypto.randomUUID(),
    buyerOrgId: ctx.buyerOrgId,
    vendorOrgId: p.vendorOrgId,
    invoiceId: p.invoiceId,
    agreementSha256: ctx.agreementSha256,
    beneficiaryId: p.beneficiaryId,
    currency: p.currency,
    amountMinor: p.amountMinor,
    nonce: ctx.nonce ?? crypto.randomBytes(32).toString('hex'),
    policyVersion: POLICY_VERSION,
    tideContractId: CONTRACT_ID,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + AUTH_TTL_MS).toISOString(),
  })
  const canonical = canonicalize(tx)
  return { tx: Object.freeze(tx), canonical, sha256: sha256(canonical) }
}

// Parse stored canonical text back, and insist it is still canonical (no reordering/whitespace games).
export function parseCanonical(canonical: string): TransactionV1 {
  const tx = TransactionV1.parse(JSON.parse(canonical))
  if (canonicalize(tx) !== canonical) throw new Error('not canonical')
  return tx
}

export const challengeBytes = (canonical: string) => Buffer.from(SIGN_PREFIX + canonical, 'utf8')
