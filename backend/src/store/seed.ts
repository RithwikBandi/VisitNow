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
import { PLATFORM_FEE_INR, type Clinic, type Doctor, type PaymentMethod, type QueueEntry, type Session } from '../types/index.js'
import { clinics, doctors, nextId, queueEntries, sessions } from './store.js'

const today = new Date().toISOString().slice(0, 10)

/** `offset` in days from today — used to seed a couple of upcoming dates
 * for a session so the date-selector on SessionDetailPage has more than
 * one real day to switch between (see the frontend's DateStrip). */
function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Placeholder photography — verified live (both services return real
 * images, not broken links) rather than guessed. `u=<slug>` / `seed=
 * <slug>` deterministically map a string to one image, so the same
 * doctor/clinic always gets the same photo across restarts without
 * storing binary data anywhere. Swapping in real photos later is a
 * one-line change per entity, not a shape change (see types/index.ts). */
function doctorPhoto(slug: string): string {
  return `https://i.pravatar.cc/300?u=${slug}`
}
function clinicPhoto(slug: string): string {
  return `https://picsum.photos/seed/${slug}/800/500`
}

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

function addSession(
  s: Omit<Session, 'id' | 'date' | 'nextTokenNumber' | 'currentToken'> & { date?: string; nextTokenNumber?: number; currentToken?: number | null },
): Session {
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

/** Fills in an online entry's payment fields the same way
 * queueEngine.generateToken does at runtime, for seed entries built
 * directly rather than through that function. `code` is hardcoded here
 * (not randomly generated) purely so demo runs are reproducible run to
 * run — real online tokens still get a random one, see queueEngine.ts. */
function onlinePayment(method: PaymentMethod, hospitalFeeAmount: number, code: string) {
  return {
    paymentMethod: method,
    hospitalFeeAmount,
    platformFeeAmount: PLATFORM_FEE_INR,
    platformFeeStatus: 'PAID' as const,
    hospitalFeeStatus: method === 'ONLINE' ? ('PAID' as const) : ('DUE' as const),
    verificationCode: code,
  }
}

export function seedDemoData(): void {
  const sunrise = addClinic({
    name: 'Sunrise Multispecialty Clinic',
    location: 'Banjara Hills Road No. 12',
    city: 'Hyderabad',
    photoUrl: clinicPhoto('sunrise-multispecialty-clinic'),
  })
  const cityCare = addClinic({
    name: 'City Care Hospital',
    location: 'MG Road',
    city: 'Hyderabad',
    photoUrl: clinicPhoto('city-care-hospital'),
  })
  const greenValley = addClinic({
    name: 'Green Valley Clinic',
    location: 'Kondapur Main Road',
    city: 'Hyderabad',
    photoUrl: clinicPhoto('green-valley-clinic'),
  })

  const drKumar = addDoctor({
    name: 'Dr. Ashwin Kumar',
    specialty: 'General Physician',
    qualifications: 'MBBS, MD (General Medicine)',
    photoUrl: doctorPhoto('dr-ashwin-kumar'),
  })
  const drRao = addDoctor({
    name: 'Dr. Priya Rao',
    specialty: 'Dermatologist',
    qualifications: 'MBBS, MD (Dermatology)',
    photoUrl: doctorPhoto('dr-priya-rao'),
  })
  const drIyer = addDoctor({
    name: 'Dr. Meera Iyer',
    specialty: 'Pediatrician',
    qualifications: 'MBBS, DCH',
    photoUrl: doctorPhoto('dr-meera-iyer'),
  })
  const drNaidu = addDoctor({
    name: 'Dr. Suresh Naidu',
    specialty: 'Orthopedic Surgeon',
    qualifications: 'MBBS, MS (Ortho)',
    photoUrl: doctorPhoto('dr-suresh-naidu'),
  })
  const drFernandes = addDoctor({
    name: 'Dr. Alisha Fernandes',
    specialty: 'ENT Specialist',
    qualifications: 'MBBS, MS (ENT)',
    photoUrl: doctorPhoto('dr-alisha-fernandes'),
  })

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
    hospitalFeeAmount: 500,
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
  addEntry({
    sessionId: kumarMorning.id,
    tokenNumber: 19,
    source: 'online',
    priority: 'regular',
    status: 'waiting',
    patientName: 'Farhan Ahmed',
    ...onlinePayment('ONLINE', 500, '4127'),
  })
  addEntry({
    sessionId: kumarMorning.id,
    tokenNumber: 20,
    source: 'offline',
    priority: 'priority',
    status: 'waiting',
    patientName: 'Lakshmi Narayan',
    priorityAssignedBy: 'Front Desk — Sunrise',
  })
  addEntry({
    sessionId: kumarMorning.id,
    tokenNumber: 21,
    source: 'online',
    priority: 'regular',
    status: 'waiting',
    patientName: 'Divya Chowdary',
    ...onlinePayment('PAY_AT_HOSPITAL', 500, '8352'),
  })
  addEntry({ sessionId: kumarMorning.id, tokenNumber: 22, source: 'appointment', priority: 'regular', status: 'waiting', patientName: 'Kiran Bathula' })
  addEntry({
    sessionId: kumarMorning.id,
    tokenNumber: 23,
    source: 'online',
    priority: 'regular',
    status: 'waiting',
    patientName: 'Manoj Pillai',
    ...onlinePayment('ONLINE', 500, '2769'),
  })
  addEntry({ sessionId: kumarMorning.id, tokenNumber: 24, source: 'offline', priority: 'regular', status: 'skipped', patientName: 'Ganesh Patil' })
  addEntry({
    sessionId: kumarMorning.id,
    tokenNumber: 25,
    source: 'online',
    priority: 'regular',
    status: 'waiting',
    patientName: 'Aditi Varma',
    ...onlinePayment('PAY_AT_HOSPITAL', 500, '6041'),
  })

  // Same doctor, same clinic, same slot — tomorrow and the day after.
  // Not live (no queue yet, that only exists same-day), but real Session
  // records with real ids, so SessionDetailPage's date selector has more
  // than one actual day to switch between instead of a decorative strip
  // with everything but "today" disabled.
  addSession({
    doctorId: drKumar.id,
    clinicId: sunrise.id,
    label: 'Morning Session',
    date: dateOffset(1),
    startTime: '08:00',
    endTime: '12:00',
    avgConsultMinutes: 6,
    hospitalFeeAmount: 500,
    doctorStatus: 'available',
    isQueueOpen: false,
  })
  addSession({
    doctorId: drKumar.id,
    clinicId: sunrise.id,
    label: 'Morning Session',
    date: dateOffset(2),
    startTime: '08:00',
    endTime: '12:00',
    avgConsultMinutes: 6,
    hospitalFeeAmount: 500,
    doctorStatus: 'available',
    isQueueOpen: false,
  })

  // Dr. Kumar's evening session — a different clinic, a different day
  // part, the same doctor: the "sessions, not doctors, own queues" point.
  addSession({
    doctorId: drKumar.id,
    clinicId: cityCare.id,
    label: 'Evening Session',
    startTime: '17:00',
    endTime: '21:00',
    avgConsultMinutes: 6,
    hospitalFeeAmount: 550,
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
    hospitalFeeAmount: 700,
    doctorStatus: 'delayed',
    delayMinutes: 20,
    isQueueOpen: true,
    nextTokenNumber: 6,
    currentToken: 3,
  })
  addEntry({
    sessionId: raoAfternoon.id,
    tokenNumber: 1,
    source: 'online',
    priority: 'regular',
    status: 'completed',
    patientName: 'Neha Kapoor',
    completedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    ...onlinePayment('ONLINE', 700, '5518'),
  })
  addEntry({ sessionId: raoAfternoon.id, tokenNumber: 2, source: 'offline', priority: 'regular', status: 'completed', patientName: 'Vikram Shetty', completedAt: new Date(Date.now() - 20 * 60_000).toISOString() })
  addEntry({ sessionId: raoAfternoon.id, tokenNumber: 3, source: 'online', priority: 'emergency', status: 'called', patientName: 'Anitha George', calledAt: new Date(Date.now() - 5 * 60_000).toISOString(), priorityAssignedBy: 'Dr. Priya Rao', ...onlinePayment('PAY_AT_HOSPITAL', 700, '9204') })
  addEntry({
    sessionId: raoAfternoon.id,
    tokenNumber: 4,
    source: 'online',
    priority: 'regular',
    status: 'waiting',
    patientName: 'Rohit Malhotra',
    ...onlinePayment('ONLINE', 700, '3386'),
  })
  addEntry({ sessionId: raoAfternoon.id, tokenNumber: 5, source: 'offline', priority: 'regular', status: 'waiting', patientName: 'Swathi Reddy' })

  // --- Upcoming sessions (not yet open) — for the "find a doctor" flow --
  addSession({
    doctorId: drIyer.id,
    clinicId: greenValley.id,
    label: 'Morning Session',
    startTime: '09:00',
    endTime: '13:00',
    avgConsultMinutes: 10,
    hospitalFeeAmount: 400,
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
    hospitalFeeAmount: 600,
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
    hospitalFeeAmount: 450,
    doctorStatus: 'closed',
    isQueueOpen: false,
  })

  // --- More clinics + doctors — a 3-clinic, 5-doctor demo reads thin on
  // a real discovery grid; this rounds it out closer to what an actual
  // local multi-specialty listing looks like. ------------------------
  const metroDiagnostics = addClinic({
    name: 'Metro Diagnostics & Clinic',
    location: 'Ameerpet Main Road',
    city: 'Hyderabad',
    photoUrl: clinicPhoto('metro-diagnostics-clinic'),
  })
  const lakeview = addClinic({
    name: 'Lakeview Family Health Center',
    location: 'Necklace Road',
    city: 'Hyderabad',
    photoUrl: clinicPhoto('lakeview-family-health'),
  })

  const drReddy = addDoctor({
    name: 'Dr. Kavya Reddy',
    specialty: 'Cardiologist',
    qualifications: 'MBBS, DM (Cardiology)',
    photoUrl: doctorPhoto('dr-kavya-reddy'),
  })
  const drMehta = addDoctor({
    name: 'Dr. Arjun Mehta',
    specialty: 'Dentist',
    qualifications: 'BDS, MDS (Orthodontics)',
    photoUrl: doctorPhoto('dr-arjun-mehta'),
  })
  const drSowmya = addDoctor({
    name: 'Dr. Sowmya Rao',
    specialty: 'Gynecologist',
    qualifications: 'MBBS, MS (OBG)',
    photoUrl: doctorPhoto('dr-sowmya-rao'),
  })
  const drChoudhary = addDoctor({
    name: 'Dr. Vikram Choudhary',
    specialty: 'Psychiatrist',
    qualifications: 'MBBS, MD (Psychiatry)',
    photoUrl: doctorPhoto('dr-vikram-choudhary'),
  })

  // A second live session, so the "Live now" row on Home has more than
  // two entries to actually demonstrate a grid with.
  const reddyMorning = addSession({
    doctorId: drReddy.id,
    clinicId: metroDiagnostics.id,
    label: 'Morning Session',
    startTime: '09:00',
    endTime: '13:00',
    avgConsultMinutes: 10,
    hospitalFeeAmount: 800,
    doctorStatus: 'available',
    isQueueOpen: true,
    nextTokenNumber: 9,
    currentToken: 5,
  })
  for (let t = 1; t <= 4; t++) {
    addEntry({
      sessionId: reddyMorning.id,
      tokenNumber: t,
      source: t % 2 === 0 ? 'offline' : 'online',
      priority: 'regular',
      status: 'completed',
      patientName: DEMO_NAMES[(t + 8) % DEMO_NAMES.length],
      completedAt: new Date(Date.now() - (5 - t) * 10 * 60_000).toISOString(),
    })
  }
  addEntry({
    sessionId: reddyMorning.id,
    tokenNumber: 5,
    source: 'online',
    priority: 'regular',
    status: 'in_progress',
    patientName: 'Imran Shaikh',
    calledAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    startedAt: new Date(Date.now() - 3 * 60_000).toISOString(),
  })
  addEntry({ sessionId: reddyMorning.id, tokenNumber: 6, source: 'offline', priority: 'regular', status: 'waiting', patientName: 'Priyanka Nair' })
  addEntry({
    sessionId: reddyMorning.id,
    tokenNumber: 7,
    source: 'online',
    priority: 'regular',
    status: 'waiting',
    patientName: 'Meenakshi Iyengar',
    ...onlinePayment('ONLINE', 800, '7743'),
  })
  addEntry({ sessionId: reddyMorning.id, tokenNumber: 8, source: 'offline', priority: 'regular', status: 'waiting', patientName: 'Rakesh Bommidi' })

  addSession({
    doctorId: drMehta.id,
    clinicId: lakeview.id,
    label: 'Evening Session',
    startTime: '16:00',
    endTime: '19:00',
    avgConsultMinutes: 15,
    hospitalFeeAmount: 350,
    doctorStatus: 'available',
    isQueueOpen: false,
  })
  addSession({
    doctorId: drSowmya.id,
    clinicId: cityCare.id,
    label: 'Morning Session',
    startTime: '10:00',
    endTime: '13:00',
    avgConsultMinutes: 12,
    hospitalFeeAmount: 650,
    doctorStatus: 'available',
    isQueueOpen: false,
  })
  addSession({
    doctorId: drChoudhary.id,
    clinicId: lakeview.id,
    label: 'Morning Session',
    startTime: '09:30',
    endTime: '12:30',
    avgConsultMinutes: 20,
    hospitalFeeAmount: 900,
    doctorStatus: 'available',
    isQueueOpen: false,
  })
  // Same cardiologist, a second clinic in the evening — another real
  // example of the "one doctor, two clinics" concept beyond Dr. Kumar.
  addSession({
    doctorId: drReddy.id,
    clinicId: lakeview.id,
    label: 'Evening Session',
    startTime: '17:00',
    endTime: '20:00',
    avgConsultMinutes: 10,
    hospitalFeeAmount: 800,
    doctorStatus: 'available',
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
