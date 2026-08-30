/**
 * The whole prototype's data, in memory, in one process. No database —
 * per the brief's §25, this is exactly proportional to a prototype and
 * stays swappable later (every access goes through the functions below,
 * never through raw Map access from outside this file, so swapping the
 * storage layer for a real database later touches only this one file).
 *
 * Resets on server restart. That's a deliberate prototype trait, not an
 * oversight — see seed.ts for how a fresh, demo-ready state gets rebuilt
 * every time.
 */
import type { Appointment, Clinic, Doctor, QueueEntry, Session } from '../types/index.js'
import type { Account, AuthToken } from '../types/account.js'

export const clinics = new Map<string, Clinic>()
export const doctors = new Map<string, Doctor>()
export const sessions = new Map<string, Session>()
export const queueEntries = new Map<string, QueueEntry>()
export const appointments = new Map<string, Appointment>()
export const accounts = new Map<string, Account>()
/** token -> AuthToken. See types/account.ts's doc comment: an opaque
 * string in a Map, not a JWT — proportional to everything else in this
 * file already being an in-memory Map that resets on restart. */
export const authTokens = new Map<string, AuthToken>()

const idCounters = new Map<string, number>()
/** Prefixed, human-scannable ids (e.g. "session-3", "doctor-2") instead
 * of UUIDs — this is demo data meant to be read in a debugger/network
 * tab, not a production key space. Counted per prefix so unrelated
 * entities don't visibly skip numbers as other entities get created. */
export function nextId(prefix: string): string {
  const next = (idCounters.get(prefix) ?? 0) + 1
  idCounters.set(prefix, next)
  return `${prefix}-${next}`
}

export function resetStore(): void {
  clinics.clear()
  doctors.clear()
  sessions.clear()
  queueEntries.clear()
  appointments.clear()
  accounts.clear()
  authTokens.clear()
  idCounters.clear()
}

export function queueEntriesForSession(sessionId: string): QueueEntry[] {
  return [...queueEntries.values()].filter((e) => e.sessionId === sessionId)
}

export function appointmentsForSession(sessionId: string): Appointment[] {
  return [...appointments.values()].filter((a) => a.sessionId === sessionId)
}

export function sessionsForDoctor(doctorId: string): Session[] {
  return [...sessions.values()].filter((s) => s.doctorId === doctorId)
}

export function sessionsForClinic(clinicId: string): Session[] {
  return [...sessions.values()].filter((s) => s.clinicId === clinicId)
}

/** Case-insensitive — an email typo'd in different casing shouldn't fail
 * to match its own account. Linear scan, same proportionality as every
 * other xForY lookup in this file; accounts.size is small (a handful per
 * clinic, not a real user base). */
export function accountByEmail(email: string): Account | undefined {
  const needle = email.trim().toLowerCase()
  return [...accounts.values()].find((a) => a.email.toLowerCase() === needle)
}
