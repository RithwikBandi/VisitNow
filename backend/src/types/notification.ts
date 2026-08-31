/** An in-app, in-memory activity feed — not a push/SMS/email delivery
 * system (this prototype has no way to actually deliver those; see the
 * plan's non-goals). One real event per notable thing that already
 * happens in the system (a clinic onboarded, a staff/doctor account
 * created, a refund issued, a coupon created), not a synthetic feed. */

export type NotificationScope = 'PLATFORM' | 'CLINIC'

export type NotificationType =
  | 'clinic_onboarded'
  | 'staff_account_created'
  | 'doctor_account_created'
  | 'refund_issued'
  | 'coupon_created'

export interface NotificationEvent {
  id: string
  scope: NotificationScope
  /** Set only when scope === 'CLINIC'. */
  clinicId?: string
  type: NotificationType
  message: string
  createdAt: string
  /** The account whose action triggered this event, if any — not who
   * it's *for*, who caused it. Optional because a future system event
   * (e.g. a scheduled job) might not have an actor. */
  actorAccountId?: string
}
