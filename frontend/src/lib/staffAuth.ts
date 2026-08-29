/**
 * Staff-side access gate — deliberately NOT a real auth system (no
 * accounts, no backend session, nothing server-verified). This is a
 * prototype whose brief explicitly says not to build production auth
 * infrastructure; what it does need is for a patient clicking around to
 * not casually land on the hospital console, which a bare, unguarded
 * `/staff` route didn't prevent.
 *
 * A single shared passcode, checked entirely client-side, stored in
 * sessionStorage (so it doesn't linger across browser restarts the way
 * localStorage would). This is a believable *product* gate for a demo —
 * "hospital staff have a code, patients don't" — not a security boundary;
 * anyone reading this file's source has the passcode. Real per-hospital
 * staff accounts are exactly the kind of thing that belongs in a later,
 * real-backend phase.
 */
const SESSION_KEY = 'visitnow:staff-session'
export const STAFF_PASSCODE = 'sunrise2026'

export function isStaffAuthed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'ok'
  } catch {
    return false
  }
}

export function trySetStaffAuthed(passcode: string): boolean {
  if (passcode.trim() !== STAFF_PASSCODE) return false
  try {
    sessionStorage.setItem(SESSION_KEY, 'ok')
  } catch {
    // Storage unavailable (private mode, etc.) — the check still passed,
    // so let this one navigation through; it just won't persist across
    // a reload, which is an acceptable prototype-grade degradation.
  }
  return true
}

export function staffLogout(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Nothing to clean up if storage was never available.
  }
}
