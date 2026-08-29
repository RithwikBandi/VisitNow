import { ArrowRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DoctorCard } from '../../components/patient/DoctorCard'
import { SpecialtyFilter } from '../../components/patient/SpecialtyFilter'
import { fetchQueueEntry, fetchTodaysSessions } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { getPatientIdentity } from '../../lib/patientIdentity'
import { getMyVisitIds } from '../../lib/myVisits'
import type { QueueEntry, SessionWithRelations } from '../../lib/types'
import { LocationBar } from './LocationPicker'

type SortMode = 'available' | 'alphabetical'

const ACTIVE_STATUSES = ['waiting', 'called', 'in_progress']

function isLive(s: SessionWithRelations): boolean {
  return s.isQueueOpen && s.doctorStatus !== 'closed'
}

/** Checks the most recent handful of the guest's own visit ids for one
 * that's still active, so Home can surface it prominently — the "your
 * active visit" banner is one of the strongest signals that VisitNow is
 * actually working, so it belongs at the very top of the app, not
 * buried in the Visits tab. Only checks a few, not the whole history,
 * since this runs on every Home load. */
function useActiveVisitBanner() {
  const [entry, setEntry] = useState<QueueEntry | null>(null)

  useEffect(() => {
    let cancelled = false
    const ids = getMyVisitIds().slice(0, 5)
    ;(async () => {
      for (const id of ids) {
        try {
          const { entry } = await fetchQueueEntry(id)
          if (ACTIVE_STATUSES.includes(entry.status)) {
            if (!cancelled) setEntry(entry)
            return
          }
        } catch {
          // A stale/deleted id — skip it silently, nothing to recover.
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return entry
}

export function HomePage() {
  const { data, loading, error } = usePolling(fetchTodaysSessions, 15_000)
  const [query, setQuery] = useState('')
  const [specialty, setSpecialty] = useState<string | null>(null)
  const [sort, setSort] = useState<SortMode>('available')
  const identity = getPatientIdentity()
  const activeVisit = useActiveVisitBanner()

  const sessions = data?.sessions ?? []
  const specialties = useMemo(() => [...new Set(sessions.map((s) => s.doctor.specialty))].sort(), [sessions])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = sessions
    if (specialty) list = list.filter((s) => s.doctor.specialty === specialty)
    if (q) {
      list = list.filter(
        (s) =>
          s.doctor.name.toLowerCase().includes(q) ||
          s.doctor.specialty.toLowerCase().includes(q) ||
          s.clinic.name.toLowerCase().includes(q),
      )
    }
    const sorted = [...list]
    if (sort === 'alphabetical') {
      sorted.sort((a, b) => a.doctor.name.localeCompare(b.doctor.name))
    } else {
      sorted.sort((a, b) => Number(isLive(b)) - Number(isLive(a)) || a.doctor.name.localeCompare(b.doctor.name))
    }
    return sorted
  }, [sessions, query, specialty, sort])

  const live = filtered.filter(isLive)
  const rest = filtered.filter((s) => !isLive(s))

  return (
    <div className="animate-rise-in flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-[var(--color-text-muted)]">
            Good day, {identity?.name?.split(' ')[0] ?? 'there'} 👋
          </p>
          <div className="mt-0.5">
            <LocationBar />
          </div>
        </div>
      </div>

      {activeVisit && (
        <Link
          to={`/queue/${activeVisit.id}`}
          className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-[var(--color-brand-600)] px-5 py-4 text-white shadow-[var(--shadow-md)]"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/70">Active visit</p>
            <p className="mt-0.5 font-display text-lg font-bold">Token #{activeVisit.tokenNumber} — track live queue</p>
          </div>
          <ArrowRight size={20} className="shrink-0" aria-hidden="true" />
        </Link>
      )}

      <div>
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight text-[var(--color-text)]">
          Skip the wait.
        </h1>
        <p className="mt-1 text-[14px] text-[var(--color-text-muted)]">
          Get your token remotely and track the queue until it's your turn.
        </p>
      </div>

      <label className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-sm)] transition-colors focus-within:border-[var(--color-brand-400)]">
        <Search size={17} className="shrink-0 text-[var(--color-text-faint)]" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search doctor, specialty, or clinic"
          className="w-full min-w-0 bg-transparent text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
        />
      </label>

      <SpecialtyFilter specialties={specialties} active={specialty} onChange={setSpecialty} />

      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-[var(--color-text-faint)]">
          {filtered.length} {filtered.length === 1 ? 'doctor' : 'doctors'} nearby
        </p>
        <div className="flex items-center gap-1 rounded-full bg-[var(--color-border)]/50 p-1">
          <SortButton label="Available first" active={sort === 'available'} onClick={() => setSort('available')} />
          <SortButton label="A–Z" active={sort === 'alphabetical'} onClick={() => setSort('alphabetical')} />
        </div>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-border)]/40" />
          ))}
        </div>
      )}

      {error && !data && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      {live.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
            Live now — join today
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {live.map((s) => (
              <DoctorCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
            {live.length > 0 ? 'Other sessions today' : 'Today'}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {rest.map((s) => (
              <DoctorCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {data && filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-[var(--color-text-faint)]">
          {query ? `No doctors match "${query}" today.` : 'No sessions found for this specialty today.'}
        </p>
      )}
    </div>
  )
}

function SortButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
        active ? 'bg-[var(--color-surface)] text-[var(--color-brand-700)] shadow-sm' : 'text-[var(--color-text-faint)] hover:text-[var(--color-text)]'
      }`}
    >
      {label}
    </button>
  )
}
