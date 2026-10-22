import { NextRequest, NextResponse } from 'next/server'
import { verifyTideCloakToken } from '@tidecloak/nextjs/server'
import type { TidecloakConfig } from '@tidecloak/nextjs/server'
import rawConfig from '../tidecloak.json'

export const tcConfig = rawConfig as TidecloakConfig

export interface User {
  sub: string
  username: string
  roles: string[]
}

// Verifies the TideCloak access token against the pinned realm JWK (no remote JWKS fetch):
// signature, issuer, expiry and azp. Roles come only from the verified token, never the request body.
// shortcut: DPoP proof is not verified (useDPoP off), so a stolen token replays until expiry; enable useDPoP + proof check once a login can be re-tested.
export async function requireUser(req: NextRequest): Promise<User | null> {
  const m = req.headers.get('authorization')?.match(/^(Bearer|DPoP) (.+)$/i)
  if (!m) return null
  const claims = (await verifyTideCloakToken(tcConfig, m[2])) as Record<string, any> | null
  if (!claims?.sub) return null
  const client = String(tcConfig.resource)
  return {
    sub: String(claims.sub),
    username: String(claims.preferred_username ?? claims.sub),
    roles: [...(claims.realm_access?.roles ?? []), ...(claims.resource_access?.[client]?.roles ?? [])],
  }
}

export const unauthorized = () => NextResponse.json({ error: 'NOT_AUTHENTICATED' }, { status: 401 })
