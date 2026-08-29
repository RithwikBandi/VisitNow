import { CheckCircle2 } from 'lucide-react'
import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackLink } from '../../components/patient/BackLink'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchQueueEntry } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'

/** The one-time landing after a successful token + payment — separate
 * from Active Visit (which a patient will come back to repeatedly) per
 * the product brief's §31 vs §15. Its whole job is making the
 * verification code and what-you-paid unmistakably clear before moving
 * on to live tracking. */
export function TokenConfirmedPage() {
  const { entryId } = useParams<{ entryId: string }>()
  const navigate = useNavigate()
  const fetcher = useCallback(() => fetchQueueEntry(entryId!), [entryId])
  const { data, loading, error } = usePolling(fetcher, 30_000)

  if (loading && !data) {
    return <div className="mt-8 h-96 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-border)]/40" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const { entry, session, patientsAhead } = data
  const code = entry.verificationCode ?? '----'

  return (
    <div className="animate-rise-in mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
      <div className="w-full text-left">
        <BackLink />
      </div>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">
        <CheckCircle2 size={30} aria-hidden="true" />
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text)]">Token confirmed!</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">You don't need to stand in the waiting queue.</p>
      </div>

      <div className="w-full rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div className="text-left">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Your token</p>
            <p className="font-display text-3xl font-bold text-[var(--color-brand-700)]">#{entry.tokenNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Now serving</p>
            <p className="font-display text-3xl font-bold text-[var(--color-text)]">{session.currentToken ?? '—'}</p>
          </div>
        </div>

        <p className="pt-4 text-sm text-[var(--color-text-muted)]">
          {patientsAhead} {patientsAhead === 1 ? 'patient' : 'patients'} ahead of you right now.
        </p>

        <div className="mt-5 rounded-[var(--radius-lg)] bg-[var(--color-brand-50)] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-700)]">Verification code</p>
          <div className="mt-2 flex justify-center gap-2.5">
            {code.split('').map((digit, i) => (
              <span
                key={i}
                className="flex h-12 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface)] font-display text-2xl font-bold text-[var(--color-brand-700)] shadow-[var(--shadow-sm)]"
              >
                {digit}
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-xs text-[var(--color-brand-700)]">Show this code at the clinic when requested.</p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border)] pt-4 text-left">
          <span className="text-sm font-semibold text-[var(--color-text)]">Platform fee</span>
          <Badge tone="success">Paid</Badge>
        </div>
        <div className="mt-2 flex items-center justify-between text-left">
          <span className="text-sm font-semibold text-[var(--color-text)]">Clinic fee (₹{entry.hospitalFeeAmount})</span>
          <Badge tone={entry.hospitalFeeStatus === 'PAID' ? 'success' : 'warning'}>
            {entry.hospitalFeeStatus === 'PAID' ? 'Paid' : 'Pay at hospital'}
          </Badge>
        </div>
      </div>

      <Button size="lg" className="w-full" onClick={() => navigate(`/queue/${entry.id}`, { replace: true })}>
        Track Live Queue
      </Button>
    </div>
  )
}
