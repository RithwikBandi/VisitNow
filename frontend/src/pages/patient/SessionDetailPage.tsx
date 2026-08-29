import { ArrowRight, MapPin } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackLink } from '../../components/patient/BackLink'
import { DateStrip } from '../../components/patient/DateStrip'
import { Button } from '../../components/ui/Button'
import { DoctorStatusLine } from '../../components/ui/Badge'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchDoctor, fetchQueue, fetchSession } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import type { SessionWithRelations } from '../../lib/types'

/**
 * Doctor + clinic + session, with **Get Token** as the one dominant
 * action — no equal-weight "Book Appointment" button sitting next to it
 * (see docs/VISITNOW_PRODUCT_DECISIONS.md §1: this app is token-first,
 * not appointment-first). Tapping it goes to the fee/payment step
 * (TokenPaymentPage), not straight to a token — a real token now always
 * has a payment decision attached to it.
 */
export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const sessionFetcher = useCallback(() => fetchSession(sessionId!), [sessionId])
  const queueFetcher = useCallback(() => fetchQueue(sessionId!), [sessionId])
  const { data: sessionData, loading, error } = usePolling(sessionFetcher, 5_000, sessionId)
  const { data: queueData } = usePolling(queueFetcher, 5_000, sessionId)

  // Sibling dates for this exact doctor+clinic+slot — fetched once
  // (not polled; which future dates exist doesn't change minute to
  // minute the way queue state does) as soon as we know the doctor.
  const [sameSlotDates, setSameSlotDates] = useState<SessionWithRelations[]>([])
  useEffect(() => {
    if (!sessionData) return
    let cancelled = false
    fetchDoctor(sessionData.doctor.id)
      .then(({ sessions }) => {
        if (cancelled) return
        setSameSlotDates(sessions.filter((s) => s.clinicId === sessionData.session.clinicId && s.label === sessionData.session.label))
      })
      .catch(() => {
        // Non-critical — the date strip just won't render if this fails.
      })
    return () => {
      cancelled = true
    }
  }, [sessionData])

  if (loading && !sessionData) {
    return <div className="mt-6 h-72 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-border)]/40" />
  }
  if (error && !sessionData) return <ErrorState message={error} />
  if (!sessionData) return null

  const { session, doctor, clinic } = sessionData
  const waitingCount = queueData?.entries.filter((e) => e.status === 'waiting').length ?? 0
  const canGetToken = session.doctorStatus !== 'closed'
  const isToday = session.date === new Date().toISOString().slice(0, 10)

  return (
    <div className="animate-rise-in mx-auto flex max-w-xl flex-col gap-6">
      <BackLink />

      {/* No overlapping-avatar trick here — it collided with this
          banner's own caption text (both wanted the same bottom-left
          corner). Banner is purely the clinic photo; everything else
          lives in normal document flow below it. */}
      <div className="h-36 w-full overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-border)] sm:h-48">
        {clinic.photoUrl && <img src={clinic.photoUrl} alt="" className="h-full w-full object-cover" />}
      </div>

      <div className="flex items-center gap-3.5">
        <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full bg-[var(--color-border)] shadow-[var(--shadow-sm)] sm:h-[88px] sm:w-[88px]">
          {doctor.photoUrl && <img src={doctor.photoUrl} alt="" className="h-full w-full object-cover" />}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-600)]">{doctor.specialty}</p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-3xl">{doctor.name}</h1>
          <p className="mt-0.5 flex items-center gap-1 text-[13px] text-[var(--color-text-muted)]">
            <MapPin size={12} className="shrink-0" aria-hidden="true" />
            {clinic.name} · {clinic.location}
          </p>
        </div>
      </div>

      <div className="px-1">
        <p className="text-sm text-[var(--color-text-muted)]">
          {session.label} · {session.startTime}–{session.endTime}
        </p>
        <div className="mt-2">
          <DoctorStatusLine status={session.doctorStatus} delayMinutes={session.delayMinutes} />
        </div>
      </div>

      {sameSlotDates.length > 1 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">Select date</p>
          <DateStrip sessions={sameSlotDates} activeSessionId={session.id} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatBlock label="Now serving" value={session.isQueueOpen ? (session.currentToken ?? '—') : '—'} />
        <StatBlock label="Waiting" value={session.isQueueOpen ? waitingCount : '—'} />
        <StatBlock label="Token fee" value={`₹${session.hospitalFeeAmount}`} />
      </div>

      {!session.isQueueOpen && session.doctorStatus !== 'closed' && (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-brand-50)] px-4 py-3 text-sm text-[var(--color-brand-700)]">
          {isToday
            ? `This session opens at ${session.startTime}. Get your token now to hold your place in line.`
            : `This session is on ${new Date(`${session.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}. Get your token now to hold your place.`}
        </p>
      )}

      <div className="sticky bottom-4">
        <Button
          size="lg"
          className="w-full"
          disabled={!canGetToken}
          onClick={() => navigate(`/sessions/${session.id}/token`)}
        >
          {canGetToken ? 'Get Token' : 'Session closed'}
          {canGetToken && <ArrowRight size={17} aria-hidden="true" />}
        </Button>
        {canGetToken && (
          <p className="mt-2 text-center text-xs text-[var(--color-text-faint)]">
            No need to visit the clinic just to join the queue.
          </p>
        )}
      </div>
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-[var(--color-text)]">{value}</p>
    </div>
  )
}
