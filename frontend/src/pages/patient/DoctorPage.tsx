import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { SessionCard } from '../../components/patient/SessionCard'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchDoctor } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'

export function DoctorPage() {
  const { doctorId } = useParams<{ doctorId: string }>()
  const fetcher = useCallback(() => fetchDoctor(doctorId!), [doctorId])
  const { data, loading, error } = usePolling(fetcher, 15_000)

  if (loading && !data) {
    return <div className="mt-8 h-40 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-border)]/40" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const { doctor, sessions } = data
  const today = sessions.filter((s) => s.doctorStatus !== 'closed' || s.isQueueOpen)

  return (
    <div className="animate-rise-in flex flex-col gap-8 pt-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-600)]">{doctor.specialty}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-[var(--color-text)]">{doctor.name}</h1>
        <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{doctor.qualifications}</p>
      </div>

      <div>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
          Sessions today
        </h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-[var(--color-text-faint)]">No sessions scheduled today.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>

      {today.length > 1 && (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-brand-50)] px-4 py-3 text-[13px] leading-relaxed text-[var(--color-brand-700)]">
          {doctor.name} sees patients at more than one clinic today — each session runs its own independent queue,
          so pick the one you actually want to join.
        </p>
      )}
    </div>
  )
}
