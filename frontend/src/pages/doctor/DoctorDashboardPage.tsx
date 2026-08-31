import { ArrowRight, Building2, Download, IndianRupee, Printer, Ticket, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RevenueTrendChart } from '../../components/charts/RevenueTrendChart'
import { TokensPerDayChart } from '../../components/charts/TokensPerDayChart'
import { StatCard } from '../../components/staff/StatCard'
import { DoctorStatusLine } from '../../components/ui/Badge'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchDoctorDashboard } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import type { DoctorClinicRow } from '../../lib/api'

const SOURCE_LABEL: Record<string, string> = {
  online: 'Online (app)',
  offline: 'Walk-in (counter)',
  appointment: 'Appointment',
}

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}

/** Same browser-side CSV export StaffRevenuePage already gives a
 * hospital's own report — a doctor's data is just as real and just as
 * worth taking away as a file, not only glanced at on screen. */
function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * A doctor's own landing view — a real practice dashboard, not four
 * static numbers: today's/monthly revenue, a daily-average token count,
 * revenue broken down by which of their clinics it came from (a doctor
 * genuinely working two or three clinics wants to see all three, not one
 * merged figure), how patients actually reach the queue (online vs
 * walk-in vs appointment), day-by-day trend charts, and a downloadable/
 * printable line-item report — the same seriousness StaffRevenuePage
 * already gives a hospital, scoped here to just this doctor's own
 * tokens across every clinic they work at. Everything computed
 * server-side from req.account.doctorId (see GET /dashboard/doctor) —
 * there's no clinic/doctor id in this page's own routing to get wrong.
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

  const csvRows = [
    ['Token', 'Patient', 'Clinic', 'Date', 'Source', 'Status', 'Fee (₹)', 'Collected', 'Created at'],
    ...data.entries.map((e) => [e.tokenNumber, e.patientName, e.clinicName, e.date, SOURCE_LABEL[e.source] ?? e.source, e.status, e.amount, e.collected ? 'Yes' : 'Due', e.createdAt]),
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text)] sm:text-[28px]">{data.doctor.name}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{data.doctor.specialty}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCsv(`${data.doctor.name.replace(/\s+/g, '-').toLowerCase()}-report-${new Date().toISOString().slice(0, 10)}.csv`, csvRows)}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3.5 py-2 text-[13px] font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-700)]"
          >
            <Download size={14} aria-hidden="true" />
            Download CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3.5 py-2 text-[13px] font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-700)]"
          >
            <Printer size={14} aria-hidden="true" />
            Print report
          </button>
        </div>
      </div>

      {/* Print-only header, same pattern as StaffRevenuePage's own. */}
      <div className="hidden print:block">
        <h1 className="font-display text-xl font-bold">{data.doctor.name}: practice report</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Generated {new Date().toLocaleString('en-IN')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Ticket} label="Tokens today" value={data.todayTokensSeen.toLocaleString('en-IN')} />
        <StatCard icon={IndianRupee} label="Today's revenue" value={inr(data.todayRevenue)} tone="accent" />
        <StatCard icon={TrendingUp} label="This month's revenue" value={inr(data.monthlyRevenue)} />
        <StatCard icon={Ticket} label="Daily average (this month)" value={data.dailyAverageTokens.toLocaleString('en-IN')} />
      </div>

      <div className="grid grid-cols-1 gap-4 print:hidden lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
            <TrendingUp size={13} aria-hidden="true" />
            Revenue by day
          </h2>
          <RevenueTrendChart data={data.dailyTrend.map((d) => ({ date: d.date, value: d.revenue }))} formatValue={inr} />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
            <Ticket size={13} aria-hidden="true" />
            Tokens by day
          </h2>
          <TokensPerDayChart data={data.dailyTrend.map((d) => ({ date: d.date, value: d.tokensSeen }))} />
        </div>
      </div>

      {/* "By clinic" is the headline ask: total revenue across every
          clinic this doctor practices at, not one merged figure. Hidden
          when there's only one — a table with a single row proves
          nothing a stat card doesn't already say. */}
      {data.byClinic.length > 1 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] px-5 py-3.5">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">Revenue by clinic</h2>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {data.byClinic.map((row: DoctorClinicRow) => (
              <div key={row.clinicId} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--color-text)]">{row.clinicName}</p>
                  <p className="text-[12px] text-[var(--color-text-faint)]">{row.city}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-[15px] font-bold text-[var(--color-text)]">{inr(row.revenue)}</p>
                  <p className="text-[11px] text-[var(--color-text-faint)]">
                    {row.tokensIssued} tokens{row.due > 0 ? ` · ${inr(row.due)} due` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* "Analysis": how patients actually reach this doctor's queue. */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-5 py-3.5">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">How tokens came in</h2>
        </div>
        <div className="grid grid-cols-1 divide-y divide-[var(--color-border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {data.bySource.map((s) => (
            <div key={s.source} className="p-5">
              <p className="text-sm font-bold text-[var(--color-text)]">{SOURCE_LABEL[s.source] ?? s.source}</p>
              <p className="mt-1 font-display text-2xl font-bold text-[var(--color-brand-700)]">{s.count}</p>
              <p className="text-[12px] text-[var(--color-text-faint)]">{inr(s.revenue)} collected</p>
            </div>
          ))}
        </div>
      </div>

      <div className="print:hidden">
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

      {/* The full line-item report — what the CSV/print buttons above
          actually export, visible on screen too rather than a download
          you can't preview first. */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">All tokens ({data.entries.length})</h2>
        </div>
        <div className="max-h-[28rem] overflow-y-auto print:max-h-none print:overflow-visible">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-[var(--color-surface)] text-[11px] uppercase tracking-wide text-[var(--color-text-faint)]">
              <tr>
                <th className="px-5 py-2.5 font-bold">Token</th>
                <th className="px-3 py-2.5 font-bold">Patient</th>
                <th className="px-3 py-2.5 font-bold">Clinic</th>
                <th className="px-3 py-2.5 font-bold">Source</th>
                <th className="px-3 py-2.5 font-bold">Status</th>
                <th className="px-5 py-2.5 text-right font-bold">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {data.entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-2.5 font-bold text-[var(--color-brand-700)]">#{e.tokenNumber}</td>
                  <td className="px-3 py-2.5">{e.patientName}</td>
                  <td className="max-w-[10rem] truncate px-3 py-2.5 text-[var(--color-text-muted)]">{e.clinicName}</td>
                  <td className="px-3 py-2.5 text-[var(--color-text-muted)]">{SOURCE_LABEL[e.source] ?? e.source}</td>
                  <td className="px-3 py-2.5 capitalize text-[var(--color-text-muted)]">{e.status.replace('_', ' ')}</td>
                  <td className="px-5 py-2.5 text-right font-semibold">
                    {inr(e.amount)}
                    {!e.collected && <span className="ml-1 text-[11px] font-bold text-[var(--color-warning)]">due</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
