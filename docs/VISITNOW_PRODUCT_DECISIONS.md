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
  clinic or doctor (seed.ts is the only way new ones exist), no per-hospital login separation (one
  shared staff passcode covers every clinic, same as before this round), and no notification layer.
  Worth being explicit about rather than letting "the hospital side got built this round" imply more
  than it does.
