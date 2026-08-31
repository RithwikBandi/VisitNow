import { Check, CreditCard, Ticket, Wallet, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackLink } from '../../components/patient/BackLink'
import { PaymentGatewayModal } from '../../components/patient/PaymentGatewayModal'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchSession, generateToken, validateCoupon } from '../../lib/api'
import type { CouponDiscount } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { getPatientIdentity } from '../../lib/patientIdentity'
import { addMyVisitId } from '../../lib/myVisits'
import { ApiError, PLATFORM_FEE_INR, type PaymentMethod } from '../../lib/types'

/**
 * The fee breakdown + payment-method choice — deliberately keeps the
 * clinic's token fee and VisitNow's own ₹9 platform fee visible as two
 * separate numbers all the way through, never collapsed into one total
 * before the patient has chosen how to pay (see decisions log §9-13).
 * "Payment" here is simulated — there's no real gateway in this
 * prototype (§8.7 in the decisions log) — but the two-step feel (choose
 * → confirm → brief processing state) is real UI, not a static mock.
 */
export function TokenPaymentPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const fetcher = useCallback(() => fetchSession(sessionId!), [sessionId])
  const { data, loading, error } = usePolling(fetcher, 30_000, sessionId)

  const identity = getPatientIdentity()
  const [method, setMethod] = useState<PaymentMethod>('ONLINE')
  const [name, setName] = useState(identity?.name && identity.name !== 'Guest' ? identity.name : '')
  const [phone, setPhone] = useState(identity?.phone ?? '')
  const [processing, setProcessing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showGateway, setShowGateway] = useState(false)

  // Coupons are an ONLINE-only concept (see queueEngine.generateToken's
  // own comment on why) — switching to Pay at Hospital clears any
  // applied discount rather than leaving a stale one the fee math below
  // would otherwise silently keep showing.
  const [couponInput, setCouponInput] = useState('')
  const [discount, setDiscount] = useState<CouponDiscount | null>(null)
  const [couponCode, setCouponCode] = useState<string | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [applyingCoupon, setApplyingCoupon] = useState(false)

  if (loading && !data) {
    return <div className="mt-6 h-80 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-border)]/40" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const { session, doctor, clinic } = data
  const hospitalFeeFull = session.hospitalFeeAmount
  const hospitalFee = method === 'ONLINE' && discount ? Math.max(0, hospitalFeeFull - discount.hospitalDiscount) : hospitalFeeFull
  const platformFee = method === 'ONLINE' && discount ? Math.max(0, PLATFORM_FEE_INR - discount.platformDiscount) : PLATFORM_FEE_INR
  const payNow = method === 'ONLINE' ? hospitalFee + platformFee : PLATFORM_FEE_INR
  const payLater = method === 'ONLINE' ? 0 : hospitalFeeFull

  const applyCoupon = async () => {
    if (!couponInput.trim()) return
    setApplyingCoupon(true)
    setCouponError(null)
    try {
      const { coupon, discount: d } = await validateCoupon(couponInput.trim(), session.id)
      setDiscount(d)
      setCouponCode(coupon.code)
    } catch (err) {
      setDiscount(null)
      setCouponCode(null)
      setCouponError(err instanceof ApiError ? err.message : 'Invalid coupon code.')
    } finally {
      setApplyingCoupon(false)
    }
  }
  const removeCoupon = () => {
    setDiscount(null)
    setCouponCode(null)
    setCouponInput('')
    setCouponError(null)
  }

  // Opens the demo gateway rather than creating the token directly — the
  // gateway's own "Pay ₹X" is the real point of commitment now, matching
  // how an actual checkout works. Only its onSuccess actually creates
  // the token (see completeToken below).
  const openGateway = () => {
    if (!name.trim()) {
      setFormError('Enter your name to continue.')
      return
    }
    setFormError(null)
    setShowGateway(true)
  }

  const completeToken = async () => {
    setProcessing(true)
    try {
      const { entry } = await generateToken(session.id, {
        source: 'online',
        patientName: name.trim(),
        patientPhone: phone.trim() || undefined,
        paymentMethod: method,
        couponCode: method === 'ONLINE' ? (couponCode ?? undefined) : undefined,
      })
      addMyVisitId(entry.id)
      navigate(`/queue/${entry.id}/confirmed`, { replace: true })
    } catch (err) {
      setShowGateway(false)
      setProcessing(false)
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong generating your token. Please try again.')
    }
  }

  return (
    <div className="animate-rise-in mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-6">
        <BackLink />
        <div className="flex items-center gap-3.5 lg:hidden">
          {doctor.photoUrl && <img src={doctor.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-600)]">{doctor.specialty}</p>
            <h1 className="font-display text-xl font-bold text-[var(--color-text)]">{doctor.name}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {clinic.name} · {session.label}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Your details</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number (optional)"
            type="tel"
            className="rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-3 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
          />
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:hidden">
          <h2 className="mb-3 font-display text-base font-bold text-[var(--color-text)]">Fee breakdown</h2>
          <Row label="Clinic token fee" value={`₹${hospitalFeeFull}`} strike={!!discount && method === 'ONLINE'} />
          {!!discount && method === 'ONLINE' && <Row label="Clinic token fee (after coupon)" value={`₹${hospitalFee}`} />}
          <Row label="VisitNow platform fee" value={`₹${PLATFORM_FEE_INR}`} strike={!!discount && method === 'ONLINE'} />
          {!!discount && method === 'ONLINE' && <Row label="Platform fee (after coupon)" value={`₹${platformFee}`} />}
        </div>

        <div className="lg:hidden">
          <CouponField
            method={method}
            couponInput={couponInput}
            setCouponInput={setCouponInput}
            couponCode={couponCode}
            couponError={couponError}
            applyingCoupon={applyingCoupon}
            applyCoupon={applyCoupon}
            removeCoupon={removeCoupon}
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">How would you like to pay?</span>

          <PaymentOption
            icon={CreditCard}
            title="Pay token fee online"
            detail={`Pay ₹${hospitalFee + platformFee} now, in one payment`}
            selected={method === 'ONLINE'}
            onSelect={() => setMethod('ONLINE')}
          />
          <PaymentOption
            icon={Wallet}
            title="Pay at hospital"
            detail={`Pay ₹${PLATFORM_FEE_INR} now · ₹${hospitalFee} at the clinic`}
            selected={method === 'PAY_AT_HOSPITAL'}
            onSelect={() => setMethod('PAY_AT_HOSPITAL')}
          />
        </div>

        {formError && <p className="text-sm text-[var(--color-danger)]">{formError}</p>}

        <div className="sticky bottom-4 flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] lg:hidden">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Paying now</span>
            <span className="tabular-nums font-display text-lg font-bold text-[var(--color-text)]">₹{payNow}</span>
          </div>
          {payLater > 0 && (
            <div className="flex items-center justify-between text-xs text-[var(--color-text-faint)]">
              <span>Due at clinic</span>
              <span>₹{payLater}</span>
            </div>
          )}
          <Button size="lg" className="mt-1 w-full" disabled={processing} onClick={openGateway}>
            {`Pay ₹${payNow} & Get Token`}
          </Button>
        </div>
      </div>

      {/* Desktop: a real order-summary sidebar, sticky as you scroll —
          the same pattern any real checkout (Stripe, an e-commerce
          cart) uses, and the actual reason this page now uses desktop
          width instead of centering a phone-width form in it. */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 flex flex-col gap-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div className="flex items-center gap-3.5 border-b border-[var(--color-border)] pb-5">
            {doctor.photoUrl && <img src={doctor.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-600)]">{doctor.specialty}</p>
              <h1 className="font-display text-lg font-bold leading-tight text-[var(--color-text)]">{doctor.name}</h1>
              <p className="text-[13px] text-[var(--color-text-muted)]">
                {clinic.name} · {session.label}
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-sm font-bold text-[var(--color-text)]">Fee breakdown</h2>
            <Row label="Clinic token fee" value={`₹${hospitalFeeFull}`} strike={!!discount && method === 'ONLINE'} />
            {!!discount && method === 'ONLINE' && <Row label="Clinic token fee (after coupon)" value={`₹${hospitalFee}`} />}
            <Row label="VisitNow platform fee" value={`₹${PLATFORM_FEE_INR}`} strike={!!discount && method === 'ONLINE'} />
            {!!discount && method === 'ONLINE' && <Row label="Platform fee (after coupon)" value={`₹${platformFee}`} />}
          </div>

          <CouponField
            method={method}
            couponInput={couponInput}
            setCouponInput={setCouponInput}
            couponCode={couponCode}
            couponError={couponError}
            applyingCoupon={applyingCoupon}
            applyCoupon={applyCoupon}
            removeCoupon={removeCoupon}
          />

          <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">Paying now</span>
              <span className="tabular-nums font-display text-xl font-bold text-[var(--color-text)]">₹{payNow}</span>
            </div>
            {payLater > 0 && (
              <div className="flex items-center justify-between text-xs text-[var(--color-text-faint)]">
                <span>Due at clinic</span>
                <span>₹{payLater}</span>
              </div>
            )}
            <Button size="lg" className="mt-2 w-full" disabled={processing} onClick={openGateway}>
              {`Pay ₹${payNow} & Get Token`}
            </Button>
          </div>
        </div>
      </aside>

      {showGateway && <PaymentGatewayModal amount={payNow} onCancel={() => setShowGateway(false)} onSuccess={completeToken} />}
    </div>
  )
}

function Row({ label, value, strike = false }: { label: string; value: string; strike?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className={`font-semibold ${strike ? 'text-[var(--color-text-faint)] line-through' : 'text-[var(--color-text)]'}`}>{value}</span>
    </div>
  )
}

/** Redeeming a coupon is online-only (see queueEngine.generateToken's
 * own comment) — the field is still shown when "Pay at hospital" is
 * selected, just inert, so switching payment methods doesn't make it
 * mysteriously vanish; the fee rows above simply stop showing a
 * discount while it's selected. */
function CouponField({
  method,
  couponInput,
  setCouponInput,
  couponCode,
  couponError,
  applyingCoupon,
  applyCoupon,
  removeCoupon,
}: {
  method: PaymentMethod
  couponInput: string
  setCouponInput: (v: string) => void
  couponCode: string | null
  couponError: string | null
  applyingCoupon: boolean
  applyCoupon: () => void
  removeCoupon: () => void
}) {
  if (couponCode) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-[var(--radius-lg)] border border-[var(--color-accent-200)] bg-[var(--color-accent-50)] px-4 py-3">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--color-accent-700)]">
          <Ticket size={14} aria-hidden="true" />
          {couponCode} applied{method !== 'ONLINE' ? ' (online payment only)' : ''}
        </span>
        <button onClick={removeCoupon} aria-label="Remove coupon" className="press-scale text-[var(--color-accent-700)]">
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          value={couponInput}
          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
          placeholder="Coupon code"
          className="w-full min-w-0 rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2.5 text-[14px] uppercase focus:border-[var(--color-brand-400)] focus:outline-none"
        />
        <button
          onClick={applyCoupon}
          disabled={applyingCoupon || !couponInput.trim()}
          className="press-scale shrink-0 rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] px-4 py-2.5 text-[13px] font-bold text-[var(--color-text)] disabled:opacity-50"
        >
          {applyingCoupon ? 'Checking…' : 'Apply'}
        </button>
      </div>
      {couponError && <p className="text-[13px] text-[var(--color-danger)]">{couponError}</p>}
    </div>
  )
}

function PaymentOption({
  icon: Icon,
  title,
  detail,
  selected,
  onSelect,
}: {
  icon: typeof CreditCard
  title: string
  detail: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-[var(--radius-lg)] border-2 p-4 text-left transition-colors ${
        selected ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]' : 'border-[var(--color-border)] bg-[var(--color-surface)]'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          selected ? 'bg-[var(--color-brand-600)] text-white' : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
        }`}
      >
        <Icon size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[var(--color-text)]">{title}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{detail}</p>
      </div>
      {selected && (
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white">
          <Check size={12} strokeWidth={3} aria-hidden="true" />
        </div>
      )}
    </button>
  )
}
