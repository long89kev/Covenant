// Executor configuration, kept apart from the writable DB. The only trust anchor for the live path is
// the realm's Tide verification key from the adapter export (tidecloak.json `gVVK`, keyed by vendorId,
// since a Forseti Policy's keyId IS the vendorId). It is a CANDIDATE anchor: no real Tide signature
// has been verified against it yet, because the signing contract could not be deployed.
import crypto from 'node:crypto'
import tc from '../../tidecloak.json'
import type { AuthorityMode, ExecutorConfig, TrustedKey } from './executor.ts'

function tideKey(): TrustedKey | null {
  try {
    const raw = Buffer.from(String(tc.gVVK), 'hex')
    if (raw.length !== 32) return null
    const publicKey = crypto.createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: raw.toString('base64url') }, format: 'jwk' })
    return { keyId: String(tc.vendorId), publicKey, source: 'tidecloak.json gVVK (realm adapter export)' }
  } catch {
    return null
  }
}

// Fail closed: anything other than an explicit mode leaves the executor unconfigured.
export function executorConfig(): ExecutorConfig | null {
  const mode = process.env.AUTHORITY_MODE
  if (mode !== 'live' && mode !== 'fallback') return null
  const key = tideKey()
  return { mode: mode as AuthorityMode, trustedKeys: key ? [key] : [] }
}

export const trustedKeyInfo = () => {
  const k = tideKey()
  return k ? { keyId: k.keyId, source: k.source, fingerprint: crypto.createHash('sha256').update(k.publicKey.export({ format: 'der', type: 'spki' })).digest('hex') } : null
}

// What the authority boundary can actually do today. Forseti status is from Phase 0 (docs/12), not a guess.
export const FORSETI = {
  status: 'BLOCKED' as const,
  reason:
    'Custom Forseti contract deployment is not self-service (Tide team deploys it, test networks only); ' +
    'the built-in RelationshipAttestation:1 contract refuses signing. Contract written, not deployed.',
}
