import { ArrowRight, Building2, IndianRupee, Ticket, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatCard } from '../../components/staff/StatCard'
import { DoctorStatusLine } from '../../components/ui/Badge'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchDoctorDashboard } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}

/**
 * A doctor's own landing view — the personal dashboard from the multi-
 * tenant auth plan: today's tokens, today's and this month's revenue, a
 * daily-average token count, and which of their clinics/sessions today
 * is theirs to run. Scoped entirely server-side to req.account.doctorId
 * (see GET /dashboard/doctor) — there's no clinic/doctor id in this
 * page's own routing to get wrong.
 */
export function DoctorDashboardPage() {
  const { data, loading, error } = usePolling(fetchDoctorDashboard, 20_000)

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />
        ))}
      </div>
    )
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const todaySessions = data.sessions.filter((s) => s.date === new Date().toISOString().slice(0, 10))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)] sm:text-[28px]">{data.doctor.name}</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{data.doctor.specialty}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Ticket} label="Tokens today" value={data.todayTokensSeen.toLocaleString('en-IN')} />
        <StatCard icon={IndianRupee} label="Today's revenue" value={inr(data.todayRevenue)} tone="accent" />
        <StatCard icon={TrendingUp} label="This month's revenue" value={inr(data.monthlyRevenue)} />
        <StatCard icon={Ticket} label="Daily average (this month)" value={data.dailyAverageTokens.toLocaleString('en-IN')} />
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
          <Building2 size={13} aria-hidden="true" />
          Your clinics
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.clinics.map((clinic) => {
            const session = todaySessions.find((s) => s.clinicId === clinic.id)
            return (
              <div key={clinic.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <p className="font-display text-[15px] font-bold text-[var(--color-text)]">{clinic.name}</p>
                <p className="text-[13px] text-[var(--color-text-muted)]">{clinic.location}</p>
                {session ? (
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <DoctorStatusLine status={session.doctorStatus} delayMinutes={session.delayMinutes} />
                    <Link
                      to={`/doctor/sessions/${session.id}`}
                      className="press-scale flex shrink-0 items-center gap-1 text-[13px] font-bold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)]"
                    >
                      Open queue <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                ) : (
                  <p className="mt-3 text-[12px] text-[var(--color-text-faint)]">No session today</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
