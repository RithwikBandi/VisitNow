import { CalendarClock, CheckCircle2 } from 'lucide-react'
import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackLink } from '../../components/patient/BackLink'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/ErrorState'
import { SplitFlapNumber } from '../../components/ui/SplitFlapNumber'
import { TicketCard } from '../../components/ui/TicketCard'
import { fetchQueueEntry } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { futureDateLabel } from '../../lib/sessions'

/** The one-time landing after a successful token + payment — separate
 * from Active Visit (which a patient will come back to repeatedly) per
 * the product brief's §31 vs §23. Its whole job is making the
 * verification code and what-you-paid unmistakably clear before moving
 * on to live tracking. */
export function TokenConfirmedPage() {
  const { entryId } = useParams<{ entryId: string }>()
  const navigate = useNavigate()
  const fetcher = useCallback(() => fetchQueueEntry(entryId!), [entryId])
  const { data, loading, error } = usePolling(fetcher, 30_000, entryId)

  if (loading && !data) {
    return <div className="mx-auto max-w-xl h-[30rem] animate-pulse rounded-[var(--radius-ticket)] bg-[var(--color-surface-sunken)]" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const { entry, session, patientsAhead } = data
  const code = entry.verificationCode ?? '----'
  // Same date-awareness as ActiveVisitPage (see its isBookedAhead
  // comment) — this landing page is reached by the identical booked-
  // ahead path, so it needs the identical honest framing.
  const isBookedAhead = session.date > new Date().toISOString().slice(0, 10)

  const stub = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-success-bg)] text-[var(--color-success)]">
        <CheckCircle2 size={16} aria-hidden="true" />
      </div>
      <p className="text-[13.5px] font-bold text-[var(--color-text)]">
        {isBookedAhead ? "You're booked ahead, no need to stand in line that day." : "You don't need to stand in the waiting queue."}
      </p>
    </div>
  )

  return (
    <div className="animate-rise-in mx-auto flex max-w-xl flex-col gap-6">
      <BackLink />

      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-[var(--color-text)]">Token confirmed</h1>
      </div>

      <TicketCard stub={stub}>
        <div className="flex flex-col items-center gap-5 text-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">Your token</p>
            <SplitFlapNumber
              value={entry.tokenNumber}
              minDigits={2}
              className="font-display text-[64px] font-black leading-none tracking-[-0.022em] text-[var(--color-brand-700)]"
            />
          </div>

          {isBookedAhead ? (
            <div className="flex items-center gap-1.5 rounded-[var(--radius-badge)] bg-[var(--color-brand-50)] px-4 py-1.5 text-sm font-bold text-[var(--color-brand-700)]">
              <CalendarClock size={15} aria-hidden="true" />
              Booked for {futureDateLabel(session.date)}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              {patientsAhead} {patientsAhead === 1 ? 'patient' : 'patients'} ahead of you right now
            </p>
          )}

          <div className="w-full border-t border-[var(--color-border)] pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-faint)]">Verification code</p>
            <div className="mt-2.5 flex justify-center gap-2">
              {code.split('').map((digit, i) => (
                <span
                  key={i}
                  className="tabular-nums flex h-12 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] font-display text-2xl font-bold text-[var(--color-brand-700)]"
                >
                  {digit}
                </span>
              ))}
            </div>
            <p className="mt-2.5 text-xs text-[var(--color-text-faint)]">Show this code at the clinic when requested.</p>
          </div>

          <div className="w-full text-left">
            <div className="flex items-center justify-between text-sm">
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
        </div>
      </TicketCard>

      <Button size="lg" className="w-full" onClick={() => navigate(`/queue/${entry.id}`, { replace: true })}>
        {isBookedAhead ? 'View my booking' : 'Track live queue'}
      </Button>
    </div>
  )
}
