import { AlertOctagon, Banknote, Check, PlayCircle, ReceiptText, RotateCcw, SkipForward, UserX, XCircle, Zap } from 'lucide-react'
import { useState } from 'react'
import { PriorityBadge, SourceBadge, StatusBadge } from '../ui/Badge'
import { RefundModal } from './RefundModal'
import { hasPermission } from './RequirePermission'
import {
  cancelEntry,
  collectHospitalFee,
  completeEntry,
  markNoShow,
  requeueEntry,
  setPriority,
  skipEntry,
  startConsultation,
} from '../../lib/api'
import type { QueueEntry, QueuePriority } from '../../lib/types'
import { ApiError } from '../../lib/types'

interface QueueRowProps {
  entry: QueueEntry
  assignedBy: string
  disabled: boolean
  onChanged: () => void
  onError: (message: string) => void
}

const TERMINAL: readonly string[] = ['completed', 'cancelled', 'no_show']

/** One queue entry, with whichever actions actually make sense for its
 * current status — a waiting token can be skipped or escalated, a called
 * one can be started or marked a no-show, and so on. Keeping the action
 * set contextual (rather than showing every possible button on every
 * row, disabled when irrelevant) is what makes this read as an
 * operations console instead of a generic CRUD table.
 *
 * "Collect fee" and "Refund" are permission-gated separately from the
 * queue actions above (hasPermission('payments')/('refunds')) — a front-
 * desk account with only queue/tokens never sees either, matching the
 * seeded "Sunrise Front Desk" vs. "Sunrise Payments Desk" split. The
 * backend enforces the same boundary on both routes regardless of what
 * this component shows. */
export function QueueRow({ entry, assignedBy, disabled, onChanged, onError }: QueueRowProps) {
  const [refunding, setRefunding] = useState(false)

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      onChanged()
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Something went wrong.')
    }
  }

  const priorityCycle: Record<QueuePriority, QueuePriority> = { regular: 'priority', priority: 'emergency', emergency: 'regular' }
  const nextPriority = priorityCycle[entry.priority]

  const canRunQueue = hasPermission('queue')
  const canCollectFee = entry.paymentMethod === 'PAY_AT_HOSPITAL' && entry.hospitalFeeStatus === 'DUE' && hasPermission('payments')
  const paidSomething = entry.hospitalFeeStatus === 'PAID' || entry.platformFeeStatus === 'PAID'
  const canRefund =
    ['cancelled', 'no_show'].includes(entry.status) && paidSomething && entry.refundStatus !== 'REFUNDED' && hasPermission('refunds')

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
      <span className="w-10 shrink-0 font-display text-xl font-semibold text-[var(--color-text)]">{entry.tokenNumber}</span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[var(--color-text)]">{entry.patientName}</p>
        {entry.priorityAssignedBy && (
          <p className="text-[11px] text-[var(--color-text-faint)]">Priority set by {entry.priorityAssignedBy}</p>
        )}
        {entry.refundStatus === 'REFUNDED' && (
          <p className="text-[11px] font-semibold text-[var(--color-warning)]">₹{entry.refundAmount} refunded by {entry.refundedBy}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <SourceBadge source={entry.source} />
        <PriorityBadge priority={entry.priority} />
        {!TERMINAL.includes(entry.status) && entry.paymentMethod === 'PAY_AT_HOSPITAL' && (
          <span
            className={`inline-flex items-center rounded-[var(--radius-badge)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${
              entry.hospitalFeeStatus === 'PAID' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
            }`}
          >
            {entry.hospitalFeeStatus === 'PAID' ? 'Fee paid' : 'Fee due'}
          </span>
        )}
        <StatusBadge status={entry.status} />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {canRunQueue && entry.status === 'waiting' && (
          <>
            <IconAction
              label={`Set ${nextPriority}`}
              icon={<Zap size={14} />}
              disabled={disabled}
              onClick={() => run(() => setPriority(entry.id, nextPriority, assignedBy))}
            />
            <IconAction label="Skip" icon={<SkipForward size={14} />} disabled={disabled} onClick={() => run(() => skipEntry(entry.id))} />
            <IconAction label="Cancel" icon={<XCircle size={14} />} disabled={disabled} onClick={() => run(() => cancelEntry(entry.id))} tone="danger" />
          </>
        )}
        {canRunQueue && entry.status === 'called' && (
          <>
            <IconAction label="Start" icon={<PlayCircle size={14} />} disabled={disabled} onClick={() => run(() => startConsultation(entry.id))} />
            <IconAction label="No-show" icon={<UserX size={14} />} disabled={disabled} onClick={() => run(() => markNoShow(entry.id))} tone="danger" />
          </>
        )}
        {canRunQueue && entry.status === 'in_progress' && (
          <IconAction label="Complete" icon={<Check size={14} />} disabled={disabled} onClick={() => run(() => completeEntry(entry.id))} tone="success" />
        )}
        {canRunQueue && entry.status === 'skipped' && (
          <IconAction label="Re-queue" icon={<RotateCcw size={14} />} disabled={disabled} onClick={() => run(() => requeueEntry(entry.id))} />
        )}
        {canCollectFee && (
          <IconAction label="Collect fee" icon={<Banknote size={14} />} disabled={disabled} onClick={() => run(() => collectHospitalFee(entry.id))} tone="success" />
        )}
        {canRefund && (
          <IconAction label="Refund" icon={<ReceiptText size={14} />} disabled={disabled} onClick={() => setRefunding(true)} tone="danger" />
        )}
        {entry.priority === 'emergency' && entry.status === 'waiting' && (
          <AlertOctagon size={15} className="ml-1 text-[var(--color-danger)]" aria-label="Emergency" />
        )}
      </div>

      {refunding && (
        <RefundModal
          entry={entry}
          onClose={() => setRefunding(false)}
          onDone={() => {
            setRefunding(false)
            onChanged()
          }}
          onError={onError}
        />
      )}
    </div>
  )
}

function IconAction({
  label,
  icon,
  onClick,
  disabled,
  tone = 'default',
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  disabled: boolean
  tone?: 'default' | 'danger' | 'success'
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]'
      : tone === 'success'
        ? 'text-[var(--color-success)] hover:bg-[var(--color-success-bg)]'
        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-700)]'
  return (
    <button
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`press-scale flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-semibold disabled:opacity-40 ${toneClass}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
