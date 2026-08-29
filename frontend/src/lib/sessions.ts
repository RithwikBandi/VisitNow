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
