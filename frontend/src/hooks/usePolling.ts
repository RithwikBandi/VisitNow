import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../lib/types'

interface PollingState<T> {
  data: T | null
  error: string | null
  loading: boolean
  /** Manual re-fetch — used right after an action (Get Token, Call Next)
   * so the screen updates immediately instead of waiting for the next
   * tick. */
  refresh: () => void
}

/**
 * The whole "real-time-feeling" mechanism for this prototype: short-
 * interval polling, not WebSockets — see the brief's §25/§17, which
 * explicitly asks for exactly this trade-off. Every screen that needs to
 * feel live (a session's current token, a patient's own queue position)
 * uses this one hook, so upgrading to push-based updates later is a
 * one-file change, not a rewrite of every page.
 *
 * `resetKey` fixes a real bug found live: React Router does NOT remount
 * a component when only its route param changes (e.g. clicking a date
 * on SessionDetailPage's DateStrip navigates `/sessions/session-1` ->
 * `/sessions/session-2`, same component instance, new param). Without
 * something identity-changing in this effect's dependency array, the
 * poll interval that was already running for session-1 just kept
 * ticking — the fetcher ref updates, but not until the *next* tick, up
 * to `intervalMs` later, so the page visibly kept showing the old
 * session's data (and its date strip kept "Today" highlighted) for
 * however long was left on the old interval. Passing the route param
 * itself as `resetKey` makes navigation between sibling resources
 * refetch immediately, the same as a fresh mount would.
 */
export function usePolling<T>(fetchFn: () => Promise<T>, intervalMs: number, resetKey?: unknown): PollingState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(fetchFn)
  fetchRef.current = fetchFn

  const run = useCallback(async () => {
    try {
      const result = await fetchRef.current()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    // A genuinely new resource (resetKey changed) shouldn't show the
    // previous one's stale data while the fresh fetch is in flight —
    // only the very first mount (resetKey undefined-to-undefined, or
    // any actual change) clears it; re-running for the same key alone
    // (interval re-created for other reasons) wouldn't reach here since
    // resetKey wouldn't have changed.
    setData(null)
    setLoading(true)
    const tick = async () => {
      if (cancelled) return
      await run()
    }
    tick()
    const id = window.setInterval(tick, intervalMs)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, resetKey])

  return { data, error, loading, refresh: run }
}
