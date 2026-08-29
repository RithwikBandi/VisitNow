VisitNow — Product Vision, Prototype Specification & Decision Log

Purpose

This document is the working product brief and decision log for rebuilding the VisitNow prototype.

It is intentionally written as a living document. During development, any important product doubt, edge case, unresolved question, workflow problem, or architectural decision should be added here instead of being forgotten.

The current objective is a convincing, polished, patient-facing prototype for the local doctor/clinic market — not a production hospital-management system.

1. Product Vision

VisitNow is a digital token and live queue platform for doctors, clinics, and hospitals.

Core promise:

Skip the Wait — get your token remotely, track the live queue, and arrive closer to your turn.

The product is primarily token-first, especially for local clinics and individual doctors where the normal operating model is token-based rather than fixed-time appointments.

Appointments are an optional capability for doctors/hospitals that support scheduled appointments.

2. Target Market

Primary target:

Local clinics

Individual doctors with their own clinics

Small and medium healthcare practices

Doctors who work in multiple clinics

Doctors with morning/evening sessions

Token-based consultation systems

Example:

Dr. Suman may have:

Clinic A — morning session

Clinic B — evening session

The doctor/hospital side eventually controls:

clinic information

doctor availability

session/shift timing

token limits

queue status

consultation/token fee

appointment availability

priority rules

The patient side only consumes this information.

3. Core Product Model

The primary journey is:

Patient
→ Location
→ Clinic/Hospital
→ Doctor
→ Clinic + Session
→ Live Queue
→ Get Token
→ Payment Method
→ Token Generated
→ 4-digit visit verification code
→ Active Visit
→ Live Queue Tracking
→ Clinic
→ Doctor
→ Completed

Do NOT make appointments an equal primary product path.

4. Doctor Sessions

A doctor can have multiple sessions in one day.

Example:

Dr. Suman

Morning:
Clinic A
8:00 AM – 12:00 PM

Evening:
Clinic B
5:00 PM – 9:00 PM

Each clinic/session can have its own queue.

The patient selects an available session provided by the doctor/hospital system.

The patient does not decide doctor availability.

5. Unified Queue

The central architecture is:

ONLINE + OFFLINE + APPOINTMENT → ONE QUEUE

Sources:

ONLINE token

OFFLINE/walk-in token

APPOINTMENT, when supported

Example:

Token 21 — ONLINE
Token 22 — OFFLINE
Token 23 — ONLINE
Token 24 — OFFLINE

There should not be separate online and offline queues.

Payment method must not automatically determine queue priority.

6. Queue Categories

Possible queue categories:

REGULAR

PRIORITY

EMERGENCY

Important:

Patients must not freely self-declare emergency status.

Priority/emergency classification should eventually be controlled by authorized hospital/clinic staff or doctor.

For the prototype, demonstrate the concept without over-engineering a production-grade priority algorithm.

7. Queue States

Support conceptually:

WAITING

CALLED

IN_PROGRESS

COMPLETED

SKIPPED

CANCELLED

NO_SHOW

Do not delete historical queue entries just because their state changes.

8. Token-First Payment Model

The token fee is determined by the hospital/clinic/doctor.

Examples:

Clinic A:
Token/consultation fee = ₹500

Clinic B:
Token/consultation fee = ₹400

VisitNow platform fee:
₹9

The platform fee is separate from the clinic's token/consultation fee.

9. Online Token Payment

Example:

Clinic token fee: ₹500
VisitNow platform fee: ₹9
Total: ₹509

Patient pays online.

After successful payment:

Payment successful
→ Token generated
→ 4-digit visit verification code
→ Active Visit
→ Live Queue

Payment state:

Hospital/clinic fee = PAID
Platform fee = PAID

10. Pay at Hospital

Patient can choose to pay the clinic token/consultation fee at the hospital.

Example:

Clinic token fee: ₹500
VisitNow platform fee: ₹9

Patient pays only:

₹9 online

The ₹500 clinic fee remains:

DUE AT HOSPITAL

After ₹9 platform payment succeeds:

Token is generated.
4-digit verification code is generated.
Patient enters the live queue.

At the clinic, staff verifies the visit and collects the ₹500.

This means:

Platform fee = PAID
Hospital/clinic fee = DUE

After collection:

Platform fee = PAID
Hospital/clinic fee = PAID

11. Payment and Queue Must Be Separate

Do not use one generic status such as "PAID" for the whole visit.

Conceptually maintain:

platformFeeStatus

hospitalFeeStatus

paymentMethod

queueStatus

Possible payment method:

ONLINE

PAY_AT_HOSPITAL

Example:

ONLINE:
platformFeeStatus = PAID
hospitalFeeStatus = PAID

PAY_AT_HOSPITAL:
platformFeeStatus = PAID
hospitalFeeStatus = DUE

Payment method must not decide queue order.

12. 4-Digit Verification Code

The 4-digit code belongs to the specific visit/token/appointment.

It is NOT a permanent user PIN.

Example:

Token #27
Verification Code: 4827

Another visit can have a different code.

The code can be shown to clinic staff for verification when required.

For a pay-at-hospital visit, the staff can see:

Token #27
Platform Fee: PAID
Clinic Fee: ₹500 DUE

After collecting the clinic fee, staff can mark the clinic fee as paid.

The exact production verification/settlement workflow is future scope.

13. Pay-at-Hospital Edge Cases

Consider and document:

User pays ₹9 and gets token but never arrives.

User cancels after receiving token.

User misses their turn.

User is marked NO_SHOW.

User arrives but has not paid the clinic fee.

User shows the 4-digit code but staff cannot find the visit.

Payment succeeds but token generation fails.

Token generation succeeds but payment confirmation is delayed.

User tries to generate multiple tokens.

User attempts to reuse an old verification code.

Clinic fee changes after token generation.

Clinic session closes before user arrives.

Doctor becomes unavailable after tokens are issued.

Queue is paused.

Patient is skipped and later recalled.

For the prototype, represent believable states rather than building every production rule.

14. Queue Edge Cases

Consider:

Two staff members generating a token at the same time.

Queue reaching its maximum token capacity.

Online token capacity becoming full.

Walk-in capacity becoming full.

Doctor delay.

Doctor unavailable.

Session starts late.

Session closes early.

Queue paused.

Patient cancellation.

Patient no-show.

Patient skipped.

Patient recalled.

Emergency/priority insertion.

Patient loses internet connection.

Patient app reconnects.

Patient opens an old visit.

Queue advances while the app is closed.

Prototype behavior should be clear and deterministic.

15. Appointment Model

Appointments are OPTIONAL.

Do not position appointments as the main product.

For token-first doctors:

Primary CTA:
GET TOKEN

For doctors that support appointments:

GET TOKEN
BOOK APPOINTMENT

Appointments should only appear when the doctor/clinic supports them.

Appointment flow can be:

Doctor
→ Date
→ Time
→ Patient details
→ Payment/confirmation as supported
→ Appointment
→ Queue/visit tracking

Do not create fake payment functionality if it is not already implemented.

16. Patient Application

The prototype is primarily the patient/user application.

Core screens:

Splash

Login

Register

Guest Access

Home

Location Selection

Clinic/Hospital Listing

Clinic/Hospital Details

Doctor Listing

Doctor Details

Get Token

Token Payment

Token Confirmation

Active Visit / Live Queue

4-Digit Verification Code

Visits

Profile

Edit Profile

Privacy Policy

Terms & Conditions

Contact Us

Delete Profile

Logout confirmation

Bottom navigation:

HOME
VISITS
PROFILE

17. Home

Home should focus on:

current location

changing location

search

nearby clinics/hospitals

doctor discovery

active visit

queue tracking

clear Get Token actions

It should feel more like a consumer marketplace/discovery experience than an admin dashboard.

The experience can take inspiration from consumer platforms such as Swiggy/Zomato in terms of discovery, locality, cards, search, hierarchy, and ease of navigation — but it must NOT copy their visual design.

VisitNow should have its own healthcare identity.

18. UI / Design Direction

The actual VisitNow logo will be provided separately by the user.

The logo is the primary visual identity reference.

Use its:

blue

green accent

white

visual proportions

overall brand feeling

as the basis for the design system.

The user will also provide an AI-generated mobile app reference.

IMPORTANT:

The reference app is ONLY a reference for understanding the intended patient workflow and information architecture.

Do NOT copy the reference UI.

The developer/Claude has creative control over:

layout

component structure

visual hierarchy

typography

spacing

interactions

navigation patterns

visual language

animations

responsive behavior

The final design should be significantly more polished and intentionally designed.

19. Avoid AI-Generated Template Appearance

Do NOT produce the standard Claude/AI-generated SaaS template:

generic sidebar

generic dashboard

three statistic cards

giant rounded cards everywhere

generic blue gradient

generic healthcare landing page

repetitive card grids

predictable Tailwind/shadcn appearance

unnecessary glassmorphism

generic hero section

excessive gradients

template-like layouts

The product should feel custom-built for VisitNow.

The goal is:

"This looks like a real healthcare technology product."

not:

"This looks AI-generated."

20. Design Philosophy

Use:

modern consumer-product thinking

strong information hierarchy

premium but practical visuals

intuitive navigation

responsive layouts

subtle motion

clear states

strong typography

intentional whitespace

distinctive components

healthcare trust

local-market practicality

The interface should be impressive at first glance but never confusing.

"Overwhelming" means impressive and polished, not visually cluttered.

21. Patient UX Principles

The patient should immediately understand:

Which doctor?

Which clinic?

Which session?

What is the current token?

What is my token?

How many patients are ahead?

Is the queue moving?

When should I come?

What do I need to pay?

Has my payment succeeded?

What is my visit verification code?

Do not expose unnecessary internal hospital complexity.

22. Active Visit Screen

This is one of the most important screens.

Example information:

Dr. Suman
Sunrise Clinic

Now Serving:
21

Your Token:
27

Patients Ahead:
5

Estimated Wait:
~25 min

Queue Status:
Moving Normally

Verification Code:
4827

Payment:
Platform Fee — PAID
Clinic Fee — PAY AT HOSPITAL

Message:

"You don't need to stand in the waiting queue."

Important:
Do not claim an exact waiting time unless actual data exists. Prototype estimates may be clearly represented as demo/estimated values.

23. Realistic Demo Data

The final demo should use realistic, real-world-style doctor/clinic information to create a credible experience.

However:

Do not falsely claim that a real doctor/hospital is using VisitNow.

Real names/locations may be used only when legally/ethically appropriate and presented as demonstration information, not endorsements.

The demo data should be structured so it can easily be replaced later.

Do not use obvious placeholder names such as:

John Doe

Test Hospital

Hospital 123

Doctor ABC

The demo should feel realistic.

24. Hospital/Doctor Side

NOT being built in this prototype.

Do not create:

hospital admin panel

receptionist dashboard

doctor dashboard

CRM

staff management

hospital token machine integration

hospital API integrations

However, the patient UI/data model must be designed so these future systems can supply:

doctor availability

clinic information

sessions

token limits

current queue

token fee

appointment support

queue status

priority rules

payment verification

25. Static Prototype Does Not Mean Dead UI

This is a prototype, but it should be interactive.

Use demo/mock data where appropriate.

The prototype should simulate:

queue progression

token generation

payment success

payment failure

active visit

queue updates

cancellation

no-show

doctor delay

queue pause

session closure

notifications/toasts

The underlying production architecture does not need to be implemented now.

26. Prototype Scope

Prioritize:

complete patient journey

token-first flow

realistic payment flow

pay-at-hospital flow

live queue visualization

4-digit visit code

doctor sessions

multiple clinics

priority concept

responsive UI

polished visual design

investor-demo readiness

Do not spend excessive time on:

production payment gateways

production hospital integrations

complex queue optimization

enterprise security architecture

sophisticated prediction algorithms

EMR/HIS integrations

production compliance infrastructure

massive-scale backend architecture

27. Existing Application

Before rebuilding:

Inspect the existing codebase.

Understand the current stack.

Understand routes.

Understand backend/API structure.

Understand Firebase/backend usage already present.

Identify reusable components.

Identify working functionality.

Identify current patient flow.

Identify what should be preserved.

Identify what should be redesigned.

The user explicitly wants a rebuild/rethink with a clearer product vision, but do not blindly destroy useful existing functionality.

Use the existing project as the starting point and evolve it intelligently.

28. State Handling

Important screens should have:

loading

success

error

empty

permission denied

unavailable

no internet

payment processing

payment failed

session closed

queue paused

doctor delayed

token limit reached

The prototype should not crash when an expected state occurs.

29. Product Decisions To Keep Visible

During development, whenever a new problem or uncertainty is discovered, add it to this document.

Use this format:

New Question / Edge Case

Problem

Describe the situation.

Why it matters

Explain the impact.

Options

List possible solutions.

Recommended approach

State the preferred solution.

Prototype implementation

Explain what should happen in this prototype.

Production consideration

Explain what may need to change later.

This document is a living product decision log.

30. Open Questions To Resolve During Development

Examples:

What happens when all tokens are exhausted?

Can a patient cancel a token?

Is the ₹9 platform fee refundable?

What happens if payment succeeds but token creation fails?

How long is a token valid?

How does a patient rejoin after missing their turn?

Can a patient hold a token?

Can a doctor close a queue?

Can a clinic change its token fee after tokens have been issued?

What happens when a doctor changes clinic unexpectedly?

How should emergency patients affect regular queue users?

Can a patient have multiple active visits?

What happens when a patient books tokens for multiple doctors?

How is an appointment inserted into the token queue?

What happens when the queue is paused?

What happens when the patient loses internet?

What happens if the clinic has no current queue data?

How should estimated wait be calculated?

How should the system communicate doctor delays?

What happens to pay-at-hospital users who never pay the clinic fee?

Do not silently invent important business rules. Record them and make a reasonable prototype decision.

31. Investor Demonstration Objective

The prototype should make an investor understand the product in a few minutes.

Ideal demonstration:

Home
→ nearby clinic
→ Dr. Suman
→ evening session
→ live queue
→ Get Token
→ ₹9 platform fee / pay-at-hospital
→ token generated
→ verification code
→ live queue
→ queue moves
→ approaching turn

The investor should understand:

Patient value:
"I don't need to sit at the clinic for the entire waiting period."

Clinic value:
"I can continue using my normal token workflow."

VisitNow value:
"We connect patients to the clinic's live queue digitally."

32. Final Product Definition

VisitNow is:

A token-first digital queue platform for local doctors and clinics that allows patients to remotely obtain a token, pay the required platform fee and optionally the clinic token fee online, receive a visit-specific verification code, track their position in the live queue, and arrive closer to their turn.

Appointments are an optional extension.

The core product is:

DOCTOR
→ CLINIC
→ SESSION
→ QUEUE
→ TOKEN
→ PAYMENT
→ VERIFICATION
→ LIVE QUEUE
→ DOCTOR

33. Current Implementation Priority

Priority 1:
Patient experience

Priority 2:
Token-first workflow

Priority 3:
Payment model

Priority 4:
Active visit/live queue

Priority 5:
Doctor sessions/multiple clinics

Priority 6:
Priority queue concept

Priority 7:
Optional appointments

Priority 8:
Polish and investor demo readiness

Hospital-side operational tooling is future scope.

34. Non-Negotiable Design Principle

The product should look like VisitNow, not like a generated template.

The logo, brand identity, patient workflow, local clinic context, and queue concept should drive the design.

The reference app is inspiration for workflow only.

Creative control belongs to the implementation.

