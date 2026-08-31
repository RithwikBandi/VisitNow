/** Coupon validation (public — the same trust model as online token
 * creation itself, see sessions.ts) and admin CRUD (platform-only,
 * gated on the 'coupons' module). */
import { Router } from 'express'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { emit } from '../store/notify.js'
import { clinics, coupons, couponByCode, nextId, sessions } from '../store/store.js'
import { computeDiscount } from '../store/queueEngine.js'
import type { Coupon, CouponAppliesTo, CouponDiscountType, CouponScope } from '../types/coupon.js'

export const couponsRouter = Router()

/** A patient's "apply coupon" step on TokenPaymentPage calls this before
 * paying, to show the discounted total — the same amount generateToken
 * will independently recompute and apply server-side when the token is
 * actually created, so this is a preview, never the source of truth. */
couponsRouter.get('/coupons/validate', (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : ''
  const session = sessions.get(sessionId)
  if (!session) return res.status(404).json({ error: 'No such session.' })

  const coupon = couponByCode(code)
  if (!coupon) return res.status(404).json({ error: 'Invalid coupon code.' })

  try {
    const discount = computeDiscount(coupon, session)
    res.json({ coupon, discount })
  } catch (err) {
    res.status(422).json({ error: (err as Error).message })
  }
})

couponsRouter.get('/admin/coupons', requireAuth, requirePermission('coupons'), (_req, res) => {
  res.json({ coupons: [...coupons.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) })
})

couponsRouter.post('/admin/coupons', requireAuth, requirePermission('coupons'), (req, res) => {
  const { code, discountType, discountValue, scope, clinicId, appliesTo, maxUses } = req.body ?? {}
  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(422).json({ error: 'code is required.' })
  }
  const validDiscountTypes: CouponDiscountType[] = ['PERCENT', 'FLAT']
  if (!validDiscountTypes.includes(discountType)) {
    return res.status(422).json({ error: "discountType must be 'PERCENT' or 'FLAT'." })
  }
  if (typeof discountValue !== 'number' || discountValue <= 0) {
    return res.status(422).json({ error: 'discountValue must be a positive number.' })
  }
  const validScopes: CouponScope[] = ['PLATFORM', 'CLINIC']
  if (!validScopes.includes(scope)) {
    return res.status(422).json({ error: "scope must be 'PLATFORM' or 'CLINIC'." })
  }
  if (scope === 'CLINIC' && (!clinicId || !clinics.get(clinicId))) {
    return res.status(422).json({ error: 'A valid clinicId is required when scope is CLINIC.' })
  }
  const validAppliesTo: CouponAppliesTo[] = ['PLATFORM_FEE', 'HOSPITAL_FEE', 'BOTH']
  if (!validAppliesTo.includes(appliesTo)) {
    return res.status(422).json({ error: "appliesTo must be 'PLATFORM_FEE', 'HOSPITAL_FEE', or 'BOTH'." })
  }
  if (couponByCode(code)) {
    return res.status(422).json({ error: 'A coupon with that code already exists.' })
  }

  const coupon: Coupon = {
    id: nextId('coupon'),
    code: code.trim().toUpperCase(),
    discountType,
    discountValue,
    scope,
    clinicId: scope === 'CLINIC' ? clinicId : undefined,
    appliesTo,
    active: true,
    maxUses: typeof maxUses === 'number' && maxUses > 0 ? maxUses : undefined,
    usedCount: 0,
    createdAt: new Date().toISOString(),
    createdBy: req.account!.displayName,
  }
  coupons.set(coupon.id, coupon)
  emit('PLATFORM', 'coupon_created', `Coupon ${coupon.code} created`, { actorAccountId: req.account!.id })
  res.status(201).json({ coupon })
})

/** Toggling `active` is the only edit this phase supports — retiring a
 * coupon, not rewriting its terms after it may already have been used
 * (changing discountValue on a coupon with usedCount > 0 would make
 * past redemptions and the coupon's own displayed terms disagree). No
 * hard delete, matching "nothing is ever deleted" (decisions log §10). */
couponsRouter.patch('/admin/coupons/:id', requireAuth, requirePermission('coupons'), (req, res) => {
  const coupon = coupons.get(req.params.id as string)
  if (!coupon) return res.status(404).json({ error: 'No such coupon.' })
  const { active } = req.body ?? {}
  if (typeof active !== 'boolean') return res.status(422).json({ error: 'active must be a boolean.' })
  coupon.active = active
  res.json({ coupon })
})
