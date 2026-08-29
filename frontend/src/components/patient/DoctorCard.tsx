import { Link } from 'react-router-dom'
import type { SessionWithRelations } from '../../lib/types'

function sessionPhase(session: SessionWithRelations): 'live' | 'upcoming' | 'closed' {
  if (session.doctorStatus === 'closed') return 'closed'
  return session.isQueueOpen ? 'live' : 'upcoming'
}

/**
 * The photo-forward discovery card — this is the whole "stop looking
 * like a list, look like Swiggy/Zomato" change. A photo carries the
 * card, a status pill sits on top of it exactly the way a delivery-time
 * badge sits on a restaurant photo, and the text underneath is
 * secondary. Built for a grid, not a stacked list (see HomePage).
 */
export function DoctorCard({ session }: { session: SessionWithRelations }) {
  const phase = sessionPhase(session)

  return (
    <Link
      to={`/sessions/${session.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:-translate-y-1 hover:border-[var(--color-brand-300)] hover:shadow-[var(--shadow-md)]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--color-border)]">
        {session.doctor.photoUrl && (
          <img
            src={session.doctor.photoUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          {phase === 'live' && (
            <span className="flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[var(--color-brand-700)] shadow-sm backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" aria-hidden="true" />
              Serving #{session.currentToken ?? '—'}
            </span>
          )}
          {phase === 'upcoming' && (
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[var(--color-text-muted)] shadow-sm backdrop-blur-sm">
              Opens {session.startTime}
            </span>
          )}
          {phase === 'closed' && (
            <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">Closed</span>
          )}
        </div>

        {session.doctorStatus === 'delayed' && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-[var(--color-warning)] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
            Running ~{session.delayMinutes}m late
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-600)]">{session.doctor.specialty}</p>
        <h3 className="truncate font-display text-[17px] font-semibold leading-tight text-[var(--color-text)]">{session.doctor.name}</h3>
        <p className="mt-0.5 truncate text-[13px] text-[var(--color-text-muted)]">{session.clinic.name}</p>
        <p className="text-[12px] text-[var(--color-text-faint)]">
          {session.label} · {session.startTime}–{session.endTime}
        </p>
      </div>
    </Link>
  )
}
