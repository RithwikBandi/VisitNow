/**
 * Demo data — deliberately not "Dr. John Doe / Test Hospital / Patient
 * 001" (see the brief's §21). Realistic-sounding names for a convincing
 * demo, but plainly fictional: this file is the one place that data
 * lives, so swapping in real doctor/clinic names later (once that's
 * actually agreed with them) is a rewrite of this file only, nothing
 * downstream changes shape.
 *
 * One session is seeded already "live" (mid-morning, several tokens in,
 * a mix of completed/called/waiting, online+offline+priority all
 * present) so the demo has something worth looking at the moment the
 * server starts, without requiring a click-through setup first.
 */
import type { Clinic, Doctor, QueueEntry, Session } from '../types/index.js'
import { clinics, doctors, nextId, queueEntries, sessions } from './store.js'

const today = new Date().toISOString().slice(0, 10)

function addClinic(c: Omit<Clinic, 'id'>): Clinic {
  const clinic: Clinic = { id: nextId('clinic'), ...c }
  clinics.set(clinic.id, clinic)
  return clinic
}

function addDoctor(d: Omit<Doctor, 'id'>): Doctor {
  const doctor: Doctor = { id: nextId('doctor'), ...d }
  doctors.set(doctor.id, doctor)
  return doctor
}

function addSession(s: Omit<Session, 'id' | 'date' | 'nextTokenNumber' | 'currentToken'> & { nextTokenNumber?: number; currentToken?: number | null }): Session {
  const session: Session = {
    id: nextId('session'),
    date: today,
    currentToken: s.currentToken ?? null,
    nextTokenNumber: s.nextTokenNumber ?? 1,
    ...s,
  }
  sessions.set(session.id, session)
  return session
}

function addEntry(e: Omit<QueueEntry, 'id' | 'createdAt'> & { createdAt?: string }): QueueEntry {
  const entry: QueueEntry = { id: nextId('queue'), createdAt: e.createdAt ?? new Date().toISOString(), ...e }
  queueEntries.set(entry.id, entry)
  return entry
}

export function seedDemoData(): void {
  const sunrise = addClinic({ name: 'Sunrise Multispecialty Clinic', location: 'Banjara Hills Road No. 12', city: 'Hyderabad' })
  const cityCare = addClinic({ name: 'City Care Hospital', location: 'MG Road', city: 'Hyderabad' })
  const greenValley = addClinic({ name: 'Green Valley Clinic', location: 'Kondapur Main Road', city: 'Hyderabad' })

  const drKumar = addDoctor({ name: 'Dr. Ashwin Kumar', specialty: 'General Physician', qualifications: 'MBBS, MD (General Medicine)' })
  const drRao = addDoctor({ name: 'Dr. Priya Rao', specialty: 'Dermatologist', qualifications: 'MBBS, MD (Dermatology)' })
  const drIyer = addDoctor({ name: 'Dr. Meera Iyer', specialty: 'Pediatrician', qualifications: 'MBBS, DCH' })
  const drNaidu = addDoctor({ name: 'Dr. Suresh Naidu', specialty: 'Orthopedic Surgeon', qualifications: 'MBBS, MS (Ortho)' })
  const drFernandes = addDoctor({ name: 'Dr. Alisha Fernandes', specialty: 'ENT Specialist', qualifications: 'MBBS, MS (ENT)' })

  // --- The "live" demo session: Dr. Kumar's morning slot at Sunrise ------
  // Mid-session: tokens 1-16 already handled, 17 in progress, a handful
  // waiting behind it with a realistic online/offline/priority mix.
  const kumarMorning = addSession({
    doctorId: drKumar.id,
    clinicId: sunrise.id,
    label: 'Morning Session',
    startTime: '08:00',
    endTime: '12:00',
    avgConsultMinutes: 6,
    doctorStatus: 'available',
    isQueueOpen: true,
    nextTokenNumber: 26,
    currentToken: 17,
  })

  for (let t = 1; t <= 16; t++) {
    addEntry({
      sessionId: kumarMorning.id,
      tokenNumber: t,
      source: t % 4 === 0 ? 'offline' : t % 7 === 0 ? 'appointment' : 'online',
      priority: 'regular',
      status: 'completed',
      patientName: DEMO_NAMES[t % DEMO_NAMES.length],
      completedAt: new Date(Date.now() - (17 - t) * 6 * 60_000).toISOString(),
    })
  }
  addEntry({
    sessionId: kumarMorning.id,
    tokenNumber: 17,
    source: 'online',
    priority: 'regular',
    status: 'in_progress',
    patientName: 'Rahul Devarakonda',
    calledAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    startedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
  })
  addEntry({ sessionId: kumarMorning.id, tokenNumber: 18, source: 'offline', priority: 'regular', status: 'waiting', patientName: 'Sandhya Reddy' })
  addEntry({ sessionId: kumarMorning.id, tokenNumber: 19, source: 'online', priority: 'regular', status: 'waiting', patientName: 'Farhan Ahmed' })
  addEntry({
    sessionId: kumarMorning.id,
    tokenNumber: 20,
    source: 'offline',
    priority: 'priority',
    status: 'waiting',
    patientName: 'Lakshmi Narayan',
    priorityAssignedBy: 'Front Desk — Sunrise',
  })
  addEntry({ sessionId: kumarMorning.id, tokenNumber: 21, source: 'online', priority: 'regular', status: 'waiting', patientName: 'Divya Chowdary' })
  addEntry({ sessionId: kumarMorning.id, tokenNumber: 22, source: 'appointment', priority: 'regular', status: 'waiting', patientName: 'Kiran Bathula' })
  addEntry({ sessionId: kumarMorning.id, tokenNumber: 23, source: 'online', priority: 'regular', status: 'waiting', patientName: 'Manoj Pillai' })
  addEntry({ sessionId: kumarMorning.id, tokenNumber: 24, source: 'offline', priority: 'regular', status: 'skipped', patientName: 'Ganesh Patil' })
  addEntry({ sessionId: kumarMorning.id, tokenNumber: 25, source: 'online', priority: 'regular', status: 'waiting', patientName: 'Aditi Varma' })

  // Dr. Kumar's evening session — a different clinic, a different day
  // part, the same doctor: the "sessions, not doctors, own queues" point.
  addSession({
    doctorId: drKumar.id,
    clinicId: cityCare.id,
    label: 'Evening Session',
    startTime: '17:00',
    endTime: '21:00',
    avgConsultMinutes: 6,
    doctorStatus: 'available',
    isQueueOpen: false,
  })

  // --- A delayed session, to show doctor-status in a non-default state ---
  const raoAfternoon = addSession({
    doctorId: drRao.id,
    clinicId: cityCare.id,
    label: 'Afternoon Session',
    startTime: '14:00',
    endTime: '18:00',
    avgConsultMinutes: 8,
    doctorStatus: 'delayed',
    delayMinutes: 20,
    isQueueOpen: true,
    nextTokenNumber: 6,
    currentToken: 3,
  })
  addEntry({ sessionId: raoAfternoon.id, tokenNumber: 1, source: 'online', priority: 'regular', status: 'completed', patientName: 'Neha Kapoor', completedAt: new Date(Date.now() - 30 * 60_000).toISOString() })
  addEntry({ sessionId: raoAfternoon.id, tokenNumber: 2, source: 'offline', priority: 'regular', status: 'completed', patientName: 'Vikram Shetty', completedAt: new Date(Date.now() - 20 * 60_000).toISOString() })
  addEntry({ sessionId: raoAfternoon.id, tokenNumber: 3, source: 'online', priority: 'emergency', status: 'called', patientName: 'Anitha George', calledAt: new Date(Date.now() - 5 * 60_000).toISOString(), priorityAssignedBy: 'Dr. Priya Rao' })
  addEntry({ sessionId: raoAfternoon.id, tokenNumber: 4, source: 'online', priority: 'regular', status: 'waiting', patientName: 'Rohit Malhotra' })
  addEntry({ sessionId: raoAfternoon.id, tokenNumber: 5, source: 'offline', priority: 'regular', status: 'waiting', patientName: 'Swathi Reddy' })

  // --- Upcoming sessions (not yet open) — for the "find a doctor" flow --
  addSession({
    doctorId: drIyer.id,
    clinicId: greenValley.id,
    label: 'Morning Session',
    startTime: '09:00',
    endTime: '13:00',
    avgConsultMinutes: 10,
    doctorStatus: 'available',
    isQueueOpen: false,
  })
  addSession({
    doctorId: drNaidu.id,
    clinicId: sunrise.id,
    label: 'Morning Session',
    startTime: '08:30',
    endTime: '11:30',
    avgConsultMinutes: 12,
    doctorStatus: 'available',
    isQueueOpen: false,
  })
  addSession({
    doctorId: drFernandes.id,
    clinicId: greenValley.id,
    label: 'Evening Session',
    startTime: '18:00',
    endTime: '20:30',
    avgConsultMinutes: 9,
    doctorStatus: 'closed',
    isQueueOpen: false,
  })
}

// Excludes 'Lakshmi Narayan' and 'Anitha George' — both used explicitly
// below (token 20's priority patient, token 3's emergency patient) and
// would otherwise also turn up as a coincidental namesake among the
// completed tokens this array cycles through.
const DEMO_NAMES = [
  'Aditi Varma', 'Rahul Devarakonda', 'Sandhya Reddy', 'Farhan Ahmed', 'Rakesh Bommidi',
  'Divya Chowdary', 'Kiran Bathula', 'Manoj Pillai', 'Ganesh Patil', 'Neha Kapoor',
  'Vikram Shetty', 'Meenakshi Iyengar', 'Rohit Malhotra', 'Swathi Reddy', 'Imran Shaikh',
  'Priyanka Nair',
]
