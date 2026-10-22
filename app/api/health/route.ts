import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { tcConfig } from '../../../lib/auth'
import { canonicalize } from '../../../lib/covenant/canonical'
import { getDb } from '../../../lib/covenant/db'
import { verify } from '../../../lib/covenant/executor'
import { CONTRACT_ID, challengeBytes, freeze } from '../../../lib/covenant/tx'
import { FORSETI, executorConfig, trustedKeyInfo } from '../../../lib/covenant/runtime'

// Capability badges come from probes run now, not from configuration strings.
async function tidecloakReachable() {
  try {
    const base = String(tcConfig['auth-server-url']).replace(/\/$/, '')
    const res = await fetch(`${base}/realms/${tcConfig.realm}`, { signal: AbortSignal.timeout(3000), cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

// Executor self-test with a throwaway key: a valid signature passes, a one-field edit fails.
function executorSelfTest() {
  const k = crypto.generateKeyPairSync('ed25519')
  const f = freeze(
    { sourceScenario: 'selftest', invoiceId: 'INV-SELFTEST', vendorOrgId: 'northstar-components', beneficiaryId: 'northstar-verified-001', amountMinor: 100, currency: 'USD', agentRationale: 'self-test', extractedFromUntrustedDocument: false },
    { buyerOrgId: 'acme-parts', agreementSha256: '0'.repeat(64) },
  )
  const cfg = { mode: 'live' as const, trustedKeys: [{ keyId: 'selftest', publicKey: k.publicKey, source: 'ephemeral' }] }
  const sig = crypto.sign(null, challengeBytes(f.canonical), k.privateKey).toString('base64')
  const base = { txId: 'selftest', storedSha256: f.sha256, requester: 'x', approvals: [] }
  const good = verify({ ...base, canonical: f.canonical, auth: { kind: 'tide-signature', keyId: 'selftest', signatureB64: sig } }, cfg)
  const evil = canonicalize({ ...f.tx, beneficiaryId: 'unknown-beneficiary-999' })
  const bad = verify({ ...base, canonical: evil, storedSha256: crypto.createHash('sha256').update(evil).digest('hex'), auth: { kind: 'tide-signature', keyId: 'selftest', signatureB64: sig } }, cfg)
  return good.ok === 'verified' && bad.ok === false
}

function liveVerifiedCount() {
  try {
    return (getDb().prepare("SELECT COUNT(*) AS n FROM settlements WHERE assurance = 'TIDE_SIGNATURE_VERIFIED'").get() as { n: number }).n
  } catch {
    return 0
  }
}

export async function GET() {
  const cfg = executorConfig()
  return NextResponse.json({
    authorityMode: cfg?.mode ?? 'UNCONFIGURED',
    tidecloak: { status: (await tidecloakReachable()) ? 'REACHABLE' : 'UNAVAILABLE', realm: tcConfig.realm },
    forseti: { ...FORSETI, contractId: CONTRACT_ID },
    trustedKey: trustedKeyInfo(),
    executorSelfTest: executorSelfTest() ? 'PASS' : 'FAIL',
    // Settlements whose executor receipt verified a Tide signature from the pinned key. An aggregate only.
    liveVerifiedCount: liveVerifiedCount(),
    qea: { status: 'SEE_TIDE_CONSOLE', note: 'QEA state lives in TideCloak; evidence is recorded in docs/12_EXECUTION_LOG.md' },
  })
}
