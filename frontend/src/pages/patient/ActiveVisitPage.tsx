import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Badge, DoctorStatusLine } from '../../components/ui/Badge'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchQueueEntry } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import type { QueueStatus } from '../../lib/types'

/** The most important patient screen in the product (brief §15) — a
 * patient will have this open, minimized, and reopened many times while
 * they wait somewhere else entirely. Polls every 3s so "the queue just
 * moved" reads as live without holding a socket open (see usePolling's
 * docstring) — the actual proof of the whole "skip the wait" promise. */
const POLL_MS = 3_000

export function ActiveVisitPage() {
  const { entryId } = useParams<{ entryId: string }>()
  const fetcher = useCallback(() => fetchQueueEntry(entryId!), [entryId])
  const { data, loading, error } = usePolling(fetcher, POLL_MS)

  if (loading && !data) {
    return <div className="mt-6 h-[32rem] animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-border)]/40" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const { entry, session, doctor, clinic, patientsAhead, estimatedMinutes } = data
  const youAreNext = entry.status === 'waiting' && patientsAhead === 0

  return (
    <div className="animate-rise-in flex flex-col gap-5 pt-2">
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--color-text)]">{doctor.name}</p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {clinic.name} · {session.label} · {session.startTime}–{session.endTime}
        </p>
      </div>

      <div
        className={`flex flex-col items-center gap-4 rounded-[var(--radius-xl)] border p-7 text-center shadow-[var(--shadow-md)] transition-colors ${
          youAreNext || entry.status === 'called'
            ? 'border-[var(--color-brand-300)] bg-[var(--color-brand-50)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface)]'
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-faint)]">Your token</p>
        <p key={entry.tokenNumber} className="animate-count-pulse font-display text-[76px] font-bold leading-none text-[var(--color-brand-700)]">
          {entry.tokenNumber}
        </p>
        <StatusHero status={entry.status} patientsAhead={patientsAhead} estimatedMinutes={estimatedMinutes} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Now serving" value={session.currentToken ?? '—'} />
        <StatCard label="Patients ahead" value={entry.status === 'waiting' ? patientsAhead : '—'} />
      </div>

      <div className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-3">
        <DoctorStatusLine status={session.doctorStatus} delayMinutes={session.delayMinutes} />
      </div>

      {entry.verificationCode && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Your visit</p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--color-text)]">Token #{entry.tokenNumber}</p>

          <div className="mt-3 flex justify-center gap-2">
            {entry.verificationCode.split('').map((digit, i) => (
              <span
                key={i}
                className="flex h-10 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-50)] font-display text-lg font-bold text-[var(--color-brand-700)]"
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
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
      <p key={value} className="animate-count-pulse mt-1 font-display text-2xl font-bold text-[var(--color-text)]">
        {value}
      </p>
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-bg)] px-4 py-1.5 text-sm font-bold text-[var(--color-success)]">
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
        You were skipped — check in with the reception desk to be re-added to the queue.
      </p>
    )
  }
  if (status === 'no_show' || status === 'cancelled') {
    return <p className="text-sm font-semibold text-[var(--color-text-faint)]">This token is no longer active.</p>
  }
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
