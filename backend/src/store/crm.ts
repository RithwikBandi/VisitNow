/** Patient directory — real data, grouped from existing QueueEntry
 * records, not an invented ticketing/CRM entity. This prototype has no
 * Patient/account table (see types/index.ts's own doc comment on that),
 * so phone number is the closest thing to a patient identity: two
 * entries with the same phone are treated as the same person, matching
 * how reception already looks a patient up everywhere else in this app
 * (see sessions.ts's offline-token / verify-code flow).
 *
 * An entry with no phone on file (an occasional offline/appointment
 * entry taken over the counter) falls back to grouping by name — a
 * known, documented imprecision for a prototype with no real patient
 * identity, not a bug to fix here. */
import { feeFor } from './revenue.js'
import { clinics, queueEntries, sessions } from './store.js'
import type { QueueEntry } from '../types/index.js'

export interface PatientDirectoryRow {
  key: string
  name: string
  phone?: string
  visitCount: number
  firstVisitAt: string
  lastVisitAt: string
  lastStatus: QueueEntry['status']
  clinicNames: string[]
  totalPaid: number
}

interface Accumulator extends PatientDirectoryRow {
  clinicSet: Set<string>
}

/** Optionally scoped to one clinic — not exposed on the platform CRM
 * route today (crm is a platform-only module, see the permission
 * catalog), but kept as a parameter rather than hardcoding "all
 * clinics" so a future clinic-level view doesn't need a second
 * aggregation path. */
export function computePatientDirectory(clinicId?: string): PatientDirectoryRow[] {
  const byKey = new Map<string, Accumulator>()

  for (const entry of queueEntries.values()) {
    const session = sessions.get(entry.sessionId)
    if (!session) continue
    if (clinicId && session.clinicId !== clinicId) continue

    const key = entry.patientPhone ? `phone:${entry.patientPhone.trim()}` : `name:${entry.patientName.trim().toLowerCase()}`
    const clinic = clinics.get(session.clinicId)
    const fee = feeFor(entry, session)
    const platformPaid = entry.platformFeeStatus === 'PAID' ? entry.platformFeeAmount ?? 0 : 0
    const hospitalPaid = fee.collected ? fee.amount : 0
    const paidThisVisit = hospitalPaid + platformPaid

    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, {
        key,
        name: entry.patientName,
        phone: entry.patientPhone,
        visitCount: 1,
        firstVisitAt: entry.createdAt,
        lastVisitAt: entry.createdAt,
        lastStatus: entry.status,
        clinicNames: [],
        clinicSet: new Set(clinic ? [clinic.name] : []),
        totalPaid: paidThisVisit,
      })
      continue
    }

    existing.visitCount += 1
    existing.totalPaid += paidThisVisit
    if (clinic) existing.clinicSet.add(clinic.name)
    if (entry.createdAt < existing.firstVisitAt) existing.firstVisitAt = entry.createdAt
    if (entry.createdAt > existing.lastVisitAt) {
      existing.lastVisitAt = entry.createdAt
      existing.name = entry.patientName // most recent name on file wins
      existing.lastStatus = entry.status
    }
  }

  return [...byKey.values()]
    .map(({ clinicSet, ...rest }) => ({ ...rest, clinicNames: [...clinicSet].sort() }))
    .sort((a, b) => b.lastVisitAt.localeCompare(a.lastVisitAt))
}
