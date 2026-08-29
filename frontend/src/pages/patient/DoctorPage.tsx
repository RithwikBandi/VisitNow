import { Building2 } from 'lucide-react'
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { BackLink } from '../../components/patient/BackLink'
import { DoctorCard } from '../../components/patient/DoctorCard'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchDoctor } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { dedupeByDoctorClinicSlot } from '../../lib/sessions'

export function DoctorPage() {
  const { doctorId } = useParams<{ doctorId: string }>()
  const fetcher = useCallback(() => fetchDoctor(doctorId!), [doctorId])
  const { data, loading, error } = usePolling(fetcher, 15_000, doctorId)

  if (loading && !data) {
    return <div className="mt-4 h-64 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-border)]/40" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const { doctor } = data
  const sessions = dedupeByDoctorClinicSlot(data.sessions)
  const clinicCount = new Set(sessions.map((s) => s.clinicId)).size

  return (
    <div className="animate-rise-in mx-auto flex max-w-5xl flex-col gap-8">
      <BackLink />

      <div className="flex items-center gap-5">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-[var(--color-border)] shadow-[var(--shadow-sm)] sm:h-28 sm:w-28">
          {doctor.photoUrl && <img src={doctor.photoUrl} alt="" className="h-full w-full object-cover" />}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-600)]">{doctor.specialty}</p>
          <h1 className="mt-0.5 font-display text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-3xl">
            {doctor.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{doctor.qualifications}</p>
        </div>
      </div>

      {/* Every doctor's clinic(s) shown as their own explicit, labeled
          section — a doctor who sees patients at more than one clinic
          (the brief's central "sessions, not doctors, own queues"
          point) needs that to read clearly, not be implied only by a
          clinic name printed in small text on each card. */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
          <Building2 size={13} aria-hidden="true" />
          {clinicCount > 1 ? `Practices at ${clinicCount} clinics` : 'Practices at'}
        </h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-[var(--color-text-faint)]">No sessions scheduled today.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {sessions.map((s) => (
              <DoctorCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>

      {clinicCount > 1 && (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-brand-50)] px-4 py-3 text-[13px] leading-relaxed text-[var(--color-brand-700)]">
          {doctor.name} sees patients at more than one clinic today — each session runs its own independent queue,
          so pick the one you actually want to join.
        </p>
      )}
    </div>
  )
}
