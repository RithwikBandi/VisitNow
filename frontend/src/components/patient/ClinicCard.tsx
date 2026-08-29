import { MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Clinic } from '../../lib/types'

export function ClinicCard({ clinic, subtitle }: { clinic: Clinic; subtitle?: string }) {
  return (
    <Link
      to={`/clinics/${clinic.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
    >
      <div className="aspect-[16/9] w-full overflow-hidden bg-[var(--color-border)]">
        {clinic.photoUrl && (
          <img
            src={clinic.photoUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="truncate font-display text-[16px] font-bold leading-tight text-[var(--color-text)]">{clinic.name}</h3>
        <p className="flex items-center gap-1 text-[13px] text-[var(--color-text-muted)]">
          <MapPin size={12} className="shrink-0" aria-hidden="true" />
          <span className="truncate">
            {clinic.location}, {clinic.city}
          </span>
        </p>
        {subtitle && <p className="mt-0.5 text-[12px] font-semibold text-[var(--color-brand-600)]">{subtitle}</p>}
      </div>
    </Link>
  )
}
