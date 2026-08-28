# VisitNow

A prototype for a token-first, digital queue-management platform for hospitals and clinics.

**Get your token remotely. Track your queue. Arrive closer to your turn.**

This is a demonstration prototype, not a production system — see `backend/src/types/index.ts`
for exactly which corners were deliberately cut and why.

## The core idea

One doctor session (a doctor, at one clinic, for one time window) owns exactly one queue.
Every token that queue ever hands out — whether a patient got it remotely through the app, a
receptionist typed it in for a walk-in, or it came from a converted appointment — becomes one
entry in that same queue, ordered by one rule: emergency, then staff-assigned priority, then
first-come-first-served. There is no separate "online queue" and "offline queue."

```
Patient (remote)  ─┐
Walk-in (reception)─┼──▶  ONE QUEUE  ──▶  Hospital calls next  ──▶  Patient's screen updates live
Appointment         ─┘
```

## Project structure

```
VisitNow/
├── backend/    Express + TypeScript, in-memory store, the queue engine
│   └── src/
│       ├── types/       the data model (start here)
│       ├── store/       store.ts (data), queueEngine.ts (all the rules), seed.ts (demo data)
│       └── routes/      the REST API
│
└── frontend/   React + TypeScript + Vite + Tailwind
    └── src/
        ├── lib/                api client + types (mirrors the backend)
        ├── hooks/usePolling.ts short-interval polling — the "feels live" mechanism
        ├── components/patient/ + pages/patient/   the patient experience
        └── components/staff/   + pages/staff/     the hospital operations console
```

## Running it locally

Two servers, both with hot reload.

```bash
# Terminal 1
cd backend
npm install
npm run dev          # http://localhost:4000

# Terminal 2
cd frontend
npm install
npm run dev           # http://localhost:5173
```

Demo data seeds automatically on backend startup — one session (Dr. Ashwin Kumar's morning
slot at Sunrise Multispecialty Clinic) starts already mid-queue with a realistic mix of
completed/waiting/priority tokens, so there's something to look at immediately.

To reset the demo back to its starting state without restarting the server (handy mid-demo):

```bash
curl -X POST http://localhost:4000/api/demo/reset
```

## What to look at

- **Patient**: `http://localhost:5173/` — browse today's doctors, open a live session, get a
  token, land on `/queue/:id` to track it.
- **Staff**: `http://localhost:5173/staff` — pick a session, watch the live queue, press
  **Call Next** and watch the patient's own tab update within a few seconds.

## Status

Phase 1 (data model + queue engine) and the first pass of Phase 2/3 (patient experience +
hospital console) are built and working end to end. Appointments exist in the API but don't
have a frontend yet. See the product brief for the full phase breakdown.
