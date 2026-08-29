/**
 * The patient's local identity — deliberately NOT a real account system.
 * See docs/VISITNOW_PRODUCT_DECISIONS.md §10 (Open questions): Login and
 * Register both collect a name + phone and land here exactly the same
 * way Guest does, with no password ever verified against anything. This
 * exists so the *shape* of the auth flow is right for a demo, not
 * because there's a real backend user system yet — there isn't one.
 *
 * Persisted in localStorage (not sessionStorage, unlike the staff
 * passcode) because a patient's identity should survive closing the
 * browser and coming back the next day to check on a visit, which is a
 * completely different use case from "keep a shared device's staff
 * session short-lived."
 */
export interface PatientIdentity {
  name: string
  phone?: string
}

const KEY = 'visitnow:patient-identity'

export function getPatientIdentity(): PatientIdentity | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PatientIdentity) : null
  } catch {
    return null
  }
}

export function setPatientIdentity(identity: PatientIdentity): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(identity))
  } catch {
    // Storage unavailable — the identity still works for this page load,
    // it just won't survive a reload. Acceptable prototype degradation.
  }
}

export function clearPatientIdentity(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clean up if storage was never available.
  }
}
