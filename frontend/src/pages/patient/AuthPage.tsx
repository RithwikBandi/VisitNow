import { ArrowLeft, Building2, LogIn, User, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { VisitNowMark } from '../../components/brand/VisitNowMark'
import { Button } from '../../components/ui/Button'
import { SplitFlapNumber } from '../../components/ui/SplitFlapNumber'
import { setPatientIdentity } from '../../lib/patientIdentity'

type Mode = 'login' | 'register' | 'guest'

const MODES: { id: Mode; label: string; icon: typeof LogIn }[] = [
  { id: 'guest', label: 'Guest', icon: User },
  { id: 'login', label: 'Log in', icon: LogIn },
  { id: 'register', label: 'Register', icon: UserPlus },
]

/**
 * Login, Register, and Guest all end up in exactly the same place: a
 * name (and, for Login/Register, a phone number) saved locally, no
 * password checked against anything. See
 * docs/VISITNOW_PRODUCT_DECISIONS.md §10 — there's deliberately no fake
 * password field here; a password box that doesn't actually get
 * verified would be UI that lies about what it does, which is worse
 * than just not including it.
 *
 * A split panel on desktop, not a narrow card floating in a sea of
 * empty space — the previous version was exactly the "phone screen
 * stretched onto a desktop page" mistake the rebuild brief calls out
 * (§19/§20). The left panel doubles as a second, clearly visible entry
 * point for hospital/clinic staff, per the brief's explicit ask that
 * both audiences be reachable from wherever a patient lands too.
 */
export function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('guest')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const canContinue =
    mode === 'guest' ? true : mode === 'login' ? name.trim().length > 0 : name.trim().length > 0 && phone.trim().length >= 10

  const continueWith = (identity: { name: string; phone?: string }) => {
    setPatientIdentity(identity)
    navigate('/home', { replace: true })
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <BrandPanel />

      <div className="flex flex-col px-5 py-6 sm:px-10 sm:py-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="press-scale flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <ArrowLeft size={16} aria-hidden="true" />
            VisitNow
          </Link>
          <Link to="/staff/login" className="press-scale hidden items-center gap-1.5 text-[13px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-brand-700)] sm:flex">
            <Building2 size={14} aria-hidden="true" />
            Hospital &amp; clinic sign in
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="flex w-full max-w-sm flex-col gap-7">
            <div className="flex flex-col gap-2 lg:hidden">
              <VisitNowMark size={36} />
            </div>
            <div>
              <h1 className="font-display text-[26px] font-extrabold tracking-[-0.012em] text-[var(--color-text)]">Welcome to VisitNow</h1>
              <p className="mt-1 text-[15px] text-[var(--color-text-muted)]">Skip the wait at your local doctor's queue.</p>
            </div>

            {/* Three real, equally-weighted choices — not a thin two-way
                tab with Guest demoted to an afterthought link below a
                divider. Guest is first because it's genuinely the
                lowest-friction path this prototype has (§10: it's
                functionally identical to Login/Register anyway, no
                password is checked against anything either way). */}
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  className={`press-scale flex flex-col items-center gap-1.5 rounded-[var(--radius-btn)] border-2 py-3 text-[13px] font-bold ${
                    mode === id
                      ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-brand-300)]'
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            {mode === 'guest' ? (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                  Browse, get tokens, and track queues right away. You can register a name and number
                  later from Profile, any time.
                </p>
                <Button size="lg" onClick={() => continueWith({ name: 'Guest' })}>
                  Continue as guest
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Field label="Full name" value={name} onChange={setName} placeholder="e.g. Aditi Rao" />
                {mode === 'register' && (
                  <Field label="Phone number" value={phone} onChange={setPhone} placeholder="10-digit mobile number" type="tel" />
                )}
                <Button size="lg" disabled={!canContinue} onClick={() => continueWith({ name: name.trim(), phone: phone.trim() || undefined })}>
                  {mode === 'login' ? 'Log in' : 'Create account'}
                </Button>
              </div>
            )}

            <Link to="/staff/login" className="press-scale flex items-center justify-center gap-1.5 text-[13px] font-bold text-[var(--color-text-faint)] hover:text-[var(--color-brand-700)] sm:hidden">
              <Building2 size={13} aria-hidden="true" />
              Are you clinic or hospital staff? Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/** The desktop-only brand half — built from the same live-queue
 * vocabulary as the landing page hero (docs/DESIGN.md), not empty
 * decorative space. Also carries the "are you staff" entry point in a
 * place a patient auth screen would otherwise never mention it. */
function BrandPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--color-ink)] p-10 text-white lg:flex">
      <Link to="/" className="flex items-center gap-2">
        <VisitNowMark size={30} />
        <span className="font-display text-lg font-extrabold tracking-tight">VisitNow</span>
      </Link>

      <div className="flex flex-col gap-6">
        <p className="max-w-sm font-display text-[32px] font-extrabold leading-[1.1] tracking-[-0.022em]">
          Get your token. Watch it move. Walk in when it's close.
        </p>

        <div className="ticket-card w-full max-w-xs" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between px-5 pb-3 pt-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/50">Now serving</span>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent-400)]" aria-hidden="true" />
          </div>
          <div className="relative border-t border-dashed border-white/15">
            <span aria-hidden="true" className="absolute -left-[10px] -top-[10px] h-5 w-5 rounded-full bg-[var(--color-ink)]" />
            <span aria-hidden="true" className="absolute -right-[10px] -top-[10px] h-5 w-5 rounded-full bg-[var(--color-ink)]" />
          </div>
          <div className="px-5 py-6 text-center">
            <SplitFlapNumber value={17} minDigits={2} className="font-display text-[56px] font-black leading-none tracking-[-0.022em] text-[var(--color-accent-400)]" />
            <p className="mt-2 text-[12px] font-semibold text-white/50">Dr. Ashwin Kumar · Sunrise Multispecialty Clinic</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-6">
        <p className="text-[13px] text-white/50">Live in Hyderabad, Warangal &amp; Bengaluru</p>
        <Link to="/staff/login" className="press-scale flex items-center gap-1.5 text-[13px] font-bold text-white/80 hover:text-white">
          <Building2 size={14} aria-hidden="true" />
          Hospital &amp; clinic sign in
        </Link>
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
        className="rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-brand-400)] focus:outline-none"
      />
    </label>
  )
}
