import { Search, Users } from 'lucide-react'
import { useState } from 'react'
import { StatusBadge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchPatientDirectory } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}

/**
 * Platform patient directory — real data, grouped from every clinic's
 * queue history (see store/crm.ts's computePatientDirectory), not an
 * invented ticketing system. Gated on the 'crm' module (App.tsx wraps
 * this route in RequirePermission), matching the product spec's own
 * "Staff C -> Users + CRM" example.
 */
export function CrmPage() {
  const { data, loading, error } = usePolling(fetchPatientDirectory, 30_000)
  const [query, setQuery] = useState('')

  if (loading && !data) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const needle = query.trim().toLowerCase()
  const patients = needle
    ? data.patients.filter((p) => p.name.toLowerCase().includes(needle) || p.phone?.includes(needle) || p.clinicNames.some((c) => c.toLowerCase().includes(needle)))
    : data.patients

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)] sm:text-[28px]">Patients</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Every patient who's taken a token across VisitNow, grouped from their visit history ({data.patients.length} total).
        </p>
      </div>

      <label className="relative flex items-center">
        <Search size={16} className="pointer-events-none absolute left-3.5 text-[var(--color-text-faint)]" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, or clinic"
          className="w-full max-w-sm rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-[14px] focus:border-[var(--color-brand-400)] focus:outline-none"
        />
      </label>

      {patients.length === 0 ? (
        <EmptyState icon={Users} title={needle ? 'No matches' : 'No patients yet'} description={needle ? 'Try a different name, phone, or clinic.' : 'Patients appear here once tokens start being issued.'} />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Clinics visited</th>
                <th className="px-5 py-3">Visits</th>
                <th className="px-5 py-3">Total paid</th>
                <th className="px-5 py-3">Last visit</th>
                <th className="px-5 py-3">Last status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {patients.map((p) => (
                <tr key={p.key}>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-[var(--color-text)]">{p.name}</p>
                    {p.phone && <p className="text-[12px] text-[var(--color-text-faint)]">{p.phone}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-[var(--color-text-muted)]">{p.clinicNames.join(', ')}</td>
                  <td className="tabular-nums px-5 py-3.5 font-semibold text-[var(--color-text)]">{p.visitCount}</td>
                  <td className="tabular-nums px-5 py-3.5 font-semibold text-[var(--color-text)]">{inr(p.totalPaid)}</td>
                  <td className="px-5 py-3.5 text-[13px] text-[var(--color-text-muted)]">{new Date(p.lastVisitAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={p.lastStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
