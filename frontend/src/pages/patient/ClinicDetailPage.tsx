import { MapPin } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { BackLink } from '../../components/patient/BackLink'
import { DoctorCard } from '../../components/patient/DoctorCard'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchClinic } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { dedupeByDoctorClinicSlot } from '../../lib/sessions'

/** A clinic's own page — photo banner, address, the specialties
 * available there ("departments," in the reference workflow's
 * language), and every doctor who practices there today. Restores the
 * clinic → doctors path the previous pass wrongly dropped. */
export function ClinicDetailPage() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const fetcher = useCallback(() => fetchClinic(clinicId!), [clinicId])
  const { data, loading, error } = usePolling(fetcher, 15_000, clinicId)

  const specialties = useMemo(() => [...new Set((data?.sessions ?? []).map((s) => s.doctor.specialty))].sort(), [data])

  if (loading && !data) {
    return <div className="mt-4 h-96 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-border)]/40" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const { clinic } = data
  const sessions = dedupeByDoctorClinicSlot(data.sessions)

  return (
    <div className="animate-rise-in flex flex-col gap-6">
      <BackLink label="All clinics" />

      <div className="relative h-48 w-full overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-border)] sm:h-64">
        {clinic.photoUrl && <img src={clinic.photoUrl} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{clinic.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
            <MapPin size={14} aria-hidden="true" />
            {clinic.location}, {clinic.city}
          </p>
        </div>
      </div>

      {specialties.length > 0 && (
        <div>
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">Departments</h2>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => (
              <span key={s} className="rounded-full bg-[var(--color-brand-50)] px-3 py-1.5 text-[13px] font-bold text-[var(--color-brand-700)]">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
          Doctors at this clinic ({sessions.length})
        </h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-[var(--color-text-faint)]">No sessions scheduled here today.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {sessions.map((s) => (
              <DoctorCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
