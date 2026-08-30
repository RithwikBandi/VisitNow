import { useNavigate } from 'react-router-dom'
import type { SessionWithRelations } from '../../lib/types'

function dayLabel(dateStr: string): { top: string; bottom: string } {
  const date = new Date(`${dateStr}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86_400_000)

  if (diffDays === 0) return { top: 'Today', bottom: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }
  if (diffDays === 1) return { top: 'Tomorrow', bottom: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }
  return {
    top: date.toLocaleDateString('en-IN', { weekday: 'short' }),
    bottom: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }
}

/**
 * Lets a patient switch which day's session they're looking at — real
 * dates, each backed by an actual Session record (see
 * docs/VISITNOW_PRODUCT_DECISIONS.md), not a decorative row with every
 * day but "today" disabled. Only rendered when a doctor actually has
 * more than one date's session at this clinic/slot to switch between.
 *
 * Navigates with `replace: true` — this is switching which date of the
 * *same* doctor/clinic/slot you're looking at, not drilling into a new
 * page, so it shouldn't push a history entry. Without this, Today →
 * Tomorrow → Back landed back on Today instead of wherever the patient
 * actually came from (Doctor/Clinic/Home) — exactly the navigation bug
 * the rebuild brief calls out by name. See docs/VISITNOW_PRODUCT_DECISIONS.md §21.
 */
export function DateStrip({ sessions, activeSessionId }: { sessions: SessionWithRelations[]; activeSessionId: string }) {
  const navigate = useNavigate()
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto">
      {sorted.map((s) => {
        const { top, bottom } = dayLabel(s.date)
        const active = s.id === activeSessionId
        return (
          <button
            key={s.id}
            onClick={() => navigate(`/sessions/${s.id}`, { replace: true })}
            className={`press-scale flex shrink-0 flex-col items-center rounded-[var(--radius-btn)] border-2 px-4 py-2 ${
              active
                ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-brand-300)]'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wide">{top}</span>
            <span className="text-sm font-bold">{bottom}</span>
          </button>
        )
      })}
    </div>
  )
}
