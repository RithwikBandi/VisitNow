/** One function, called from the real event sites as each feature that
 * generates a notable event lands (admin.ts's onboarding/staff-creation
 * routes, queueEntries.ts's refund route, coupons.ts's create route) —
 * wired in as those routes are built, not retrofitted afterward. See
 * types/notification.ts for what stays deliberately out of scope
 * (real push/SMS/email). Deliberately not wired to fee collection or
 * ordinary queue actions — those happen constantly and would drown out
 * anything actually worth a human noticing in the feed. */
import { nextId, notifications } from './store.js'
import type { NotificationEvent, NotificationScope, NotificationType } from '../types/notification.js'

export function emit(
  scope: NotificationScope,
  type: NotificationType,
  message: string,
  opts?: { clinicId?: string; actorAccountId?: string },
): NotificationEvent {
  const event: NotificationEvent = {
    id: nextId('notif'),
    scope,
    type,
    message,
    createdAt: new Date().toISOString(),
    clinicId: opts?.clinicId,
    actorAccountId: opts?.actorAccountId,
  }
  notifications.set(event.id, event)
  return event
}
