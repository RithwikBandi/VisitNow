import type { ReactNode } from 'react'
import type { DoctorStatus, QueuePriority, QueueSource, QueueStatus } from '../../lib/types'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'stamp' | 'source-online' | 'source-offline' | 'source-appointment'

const TONES: Record<Tone, string> = {
  neutral: 'bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)]',
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
  stamp: 'bg-[var(--color-stamp-bg)] text-[var(--color-stamp)]',
  'source-online': 'bg-[var(--color-source-online-bg)] text-[var(--color-source-online)]',
  'source-offline': 'bg-[var(--color-source-offline-bg)] text-[var(--color-source-offline)]',
  'source-appointment': 'bg-[var(--color-source-appointment-bg)] text-[var(--color-source-appointment)]',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-[var(--radius-badge)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}

const SOURCE_LABEL: Record<QueueSource, string> = { online: 'Online', offline: 'Walk-in', appointment: 'Appointment' }
const SOURCE_TONE: Record<QueueSource, Tone> = { online: 'source-online', offline: 'source-offline', appointment: 'source-appointment' }

export function SourceBadge({ source }: { source: QueueSource }) {
  return <Badge tone={SOURCE_TONE[source]}>{SOURCE_LABEL[source]}</Badge>
}

const PRIORITY_LABEL: Record<QueuePriority, string> = { regular: 'Regular', priority: 'Priority', emergency: 'Emergency' }
const PRIORITY_TONE: Record<QueuePriority, Tone> = { regular: 'neutral', priority: 'warning', emergency: 'stamp' }

export function PriorityBadge({ priority }: { priority: QueuePriority }) {
  if (priority === 'regular') return null
  return <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>
}

const STATUS_LABEL: Record<QueueStatus, string> = {
  waiting: 'Waiting',
  called: 'Called',
  in_progress: 'With doctor',
  completed: 'Completed',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}
const STATUS_TONE: Record<QueueStatus, Tone> = {
  waiting: 'neutral',
  called: 'warning',
  in_progress: 'success',
  completed: 'neutral',
  skipped: 'danger',
  cancelled: 'danger',
  no_show: 'danger',
}

export function StatusBadge({ status }: { status: QueueStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
}

const DOCTOR_STATUS_LABEL: Record<DoctorStatus, string> = {
  available: 'Seeing patients normally',
  delayed: 'Running behind',
  paused: 'Queue on hold',
  closed: 'Session closed',
}
const DOCTOR_STATUS_DOT: Record<DoctorStatus, string> = {
  available: 'bg-[var(--color-success)]',
  delayed: 'bg-[var(--color-warning)]',
  paused: 'bg-[var(--color-warning)]',
  closed: 'bg-[var(--color-text-faint)]',
}

export function DoctorStatusLine({ status, delayMinutes }: { status: DoctorStatus; delayMinutes?: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
      <span className={`h-2 w-2 shrink-0 rounded-full ${DOCTOR_STATUS_DOT[status]}`} aria-hidden="true" />
      {DOCTOR_STATUS_LABEL[status]}
      {status === 'delayed' && delayMinutes ? ` by ~${delayMinutes} min` : ''}
    </span>
  )
}
