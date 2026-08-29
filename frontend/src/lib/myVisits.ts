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
