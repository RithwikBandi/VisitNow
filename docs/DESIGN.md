# VisitNow — Design System (v3, full re-skin)

Companion to `VISITNOW_PRODUCT_DECISIONS.md` (product logic) — this file owns visual decisions
only. Written before writing components, per the rebuild brief's own STEP 6.

Brand source: the reference mobile mockup's splash/login screens — a two-tone blue/green "V"
with a checkmark notch, wordmark "VisitNow", tagline "Skip the Wait". No separate logo file was
supplied; colors and proportions are read from that mockup.

---

## 1. Visual theme and atmosphere

**VisitNow is a ticket counter, not a dashboard.** The product replaces a physical numbered
token — the kind you'd pull at a bakery, a bank, or a hospital reception desk — with a digital
one. The entire visual system is built around that object: a stub card with a die-cut notch and a
tear-line, oversized tabular numerals for the token itself, and a departure-board digit roll when
the queue moves. This is the "design signature" the brief asks for (§16, §18) — not a generic
healthcare SaaS blue-on-white template, and not a copy of the reference mockup's own generic
consumer-app chrome.

Mood: confident, mechanical-but-warm, unmistakably a *place you get something real* rather than
a screen of settings. Density is moderate — patients read this mid-errand, often one-handed, so
nothing is cramped, but nothing is padded out with empty SaaS whitespace either.

Light mode only (per the Theme Matrix: clinical/patient-portal contexts favor light — trust and
legibility over dark-surface density). No dark-mode token layer for this pass.

## 2. Color palette and roles

Neutrals are warm-tinted (paper, not blue-gray) — this is the single biggest lever away from
"generic AI healthcare SaaS," which defaults to cool slate-on-white. Brand blue and confirmation
green are pulled from the actual logo.

| Token | Value | Role |
|---|---|---|
| `--color-canvas` | `#faf7f1` | Page background — warm "ticket stock" paper, not white |
| `--color-surface` | `#ffffff` | Cards, sheets — pure white steps up from the warm canvas (satisfies the light-surface-hierarchy minimum without a shadow) |
| `--color-surface-sunken` | `#f2ede2` | Recessed wells (e.g. inside a stat row) |
| `--color-ink` | `#161a22` | Primary text — near-black, cool-neutral (not brand-tinted; body text on paper should read as ink, not as branding) |
| `--color-ink-muted` | `#585d6b` | Secondary text |
| `--color-ink-faint` | `#8a8e9c` | Tertiary / metadata text |
| `--color-line` | `#e7e0d0` | Default borders, warm-tinted to match canvas |
| `--color-line-strong` | `#d3c9b2` | Emphasis borders, input outlines |
| `--color-brand-50…900` | ramp from `#eaf1ff` to `#0a2464`, `500 = #1c62ec` | The logo blue. Primary actions, links, selected state, structural chrome (header, nav) |
| `--color-accent-50…700` | ramp from `#e9f9ee` to `#126b32`, `500 = #1fa64d` | The logo green. **Reserved for confirmation/live/paid states only** — never a generic secondary color. Carries the same single job the checkmark plays in the mark itself |
| `--color-stamp` | `#b8442f` | Emergency/priority indicator — an inked-stamp red, not the same red as form-validation danger. Used only on staff-set priority badges, per the product rule that patients can't self-declare priority |
| `--color-danger` | `#c22b3a` / bg `#fdecee` | Errors, destructive actions, cancellations |
| `--color-warning` | `#b5690b` / bg `#fdf1de` | Due payments, delayed doctor, paused queue |

60/30/10: canvas+surface neutrals carry the page (60), ink text and line borders carry structure
(30), brand blue and confirmation green are the accent layer (10) — green never exceeds "a badge,
a dot, a checkmark," it's never a section background.

## 3. Typography

Font Selection Procedure applied: reflexive picks for "confident, mechanical, warm" would have
been Sora, Space Grotesk, Manrope — all rejected (Space Grotesk is banned outright; the other two
are exactly the kind of default this rebuild is meant to move away from).

- **Display / numerals — Archivo** (Omnibus Type). Grotesque with real weight range and a
  genuinely mechanical, stamped character at 800–900 — reads like counter signage, and its
  tabular lining figures are why it's doing double duty as the number face for token digits.
- **Functional / body — Public Sans** (U.S. Web Design System). A humanist workhorse chosen
  specifically for a healthcare-trust context: it was built for exactly "clear, legible,
  civic-grade text at any size," which is the job body copy has here.
- Both loaded via Google Fonts (`Archivo:wght@700;800;900`, `Public+Sans:wght@400;500;600;700`).

| Level | Face | Size / line-height | Weight | Tracking |
|---|---|---|---|---|
| Token display (the number itself) | Archivo | 80px / 1.0 | 900 | -0.022em |
| Display H1 (hero, section-scale) | Archivo | 44–56px / 1.05 | 800 | -0.022em |
| H2 | Archivo | 28–32px / 1.15 | 800 | -0.022em |
| H3 / card title | Archivo | 18–20px / 1.25 | 700 | -0.012em |
| Body | Public Sans | 15–16px / 1.5 | 400/500 | normal |
| Small / metadata | Public Sans | 13px / 1.4 | 500/600 | normal |
| Eyebrow / label | Public Sans | 11–12px / 1.2 | 700, uppercase | 0.06em (the one deliberate positive-tracking exception — small uppercase counter-signage labels only) |

`font-variant-numeric: tabular-nums` on every dynamic number (token count, patients-ahead, prices,
countdown). `text-wrap: balance` on headings, `pretty` on body paragraphs.

## 4. Component stylings

- **Button** — radius 10px (not pill: a ticket counter's buttons are function keys, not bubbly
  chat-app pills). Primary: brand-600 fill, white text, `shadow-sm`; hover darkens to brand-700;
  active `scale(0.96)`; focus-visible 2px brand-200 ring, 2px offset; disabled 45% opacity, no
  pointer events. Secondary: paper surface, `line-strong` border, ink text, same press/focus
  treatment. Danger: stamp/danger fill for genuinely destructive-only actions (cancel token).
- **TicketCard** — the signature container (the Active Visit card, Token Confirmation, and the
  home "active token" summary). White surface, radius 20px, a horizontal dashed perforation line
  dividing a compact "stub" header (doctor / clinic / session) from the body, and two
  canvas-colored circular notches punched into the left and right edges at the perforation's
  height — the literal die-cut ticket-stub silhouette. No drop shadow; the notch + perforation
  *is* the depth cue, a shadow would compete with it.
- **Ordinary card** (doctor card, clinic card, list row) — 1px `line` border, no shadow at rest;
  `shadow-sm` + `line-strong` border on hover for anything clickable. Shares the same `20px`
  radius token as TicketCard (`--radius-lg`, already used this way by every existing card
  component before this rebuild — not worth a mechanical radius-only edit across a dozen files
  for an 8px difference) but stays visually flatter: no perforation, no notch, no shadow at rest.
  The ticket motif is what's reserved for actual tokens, not diluted into every list row (brief
  §18's "excessive rounded rectangles" ban) — the differentiator is the die-cut silhouette, not
  the corner radius.
- **SplitFlapDigit** — the live-number primitive (now-serving, patients-ahead, the token reveal on
  confirmation). Each digit is a fixed-width odometer column; on change it rolls through to the
  new digit over 380ms, `cubic-bezier(0.16,1,0.3,1)`, ~40ms stagger between digits left→right.
  `prefers-reduced-motion`: swap to an immediate value change, no roll.
- **Badge** — radius 6px (small, chip-like — distinct tier from cards/buttons), semantic
  background+text pairs from the palette above (`success` = accent, `warning`, `danger`, `stamp`
  for priority/emergency, neutral for source tags online/offline/appointment).
- **Input** — radius 8px, `line-strong` border, brand-500 border + 2px brand-100 ring on focus,
  16px text (prevents iOS zoom-on-focus), inline error text in `danger` directly under the field.
- **Nav (patient bottom bar / desktop header)** — flush, no shadow; active state is a filled
  brand-50 pill behind the icon+label, not a border-bottom accent (avoids the banned thin-line
  tab-underline default).

## 5. Layout principles

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96px — one ladder, scaled as a set when a
  page reads too tight or airy, never tuned per-gap.
- Desktop content max-width: 1280px for marketing/discovery grids, 640px for single-column flows
  (payment, confirmation, active visit) — a ticket-width column, deliberately not stretched full
  width just because desktop has the space (brief §19/§20: native web, not a scaled-up phone
  screen, but a single-token flow has a real natural width and shouldn't stretch past it).
- Desktop discovery pages (clinics, doctors) go multi-column (2–3 col card grids, filter rail
  beside results) — this is where desktop space gets used properly; mobile stacks to one column.
- Body paragraph width capped ~65ch.

## 6. Depth and elevation

Light-mode step system, no glassmorphism:
- Canvas → Surface: color step alone (`#faf7f1` → `#ffffff`) is the primary depth cue.
- Elevated (sticky header, open sheet, dropdown): `shadow-md` = `0 8px 24px -6px rgba(22,26,34,0.14)`.
- Resting interactive cards: 1px border only, no shadow.
- Hover-elevated cards: `shadow-sm` = `0 1px 3px rgba(22,26,34,0.10)` + border step to `line-strong`.
- TicketCard depth cue is structural (notch + perforation), not shadow, per §4.

## 7. Do's and don'ts

- Do reserve accent green for confirmed/paid/live-moving states only — never a decorative accent.
- Do keep the TicketCard motif exclusive to actual token/visit surfaces — a doctor list row is
  not a ticket.
- Do use the split-flap digit roll only on numbers that represent live queue movement — not on
  every counter on the page (stats-bar counts on the landing page stay static).
- Don't use pill-radius buttons anywhere — 10px is the one button radius.
- Don't add a shadow to the TicketCard; the notch is the depth cue and a shadow flattens the
  die-cut illusion.
- Don't let the stamp-red priority color leak into anything patient-facing as a self-service
  control — it only ever renders as a read-only badge staff has set.
- Don't stretch single-column flows (payment, confirmation, active visit) to desktop's full
  width — cap at 640px even on a 1440px viewport.
- Don't reuse the landing page's dark `brand-900` section treatment anywhere in the patient app
  itself — that register is marketing-only.

## 8. Responsive behavior

- Breakpoints: 375 / 640 / 1024 / 1280px (Tailwind's `sm`/`lg`/`xl` defaults, no custom scale).
- Patient app: bottom tab bar ≤1023px (Home / Doctors / Visits / Profile), collapses into a
  persistent left-aligned top nav ≥1024px — no bottom bar on desktop.
- Marketing nav: full inline links ≥768px, single hamburger sheet <768px (a sheet, not a modal —
  it doesn't lock focus away from a whole-page navigation decision).
- Touch targets ≥40×40px everywhere; `touch-action: manipulation` globally.
- Discovery grids: 1 col <640px, 2 col 640–1023px, 3 col ≥1024px.

## 9. Agent prompt guide

Quick reference: `canvas #faf7f1` · `surface #ffffff` · `ink #161a22` · `ink-muted #585d6b` ·
`line #e7e0d0` · `brand-500 #1c62ec` · `brand-700 #0f3aa6` · `accent-500 #1fa64d` · `stamp #b8442f`
· `danger #c22b3a` · button radius `10px` · card radius `12px` · TicketCard radius `20px` · badge
radius `6px` · display face `Archivo` · body face `Public Sans`.

Example prompts:
- "Build a doctor list row on `surface` with a `12px` radius, `1px solid line` border, no shadow
  at rest, `shadow-sm` + `line-strong` border on hover; name in Archivo 700 18px, specialty and
  clinic in Public Sans 500 14px `ink-muted`, a live queue badge (accent bg, accent-700 text,
  6px radius) top-right showing `Now serving 21`."
- "Build the TicketCard for Active Visit: `surface` background, `20px` radius, no shadow, a
  dashed `line-strong` perforation 1px line two-thirds down, two `canvas`-colored 14px circles
  punched at the left/right edges at that line's height; above the line a compact stub row
  (doctor · clinic · session in Public Sans 13px `ink-muted`), below it the token number in
  Archivo 900 80px `brand-700` with `tabular-nums`, centered."
- "Build a SplitFlapDigit: a `1ch`-wide, line-height-tall overflow-hidden column; on value change,
  translate the digit strip to the new digit's offset over 380ms
  `cubic-bezier(0.16,1,0.3,1)`, no bounce; respect `prefers-reduced-motion` by skipping the
  transition entirely."
