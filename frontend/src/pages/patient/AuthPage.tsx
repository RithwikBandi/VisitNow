import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { VisitNowMark } from '../../components/brand/VisitNowMark'
import { Button } from '../../components/ui/Button'
import { setPatientIdentity } from '../../lib/patientIdentity'

type Mode = 'login' | 'register'

/**
 * Login, Register, and Guest all end up in exactly the same place: a
 * name (and, for Login/Register, a phone number) saved locally, no
 * password checked against anything. See
 * docs/VISITNOW_PRODUCT_DECISIONS.md §10 — there's deliberately no fake
 * password field here; a password box that doesn't actually get
 * verified would be UI that lies about what it does, which is worse
 * than just not including it.
 */
export function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const canContinue = mode === 'login' ? name.trim().length > 0 : name.trim().length > 0 && phone.trim().length >= 10

  const continueWith = (identity: { name: string; phone?: string }) => {
    setPatientIdentity(identity)
    navigate('/home', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] px-5 py-10 sm:items-center sm:justify-center">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <VisitNowMark size={40} />
          <div>
            <h1 className="font-display text-xl font-bold text-[var(--color-text)]">Welcome to VisitNow</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Skip the wait at your local doctor's queue.</p>
          </div>
        </div>

        <div className="flex rounded-full bg-[var(--color-border)]/60 p-1">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 rounded-full py-2 text-sm font-bold transition-colors ${mode === 'login' ? 'bg-[var(--color-surface)] text-[var(--color-brand-700)] shadow-sm' : 'text-[var(--color-text-faint)]'}`}
          >
            Log in
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 rounded-full py-2 text-sm font-bold transition-colors ${mode === 'register' ? 'bg-[var(--color-surface)] text-[var(--color-brand-700)] shadow-sm' : 'text-[var(--color-text-faint)]'}`}
          >
            Register
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Field label="Full name" value={name} onChange={setName} placeholder="e.g. Aditi Rao" />
          {mode === 'register' && (
            <Field label="Phone number" value={phone} onChange={setPhone} placeholder="10-digit mobile number" type="tel" />
          )}
          <Button
            size="lg"
            disabled={!canContinue}
            onClick={() => continueWith({ name: name.trim(), phone: phone.trim() || undefined })}
          >
            {mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold text-[var(--color-text-faint)]">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          OR
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        <button
          onClick={() => continueWith({ name: 'Guest' })}
          className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-3 text-sm font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-brand-300)]"
        >
          Continue as Guest
        </button>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-brand-400)] focus:outline-none"
      />
    </label>
  )
}
