import { ArrowRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClinicCard } from '../../components/patient/ClinicCard'
import { DoctorCard } from '../../components/patient/DoctorCard'
import { SpecialtyFilter } from '../../components/patient/SpecialtyFilter'
import { SplitFlapNumber } from '../../components/ui/SplitFlapNumber'
import { fetchClinics, fetchQueueEntry, fetchTodaysSessions } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { getPatientIdentity } from '../../lib/patientIdentity'
import { getMyVisitIds } from '../../lib/myVisits'
import { useSelectedCity } from './LocationPicker'
import type { QueueEntry, SessionWithRelations } from '../../lib/types'

type SortMode = 'available' | 'alphabetical'

const ACTIVE_STATUSES = ['waiting', 'called', 'in_progress']

function isLive(s: SessionWithRelations): boolean {
  return s.isQueueOpen && s.doctorStatus !== 'closed'
}

/** Checks the most recent handful of the guest's own visit ids for one
 * that's still active, so Home can surface it prominently. */
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

/**
 * The discovery home — real desktop-website density (a wide clinics
 * row, a multi-column doctor grid), not a phone screenshot. The active-
 * visit banner is a proper ticket stub (docs/DESIGN.md), not a plain
 * colored bar, and the greeting reads as a page opener, not a caption
 * above a search box.
 */
export function HomePage() {
  const { data, loading, error } = usePolling(fetchTodaysSessions, 15_000)
  const { data: clinicsData } = usePolling(fetchClinics, 60_000)
  const [query, setQuery] = useState('')
  const [specialty, setSpecialty] = useState<string | null>(null)
  const [sort, setSort] = useState<SortMode>('available')
  const identity = getPatientIdentity()
  const activeVisit = useActiveVisitBanner()
  const city = useSelectedCity()

  const allSessions = data?.sessions ?? []
  const sessions = useMemo(() => allSessions.filter((s) => s.clinic.city === city), [allSessions, city])
  const cityClinics = useMemo(() => (clinicsData?.clinics ?? []).filter((c) => c.city === city), [clinicsData, city])
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
  const liveNowCount = sessions.filter(isLive).length

  return (
    <div className="animate-rise-in flex flex-col gap-9">
      {/* A page opener, not a caption — the same "here's what's true
          right now" energy as the landing page's departure board,
          scaled down to one line for a returning visitor. */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-[var(--color-text-muted)]">Good day, {identity?.name?.split(' ')[0] ?? 'there'} 👋</p>
        <h1 className="font-display text-[32px] font-black leading-[1.05] tracking-[-0.022em] text-[var(--color-text)] sm:text-[42px]">
          Skip the wait.
        </h1>
        <p className="mt-0.5 max-w-lg text-[15px] text-[var(--color-text-muted)]">
          {liveNowCount > 0
            ? `${liveNowCount} ${liveNowCount === 1 ? 'queue is' : 'queues are'} moving in ${city} right now.`
            : `Get your token remotely and track the queue in ${city} until it's your turn.`}
        </p>
      </div>

      {activeVisit && (
        <Link
          to={`/queue/${activeVisit.id}`}
          className="ticket-card group flex items-stretch overflow-hidden bg-[var(--color-ink)] text-white transition-transform hover:-translate-y-0.5"
        >
          <div className="flex flex-1 items-center justify-between gap-4 px-6 py-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/50">Active visit</p>
              <p className="mt-1 font-display text-lg font-bold">Track your live queue</p>
              <p className="mt-0.5 text-[13px] text-white/50">Tap to see how close you are</p>
            </div>
            <ArrowRight size={20} className="shrink-0 text-white/60 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </div>
          <div className="relative flex shrink-0 items-center border-l border-dashed border-white/15 px-6">
            <span aria-hidden="true" className="absolute -left-[10px] -top-[10px] h-5 w-5 rounded-full bg-[var(--color-bg)]" />
            <span aria-hidden="true" className="absolute -left-[10px] -bottom-[10px] h-5 w-5 rounded-full bg-[var(--color-bg)]" />
            <SplitFlapNumber value={activeVisit.tokenNumber} minDigits={2} className="font-display text-4xl font-black text-[var(--color-accent-400)]" />
          </div>
        </Link>
      )}

      <label className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3.5 shadow-[var(--shadow-sm)] transition-colors focus-within:border-[var(--color-brand-400)] sm:max-w-xl">
        <Search size={17} className="shrink-0 text-[var(--color-text-faint)]" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search doctor, specialty, or clinic"
          className="w-full min-w-0 bg-transparent text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
        />
      </label>

      {cityClinics.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">Clinics in {city}</h2>
            <Link to="/clinics" className="press-scale text-[13px] font-bold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">
              View all
            </Link>
          </div>
          <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
            {cityClinics.map((clinic) => (
              <div key={clinic.id} className="w-64 shrink-0">
                <ClinicCard clinic={clinic} />
              </div>
            ))}
          </div>
        </section>
      )}

      {clinicsData && cityClinics.length === 0 && (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-5 py-6 text-center">
          <p className="text-sm font-semibold text-[var(--color-text)]">VisitNow hasn't launched in {city} yet</p>
          <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
            We're live in Hyderabad, Warangal, and Bengaluru today. Change your location above to browse those.
          </p>
        </div>
      )}

      <SpecialtyFilter specialties={specialties} active={specialty} onChange={setSpecialty} />

      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-[var(--color-text-faint)]">
          {filtered.length} {filtered.length === 1 ? 'doctor' : 'doctors'} nearby
        </p>
        <div className="flex items-center gap-1 rounded-[var(--radius-btn)] bg-[var(--color-surface-sunken)] p-1">
          <SortButton label="Available first" active={sort === 'available'} onClick={() => setSort('available')} />
          <SortButton label="A–Z" active={sort === 'alphabetical'} onClick={() => setSort('alphabetical')} />
        </div>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />
          ))}
        </div>
      )}

      {error && !data && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      {live.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent-500)]" aria-hidden="true" />
            Live now: join today
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {live.map((s) => (
              <DoctorCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">
            {live.length > 0 ? 'Other sessions today' : 'Today'}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rest.map((s) => (
              <DoctorCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {data && filtered.length === 0 && sessions.length > 0 && (
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
      className={`press-scale rounded-[var(--radius-sm)] px-3 py-1.5 text-[12px] font-bold ${
        active ? 'bg-[var(--color-surface)] text-[var(--color-brand-700)] shadow-sm' : 'text-[var(--color-text-faint)] hover:text-[var(--color-text)]'
      }`}
    >
      {label}
    </button>
  )
}
