'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { LogIn, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { capabilityMode, type CapabilityMode, type Health } from '@/lib/ui/model'
import { SecurityEmptyState, Spinner } from './primitives'

export interface ApiResult<T = any> {
  status: number
  ok: boolean
  data: T
}

// fetch with the caller's Tide access token. The server re-verifies it on every call; nothing the UI
// decides here is trusted. A network failure is reported as status 0, never as success.
export function useApi() {
  const { token } = useTideCloak()
  return useCallback(
    async <T = any,>(path: string, init?: RequestInit): Promise<ApiResult<T>> => {
      try {
        const res = await fetch(path, { ...init, cache: 'no-store', headers: { ...init?.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
        const data = await res.json().catch(() => ({}))
        return { status: res.status, ok: res.ok, data }
      } catch {
        return { status: 0, ok: false, data: { error: 'NETWORK_UNAVAILABLE' } as T }
      }
    },
    [token],
  )
}

interface Capability {
  health: Health | null
  failed: boolean
  mode: CapabilityMode | 'LOADING'
  checkedAt: string | null
  refresh: () => void
}

const Ctx = createContext<Capability | null>(null)

// One probe of /api/health shared by the banner, header pill and pages. It is re-run on demand only,
// so the mode never changes silently behind the user's back.
export function CapabilityProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<Health | null>(null)
  const [failed, setFailed] = useState(false)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let live = true
    setHealth(null)
    setFailed(false)
    fetch('/api/health', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((h: Health) => live && setHealth(h))
      .catch(() => live && setFailed(true))
      .finally(() => live && setCheckedAt(new Date().toISOString()))
    return () => {
      live = false
    }
  }, [tick])

  const refresh = useCallback(() => setTick((t) => t + 1), [])
  return <Ctx.Provider value={{ health, failed, mode: capabilityMode(health, failed), checkedAt, refresh }}>{children}</Ctx.Provider>
}

export function useCapability(): Capability {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCapability outside CapabilityProvider')
  return c
}

// Pages that read protected data. Shows a real sign-in state instead of a blank screen.
export function RequireLogin({ children, what }: { children: ReactNode; what: string }) {
  const { authenticated, isInitializing, login } = useTideCloak()
  if (isInitializing) {
    return <p role="status" className="flex items-center gap-2 text-ink-secondary"><Spinner /> Connecting to TideCloak…</p>
  }
  if (!authenticated) {
    return (
      <SecurityEmptyState icon={ShieldAlert} title={`Log in with Tide to view ${what}`} action={<Button onClick={() => login()}><LogIn /> Log in with Tide</Button>}>
        This data is served only to a TideCloak-verified session. Your token is re-verified by the server on every request.
      </SecurityEmptyState>
    )
  }
  return <>{children}</>
}

// A protected request came back 401: the token is stale or was rejected.
export function SessionExpired() {
  const { login } = useTideCloak()
  return (
    <SecurityEmptyState icon={ShieldAlert} tone="pending" title="Session expired or token rejected (NOT_AUTHENTICATED)" action={<Button onClick={() => login()}><LogIn /> Log in again</Button>}>
      The server refused the access token. Nothing was changed.
    </SecurityEmptyState>
  )
}
