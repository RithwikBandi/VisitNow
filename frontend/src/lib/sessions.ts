import type { SessionWithRelations } from './types'

/**
 * Collapses a doctor+clinic+session-label combo down to one
 * representative session — needed because seeding a few upcoming dates
 * for the date-selector (see DateStrip) means a doctor/clinic's session
 * list now legitimately contains several Session records for what a
 * patient thinks of as *one* slot ("Dr. Kumar's morning session at
 * Sunrise"), just on different days. A browsing grid (Clinic detail,
 * Doctor detail) should show that once, not once per date it happens to
 * exist on — the date itself is only relevant once you're already on
 * that slot's own page (SessionDetailPage's DateStrip). Prefers today's
 * date if the slot has one today, otherwise the earliest upcoming date.
 */
export function dedupeByDoctorClinicSlot(sessions: SessionWithRelations[]): SessionWithRelations[] {
  const today = new Date().toISOString().slice(0, 10)
  const bySlot = new Map<string, SessionWithRelations>()

  for (const s of sessions) {
    const key = `${s.doctorId}:${s.clinicId}:${s.label}`
    const existing = bySlot.get(key)
    if (!existing) {
      bySlot.set(key, s)
      continue
    }
    const existingIsToday = existing.date === today
    const candidateIsToday = s.date === today
    if (candidateIsToday && !existingIsToday) {
      bySlot.set(key, s)
    } else if (candidateIsToday === existingIsToday && s.date < existing.date) {
      bySlot.set(key, s)
    }
  }

  return [...bySlot.values()]
}

export type SessionTiming = 'now' | 'later-today' | 'earlier-today' | 'future' | 'past'

/**
 * Pure time-vs-clock comparison — deliberately independent of
 * `isQueueOpen`/`doctorStatus` (those are staff-controlled and can lag
 * or be forgotten to toggle). This answers the literal question a
 * patient has for a doctor who runs more than one clinic session a day
 * ("Dr. Suman is at clinic A 9–1, clinic B 6–10 — which one is he at
 * *right now*?"), so the "Practices at" grid can badge each session
 * "Now" / "Later today" / a future date instead of leaving the patient
 * to compare start times themselves.
 */
export function sessionTiming(session: { date: string; startTime: string; endTime: string }, now: Date = new Date()): SessionTiming {
  const today = now.toISOString().slice(0, 10)
  if (session.date > today) return 'future'
  if (session.date < today) return 'past'

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const start = toMinutes(session.startTime)
  const end = toMinutes(session.endTime)

  if (nowMinutes >= start && nowMinutes < end) return 'now'
  if (nowMinutes < start) return 'later-today'
  return 'earlier-today'
}

export function futureDateLabel(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`)
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
