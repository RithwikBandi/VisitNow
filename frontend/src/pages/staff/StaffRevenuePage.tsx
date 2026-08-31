import { Download, IndianRupee, Printer, Ticket, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { RevenueTrendChart } from '../../components/charts/RevenueTrendChart'
import { TokensPerDayChart } from '../../components/charts/TokensPerDayChart'
import { StatCard } from '../../components/staff/StatCard'
import { fetchRevenueReport } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { getCachedAccount } from '../../lib/auth'
import type { RevenueClinicRow, RevenueDoctorRow, RevenueSourceRow } from '../../lib/types'

const SOURCE_LABEL: Record<string, string> = {
  online: 'Online (app)',
  offline: 'Walk-in (counter)',
  appointment: 'Appointment',
}

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}

/** Downloads a real CSV built from data already on the page — no
 * separate export endpoint needed, since the JSON already fetched here
 * is the complete row set the CSV just re-serializes. A browser-side
 * Blob download, not a fake/disabled link. */
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
 * The hospital revenue & analytics dashboard — the "too soon" feature
 * from docs/VISITNOW_PRODUCT_DECISIONS.md §15, built for real: what did
 * we collect, by clinic, by doctor, by day, by how the token came in —
 * downloadable as a real CSV and printable via the browser's own print
 * (a dedicated print stylesheet below, not a screenshot-of-the-screen).
 */
export function StaffRevenuePage() {
  const account = getCachedAccount()
  const isPlatform = account?.role === 'super_admin' || account?.role === 'super_admin_staff'
  const [city, setCity] = useState('')
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const { data, loading, error } = usePolling(() => fetchRevenueReport(city || undefined), 20_000, city)

  // Captured from the unfiltered response only — once a city filter is
  // applied, byClinic narrows to just that city, so this is the one
  // moment the full option list is visible. "select a location and see
  // data for that location," reusing data already on the page rather
  // than a second endpoint just to list cities.
  useEffect(() => {
    if (!city && data) {
      setCityOptions([...new Set(data.byClinic.map((c) => c.city))].sort())
    }
  }, [city, data])

  const csvRows = useMemo(() => {
    if (!data) return []
    const header = ['Token', 'Patient', 'Clinic', 'Doctor', 'Date', 'Source', 'Status', 'Clinic fee (₹)', 'Fee collected', 'Platform fee collected (₹)', 'Created at']
    const rows = data.entries.map((e) => [
      e.tokenNumber,
      e.patientName,
      e.clinicName,
      e.doctorName,
      e.date,
      SOURCE_LABEL[e.source] ?? e.source,
      e.status,
      e.clinicFeeAmount,
      e.clinicFeeCollected ? 'Yes' : 'Due',
      e.platformFeeCollected,
      e.createdAt,
    ])
    return [header, ...rows]
  }, [data])

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-black/5" />
        ))}
      </div>
    )
  }
  if (error && !data) return <p className="text-sm text-[var(--color-danger)]">{error}</p>
  if (!data) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text)] sm:text-[28px]">Revenue &amp; analytics</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Every clinic and platform fee this demo has recorded, in real time.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPlatform && cityOptions.length > 1 && (
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-[var(--radius-md)] border border-black/10 bg-white px-3 py-2 text-[13px] font-bold text-[var(--color-text)] focus:border-[var(--color-brand-400)] focus:outline-none"
            >
              <option value="">All locations</option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => downloadCsv(`visitnow-revenue-${new Date().toISOString().slice(0, 10)}.csv`, csvRows)}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-black/10 bg-white px-3.5 py-2 text-[13px] font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-700)]"
          >
            <Download size={14} aria-hidden="true" />
            Download CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-black/10 bg-white px-3.5 py-2 text-[13px] font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-700)]"
          >
            <Printer size={14} aria-hidden="true" />
            Print report
          </button>
        </div>
      </div>

      {/* Print-only header — window.print() hides the interactive controls
          above via print:hidden and shows this instead, so a printed page
          reads as a report, not a UI screenshot. */}
      <div className="hidden print:block">
        <h1 className="font-display text-xl font-bold">VisitNow: revenue report</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Generated {new Date(data.generatedAt).toLocaleString('en-IN')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Ticket} label="Tokens issued" value={data.totals.tokensIssued.toLocaleString('en-IN')} />
        <StatCard icon={IndianRupee} label="Clinic fees collected" value={inr(data.totals.clinicFeeCollected)} tone="accent" />
        <StatCard icon={TrendingUp} label="Clinic fees due" value={inr(data.totals.clinicFeeDue)} tone={data.totals.clinicFeeDue > 0 ? 'warning' : undefined} />
        <StatCard icon={IndianRupee} label="VisitNow platform fees" value={inr(data.totals.platformFeeCollected)} />
      </div>

      {/* byDay comes back newest-first (see computeRevenueReport) — every
          other consumer wants that, a trend chart wants oldest-first, so
          reverse it here rather than changing the API's own order for
          this one caller. */}
      <div className="grid grid-cols-1 gap-4 print:hidden lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-black/5 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
            <TrendingUp size={13} aria-hidden="true" />
            Clinic fees by day
          </h2>
          <RevenueTrendChart data={[...data.byDay].reverse().map((d) => ({ date: d.date, value: d.clinicFeeCollected }))} formatValue={inr} />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-black/5 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
            <Ticket size={13} aria-hidden="true" />
            Tokens by day
          </h2>
          <TokensPerDayChart data={[...data.byDay].reverse().map((d) => ({ date: d.date, value: d.tokensIssued }))} />
        </div>
      </div>

      {/* "By clinic" is meaningless (a table with one row) for a
          hospital_admin, whose report is already scoped to their one
          clinic server-side — hide it rather than show a table proving
          nothing. A super_admin's unscoped report still has several
          rows, so it stays for them. */}
      <div className={`grid grid-cols-1 gap-6 ${data.byClinic.length > 1 ? 'lg:grid-cols-2' : ''}`}>
        {data.byClinic.length > 1 && (
          <RevenueTable
            title="By clinic"
            rows={data.byClinic}
            renderLabel={(r: RevenueClinicRow) => (
              <>
                <p className="font-semibold text-[var(--color-text)]">{r.clinicName}</p>
                <p className="text-[12px] text-[var(--color-text-faint)]">{r.city}</p>
              </>
            )}
          />
        )}
        <RevenueTable
          title="By doctor"
          rows={data.byDoctor}
          renderLabel={(r: RevenueDoctorRow) => (
            <>
              <p className="font-semibold text-[var(--color-text)]">{r.doctorName}</p>
              <p className="truncate text-[12px] text-[var(--color-text-faint)]">{r.clinicNames.join(', ')}</p>
            </>
          )}
        />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-black/5 bg-white">
        <div className="border-b border-black/5 px-5 py-3.5">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">How tokens came in</h2>
        </div>
        <div className="grid grid-cols-1 divide-y divide-black/5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {data.bySource.map((s: RevenueSourceRow) => (
            <div key={s.source} className="p-5">
              <p className="text-sm font-bold text-[var(--color-text)]">{SOURCE_LABEL[s.source] ?? s.source}</p>
              <p className="mt-1 font-display text-2xl font-bold text-[var(--color-brand-700)]">{s.count}</p>
              <p className="text-[12px] text-[var(--color-text-faint)]">{inr(s.clinicFeeCollected)} in clinic fees</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-black/5 bg-white">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-3.5">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">All tokens ({data.entries.length})</h2>
        </div>
        <div className="max-h-[28rem] overflow-y-auto print:max-h-none print:overflow-visible">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wide text-[var(--color-text-faint)]">
              <tr>
                <th className="px-5 py-2.5 font-bold">Token</th>
                <th className="px-3 py-2.5 font-bold">Patient</th>
                <th className="px-3 py-2.5 font-bold">Clinic</th>
                <th className="px-3 py-2.5 font-bold">Doctor</th>
                <th className="px-3 py-2.5 font-bold">Source</th>
                <th className="px-3 py-2.5 font-bold">Status</th>
                <th className="px-3 py-2.5 text-right font-bold">Clinic fee</th>
                <th className="px-5 py-2.5 text-right font-bold">Platform fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {data.entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-2.5 font-bold text-[var(--color-brand-700)]">#{e.tokenNumber}</td>
                  <td className="px-3 py-2.5">{e.patientName}</td>
                  <td className="max-w-[10rem] truncate px-3 py-2.5 text-[var(--color-text-muted)]">{e.clinicName}</td>
                  <td className="max-w-[10rem] truncate px-3 py-2.5 text-[var(--color-text-muted)]">{e.doctorName}</td>
                  <td className="px-3 py-2.5 text-[var(--color-text-muted)]">{SOURCE_LABEL[e.source] ?? e.source}</td>
                  <td className="px-3 py-2.5 capitalize text-[var(--color-text-muted)]">{e.status.replace('_', ' ')}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">
                    {inr(e.clinicFeeAmount)}
                    {!e.clinicFeeCollected && <span className="ml-1 text-[11px] font-bold text-[var(--color-warning)]">due</span>}
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold">{e.platformFeeCollected > 0 ? inr(e.platformFeeCollected) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function RevenueTable<T extends { tokensIssued: number; clinicFeeCollected: number; clinicFeeDue: number }>({
  title,
  rows,
  renderLabel,
}: {
  title: string
  rows: T[]
  renderLabel: (row: T) => ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-black/5 bg-white">
      <div className="border-b border-black/5 px-5 py-3.5">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-[var(--color-text-faint)]">No tokens yet.</p>
      ) : (
        <div className="divide-y divide-black/5">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">{renderLabel(row)}</div>
              <div className="shrink-0 text-right">
                <p className="font-display text-[15px] font-bold text-[var(--color-text)]">{inr(row.clinicFeeCollected)}</p>
                <p className="text-[11px] text-[var(--color-text-faint)]">
                  {row.tokensIssued} tokens{row.clinicFeeDue > 0 ? ` · ${inr(row.clinicFeeDue)} due` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
