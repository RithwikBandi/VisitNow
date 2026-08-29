import { ChevronRight, FileText, HelpCircle, LogOut, Pencil, ShieldCheck, Trash2, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { clearPatientIdentity, getPatientIdentity } from '../../lib/patientIdentity'

/** Only the options the product actually has right now (brief §33) — no
 * invented settings pages just to look fuller. */
export function ProfilePage() {
  const navigate = useNavigate()
  const identity = getPatientIdentity()

  const logout = () => {
    clearPatientIdentity()
    navigate('/auth', { replace: true })
  }

  return (
    <div className="animate-rise-in mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)]">
          <User size={24} aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-lg font-bold text-[var(--color-text)]">{identity?.name ?? 'Guest'}</p>
          {identity?.phone && <p className="text-sm text-[var(--color-text-muted)]">{identity.phone}</p>}
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <MenuLink to="/profile/edit" icon={Pencil} label="Edit Profile" />
        <MenuLink to="/profile/privacy" icon={ShieldCheck} label="Privacy Policy" />
        <MenuLink to="/profile/terms" icon={FileText} label="Terms & Conditions" />
        <MenuLink to="/profile/contact" icon={HelpCircle} label="Contact Us" />
        <MenuLink to="/profile/delete" icon={Trash2} label="Delete Profile" danger last />
      </div>

      <button
        onClick={logout}
        className="flex items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-3.5 text-sm font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-danger)]/40 hover:text-[var(--color-danger)]"
      >
        <LogOut size={16} aria-hidden="true" />
        Logout
      </button>
    </div>
  )
}

function MenuLink({
  to,
  icon: Icon,
  label,
  danger,
  last,
}: {
  to: string
  icon: typeof User
  label: string
  danger?: boolean
  last?: boolean
}) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-brand-50)]/60 ${!last ? 'border-b border-[var(--color-border)]' : ''}`}
    >
      <Icon size={17} className={danger ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'} aria-hidden="true" />
      <span className={`flex-1 text-sm font-semibold ${danger ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)]'}`}>{label}</span>
      <ChevronRight size={16} className="text-[var(--color-text-faint)]" aria-hidden="true" />
    </button>
  )
}
