import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-600)]">
        <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h3 className="font-display text-base font-bold text-[var(--color-text)]">{title}</h3>
      <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
      {action}
    </div>
  )
}
