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
import type { Account, AccountRole } from '../types/account.js'
import { accounts, clinics, doctors, nextId, queueEntries, sessions } from './store.js'

// Mutable, not const — recomputed at the top of seedDemoData() itself,
// not frozen at module-load time. A demo server can run for hours (or
// get shown again days later without a restart); if "today" were fixed
// to whenever the process first started, every session seeded as
// "today" would silently vanish from every today-filtered view the
// moment the real calendar date rolled over — exactly the failure mode
// that motivated relTime()'s own "correct at any hour" design below, now
// extended to "correct on any day" too.
let NOW = new Date()
let today = NOW.toISOString().slice(0, 10)

/** `offset` in days from today — used to seed a couple of upcoming dates
 * for a session so the date-selector on SessionDetailPage has more than
 * one real day to switch between (see the frontend's DateStrip). */
function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** "HH:MM" offset from server-start time, not a fixed clock time — used
 * only for sessions seeded `isQueueOpen: true` ("live" right now) and
 * their same-doctor "later today" sibling session. Every other session
 * below uses a plain fixed time because nothing compares it to the real
 * clock; these specific ones are the exception because the frontend's
 * sessionTiming() (lib/sessions.ts) *does* compare a multi-clinic
 * doctor's sessions against real now() to badge "Here now" / "Later
 * today" (Dr. Suman's actual clinic-A-morning/clinic-B-evening
 * schedule). A fixed "08:00-12:00" would eventually just be in the past
 * whenever someone actually opens the demo, contradicting a card still
 * saying "Serving #17" — this makes the seed correct at any hour,
 * which matters for a demo that gets shown to investors on no fixed
 * schedule. */
function relTime(offsetHours: number): string {
  const d = new Date(NOW.getTime() + offsetHours * 60 * 60 * 1000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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

function addAccount(a: {
  role: AccountRole
  email: string
  password: string
  displayName: string
  clinicId?: string
  doctorId?: string
  permissions?: string[]
}): Account {
  const account: Account = { id: nextId('account'), createdAt: new Date().toISOString(), ...a }
  accounts.set(account.id, account)
  return account
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
  // Re-anchor "now"/"today" to the real current moment every time this
  // runs (process start, and every /api/demo/reset) — see the doc
  // comment on the module-level declarations above.
  NOW = new Date()
  today = NOW.toISOString().slice(0, 10)

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
    startTime: relTime(-2),
    endTime: relTime(2),
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
    priorityAssignedBy: 'Front Desk, Sunrise',
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

  // Dr. Kumar's second clinic, earlier today — a different clinic, a
  // different day part, the same doctor: the "sessions, not doctors,
  // own queues" point, and the reason a doctor's own dashboard needs a
  // real "revenue by clinic" breakdown rather than one merged number.
  // Already closed (ran and finished before "now"), not upcoming, so a
  // completed token history here is honest rather than contradicting an
  // unopened queue.
  const kumarCityCareEarlier = addSession({
    doctorId: drKumar.id,
    clinicId: cityCare.id,
    label: 'Early Morning Session',
    startTime: relTime(-6),
    endTime: relTime(-2),
    avgConsultMinutes: 6,
    hospitalFeeAmount: 550,
    doctorStatus: 'closed',
    isQueueOpen: false,
    nextTokenNumber: 6,
    currentToken: 5,
  })
  for (let t = 1; t <= 5; t++) {
    addEntry({
      sessionId: kumarCityCareEarlier.id,
      tokenNumber: t,
      source: t % 3 === 0 ? 'offline' : 'online',
      priority: 'regular',
      status: 'completed',
      patientName: DEMO_NAMES[(t + 3) % DEMO_NAMES.length],
      completedAt: new Date(Date.now() - (6 - t) * 45 * 60_000).toISOString(),
      ...(t % 3 === 0 ? {} : onlinePayment('ONLINE', 550, `61${t}2`)),
    })
  }

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
    startTime: relTime(-2),
    endTime: relTime(2),
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
    startTime: relTime(5),
    endTime: relTime(8),
    avgConsultMinutes: 10,
    hospitalFeeAmount: 800,
    doctorStatus: 'available',
    isQueueOpen: false,
  })

  // --- Warangal / Hanamkonda — requested explicitly to demonstrate the
  // product outside Hyderabad. Names and clinics here are plainly
  // fictional (see docs/VISITNOW_PRODUCT_DECISIONS.md §12/§13): no real
  // clinic's name, phone number, or photo is reproduced, even though
  // the "one doctor, two clinics, morning + evening" shape is modeled
  // on a real local example. Street names (Nakkalagutta, Mulugu Road,
  // Kakatiya Nagar, Subedari) are genuine Hanamkonda-area localities —
  // that's public geography, not anyone's personal data — used so the
  // location reads as authentic rather than generic.
  const kakatiyaClinic = addClinic({
    name: 'Kakatiya General Clinic',
    location: 'Nakkalagutta Main Road',
    city: 'Warangal',
    photoUrl: clinicPhoto('kakatiya-general-clinic'),
  })
  const subedariClinic = addClinic({
    name: 'Subedari Family Care Centre',
    location: 'Subedari Road, Hanamkonda',
    city: 'Warangal',
    photoUrl: clinicPhoto('subedari-family-care'),
  })

  const drSuman = addDoctor({
    name: 'Dr. Suman Vaddepally',
    specialty: 'General Physician',
    qualifications: 'MBBS, MD (General Medicine)',
    photoUrl: doctorPhoto('dr-suman-vaddepally'),
  })
  const drAnjali = addDoctor({
    name: 'Dr. Anjali Nimmagadda',
    specialty: 'Pediatrician',
    qualifications: 'MBBS, DCH',
    photoUrl: doctorPhoto('dr-anjali-nimmagadda'),
  })

  // The exact "clinic A morning, clinic B evening" shape from the real
  // example this is modeled on.
  const sumanMorning = addSession({
    doctorId: drSuman.id,
    clinicId: kakatiyaClinic.id,
    label: 'Morning Session',
    startTime: relTime(-2),
    endTime: relTime(2),
    avgConsultMinutes: 8,
    hospitalFeeAmount: 300,
    doctorStatus: 'available',
    isQueueOpen: true,
    nextTokenNumber: 12,
    currentToken: 8,
  })
  for (let t = 1; t <= 7; t++) {
    addEntry({
      sessionId: sumanMorning.id,
      tokenNumber: t,
      source: t % 3 === 0 ? 'offline' : 'online',
      priority: 'regular',
      status: 'completed',
      patientName: DEMO_NAMES[(t + 3) % DEMO_NAMES.length],
      completedAt: new Date(Date.now() - (8 - t) * 8 * 60_000).toISOString(),
    })
  }
  addEntry({
    sessionId: sumanMorning.id,
    tokenNumber: 8,
    source: 'offline',
    priority: 'regular',
    status: 'in_progress',
    patientName: 'Sandhya Reddy',
    calledAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    startedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
  })
  addEntry({ sessionId: sumanMorning.id, tokenNumber: 9, source: 'online', priority: 'regular', status: 'waiting', patientName: 'Rakesh Bommidi' })
  addEntry({ sessionId: sumanMorning.id, tokenNumber: 10, source: 'offline', priority: 'regular', status: 'waiting', patientName: 'Neha Kapoor' })
  addEntry({
    sessionId: sumanMorning.id,
    tokenNumber: 11,
    source: 'online',
    priority: 'regular',
    status: 'waiting',
    patientName: 'Vikram Shetty',
    ...onlinePayment('PAY_AT_HOSPITAL', 300, '1837'),
  })
  addSession({
    doctorId: drSuman.id,
    clinicId: subedariClinic.id,
    label: 'Evening Session',
    startTime: relTime(5),
    endTime: relTime(9),
    avgConsultMinutes: 8,
    hospitalFeeAmount: 300,
    doctorStatus: 'available',
    isQueueOpen: false,
  })
  const anjaliMorning = addSession({
    doctorId: drAnjali.id,
    clinicId: kakatiyaClinic.id,
    label: 'Morning Session',
    startTime: '10:00',
    endTime: '13:00',
    avgConsultMinutes: 10,
    hospitalFeeAmount: 350,
    doctorStatus: 'available',
    isQueueOpen: false,
  })

  // Same doctor, same clinic, same slot — tomorrow and the day after,
  // exactly like Dr. Kumar's Sunrise sessions above. Without these, a
  // Warangal doctor's DateStrip never renders at all (it only shows up
  // once there's more than one date's Session record to switch
  // between) — this was reported back as "date selection isn't
  // working," but the date selector itself was fine; there was simply
  // nothing to select between yet.
  addSession({
    doctorId: drSuman.id,
    clinicId: kakatiyaClinic.id,
    label: 'Morning Session',
    date: dateOffset(1),
    startTime: '09:00',
    endTime: '13:00',
    avgConsultMinutes: 8,
    hospitalFeeAmount: 300,
    doctorStatus: 'available',
    isQueueOpen: false,
  })
  addSession({
    doctorId: drSuman.id,
    clinicId: kakatiyaClinic.id,
    label: 'Morning Session',
    date: dateOffset(2),
    startTime: '09:00',
    endTime: '13:00',
    avgConsultMinutes: 8,
    hospitalFeeAmount: 300,
    doctorStatus: 'available',
    isQueueOpen: false,
  })
  addSession({
    doctorId: drAnjali.id,
    clinicId: kakatiyaClinic.id,
    label: 'Morning Session',
    date: dateOffset(1),
    startTime: '10:00',
    endTime: '13:00',
    avgConsultMinutes: 10,
    hospitalFeeAmount: 350,
    doctorStatus: 'available',
    isQueueOpen: false,
  })
  addSession({
    doctorId: drAnjali.id,
    clinicId: kakatiyaClinic.id,
    label: 'Morning Session',
    date: dateOffset(2),
    startTime: '10:00',
    endTime: '13:00',
    avgConsultMinutes: 10,
    hospitalFeeAmount: 350,
    doctorStatus: 'available',
    isQueueOpen: false,
  })

  // --- More Warangal — a third clinic and three more doctors, so the
  // city reads as a real local market rather than one doctor's
  // showcase. Same fictional-identity-on-real-geography convention.
  const ramnagarClinic = addClinic({
    name: 'Ramnagar Multispecialty Clinic',
    location: 'Ramnagar, Hanamkonda',
    city: 'Warangal',
    photoUrl: clinicPhoto('ramnagar-multispecialty-clinic'),
  })

  const drSrinivas = addDoctor({
    name: 'Dr. Srinivas Bommakanti',
    specialty: 'Orthopedic Surgeon',
    qualifications: 'MBBS, MS (Ortho)',
    photoUrl: doctorPhoto('dr-srinivas-bommakanti'),
  })
  const drDivya = addDoctor({
    name: 'Dr. Divya Sagi',
    specialty: 'Gynecologist',
    qualifications: 'MBBS, MS (OBG)',
    photoUrl: doctorPhoto('dr-divya-sagi'),
  })
  const drManohar = addDoctor({
    name: 'Dr. Manohar Ravella',
    specialty: 'ENT Specialist',
    qualifications: 'MBBS, MS (ENT)',
    photoUrl: doctorPhoto('dr-manohar-ravella'),
  })

  // A second "live" Warangal session, at a different clinic — so
  // Warangal has more than one thing happening right now, the same way
  // Hyderabad does.
  const srinivasLive = addSession({
    doctorId: drSrinivas.id,
    clinicId: ramnagarClinic.id,
    label: 'Morning Session',
    startTime: relTime(-1.5),
    endTime: relTime(2.5),
    avgConsultMinutes: 12,
    hospitalFeeAmount: 450,
    doctorStatus: 'available',
    isQueueOpen: true,
    nextTokenNumber: 6,
    currentToken: 4,
  })
  for (let t = 1; t <= 3; t++) {
    addEntry({
      sessionId: srinivasLive.id,
      tokenNumber: t,
      source: t === 2 ? 'offline' : 'online',
      priority: 'regular',
      status: 'completed',
      patientName: DEMO_NAMES[(t + 10) % DEMO_NAMES.length],
      completedAt: new Date(Date.now() - (4 - t) * 12 * 60_000).toISOString(),
    })
  }
  addEntry({
    sessionId: srinivasLive.id,
    tokenNumber: 4,
    source: 'online',
    priority: 'regular',
    status: 'in_progress',
    patientName: 'Priyanka Nair',
    calledAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    startedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    ...onlinePayment('ONLINE', 450, '3312'),
  })
  addEntry({
    sessionId: srinivasLive.id,
    tokenNumber: 5,
    source: 'offline',
    priority: 'priority',
    status: 'waiting',
    patientName: 'Ganesh Patil',
    priorityAssignedBy: 'Front Desk, Ramnagar',
  })
  addSession({
    doctorId: drSrinivas.id,
    clinicId: ramnagarClinic.id,
    label: 'Morning Session',
    date: dateOffset(1),
    startTime: '09:30',
    endTime: '13:30',
    avgConsultMinutes: 12,
    hospitalFeeAmount: 450,
    doctorStatus: 'available',
    isQueueOpen: false,
  })

  addSession({
    doctorId: drDivya.id,
    clinicId: ramnagarClinic.id,
    label: 'Evening Session',
    startTime: '17:30',
    endTime: '20:30',
    avgConsultMinutes: 15,
    hospitalFeeAmount: 500,
    doctorStatus: 'available',
    isQueueOpen: false,
  })
  addSession({
    doctorId: drManohar.id,
    clinicId: subedariClinic.id,
    label: 'Morning Session',
    startTime: '09:00',
    endTime: '12:00',
    avgConsultMinutes: 10,
    hospitalFeeAmount: 350,
    doctorStatus: 'available',
    isQueueOpen: false,
  })

  // --- More Warangal doctors — three more clinicians so the city's
  // three clinics read as a genuinely active local market, not one or
  // two doctors' showcase. Same fictional-identity-on-real-geography
  // convention as the rest of this file's own header comment. Subedari
  // specifically had no live session at all until drLakshmi below — a
  // real gap once "which clinics are live right now" became something
  // patients actually compare city to city.
  const drLakshmi = addDoctor({
    name: 'Dr. Lakshmi Chintala',
    specialty: 'Cardiologist',
    qualifications: 'MBBS, DM (Cardiology)',
    photoUrl: doctorPhoto('dr-lakshmi-chintala'),
  })
  const drRaviTeja = addDoctor({
    name: 'Dr. Ravi Teja Bandari',
    specialty: 'Dentist',
    qualifications: 'BDS, MDS (Prosthodontics)',
    photoUrl: doctorPhoto('dr-ravi-teja-bandari'),
  })
  const drSwetha = addDoctor({
    name: 'Dr. Swetha Konda',
    specialty: 'General Physician',
    qualifications: 'MBBS, MD (General Medicine)',
    photoUrl: doctorPhoto('dr-swetha-konda'),
  })

  // A third live Warangal session, at Subedari specifically — so all
  // three Warangal clinics have something happening right now, the same
  // way Hyderabad's do.
  const lakshmiLive = addSession({
    doctorId: drLakshmi.id,
    clinicId: subedariClinic.id,
    label: 'Morning Session',
    startTime: relTime(-1),
    endTime: relTime(3),
    avgConsultMinutes: 11,
    hospitalFeeAmount: 600,
    doctorStatus: 'available',
    isQueueOpen: true,
    nextTokenNumber: 6,
    currentToken: 3,
  })
  for (let t = 1; t <= 2; t++) {
    addEntry({
      sessionId: lakshmiLive.id,
      tokenNumber: t,
      source: t === 1 ? 'online' : 'offline',
      priority: 'regular',
      status: 'completed',
      patientName: DEMO_NAMES[(t + 14) % DEMO_NAMES.length],
      completedAt: new Date(Date.now() - (3 - t) * 15 * 60_000).toISOString(),
    })
  }
  addEntry({
    sessionId: lakshmiLive.id,
    tokenNumber: 3,
    source: 'online',
    priority: 'regular',
    status: 'in_progress',
    patientName: 'Kiran Bathula',
    calledAt: new Date(Date.now() - 6 * 60_000).toISOString(),
    startedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    ...onlinePayment('ONLINE', 600, '4471'),
  })
  addEntry({ sessionId: lakshmiLive.id, tokenNumber: 4, source: 'offline', priority: 'regular', status: 'waiting', patientName: 'Manoj Pillai' })
  addEntry({
    sessionId: lakshmiLive.id,
    tokenNumber: 5,
    source: 'online',
    priority: 'regular',
    status: 'waiting',
    patientName: 'Aditi Varma',
    ...onlinePayment('PAY_AT_HOSPITAL', 600, '5023'),
  })

  addSession({
    doctorId: drRaviTeja.id,
    clinicId: kakatiyaClinic.id,
    label: 'Evening Session',
    startTime: '16:00',
    endTime: '19:00',
    avgConsultMinutes: 20,
    hospitalFeeAmount: 400,
    doctorStatus: 'available',
    isQueueOpen: false,
  })
  addSession({
    doctorId: drSwetha.id,
    clinicId: ramnagarClinic.id,
    label: 'Evening Session',
    startTime: '18:00',
    endTime: '21:00',
    avgConsultMinutes: 8,
    hospitalFeeAmount: 300,
    doctorStatus: 'available',
    isQueueOpen: false,
  })

  // --- Bengaluru — the location list offered a city with zero actual
  // data in it, which made "choose your location" a decoration rather
  // than something with a real effect once city filtering exists.
  const koramangalaClinic = addClinic({
    name: 'Koramangala Wellness Clinic',
    location: '80 Feet Road, Koramangala',
    city: 'Bengaluru',
    photoUrl: clinicPhoto('koramangala-wellness-clinic'),
  })

  const drIyer2 = addDoctor({
    name: 'Dr. Nandini Iyer',
    specialty: 'Dermatologist',
    qualifications: 'MBBS, MD (Dermatology)',
    photoUrl: doctorPhoto('dr-nandini-iyer'),
  })
  const drRaghavan = addDoctor({
    name: 'Dr. Karthik Raghavan',
    specialty: 'Orthopedic Surgeon',
    qualifications: 'MBBS, MS (Ortho)',
    photoUrl: doctorPhoto('dr-karthik-raghavan'),
  })

  addSession({
    doctorId: drIyer2.id,
    clinicId: koramangalaClinic.id,
    label: 'Morning Session',
    startTime: '09:30',
    endTime: '13:00',
    avgConsultMinutes: 9,
    hospitalFeeAmount: 550,
    doctorStatus: 'available',
    isQueueOpen: false,
  })
  addSession({
    doctorId: drRaghavan.id,
    clinicId: koramangalaClinic.id,
    label: 'Evening Session',
    startTime: '17:00',
    endTime: '20:00',
    avgConsultMinutes: 14,
    hospitalFeeAmount: 700,
    doctorStatus: 'available',
    isQueueOpen: false,
  })

  // --- Demo logins ---------------------------------------------------
  // One account per role, so the rebuilt staff/hospital side (see
  // docs/VISITNOW_PRODUCT_DECISIONS.md's multi-tenant auth section) is
  // explorable with real, differently-scoped credentials immediately —
  // not one shared passcode that saw everything. This is the one place
  // every demo login lives; there's no "forgot password"/email flow in
  // this phase, so a login not listed here doesn't exist.
  //
  // | Account                    | Role               | Scope / permissions                        | Email                              | Password         |
  // |-----------------------------|--------------------|---------------------------------------------|-------------------------------------|------------------|
  // | VisitNow Ops                | super_admin        | every clinic, platform revenue, everything  | admin@visitnow.app                  | visitnow2026     |
  // | VisitNow Ops — Hospitals    | super_admin_staff  | hospitals, doctors only                     | staff.hospitals@visitnow.app        | staff2026        |
  // | VisitNow Ops — Payments     | super_admin_staff  | payments, settlements, refunds, coupons only| staff.payments@visitnow.app         | staff2026        |
  // | Sunrise/City Care admin     | hospital_admin     | Sunrise Multispecialty Clinic, everything   | admin@sunriseclinic.demo            | sunrise2026      |
  // | Metro Diagnostics admin     | hospital_admin     | Metro Diagnostics & Clinic, everything      | admin@metrodiagnostics.demo         | metro2026        |
  // | Kakatiya General admin      | hospital_admin     | Kakatiya General Clinic, everything         | admin@kakatiyaclinic.demo           | kakatiya2026     |
  // | Sunrise front desk          | hospital_staff     | Sunrise — queue, tokens, appointments only  | frontdesk@sunriseclinic.demo        | frontdesk2026    |
  // | Sunrise payments desk       | hospital_staff     | Sunrise — payments, refunds only, no queue  | payments@sunriseclinic.demo         | payments2026     |
  // | Dr. Ashwin Kumar            | doctor             | Sunrise + City Care Hospital                | ashwin.kumar@visitnow.demo          | doctor2026       |
  // | Dr. Kavya Reddy             | doctor             | Metro Diagnostics + Lakeview                | kavya.reddy@visitnow.demo           | doctor2026       |
  //
  // The two hospital_staff accounts and two super_admin_staff accounts
  // are deliberately given *different, non-overlapping* permission
  // subsets — the whole point of this round over the previous "any
  // staff account can do everything" shape — matching the product
  // spec's own examples ("Reception Staff → offline patients +
  // appointments + queue", "Payment Staff → cash verification +
  // payments"). Kumar and Reddy are deliberately the two doctors already
  // seeded working two clinics each, above — the doctor dashboard's
  // "your clinics" list has genuine multi-clinic data to demo.
  addAccount({ role: 'super_admin', email: 'admin@visitnow.app', password: 'visitnow2026', displayName: 'VisitNow Ops' })
  addAccount({
    role: 'super_admin_staff',
    email: 'staff.hospitals@visitnow.app',
    password: 'staff2026',
    displayName: 'VisitNow Ops: Hospitals',
    permissions: ['hospitals', 'doctors'],
  })
  addAccount({
    role: 'super_admin_staff',
    email: 'staff.payments@visitnow.app',
    password: 'staff2026',
    displayName: 'VisitNow Ops: Payments',
    permissions: ['payments', 'settlements', 'refunds', 'coupons'],
  })
  // The product spec's own third example ("Staff C → Users + CRM") — a
  // seeded account so the CRM directory and platform notifications feed
  // have a real, permission-scoped login to demo/test against, same as
  // the hospitals/payments staff above.
  addAccount({
    role: 'super_admin_staff',
    email: 'staff.users@visitnow.app',
    password: 'staff2026',
    displayName: 'VisitNow Ops: Users & CRM',
    permissions: ['users', 'crm', 'notifications', 'reports'],
  })
  addAccount({ role: 'hospital_admin', email: 'admin@sunriseclinic.demo', password: 'sunrise2026', displayName: 'Sunrise Admin', clinicId: sunrise.id })
  addAccount({ role: 'hospital_admin', email: 'admin@metrodiagnostics.demo', password: 'metro2026', displayName: 'Metro Diagnostics Admin', clinicId: metroDiagnostics.id })
  addAccount({ role: 'hospital_admin', email: 'admin@kakatiyaclinic.demo', password: 'kakatiya2026', displayName: 'Kakatiya Admin', clinicId: kakatiyaClinic.id })
  addAccount({
    role: 'hospital_staff',
    email: 'frontdesk@sunriseclinic.demo',
    password: 'frontdesk2026',
    displayName: 'Sunrise Front Desk',
    clinicId: sunrise.id,
    permissions: ['queue', 'tokens', 'appointments', 'notifications'],
  })
  addAccount({
    role: 'hospital_staff',
    email: 'payments@sunriseclinic.demo',
    password: 'payments2026',
    displayName: 'Sunrise Payments Desk',
    clinicId: sunrise.id,
    permissions: ['payments', 'refunds'],
  })

  const kumarAccount = addAccount({ role: 'doctor', email: 'ashwin.kumar@visitnow.demo', password: 'doctor2026', displayName: drKumar.name, doctorId: drKumar.id })
  drKumar.accountId = kumarAccount.id
  const reddyAccount = addAccount({ role: 'doctor', email: 'kavya.reddy@visitnow.demo', password: 'doctor2026', displayName: drReddy.name, doctorId: drReddy.id })
  drReddy.accountId = reddyAccount.id
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
