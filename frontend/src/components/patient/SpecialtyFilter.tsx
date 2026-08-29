/** Horizontal, scrollable specialty chips — the Swiggy/Zomato "cuisine
 * filter" pattern, adapted. Deliberately a strip of tappable pills
 * instead of a dropdown: it's scannable at a glance for someone who
 * isn't going to read a dense list, which is the whole point of this
 * pass (§ "non-tech people too"). */
export function SpecialtyFilter({
  specialties,
  active,
  onChange,
}: {
  specialties: string[]
  active: string | null
  onChange: (specialty: string | null) => void
}) {
  return (
    <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8">
      <Chip label="All" selected={active === null} onClick={() => onChange(null)} />
      {specialties.map((s) => (
        <Chip key={s} label={s} selected={active === s} onClick={() => onChange(s)} />
      ))}
    </div>
  )
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
        selected
          ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white'
          : 'border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-brand-300)]'
      }`}
    >
      {label}
    </button>
  )
}
