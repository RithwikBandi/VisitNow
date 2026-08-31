/**
 * Real per-account sign-in for the four staff-side roles, replacing the
 * single shared passcode this used to be (see
 * docs/VISITNOW_PRODUCT_DECISIONS.md's multi-tenant auth section). The
 * token + account are kept in sessionStorage, not localStorage — same
 * lifetime choice as before: a shared front-desk device shouldn't stay
 * signed in after the tab closes, unlike a patient's own identity.
 *
 * Deliberately thin: this module doesn't itself validate credentials —
 * it calls the backend, which is the actual source of truth (see
 * backend/src/store/authEngine.ts). Restoring a session on reload also
 * asks the server (getAccount below, backed by GET /auth/me) rather than
 * trusting whatever's cached here, the same "server is the source of
 * truth" spirit lib/patientIdentity.ts and every polling hook already
 * follow.
 */
import { ApiError } from './types'
import type { PublicAccount } from './accountTypes'

const TOKEN_KEY = 'visitnow:staff-token'
const ACCOUNT_KEY = 'visitnow:staff-account'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/** The cached account — good enough for an instant render while a page
 * decides whether to also call GET /auth/me to reconfirm. Never trusted
 * for anything server-enforced (every write route checks the token
 * itself; this is UI convenience only, e.g. "which nav items to show"). */
export function getCachedAccount(): PublicAccount | null {
  try {
    const raw = sessionStorage.getItem(ACCOUNT_KEY)
    return raw ? (JSON.parse(raw) as PublicAccount) : null
  } catch {
    return null
  }
}

function store(token: string, account: PublicAccount): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
    sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(account))
  } catch {
    // Storage unavailable — the session still works for this page load.
  }
}

export async function login(email: string, password: string): Promise<PublicAccount> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    throw new ApiError("Couldn't reach the VisitNow server. Check your connection and try again.", 0)
  }
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError((body as { error?: string } | null)?.error ?? 'Sign in failed.', response.status)
  }
  const { account, token } = body as { account: PublicAccount; token: string }
  store(token, account)
  return account
}

export async function logout(): Promise<void> {
  const token = getToken()
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(ACCOUNT_KEY)
  } catch {
    // Nothing to clean up if storage was never available.
  }
  if (!token) return
  try {
    await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  } catch {
    // The local session is already cleared — a failed server-side
    // invalidation isn't worth surfacing to whoever just clicked "sign out."
  }
}

/** Where a signed-in account should land right after login, and what
 * every /staff, /doctor, /admin route's guard falls back to. */
export function homeRouteFor(role: PublicAccount['role']): string {
  if (role === 'super_admin' || role === 'super_admin_staff') return '/admin'
  if (role === 'doctor') return '/doctor'
  return '/staff'
}
