/** Mirrors backend/src/types/account.ts exactly — see that file for the
 * reasoning behind each choice (plain-text password comparison, opaque
 * unsigned tokens, why permissions is only set for the two staff roles).
 * Same hand-mirrored-copy convention as lib/types.ts. */

export type AccountRole = 'super_admin' | 'super_admin_staff' | 'hospital_admin' | 'doctor' | 'hospital_staff'

export type PlatformModule =
  | 'hospitals'
  | 'doctors'
  | 'payments'
  | 'settlements'
  | 'refunds'
  | 'coupons'
  | 'users'
  | 'crm'
  | 'notifications'
  | 'reports'
  | 'system_settings'

export type HospitalModule = 'queue' | 'tokens' | 'appointments' | 'payments' | 'refunds' | 'notifications'

export const PLATFORM_MODULES: { id: PlatformModule; label: string }[] = [
  { id: 'hospitals', label: 'Hospitals' },
  { id: 'doctors', label: 'Doctors' },
  { id: 'payments', label: 'Payments' },
  { id: 'settlements', label: 'Settlements' },
  { id: 'refunds', label: 'Refunds' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'users', label: 'Users' },
  { id: 'crm', label: 'CRM' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'reports', label: 'Reports' },
  { id: 'system_settings', label: 'System settings' },
]

export const HOSPITAL_MODULES: { id: HospitalModule; label: string }[] = [
  { id: 'queue', label: 'Queue' },
  { id: 'tokens', label: 'Tokens (offline + verification)' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'payments', label: 'Payments' },
  { id: 'refunds', label: 'Refunds' },
  { id: 'notifications', label: 'Notifications' },
]

export interface PublicAccount {
  id: string
  role: AccountRole
  email: string
  displayName: string
  clinicId?: string
  doctorId?: string
  permissions?: string[]
  createdAt: string
}
