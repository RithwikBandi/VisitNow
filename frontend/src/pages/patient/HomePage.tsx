import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SessionCard } from '../../components/patient/SessionCard'
import { fetchTodaysSessions } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'

export function HomePage() {
  const { data, loading, error } = usePolling(fetchTodaysSessions, 15_000)
  const [query, setQuery] = useState('')

  const sessions = data?.sessions ?? []
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter(
      (s) =>
        s.doctor.name.toLowerCase().includes(q) ||
        s.doctor.specialty.toLowerCase().includes(q) ||
        s.clinic.name.toLowerCase().includes(q),
    )
  }, [sessions, query])

  const live = filtered.filter((s) => s.isQueueOpen && s.doctorStatus !== 'closed')
  const rest = filtered.filter((s) => !(s.isQueueOpen && s.doctorStatus !== 'closed'))

  return (
    <div className="animate-rise-in flex flex-col gap-8">
      <div className="pt-4 sm:pt-8">
        <h1 className="font-display text-[34px] font-semibold leading-[1.15] tracking-tight text-[var(--color-text)] sm:text-[42px]">
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

      {loading && !data && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-border)]/40" />
          ))}
        </div>
      )}

      {error && !data && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      {live.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
            Live now — join today
          </h2>
          <div className="flex flex-col gap-3">
            {live.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
            {live.length > 0 ? 'Other sessions today' : 'Today'}
          </h2>
          <div className="flex flex-col gap-3">
            {rest.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {data && filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-[var(--color-text-faint)]">No doctors match "{query}" today.</p>
      )}
    </div>
  )
}
