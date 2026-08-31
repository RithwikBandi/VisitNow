# VisitNow Investor Context

This document is the knowledge-transfer layer between the actual codebase and any investor-facing
material (deck, one-pager, conversation). Every claim below was checked directly against the
running code as of this writing, not copied from an earlier document. Where something couldn't be
directly verified, or exists only partially, it's labeled:

- **VERIFIED** — confirmed by reading the actual code and/or exercising the live product.
- **PARTIALLY IMPLEMENTED** — the backend, the frontend, or the flow exists, but not the whole path.
- **SIMULATED** — behaves like the real thing but isn't wired to any real external system.
- **FUTURE** — not built; a stated direction only.
- **UNVERIFIED** — a claim this document can't confirm one way or the other from the project alone.

No revenue, user, hospital, partnership, retention, or traction numbers appear anywhere below,
because none exist in the project to verify. Anywhere a real number would strengthen a claim, this
document says so explicitly rather than inventing one.

---

## 1. Product in One Sentence

VisitNow digitizes the token a patient already gets at a local clinic, so they can see it move
before they're standing in the waiting room. **VERIFIED** — this is the literal product: a real
numbered token, a live queue position, issued the moment a patient books, whether online, at the
counter, or from a converted appointment.

## 2. Problem

A patient at a local clinic gets a token — a number — and then has no way to know how long that
number actually takes to be called. The only way to protect a place in line is to physically stay
at the clinic. **VERIFIED as the design problem this product is built to answer** (see `docs/
VISITNOW_PRODUCT_DECISIONS.md §1`); no independent market research or user study is in this
project to cite as external validation of the problem — the problem statement is a product thesis,
not a researched finding. **UNVERIFIED** as an externally-sourced fact.

## 3. Target Customer

Two customer types, both real in the product's design (both have working, distinct login flows and
consoles): **VERIFIED**

- **The clinic/hospital** (Hospital Admin) — onboarded as a tenant, runs its own staff, sees its
  own revenue.
- **The doctor** — a login scoped to their own sessions, which may span more than one clinic.

The patient is the end user of the product, not a paying customer of the platform directly — they
pay a small platform fee per token, but the account relationship (onboarding, staff, billing) is
with the clinic.

## 4. Target Market

Local doctors and clinics running a walk-in-token model, extending to small and mid-size
hospitals. **VERIFIED as the product's design target** (the whole data model assumes one clinic =
one tenant, doctors working multiple clinics, walk-in-heavy operations). No market-sizing data
(TAM/SAM/SOM, number of clinics in India, addressable patient volume) exists anywhere in this
project. **UNVERIFIED / not present** — any such figures for a deck would need to come from outside
research, not this codebase.

## 5. Patient Experience

**VERIFIED**, exercised live end-to-end:

- Browse clinics/doctors by city, see who's live right now vs. opening later today.
- Open a doctor's session: see the live queue, today's fee, how many are waiting.
- Get a token: choose pay-online or pay-at-hospital, apply a coupon, confirm.
- Track the token's live position from a dedicated screen (`/queue/:id`), polling every 3 seconds —
  no manual refresh needed. Confirmed live: staff calling the next patient updates the tracking
  screen within the poll window, no reload.
- Cancel a token from the same tracking screen.
- A "My Visits" list (active / upcoming / completed / cancelled), built from queue-entry ids this
  browser has created — see §26 for the one real limitation this design has.

## 6. Doctor / Clinic Experience

**VERIFIED**. A doctor's login shows a personal dashboard scoped only to their own sessions:
today's tokens, today's and this month's revenue, a daily-average token count, revenue broken down
by which of their clinics it came from, and how patients reached them (online / walk-in /
appointment). A "back to dashboard" link and a downloadable/printable report are both real. Doctors
never see another doctor's data, and never see payments/refunds — only their own queue.

## 7. Hospital Experience

**VERIFIED**. A hospital's console (reception/admin login) runs the live queue for the day: call
next, mark complete, skip, flag priority, generate a walk-in token, verify a patient's 4-digit
code, collect a "pay at hospital" fee in person. A separate revenue & analytics view shows day-by-
day trend charts and a full downloadable/printable report. A "Team" page lets the hospital owner
create staff logins and hand each one exactly the modules it needs (see §16).

## 8. Token System

**VERIFIED**. Every visit — online, walk-in, or converted appointment — becomes one `QueueEntry`
with a real, sequential token number, a status (`waiting → called → in_progress → completed`, or
`skipped`/`cancelled`/`no_show`), and a priority tier. This is the actual, literal core of the data
model (`backend/src/types/index.ts`), not a marketing simplification.

## 9. Unified Queue

**VERIFIED**, and confirmed in the ordering code itself
(`backend/src/store/queueEngine.ts`): every entry, regardless of source, is ordered by one rule —
emergency first, then staff-assigned priority, then arrival/token order within a tier. There is no
separate online queue and offline queue; both a walk-in token generated at the counter and an
online token booked from a phone land in the exact same call order. Payment method has no bearing
on queue position — confirmed directly in the code, which never reads `paymentMethod` anywhere in
the ordering logic.

## 10. Online Token Payment

**SIMULATED**, but the flow around it is real. A patient choosing to pay online sees a payment
modal with UPI/card/net-banking/wallet tabs, a processing state, and a success state — visually and
interactionally like a real Indian payment gateway (Razorpay/PayU/Cashfree-style in-page modal, not
a redirect). No money actually moves; no real payment provider is integrated. What's real: the fee
calculation, the coupon discount, the token creation, and the fee being marked `PAID` server-side
the moment checkout completes.

## 11. Pay at Hospital

**VERIFIED, and a real gap that was found and fixed this build.** A patient can pay VisitNow's ₹9
platform fee online and settle the clinic's own fee in person. Reception has a real "Collect fee"
action that marks it paid and records who collected it — before this was added, a pay-at-hospital
fee could be marked "due" at token creation and then never actually recorded as collected anywhere
in the system. That gap is closed; collection is now a real, auditable action.

## 12. ₹9 Platform Fee

**VERIFIED**, exact constant in code (`PLATFORM_FEE_INR = 9`, `backend/src/types/index.ts`). Fixed,
not a percentage. The clinic's own token/consultation fee is set entirely by the clinic and is
never taken a cut of by VisitNow. Example, matching the product's own fee-breakdown screen exactly:
a ₹500 clinic fee + ₹9 platform fee = ₹509 total online; or ₹9 online now, ₹500 at the counter for
pay-at-hospital.

## 13. Priority Queue

**VERIFIED**. Three tiers — emergency, priority, regular — assignable only by a staff account,
never by the patient themselves (there is no patient-facing "mark as emergency" control anywhere in
the product). Every priority assignment records who at the hospital set it.

## 14. Appointment Capability

**PARTIALLY IMPLEMENTED.** The backend has a complete, working appointment API: create a scheduled
appointment, convert it into a real queue entry the moment it should join the queue, or cancel it.
Converting an appointment produces a normal `QueueEntry` (source: `appointment`) that joins the
same unified queue as everything else — this part is real and demonstrated in seed data. What does
**not** exist: a patient-facing screen to actually book an appointment. The only appointment-
sourced entries visible in the product today are pre-seeded demo data, not created through a live
booking flow. This should be presented as a secondary, backend-proven capability, not a finished
patient feature.

## 15. 4-Digit Verification Code

**VERIFIED**. Every online token gets a random 4-digit code, unique among that session's active
entries, that reception can look up to identify the visit at the counter. It is explicitly not an
authentication credential and not reused across visits. Supporting/operational detail, not a
headline feature.

## 16. Current Product Functionality

**VERIFIED**, the full account/role system: Super Admin (platform owner), Super Admin Staff
(platform team, holding only individually-granted modules), Hospital Admin (one clinic's owner),
Hospital Staff (clinic team, same granular-module model), and Doctor. A staff account starts with
zero permissions; the owner grants exactly what a role needs (e.g., reception gets Queue + Tokens,
a cashier gets Payments + Refunds). This is enforced server-side on every request, not just hidden
in the interface. Also real: coupons (percent/flat, platform- or clinic-scoped, server-verified
discount), refunds (for cancelled/no-show tokens with a collected fee), a cross-clinic patient
directory grouped by real visit history, an in-app notification feed, and a printable walk-in token
slip sized for a half-A4 sheet.

## 17. What Is Actually Working

Everything in §5–§9, §11–§13, and §16 is real, exercised code, not a mockup: the full queue engine,
the account/permission system, fee collection and refunds, coupons, the patient directory, revenue
analytics with day-by-day trend charts at doctor/hospital/platform level, and the token-tracking
real-time-feeling loop (verified live: a staff action reaches the patient's screen within a few
seconds, no reload).

## 18. What Is Simulated / Mocked

- **Online payment** (§10) — a realistic UI, no real money movement, no real gateway.
- **Notifications** — an in-app activity log only; no real SMS, push, or email delivery exists.
- **Data persistence** — everything lives in an in-memory store (see §22); nothing survives a
  server restart except through the deliberate demo-reseed script.
- **Demo data itself** — clinic names, doctor names, and patient names throughout the product are
  fictional, written to be realistic rather than generic (see §19), not real partners or patients.

## 19. Demo Data

**VERIFIED, counted directly from the running API as of this writing:**

| Metric | Count |
|---|---|
| Cities | 3 — Hyderabad, Warangal, Bengaluru |
| Clinics/hospitals (tenants) | 9 |
| Doctors | 19 |
| Specialties represented | 9 (General Physician, Cardiologist, Dentist, Dermatologist, ENT Specialist, Gynecologist, Orthopedic Surgeon, Pediatrician, Psychiatrist) |
| Account roles | 5 |

These are seeded, fictional figures that exist to make the multi-tenant, multi-city product story
demonstrable end to end — they describe the platform's working capacity, not live customers,
partnerships, or real-world operating cities. No clinic named in the product has actually adopted
VisitNow.

## 20. Technology

**VERIFIED.** React 19 + TypeScript + Vite frontend, Tailwind v4 with a custom design system;
Node.js + Express + TypeScript backend, a REST API. Real-time feel comes from short-interval
polling (3–5 seconds on live screens), not WebSockets. Auth is real accounts checked server-side on
every request via a bearer token — but see §26 for what's deliberately not yet production-grade
about it. There is **no database** — the entire store is in-memory (JavaScript Maps), which is the
single most important technical fact for an investor conversation about production-readiness (see
§25).

## 21. Business Model

**VERIFIED, as a mechanism** (the code correctly computes and charges it) — **UNVERIFIED as a
proven business model**, since no real transactions, customers, or revenue exist. The mechanism: a
flat ₹9 VisitNow platform fee on every online token, regardless of the clinic's own price. The
clinic keeps its own fee in full. No commission, no percentage, no negotiation per hospital. Growth
levers already built (not just planned): coupons to drive adoption, and a `settlements` permission
module scaffolded for a future automated clinic payout flow (the payout mechanism itself is
**FUTURE**, not built).

## 22. Current Product Status

A complete, working full-stack prototype — real code, real logic, exercised end to end — running on
an **in-memory data store with no database**. Every fact in this document was demonstrated on a
live, running instance of the actual product, not inferred from documentation. It is not connected
to any real payment processor, SMS/push provider, or persistent database, and has no real customers
or users. This is the honest, current state: a fully working demo of the actual product mechanics,
not a production deployment.

## 23. Differentiation

The genuine, verifiable differentiators found in the product itself:

- **Token-first, not appointment-first** — the product's entire data model treats a real numbered
  token as the primary unit, with appointments as a secondary path that converts into the same
  queue. Most booking apps invert this.
- **One queue, not two** — online and walk-in tokens are never tracked separately; verified directly
  in the ordering code, not just claimed in the UI.
- **Built for the real org chart** — one doctor can run independent, simultaneous queues at
  different clinics; one hospital's staff can be handed exactly the permissions their job needs,
  not an all-or-nothing role. Both are modeled in the data, not bolted on.
- **A flat, not a percentage, fee** — removes the standard "are you taking a cut of my margin"
  objection a clinic would raise about a percentage-based platform.

## 24. Future Opportunity

**FUTURE**, not built, but a logical extension of what exists: start with the token and the queue
at one clinic, expand to more doctors and clinics a given doctor already works at, then more cities,
then the operational layer around a clinic's whole day (settlements, real payments, deeper
analytics from real historical queue data once that history exists). No specific timeline, hospital
count, or revenue projection is asserted here, because none is supported by anything in the project.

## 25. Future Backend Requirements

To move from demo to a real deployment, in order of what would actually block real usage first:

1. **A real database.** The single most urgent gap — everything currently resets on server
   restart.
2. **Real payment gateway integration** (Razorpay/Cashfree-class) in place of the simulated
   checkout.
3. **Password hashing and token expiry** — auth today is a real account system, but passwords are
   compared in plain text and bearer tokens never expire; both are deliberate prototype
   simplifications, not oversights, but both need to change before real user data is at stake.
4. **Real notification delivery** (SMS/push/WhatsApp) in place of the in-app-only activity feed.
5. **Automated settlement payouts** to clinics, on top of the already-scaffolded permission module.

## 26. Known Limitations

- **No database** — in-memory store, resets on restart (see §20, §25).
- **No real payments, no real notification delivery** (see §18).
- **No patient accounts** — a patient's identity is a browser-local name/phone, not a verified
  account; "My Visits" is a local list of visit ids, not a server-side login-linked history. A real
  limitation of this design, found and fixed during this build: because that local list persists
  across a demo reset while the backend's ids restart from zero, a stale id could silently resolve
  to a different, unrelated patient's re-seeded entry. This has been fixed (the app now checks the
  fetched entry's own name/phone against the browser's stored identity before treating it as
  "yours"), but the underlying fact — there is no real patient account system — remains a genuine,
  intentional product simplification, not something to overstate as solved.
- **No appointment booking UI** for patients (see §14) — the capability is real on the backend only.
- **Plain-text password comparison, no token expiry** (see §25).
- **All demo data is fictional** (see §18, §19) — no real clinic, doctor, or patient names,
  contacts, or endorsements appear anywhere in the product.

## 27. Claims We Can Safely Make

- VisitNow is a real, working, token-first digital queue product — not a mockup or a slide deck of
  intentions. It has been operated live, end to end, across every account role, with real actions
  producing real, verifiable state changes.
- The unified-queue mechanic (online + walk-in + appointment, one call order) is implemented in the
  actual ordering logic, not simulated in the UI alone.
- The ₹9 flat platform fee is a real, computed value in the code, not a marketing number.
- The permission model (module-by-module, not fixed roles) is real and enforced server-side.
- A doctor working multiple clinics is a real, modeled, demonstrated capability.
- Staff actions reach the patient's own screen within seconds, with no manual refresh — demonstrated
  live.

## 28. Claims That Require Verification

Anything involving real customers, real revenue, real payment volume, real hospital partnerships,
market size, growth rate, or user retention. None of these exist in the project. If an investor
deck or conversation needs any of these, they must come from outside this codebase, sourced
properly, and never presented as if the product itself has already proven them.

## 29. Investor-Relevant Product Evidence

The strongest evidence to actually show, not just describe, in order of how directly they prove the
core thesis:

1. **The unified queue, live** — generate a walk-in token and an online token for the same session,
   show them interleave in one call order.
2. **Real-time tracking without a reload** — open a patient's tracking screen, call-next as staff in
   a second window, watch the patient's screen update on its own.
3. **The fee breakdown at checkout** — the ₹500 + ₹9 split, plain and legible.
4. **A doctor's own multi-clinic revenue split** — the clearest, most concrete proof that this
   models the real complexity of how local doctors actually work.
5. **The permission model in action** — create a staff account, show it can do nothing until
   granted modules, then grant exactly two and show the console change live.

## 30. Recommended Demo Flow

A single coherent walkthrough, roughly five minutes, that touches every piece of verified evidence
above without wandering into unproven territory:

1. **Patient**: browse a city's doctors, open a live session, get a token online, watch the fee
   breakdown, complete the simulated checkout, land on the live tracking screen.
2. **Staff**: in a second window, open the same session, generate one walk-in token, call next —
   point back to the patient's screen updating on its own.
3. **Collect a fee**: mark a pay-at-hospital token's fee collected, show it reflected in the revenue
   view immediately.
4. **Doctor**: switch to a doctor login with sessions at two clinics, show the revenue split by
   clinic.
5. **Admin**: show the platform console — a second city, a second clinic, and one staff account with
   a visibly smaller permission grid than the owner's.

Close on the fee model (₹9, flat, clinic keeps its own price) and the one-sentence thesis from §1.
