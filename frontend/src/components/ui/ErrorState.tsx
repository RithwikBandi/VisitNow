import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-danger)]/20 bg-[var(--color-danger-bg)] px-6 py-10 text-center">
      <AlertTriangle size={22} className="text-[var(--color-danger)]" aria-hidden="true" />
      <p className="max-w-sm text-sm text-[var(--color-danger)]">{message}</p>
      {action}
    </div>
  )
}
