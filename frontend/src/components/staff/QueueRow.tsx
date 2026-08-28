import { AlertOctagon, Check, PlayCircle, RotateCcw, SkipForward, UserX, XCircle, Zap } from 'lucide-react'
import { PriorityBadge, SourceBadge, StatusBadge } from '../ui/Badge'
import {
  cancelEntry,
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

/** One queue entry, with whichever actions actually make sense for its
 * current status — a waiting token can be skipped or escalated, a called
 * one can be started or marked a no-show, and so on. Keeping the action
 * set contextual (rather than showing every possible button on every
 * row, disabled when irrelevant) is what makes this read as an
 * operations console instead of a generic CRUD table. */
export function QueueRow({ entry, assignedBy, disabled, onChanged, onError }: QueueRowProps) {
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

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
      <span className="w-10 shrink-0 font-display text-xl font-semibold text-[var(--color-text)]">{entry.tokenNumber}</span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-[var(--color-text)]">{entry.patientName}</p>
        {entry.priorityAssignedBy && (
          <p className="text-[11px] text-[var(--color-text-faint)]">Priority set by {entry.priorityAssignedBy}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <SourceBadge source={entry.source} />
        <PriorityBadge priority={entry.priority} />
        <StatusBadge status={entry.status} />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {entry.status === 'waiting' && (
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
        {entry.status === 'called' && (
          <>
            <IconAction label="Start" icon={<PlayCircle size={14} />} disabled={disabled} onClick={() => run(() => startConsultation(entry.id))} />
            <IconAction label="No-show" icon={<UserX size={14} />} disabled={disabled} onClick={() => run(() => markNoShow(entry.id))} tone="danger" />
          </>
        )}
        {entry.status === 'in_progress' && (
          <IconAction label="Complete" icon={<Check size={14} />} disabled={disabled} onClick={() => run(() => completeEntry(entry.id))} tone="success" />
        )}
        {entry.status === 'skipped' && (
          <IconAction label="Re-queue" icon={<RotateCcw size={14} />} disabled={disabled} onClick={() => run(() => requeueEntry(entry.id))} />
        )}
        {entry.priority === 'emergency' && entry.status === 'waiting' && (
          <AlertOctagon size={15} className="ml-1 text-[var(--color-danger)]" aria-label="Emergency" />
        )}
      </div>
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
      className={`flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${toneClass}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
