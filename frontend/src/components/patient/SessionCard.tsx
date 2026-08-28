import { Link } from 'react-router-dom'
import type { SessionWithRelations } from '../../lib/types'
import { DoctorStatusLine } from '../ui/Badge'

function sessionPhase(session: SessionWithRelations): 'live' | 'upcoming' | 'closed' {
  if (session.doctorStatus === 'closed') return 'closed'
  return session.isQueueOpen ? 'live' : 'upcoming'
}

export function SessionCard({ session }: { session: SessionWithRelations }) {
  const phase = sessionPhase(session)

  return (
    <Link
      to={`/sessions/${session.id}`}
      className="group flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--color-brand-300)] hover:shadow-[var(--shadow-md)]"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-600)]">{session.doctor.specialty}</p>
        <h3 className="mt-0.5 truncate font-display text-lg font-semibold text-[var(--color-text)]">{session.doctor.name}</h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {session.clinic.name} · {session.label} · {session.startTime}–{session.endTime}
        </p>
        <div className="mt-2.5">
          <DoctorStatusLine status={session.doctorStatus} delayMinutes={session.delayMinutes} />
        </div>
      </div>

      <div className="shrink-0 text-right">
        {phase === 'live' ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">Now serving</p>
            <p className="font-display text-3xl font-semibold text-[var(--color-brand-700)]">{session.currentToken ?? '—'}</p>
          </>
        ) : phase === 'upcoming' ? (
          <span className="rounded-full bg-[var(--color-brand-50)] px-3 py-1.5 text-xs font-bold text-[var(--color-brand-700)]">
            Opens {session.startTime}
          </span>
        ) : (
          <span className="text-xs font-semibold text-[var(--color-text-faint)]">Closed for today</span>
        )}
      </div>
    </Link>
  )
}
