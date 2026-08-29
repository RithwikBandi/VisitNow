import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DoctorCard } from '../../components/patient/DoctorCard'
import { SpecialtyFilter } from '../../components/patient/SpecialtyFilter'
import { fetchTodaysSessions } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import type { SessionWithRelations } from '../../lib/types'

type SortMode = 'available' | 'alphabetical'

function isLive(s: SessionWithRelations): boolean {
  return s.isQueueOpen && s.doctorStatus !== 'closed'
}

export function HomePage() {
  const { data, loading, error } = usePolling(fetchTodaysSessions, 15_000)
  const [query, setQuery] = useState('')
  const [specialty, setSpecialty] = useState<string | null>(null)
  const [sort, setSort] = useState<SortMode>('available')

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
    <div className="animate-rise-in flex flex-col gap-6">
      <div className="pt-4 sm:pt-8">
        <h1 className="font-display text-[32px] font-semibold leading-[1.15] tracking-tight text-[var(--color-text)] sm:text-[40px]">
          Get your token remotely.
          <br />
          Arrive closer to your turn.
        </h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[var(--color-text-muted)]">
          Join a doctor's queue from wherever you are, watch it move in real time, and head to the clinic once
          you're actually close to being seen.
        </p>
      </div>

      <label className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-sm)] transition-colors focus-within:border-[var(--color-brand-400)]">
        <Search size={17} className="shrink-0 text-[var(--color-text-faint)]" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by doctor, specialty, or clinic"
          className="w-full min-w-0 bg-transparent text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
        />
      </label>

      <SpecialtyFilter specialties={specialties} active={specialty} onChange={setSpecialty} />

      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-[var(--color-text-faint)]">
          {filtered.length} {filtered.length === 1 ? 'doctor' : 'doctors'} today
        </p>
        <div className="flex items-center gap-1 rounded-full bg-[var(--color-border)]/50 p-1">
          <SortButton label="Available first" active={sort === 'available'} onClick={() => setSort('available')} />
          <SortButton label="A–Z" active={sort === 'alphabetical'} onClick={() => setSort('alphabetical')} />
        </div>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
