import { Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { PermissionEditor } from '../../components/admin/PermissionEditor'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { createClinicStaff, fetchClinicStaff, updateClinicStaffPermissions } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { getCachedAccount } from '../../lib/auth'
import { ApiError } from '../../lib/types'
import { HOSPITAL_MODULES } from '../../lib/accountTypes'
import type { PublicAccount } from '../../lib/accountTypes'

/**
 * A hospital_admin's own team roster — the page that finally gives
 * createClinicStaff (in the API client since the earlier auth round) a
 * real caller: reception, payments-desk, queue-desk logins, each handed
 * exactly the modules that job needs, matching the role spec's own
 * examples ("Reception Staff -> offline patients + appointments +
 * queue"). hospital_admin-only, own clinic only — enforced server-side
 * regardless of what this page shows.
 */
export function StaffTeamPage() {
  const account = getCachedAccount()
  const clinicId = account?.clinicId
  const { data, loading, error, refresh } = usePolling(() => fetchClinicStaff(clinicId!), 30_000)
  const [showForm, setShowForm] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!clinicId) return <ErrorState message="No clinic linked to this account." />

  const savePermissions = async (accountId: string, permissions: string[]) => {
    setSavingId(accountId)
    setActionError(null)
    try {
      await updateClinicStaffPermissions(clinicId, accountId, permissions)
      refresh()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update permissions.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text)] sm:text-[28px]">Team</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Staff logins for this clinic, and exactly what each one can do.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} aria-hidden="true" />
          New staff account
        </Button>
      </div>

      {showForm && (
        <NewStaffForm
          clinicId={clinicId}
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
        <EmptyState icon={Users} title="No staff accounts yet" description="Create one above and hand it exactly the modules that role needs." />
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
                  modules={HOSPITAL_MODULES}
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

function NewStaffForm({ clinicId, onDone }: { clinicId: string; onDone: () => void }) {
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
      await createClinicStaff(clinicId, { displayName: displayName.trim(), email: email.trim(), password, permissions: [] })
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="mb-3 font-display text-base font-bold text-[var(--color-text)]">New staff account</p>
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
