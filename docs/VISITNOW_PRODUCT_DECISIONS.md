# VisitNow — Product Decisions Log

This is the project's living product memory. It exists so decisions made while building the
prototype don't get silently lost — every product doubt, edge case, contradiction, or UX call
discovered during development gets added here, not just fixed and forgotten.

**Status:** patient-experience rebuild, in progress. Hospital/staff side exists as a separate
(now-legacy-relative-to-this-vision) console — see [§9](#9-relationship-to-the-existing-hospital-console).

---

## 1. Product vision

VisitNow is a **token-first digital queue platform** for local doctors and clinics — not an
appointment-booking app that happens to also support tokens.

**The promise:** *Skip the wait.* Get a token remotely, watch the queue live, arrive closer to
your turn instead of sitting in a waiting room for an unknown amount of time.

**Primary market:** local doctors and small/medium clinics that already run on physical
token-based queues, including doctors who work different sessions at different clinics on the
same day. Appointments are a secondary capability some clinics may also support — never the
default framing.

**What this document is not:** a spec for the hospital/staff side. That side is intentionally
*not* being built in this phase (see [§9](#9-relationship-to-the-existing-hospital-console)) —
only designed for, so the patient-side data model doesn't box it out later.

---

## 2. Token model

- A **Session** (one doctor, one clinic, one time window — unchanged from the original queue
  engine) is where a token actually gets issued.
- A **QueueEntry** is a token. `source` (`online` / `offline` / `appointment`) records how it was
  created; all three land in the same queue and are ordered the same way. Online origin is not a
  priority signal — see [§4](#4-priority-vs-source-vs-payment-a-hard-separation).
- Every online-issued token carries a **visit-specific 4-digit verification code**
  ([§6](#6-verification-code)) and a **payment state** ([§3](#3-payment-model)).
- Offline (walk-in) tokens, created by a future reception system, don't need a code or an online
  payment state — the clinic already has the patient in front of them. The prototype represents
  their *existence* in demo data (see `seed.ts`) without a walk-in creation UI, since that UI
  belongs to the hospital side, not this patient rebuild.

---

## 3. Payment model

Two **separate fees**, tracked as **separate statuses**, never collapsed into one generic "paid":

| Field | Meaning |
|---|---|
| `hospitalFeeAmount` | The clinic's own token/consultation fee. Set per session — different clinics/doctors charge differently. |
| `platformFeeAmount` | VisitNow's own fee for the token. Fixed at **₹9** for this prototype. |
| `paymentMethod` | `ONLINE` or `PAY_AT_HOSPITAL` — chosen by the patient at token time. |
| `platformFeeStatus` | `PAID` or `DUE`. In practice always `PAID` before a token exists — see below. |
| `hospitalFeeStatus` | `PAID` or `DUE`. |

**`ONLINE`** — patient pays `hospitalFeeAmount + platformFeeAmount` together, once, now.
Both statuses become `PAID` in the same step that generates the token.

**`PAY_AT_HOSPITAL`** — patient pays only `platformFeeAmount` (₹9) now. `platformFeeStatus`
becomes `PAID`, `hospitalFeeStatus` stays `DUE` until the clinic collects it in person. **The
token is generated as soon as the ₹9 succeeds** — the patient is not blocked from queueing just
because the clinic fee is unpaid.

### 4. Priority vs. source vs. payment — a hard separation

Three independent axes, deliberately never allowed to influence each other:

- **`source`** (how the token was created) does not affect queue order.
- **`priority`** (`regular`/`priority`/`emergency`, staff-assigned only — unchanged from the
  existing queue engine) is the *only* thing that affects queue order.
- **`paymentMethod`/fee status** never affects queue order. A `PAY_AT_HOSPITAL` patient with
  `hospitalFeeStatus: DUE` queues exactly like an `ONLINE` patient who already paid in full. This
  is a hard product rule, not a soft preference — the queue engine has no code path that reads
  payment fields at all, which is the actual guarantee, not just a UI convention.

---

## 5. Estimated wait

Unchanged from the original queue engine: `patientsAhead × avgConsultMinutes`, plus any doctor
delay. Explicitly presented as an approximation ("~25 min"), never a promised time. See the
original brief's own §13/§16 — this prototype still doesn't build a prediction model, and
shouldn't; there's no historical consultation data to train one on.

---

## 6. Verification code

- 4 digits, generated per `QueueEntry` at token-creation time, not per patient/account.
- Purpose: lets a `PAY_AT_HOSPITAL` patient (or any patient) be located by reception without
  reading out their full name, and lets the future hospital side visually confirm "this is the
  right visit" before collecting a due clinic fee.
- **Not a security credential.** It's a lookup key, not a password — see
  [§8.10](#810-code-reuse--collision) for why this is fine at prototype scale and what would need
  to change before it wasn't.
- Displayed prominently, digit-by-digit, on the token confirmation and Active Visit screens.

---

## 7. Screens actually built vs. referenced-but-descoped

Built (this phase): Splash, Auth (Login/Register/Guest — see
[§8.10](#8-edge-cases--catalogued-with-a-prototype-decision) for what "Login" actually does),
Home (discovery + active-visit banner), Doctor/Session detail, Get Token → fee breakdown →
payment method → confirmation with verification code, Active Visit (live tracking), Visits
(Active/Upcoming/Completed/Cancelled), Profile + its static sub-pages.

**Descoped from the reference flow, deliberately:** a separate clinic-first browsing tree
(Hospitals listing → Hospital detail → Doctors-at-that-hospital listing) alongside the
doctor-first one. Building both would roughly double the number of discovery screens for
redundant value in a prototype — doctor-first discovery already reaches every session a patient
can join. If clinic-first browsing turns out to matter for the real product (e.g. very large
multi-doctor hospitals where patients think "which hospital" before "which doctor"), it's a new
screen on the *existing* data model, not a redesign.

---

## 8. Edge cases — catalogued with a prototype decision

Numbered to match the original brief's own list. Format: **situation → prototype behavior →
future consideration**, kept tight; a few genuinely tricky ones get fuller treatment below the
table.

| # | Situation | Prototype behavior | Future consideration |
|---|---|---|---|
| 1 | Token issued, patient never arrives | Stays `waiting` indefinitely in this prototype (no session-close sweep yet) | Auto-expire `waiting` entries once the session's `doctorStatus` becomes `closed` |
| 2 | Patient cancels after getting a token | `cancelEntry` → status `cancelled`, visible in Visits › Cancelled, never deleted | unchanged |
| 3 | Patient misses their turn | Staff marks `no_show` (existing hospital-console action) | Patient-side "I'm running late" self-report, distinct from staff-initiated no-show |
| 4 | Marked `NO_SHOW` | Shown in Visits › Cancelled with a distinct label ("Missed"), not silently hidden | unchanged |
| 5 | Arrives, hasn't paid clinic fee | Exactly the `PAY_AT_HOSPITAL` / `hospitalFeeStatus: DUE` path — this isn't an edge case, it's a designed state | Hospital-side "mark clinic fee collected" action (not built this phase) |
| 6 | Shows code, staff can't find the visit | Out of scope for a patient-only prototype (no staff lookup UI exists yet) | Hospital-side "look up by code" search, once that panel exists |
| 7 | Online payment succeeds, token generation fails | See [§8.7](#87-payment-succeeds-but-token-generation-fails) below | Idempotent token creation keyed by a payment reference, real backend transaction |
| 8 | Token succeeds, payment confirmation delayed | N/A in this prototype — token creation *is* the payment confirmation (see [§8.7](#87-payment-succeeds-but-token-generation-fails)); no async payment gateway exists to lag | Real gateway webhook lag once a real PSP is integrated |
| 9 | Multiple tokens, same doctor/session | See [§8.9](#89-duplicate-token-prevention) below | unchanged |
| 10 | Reusing an old verification code | See [§8.10](#810-code-reuse--collision) below | unchanged |
| 11 | Clinic fee changes after token issued | Fee is snapshotted onto the `QueueEntry` at creation time, not looked up live | unchanged — this is already the right permanent behavior, not just a prototype shortcut |
| 12 | Doctor becomes unavailable after tokens issued | `doctorStatus: closed` doesn't touch already-issued entries; they stay visible, just can't progress until staff acts | Hospital-side bulk "session cancelled, notify all waiting" action |
| 13 | Session closes before patient arrives | Same as #1 — entry stays `waiting`, patient's Active Visit screen reflects `doctorStatus: closed` | Notification, once a notification layer exists (explicitly Phase 2, not this prototype) |
| 14 | Queue paused | `doctorStatus: paused` already modeled; Active Visit shows it plainly | unchanged |
| 15 | Doctor delayed | `delayMinutes` already modeled and factored into the wait estimate | unchanged |
| 16 | All tokens exhausted | Not modeled — this prototype has no `tokenLimit` field, session capacity is unbounded | Add `tokenLimit` to `Session`, reject `generateToken` past it with a clear "fully booked" state |
| 17 | Online token capacity full | Same gap as #16 — no separate online/offline capacity split exists (would also risk reintroducing the "two queues" mistake the whole product explicitly rejects) | If capacity limits are needed, they should cap the *unified* queue, not an online-only slice |
| 18 | Walk-in capacity full | Same as #16/17 | same |
| 19 | Two staff generate a token simultaneously | Backend `nextTokenNumber` increments are synchronous in a single Node process — not actually racy today, but only because there's one process and no `await` between read and write | Real DB needs an atomic increment (`UPDATE ... RETURNING`) or a sequence, not a read-then-write |
| 20 | Two queue actions happen simultaneously | Same answer as #19 | same |
| 21 | Patient loses connection while waiting | Active Visit polls (§ from the original architecture) rather than holding a socket open — reconnecting just resumes polling, no special handling needed | unchanged — this is a real advantage of the polling choice, not just an acceptable gap |
| 22 | Reopens app after being offline | Visits list is reconstructed from the backend by entry id (see [§8.22](#822-visits-list-persistence) below), not from anything that could go stale offline | unchanged |
| 23 | Opens an old completed visit | Fully supported — completed entries are never deleted; Visits › Completed shows them with final status | unchanged |
| 24 | Skipped, then recalled | `requeueEntry` (existing hospital-console action) moves `skipped` → `waiting` | unchanged |
| 25 | Priority patient enters queue | Existing `setPriority`, staff-only, already built | unchanged |
| 26 | Emergency patient enters queue | Same mechanism, `priority: emergency` | unchanged |
| 27 | Doctor changes clinic unexpectedly | Not modeled — a `Session` is already clinic-specific, so this is really "cancel this session, open a new one," not a mutation of an existing session | If genuinely needed, it's a hospital-side session-management action, not a patient-facing concept |
| 28 | Patient tries to hold/reserve a token | Explicitly not supported — a token is only created once a payment step (even the ₹9-only path) completes; there is no "reserve, pay later" state | Deliberate: an unpaid reservation would be a token with no financial commitment behind it, undermining the fee model |
| 29 | Multiple active visits (same patient) | Allowed — nothing in the data model prevents a patient having active tokens with two different doctors at once (e.g. a parent queueing for two different specialists) | unchanged, this is correct behavior, not a gap |
| 30 | Books multiple doctors | Same as #29 | same |
| 31 | Payment refunded/cancelled | Not modeled — no refund status exists on `QueueEntry` | Add a `refunded` payment state once a real PSP exists; today, `cancelEntry` just leaves the fee status as whatever it was, which is honest but incomplete |
| 32 | Abandons the payment screen | No token/fee commitment exists until the (simulated) payment step actually resolves — abandoning it simply leaves no `QueueEntry` behind, nothing to clean up | unchanged |
| 33 | Clinic closes unexpectedly | Same as #12/13 | same |
| 34 | No live queue info available | Existing `ErrorState` component, reused as-is | unchanged |
| 35 | Queue not moving | Indistinguishable from "doctor delayed" at the data level — `doctorStatus: delayed` is the intended signal for this | A distinct "stalled" heuristic (e.g. no `call-next` in N minutes) is a real future idea, not built here |
| 36 | Doctor hasn't started session | `currentToken: null` + `isQueueOpen: false` already represents this ("Opens 08:00") | unchanged |
| 37 | Doctor starts late | Same as #15 (delayed) | same |
| 38 | Queue moves faster/slower than estimated | The estimate is explicitly approximate (§5) — no attempt to reconcile prediction vs. reality | A "how accurate were we today" metric is a real future idea for tuning `avgConsultMinutes` |
| 39 | Patient's token becomes next | Active Visit's "You're next" state (already built, this phase re-styles it) | unchanged |
| 40 | Patient's token is called | Active Visit's `called` state (already built, this phase re-styles it) | unchanged |

### 8.7 Payment succeeds but token generation fails

**Situation:** in a real system with a separate payment gateway, the ₹9 (or ₹509) charge could
succeed while the subsequent token-creation call fails (network blip, backend error) — leaving a
patient charged with no token.

**Why it matters:** this is the single scariest failure mode in the whole payment model — money
moved, nothing to show for it.

**Prototype behavior:** sidestepped entirely, not "handled" — there is no separate payment
gateway. `generateToken` *is* the payment step; the simulated "payment" and token creation are
the same backend call, so they can't partially fail relative to each other. This is a deliberate
simplification the brief explicitly permits (§45: no production payment settlement
infrastructure), not an oversight.

**Future production consideration:** this is exactly why real integrations do payment-first,
webhook-confirmed, *then* idempotent token creation keyed by the payment's own transaction id —
so a retried token-creation call after a dropped response doesn't double-charge or double-issue.
Do not build token creation as "charge, then separately create" without that idempotency key.

### 8.9 Duplicate token prevention

**Situation:** what stops a patient from tapping "Get Token" twice for the same session, or
opening two tabs and getting two tokens?

**Prototype behavior:** **not prevented.** There is no patient-identity concept strong enough to
check "does this person already have a waiting token here" — see §8.10 on why identity is
deliberately weak in this phase. Two taps currently do produce two tokens.

**Recommended decision (not yet implemented):** once a real patient identity exists, the honest
fix is checking "does this patient already have a non-terminal entry in this session" before
`generateToken` runs, and surfacing the existing one instead of creating a second. Flagged here
rather than fixed now because doing it *without* real identity would mean guessing identity from
something weak (name string match), which is worse than not checking at all.

### 8.10 Code reuse / collision

**Situation:** could a 4-digit code (10,000 possibilities) collide with another active visit's
code, or be guessed/reused?

**Prototype behavior:** generated as a random 4-digit string per entry, checked for uniqueness
only among *currently non-terminal* entries in the same session (a handful of tokens at once —
collision risk is negligible at that scale, and the check exists mostly to be visibly correct
rather than because it's load-bearing at this volume). Codes are not reused across sessions or
patients. This is explicitly **not a security boundary** — see §6: it's a lookup key for a human
at a reception desk, not an authentication credential, so a small collision surface at prototype
scale is an acceptable, disclosed trade-off, not a hidden risk.

**Future production consideration:** at real scale (many concurrent sessions city-wide), the
uniqueness check needs to be scoped correctly (still "within one session" is fine — codes never
need to be globally unique) and should exclude terminal-status entries the same way this
prototype already does.

### 8.22 Visits list persistence

**Situation:** "My Visits" needs to survive a page reload without a real account system.

**Prototype behavior:** the browser keeps a local list of `QueueEntry` ids the current guest has
created (localStorage, see `lib/myVisits.ts`), and the Visits screen re-fetches each entry's
*current* state from the backend by id every time it loads — so the list of "which visits are
mine" is local, but the actual data shown (status, queue position, payment state) is always live
from the backend, never stale local state pretending to be current. This is the same
local-identity-pointing-at-server-truth pattern already used for the hospital-side passcode gate.

**Future production consideration:** replaced wholesale by a real account system tied to actual
login, at which point "which visits are mine" becomes a normal server-side query instead of a
client-held list of ids.

---

## 9. Relationship to the existing hospital console

A hospital/staff console already exists in this codebase (`/staff/*`, passcode-gated) from an
earlier phase of this project — built *before* this patient-experience rebuild, and out of scope
for this pass per the brief's explicit "do not build the hospital panel now" (§21/§47). It is not
being extended with the new payment/verification-code fields in this pass; the queue actions it
already has (Call Next, skip, priority, doctor status) are untouched and still work against the
same underlying `QueueEntry` records.

**Open gap, worth naming honestly:** the hospital console currently has no UI for the new
payment fields (`paymentMethod`, `hospitalFeeStatus`) added in this phase — a receptionist
using it today can't see "this token owes ₹500" or mark it collected. The brief's own §47/§48
example sketch (`Token 22 / PAY AT HOSPITAL / Clinic Fee ₹500 / DUE`) is exactly what that future
work should look like; it just isn't built yet, by explicit instruction.

---

## 10. Implementation note — where the bottom nav does and doesn't appear

Discovered live while walking the full journey in a browser (not just typechecking): the
first routing pass put Active Visit under the same "flow" layout as the payment/confirmation
screens (back-arrow header, no bottom tab bar) — on the theory that it's reached via a linear
booking flow. In practice that's wrong: Active Visit is a screen a patient returns to and
lingers on for the whole wait, and stranding them there with only a back button (which would
unwind through Confirmation → Payment → Session Detail to get back to Home) is a real
navigation dead end, not just a cosmetic gap.

**Decision:** Active Visit lives under the same shell as Home/Visits/Profile (bottom nav always
visible). Token Confirmation stays in the flow layout — it's a genuine one-time forced landing
right after payment with one obvious next action ("Track Live Queue"), not a destination anyone
returns to. The dividing line that generalizes: a screen belongs in the shell if a patient would
plausibly navigate *away from* it via a tab, not just *forward* out of it.

## 11. Correction pass — "you built a mobile app, not a website"

The first patient-experience rebuild (§7-10) got real product feedback back that it had built a
phone-app screen inside a browser window rather than a genuine responsive website — the reference
mobile mockup was meant strictly as a *workflow* reference, not a layout to reproduce, and it had
been reproduced anyway (a fixed narrow centered column at every viewport width, a bottom-only tab
bar, a native-app-style animated splash screen). Worth recording exactly what changed and why,
since "make it feel like a website" is a real, checkable requirement, not a vague aesthetic note.

**What was actually wrong, concretely:**
- Every screen was wrapped in a `max-w-sm`/`max-w-2xl` centered column *regardless of viewport
  width* — on a 1600px desktop monitor the app still rendered as a narrow phone-width strip with
  empty space on both sides. A website uses the space it has; only checkout-style narrow flows
  (payment, confirmation) should stay intentionally narrow, and only because that's a legitimate
  pattern on real sites too, not because everything was narrow.
- The splash screen (a full-screen animated logo, native-app convention) was the forced landing
  route. Websites load to content; they don't gate every visit behind a branded loading screen.
  Removed outright — `/` now redirects instantly based on identity, no screen in between.
- The clinic-first browsing path from the reference workflow (Hospitals Listing → Hospital
  Details → its doctors) had been dropped in the first pass as a scope cut. That was the wrong
  cut — it's real workflow depth the reference explicitly modeled, not a visual detail. Rebuilt as
  `/clinics` and `/clinics/:id`, using backend endpoints (`GET /api/clinics`, `GET /api/clinics/:id`)
  that had already been built in Phase 1 and simply never wired to any UI.
- No date selection existed anywhere in the token flow. Added a real one (DateStrip on
  SessionDetailPage), backed by actually-seeded Session records for the next two days for at
  least one doctor — not a decorative control with every day but "today" disabled.

**Fix, structurally:** one `AppShell` replaces the previous PatientShellLayout/PatientFlowLayout
split. A real header (logo, location, nav links) that only collapses to a compact bar + bottom tab
nav below the `md` breakpoint — that collapse is a legitimate, common responsive-web pattern (real
production sites do this); the earlier mistake was rendering that collapsed mobile chrome
*unconditionally*, not the existence of a bottom nav at mobile widths at all. Drill-down pages
render their own inline "back" link in their own content flow (a normal site pattern, like a
breadcrumb) instead of every route being wrapped in a persistent app-style back bar.

**A second real bug surfaced by this fix, not by the feedback itself:** seeding multi-day sessions
for the new date selector meant a doctor now legitimately has several `Session` records for what a
patient thinks of as one slot ("Dr. Kumar's morning session at Sunrise") — the Clinic/Doctor
browsing grids were rendering one card per *session*, so that doctor appeared three times on his
own clinic's page. Fixed with `lib/sessions.ts`'s `dedupeByDoctorClinicSlot` — browsing views
collapse to one card per doctor+clinic+label (preferring today's date), while SessionDetailPage's
DateStrip still gets every date, since that's the one place all of them are actually relevant.

## 12. Feature-completeness pass — real bugs found, gateway demo built

Follow-up feedback after §11: the site still read as thin — a real architectural bug in the date
selector, a layout collision, no actual payment-method UI, a plain location list instead of the
requested detect+grid pattern, and too little demo content for the discovery pages to feel real.
Recorded here because two of these were genuine bugs, not missing polish, and worth remembering
why they happened.

**The date selector "not working" was a real bug in `usePolling`, not the DateStrip itself.**
React Router does not remount a component when only its route param changes — clicking a date on
SessionDetailPage navigates `/sessions/session-1` → `/sessions/session-2`, same component
instance, new `sessionId` param. `usePolling`'s effect had `[intervalMs]` as its only dependency,
so a fetcher that changed identity (new `sessionId` closed over) didn't trigger an immediate
refetch — the page kept showing session-1's stale data (including the date strip's own "active"
highlight, since that came from the stale `session.id`) until whatever was left of the *old*
5-second interval happened to fire. Fixed by adding an explicit `resetKey` parameter to
`usePolling` — every call site that fetches by a route param now passes that param as the key, so
navigating between sibling resources refetches immediately, the same as a fresh mount would. This
was a latent bug in every page that fetches by id, not just the one it was noticed on; all of them
were patched, not just the one being tested.

**The avatar/banner "collision" was a real layout bug.** SessionDetailPage overlapped the doctor's
avatar onto the bottom of the clinic banner (a `-mt-9` negative-margin trick) at the same time the
banner had its own bottom-left caption ("clinic name · location") — both elements wanted the same
corner. Fixed by removing the overlap entirely: banner is now purely the photo, avatar and all text
live in normal document flow below it. Simpler, and there's no longer a shared corner for two
independent elements to fight over.

**Payment gateway UI was built** (`PaymentGatewayModal`) — UPI/Card/Net Banking/Wallet method
tabs, a UPI-id or card-number input with basic format validation, a processing spinner, a success
state — inserted as a real step between "confirm fee + method" and token creation. It is not wired
to any real payment provider (see §8.7) — the point is that a checkout *moment* exists and feels
like one, not that money moves. Both `ONLINE` and `PAY_AT_HOSPITAL` route through it, since even
the "pay at hospital" path still owes VisitNow's own ₹9 right now and needs a method to pay that
with — "pay at hospital" was never "pay nothing online."

**Location picker rebuilt** to match the requested workflow (search, a real `navigator.geolocation`
"Detect my location" call, a Popular Cities icon grid) — using this project's own brand colors and
icon choices, not the reference's literal visual style. Detecting a real position still resolves to
Hyderabad, the only city the demo data actually covers — turning coordinates into a city name needs
a reverse-geocoding API key this prototype doesn't have, and pretending otherwise would be worse
than the honest simplification.

**Demo data expanded** — 3 clinics/5 doctors read as a barely-populated placeholder on a real
discovery grid; 5 clinics/9 doctors across 9 specialties, 3 simultaneously "live" sessions, is
closer to what an actual local multi-specialty listing looks like. Same fictional-but-plausible
naming convention as the original seed data (§21 in the original brief).

## 14. Cancel Visit, real-geography demo data, and a wall-clock consistency bug

Follow-up feedback after §12: patients had no way to cancel a token; the demo needed to cover a
city outside Hyderabad (explicitly to show investors); the favicon didn't match the real brand
mark; the site still felt sparse.

**Cancel Visit.** Added to `ActiveVisitPage` — a plain inline confirm (no modal), gated by
`entry.status === 'waiting'`, matching the backend's own `QUEUE_TRANSITIONS` (once staff has called
a token, `cancelEntry` no longer accepts a `waiting → cancelled` transition from that state; a
no-show is the staff-side equivalent at that point). Calls the existing `cancelEntry` API — no new
backend surface needed, it already supported this transition; the frontend simply never exposed it.

**Real-world grounding without real people.** Asked to "web-scrape" a real family doctor's name,
clinic names, phone number, and photo (Hanamkonda, Warangal) into the demo data. Declined the
identifiable-data part specifically and explained why, rather than the whole request: reproducing a
real doctor's name/clinic/phone as VisitNow demo data would imply a partnership that doesn't exist
— directly against this project's own §21 naming rule — and a real phone number sitting in demo
data risks a confused person actually calling it. Built the requested "Suman, two clinics, morning
+ evening" *shape* with a fictional name (`Dr. Suman Vaddepally`) and fictional clinic names
(`Kakatiya General Clinic`, `Subedari Family Care Centre`), but kept the real, public, non-personal
part of the ask — genuine Hanamkonda-area street names (Nakkalagutta, Subedari, Kaloji) — so the
location still reads as authentic. Same treatment for 2 new Bengaluru doctors/1 clinic. Same
pravatar/picsum placeholder photo convention as the rest of the seed data, not a scraped photo of
a real person.

**City selection now actually filters.** Previously cosmetic (§12's open question) — `LocationBar`
had no way to tell sibling pages the city changed. Fixed with a small same-tab `CustomEvent`
(`visitnow:location-change`) and a `useSelectedCity()` hook, since these are React Router siblings
under `AppShell`'s `<Outlet/>` with no shared parent state, and `localStorage`'s own `storage` event
deliberately never fires in the tab that made the write. Home and the clinics list now filter to the
selected city and show an honest "VisitNow hasn't launched in {city} yet" card for any of the six
cities in the list that aren't Hyderabad/Warangal/Bengaluru — rather than a silent empty grid that
reads as broken.

**Favicon now uses the real brand mark**, not `VisitNowMark.tsx`'s flatter in-app rendition —
generated PNG sizes (16/32/180px) directly from the actual logo image supplied for this product
(glossy blue "V", green checkmark).

**Google Maps embed on clinic pages** — a keyless `<iframe src="https://www.google.com/maps?q=...
&output=embed">`, no API key, no scraping. Deliberately queries only `location, city` (e.g.
"Nakkalagutta Main Road, Warangal"), never the clinic's own name — the street is real public
geography and resolves to a real, sensible map; the clinic name is fictional (§ above) and would
either fail to resolve or, worse, coincidentally resolve to an unrelated real business.

**Time-aware "Here now" / "Later today" badge**, for the exact case described: a doctor running
two clinic sessions in one day (Dr. Suman's real 9–1 / 6–10 shape) should visibly show which one
they're *actually* at right now, not just which ones have a queue toggled open. Added
`sessionTiming()` (`lib/sessions.ts`) — a pure comparison of real `now()` against a session's own
`date`/`startTime`/`endTime`, deliberately independent of the staff-controlled `isQueueOpen`/
`doctorStatus` fields DoctorCard already reads. Shown only on `DoctorPage`'s "Practices at N
clinics" grid, where a multi-session doctor actually exists.

**That badge immediately surfaced two real, pre-existing bugs**, not new ones it introduced:

1. `GET /api/doctors/:id` never attached `doctor` onto its own sessions (only `clinic`) — every
   other catalog endpoint had been fixed to do this in an earlier pass (§12), this one was missed.
   `DoctorCard` reads `session.doctor.photoUrl` unconditionally, so the entire "Practices at" grid
   crashed with an uncaught `TypeError` the first time this session tried to render it. Fixed by
   attaching `doctor` alongside `clinic` in that route, matching the others.
2. Seed data's "live" sessions used fixed clock times (`startTime: '08:00'`), which only look live
   at the specific hour someone happens to seed/restart the server. The new badge does a real
   wall-clock comparison, so it correctly said "Session ended" for a session whose `isQueueOpen`
   still said `true` and whose card still said "Serving #17" — accurate, but a visible contradiction
   for a demo that can be opened at any hour, which matters a lot for something meant to be shown to
   investors on no fixed schedule. Fixed by seeding the specific sessions a `TimingBadge` can ever
   be shown for (Kumar/Reddy/Suman's "live" session and its same-doctor "later today" sibling)
   relative to actual server-start time (`relTime(offsetHours)`) instead of a fixed clock time, so
   they straddle "now" correctly no matter when the server starts. Every other session in the file
   keeps a fixed time on purpose — nothing else compares it to the real clock, so there's nothing
   for a fixed time to contradict.

## 15. Hospital-side sync — answering a question asked ahead of building that side

Raised while still on the patient side, explicitly framed as "we'll actually build this later, but
here's my doubt now": how do online and offline tokens for the same session stay in sync, given
only the hospital panel can ever issue an offline token?

**Short answer: they already do, by construction — there is no separate sync problem to solve.**
`QueueEntry.source` is `'online' | 'offline' | 'appointment'`, but all three live in exactly one
`queueEntries` map per session, ordered by exactly one function (`queueEngine.ts`'s
`compareEntries` — priority, then token number). There was never a second, offline-only data
structure that a real sync mechanism would need to reconcile against the online one; "online" and
"offline" are a label on one entry in one queue, not two queues. `callNext`, `estimateWait`, and
every ordering computation already treat a walk-in token exactly like a remote one with the same
priority and number — the unified-queue architecture (§1) already *is* the answer to "how do these
stay synchronized."

**Confirming the part that was actually a design question, not yet a fact:** "only the hospital
panel can issue an offline token" — checked against the current code, not assumed. The patient app
has no route, form, or API call that can create an entry with `source: 'offline'`; every
patient-facing path that creates a `QueueEntry` (`TokenPaymentPage` → `generateToken`) hardcodes
`'online'`. `source: 'offline'` only ever gets set from the staff console's own token-issue action.
So this is already true today, not a future decision — it just hadn't been written down as a
guarantee before now.

**Explicitly deferred, per the same message's own "too soon" framing:** a hospital-side
revenue/analytics dashboard (daily/monthly revenue, per-doctor/per-clinic breakdowns, download or
print) is a real, reasonable ask for the eventual hospital panel, tracked here as a known future
requirement rather than built now. It's a read/reporting layer over data this architecture already
records (`hospitalFeeAmount`, `hospitalFeeStatus`, `paymentMethod` already exist per entry — see
§3), not a new data model, so building it later shouldn't require touching the queue engine itself.

## 17. Booking ahead was already possible but never actually finished

Found while doing a general "keep closing gaps" pass, not from new feedback: `SessionDetailPage`'s
`canGetToken` was never gated on `session.date`, and DateStrip already links to future-dated
sessions (seeded specifically so it would have more than one day to switch between — §earlier).
Put those two facts together (DateStrip's multi-date seeding is §12's "date selector" fix) and a
patient could already get a real token for a session two days from now — the button never stopped
them — but nothing downstream knew that had happened:

- `ActiveVisitPage` and `TokenConfirmedPage` both unconditionally showed live-queue framing
  ("You're next — please be ready", "0 patients ahead of you right now") for a token whose session
  hadn't started, because `estimateWait` correctly computes "0 ahead" for the only entry in an
  empty future queue — accurate math, wrong thing to tell someone about a session that opens in
  48 hours.
- `VisitsPage`'s "Upcoming" tab was hardcoded permanently empty, reserved in an earlier pass for a
  scheduled-appointment feature that doesn't exist — while every future-dated `waiting` token
  quietly landed in "Active" instead, indistinguishable from someone genuinely in today's live
  queue.

Fixed by making date-awareness the actual, small missing piece rather than descoping the whole
booking-ahead path: `isBookedAhead` (`session.date > today`) on both queue-status pages swaps the
live tracking UI for an honest "Booked for {date}, come back that day" state (verification code,
fees, and Cancel all still fully work — a future booking is still a real committed token, just not
a live queue position yet); `VisitsPage.tabFor` now checks `session.date` too, so "Upcoming"
finally shows real content — every token booked ahead, with its date printed on the row — instead
of a tab that could never have anything in it. No new data model, no new screens; the date was
already on every `Session` fetched, it just wasn't being read.

## 18. Marketing landing page, Warangal's DateStrip bug, and the first real hospital-side build

The biggest single round of feedback so far: fix Warangal's date selector, expand Warangal's demo
data further, move the clinic map to the bottom of the page, build a real public marketing landing
page, and — explicitly, in the same breath, "don't stop until the complete application is built,
including hospital side" — start building out the hospital side for real, not just leave it as the
single-session console from earlier phases.

**Warangal's date selector "wasn't working" for the same reason as §12's original bug, not a new
one.** DateStrip only renders once a doctor+clinic+slot has more than one dated `Session` record to
switch between (see its own doc comment) — Dr. Suman and Dr. Anjali's Warangal sessions only ever
had a single date each, so there was nothing to select, not a broken selector. Fixed by seeding
`dateOffset(1)`/`dateOffset(2)` sibling sessions for both, the same pattern §12 already used for Dr.
Kumar's Sunrise sessions. Verified live: the strip now renders Today/Tomorrow/Mon and switching
between them shows the right session.

**Warangal demo data expanded again** — a third clinic (Ramnagar Multispecialty Clinic) and three
more doctors (Dr. Srinivas Bommakanti, Dr. Divya Sagi, Dr. Manohar Ravella), including a second
"live right now" Warangal session so the city has more than one doctor's queue to look at, matching
Hyderabad's density. Same fictional-identity-on-real-geography convention as §14.

**Clinic map moved to the bottom of the page** — after "Doctors at this clinic," not before it. A
patient's actual question sequence on a clinic page is "who practices here, is there a queue" before
"where exactly is this on a map"; the map is confirmation once they already care, not the first
thing to see.

**A real public marketing landing page** (`pages/marketing/LandingPage.tsx`) now sits at `/` for
anyone with no local patient identity yet — a returning patient still skips straight to `/home`
(unchanged from §11's "no gate for returning users" rule). Hero, a real stats bar, "how it works,"
a features grid, a cities section, a "for clinics" section bridging to staff login, a final CTA, and
a footer — built entirely from this project's own design tokens (Sora/Manrope, brand blue + accent
green), not a generic template. Two rules enforced while building it:

- **No fabricated social proof.** No testimonial quotes attributed to invented "happy patients" —
  that would be exactly the false-endorsement problem this project's own §21 naming rule already
  forbids for doctors and clinics, just aimed at patients instead. A features/how-it-works framing
  carries the same persuasive weight honestly.
- **Every number on the page is real**, counted from the actual seed data at the time it was
  written (3 cities, 9 clinics, 16 doctors) — not a round marketing number.

Two real bugs found and fixed during its own build (verified live, not assumed): a Tailwind
class-order collision made a `Button`'s override classes (`bg-white text-[...]`) lose to its
variant's own `bg-[...] text-white`, rendering an invisible-text button — fixed with `!important`
modifiers rather than hoping for string-order luck. And a full-page screenshot tool artifact (not a
real site bug) briefly looked like two broken city photos — confirmed both images actually load
fine by checking a normal in-viewport screenshot instead.

**The hospital side's first real second feature: a revenue & analytics dashboard**
(`/staff/revenue`), closing the "too soon" requirement from §15. Backend: `computeRevenueReport()`
(`store/revenue.ts`) aggregates every `QueueEntry` by clinic, by doctor, by day, and by source
(online/walk-in/appointment) — totals, collected vs. due clinic fees, and VisitNow's own platform
fee, all computed fresh from live data on every request, never a separate table that could drift
from the source of truth. Frontend: summary cards, breakdown tables, a full token-level table, a
**real CSV download** (a client-side `Blob` built from the same rows already on the page, not a
disabled link) and a **real print report** (the browser's own print, with a dedicated print
stylesheet that hides the interactive chrome/nav and expands the token table's scroll clipping so
the full list actually prints) — verified live: the CSV downloaded with correct rows, and print-media
emulation confirmed the report renders cleanly without the console chrome.

Building this exposed a real, pre-existing gap in the data model: `generateToken` and the
appointment-conversion route only ever snapshotted `hospitalFeeAmount` for **online** entries —
a walk-in or converted-appointment patient still pays the clinic's consultation fee at the counter
in real life, but nothing recorded it, which made "how much did we collect today" silently wrong
for two of the three token sources. Fixed by snapshotting the fee (and a `PAID` status, since a
receptionist wouldn't hand over a token before being paid) for every source, not just online; the
revenue aggregator also falls back to the entry's session fee for any older seeded entry that
predates this fix, so historical demo data stays countable without needing to be re-seeded.

**Staff console navigation** grew a real nav bar (Sessions / Revenue) in `StaffLayout` instead of
one implicit page — the console stopped being a single screen the moment a second real section
existed alongside it.

## 19. Open questions (unresolved, flagged for a future decision)

- **Real patient auth.** Login/Register currently collect a name+phone and function identically
  to Guest — no password is verified against anything (see §8.10 sibling reasoning: there's
  nothing to verify against yet). This is fine for a demo, not fine for a real product; the
  screens exist so the *shape* of the flow is right, not because the auth is real.
- **Location.** ~~"Select Location" in this prototype is a fixed list of demo cities with no real
  geolocation or distance calculation — Hyderabad-area demo data doesn't currently vary by city.~~
  Superseded by §14: city selection now actually filters Home/Clinics to real per-city demo data
  (Hyderabad/Warangal/Bengaluru). What's still unsolved: real distance-based discovery needs actual
  clinic coordinates, which the current `Clinic` model doesn't carry (`location`/`city` are free
  text), and "Detect my location" still only resolves to Hyderabad regardless of real coordinates
  (no reverse-geocoding key) — seeing that resolve to Warangal now would still be wrong, since the
  browser's real location during development is nowhere near it.
- **Token capacity limits.** See edge cases #16-18 — not modeled at all yet. Worth deciding
  whether capacity should be a hard cap or a soft "queue is long" warning before building it.
- **Refunds.** See edge case #31 — no data model support yet; needs a real payment gateway
  relationship to mean anything anyway.
- **How much of "the hospital side" §18 actually built.** One real feature (revenue &amp;
  analytics) end-to-end, not a full hospital admin platform — there is still no UI to create/edit a
  clinic or doctor (seed.ts is the only way new ones exist besides §26's one "attach a login to an
  existing doctor" action), ~~no per-hospital login separation (one shared staff passcode covers
  every clinic, same as before this round)~~ **resolved by §26** — real per-account, per-clinic/
  per-doctor scoped auth now exists, server-enforced. No notification layer still. Worth being
  explicit about rather than letting "the hospital side got built this round" imply more than it
  does.

## 20. Full visual re-skin — "ticket counter, not a dashboard" (in progress)

### Situation

A new brief asked for a ground-up frontend visual rebuild — explicitly production-grade UI on top
of the existing (intentionally simplified) backend, scrapping the previous visual system rather
than patching it. Two source assets were supplied: a 19-screen AI-generated mobile app mockup
(workflow reference only, explicitly not to be copied visually) and this project's own decision
log. No separate logo file arrived — colors/proportions for the brand mark are read from the
mockup's splash/login screens, same as the pre-existing `VisitNowMark.tsx` already was.

### Why it matters

Everything token-first, unified-queue, payment-split, and edge-case-related documented in §1-§19
was already sound and is being kept — this round is scoped to visual language only. Getting that
scope boundary wrong (rewriting business logic while re-skinning) would have thrown away nineteen
sections of already-verified product decisions for no reason the new brief actually asked for.

### Decision

New design direction written up in full at `docs/DESIGN.md`: **VisitNow is a ticket counter, not
a dashboard.** Every token/visit surface uses a `TicketCard` component (a die-cut notch + dashed
perforation, CSS-only, no image assets) instead of a generic rounded card; live numbers (now-
serving, patients-ahead) use a `SplitFlapNumber` odometer-roll primitive instead of a plain text
swap; typography moved from Sora/Manrope to Archivo (display/numerals) + Public Sans (body) — the
Font Selection Procedure's own reflexive-pick-and-reject step flagged Sora/Manrope as exactly the
kind of default this rebuild is meant to move away from; the palette moved from a cool blue-gray
neutral to a warm "ticket stock" paper neutral, with the logo's blue/green kept but green
re-confirmed as confirmation-only, never decorative.

Existing CSS custom-property *names* (`--color-text`, `--color-surface`, `--color-border`, etc.)
were kept and re-valued rather than renamed, since nearly every component references them —
`docs/DESIGN.md`'s own `--color-ink*` naming is aliased to `--color-text*` in `index.css` rather
than treated as a second source of truth. This was found the hard way: the landing page's first
draft used `var(--color-ink)` directly (matching the design doc's prose) and rendered as a
washed-out, barely-legible panel because that variable didn't actually exist yet — background-color
with an undefined `var()` resolves to its initial value (transparent), not an error, so the bug was
silent until a real screenshot caught it. Verified live at both 1440px and 390px after the fix.

### Prototype behavior

Landing page (§15 of the new brief's "major rebuild" emphasis) is fully rebuilt: a live departure
board in the hero (real `fetchTodaysSessions` data, not a static mockup — the "every number on
this page is real" rule now extends to the hero itself), a connected numbered rail for "How it
works" instead of four identical cards, an asymmetric lead-panel-plus-list layout for "Features",
and a board-style listing instead of stock city photography for "Cities" (present stock photos
labeled as if they were real photos of Hyderabad/Warangal/Bengaluru would itself have been a
fabricated-placeholder problem, not a real one). Design system foundation (`index.css`, `Button`,
`Badge`, `SplitFlapNumber`, `TicketCard`) is in place and shared by every page going forward.

`ActiveVisitPage` and `TokenConfirmedPage` — the brief's own "most important patient screen"
(§23) — are rebuilt on `TicketCard` + `SplitFlapNumber`: the token number now lives inside the
die-cut stub card, now-serving/patients-ahead roll like an odometer instead of swapping instantly.
Verified live against real API data (created a real queue entry via the running backend, not just
visual inspection of the component in isolation) at 480px. `HomePage`, `SessionDetailPage`,
`ClinicCard`/`DoctorCard` were **not** rewritten and still verify correctly — they inherit the new
palette/typography for free because the CSS custom-property *names* were kept (see the
`--color-ink` note above), which is the payoff of that naming decision: pages nobody has touched
yet already look re-skinned, not stuck on the old system.

### Production consideration

Remaining pages still pending the same structural pass (they inherit new colors/type already, but
haven't had `TicketCard`/`SplitFlapNumber`/layout attention where it'd matter): discovery
(Clinics list, Clinic detail, Doctor detail), token payment, Visits, Profile + its sub-pages, Auth,
and the staff console (explicitly not the primary target per the brief's §32, lighter pass
expected). Also still open: a full responsive sweep beyond the pages already spot-checked above.
This section will keep being updated per surface rather than left to imply the whole rebuild
landed in one sitting.

## 21. Navigation audit — DateStrip's Today/Tomorrow Back bug (found, fixed)

### Situation

The rebuild brief names a specific navigation failure by example: switching Today → Tomorrow on a
session and then pressing Back should return to whatever page you actually came from (Doctor,
Clinic, Home), not to Today. Auditing every date/tab/filter control against that example found
one real instance of it: `DateStrip` (the date switcher on `SessionDetailPage`) called
`navigate(\`/sessions/${s.id}\`)` with no `replace`, so every date tapped pushed a new history
entry. Tapping Today → Tomorrow → Day 3 → Back landed back on Tomorrow, not on whatever page
linked into the doctor's session in the first place.

### Why it matters

This is exactly the failure mode described, not a hypothetical — verified by reading the actual
`navigate()` call, not assumed from the pattern's name. A patient comparing two dates before
picking one would have Back silently misbehave on the very screen the brief chose as its example.

### Decision

`DateStrip`'s navigate call now passes `{ replace: true }`. Switching which date's session you're
viewing for the *same* doctor/clinic/slot is a same-page state change wearing a different route
(each date is genuinely a different `Session` record, but the *user's mental model* is "still
looking at this doctor, just a different day" — see brief's own framing), not a drill-down that
deserves its own history entry.

### Prototype behavior

Fixed. Every other date/tab/filter control was audited against the same question (does this push
a history entry for a same-page state change?) and found already correct: `VisitsPage`'s tab
switch and `HomePage`'s search/specialty/sort are plain `useState`, no routing involved at all;
`LocationPicker`'s city change dispatches a same-tab `CustomEvent`, also no routing. `DateStrip`
was the one real offender.

### Production consideration

The `Get Token` button on `SessionDetailPage`, and every other page-to-page drill-down link in the
app, correctly uses a normal push navigation (no `replace`) — that distinction (same-page state
change vs. genuine drill-down) is the actual rule to apply to any new date/tab/filter control added
later, not "always replace" or "never replace."

## 22. Real user testing found three more bugs the read-through missed

### Situation

Live use (not code review) surfaced three problems the previous round's static audit didn't catch:
(1) the landing page was unreachable for anyone who'd ever logged in — `RootRedirect` sent any
saved identity straight to `/home`, permanently; (2) every same-page navigation (switching a
session's date, and by extension anything else using `usePolling` with a `resetKey`) blanked the
*entire* page to a loading skeleton, reading as a hard reload; (3) the header buried the
hospital/clinic entry point as a 13px text link, and `AuthPage` never mentioned it at all.

### Why it matters

(1) and (2) are both severity-blocking for a demo: an investor who logs in once can never see the
marketing site again at its own URL, and every click anywhere in the date/tab family looked broken.
(3) is a real product requirement (brief §32/§4) not being met — two distinct audiences need two
distinct, visible doors in, not one visible door and one hidden one.

### Decision

**Landing page is now always at `/`, full stop** — `RootRedirect` is deleted, `App.tsx` renders
`LandingPage` directly at `/`. `LandingPage` reads `getPatientIdentity()` itself and adapts its own
CTAs (header, hero, final CTA) — "Get your token" / "Find a doctor near you" for a new visitor,
"Go to my queue" / "Continue as {name}" for a returning one — the way stripe.com or notion.so still
show their marketing homepage to a signed-in visitor rather than redirecting it away.

**`usePolling` no longer clears `data` to `null` on a `resetKey` change** — only `loading` flips.
Every page's `loading && !data` skeleton branch was the actual cause of the "refresh" look; keeping
the last good frame on screen during a same-page navigation and swapping in the new data once it
resolves is the standard pattern, not the "clear immediately, stale data is worse" instinct the
previous round of this fix optimized for. Verified live: screenshotted 60ms after clicking
Tomorrow on `SessionDetailPage` — the page stayed fully painted, no blank frame.

**`AuthPage` rebuilt as a real split-panel desktop layout** (brand/live-board panel + form,
previously a narrow centered card floating on an empty desktop page — itself a "phone screen
scaled onto a desktop viewport" instance of the exact mistake §11 already fixed once elsewhere).
Both panels, plus the landing page header (now a visible secondary button, not a text link) and its
mobile menu, carry a "Hospital & clinic sign in" entry point.

### Prototype behavior

All three fixed and verified live: landing page reachable with an identity set (screenshotted,
confirmed URL stays `/`), date-switch mid-flight screenshot shows no blank frame, both auth
surfaces show the staff entry point.

### Production consideration

`SessionDetailPage`'s sibling-dates effect was also depending on the *entire* `sessionData` object
(a new reference every 5s poll tick), refetching `fetchDoctor` every 5 seconds for no reason —
changed to depend on the doctor id + clinic/label as stable primitives instead. Not user-visible,
but worth fixing while already in this code: an effect re-running on every poll tick regardless of
whether anything it actually depends on changed is the kind of thing that eventually causes a real
race, not just wasted requests.

## 23. Background color read as beige, single-column pages read as empty desktop, map looked missing

### Situation

Direct feedback with a screenshot: the warm "ticket stock" cream background (#faf7f1) read as
dated/beige rather than premium; `SessionDetailPage` at desktop width was a narrow column
centered in a large gray void — the exact "phone screen on a desktop page" problem this rebuild
keeps finding and fixing in one place at a time; and the Google Maps embed on `ClinicDetailPage`
wasn't rendering for the reporter.

### Decision

**Background repainted cooler.** `--color-bg` moved from `#faf7f1` (cream) to `#f5f5f7` — the same
neutral apple.com uses for its own section canvas. Text/border tokens shifted very slightly cooler
to match. One token-value change in `index.css`, propagates everywhere since no component
hardcodes a color outside that file (checked with a grep before calling it done, not assumed).

**`SessionDetailPage` and `TokenPaymentPage` rebuilt as real two-column desktop layouts.** Neither
sidebar is decorative filler: `SessionDetailPage`'s shows the actual `queueData` the page was
already fetching (previously only used to compute a count) as a live queue preview — token
numbers, priority/source badges, genuinely useful — plus a link back to the clinic.
`TokenPaymentPage`'s sidebar is a sticky order-summary/checkout panel (doctor, fee breakdown,
total, the pay button), the same pattern any real checkout uses. Both collapse to the original
single-column flow below `lg`.

**The map embed is now a progressive enhancement, not the only path to the address.** A Google
Maps iframe with no API key is exactly the kind of third-party embed ad blockers, Brave, and Safari
tracking prevention commonly block outright — that was almost certainly why it looked "missing." A
static address card (pin, address, a real "Open in Google Maps" link that opens Maps directly) is
now the reliable primary content, sitting beside the iframe rather than depending on it; the iframe
box also keeps a visible bordered/backed placeholder state so an unrendered iframe never reads as
empty space.

### Prototype behavior

All three fixed and rebuilt; screenshotted at the same 1440px width the original report's
screenshot was taken at to confirm the specific page no longer looks like a phone view.

### Production consideration

A real production build would very likely still want a proper Google Maps JS API key (static
Static Maps image or full JS SDK) rather than the keyless `output=embed` iframe — that's a real,
paid integration decision for later, not something to solve by trying harder to make the free
embed reliable, since its reliability ceiling is a browser-privacy-setting problem, not a code bug.

## 24. Cursor affordance, logout destination, auth options, and a copy-voice sweep

### Situation

Four more pieces of direct feedback: hover didn't show a pointer cursor anywhere on the site;
logging out landed back on the login form instead of the public site; the Login/Register/Guest
picker "felt lame"; and the site's copy still carried visible em dashes, a recognizable AI-writing
tell.

### Decision

**Cursor**: traced to Tailwind's own preflight, which resets `<button>` to `cursor: default` (a
deliberate upstream choice for buttons that aren't always clickable). Every custom button in this
app *is* always clickable when not disabled, so one global rule in `index.css`
(`button:not(:disabled) { cursor: pointer }`) fixes it everywhere at once — verified via a computed-
style check, not just a visual look.

**Logout**: `ProfilePage`'s logout and `DeleteProfilePage`'s delete both now `navigate('/')` instead
of `/auth` — the same "a signed-out visitor belongs on the public site" reasoning as §22's landing-
page fix, applied consistently to every place a session actually ends.

**Auth options**: replaced the two-way pill tab (Log in / Register) with Guest demoted below a
divider, with three equally-weighted option cards (Guest, Log in, Register) — Guest first, since
it's genuinely this prototype's lowest-friction real path (§10: functionally identical to Login/
Register, no password checked either way), not squeezed in as an afterthought.

**Copy sweep**: every em dash used as prose punctuation in user-visible text (headings, body copy,
error/empty states, button labels) across every page and component was replaced with a period,
comma, or colon, whichever read most naturally — grepped and re-verified clean afterward. Em dashes
used as a genuine *empty-value placeholder* (`session.currentToken ?? '—'`, matching a real "no
data yet" table/stat convention, not prose) were deliberately left alone — a different character
serves a different job there, and this fix is about writing voice, not that convention.

### Prototype behavior

All four fixed and verified live (cursor via computed style, logout via post-click URL check,
options and copy via direct read).

## 25. Closing out the remaining pages, and the staff console's own hardcoded cream

### Situation

Finishing the sweep across every remaining page: `DoctorPage`, `ClinicDetailPage`'s doctor grid,
`TokenConfirmedPage`, `ProfilePage` + its sub-pages, `VisitsPage`, and a lighter pass on the staff
console (intentionally not the primary rebuild target, per brief §32).

### Decision

Most of these needed nothing further — they already inherit the v3 tokens and read correctly
(verified live, not assumed). Two real, separate bugs turned up while checking, both fixed:

- **`StaffLayout` had its own hardcoded `bg-[#F4F2EC]`** — a second, undocumented cream color that
  lived entirely outside the design-token system. The whole point of keeping token *names* stable
  through the v3 re-skin (§20) was that every page picks up a palette change for free — this one
  line was the one place that assumption was actually false, so the staff console kept the beige
  background even after §23's fix everywhere else. Now uses `var(--color-bg)` like everything else.
- **`.animate-count-pulse` was silently dead** — `index.css`'s full rewrite for v3 (§20) dropped
  the `count-pulse` keyframe along with the old palette, but `StaffQueueConsolePage`'s `BigStat`
  still referenced the class. No error, just a missing bump animation on the current-token/next-
  patient numbers whenever they changed. Restored the keyframe. Found by grepping for the class
  name and noticing it was defined nowhere, not by spotting it visually.

`VisitsPage` widened to a 2-column grid at `lg`; everything else in the staff console (its `black/5`
borders, dark header) was left as-is — that contrast with the patient app is a deliberate, already-
documented decision (`StaffLayout`'s own comment), not an inconsistency to fix.

### Prototype behavior

Full site build clean; every page screenshotted at least once this round to confirm no visual
breakage from any of the fixes above.

## 26. Multi-tenant hospital/staff auth — resolving §19's open question

### Situation

Correct product-level pushback: the staff/hospital side was one shared passcode (`sunrise2026`),
checked entirely client-side, giving whoever had it full visibility into every one of the 9 seeded
clinics' every doctor's every queue and the platform-wide revenue report. That's fine for "does
the concept work," not for a product meant to be sold to multiple independent clinics/hospitals as
customers — each needs to be its own tenant, seeing only its own data, and the backend needs to
actually enforce that. §19 already named this exact gap ("no per-hospital login separation").

Also clarified in the same conversation: the "offline token" flow was never a second system needing
to sync against the online one. `POST /api/sessions/:id/token` with `source: 'offline'` already
wrote into the identical `Session`/`QueueEntry` the online flow uses — the actual gap was identity
(who's logged in, which clinic/doctor they own) and two genuinely missing reception features
(looking a patient up by their 4-digit code, and a printable walk-in token slip).

### Decision

**Four real roles**, a real `Account` entity (`backend/src/types/account.ts`), and server-side
enforcement, not just UI hiding:

- **super_admin** — platform-wide; onboards new clinics as tenants, sees platform revenue.
- **clinic_admin** — scoped to one clinic (`Account.clinicId`); everything clinic_staff can do,
  plus their own clinic's revenue/analytics and creating that clinic's staff logins.
- **doctor** — scoped to themselves (`Account.doctorId`, reverse-pointed from `Doctor.accountId`);
  a personal dashboard, not a clinic's aggregate. Works across as many clinics as they actually have
  sessions at (`sessionsForDoctor`), with no need to enumerate clinics on the account itself.
- **clinic_staff** — scoped to one clinic, operational only: generate + print walk-in tokens,
  verify a patient's code, call next/skip/no-show/complete. No revenue or analytics access — 403'd
  server-side even if someone found the URL, not just a hidden nav item.

One ownership check (`assertCanActOnSession` in `backend/src/store/authEngine.ts`) is reused by
every scoped route — session actions call it directly, entry actions resolve to their session and
reuse it. Auth itself: a bearer token = an opaque string in an in-memory Map
(`backend/src/store/store.ts`'s new `authTokens`), no JWT, no password hashing — the same honesty
precedent the single shared passcode already established, just per-account and now actually
checked server-side instead of trusted client-side.

**One thing the initial plan got wrong, caught before it shipped**: staff-only routes
(start/complete/skip/requeue/no-show/priority, call-next, doctor-status, offline token creation)
correctly gained `requireAuth`. `POST /queue-entries/:id/cancel` almost did too, following the same
list mechanically — but that route is the *patient's* "Cancel this visit" button on
`ActiveVisitPage`, not a staff action, and patients still have no accounts (unchanged, out of
scope). Caught by re-checking each route against its actual frontend caller before applying the
blanket change, not by trusting the plan's own route list.

Patient-facing routes are otherwise untouched: online token creation, reading a queue entry, and
cancel all stay unauthenticated, verified live after every phase of this change (not just at the
end) specifically so a regression there wouldn't ship unnoticed underneath the staff-side rework.

### Prototype behavior

Built and verified in phases, backend-first: login/logout/me → ownership enforcement on every
existing action route (verified with real 401/403 boundary checks, not just reading the code) →
scoped revenue (`scopeReportToClinic` in `revenue.ts`, a filter on the already-computed report, not
a second aggregation path) → three new scoped dashboards (`/dashboard/doctor`, `/dashboard/clinic`,
`/dashboard/platform`) → verify-by-code lookup (`findByVerificationCode` in `queueEngine.ts`) →
tenant onboarding (`/admin/clinics`, shows the new admin's password once, on screen — no email
sending in this phase). Then frontend: `lib/auth.ts` replacing `lib/staffAuth.ts` entirely (deleted,
along with the old passcode-only `RequireStaffAuth`), a real email+password `StaffLoginPage` routing
by role, a new `DoctorDashboardPage` (today/monthly revenue, daily average, per-clinic session
list — reusing a `StatCard` extracted from `StaffRevenuePage` rather than copy-pasted), a new
`SuperAdminPage` (tenant list + onboarding), and `StaffRevenuePage` reused as-is for both
clinic_admin and super_admin since the backend now returns whatever the caller's role is allowed to
see from the same endpoint. `StaffQueueConsolePage` gained the verify-code lookup and a new
printable `TokenSlip` component (reusing `StaffRevenuePage`'s existing print-stylesheet pattern).

Verified end-to-end with real logins for every seeded role (clinic_admin, clinic_staff, two
multi-clinic doctors, super_admin): correct post-login routing, cross-clinic actions 403, revenue
correctly scoped per role, `clinic_staff` has no Revenue nav and is 403'd if it hits the endpoint
directly, a walk-in token generates a real printable slip, and a seeded verification code resolves
to the right patient. Screenshotted, not just curl-verified, for the doctor dashboard, the admin
tenant list, and the reception console mid-flow.

### Production consideration

Same non-goals as the rest of this prototype's honesty story, explicit rather than silent: no
password hashing, no JWT/token expiry, no email verification or password reset, no general
doctor/clinic-editing admin UI beyond the one "attach a login to an existing doctor" action, no
`Organization` entity above `Clinic` (1 clinic = 1 tenant, matching every existing join in the data
model — a hospital chain with multiple physical locations is a real, separate decision for when it's
actually needed, not built speculatively now), and no audit log beyond the existing
`priorityAssignedBy` field (now defaulted from the authenticated account's name rather than a
client-supplied string). Patients still have no accounts — unchanged, intentionally out of scope.

## 27. Granular module permissions, replacing §26's fixed roles — and real features behind every one

### Situation

Correct product-level pushback on §26's own shape, restated precisely: **super_admin_staff** and
**hospital_staff** aren't fixed roles at all in a real hospital SaaS — they're accounts an owner
(super_admin / hospital_admin) creates and then hands a specific *subset* of capabilities from a
module catalog ("Staff A → Hospitals + Doctors", "Staff B → Payments + Settlements", "Staff C →
Users + CRM", "Reception Staff → offline patients + appointments + queue", "Payment Staff → cash
verification + payments"). §26's `clinic_staff` was all-or-nothing — any staff login could do every
staff-console action, full stop. That's not a granularity gap you patch with more roles; it's the
wrong model.

The sharper half of the same pushback: role-gated routing without real functionality behind it is
"static pages built for the name's sake," not a product. Audited before writing anything — grepped
the whole codebase for coupon/refund/notification/CRM code (none existed) and traced every
`hospitalFeeStatus` write site (exactly one, at token creation, never updated again). A
`PAY_AT_HOSPITAL` token's fee could be marked `DUE` and then never, anywhere, marked collected —
confirmed real, not assumed. That gap, not a hypothetical one, is what "permissions" needed to
actually gate.

### Decision

**Rename, then rebuild the capability model underneath it.** `clinic_admin`/`clinic_staff` →
`hospital_admin`/`hospital_staff` (mechanical, 13 files, ~39 occurrences — a rename, not a
domain-model change; `Clinic`/`Doctor`/`Account.clinicId` keep their existing names). A new
`super_admin_staff` role sits alongside `super_admin`, mirroring `hospital_staff` alongside
`hospital_admin`.

`Account` gains `permissions?: string[]` — set only for the two staff roles, never for
`super_admin`/`hospital_admin` (who hold everything in their scope implicitly, nothing to list).
Two module catalogs (`PlatformModule`, `HospitalModule` in `backend/src/types/account.ts`, mirrored
in `frontend/src/lib/accountTypes.ts`):

| Platform (super_admin_staff) | Hospital (hospital_staff) |
|---|---|
| hospitals, doctors, payments, settlements, refunds, coupons, users, crm, notifications, reports, system_settings | queue, tokens, appointments, payments, refunds, notifications |

`hasPermission(account, module)` (`backend/src/store/authEngine.ts`) is the single source of truth:
`super_admin`/`hospital_admin` always pass; `super_admin_staff`/`hospital_staff` need the module in
their own `permissions`; `doctor` implicitly passes only `'queue'` (a doctor runs their own queue,
they don't handle cash or generate walk-ins — special-cased explicitly rather than left to fall
through to `false`, see below). `assertHasPermission`/`requirePermission` (route middleware) enforce
it server-side; `RequirePermission.tsx`/`hasPermission()` on the frontend hide nav and gate routes
as a courtesy — the backend re-checks every time regardless.

**Ownership and capability stay two separate checks, never merged**: `assertCanActOnSession`/
`assertCanActOnEntry` answer "whose clinic/session is this," `assertHasPermission` answers "was this
account granted this module." A route needing both calls both. `assertCanActOnSession` gained one
line: `super_admin_staff` bypasses clinic ownership exactly like `super_admin` — a platform role
scoped by permission, not by clinic (needed for, e.g., a platform refunds-permission staffer acting
across clinics).

**Anti-escalation, explicit and absolute**: only the real `super_admin` — never `super_admin_staff`,
even holding the `users` module — can create a platform staff account or edit one's permissions
(`POST/PATCH /admin/super-staff/...`). The same shape on the hospital side: staff-account creation
and permission-editing are `hospital_admin`-only, never delegable to `hospital_staff` no matter what
modules they hold (`StaffTeamPage` is gated with a hard `RequireRole allow={['hospital_admin']}`,
not a permission check, same as the platform side's own rule). A staff account with the `users`/team
module could otherwise grant itself more than it was given.

**Six real features, one per module family that had none before:**

- **Fee collection** (`payments`) — the confirmed gap. `collectHospitalFee()` in `queueEngine.ts`,
  `POST /queue-entries/:id/collect-fee`, a "Collect fee" action in `QueueRow.tsx` shown only for
  `PAY_AT_HOSPITAL` + `DUE` entries.
- **Refunds** (`refunds`, both levels) — `refundStatus`/`refundAmount`/`refundedAt`/`refundedBy`/
  `refundReason` layer on top of the existing fee fields, never flip them back to `DUE` (the money
  really was collected once — same "separate, never-collapsed statuses" rule §3-4 already
  established for payments). `issueRefund()`, `POST /queue-entries/:id/refund`, `GET
  /staff/refunds`, a `RefundModal` + dual-routed `StaffRefundsPage`. Resolves edge case #31 ("no
  refund model") with a working flow.
- **Coupons** (`coupons`, platform) — a real `Coupon` entity, `GET /coupons/validate` (public, same
  trust model as online token creation), full CRUD, no hard delete (retired via `active: false`,
  matching §10's "nothing is ever deleted"). `computeDiscount()` re-derives the real discount
  server-side from the coupon + session every time — `generateToken` never trusts a client-computed
  total, mirroring how fee snapshots already work. `TokenPaymentPage` gets a coupon field with real
  struck-through pricing once applied.
- **CRM** (`crm`, platform-only) — `computePatientDirectory()` groups existing `QueueEntry` data by
  phone number (falling back to name when no phone is on file — an honest, documented imprecision
  for a prototype with no `Patient` entity, not a bug). Real visit counts, total paid, clinics
  visited — not an invented ticketing system.
- **Notifications** (both levels) — a minimal `NotificationEvent` log, one `emit()` called from real
  event sites only (clinic onboarded, staff/doctor account created, refund issued, coupon created).
  Deliberately *not* wired to fee collection or ordinary queue moves — those happen constantly and
  would drown out anything worth a human noticing. `GET /notifications` scoped by role (platform
  accounts see `PLATFORM`-scope events, hospital accounts see only their own clinic's `CLINIC`-scope
  events). A `NotificationBell` in the header (its "View all" link is the one route to the full
  page — deliberately no separate text nav item, the same "icon in the header, not also a tab" shape
  real consoles use) with a per-account localStorage "seen" timestamp, not a server-side read
  receipt — proportional to a feed that's already an in-memory log.
- **Analytics trend upgrade** — `computeRevenueReport()`'s `byDay` already existed and was already
  returned by three endpoints, just never rendered; the doctor dashboard's four stat cards already
  summed the same rows a day-grouped `dailyTrend` needed. Both were "expose data already being
  computed," not new aggregation. Two chart components (`RevenueTrendChart`, `TokensPerDayChart`)
  built as plain SVG rather than a new dependency for two small charts — straight line segments (a
  curve between two real points implies values never actually collected), one hue, no dual y-axis,
  recessive dashed gridlines, a hover tooltip per point instead of every number crammed on at once.

**Permission management UI + location filtering** — the "meta" layer configuring everything above.
`PermissionEditor.tsx`, one reusable checkbox grid, used in `SuperAdminPage`'s new "Platform staff"
section (visible only to the actual `super_admin`, never `super_admin_staff`) and the new
`StaffTeamPage` (`/staff/team`) — which finally gives `createClinicStaff` its first real caller;
it existed in `lib/api.ts` since §26 with no frontend form ever calling it. Location filtering maps
to the existing `Clinic.city` field, no new geography: `scopeReportToCity()` mirrors
`scopeReportToClinic()`'s "filter the already-computed report" shape, a city dropdown on
`SuperAdminPage` (client-side, from clinics already in the response) and on `/admin/revenue`
(server-side, `?city=`, since revenue needs the filtered totals, not just a filtered list) —
matching the role spec's own "select a location and see data for that location."

**Two mistakes caught before shipping, not after:**

1. The first draft of `hasPermission()` returned `false` unconditionally for `doctor`. Adding
   `requirePermission('queue')` gates to call-next/doctor-status/entry actions would then have
   locked doctors out of their *own* queue — caught by re-reading what routes doctors actually call
   before assuming "no permissions array" meant "no access to anything," and fixed with the explicit
   `doctor` → `'queue'`-only special case above.
2. `/dashboard/platform` needed a `requireRole('super_admin', 'super_admin_staff')` +
   `requirePermission('hospitals')` gate. Wrapping the *frontend route* `/admin` itself in the same
   `RequirePermission` would have created an infinite redirect loop for a `super_admin_staff`
   account without `hospitals`: their `homeRouteFor` is `/admin`, and `RequirePermission`'s own
   failure branch also redirects to `homeRouteFor`. Avoided by gating only the backend endpoint and
   showing a graceful in-page `EmptyState` inside `SuperAdminPage` instead — the same "signed in,
   just not allowed here" principle §26 already established for `RequireRole`, applied one level
   more precisely.

A pre-existing gap, found and fixed as a side effect of touching this code, not the headline change:
`hospital_admin` attaching a login to a doctor (`POST /admin/doctors/:id/account`) had no clinic
ownership check at all — any `hospital_admin` could grant a login to *any* doctor, regardless of
whether that doctor practiced at their clinic (a doctor can work multiple clinics). Fixed by
checking `sessionsForDoctor(doctorId).some(s => s.clinicId === account.clinicId)` before allowing it.

### Prototype behavior

Built and verified backend-first, phase by phase, in the same discipline §26 established: rename →
permission engine → fee collection → refunds → coupons → CRM + notifications → analytics →
permission management UI + location filtering, each phase curl-verified for real 200/403 boundaries
across every role combination (a front-desk account can call-next but 403s on collect-fee; a
payments-desk account can collect-fee/refund but 403s on call-next; a `super_admin_staff` with
`hospitals` can onboard clinics but one with only `payments` 403s; a `hospital_staff` account
403s outright on `/admin/clinics/:id/staff` even for their own clinic, since team management is
`hospital_admin`-only) before any frontend work started on that phase. `npx tsc -b` clean in both
`backend/` and `frontend/`, plus a full `npm run build`, after every phase. Every new frontend
surface screenshotted with Playwright, not just curl-verified: fee collection and refund actions on
the queue console, coupon redemption with real struck-through pricing, the admin coupons list, the
CRM directory, the notification bell (badge count, dropdown, "View all") and full notifications page
scoped correctly per clinic, both new charts including their hover tooltips, the platform-staff
permission grid actually flipping a checkbox and persisting "Saved," and the location filter
narrowing both the tenant list and the revenue totals live.

Seed data (`backend/src/store/seed.ts`) extended with a third `super_admin_staff` account
(`staff.users@visitnow.app`, holding `users`/`crm`/`notifications`/`reports` — the spec's own "Staff
C → Users + CRM" example made real) and `'notifications'` added to the existing Sunrise front-desk
account, so every new module has a real, non-`super_admin`/`hospital_admin` login to demo against,
not just the two owner accounts that could already see everything.

### Production consideration

Same honesty story as every prior section, explicit rather than silent: no real payment-gateway
refund integration (a ledger flip, same simulated-gateway honesty as `PaymentGatewayModal`), no real
SMS/push/email (notifications are an in-app, in-memory log only), no real editable system-settings
store (`system_settings` exists in the module catalog but has no backing UI/store yet — read-only
over existing constants, not built this round), no real settlement payout (the `settlements` module
exists in the catalog for the same reason — a future settled/unsettled flag, not a bank transfer, is
the honest version, not built this round either), no geocoding (location filtering is `Clinic.city`,
unchanged), no auth-strength changes (still §26's plain-text password comparison and opaque
in-memory token — this round adds authorization granularity only, not authentication strength), no
self-service permission editing (only the real `super_admin`/`hospital_admin` ever edits permissions,
never delegable, by design), no org-above-clinic hierarchy (still 1 clinic = 1 tenant, unchanged from
§26), coupons have no fraud detection beyond `maxUses` and no per-patient cap (needs patient
accounts, still out of scope), and CRM is read-only — a directory, not a ticketing/case-management
system.
