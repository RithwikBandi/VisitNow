import { CalendarClock, CheckCircle2, Circle, Clock, MapPin, Smartphone, XCircle } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BackLink } from '../../components/patient/BackLink'
import { Badge, DoctorStatusLine } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/ErrorState'
import { SplitFlapNumber } from '../../components/ui/SplitFlapNumber'
import { TicketCard } from '../../components/ui/TicketCard'
import { cancelEntry, fetchQueueEntry } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { futureDateLabel } from '../../lib/sessions'
import { ApiError, type QueueStatus } from '../../lib/types'

/** The most important patient screen in the product (brief §23) — a
 * patient will have this open, minimized, and reopened many times while
 * they wait somewhere else entirely. Polls every 3s so "the queue just
 * moved" reads as live without holding a socket open (see usePolling's
 * docstring). The token number is built on the same TicketCard/
 * SplitFlapNumber vocabulary as the rest of the product (docs/
 * DESIGN.md) — this screen is the whole reason those two components
 * exist, not an afterthought applying them. */
const POLL_MS = 3_000

export function ActiveVisitPage() {
  const { entryId } = useParams<{ entryId: string }>()
  const fetcher = useCallback(() => fetchQueueEntry(entryId!), [entryId])
  const { data, loading, error, refresh } = usePolling(fetcher, POLL_MS, entryId)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  if (loading && !data) {
    return <div className="mx-auto max-w-xl h-[34rem] animate-pulse rounded-[var(--radius-ticket)] bg-[var(--color-surface-sunken)]" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const { entry, session, doctor, clinic, patientsAhead, estimatedMinutes } = data
  const canCancel = entry.status === 'waiting'
  // A token booked ahead via SessionDetailPage's DateStrip (see
  // docs/VISITNOW_PRODUCT_DECISIONS.md §17) is a real `waiting` entry
  // exactly like a same-day one — but "3 patients ahead, ~12 min" is
  // meaningless and actively misleading for a queue that hasn't started
  // yet. Anything still `waiting` on a future date gets its own honest
  // "booked ahead" state instead of the live-tracking UI below.
  const isBookedAhead = entry.status === 'waiting' && session.date > new Date().toISOString().slice(0, 10)

  const confirmCancel = async () => {
    setCancelling(true)
    setCancelError(null)
    try {
      await cancelEntry(entry.id)
      setConfirmingCancel(false)
      refresh()
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : 'Could not cancel this visit. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  const stub = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 text-left">
        <p className="truncate text-[13.5px] font-bold text-[var(--color-text)]">{doctor.name}</p>
        <p className="truncate text-[12px] text-[var(--color-text-muted)]">
          {clinic.name} · {session.label} · {session.startTime}–{session.endTime}
          {isBookedAhead && ` · ${futureDateLabel(session.date)}`}
        </p>
      </div>
      <StatusPill status={entry.status} />
    </div>
  )

  return (
    <div className="animate-rise-in mx-auto grid max-w-4xl grid-cols-1 gap-8 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start">
    <div className="flex flex-col gap-5">
      <BackLink />

      <TicketCard stub={stub}>
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">Your token</p>
          <SplitFlapNumber
            value={entry.tokenNumber}
            minDigits={2}
            className="font-display text-[80px] font-black leading-none tracking-[-0.022em] text-[var(--color-brand-700)]"
          />

          {isBookedAhead ? (
            <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-badge)] bg-[var(--color-brand-50)] px-4 py-1.5 text-sm font-bold text-[var(--color-brand-700)]">
              <CalendarClock size={15} aria-hidden="true" />
              Booked for {futureDateLabel(session.date)}
            </span>
          ) : (
            <StatusHero status={entry.status} patientsAhead={patientsAhead} estimatedMinutes={estimatedMinutes} />
          )}
        </div>
      </TicketCard>

      {isBookedAhead ? (
        <p className="text-center text-sm text-[var(--color-text-muted)]">
          This session hasn't started yet, so there's no live queue position to show. Come back on{' '}
          {futureDateLabel(session.date)} to track it as the queue moves.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Now serving" value={session.currentToken ?? '—'} live={session.currentToken != null} />
            <StatCard
              label="Patients ahead"
              value={entry.status === 'waiting' ? patientsAhead : '—'}
              live={entry.status === 'waiting'}
            />
          </div>

          <div className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <DoctorStatusLine status={session.doctorStatus} delayMinutes={session.delayMinutes} />
          </div>
        </>
      )}

      {entry.verificationCode && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-faint)]">Your visit</p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--color-text)]">Token #{entry.tokenNumber}</p>

          <div className="mt-3 flex justify-center gap-2">
            {entry.verificationCode.split('').map((digit, i) => (
              <span
                key={i}
                className="tabular-nums flex h-10 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] font-display text-lg font-bold text-[var(--color-brand-700)]"
              >
                {digit}
              </span>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-sm">
            <span className="font-semibold text-[var(--color-text)]">Platform fee</span>
            <Badge tone="success">Paid</Badge>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-[var(--color-text)]">Clinic fee (₹{entry.hospitalFeeAmount})</span>
            <Badge tone={entry.hospitalFeeStatus === 'PAID' ? 'success' : 'warning'}>
              {entry.hospitalFeeStatus === 'PAID' ? 'Paid' : 'Pay at hospital'}
            </Badge>
          </div>
        </div>
      )}

      {canCancel && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          {!confirmingCancel ? (
            <button
              onClick={() => setConfirmingCancel(true)}
              className="press-scale flex w-full items-center justify-center gap-1.5 text-sm font-bold text-[var(--color-danger)] hover:text-[var(--color-danger)]/80"
            >
              <XCircle size={15} aria-hidden="true" />
              Cancel this visit
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-center text-sm font-semibold text-[var(--color-text)]">Cancel token #{entry.tokenNumber}?</p>
              <p className="text-center text-xs text-[var(--color-text-muted)]">This can't be undone. You'll lose your place in the queue.</p>
              {cancelError && <p className="text-center text-xs text-[var(--color-danger)]">{cancelError}</p>}
              <div className="mt-1 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setConfirmingCancel(false)} disabled={cancelling}>
                  Keep my token
                </Button>
                <Button variant="danger" size="sm" className="flex-1" onClick={confirmCancel} disabled={cancelling}>
                  {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>

      {/* Desktop-only sidebar — real content: clinic address (patients
          need this to actually walk in) and a plain-language recap of
          the product's own promise, not filler beside a narrow ticket. */}
      <aside className="hidden flex-col gap-5 lg:flex">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">Where to go</h2>
          <div className="mt-3 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)]">
              <MapPin size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-text)]">{clinic.name}</p>
              <p className="text-[13px] text-[var(--color-text-muted)]">{clinic.location}</p>
            </div>
          </div>
          <Link to={`/clinics/${clinic.id}`} className="press-scale mt-4 block text-center text-[13px] font-bold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]">
            View clinic details
          </Link>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
            <Smartphone size={13} aria-hidden="true" />
            While you wait
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            You don't need to stand in the waiting room. Keep this page open (or come back to it
            from Visits) and it updates on its own as the queue moves. Head over once you're a few
            tokens from being called.
          </p>
        </div>
      </aside>
    </div>
  )
}

function StatCard({ label, value, live }: { label: string; value: string | number; live: boolean }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-faint)]">{label}</p>
      {live && typeof value === 'number' ? (
        <SplitFlapNumber value={value} className="mt-1 font-display text-2xl font-black text-[var(--color-text)]" />
      ) : (
        <p className="tabular-nums mt-1 font-display text-2xl font-bold text-[var(--color-text)]">{value}</p>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: QueueStatus }) {
  if (status === 'waiting') return null
  const label = { called: 'Called', in_progress: 'With doctor', completed: 'Completed', skipped: 'Skipped', cancelled: 'Cancelled', no_show: 'No-show' }[status]
  return <Badge tone={status === 'in_progress' ? 'success' : status === 'called' ? 'warning' : 'neutral'}>{label}</Badge>
}

function StatusHero({
  status,
  patientsAhead,
  estimatedMinutes,
}: {
  status: QueueStatus
  patientsAhead: number
  estimatedMinutes: number
}) {
  if (status === 'called') {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-badge)] bg-[var(--color-brand-600)] px-4 py-1.5 text-sm font-bold text-white">
          <CheckCircle2 size={15} aria-hidden="true" /> You've been called
        </span>
        <p className="text-sm text-[var(--color-text-muted)]">Please head to the doctor's room now.</p>
      </div>
    )
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-badge)] bg-[var(--color-success-bg)] px-4 py-1.5 text-sm font-bold text-[var(--color-success)]">
        <Circle size={10} className="fill-current" aria-hidden="true" /> With the doctor
      </span>
    )
  }
  if (status === 'completed') {
    return <p className="text-sm font-semibold text-[var(--color-text-muted)]">Visit completed. Take care!</p>
  }
  if (status === 'skipped') {
    return (
      <p className="text-sm font-semibold text-[var(--color-danger)]">
        You were skipped. Check in with the reception desk to be re-added to the queue.
      </p>
    )
  }
  if (status === 'no_show' || status === 'cancelled') {
    return <p className="text-sm font-semibold text-[var(--color-text-faint)]">This token is no longer active.</p>
  }
  if (patientsAhead === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-badge)] bg-[var(--color-brand-600)] px-4 py-1.5 text-sm font-bold text-white">
        You're next, please be ready
      </span>
    )
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-[15px] font-semibold text-[var(--color-text)]">
        {patientsAhead} {patientsAhead === 1 ? 'patient' : 'patients'} ahead of you
      </p>
      <p className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <Clock size={14} aria-hidden="true" /> Estimated wait ~{estimatedMinutes} min
      </p>
    </div>
  )
}
