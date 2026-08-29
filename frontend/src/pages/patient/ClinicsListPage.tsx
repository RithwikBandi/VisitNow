import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ClinicCard } from '../../components/patient/ClinicCard'
import { fetchClinics } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'

/** The clinic-first browsing path — a patient who thinks "which hospital"
 * before "which doctor" (the reference workflow's Hospitals Listing
 * screen). Wide grid, real website density, not a stacked mobile list. */
export function ClinicsListPage() {
  const { data, loading, error } = usePolling(fetchClinics, 60_000)
  const [query, setQuery] = useState('')

  const clinics = data?.clinics ?? []
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clinics
    return clinics.filter((c) => c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q))
  }, [clinics, query])

  return (
    <div className="animate-rise-in flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[26px] font-bold tracking-tight text-[var(--color-text)]">Clinics &amp; hospitals</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Browse by clinic to see every doctor practicing there.</p>
      </div>

      <label className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 shadow-[var(--shadow-sm)] transition-colors focus-within:border-[var(--color-brand-400)] sm:max-w-md">
        <Search size={17} className="shrink-0 text-[var(--color-text-faint)]" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clinics or hospitals"
          className="w-full min-w-0 bg-transparent text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none"
        />
      </label>

      {loading && !data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-border)]/40" />
          ))}
        </div>
      )}

      {error && !data && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((clinic) => (
          <ClinicCard key={clinic.id} clinic={clinic} />
        ))}
      </div>

      {data && filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-[var(--color-text-faint)]">No clinics match "{query}".</p>
      )}
    </div>
  )
}
