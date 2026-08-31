/** A minimal, real promo-code system — a code, a discount, and where it
 * applies. No fraud/abuse detection beyond `maxUses`; no per-patient
 * usage cap (that needs patient accounts, already out of scope — see
 * types/index.ts's own header). Never hard-deleted, matching this
 * project's "nothing is ever deleted" rule (decisions log §10) — a
 * retired coupon is `active: false`, still visible in history. */

export type CouponDiscountType = 'PERCENT' | 'FLAT'
export type CouponScope = 'PLATFORM' | 'CLINIC'
export type CouponAppliesTo = 'PLATFORM_FEE' | 'HOSPITAL_FEE' | 'BOTH'

export interface Coupon {
  id: string
  code: string
  discountType: CouponDiscountType
  /** A percentage (0-100) if discountType is PERCENT, an INR amount if FLAT. */
  discountValue: number
  scope: CouponScope
  /** Set only when scope === 'CLINIC'. */
  clinicId?: string
  appliesTo: CouponAppliesTo
  active: boolean
  maxUses?: number
  usedCount: number
  createdAt: string
  createdBy: string
}
