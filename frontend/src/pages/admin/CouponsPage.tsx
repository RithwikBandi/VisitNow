import { Plus, Ticket } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { createCoupon, fetchCoupons, setCouponActive } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { ApiError } from '../../lib/types'
import type { Coupon } from '../../lib/api'

/**
 * Platform coupon management — a real, working promo-code system: a
 * code, a discount, where it applies, redeemed for real on
 * TokenPaymentPage (see queueEngine.computeDiscount for the actual
 * math). Gated on the 'coupons' module (App.tsx wraps this route in
 * RequirePermission).
 */
export function CouponsPage() {
  const { data, loading, error, refresh } = usePolling(fetchCoupons, 30_000)
  const [showForm, setShowForm] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  if (loading && !data) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  const toggle = async (coupon: Coupon) => {
    setActionError(null)
    try {
      await setCouponActive(coupon.id, !coupon.active)
      refresh()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update this coupon.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text)] sm:text-[28px]">Coupons</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Promo codes patients can redeem at checkout.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} aria-hidden="true" />
          New coupon
        </Button>
      </div>

      {showForm && (
        <CreateCouponForm
          onDone={() => {
            setShowForm(false)
            refresh()
          }}
        />
      )}
      {actionError && <ErrorState message={actionError} />}

      {data.coupons.length === 0 ? (
        <EmptyState icon={Ticket} title="No coupons yet" description="Create one above. Patients can redeem it at checkout on their token payment page." />
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="divide-y divide-[var(--color-border)]">
            {data.coupons.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="tabular-nums font-display text-base font-bold text-[var(--color-text)]">{c.code}</p>
                  <p className="text-[12px] text-[var(--color-text-faint)]">
                    {c.discountType === 'PERCENT' ? `${c.discountValue}% off` : `₹${c.discountValue} off`} · {c.appliesTo.replace('_', ' ').toLowerCase()} ·{' '}
                    {c.scope === 'PLATFORM' ? 'all clinics' : 'one clinic'} · used {c.usedCount}
                    {c.maxUses ? `/${c.maxUses}` : ''} times
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={c.active ? 'success' : 'neutral'}>{c.active ? 'Active' : 'Retired'}</Badge>
                  <button onClick={() => toggle(c)} className="press-scale rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-3 py-1.5 text-[12px] font-bold text-[var(--color-text)]">
                    {c.active ? 'Retire' : 'Reactivate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CreateCouponForm({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FLAT'>('PERCENT')
  const [discountValue, setDiscountValue] = useState(10)
  const [appliesTo, setAppliesTo] = useState<'PLATFORM_FEE' | 'HOSPITAL_FEE' | 'BOTH'>('BOTH')
  const [maxUses, setMaxUses] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!code.trim() || discountValue <= 0) return
    setSubmitting(true)
    setError(null)
    try {
      await createCoupon({
        code: code.trim(),
        discountType,
        discountValue,
        scope: 'PLATFORM',
        appliesTo,
        maxUses: maxUses === '' ? undefined : maxUses,
      })
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this coupon.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <p className="mb-3 font-display text-base font-bold text-[var(--color-text)]">New coupon</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WELCOME20"
            className="rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] px-4 py-2.5 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Discount</span>
          <div className="flex gap-2">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'PERCENT' | 'FLAT')}
              className="rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
            >
              <option value="PERCENT">%</option>
              <option value="FLAT">₹ flat</option>
            </select>
            <input
              type="number"
              min={1}
              value={discountValue}
              onChange={(e) => setDiscountValue(Math.max(1, Number(e.target.value) || 0))}
              className="w-full min-w-0 rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] px-4 py-2.5 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Applies to</span>
          <select
            value={appliesTo}
            onChange={(e) => setAppliesTo(e.target.value as typeof appliesTo)}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 py-2.5 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
          >
            <option value="BOTH">Clinic fee + platform fee</option>
            <option value="HOSPITAL_FEE">Clinic fee only</option>
            <option value="PLATFORM_FEE">Platform fee only</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-faint)]">Max uses (optional)</span>
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value ? Math.max(1, Number(e.target.value)) : '')}
            placeholder="Unlimited"
            className="rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] px-4 py-2.5 text-[15px] focus:border-[var(--color-brand-400)] focus:outline-none"
          />
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}
      <Button className="mt-4" disabled={!code.trim() || discountValue <= 0 || submitting} onClick={submit}>
        {submitting ? 'Creating…' : 'Create coupon'}
      </Button>
    </div>
  )
}
