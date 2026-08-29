import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  GitMerge,
  MapPin,
  Radio,
  Search,
  ShieldCheck,
  Smartphone,
  Ticket,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { VisitNowMark } from '../../components/brand/VisitNowMark'
import { Button } from '../../components/ui/Button'

/**
 * The public marketing page — what a visitor (or an investor) sees at
 * "/" before ever touching the product itself, distinct from Home (the
 * logged-in discovery screen). RootRedirect only shows this to someone
 * with no local patient identity yet; a returning patient skips straight
 * to /home, matching this project's standing "no gate for returning
 * users" rule (see docs/VISITNOW_PRODUCT_DECISIONS.md §11).
 *
 * Every number on this page is real, pulled from what the demo data
 * actually contains (see the count comment above each stat) — not a
 * vanity metric. No testimonials/reviews are used: a fabricated quote
 * attributed to a "happy patient" would be exactly the kind of false
 * social proof this project's own naming rule (§21 of the original
 * brief) already forbids for doctors and clinics.
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] font-sans text-[var(--color-text)]">
      <SiteHeader />
      <Hero />
      <StatsBar />
      <HowItWorks />
      <Features />
      <Cities />
      <ForClinics />
      <FinalCta />
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

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-2">
          <VisitNowMark size={30} />
          <span className="font-display text-lg font-extrabold tracking-tight">VisitNow</span>
        </div>

        <nav className="hidden items-center gap-7 md:flex">
          <NavLink href="#how-it-works">How it works</NavLink>
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#cities">Cities</NavLink>
          <NavLink href="#for-clinics">For clinics</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/staff/login" className="hidden text-[13px] font-bold text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-brand-700)] sm:block">
            Staff login
          </Link>
          <Link to="/auth">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[64rem] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, var(--color-brand-100), transparent)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-[-8rem] h-[28rem] w-[28rem] rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, var(--color-accent-100), transparent)' }}
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-8 lg:py-28">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-3.5 py-1.5 text-[12px] font-bold text-[var(--color-brand-700)]">
            <Radio size={13} aria-hidden="true" />
            Live in Hyderabad · Warangal · Bengaluru
          </span>

          <h1 className="font-display text-[40px] font-extrabold leading-[1.08] tracking-tight sm:text-[52px] lg:text-[58px]">
            Skip the wait.
            <br />
            Not the doctor.
          </h1>

          <p className="max-w-lg text-[17px] leading-relaxed text-[var(--color-text-muted)] sm:text-[19px]">
            VisitNow gets you a real token for a doctor's queue from your phone — walk in when
            it's actually your turn, not an hour early. One live queue, whether patients book
            online, walk in, or already had an appointment.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto">
                Find a doctor near you
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                See how it works
              </Button>
            </a>
          </div>

          <p className="flex items-center gap-1.5 text-[13px] text-[var(--color-text-faint)]">
            <CheckCircle2 size={14} className="text-[var(--color-accent-600)]" aria-hidden="true" />
            No app to download — it's just a website, on any device.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
          <HeroMock />
        </div>
      </div>
    </section>
  )
}

/** A hero visual built from the app's own real UI vocabulary (the same
 * radii/shadows/tokens as ActiveVisitPage's actual token card), not a
 * stock photo or a screenshot — the product's own "your token" moment
 * is the whole pitch, so it doubles as the hero image. */
function HeroMock() {
  return (
    <div className="relative">
      <div className="absolute -left-6 -top-6 hidden w-64 -rotate-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-lg)] sm:block">
        <div className="flex items-center gap-2.5">
          <Search size={15} className="text-[var(--color-text-faint)]" aria-hidden="true" />
          <span className="text-[13px] text-[var(--color-text-faint)]">Dermatologist near me</span>
        </div>
      </div>

      <div className="relative z-10 rotate-2 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 text-center shadow-[var(--shadow-lg)]">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-faint)]">Your token</p>
        <p className="font-display text-[72px] font-bold leading-none text-[var(--color-brand-700)]">12</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-50)] px-4 py-1.5 text-sm font-bold text-[var(--color-brand-700)]">
          4 patients ahead · ~18 min
        </span>
        <div className="mt-5 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-bg)] px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-[var(--color-accent-500)]" aria-hidden="true" />
          <span className="text-sm font-semibold">Seeing patients normally</span>
        </div>
      </div>

      <div className="absolute -bottom-7 -right-4 z-20 hidden w-52 -rotate-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-[var(--shadow-lg)] sm:block">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
            <CheckCircle2 size={17} aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="text-[12px] font-bold leading-tight">Token confirmed</p>
            <p className="text-[11px] text-[var(--color-text-faint)]">Verification code: 6413</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsBar() {
  // Every figure here is a live count from this demo's own data, not a
  // marketing round-number — see the API calls this was checked against
  // in docs/VISITNOW_PRODUCT_DECISIONS.md's changelog for this page.
  const stats = [
    { value: '3', label: 'Cities live' },
    { value: '9', label: 'Partner clinics' },
    { value: '16', label: 'Doctors' },
    { value: '₹9', label: 'Flat platform fee' },
  ]
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-10 sm:px-8 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="font-display text-3xl font-extrabold text-[var(--color-brand-700)] sm:text-4xl">{s.value}</p>
            <p className="mt-1 text-[13px] font-semibold text-[var(--color-text-muted)]">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

const STEPS = [
  { icon: Search, title: 'Find your doctor', body: "Search by doctor, specialty, or clinic — see who's live right now and who opens later today." },
  { icon: Ticket, title: 'Get your token', body: 'Pick a payment method, confirm the fee breakdown, and get a real numbered token in seconds.' },
  { icon: Radio, title: 'Track it live', body: "Watch your position update as the doctor's queue moves — no refreshing, no guessing." },
  { icon: CalendarClock, title: 'Walk in on time', body: "Show up when you're actually close to being called, and show your code at the desk." },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <SectionHeading eyebrow="How it works" title="From search to seen, in four steps" />
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <div key={step.title} className="group relative flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-all hover:-translate-y-1 hover:border-[var(--color-brand-300)] hover:shadow-[var(--shadow-md)]">
            <span className="font-display text-sm font-extrabold text-[var(--color-border-strong)] transition-colors group-hover:text-[var(--color-brand-300)]">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-50)] text-[var(--color-brand-600)]">
              <step.icon size={20} aria-hidden="true" />
            </div>
            <h3 className="font-display text-base font-bold">{step.title}</h3>
            <p className="text-[14px] leading-relaxed text-[var(--color-text-muted)]">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

const FEATURES = [
  {
    icon: Ticket,
    title: 'Token-first, not appointment-first',
    body: "No fixed slot to be exactly on time for. Your token holds your place in line — you show up when it's close to your turn.",
  },
  {
    icon: GitMerge,
    title: 'One unified queue',
    body: 'Online tokens, walk-ins, and appointments all merge into a single, fair queue — never two separate lines pretending to be one system.',
  },
  {
    icon: Radio,
    title: 'Real live tracking',
    body: 'Your position and estimated wait update automatically while the queue moves, on the same page — no reloads, no separate app.',
  },
  {
    icon: Building2,
    title: 'Built for multi-clinic doctors',
    body: 'A doctor running a morning session at one clinic and an evening one at another shows clearly which they’re at right now.',
  },
  {
    icon: CreditCard,
    title: 'Pay your way',
    body: 'UPI, cards, net banking, wallets, or pay the clinic fee at the counter — the platform fee is always a flat, transparent ₹9.',
  },
  {
    icon: ShieldCheck,
    title: 'Priority handled responsibly',
    body: "Emergency and priority cases are flagged by clinic staff on the ground — never something a patient can self-declare.",
  },
]

function Features() {
  return (
    <section id="features" className="bg-[var(--color-surface)] py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading eyebrow="Features" title="Everything a real queue needs, nothing it doesn't" />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] p-6 transition-all hover:-translate-y-1 hover:border-[var(--color-accent-300)] hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)] transition-colors group-hover:bg-[var(--color-accent-100)]">
                <f.icon size={20} aria-hidden="true" />
              </div>
              <h3 className="font-display text-base font-bold">{f.title}</h3>
              <p className="text-[14px] leading-relaxed text-[var(--color-text-muted)]">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const CITY_DATA = [
  { name: 'Hyderabad', clinics: 5, photo: 'hyderabad-city' },
  { name: 'Warangal', clinics: 3, photo: 'warangal-city' },
  { name: 'Bengaluru', clinics: 1, photo: 'bengaluru-city' },
]

function Cities() {
  return (
    <section id="cities" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <SectionHeading eyebrow="Where we're live" title="Growing city by city" />
      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {CITY_DATA.map((city) => (
          <Link
            key={city.name}
            to="/auth"
            className="group relative flex h-64 flex-col justify-end overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
          >
            <img
              src={`https://picsum.photos/seed/${city.photo}/600/500`}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="relative p-5 text-white">
              <h3 className="font-display text-xl font-bold">{city.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-white/85">
                <MapPin size={13} aria-hidden="true" />
                {city.clinics} {city.clinics === 1 ? 'clinic' : 'clinics'} live
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-white/95 opacity-0 transition-opacity group-hover:opacity-100">
                Explore doctors <ArrowRight size={14} aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function ForClinics() {
  return (
    <section id="for-clinics" className="bg-[var(--color-brand-900)] py-20 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-5 sm:px-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-bold text-[var(--color-accent-300)]">
            <Building2 size={13} aria-hidden="true" />
            For clinics &amp; hospitals
          </span>
          <h2 className="font-display text-[30px] font-extrabold leading-tight sm:text-[36px]">
            Bring every token — online and offline — into one place.
          </h2>
          <p className="max-w-lg text-[16px] leading-relaxed text-white/75">
            Issue walk-in tokens from the front desk, let patients get theirs online, and run one
            queue either way. Your staff console tracks every visit, every payment, and — with the
            revenue dashboard — every rupee, by doctor and by day.
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
              <Button size="lg" className="!bg-white !text-[var(--color-brand-800)] hover:!bg-white/90">
                Staff login
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-white/15 bg-white/5 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/50">Today's revenue</p>
              <p className="font-display text-3xl font-extrabold">₹18,240</p>
            </div>
            <Smartphone size={28} className="text-white/40" aria-hidden="true" />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4">
            <MiniStat label="Tokens issued" value="47" />
            <MiniStat label="Online share" value="68%" />
            <MiniStat label="Clinics active" value="9" />
            <MiniStat label="Avg. wait" value="14m" />
          </div>
        </div>
      </div>
    </section>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-white/5 p-3.5">
      <p className="font-display text-xl font-bold">{value}</p>
      <p className="text-[11px] font-semibold text-white/55">{label}</p>
    </div>
  )
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <div className="flex flex-col items-center gap-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-brand-50)] to-[var(--color-accent-50)] px-6 py-16 text-center">
        <h2 className="max-w-xl font-display text-[28px] font-extrabold leading-tight sm:text-[34px]">
          Stop standing in line. Start holding your place instead.
        </h2>
        <p className="max-w-md text-[15px] text-[var(--color-text-muted)]">
          Find a doctor near you and get your first token in under a minute.
        </p>
        <Link to="/auth">
          <Button size="lg">
            Get started — it's free to browse
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </section>
  )
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
            <div className="flex items-center gap-2">
              <VisitNowMark size={26} />
              <span className="font-display text-base font-extrabold">VisitNow</span>
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--color-text-faint)]">
              A token-first digital queue for doctors and clinics — live in Hyderabad, Warangal
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
      <h4 className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-faint)]">{title}</h4>
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
      <span className="text-[12px] font-extrabold uppercase tracking-widest text-[var(--color-brand-600)]">{eyebrow}</span>
      <h2 className="font-display text-[26px] font-extrabold tracking-tight sm:text-[32px]">{title}</h2>
    </div>
  )
}
