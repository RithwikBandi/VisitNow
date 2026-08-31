import type { PatientIdentity } from './patientIdentity'
import type { QueueEntry } from './types'

/**
 * "Which visits are mine" — a local list of QueueEntry ids this browser
 * has created, not a cache of their data. The Visits screen re-fetches
 * each id's *current* state from the backend every time it loads, so
 * what's local is only the pointer, never anything that could go stale.
 * See docs/VISITNOW_PRODUCT_DECISIONS.md §8.22 for the full reasoning.
 */
const KEY = 'visitnow:my-visit-ids'

export function getMyVisitIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const ids = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function addMyVisitId(id: string): void {
  try {
    const current = getMyVisitIds()
    if (!current.includes(id)) {
      localStorage.setItem(KEY, JSON.stringify([id, ...current]))
    }
  } catch {
    // Storage unavailable — the visit still works this session via its
    // own URL, it just won't show up in "My Visits" after a reload.
  }
}

/** Prunes one id that turned out not to be this browser's own visit
 * (see isMyEntry below) — self-healing, so a stale pointer only ever
 * gets silently skipped once, not re-fetched and re-checked forever. */
export function removeMyVisitId(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(getMyVisitIds().filter((existing) => existing !== id)))
  } catch {
    // Nothing to clean up if storage was never available.
  }
}

/**
 * Whether a fetched QueueEntry actually belongs to this browser's
 * current patient identity — not just "an id this browser once saved."
 *
 * The gap this closes, found live: entry ids come from a plain counter
 * (`nextId('queue')` in the backend's store.ts) that restarts from zero
 * on every demo reset, and the seed script deterministically recreates
 * the same entries in the same order every time. A visit id saved to
 * this browser before a reset — from an earlier test booking, or a
 * previous demo run — doesn't stop existing in localStorage just
 * because the backend forgot it; after the reset, that same id now
 * belongs to whichever *fresh* seeded entry the counter reassigned it
 * to, which is a real entry, just never this browser's. Home's active-
 * visit banner and the Visits list were both trusting the id alone and
 * showing that unrelated patient's demo token as "yours" — the same
 * one, every time, because the reseed is deterministic. Matching the
 * fetched entry's own patientName/patientPhone against this browser's
 * stored identity (see lib/patientIdentity.ts) before treating it as
 * "mine" catches exactly this, with no backend changes needed: the
 * patient's own identity is the one piece of client state a reset can
 * never silently reassign to someone else.
 */
export function isMyEntry(entry: QueueEntry, identity: PatientIdentity | null): boolean {
  if (!identity) return false
  const samePhone = Boolean(identity.phone) && Boolean(entry.patientPhone) && entry.patientPhone!.trim() === identity.phone!.trim()
  // Phone is the stronger signal when both sides actually have one on
  // record; fall back to name only when there's nothing to compare
  // (e.g. a walk-in entry with no phone captured at the counter).
  if (identity.phone && entry.patientPhone) return samePhone
  return entry.patientName.trim().toLowerCase() === identity.name.trim().toLowerCase()
}
