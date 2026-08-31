import { Building2, Check, Copy, Plus, ShieldAlert, UserCog } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PermissionEditor } from '../../components/admin/PermissionEditor'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { createSuperStaff, fetchPlatformDashboard, fetchSuperStaff, onboardClinic, updateSuperStaffPermissions } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { ApiError } from '../../lib/types'
import { getCachedAccount } from '../../lib/auth'
import { hasPermission } from '../../components/staff/RequirePermission'
import { PLATFORM_MODULES } from '../../lib/accountTypes'
import type { PublicAccount } from '../../lib/accountTypes'

/**
 * Tenant management — the super_admin's one job this phase: bring a new
 * clinic/hospital onto the platform, and see the tenant list. Onboarding
 * shows the new admin's password once, on screen, with a copy button —
 * no email-sending in this phase (see the multi-tenant auth plan's
 * non-goals), so this is the only place that password is ever visible.
 *
 * Gated on the 'hospitals' module — a super_admin_staff account without
 * it (e.g. the seeded "VisitNow Ops — Payments" account) lands on /admin
 * after login (their home route) but sees a clear "you don't have this"
 * message rather than a scary fetch-failed error, even though the
 * underlying GET /dashboard/platform does genuinely 403 for them.
 */
export function SuperAdminPage() {
  const account = getCachedAccount()
  const canViewHospitals = hasPermission('hospitals')
  const { data, loading, error, refresh } = usePolling(fetchPlatformDashboard, 30_000)
  const [showForm, setShowForm] = useState(false)
  const [city, setCity] = useState('')

  const cities = useMemo(() => [...new Set((data?.clinics ?? []).map((c) => c.city))].sort(), [data])
  const visibleClinics = useMemo(() => (city ? (data?.clinics ?? []).filter((c) => c.city === city) : data?.clinics ?? []), [data, city])

  if (!canViewHospitals) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No access to Hospitals"
        description="Your account doesn't have the Hospitals permission. Ask a super admin to grant it if you need to view or onboard tenants."
      />
    )
  }

  if (loading && !data) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text)] sm:text-[28px]">Tenants</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {visibleClinics.length} of {data.clinics.length} clinics{city ? ` in ${city}` : ' registered on VisitNow'}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* "Select a location and see data for that location" — a
              super_admin's own spec. Client-side filter over data
              already on the page (no new endpoint needed for the
              tenants list); the same city also scopes the revenue
              report on /admin/revenue via ?city=, see StaffRevenuePage. */}
          {cities.length > 1 && (
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-[13px] font-semibold focus:border-[var(--color-brand-400)] focus:outline-none"
            >
              <option value="">All locations</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} aria-hidden="true" />
            Onboard clinic
          </Button>
        </div>
      </div>

      {showForm && <OnboardClinicForm onDone={() => { setShowForm(false); refresh() }} />}

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="divide-y divide-[var(--color-border)]">
          {visibleClinics.map((clinic) => (
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

      {/* super_admin only, always — never shown to a super_admin_staff
          account even with the 'users' module, matching the backend's
          own anti-escalation rule (only the real super_admin can create
          or edit platform staff permissions, since that account could
          otherwise grant itself more than it has). */}
      {account?.role === 'super_admin' && <PlatformStaffSection />}
    </div>
  )
}

/**
 * Platform staff management — the "Staff A -> Hospitals + Doctors" /
 * "Staff C -> Users + CRM" examples from the role spec, made real: create
 * a super_admin_staff login, hand it exactly the modules it should have,
 * change that list later. Every route this calls is super_admin-only
 * server-side regardless of what this page shows.
 */
function PlatformStaffSection() {
  const { data, loading, error, refresh } = usePolling(fetchSuperStaff, 30_000)
  const [showForm, setShowForm] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const savePermissions = async (accountId: string, permissions: string[]) => {
    setSavingId(accountId)
    setActionError(null)
    try {
      await updateSuperStaffPermissions(accountId, permissions)
      refresh()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update permissions.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 font-display text-lg font-bold text-[var(--color-text)]">
            <UserCog size={17} aria-hidden="true" />
            Platform staff
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">VisitNow Ops accounts and exactly which modules each one holds.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} aria-hidden="true" />
          New staff account
        </Button>
      </div>

      {showForm && (
        <NewSuperStaffForm
          onDone={() => {
            setShowForm(false)
            refresh()
          }}
        />
      )}
      {actionError && <ErrorState message={actionError} />}

      {loading && !data ? (
        <div className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />
      ) : error && !data ? (
        <ErrorState message={error} />
      ) : !data || data.staff.length === 0 ? (
        <EmptyState icon={UserCog} title="No platform staff yet" description="Create one above and hand it exactly the modules it should have." />
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="divide-y divide-[var(--color-border)]">
            {data.staff.map((s: PublicAccount) => (
              <div key={s.id} className="flex flex-col gap-3 px-5 py-4">
                <div>
                  <p className="font-semibold text-[var(--color-text)]">{s.displayName}</p>
                  <p className="text-[12px] text-[var(--color-text-faint)]">{s.email}</p>
                </div>
                <PermissionEditor
                  modules={PLATFORM_MODULES}
                  selected={s.permissions ?? []}
                  saving={savingId === s.id}
                  onSave={(permissions) => savePermissions(s.id, permissions)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function NewSuperStaffForm({ onDone }: { onDone: () => void }) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = displayName.trim() && email.trim() && password.trim()

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await createSuperStaff({ displayName: displayName.trim(), email: email.trim(), password, permissions: [] })
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="mb-3 font-display text-base font-bold text-[var(--color-text)]">New platform staff account</p>
      <p className="mb-3 text-[13px] text-[var(--color-text-muted)]">Created with no modules. Grant them below once the account exists.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Name" value={displayName} onChange={setDisplayName} />
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field label="Password" value={password} onChange={setPassword} className="sm:col-span-2" />
      </div>
      {error && <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}
      <Button className="mt-4" disabled={!canSubmit || submitting} onClick={submit}>
        {submitting ? 'Creating…' : 'Create account'}
      </Button>
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
          Give these sign-in details to the clinic. This is the only time the password is shown.
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
