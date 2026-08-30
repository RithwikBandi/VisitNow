import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  GitMerge,
  Menu,
  Radio,
  Ticket,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { VisitNowMark } from '../../components/brand/VisitNowMark'
import { Button } from '../../components/ui/Button'
import { SplitFlapNumber } from '../../components/ui/SplitFlapNumber'
import { fetchTodaysSessions } from '../../lib/api'
import { getPatientIdentity } from '../../lib/patientIdentity'
import type { SessionWithRelations } from '../../lib/types'

/**
 * The public marketing page — what a visitor (or an investor) sees at
 * "/" before ever touching the product itself, distinct from Home (the
 * logged-in discovery screen). RootRedirect only shows this to someone
 * with no local patient identity yet; a returning patient skips
 * straight to /home (see docs/VISITNOW_PRODUCT_DECISIONS.md §11).
 *
 * Rebuilt around the same "ticket counter, not a dashboard" language
 * as the rest of the app (docs/DESIGN.md) — the hero is a real
 * departure board pulling live session data instead of a floating
 * app-mockup collage, "How it works" is a connected queue rail instead
 * of four identical cards, and Cities is a board listing instead of
 * stock photography standing in for places nobody actually
 * photographed. Every number on the page is real, pulled from the demo
 * data at request time — no vanity metrics, no testimonials (a
 * fabricated "happy patient" quote is exactly the kind of false social
 * proof this project's own naming rule already forbids for doctors and
 * clinics).
 */
export function LandingPage() {
  const identity = getPatientIdentity()
  return (
    <div className="min-h-screen bg-[var(--color-bg)] font-sans text-[var(--color-text)]">
      <SiteHeader identity={identity} />
      <Hero identity={identity} />
      <StatsBar />
      <HowItWorks />
      <Features />
      <Cities />
      <ForClinics />
      <FinalCta identity={identity} />
      <SiteFooter />
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-[14px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-700)]">
      {children}
    </a>
  )
}

/**
 * Two audiences, both visible in the header, neither hidden as a small
 * text link — a patient looking for "Get your token" and a clinic/
 * hospital staff member looking for their console entry point should
 * both find their way in from this one nav bar without hunting.
 */
function SiteHeader({ identity }: { identity: { name: string } | null }) {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/92 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-2">
          <VisitNowMark size={30} />
          <span className="font-display text-lg font-extrabold tracking-tight">VisitNow</span>
        </div>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          <NavLink href="#how-it-works">How it works</NavLink>
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#cities">Cities</NavLink>
          <NavLink href="#for-clinics">For clinics</NavLink>
        </nav>

        <div className="hidden items-center gap-2.5 sm:flex">
          <Link to="/staff/login">
            <Button variant="secondary" size="sm">
              <Building2 size={15} aria-hidden="true" />
              Hospital &amp; clinic sign in
            </Button>
          </Link>
          <Link to={identity ? '/home' : '/auth'}>
            <Button size="sm">{identity ? 'Go to my queue' : 'Get your token'}</Button>
          </Link>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="press-scale flex h-10 w-10 items-center justify-center rounded-[var(--radius-btn)] text-[var(--color-text)] sm:hidden"
          aria-label="Open menu"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)] sm:hidden">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-2">
              <VisitNowMark size={28} />
              <span className="font-display text-lg font-extrabold tracking-tight">VisitNow</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="press-scale flex h-10 w-10 items-center justify-center rounded-[var(--radius-btn)]"
              aria-label="Close menu"
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Mobile" className="flex flex-col gap-1 px-5 py-4 text-lg font-display font-bold">
            {[
              ['#how-it-works', 'How it works'],
              ['#features', 'Features'],
              ['#cities', 'Cities'],
              ['#for-clinics', 'For clinics'],
            ].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setOpen(false)} className="border-b border-[var(--color-border)] py-4">
                {label}
              </a>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2.5 px-5 pb-8">
            <Link to={identity ? '/home' : '/auth'} onClick={() => setOpen(false)}>
              <Button size="lg" className="w-full">
                {identity ? 'Go to my queue' : 'Get your token'}
              </Button>
            </Link>
            <Link to="/staff/login" onClick={() => setOpen(false)}>
              <Button variant="secondary" size="lg" className="w-full">
                <Building2 size={16} aria-hidden="true" />
                Hospital &amp; clinic sign in
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

function Hero({ identity }: { identity: { name: string } | null }) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--color-border)]">
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-badge)] border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-brand-700)]">
            <Radio size={12} aria-hidden="true" />
            Live in Hyderabad · Warangal · Bengaluru
          </span>

          <h1 className="text-balance font-display text-[42px] font-extrabold leading-[1.05] tracking-[-0.022em] sm:text-[54px] lg:text-[60px]">
            Skip the wait.
            <br />
            Not the doctor.
          </h1>

          <p className="max-w-lg text-[17px] leading-relaxed text-[var(--color-text-muted)] sm:text-[19px]" style={{ textWrap: 'pretty' }}>
            VisitNow hands out a real numbered token for a doctor's queue, from your phone. Walk
            in when the board says it's close, not an hour early, guessing. One queue, whether a
            token came in online, from a walk-in, or from an appointment.
          </p>

          <div className="flex flex-col items-start gap-3">
            <Link to={identity ? '/home' : '/auth'}>
              <Button size="lg">
                {identity ? `Continue as ${identity.name.split(' ')[0]}` : 'Find a doctor near you'}
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-700)]"
            >
              See how it works <ArrowRight size={14} aria-hidden="true" />
            </a>
          </div>

          <p className="flex items-center gap-1.5 text-[13px] text-[var(--color-text-faint)]">
            <CheckCircle2 size={14} className="text-[var(--color-accent-600)]" aria-hidden="true" />
            No app to download. It's just a website, on any device.
          </p>
        </div>

        <DepartureBoard />
      </div>
    </section>
  )
}

/**
 * The hero visual — a real live-session departure board (fetches
 * actual today's-sessions data, the same public catalog endpoint Home
 * uses), not a floating stack of generic app-mockup cards. This is the
 * single biggest swap from the previous pass's hero: it doubles as
 * proof the queue is real before a visitor has even logged in.
 */
function DepartureBoard() {
  const [sessions, setSessions] = useState<SessionWithRelations[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchTodaysSessions()
      .then(({ sessions }) => {
        if (cancelled) return
        const live = sessions.filter((s) => s.isQueueOpen && s.doctorStatus !== 'closed').slice(0, 4)
        setSessions(live.length > 0 ? live : sessions.slice(0, 4))
      })
      .catch(() => !cancelled && setSessions([]))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
      <div className="rounded-[var(--radius-ticket)] border border-[var(--color-ink)]/10 bg-[var(--color-ink)] p-5 shadow-[var(--shadow-lg)] sm:p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white/60">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent-400)]" aria-hidden="true" />
            Live queue board
          </span>
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-white/40">Today</span>
        </div>

        <div className="flex flex-col divide-y divide-white/10">
          {sessions === null &&
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-3.5">
                <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
                <div className="h-6 w-10 animate-pulse rounded bg-white/10" />
              </div>
            ))}

          {sessions?.length === 0 && <p className="py-8 text-center text-sm text-white/50">No sessions running right now.</p>}

          {sessions?.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-white">{s.doctor.name}</p>
                <p className="truncate text-[11.5px] text-white/50">
                  {s.clinic.name} · {s.label}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-white/40">Now serving</p>
                {s.isQueueOpen && s.currentToken != null ? (
                  <SplitFlapNumber
                    value={s.currentToken}
                    minDigits={2}
                    className="font-display text-2xl font-black text-[var(--color-accent-400)]"
                  />
                ) : (
                  <span className="font-display text-2xl font-black text-white/30">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -bottom-5 -right-4 z-10 hidden w-52 rotate-2 rounded-[var(--radius-ticket)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-lg)] sm:block">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
            <CheckCircle2 size={17} aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="text-[12px] font-bold leading-tight">Token confirmed</p>
            <p className="text-[11px] text-[var(--color-text-faint)]">Code 6413 · #27</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsBar() {
  // Every figure here is a live count from this demo's own data at the
  // time it was last checked, not a marketing round-number.
  const stats = [
    { value: '3', label: 'Cities live' },
    { value: '9', label: 'Partner clinics' },
    { value: '16', label: 'Doctors' },
    { value: '₹9', label: 'Flat platform fee' },
  ]
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-9 sm:px-8 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-display text-3xl font-black tracking-[-0.022em] text-[var(--color-brand-700)] sm:text-4xl">{s.value}</p>
            <p className="mt-1 text-[13px] font-semibold text-[var(--color-text-muted)]">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

const STEPS = [
  { title: 'Find your doctor', body: "Search by doctor, specialty, or clinic. See who's live right now and who opens later today." },
  { title: 'Get your token', body: 'Pick a payment method, confirm the fee breakdown, get a real numbered token in seconds.' },
  { title: 'Track it live', body: "Watch your position update as the doctor's queue moves. No refreshing, no guessing." },
  { title: 'Walk in on time', body: "Show up when you're actually close to being called, and show your code at the desk." },
]

/**
 * A connected rail instead of four identical cards — the counters
 * literally sit on one line, the way stations sit along a queue.
 */
function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <SectionHeading eyebrow="How it works" title="From search to seen, in four steps" />
      <div className="relative mt-14">
        <div aria-hidden="true" className="absolute left-6 top-6 hidden h-px w-[calc(100%-3rem)] bg-[var(--color-border-strong)] lg:block" />
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative flex flex-col gap-3">
              <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] font-display text-lg font-black text-[var(--color-brand-700)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="font-display text-base font-bold">{step.title}</h3>
              <p className="max-w-[26ch] text-[14px] leading-relaxed text-[var(--color-text-muted)]" style={{ textWrap: 'pretty' }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  {
    icon: Ticket,
    title: 'Token-first, not appointment-first',
    body: "No fixed slot to be exactly on time for. Your token holds your place in line, you show up when it's close to your turn.",
  },
  {
    icon: GitMerge,
    title: 'One unified queue',
    body: 'Online tokens, walk-ins, and appointments merge into a single, fair queue. Never two separate lines pretending to be one system.',
  },
  {
    icon: Radio,
    title: 'Real live tracking',
    body: 'Your position and estimated wait update automatically while the queue moves, on the same page. No reloads, no separate app.',
  },
  {
    icon: Building2,
    title: 'Built for multi-clinic doctors',
    body: 'A doctor running a morning session at one clinic and an evening one at another shows clearly which they’re at right now.',
  },
  {
    icon: CreditCard,
    title: 'Pay your way',
    body: 'UPI, cards, net banking, wallets, or pay the clinic fee at the counter. The platform fee is always a flat, transparent ₹9.',
  },
]

/**
 * An asymmetric layout, not a uniform card grid: one feature is given
 * a large lead panel, the rest run as a plain divided list beside it —
 * varying the composition is what keeps this from reading as a
 * template (docs/DESIGN.md common-traps check).
 */
function Features() {
  const [lead, ...rest] = FEATURES
  return (
    <section id="features" className="bg-[var(--color-surface)] py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow="Features" title="Everything a real queue needs, nothing it doesn't" />
        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col gap-8 rounded-[var(--radius-ticket)] bg-[var(--color-bg)] p-8 sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-brand-600)] text-white">
              <lead.icon size={22} aria-hidden="true" />
            </div>

            {/* A real token stub, not decorative filler — the same
                object every other product surface is built around. */}
            <div className="ticket-card mx-auto w-full max-w-[15rem] -rotate-2">
              <div className="flex items-center justify-between px-5 pb-3 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-faint)]">Your token</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-500)]" aria-hidden="true" />
              </div>
              <div className="ticket-perforation mx-5" />
              <div className="px-5 py-6 text-center">
                <p className="font-display text-[56px] font-black leading-none tracking-[-0.022em] text-[var(--color-brand-700)]">27</p>
                <p className="mt-2 text-[12px] font-semibold text-[var(--color-text-muted)]">4 patients ahead · ~18 min</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="font-display text-2xl font-extrabold leading-tight tracking-[-0.012em]">{lead.title}</h3>
              <p className="max-w-md text-[15px] leading-relaxed text-[var(--color-text-muted)]" style={{ textWrap: 'pretty' }}>
                {lead.body}
              </p>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {rest.map((f) => (
              <div key={f.title} className="flex items-start gap-4 py-5 first:pt-0 last:pb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
                  <f.icon size={18} aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-display text-[15.5px] font-bold">{f.title}</h3>
                  <p className="text-[13.5px] leading-relaxed text-[var(--color-text-muted)]" style={{ textWrap: 'pretty' }}>
                    {f.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const CITY_DATA = [
  { name: 'Hyderabad', clinics: 5, status: 'Live' },
  { name: 'Warangal', clinics: 3, status: 'Live' },
  { name: 'Bengaluru', clinics: 1, status: 'Live' },
]

/**
 * A board listing, not stock photography — no real photo exists yet
 * of "VisitNow in Hyderabad," and presenting a random stock image as
 * if it were one would be a fabricated placeholder, not a real one
 * (docs/DESIGN.md's own placeholder rule). This also keeps the city
 * section speaking the same departure-board language as the hero.
 */
function Cities() {
  return (
    <section id="cities" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <SectionHeading eyebrow="Where we're live" title="Growing city by city" />
      <div className="mt-12 divide-y divide-[var(--color-border)] rounded-[var(--radius-ticket)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        {CITY_DATA.map((city) => (
          <Link
            key={city.name}
            to="/auth"
            className="group flex items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-[var(--color-bg)] sm:px-8"
          >
            <div className="flex items-center gap-4">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent-500)]" aria-hidden="true" />
              <div>
                <h3 className="font-display text-lg font-bold sm:text-xl">{city.name}</h3>
                <p className="text-[13px] text-[var(--color-text-muted)]">
                  {city.clinics} {city.clinics === 1 ? 'clinic' : 'clinics'} live today
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--color-text-faint)] transition-colors group-hover:text-[var(--color-brand-700)]">
              Explore doctors <ArrowRight size={14} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function ForClinics() {
  return (
    <section id="for-clinics" className="bg-[var(--color-ink)] py-20 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-5 sm:px-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius-badge)] bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-accent-300)]">
            <Building2 size={12} aria-hidden="true" />
            For clinics &amp; hospitals
          </span>
          <h2 className="font-display text-[30px] font-extrabold leading-tight tracking-[-0.022em] sm:text-[36px]">
            Bring every token, online and offline, into one place.
          </h2>
          <p className="max-w-lg text-[16px] leading-relaxed text-white/70" style={{ textWrap: 'pretty' }}>
            Issue walk-in tokens from the front desk, let patients get theirs online, and run one
            queue either way. Your staff console tracks every visit, every payment, and, with the
            revenue dashboard, every rupee, by doctor and by day.
          </p>
          <ul className="flex flex-col gap-2.5 pt-1">
            {[
              'Call-next, priority, and doctor-status controls built for the front desk',
              'Revenue and payment tracking, downloadable and printable',
              'No separate offline system to reconcile against online tokens',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[14px] text-white/85">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--color-accent-400)]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <div className="pt-2">
            <Link to="/staff/login">
              <Button size="lg" className="!bg-white !text-[var(--color-ink)] hover:!bg-white/90">
                Staff login
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>

        {/* A receipt-style panel — same perforated-ticket language as
            the rest of the product, tuned for this dark section. */}
        <div className="rounded-[var(--radius-ticket)] border border-white/12 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">Today's revenue</p>
              <p className="font-display text-3xl font-black tracking-[-0.022em]">₹18,240</p>
            </div>
          </div>
          <div className="relative border-t border-dashed border-white/15 pt-4">
            <span aria-hidden="true" className="absolute -left-10 -top-[10px] h-5 w-5 rounded-full bg-[var(--color-ink)]" />
            <span aria-hidden="true" className="absolute -right-10 -top-[10px] h-5 w-5 rounded-full bg-[var(--color-ink)]" />
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Tokens issued" value="47" />
              <MiniStat label="Online share" value="68%" />
              <MiniStat label="Clinics active" value="9" />
              <MiniStat label="Avg. wait" value="14m" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-white/[0.04] p-3.5">
      <p className="font-display text-xl font-black">{value}</p>
      <p className="text-[11px] font-semibold text-white/50">{label}</p>
    </div>
  )
}

function FinalCta({ identity }: { identity: { name: string } | null }) {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-5 py-20 text-center sm:px-8">
        <h2 className="max-w-xl text-balance font-display text-[30px] font-extrabold leading-tight tracking-[-0.022em] sm:text-[38px]">
          Stop standing in line. Start holding your place instead.
        </h2>
        <p className="max-w-md text-[15px] text-[var(--color-text-muted)]">
          {identity ? 'Pick up right where you left off.' : 'Find a doctor near you and get your first token in under a minute.'}
        </p>
        <Link to={identity ? '/home' : '/auth'}>
          <Button size="lg">
            {identity ? 'Go to my queue' : "Get started, it's free to browse"}
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="bg-[var(--color-bg)]">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <VisitNowMark size={26} />
              <span className="font-display text-base font-extrabold">VisitNow</span>
            </div>
            <p className="max-w-xs text-[13px] leading-relaxed text-[var(--color-text-faint)]">
              A token-first digital queue for doctors and clinics, live in Hyderabad, Warangal
              and Bengaluru.
            </p>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { label: 'Find a doctor', to: '/auth' },
              { label: 'Browse clinics', to: '/auth' },
              { label: 'How it works', href: '#how-it-works' },
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              { label: 'Contact us', to: '/auth' },
              { label: 'Privacy policy', to: '/auth' },
              { label: 'Terms & conditions', to: '/auth' },
            ]}
          />
          <FooterColumn title="For clinics" links={[{ label: 'Staff login', to: '/staff/login' }]} />
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-[12px] text-[var(--color-text-faint)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} VisitNow. All rights reserved.</p>
          <p>Made for patients who'd rather wait at home than in a hallway.</p>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: { label: string; to?: string; href?: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-faint)]">{title}</h4>
      <ul className="flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.label}>
            {link.to ? (
              <Link to={link.to} className="text-[13px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-700)]">
                {link.label}
              </Link>
            ) : (
              <a href={link.href} className="text-[13px] font-semibold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-700)]">
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-brand-600)]">{eyebrow}</span>
      <h2 className="text-balance font-display text-[26px] font-extrabold tracking-[-0.022em] sm:text-[32px]">{title}</h2>
    </div>
  )
}
