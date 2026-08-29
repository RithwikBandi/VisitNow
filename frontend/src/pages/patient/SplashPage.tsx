import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { VisitNowMark } from '../../components/brand/VisitNowMark'
import { getPatientIdentity } from '../../lib/patientIdentity'

/** Brief, branded, and functional — not decoration for its own sake. The
 * pause is exactly long enough to read the tagline once and no more; it
 * also gives the identity check (localStorage) a beat to resolve before
 * routing, so there's no flash of the auth screen for a returning
 * patient who's about to be sent straight to Home anyway. */
export function SplashPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const identity = getPatientIdentity()
    const timer = window.setTimeout(() => {
      navigate(identity ? '/home' : '/auth', { replace: true })
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [navigate])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-brand-600)]">
      <div className="animate-splash-mark rounded-[28px] bg-white p-5 shadow-[var(--shadow-lg)]">
        <VisitNowMark size={56} />
      </div>
      <div className="text-center">
        <p className="font-display text-2xl font-bold tracking-tight text-white">VisitNow</p>
        <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.2em] text-white/70">Skip the wait</p>
      </div>
      <div className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white" style={{ animation: 'progress-fill 1.1s linear forwards' }} />
      </div>
    </div>
  )
}
