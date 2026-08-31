import { ReceiptText } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchRefundCandidates, issueRefund } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { ApiError } from '../../lib/types'
import type { RefundCandidateRow } from '../../lib/api'

function inr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}

/**
 * Refund oversight — dual-routed at /staff/refunds (a hospital's own
 * cancelled/no-show tokens) and /admin/refunds (every clinic's, for a
 * super_admin/super_admin_staff account with the module) via the same
 * backend scoping /staff/refunds already applies by role. Resolves
 * decisions log edge case #31 ("no refund model") with a real, working
 * flow rather than a stub.
 */
export function StaffRefundsPage() {
  const { data, loading, error, refresh } = usePolling(fetchRefundCandidates, 20_000)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  if (loading && !data) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const pending = data.refunds.filter((r) => r.refundStatus !== 'REFUNDED')
  const issued = data.refunds.filter((r) => r.refundStatus === 'REFUNDED')

  const refund = async (row: RefundCandidateRow) => {
    setBusyId(row.id)
    setActionError(null)
    try {
      await issueRefund(row.id, row.maxRefundable)
      refresh()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not issue this refund.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)] sm:text-[28px]">Refunds</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Cancelled or no-show tokens that had a fee collected.</p>
      </div>

      {actionError && <ErrorState message={actionError} />}

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="border-b border-[var(--color-border)] px-5 py-3.5">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">Eligible for refund ({pending.length})</h2>
        </div>
        {pending.length === 0 ? (
          <EmptyState icon={ReceiptText} title="Nothing to refund" description="No cancelled or no-show token currently has an unrefunded, collected fee." />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {pending.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-bold text-[var(--color-text)]">
                    Token #{row.tokenNumber} — {row.patientName}
                  </p>
                  <p className="text-[12px] text-[var(--color-text-faint)]">
                    {row.clinicName} · {row.doctorName} · {row.date} · {row.status.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums font-display text-base font-bold text-[var(--color-text)]">{inr(row.maxRefundable)}</span>
                  <button
                    disabled={busyId === row.id}
                    onClick={() => refund(row)}
                    className="press-scale rounded-[var(--radius-btn)] bg-[var(--color-danger)] px-3.5 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                  >
                    {busyId === row.id ? 'Refunding…' : 'Refund full amount'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {issued.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/60">
          <div className="border-b border-[var(--color-border)] px-5 py-3">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">Already refunded ({issued.length})</h2>
          </div>
          <div className="divide-y divide-[var(--color-border)] opacity-80">
            {issued.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-bold text-[var(--color-text)]">
                    Token #{row.tokenNumber} — {row.patientName}
                  </p>
                  <p className="text-[12px] text-[var(--color-text-faint)]">
                    {row.clinicName} · refunded by {row.refundedBy} · {row.refundedAt && new Date(row.refundedAt).toLocaleString('en-IN')}
                    {row.refundReason && ` · "${row.refundReason}"`}
                  </p>
                </div>
                <span className="tabular-nums font-display text-base font-bold text-[var(--color-warning)]">{inr(row.refundAmount ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
