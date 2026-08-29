import { Link } from 'react-router-dom'
import { DoctorStatusLine } from '../../components/ui/Badge'
import { fetchTodaysSessions } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'

export function StaffHomePage() {
  const { data, loading } = usePolling(fetchTodaysSessions, 15_000)
  const sessions = data?.sessions ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)] sm:text-[28px]">Today's sessions</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Pick a session to open its live queue.</p>
      </div>

      {loading && !data && <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-black/10" />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sessions.map((s) => (
          <Link
            key={s.id}
            to={`/staff/sessions/${s.id}`}
            className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-black/5 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[var(--color-border)]">
                {s.doctor.photoUrl && <img src={s.doctor.photoUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-600)]">{s.doctor.specialty}</p>
                <h3 className="truncate font-display text-lg font-semibold text-[var(--color-text)]">{s.doctor.name}</h3>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              {s.clinic.name} · {s.label} · {s.startTime}–{s.endTime}
            </p>
            <div className="mt-1 flex items-center justify-between">
              <DoctorStatusLine status={s.doctorStatus} delayMinutes={s.delayMinutes} />
              {s.isQueueOpen && (
                <span className="font-display text-xl font-semibold text-[var(--color-brand-700)]">#{s.currentToken ?? '—'}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
