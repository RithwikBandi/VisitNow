import { CalendarClock, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState'
import { PriorityBadge, SourceBadge, StatusBadge } from '../../components/ui/Badge'
import { fetchQueueEntry } from '../../lib/api'
import { getMyVisitIds } from '../../lib/myVisits'
import type { Clinic, Doctor, QueueEntry } from '../../lib/types'

type Tab = 'active' | 'upcoming' | 'completed' | 'cancelled'
const TABS: { id: Tab; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

interface VisitRow {
  entry: QueueEntry
  doctor: Doctor
  clinic: Clinic
}

function tabFor(status: QueueEntry['status']): Tab {
  if (status === 'waiting' || status === 'called' || status === 'in_progress') return 'active'
  if (status === 'completed') return 'completed'
  return 'cancelled' // cancelled, skipped, no_show
}

/**
 * "Which visits are mine" comes from a local id list (see lib/myVisits.ts)
 * but every visit's actual data shown here is fetched fresh — this is
 * never a cache of stale local state pretending to be current. The
 * Upcoming tab is intentionally always empty in this prototype: it's
 * reserved for scheduled appointments, and appointment booking isn't
 * part of this patient rebuild (see docs/VISITNOW_PRODUCT_DECISIONS.md
 * §1/§7 — token-first is the whole point) — an honest empty state
 * beats a fabricated one.
 */
export function VisitsPage() {
  const [tab, setTab] = useState<Tab>('active')
  const [rows, setRows] = useState<VisitRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const ids = getMyVisitIds()
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const { entry, doctor, clinic } = await fetchQueueEntry(id)
            return { entry, doctor, clinic }
          } catch {
            return null
          }
        }),
      )
      if (!cancelled) setRows(results.filter((r): r is VisitRow => r !== null))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = (rows ?? []).filter((r) => tabFor(r.entry.status) === tab)

  return (
    <div className="animate-rise-in mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="font-display text-2xl font-bold text-[var(--color-text)]">My Visits</h1>

      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
              tab === t.id ? 'bg-[var(--color-brand-600)] text-white' : 'bg-[var(--color-border)]/60 text-[var(--color-text-muted)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rows === null && (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-border)]/40" />
          ))}
        </div>
      )}

      {rows !== null && tab === 'upcoming' && (
        <EmptyState
          icon={CalendarClock}
          title="No upcoming appointments"
          description="VisitNow is token-first — scheduled appointments (where a clinic supports them) will appear here."
        />
      )}

      {rows !== null && tab !== 'upcoming' && filtered.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          title={`No ${tab} visits`}
          description={tab === 'active' ? 'Get a token from Home to see it here, live.' : 'Nothing here yet.'}
        />
      )}

      {filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map(({ entry, doctor, clinic }) => (
            <Link
              key={entry.id}
              to={tabFor(entry.status) === 'active' ? `/queue/${entry.id}` : `/queue/${entry.id}/confirmed`}
              className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-brand-300)] hover:bg-[var(--color-brand-50)]/40"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--color-border)]">
                {doctor.photoUrl && <img src={doctor.photoUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--color-text)]">{doctor.name}</p>
                <p className="truncate text-xs text-[var(--color-text-muted)]">{clinic.name}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="font-display text-sm font-bold text-[var(--color-brand-700)]">#{entry.tokenNumber}</span>
                  <SourceBadge source={entry.source} />
                  <PriorityBadge priority={entry.priority} />
                  <StatusBadge status={entry.status} />
                </div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-[var(--color-text-faint)]" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
