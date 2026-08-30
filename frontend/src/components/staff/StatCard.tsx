import type { LucideIcon } from 'lucide-react'

/** Extracted from StaffRevenuePage (it was the only place this existed)
 * once DoctorDashboardPage needed the same "icon, label, big number"
 * tile — shared now instead of copy-pasted a second time. */
export function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone?: 'accent' | 'warning'
}) {
  const toneClass = tone === 'accent' ? 'text-[var(--color-accent-700)]' : tone === 'warning' ? 'text-[var(--color-warning)]' : 'text-[var(--color-text)]'
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-center gap-2 text-[var(--color-text-faint)]">
        <Icon size={15} aria-hidden="true" />
        <p className="text-[12px] font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p className={`mt-2 font-display text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  )
}
