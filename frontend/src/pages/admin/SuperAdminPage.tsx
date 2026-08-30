import { Building2, Check, Copy, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchPlatformDashboard, onboardClinic } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { ApiError } from '../../lib/types'

/**
 * Tenant management — the super_admin's one job this phase: bring a new
 * clinic/hospital onto the platform, and see the tenant list. Onboarding
 * shows the new admin's password once, on screen, with a copy button —
 * no email-sending in this phase (see the multi-tenant auth plan's
 * non-goals), so this is the only place that password is ever visible.
 */
export function SuperAdminPage() {
  const { data, loading, error, refresh } = usePolling(fetchPlatformDashboard, 30_000)
  const [showForm, setShowForm] = useState(false)

  if (loading && !data) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text)] sm:text-[28px]">Tenants</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">{data.clinics.length} clinics registered on VisitNow.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} aria-hidden="true" />
          Onboard clinic
        </Button>
      </div>

      {showForm && <OnboardClinicForm onDone={() => { setShowForm(false); refresh() }} />}

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="divide-y divide-[var(--color-border)]">
          {data.clinics.map((clinic) => (
            <div key={clinic.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)]">
                <Building2 size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[var(--color-text)]">{clinic.name}</p>
                <p className="truncate text-[13px] text-[var(--color-text-muted)]">
                  {clinic.location}, {clinic.city}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OnboardClinicForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const canSubmit = name.trim() && location.trim() && city.trim() && adminName.trim() && adminEmail.trim() && adminPassword.trim()

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onboardClinic({ name: name.trim(), location: location.trim(), city: city.trim(), adminName: adminName.trim(), adminEmail: adminEmail.trim(), adminPassword })
      setCreated({ email: adminEmail.trim(), password: adminPassword })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this clinic. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-accent-200)] bg-[var(--color-accent-50)] p-5">
        <p className="font-display text-base font-bold text-[var(--color-accent-700)]">Clinic created</p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Give these sign-in details to the clinic — this is the only time the password is shown.
        </p>
        <div className="mt-3 flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-4 py-3">
          <div className="text-sm">
            <p className="font-semibold text-[var(--color-text)]">{created.email}</p>
            <p className="tabular-nums text-[var(--color-text-muted)]">{created.password}</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(`${created.email} / ${created.password}`).catch(() => {})
              setCopied(true)
            }}
            className="press-scale flex shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-3 py-1.5 text-[12px] font-bold text-[var(--color-text)]"
          >
            {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <Button className="mt-4" onClick={onDone}>
          Done
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="mb-3 font-display text-base font-bold text-[var(--color-text)]">Onboard a new clinic</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Clinic name" value={name} onChange={setName} />
        <Field label="City" value={city} onChange={setCity} />
        <Field label="Location / address" value={location} onChange={setLocation} className="sm:col-span-2" />
        <Field label="Admin name" value={adminName} onChange={setAdminName} />
        <Field label="Admin email" value={adminEmail} onChange={setAdminEmail} type="email" />
        <Field label="Admin password" value={adminPassword} onChange={setAdminPassword} className="sm:col-span-2" />
      </div>
      {error && <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}
      <Button className="mt-4" disabled={!canSubmit || submitting} onClick={submit}>
        {submitting ? 'Creating…' : 'Create clinic'}
      </Button>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  className?: string
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2.5 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
      />
    </label>
  )
}
