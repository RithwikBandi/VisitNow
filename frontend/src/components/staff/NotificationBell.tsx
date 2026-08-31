import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCachedAccount } from '../../lib/auth'
import { fetchNotifications, type NotificationEvent } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { hasPermission } from './RequirePermission'

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.round(hr / 24)}d ago`
}

/** A read-only, in-app activity bell — no push/real-time delivery, just
 * the same 30s poll every other "feels live" surface in this app uses
 * (see usePolling's own doc comment). "Seen" is a per-account localStorage
 * timestamp, not a server-side read receipt — proportional to a feed
 * that's an in-memory log to begin with (see types/notification.ts).
 * Only rendered when the signed-in account actually holds the
 * 'notifications' module — same courtesy-hiding pattern as every other
 * nav item in StaffLayout/AdminLayout, backend re-enforces on GET
 * /notifications regardless. */
export function NotificationBell() {
  const account = getCachedAccount()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data } = usePolling(fetchNotifications, 30_000)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  if (!account || !hasPermission('notifications')) return null

  const events: NotificationEvent[] = data?.notifications ?? []
  const seenKey = `visitnow:notif-seen:${account.id}`
  const lastSeen = typeof window !== 'undefined' ? window.localStorage.getItem(seenKey) ?? '' : ''
  const unseenCount = events.filter((e) => e.createdAt > lastSeen).length

  const notificationsPath = account.role === 'super_admin' || account.role === 'super_admin_staff' ? '/admin/notifications' : '/staff/notifications'

  const toggle = () => {
    setOpen((v) => !v)
    if (!open && events[0]) {
      try {
        window.localStorage.setItem(seenKey, events[0].createdAt)
      } catch {
        // Private-mode/blocked storage — the bell just won't remember
        // "seen" across reloads, no worse than not having it.
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} className="press-scale relative flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:text-white" aria-label="Notifications">
        <Bell size={17} aria-hidden="true" />
        {unseenCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold text-white">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">Notifications</p>
          </div>
          {events.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">Nothing yet.</p>
          ) : (
            <div className="max-h-80 divide-y divide-[var(--color-border)] overflow-y-auto">
              {events.slice(0, 6).map((e) => (
                <div key={e.id} className="px-4 py-3">
                  <p className="text-[13px] font-semibold text-[var(--color-text)]">{e.message}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-text-faint)]">{timeAgo(e.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
          <Link to={notificationsPath} onClick={() => setOpen(false)} className="block border-t border-[var(--color-border)] px-4 py-2.5 text-center text-[12px] font-bold text-[var(--color-brand-600)] hover:bg-[var(--color-surface-sunken)]">
            View all
          </Link>
        </div>
      )}
    </div>
  )
}
