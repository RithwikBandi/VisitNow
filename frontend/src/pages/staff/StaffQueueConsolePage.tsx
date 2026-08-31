import { ArrowLeft, PhoneCall, Plus, Search } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/ErrorState'
import { QueueRow } from '../../components/staff/QueueRow'
import { hasPermission } from '../../components/staff/RequirePermission'
import { TokenSlip } from '../../components/staff/TokenSlip'
import {
  callNext,
  fetchQueue,
  fetchSession,
  generateToken,
  setDoctorStatus,
  verifyCode,
} from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import type { DoctorStatus, QueueEntry } from '../../lib/types'
import { ApiError } from '../../lib/types'

const DOCTOR_STATUS_OPTIONS: { value: DoctorStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'paused', label: 'Hold queue' },
  { value: 'closed', label: 'Close session' },
]

export function StaffQueueConsolePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  // This console is reached from two different homes (a doctor's own
  // /doctor/sessions/:id and a hospital staffer's /staff/sessions/:id).
  // StaffLayout gives staff a persistent "Sessions" nav tab as their way
  // back; DoctorLayout has no nav at all beyond the logo, so a doctor
  // landed here with no visible way back to their dashboard. One
  // location-aware back link fixes both, rather than passing a prop
  // through two different parent routes.
  const location = useLocation()
  const isDoctorView = location.pathname.startsWith('/doctor')
  const backTo = isDoctorView ? '/doctor' : '/staff'
  const backLabel = isDoctorView ? 'Back to dashboard' : 'Back to sessions'
  const sessionFetcher = useCallback(() => fetchSession(sessionId!), [sessionId])
  const queueFetcher = useCallback(() => fetchQueue(sessionId!), [sessionId])
  const { data: sessionData, error: sessionError, refresh: refreshSession } = usePolling(sessionFetcher, 4_000, sessionId)
  const { data: queueData, refresh: refreshQueue } = usePolling(queueFetcher, 4_000, sessionId)

  const [walkInName, setWalkInName] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [delayInput, setDelayInput] = useState(15)
  const [newSlip, setNewSlip] = useState<QueueEntry | null>(null)

  const [codeInput, setCodeInput] = useState('')
  const [codeResult, setCodeResult] = useState<QueueEntry | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [checkingCode, setCheckingCode] = useState(false)

  const refreshAll = () => {
    refreshSession()
    refreshQueue()
  }

  const runAction = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      refreshAll()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const generateWalkIn = async () => {
    const name = walkInName.trim()
    if (!name || !sessionData) return
    setBusy(true)
    setActionError(null)
    try {
      const { entry } = await generateToken(sessionData.session.id, { source: 'offline', patientName: name })
      setWalkInName('')
      setNewSlip(entry)
      refreshAll()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const lookupCode = async () => {
    if (!sessionData || !/^\d{4}$/.test(codeInput)) return
    setCheckingCode(true)
    setCodeError(null)
    setCodeResult(null)
    try {
      const { entry } = await verifyCode(sessionData.session.id, codeInput)
      setCodeResult(entry)
    } catch (err) {
      setCodeError(err instanceof ApiError ? err.message : 'No token found with that code.')
    } finally {
      setCheckingCode(false)
    }
  }

  if (sessionError && !sessionData) return <ErrorState message={sessionError} />
  if (!sessionData) return <div className="h-96 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-sunken)]" />

  const { session, doctor, clinic } = sessionData
  const entries = queueData?.entries ?? []
  const waiting = entries.filter((e) => e.status === 'waiting')
  const current = entries.find((e) => e.status === 'called' || e.status === 'in_progress')
  const next = waiting[0]

  // The backend orders entries by call priority (emergency > priority >
  // regular), which is exactly right for "who's next" — but applied to
  // *every* entry, it also drags already-completed patients out of their
  // natural order the moment any later token gets a priority flag, which
  // reads as broken rather than as a queue. Active entries (still
  // relevant to "what happens next") keep the backend's call order;
  // finished ones are just a log, so they read best in the order they
  // actually happened.
  const ACTIVE: readonly string[] = ['waiting', 'called', 'in_progress']
  const active = entries.filter((e) => ACTIVE.includes(e.status))
  const history = entries.filter((e) => !ACTIVE.includes(e.status)).sort((a, b) => a.tokenNumber - b.tokenNumber)

  // Same "hide what you can't do" courtesy as StaffLayout's nav — a
  // Sunrise payments-desk account (payments/refunds only) shouldn't see
  // Call Next / doctor-status controls it would just get a 403 clicking,
  // and a doctor viewing their own queue has 'queue' but never 'tokens'
  // (they don't generate walk-ins or verify codes — that's reception's
  // job). Backend enforces the real boundary either way.
  const canRunQueue = hasPermission('queue')
  const canManageTokens = hasPermission('tokens')

  return (
    <div className="flex flex-col gap-6">
      <Link
        to={backTo}
        className="press-scale flex w-fit items-center gap-1.5 text-[13px] font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] print:hidden"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        {backLabel}
      </Link>

      {/* Header: who/where, doctor status controls */}
      <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-600)]">{doctor.specialty}</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">{doctor.name}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {clinic.name} · {session.label} · {session.startTime}–{session.endTime}
          </p>
        </div>

        {canRunQueue && (
        <div className="flex flex-wrap items-center gap-2">
          {DOCTOR_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              disabled={busy}
              onClick={() => runAction(() => setDoctorStatus(session.id, opt.value, opt.value === 'delayed' ? delayInput : undefined))}
              className={`press-scale rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${
                session.doctorStatus === opt.value
                  ? 'bg-[var(--color-brand-600)] text-white'
                  : 'bg-[var(--color-surface-sunken)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {session.doctorStatus === 'delayed' && (
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-faint)]">
              <input
                type="number"
                min={1}
                value={delayInput}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value) || 1)
                  setDelayInput(v)
                  runAction(() => setDoctorStatus(session.id, 'delayed', v))
                }}
                className="w-14 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-2 py-1 text-center"
              />
              min
            </label>
          )}
        </div>
        )}
      </div>

      {/* Current / Next / Call Next — the stats stay visible either way
          (useful to glance at even without the queue module), only the
          action button is gated. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BigStat label="Current token" value={current?.tokenNumber ?? session.currentToken ?? '—'} />
        <BigStat label="Next patient" value={next?.tokenNumber ?? '—'} />
        {canRunQueue && (
        <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <Button
            size="lg"
            className="w-full"
            disabled={busy || !next || session.doctorStatus === 'paused' || session.doctorStatus === 'closed'}
            onClick={() => runAction(() => callNext(session.id))}
          >
            <PhoneCall size={18} aria-hidden="true" />
            Call Next
          </Button>
        </div>
        )}
      </div>

      {/* Two front-desk operational tools: generate a walk-in token
          (unified queue — see generateToken's own docstring, this writes
          into the exact same queue an online token does), and look a
          patient up by the 4-digit code they show on their phone. Both
          are exactly the "token generation and verification" scope
          reception's role is meant to be, per the multi-tenant auth
          plan — no revenue/analytics access from this page. */}
      {canManageTokens && (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-sm font-bold text-[var(--color-text)]">Generate walk-in token</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateWalkIn()}
              placeholder="Patient name at the counter"
              className="w-full min-w-0 rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-400)] focus:outline-none"
            />
            <Button variant="secondary" disabled={busy || !walkInName.trim()} onClick={generateWalkIn}>
              <Plus size={15} aria-hidden="true" />
              Generate
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-sm font-bold text-[var(--color-text)]">Verify a patient's code</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                setCodeError(null)
                setCodeResult(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && lookupCode()}
              placeholder="4-digit code"
              inputMode="numeric"
              className="tabular-nums w-full min-w-0 rounded-[var(--radius-btn)] border border-[var(--color-border-strong)] px-3.5 py-2.5 text-sm tracking-widest focus:border-[var(--color-brand-400)] focus:outline-none"
            />
            <Button variant="secondary" disabled={checkingCode || !/^\d{4}$/.test(codeInput)} onClick={lookupCode}>
              <Search size={15} aria-hidden="true" />
              Look up
            </Button>
          </div>
          {codeError && <p className="text-[13px] text-[var(--color-danger)]">{codeError}</p>}
          {codeResult && (
            <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent-50)] px-3.5 py-2.5">
              <div>
                <p className="text-sm font-bold text-[var(--color-text)]">
                  Token #{codeResult.tokenNumber} — {codeResult.patientName}
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)]">Matches this session</p>
              </div>
              <Badge tone={codeResult.status === 'waiting' ? 'neutral' : 'success'}>{codeResult.status.replace('_', ' ')}</Badge>
            </div>
          )}
        </div>
      </div>
      )}

      {actionError && <ErrorState message={actionError} />}

      {/* Active queue — call order, this is what staff act on */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3.5">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
            Live queue ({active.length})
          </h2>
        </div>
        {active.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[var(--color-text-faint)]">No one waiting right now.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {active.map((entry) => (
              <QueueRow key={entry.id} entry={entry} assignedBy={doctor.name} disabled={busy} onChanged={refreshAll} onError={setActionError} />
            ))}
          </div>
        )}
      </div>

      {/* History — already resolved, kept visible per the brief's §10
          (nothing is ever deleted) but visually secondary. */}
      {history.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/60">
          <div className="border-b border-[var(--color-border)] px-5 py-3">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
              Earlier today ({history.length})
            </h2>
          </div>
          <div className="divide-y divide-[var(--color-border)] opacity-80">
            {history.map((entry) => (
              <QueueRow key={entry.id} entry={entry} assignedBy={doctor.name} disabled={busy} onChanged={refreshAll} onError={setActionError} />
            ))}
          </div>
        </div>
      )}

      {newSlip && <TokenSlip entry={newSlip} doctor={doctor} clinic={clinic} onClose={() => setNewSlip(null)} />}
    </div>
  )
}

function BigStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
      <p key={value} className="tabular-nums animate-count-pulse mt-1 font-display text-4xl font-semibold text-[var(--color-brand-700)]">
        {value}
      </p>
    </div>
  )
}
