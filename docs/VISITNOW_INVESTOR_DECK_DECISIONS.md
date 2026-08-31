# VisitNow Investor Deck — Decisions Log

This document records why the investor deck (`pitch/VisitNow-Investor-Deck.pptx`) is built the way
it is: the narrative, the slide-by-slide purpose, where every factual claim comes from, what was
deliberately left out, and the design decisions behind it. It exists so a future edit to the deck
starts from the same reasoning, not a guess at what the previous version was trying to do.

The deck's factual foundation is `docs/VISITNOW_INVESTOR_CONTEXT.md` — every claim on every slide
traces back to a section in that document, which itself traces to the live codebase, not to the
deck's own earlier draft.

---

## Why this is a full rebuild, not a reskin

The prior version of this deck (18 slides) was assembled the way product documentation gets
written: one slide per system component (permissions, architecture, refunds, coupons, CRM), each
one accurate but none of them building toward a single argument. It read like a features list with
slide numbers, not a pitch. The instruction for this round was explicit: audit the actual product
first, then build the story an investor needs, and only afterward decide which slides that story
requires — not the reverse.

The rebuild cut the deck from 18 slides to 12, removed every slide whose only job was to describe an
implementation detail (permission matrices, module catalogs, a dedicated technology-stack slide),
and replaced the narrative with the problem → insight → product → business → path-to-scale
structure investors actually evaluate a company against.

## The narrative, in one pass

1. A patient gets a token today and then has no way to know when it will be called — the only way
   to protect a place in line is to physically wait there.
2. The token itself doesn't need replacing. It's already how local clinics operate. VisitNow
   digitizes it.
3. That's the whole product: a real numbered token, live for the patient, live for the clinic.
4. It's built and running, not a mockup — shown directly, not described.
5. The mechanic that makes it work operationally is a single unified queue: online, walk-in, and
   appointment tokens all land in the same call order, so a clinic never runs two systems.
6. The business model is one flat fee, deliberately simple: ₹9 a token, no percentage, ever.
7. Clinics adopt it because it adds a layer, not because it forces them to replace anything.
8. The product's current state is stated honestly — what's working, what's simulated, what's next
   — because credibility matters more than a deck that looks finished.
9. The path from one clinic to queue infrastructure is a straight line, each step reusing the same
   engine.
10. Close on the same line the product opens with: skip the wait.

---

## Slide-by-slide

| # | Slide | Job | Source |
|---|---|---|---|
| 1 | Title — "Skip the wait. Not the doctor." | Establish the brand and the one-line promise before anything else. Minimal text, one real product visual (the live queue board). | Context doc §1; visual is the actual landing page's live-session panel, screenshotted from the running app. |
| 2 | The Problem — "Time lost to uncertainty." | Name the problem precisely: not booking, not access — the wait itself, and the physical cost of protecting a place in line. | Context doc §2. The before-flow diagram (Arrive → Get token → Wait ×4) is an original diagram, not a screenshot. |
| 3 | The Insight — "India already has the token. We digitize it." | The single sentence the rest of the deck has to earn. Deliberately the sparsest slide — one insight, not a list. | Context doc §1, §8, §9 — reflects the actual data model (token-first, not appointment-first). |
| 4 | How VisitNow Works | Turn the insight into an experience a patient recognizes, not an architecture diagram. Five steps, numbers not descriptions. | Context doc §5, mirrors the real patient flow verified live. |
| 5 | The Product — real screenshots | Prove slide 3 and 4 aren't aspirational. Two large screenshots, not a grid: the live queue before booking, the fee breakdown before paying. | Context doc §5, §10, §12. Screenshots captured directly from the running app (`/sessions/session-1`, `/sessions/session-1/token`). |
| 6 | One Queue. Every Door. | The operational mechanic that makes the whole thing work for a clinic: three sources, one call order. This is the slide most likely to answer an investor's first skeptical question ("so are there two queues now?"). | Context doc §9, verified directly in the queue-ordering code (`backend/src/store/queueEngine.ts`), not just the UI. |
| 7 | The Payment Model | The business model, in one number and one visual flow. | Context doc §12, exact constant (`PLATFORM_FEE_INR = 9`) and both fee paths verified in code. |
| 8 | Why Clinics Adopt It | Four adoption reasons, each tied to something the product actually does — not generic SaaS value-prop language. | Context doc §6, §23. |
| 9 | What's Real, What's Simulated, What's Next | The credibility slide. Explicit three-way split, stated plainly, no hedging language dressing up a gap as a feature. | Context doc §17, §18, §25 — this slide's three columns are close to verbatim from those sections. |
| 10 | Why This Can Scale | The expansion logic as a literal chain, ending on the same "queue infrastructure" framing the insight slide set up. | Context doc §24. Deliberately doesn't name a market size, hospital count, or timeline — none of those exist to cite. |
| 11 | What Comes Next | Six concrete next steps, ordered by how directly they unblock real usage (payments and a database before native apps). | Context doc §25, in priority order. |
| 12 | Close — "Skip the wait." | Bookend the title slide. One vision sentence, "thank you," nothing else. | — |

## What was intentionally left off every slide

- **Revenue, user counts, hospital partnerships, growth rate, retention, market size (TAM/SAM/SOM).**
  None of these exist anywhere in the project. Inventing any of them was the one non-negotiable
  rule for this round. If a real number ever exists for these, it goes on slide 10 or a new
  "traction" slide inserted after it — not retrofitted onto an existing claim.
- **A dedicated technology slide.** The prior deck's tech slide (React/Express/REST specifics)
  didn't survive the rebuild — it answered a question investors mostly don't ask first, and the
  one fact that does matter for credibility ("this is real, working code, not a demo you're
  imagining") is carried by slide 5's real screenshots instead, which make the point directly
  rather than asserting it.
- **A full permission-model / role-matrix slide.** The module-based permission system is real and
  is a genuine, defensible piece of engineering (see context doc §16), but it's an operational
  detail a hospital's IT-literate buyer might ask about, not a headline investor slide. It's
  summarized in one line on slide 8 ("digital operations") rather than given its own slide.
- **"Every hospital is a walled garden" / "built to scale, not to be replaced in six months" —
  and similar lines from the prior deck.** These read as engineering marketing rather than investor
  reasoning — confident-sounding claims that don't actually answer an investor's question. Cut
  entirely, not softened.
- **Appointments as a headline feature.** Per the context doc §14, appointment booking has no
  patient-facing UI yet — only the backend conversion path is real. The deck never claims patients
  can book an appointment; "appointment" appears only as one of three token *sources* that already
  exist in the queue (slide 6), which is the part that's actually true.
- **Any named real clinic, doctor, or patient as a claimed partner or customer.** All product
  screenshots show the seeded demo data (fictional, realistic-sounding names — see context doc §19)
  used to make the multi-tenant story demonstrable. No slide implies any of them adopted VisitNow.

## Design decisions

- **Palette:** VisitNow's own brand colors, read directly from `frontend/src/index.css` rather than
  picked freehand — brand blue `#1c62ec`, accent green `#1fa64d`, plus the exact source/appointment
  badge colors (`#144cd1` online, `#585d6b` walk-in, `#7c4fd4` appointment) reused in the unified-
  queue diagram on slide 6 so the diagram's colors mean the same thing they mean in the live
  product.
- **Dark/light rhythm:** slides alternate between a near-black cover treatment (title, insight,
  unified queue, scale, close) and a light working treatment (problem, product, payment, adoption,
  status, next), so the two dramatic "big statement" slides (insight, one-queue) get visual weight
  the surrounding content slides don't compete with.
- **The logo:** drawn as two vector shapes (rotated rounded bars) reproducing the real mark's exact
  geometry (`frontend/src/components/brand/VisitNowMark.tsx`'s own 0–100 viewBox and stroke
  proportions) rather than a cropped screenshot — stays crisp at any size and drops cleanly onto
  both the dark and light slide backgrounds.
- **Typography:** a single font (Arial, headline weight and body weight) used everywhere, including
  what would ordinarily be a "body" font, specifically because a mixed Arial/Calibri pairing was
  found to silently fall back to a serif substitute on a machine without Calibri installed —
  Arial-only guarantees the deck looks the same on the machine that opens it as it did when built.
- **No slide has more than one dominant idea.** Bullet lists are capped at four items; most slides
  have none. The "what's real/simulated/next" slide is the one deliberate exception, because
  precision there matters more than brevity — an investor should be able to ask "wait, what's not
  built yet?" and have the slide already answer it.
- **Screenshots, not descriptions.** Every product claim that could be shown is shown: the live
  queue panel, the fee breakdown, the unified queue's actual token/source colors. The one exception
  (slide 5's clinic photo) is a placeholder-service outage at build time (picsum.photos returned
  503/timeout), patched with a plain tinted rectangle rather than left as a broken gray box or
  delayed on an external service the product doesn't control.

## Placeholders for real numbers, when they exist

If real traction ever exists, the natural insertion points are:

- **After slide 9** (a new slide): "Where it's running" — real clinic count, real city count, real
  token volume, replacing or supplementing the "demo environment" framing on the current multi-city
  proof.
- **Slide 10:** a market-size figure, if sourced from real, citable research (not estimated) — the
  chain diagram already has room for a supporting stat line beneath it.
- **Slide 12:** a specific ask (funding amount, use of funds) if and when there is one to state.

Until then, none of these appear, per the instruction that drove this whole rebuild: credibility
first, even where a placeholder would look more impressive.
