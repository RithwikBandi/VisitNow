import { Printer, X } from 'lucide-react'
import { Button } from '../ui/Button'
import type { Clinic, Doctor, QueueEntry } from '../../lib/types'

/**
 * A printable walk-in token slip — what the front desk hands (or reads
 * out) to a patient right after generating an offline token. Didn't
 * exist before this round; only the revenue report had a print path.
 * Reuses that exact pattern (`print:hidden` on the interactive chrome, a
 * `hidden print:block` print-only view) rather than inventing a new one
 * — see StaffRevenuePage.tsx.
 */
export function TokenSlip({
  entry,
  doctor,
  clinic,
  onClose,
}: {
  entry: QueueEntry
  doctor: Doctor
  clinic: Clinic
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:static print:bg-transparent print:p-0" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-[var(--radius-ticket)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] print:max-w-none print:rounded-none print:shadow-none"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3 print:hidden">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Token generated</p>
          <button onClick={onClose} aria-label="Close" className="press-scale rounded-full p-1 text-[var(--color-text-faint)] hover:bg-[var(--color-surface-sunken)]">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-7 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">{clinic.name}</p>
          <p className="text-[13px] text-[var(--color-text-muted)]">{doctor.name}</p>
          <div className="my-5 border-t border-dashed border-[var(--color-border-strong)]" />
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">Token</p>
          <p className="tabular-nums font-display text-[72px] font-black leading-none text-[var(--color-brand-700)]">{entry.tokenNumber}</p>
          <p className="mt-3 text-sm font-semibold text-[var(--color-text)]">{entry.patientName}</p>
          <p className="mt-1 text-[12px] text-[var(--color-text-faint)]">
            Walk-in — no verification code. Wait for your token number to be called.
          </p>
        </div>

        <div className="border-t border-[var(--color-border)] p-4 print:hidden">
          <Button size="lg" className="w-full" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" />
            Print slip
          </Button>
        </div>
      </div>
    </div>
  )
}
