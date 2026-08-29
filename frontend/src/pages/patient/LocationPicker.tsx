import { Check, MapPin, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'

/** Demo cities only — every clinic in the seed data is in Hyderabad, so
 * changing this doesn't actually filter anything yet. It exists so the
 * "location first" product idea (brief §23/§26) is visibly present and
 * the interaction is real, not because the discovery grid is wired to
 * it — see docs/VISITNOW_PRODUCT_DECISIONS.md §10 (Open questions). */
const CITIES = ['Hyderabad', 'Bengaluru', 'Chennai', 'Mumbai', 'Pune'] as const

const KEY = 'visitnow:location'

export function getSavedLocation(): string {
  try {
    return localStorage.getItem(KEY) ?? 'Hyderabad'
  } catch {
    return 'Hyderabad'
  }
}

export function LocationBar({ onChange }: { onChange?: (city: string) => void }) {
  const [city, setCity] = useState(getSavedLocation)
  const [open, setOpen] = useState(false)

  const select = (c: string) => {
    setCity(c)
    try {
      localStorage.setItem(KEY, c)
    } catch {
      // Non-fatal — the UI still updates for this session.
    }
    onChange?.(c)
    setOpen(false)
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--color-text)]">
        <MapPin size={15} className="text-[var(--color-brand-600)]" aria-hidden="true" />
        {city}
        <span className="text-[var(--color-text-faint)]">· Change</span>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-t-[var(--radius-xl)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-lg)] sm:rounded-[var(--radius-xl)]"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[var(--color-text)]">Choose location</h2>
                <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1 text-[var(--color-text-faint)] hover:bg-[var(--color-border)]/60">
                  <X size={16} />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {CITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => select(c)}
                    className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-brand-50)]"
                  >
                    {c}
                    {c === city && <Check size={16} className="text-[var(--color-brand-600)]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
