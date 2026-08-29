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

## 11. Open questions (unresolved, flagged for a future decision)

- **Real patient auth.** Login/Register currently collect a name+phone and function identically
  to Guest — no password is verified against anything (see §8.10 sibling reasoning: there's
  nothing to verify against yet). This is fine for a demo, not fine for a real product; the
  screens exist so the *shape* of the flow is right, not because the auth is real.
- **Location.** "Select Location" in this prototype is a fixed list of demo cities with no real
  geolocation or distance calculation — Hyderabad-area demo data doesn't currently vary by city.
  Real distance-based discovery needs actual clinic coordinates, which the current `Clinic` model
  doesn't carry (`location`/`city` are free text — see the original architecture's own note on
  this).
- **Token capacity limits.** See edge cases #16-18 — not modeled at all yet. Worth deciding
  whether capacity should be a hard cap or a soft "queue is long" warning before building it.
- **Refunds.** See edge case #31 — no data model support yet; needs a real payment gateway
  relationship to mean anything anyway.
