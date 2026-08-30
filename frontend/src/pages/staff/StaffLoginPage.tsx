import { Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { homeRouteFor, login } from '../../lib/auth'
import { ApiError } from '../../lib/types'

/** One sign-in screen for all four staff-side roles — clinic admin,
 * clinic staff, doctor, and super admin all land here and get routed to
 * their own home route after a real email+password check against the
 * backend (see lib/auth.ts, backend/src/store/authEngine.ts). Replaces
 * the single shared passcode this used to be — see
 * docs/VISITNOW_PRODUCT_DECISIONS.md's multi-tenant auth section for why. */
export function StaffLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!email.trim() || !password) return
    setSubmitting(true)
    setError(null)
    try {
      const account = await login(email.trim(), password)
      navigate(homeRouteFor(account.role), { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-ink)] px-5">
      <div className="w-full max-w-sm rounded-[var(--radius-ticket)] bg-[var(--color-surface)] p-8 shadow-[var(--shadow-lg)]">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-700)]">
            <Lock size={18} aria-hidden="true" />
          </div>
          <h1 className="font-display text-xl font-bold text-[var(--color-text)]">Staff sign-in</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            For clinic and hospital staff, doctors, and VisitNow admins. Sign in with your account.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="you@clinic.demo"
            className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] px-4 py-3 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Password"
            className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] px-4 py-3 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
          />
          {error && <p className="text-center text-sm text-[var(--color-danger)]">{error}</p>}
          <Button size="lg" onClick={submit} disabled={!email.trim() || !password || submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>

        <Link
          to="/"
          className="press-scale mt-6 block text-center text-xs font-semibold text-[var(--color-text-faint)] hover:text-[var(--color-brand-700)]"
        >
          ← I'm a patient, take me back
        </Link>
      </div>
    </div>
  )
}
