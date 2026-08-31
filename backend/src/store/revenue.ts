/**
 * Hospital-side revenue & analytics — the "too soon" requirement from
 * docs/VISITNOW_PRODUCT_DECISIONS.md §15/§18: a hospital wants to know
 * what it collected, by clinic, by doctor, by day, downloadable and
 * printable. This is a pure read/reporting layer over data the queue
 * engine already records (see §18) — nothing here writes anything or
 * feeds back into queue ordering.
 *
 * Every number is computed from real QueueEntry/Session data that
 * exists at request time — there is no separate "analytics" table to
 * go stale against the source of truth, which for an in-memory
 * single-process prototype would be a second copy of the same bug
 * waiting to happen.
 */
import { clinics, doctors, queueEntries, sessions } from './store.js'
import type { QueueEntry, QueueSource, Session } from '../types/index.js'

/** Older seed/demo entries (and any entry created before the fee
 * snapshot was fixed to also cover offline/appointment sources — see
 * queueEngine.generateToken) may not carry their own hospitalFeeAmount.
 * Falling back to the entry's session keeps every entry countable
 * without needing to re-seed history, and is honest: the session's fee
 * is exactly what that entry would have been charged. */
export function feeFor(entry: QueueEntry, session: Session | undefined): { amount: number; collected: boolean } {
  const amount = entry.hospitalFeeAmount ?? session?.hospitalFeeAmount ?? 0
  // A cancelled entry's fee is still counted as collected here even
  // after a later refund — refundStatus/refundAmount are a separate
  // layer (see queueEngine.issueRefund, resolving what edge case #31
  // used to flag as unmodeled), not a change to whether the fee was
  // *collected* in the first place. A revenue report showing "collected"
  // and a refunds report showing "later given back" are both true and
  // both worth seeing, which is why they're two different views over
  // the same rows rather than one collapsing into the other.
  const collected = entry.hospitalFeeStatus ? entry.hospitalFeeStatus === 'PAID' : true
  return { amount, collected }
}

interface Row {
  entry: QueueEntry
  session: Session
  clinicId: string
  clinicName: string
  city: string
  doctorId: string
  doctorName: string
  date: string
  fee: { amount: number; collected: boolean }
  platformCollected: number
}

function buildRows(): Row[] {
  const rows: Row[] = []
  for (const entry of queueEntries.values()) {
    const session = sessions.get(entry.sessionId)
    if (!session) continue
    const clinic = clinics.get(session.clinicId)
    const doctor = doctors.get(session.doctorId)
    rows.push({
      entry,
      session,
      clinicId: session.clinicId,
      clinicName: clinic?.name ?? 'Unknown clinic',
      city: clinic?.city ?? 'Unknown',
      doctorId: session.doctorId,
      doctorName: doctor?.name ?? 'Unknown doctor',
      date: session.date,
      fee: feeFor(entry, session),
      platformCollected: entry.platformFeeStatus === 'PAID' ? entry.platformFeeAmount ?? 0 : 0,
    })
  }
  return rows
}

export interface RevenueTotals {
  tokensIssued: number
  clinicFeeCollected: number
  clinicFeeDue: number
  platformFeeCollected: number
}

export interface RevenueClinicRow extends RevenueTotals {
  clinicId: string
  clinicName: string
  city: string
}

export interface RevenueDoctorRow extends RevenueTotals {
  doctorId: string
  doctorName: string
  clinicNames: string[]
}

export interface RevenueDayRow extends RevenueTotals {
  date: string
}

export interface RevenueSourceRow {
  source: QueueSource
  count: number
  clinicFeeCollected: number
}

export interface RevenueEntryRow {
  id: string
  tokenNumber: number
  patientName: string
  clinicName: string
  doctorName: string
  date: string
  source: QueueSource
  status: QueueEntry['status']
  clinicFeeAmount: number
  clinicFeeCollected: boolean
  platformFeeCollected: number
  createdAt: string
}

export interface RevenueReport {
  generatedAt: string
  totals: RevenueTotals
  byClinic: RevenueClinicRow[]
  byDoctor: RevenueDoctorRow[]
  byDay: RevenueDayRow[]
  bySource: RevenueSourceRow[]
  entries: RevenueEntryRow[]
}

function emptyTotals(): RevenueTotals {
  return { tokensIssued: 0, clinicFeeCollected: 0, clinicFeeDue: 0, platformFeeCollected: 0 }
}

function accumulate(totals: RevenueTotals, row: Row): void {
  totals.tokensIssued += 1
  if (row.fee.collected) totals.clinicFeeCollected += row.fee.amount
  else totals.clinicFeeDue += row.fee.amount
  totals.platformFeeCollected += row.platformCollected
}

export function computeRevenueReport(): RevenueReport {
  const rows = buildRows()

  const totals = emptyTotals()
  const byClinic = new Map<string, RevenueClinicRow>()
  const byDoctor = new Map<string, RevenueDoctorRow & { clinicSet: Set<string> }>()
  const byDay = new Map<string, RevenueDayRow>()
  const bySource = new Map<QueueSource, RevenueSourceRow>()

  for (const row of rows) {
    accumulate(totals, row)

    const clinicRow = byClinic.get(row.clinicId) ?? { clinicId: row.clinicId, clinicName: row.clinicName, city: row.city, ...emptyTotals() }
    accumulate(clinicRow, row)
    byClinic.set(row.clinicId, clinicRow)

    const doctorRow = byDoctor.get(row.doctorId) ?? {
      doctorId: row.doctorId,
      doctorName: row.doctorName,
      clinicNames: [],
      clinicSet: new Set<string>(),
      ...emptyTotals(),
    }
    accumulate(doctorRow, row)
    doctorRow.clinicSet.add(row.clinicName)
    byDoctor.set(row.doctorId, doctorRow)

    const dayRow = byDay.get(row.date) ?? { date: row.date, ...emptyTotals() }
    accumulate(dayRow, row)
    byDay.set(row.date, dayRow)

    const sourceRow = bySource.get(row.entry.source) ?? { source: row.entry.source, count: 0, clinicFeeCollected: 0 }
    sourceRow.count += 1
    if (row.fee.collected) sourceRow.clinicFeeCollected += row.fee.amount
    bySource.set(row.entry.source, sourceRow)
  }

  const entries: RevenueEntryRow[] = rows
    .map((row) => ({
      id: row.entry.id,
      tokenNumber: row.entry.tokenNumber,
      patientName: row.entry.patientName,
      clinicName: row.clinicName,
      doctorName: row.doctorName,
      date: row.date,
      source: row.entry.source,
      status: row.entry.status,
      clinicFeeAmount: row.fee.amount,
      clinicFeeCollected: row.fee.collected,
      platformFeeCollected: row.platformCollected,
      createdAt: row.entry.createdAt,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return {
    generatedAt: new Date().toISOString(),
    totals,
    byClinic: [...byClinic.values()].sort((a, b) => b.clinicFeeCollected - a.clinicFeeCollected),
    byDoctor: [...byDoctor.values()]
      .map(({ clinicSet, ...rest }) => ({ ...rest, clinicNames: [...clinicSet] }))
      .sort((a, b) => b.clinicFeeCollected - a.clinicFeeCollected),
    byDay: [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date)),
    bySource: [...bySource.values()],
    entries,
  }
}

/**
 * Same report, filtered to one clinic — for a hospital_admin account, who
 * should never see another tenant's revenue. Deliberately a filter on
 * the already-computed report rather than a second aggregation path:
 * `byClinic`/`entries` already carry `clinicId`/`clinicName`, so scoping
 * is "keep the rows that match," not "recompute totals differently."
 * `totals` is re-summed from the *filtered* entries rather than read
 * from the single matching `byClinic` row, so this function stays
 * correct even if a future caller filters by something byClinic doesn't
 * already carry (e.g. a date range) without needing a second totals path.
 */
export function scopeReportToClinic(report: RevenueReport, clinicId: string): RevenueReport {
  const byClinic = report.byClinic.filter((r) => r.clinicId === clinicId)
  const clinicName = byClinic[0]?.clinicName
  const byDoctor = report.byDoctor.filter((r) => clinicName != null && r.clinicNames.includes(clinicName))
  const entries = report.entries.filter((r) => clinicName != null && r.clinicName === clinicName)

  const totals = emptyTotals()
  for (const e of entries) {
    totals.tokensIssued += 1
    if (e.clinicFeeCollected) totals.clinicFeeCollected += e.clinicFeeAmount
    else totals.clinicFeeDue += e.clinicFeeAmount
    totals.platformFeeCollected += e.platformFeeCollected
  }

  const byDay = new Map<string, RevenueDayRow>()
  const bySource = new Map<QueueSource, RevenueSourceRow>()
  for (const e of entries) {
    const dayRow = byDay.get(e.date) ?? { date: e.date, ...emptyTotals() }
    dayRow.tokensIssued += 1
    if (e.clinicFeeCollected) dayRow.clinicFeeCollected += e.clinicFeeAmount
    else dayRow.clinicFeeDue += e.clinicFeeAmount
    dayRow.platformFeeCollected += e.platformFeeCollected
    byDay.set(e.date, dayRow)

    const sourceRow = bySource.get(e.source) ?? { source: e.source, count: 0, clinicFeeCollected: 0 }
    sourceRow.count += 1
    if (e.clinicFeeCollected) sourceRow.clinicFeeCollected += e.clinicFeeAmount
    bySource.set(e.source, sourceRow)
  }

  return {
    generatedAt: report.generatedAt,
    totals,
    byClinic,
    byDoctor,
    byDay: [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date)),
    bySource: [...bySource.values()],
    entries,
  }
}

/**
 * Same report, filtered to one city — the platform-level counterpart to
 * scopeReportToClinic, for a super_admin/super_admin_staff account that
 * wants "just Hyderabad" rather than every clinic at once (the user's
 * own "select a location and see data for that location" requirement).
 * Same "filter the already-computed report" shape as scopeReportToClinic
 * — city isn't a field byDay/bySource carry directly, so this filters
 * by clinicId membership (from byClinic, which does carry city) rather
 * than re-deriving city per entry. */
export function scopeReportToCity(report: RevenueReport, city: string): RevenueReport {
  const byClinic = report.byClinic.filter((r) => r.city === city)
  const clinicNames = new Set(byClinic.map((r) => r.clinicName))
  const byDoctor = report.byDoctor.filter((r) => r.clinicNames.some((n) => clinicNames.has(n)))
  const entries = report.entries.filter((r) => clinicNames.has(r.clinicName))

  const totals = emptyTotals()
  const byDay = new Map<string, RevenueDayRow>()
  const bySource = new Map<QueueSource, RevenueSourceRow>()
  for (const e of entries) {
    totals.tokensIssued += 1
    if (e.clinicFeeCollected) totals.clinicFeeCollected += e.clinicFeeAmount
    else totals.clinicFeeDue += e.clinicFeeAmount
    totals.platformFeeCollected += e.platformFeeCollected

    const dayRow = byDay.get(e.date) ?? { date: e.date, ...emptyTotals() }
    dayRow.tokensIssued += 1
    if (e.clinicFeeCollected) dayRow.clinicFeeCollected += e.clinicFeeAmount
    else dayRow.clinicFeeDue += e.clinicFeeAmount
    dayRow.platformFeeCollected += e.platformFeeCollected
    byDay.set(e.date, dayRow)

    const sourceRow = bySource.get(e.source) ?? { source: e.source, count: 0, clinicFeeCollected: 0 }
    sourceRow.count += 1
    if (e.clinicFeeCollected) sourceRow.clinicFeeCollected += e.clinicFeeAmount
    bySource.set(e.source, sourceRow)
  }

  return {
    generatedAt: report.generatedAt,
    totals,
    byClinic,
    byDoctor,
    byDay: [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date)),
    bySource: [...bySource.values()],
    entries,
  }
}

export interface RefundCandidateRow {
  id: string
  tokenNumber: number
  patientName: string
  clinicId: string
  clinicName: string
  doctorName: string
  date: string
  status: QueueEntry['status']
  maxRefundable: number
  refundStatus?: 'REFUNDED'
  refundAmount?: number
  refundedAt?: string
  refundedBy?: string
  refundReason?: string
}

/**
 * Every cancelled/no-show entry that actually had money collected on
 * it — whether still refund-eligible or already refunded — reusing the
 * same `buildRows()` scan every other report in this file uses, not a
 * second aggregation path. Optionally scoped to one clinic, the same
 * `scopeReportToClinic` pattern: a hospital_staff account with the
 * 'refunds' module should only ever see their own clinic's candidates.
 */
export function listRefundCandidates(clinicId?: string): RefundCandidateRow[] {
  return buildRows()
    .filter((row) => ['cancelled', 'no_show'].includes(row.entry.status))
    .filter((row) => !clinicId || row.clinicId === clinicId)
    .map((row) => {
      const paidHospital = row.entry.hospitalFeeStatus === 'PAID' ? row.entry.hospitalFeeAmount ?? 0 : 0
      const paidPlatform = row.entry.platformFeeStatus === 'PAID' ? row.entry.platformFeeAmount ?? 0 : 0
      return {
        id: row.entry.id,
        tokenNumber: row.entry.tokenNumber,
        patientName: row.entry.patientName,
        clinicId: row.clinicId,
        clinicName: row.clinicName,
        doctorName: row.doctorName,
        date: row.date,
        status: row.entry.status,
        maxRefundable: paidHospital + paidPlatform,
        refundStatus: row.entry.refundStatus,
        refundAmount: row.entry.refundAmount,
        refundedAt: row.entry.refundedAt,
        refundedBy: row.entry.refundedBy,
        refundReason: row.entry.refundReason,
      }
    })
    .filter((row) => row.maxRefundable > 0 || row.refundStatus === 'REFUNDED')
    .sort((a, b) => b.date.localeCompare(a.date))
}
