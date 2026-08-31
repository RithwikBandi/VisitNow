import { Printer, X } from 'lucide-react'
import { Button } from '../ui/Button'
import type { Clinic, Doctor, QueueEntry, Session } from '../../lib/types'

/**
 * A5 print size (148mm × 210mm) — exactly what a clinic gets by cutting
 * a full A4 sheet in half along its long edge, which is how the front
 * desks this was built for actually print slips: buy A4, cut it once,
 * feed the half-sheet back into the printer. Scoped to this one print
 * action via a temporary injected <style>, not a global @page rule —
 * the revenue report elsewhere in this app also prints, on full A4/
 * letter, and a global @page override would have silently resized that
 * too.
 */
function printA5(): void {
  const style = document.createElement('style')
  style.id = 'token-slip-page-size'
  style.textContent = '@page { size: 148mm 210mm; margin: 10mm; }'
  document.head.appendChild(style)
  const cleanup = () => {
    style.remove()
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}

/**
 * A printable walk-in token slip — what the front desk hands (or reads
 * out) to a patient right after generating an offline token.
 *
 * Two things this fixes, found from a real screenshot of it in use: it
 * used to print the *entire* live queue console underneath it — the
 * doctor-status controls, the walk-in/verify-code forms, and every other
 * waiting patient's name and status — because window.print() prints
 * whatever's on the page, and only this component's own chrome was
 * marked print:hidden. The page that renders this now hides its own
 * content for print instead (see StaffQueueConsolePage), so only the
 * slip itself ever reaches paper. And the slip's own content is now
 * scoped to what a patient actually needs — clinic, doctor, date,
 * session window, their token, their name, when it was issued — nothing
 * a receptionist would see that a patient shouldn't be handed on paper.
 */
export function TokenSlip({
  entry,
  doctor,
  clinic,
  session,
  onClose,
}: {
  entry: QueueEntry
  doctor: Doctor
  clinic: Clinic
  session: Session
  onClose: () => void
}) {
  const issuedAt = new Date(entry.createdAt)

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

        {/* The slip itself — everything below is what actually reaches
            paper. Sized and spaced to sit comfortably on a half-A4
            sheet, not stretched to fill a full page. */}
        <div className="px-6 py-7 text-center print:px-2 print:py-4">
          <p className="font-display text-[15px] font-bold text-[var(--color-text)]">{clinic.name}</p>
          <p className="text-[11px] text-[var(--color-text-faint)]">{clinic.location}</p>

          <div className="my-4 border-t border-dashed border-[var(--color-border-strong)]" />

          <p className="text-[13px] font-semibold text-[var(--color-text)]">{doctor.name}</p>
          <p className="text-[11px] text-[var(--color-text-faint)]">{doctor.specialty}</p>
          <p className="mt-1 text-[11px] text-[var(--color-text-faint)]">
            {session.label} · {session.startTime}–{session.endTime}
          </p>

          <div className="my-5 border-t border-dashed border-[var(--color-border-strong)]" />

          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">Token</p>
          <p className="tabular-nums font-display text-[72px] font-black leading-none text-[var(--color-brand-700)]">{entry.tokenNumber}</p>
          <p className="mt-3 text-sm font-semibold text-[var(--color-text)]">{entry.patientName}</p>

          <p className="mt-4 text-[11px] text-[var(--color-text-faint)]">
            {issuedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · Issued at{' '}
            {issuedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="mt-3 text-[12px] text-[var(--color-text-faint)]">
            Walk-in token, no verification code needed. Please keep this slip and wait for your number to be called.
          </p>

          <p className="mt-6 text-[9px] uppercase tracking-[0.1em] text-[var(--color-text-faint)] opacity-70">Issued via VisitNow</p>
        </div>

        <div className="border-t border-[var(--color-border)] p-4 print:hidden">
          <Button size="lg" className="w-full" onClick={printA5}>
            <Printer size={16} aria-hidden="true" />
            Print slip
          </Button>
        </div>
      </div>
    </div>
  )
}
