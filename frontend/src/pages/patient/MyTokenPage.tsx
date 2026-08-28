import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { DoctorStatusLine } from '../../components/ui/Badge'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchQueueEntry } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import type { QueueStatus } from '../../lib/types'

/** Polls every 3s — fast enough that "the queue just moved" reads as
 * live during a demo, without hammering the (in-memory, single-process)
 * backend. See usePolling's docstring for why this is polling and not a
 * socket. */
const POLL_MS = 3_000

export function MyTokenPage() {
  const { entryId } = useParams<{ entryId: string }>()
  const fetcher = useCallback(() => fetchQueueEntry(entryId!), [entryId])
  const { data, loading, error } = usePolling(fetcher, POLL_MS)

  if (loading && !data) {
    return <div className="mt-8 h-96 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-border)]/40" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const { entry, session, patientsAhead, estimatedMinutes } = data
  const youAreNext = entry.status === 'waiting' && patientsAhead === 0

  return (
    <div className="animate-rise-in flex flex-col gap-6 pt-4">
      <div className="text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          Token for {session.label} · {session.startTime}–{session.endTime}
        </p>
      </div>

      <div
        className={`flex flex-col items-center gap-5 rounded-[var(--radius-xl)] border p-8 text-center shadow-[var(--shadow-md)] transition-colors sm:p-12 ${
          youAreNext || entry.status === 'called'
            ? 'border-[var(--color-brand-300)] bg-[var(--color-brand-50)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface)]'
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-faint)]">Your token</p>
        <p key={entry.tokenNumber} className="animate-count-pulse font-display text-[92px] font-semibold leading-none text-[var(--color-brand-700)]">
          {entry.tokenNumber}
        </p>

        <StatusHero status={entry.status} patientsAhead={patientsAhead} estimatedMinutes={estimatedMinutes} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">Now serving</p>
          <p key={session.currentToken ?? 'none'} className="animate-count-pulse mt-1 font-display text-2xl font-semibold text-[var(--color-text)]">
            {session.currentToken ?? '—'}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">Patients ahead</p>
          <p key={patientsAhead} className="animate-count-pulse mt-1 font-display text-2xl font-semibold text-[var(--color-text)]">
            {entry.status === 'waiting' ? patientsAhead : '—'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-3">
        <DoctorStatusLine status={session.doctorStatus} delayMinutes={session.delayMinutes} />
      </div>
    </div>
  )
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-600)] px-4 py-1.5 text-sm font-bold text-white">
          <CheckCircle2 size={15} aria-hidden="true" /> You've been called
        </span>
        <p className="text-sm text-[var(--color-text-muted)]">Please head to the doctor's room now.</p>
      </div>
    )
  }
  if (status === 'in_progress') {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-bg)] px-4 py-1.5 text-sm font-bold text-[var(--color-success)]">
          <Circle size={10} className="fill-current" aria-hidden="true" /> With the doctor
        </span>
      </div>
    )
  }
  if (status === 'completed') {
    return <p className="text-sm font-semibold text-[var(--color-text-muted)]">Visit completed. Take care!</p>
  }
  if (status === 'skipped') {
    return (
      <p className="text-sm font-semibold text-[var(--color-danger)]">
        You were skipped — check in with the reception desk to be re-added to the queue.
      </p>
    )
  }
  if (status === 'no_show' || status === 'cancelled') {
    return <p className="text-sm font-semibold text-[var(--color-text-faint)]">This token is no longer active.</p>
  }

  // waiting
  if (patientsAhead === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-600)] px-4 py-1.5 text-sm font-bold text-white">
        You're next — please be ready
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
