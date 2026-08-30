/** Mirrors backend/src/types/account.ts exactly — see that file for the
 * reasoning behind each choice (plain-text password comparison, opaque
 * unsigned tokens). Same hand-mirrored-copy convention as lib/types.ts. */

export type AccountRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'clinic_staff'

export interface PublicAccount {
  id: string
  role: AccountRole
  email: string
  displayName: string
  clinicId?: string
  doctorId?: string
  createdAt: string
}
