import { ExternalLink, MapPin, MapPinned } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { BackLink } from '../../components/patient/BackLink'
import { DoctorCard } from '../../components/patient/DoctorCard'
import { Button } from '../../components/ui/Button'
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
          <h1 className="font-display text-[26px] font-black leading-[1.05] tracking-[-0.022em] text-white sm:text-[34px]">{clinic.name}</h1>
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

      {/* Location comes last — a patient wants "which doctors, is there
          a queue" before "where exactly is this on a map." A live
          Google embed is the enhancement, not the guarantee: it's a
          third-party iframe with no API key, which plenty of real
          browsers (ad blockers, Brave, Safari tracking prevention) will
          silently refuse to render — that shouldn't mean the location
          just disappears. The address card on the left is the reliable
          floor; the map is a bonus if it loads. */}
      <div>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">Location</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col justify-between gap-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)]">
                <MapPinned size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">{clinic.location}</p>
                <p className="text-[13px] text-[var(--color-text-muted)]">{clinic.city}</p>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${clinic.location}, ${clinic.city}`)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="secondary" size="sm" className="w-full">
                Open in Google Maps
                <ExternalLink size={14} aria-hidden="true" />
              </Button>
            </a>
          </div>

          <ClinicMapEmbed location={clinic.location} city={clinic.city} />
        </div>
      </div>
    </div>
  )
}

/** The map is a progressive enhancement, not a guarantee — see the
 * comment above its call site. A subtle static background sits behind
 * the iframe at all times, so even if the iframe itself renders blank
 * (blocked by an ad blocker or tracking-prevention browser setting),
 * the box still reads as an intentional "map area," not empty space. */
function ClinicMapEmbed({ location, city }: { location: string; city: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="relative h-56 w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] sm:h-auto sm:min-h-[13rem]">
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--color-text-faint)]">
          <MapPin size={20} aria-hidden="true" />
          <p className="text-[12px] font-semibold">Loading map…</p>
        </div>
      )}
      <iframe
        title={`Map showing ${location}, ${city}`}
        src={`https://www.google.com/maps?q=${encodeURIComponent(`${location}, ${city}`)}&output=embed`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className="relative h-full w-full border-0"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}
