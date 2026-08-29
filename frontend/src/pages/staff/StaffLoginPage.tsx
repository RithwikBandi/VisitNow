import { Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { trySetStaffAuthed } from '../../lib/staffAuth'

export function StaffLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/staff'

  const submit = () => {
    if (trySetStaffAuthed(passcode)) {
      navigate(from, { replace: true })
    } else {
      setError('That access code isn’t right. Check with your clinic administrator.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-brand-800)] px-5">
      <div className="w-full max-w-sm rounded-[var(--radius-xl)] bg-white p-8 shadow-[var(--shadow-lg)]">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
            <Lock size={18} aria-hidden="true" />
          </div>
          <h1 className="font-display text-xl font-semibold text-[var(--color-text)]">Staff sign-in</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            This area is for clinic and hospital staff only. Enter your access code to continue.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Access code"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-4 py-3 text-center text-lg tracking-widest focus:border-[var(--color-brand-400)] focus:outline-none"
          />
          {error && <p className="text-center text-sm text-[var(--color-danger)]">{error}</p>}
          <Button size="lg" onClick={submit} disabled={!passcode.trim()}>
            Sign in
          </Button>
        </div>

        <Link
          to="/"
          className="mt-6 block text-center text-xs font-semibold text-[var(--color-text-faint)] transition-colors hover:text-[var(--color-brand-700)]"
        >
          ← I'm a patient, take me back
        </Link>
      </div>
    </div>
  )
}
