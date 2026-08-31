import { Bell } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchNotifications } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'

const TYPE_LABEL: Record<string, string> = {
  clinic_onboarded: 'Hospital onboarded',
  staff_account_created: 'Staff account created',
  doctor_account_created: 'Doctor account created',
  refund_issued: 'Refund issued',
  coupon_created: 'Coupon created',
}

/**
 * Full activity feed — dual-routed at /staff/notifications (a hospital's
 * own CLINIC-scope events) and /admin/notifications (platform-wide
 * events), same backend scoping GET /notifications already applies by
 * role. NotificationBell is the quick-glance version of this same data.
 */
export function StaffNotificationsPage() {
  const { data, loading, error } = usePolling(fetchNotifications, 20_000)

  if (loading && !data) {
    return <div className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />
  }
  if (error && !data) return <ErrorState message={error} />
  if (!data) return null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)] sm:text-[28px]">Notifications</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">A running log of the notable things that happened here.</p>
      </div>

      {data.notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing yet" description="Notable events like onboarding, staff created, refunds, and coupons will show up here as they happen." />
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="divide-y divide-[var(--color-border)]">
            {data.notifications.map((n) => (
              <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-bold text-[var(--color-text)]">{n.message}</p>
                  <p className="text-[12px] text-[var(--color-text-faint)]">{TYPE_LABEL[n.type] ?? n.type}</p>
                </div>
                <span className="text-[12px] text-[var(--color-text-faint)]">{new Date(n.createdAt).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
