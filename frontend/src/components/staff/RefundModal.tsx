import { useState } from 'react'
import { Button } from '../ui/Button'
import { issueRefund } from '../../lib/api'
import type { QueueEntry } from '../../lib/types'
import { ApiError } from '../../lib/types'

/** Issuing a refund is a real, deliberate action (money conceptually
 * moving back, even though this prototype simulates it — see
 * queueEngine.issueRefund's own docstring) — a confirmation modal with
 * an editable amount and optional reason, not a bare button, matching
 * how the app already treats "cancel my visit" as needing a confirm
 * step. Amount is pre-filled to the maximum refundable (whatever fees
 * were actually paid) and the server clamps to that max regardless of
 * what's submitted — this input is a convenience, not the source of
 * truth. */
export function RefundModal({
  entry,
  onClose,
  onDone,
  onError,
}: {
  entry: QueueEntry
  onClose: () => void
  onDone: () => void
  onError: (message: string) => void
}) {
  const maxRefundable = (entry.hospitalFeeStatus === 'PAID' ? entry.hospitalFeeAmount ?? 0 : 0) + (entry.platformFeeStatus === 'PAID' ? entry.platformFeeAmount ?? 0 : 0)
  const [amount, setAmount] = useState(maxRefundable)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    setSubmitting(true)
    try {
      await issueRefund(entry.id, amount, reason.trim() || undefined)
      onDone()
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not issue this refund.')
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-[var(--radius-ticket)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)]">
        <p className="font-display text-lg font-bold text-[var(--color-text)]">Refund token #{entry.tokenNumber}</p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">{entry.patientName} · up to ₹{maxRefundable} was collected on this token.</p>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Refund amount (₹)</span>
          <input
            type="number"
            min={0}
            max={maxRefundable}
            value={amount}
            onChange={(e) => setAmount(Math.min(maxRefundable, Math.max(0, Number(e.target.value) || 0)))}
            className="tabular-nums rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] px-4 py-2.5 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
          />
        </label>
        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Reason (optional)</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Patient couldn't make it"
            className="rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] px-4 py-2.5 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
          />
        </label>

        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" className="flex-1" onClick={submit} disabled={submitting || amount <= 0}>
            {submitting ? 'Refunding…' : `Refund ₹${amount}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
