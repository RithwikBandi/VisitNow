import { Check, Landmark, LocateFixed, Loader2, MapPin, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

/** Demo cities. The seed data actually has clinics in Hyderabad, Warangal,
 * and Bengaluru — every other city here is a real, selectable choice that
 * honestly shows "VisitNow hasn't launched here yet" rather than pretending
 * to have coverage (see docs/VISITNOW_PRODUCT_DECISIONS.md §12/§14). */
const CITIES = ['Hyderabad', 'Warangal', 'Bengaluru', 'Mumbai', 'Delhi-NCR', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'] as const

/** Cities the demo data actually has clinics in, for pages that need to
 * fall back gracefully when the picked city has no coverage yet. */
export const LAUNCHED_CITIES = ['Hyderabad', 'Warangal', 'Bengaluru'] as const

const KEY = 'visitnow:location'
const CHANGE_EVENT = 'visitnow:location-change'

export function getSavedLocation(): string {
  try {
    return localStorage.getItem(KEY) ?? 'Hyderabad'
  } catch {
    return 'Hyderabad'
  }
}

/** Home and the clinics list both need to react when the header's
 * LocationBar changes city, even though they're siblings under AppShell's
 * <Outlet/> with no shared parent state. A same-tab CustomEvent is the
 * lightest thing that works here — localStorage's own "storage" event
 * deliberately never fires in the tab that made the write. */
export function useSelectedCity(): string {
  const [city, setCity] = useState(getSavedLocation)
  useEffect(() => {
    const onChange = (e: Event) => setCity((e as CustomEvent<string>).detail)
    window.addEventListener(CHANGE_EVENT, onChange)
    return () => window.removeEventListener(CHANGE_EVENT, onChange)
  }, [])
  return city
}

type DetectState = 'idle' | 'detecting' | 'error'

export function LocationBar({ onChange, compact = false }: { onChange?: (city: string) => void; compact?: boolean }) {
  const [city, setCity] = useState(getSavedLocation)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [detect, setDetect] = useState<DetectState>('idle')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CITIES
    return CITIES.filter((c) => c.toLowerCase().includes(q))
  }, [query])

  const select = (c: string) => {
    setCity(c)
    try {
      localStorage.setItem(KEY, c)
    } catch {
      // Non-fatal — the UI still updates for this session.
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: c }))
    onChange?.(c)
    setOpen(false)
    setQuery('')
    setDetect('idle')
  }

  /** A real browser geolocation call (real permission prompt, real
   * coordinates) — not faked. What happens *after* getting coordinates
   * is the honest limit: turning "17.38°N 78.48°E" into a city name
   * needs a reverse-geocoding API this prototype doesn't have a key
   * for, so a successful detection resolves to Hyderabad, the one city
   * the demo data actually covers, rather than pretending to resolve
   * an arbitrary real address. Denied/unavailable permission degrades
   * to the manual city list, never a crash — see the original brief's
   * §26 edge case list. */
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setDetect('error')
      return
    }
    setDetect('detecting')
    navigator.geolocation.getCurrentPosition(
      () => select('Hyderabad'),
      () => setDetect('error'),
      { timeout: 8000 },
    )
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--color-text)]">
        <MapPin size={15} className="shrink-0 text-[var(--color-brand-600)]" aria-hidden="true" />
        {!compact && (
          <>
            {city}
            <span className="text-[var(--color-text-faint)]">· Change</span>
          </>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] sm:rounded-[var(--radius-xl)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
                <h2 className="font-display text-base font-bold text-[var(--color-text)]">Choose your location</h2>
                <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1 text-[var(--color-text-faint)] hover:bg-[var(--color-border)]/60">
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-1 overflow-y-auto px-5 py-4">
                <label className="mb-3 flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3.5 py-2.5">
                  <Search size={16} className="shrink-0 text-[var(--color-text-faint)]" aria-hidden="true" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for your city"
                    className="w-full min-w-0 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
                  />
                </label>

                <button
                  onClick={detectLocation}
                  disabled={detect === 'detecting'}
                  className="mb-3 flex items-center gap-2.5 rounded-[var(--radius-md)] px-1 py-1.5 text-sm font-bold text-[var(--color-brand-600)] transition-colors hover:text-[var(--color-brand-700)] disabled:opacity-60"
                >
                  {detect === 'detecting' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={16} aria-hidden="true" />}
                  {detect === 'detecting' ? 'Detecting your location…' : 'Detect my location'}
                </button>
                {detect === 'error' && (
                  <p className="mb-3 text-xs text-[var(--color-danger)]">
                    Couldn't detect your location — pick your city below instead.
                  </p>
                )}

                <div className="border-t border-[var(--color-border)] pt-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">
                    {query ? 'Matching cities' : 'Popular cities'}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {filtered.map((c) => (
                      <button
                        key={c}
                        onClick={() => select(c)}
                        className={`flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] border px-2 py-3 text-center transition-colors ${
                          c === city ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]' : 'border-[var(--color-border)] hover:border-[var(--color-brand-300)]'
                        }`}
                      >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${c === city ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)]' : 'bg-[var(--color-border)]/50 text-[var(--color-text-muted)]'}`}>
                          {c === city ? <Check size={16} aria-hidden="true" /> : <Landmark size={16} aria-hidden="true" />}
                        </div>
                        <span className="text-[11px] font-semibold leading-tight text-[var(--color-text)]">{c}</span>
                      </button>
                    ))}
                  </div>
                  {filtered.length === 0 && (
                    <p className="py-6 text-center text-sm text-[var(--color-text-faint)]">No cities match "{query}".</p>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
