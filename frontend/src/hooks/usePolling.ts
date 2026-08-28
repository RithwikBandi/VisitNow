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
 */
export function usePolling<T>(fetchFn: () => Promise<T>, intervalMs: number): PollingState<T> {
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
  }, [intervalMs])

  return { data, error, loading, refresh: run }
}
