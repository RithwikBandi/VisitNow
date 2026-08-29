import { PhoneCall, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { ErrorState } from '../../components/ui/ErrorState'
import { QueueRow } from '../../components/staff/QueueRow'
import {
  callNext,
  fetchQueue,
  fetchSession,
  generateToken,
  setDoctorStatus,
} from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import type { DoctorStatus } from '../../lib/types'
import { ApiError } from '../../lib/types'

const DOCTOR_STATUS_OPTIONS: { value: DoctorStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'paused', label: 'Hold queue' },
  { value: 'closed', label: 'Close session' },
]

export function StaffQueueConsolePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const sessionFetcher = useCallback(() => fetchSession(sessionId!), [sessionId])
  const queueFetcher = useCallback(() => fetchQueue(sessionId!), [sessionId])
  const { data: sessionData, error: sessionError, refresh: refreshSession } = usePolling(sessionFetcher, 4_000, sessionId)
  const { data: queueData, refresh: refreshQueue } = usePolling(queueFetcher, 4_000, sessionId)

  const [walkInName, setWalkInName] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [delayInput, setDelayInput] = useState(15)

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

  if (sessionError && !sessionData) return <ErrorState message={sessionError} />
  if (!sessionData) return <div className="h-96 animate-pulse rounded-[var(--radius-lg)] bg-black/5" />

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

  return (
    <div className="flex flex-col gap-6">
      {/* Header: who/where, doctor status controls */}
      <div className="flex flex-col gap-4 rounded-[var(--radius-lg)] border border-black/5 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-600)]">{doctor.specialty}</p>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">{doctor.name}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {clinic.name} · {session.label} · {session.startTime}–{session.endTime}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {DOCTOR_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              disabled={busy}
              onClick={() => runAction(() => setDoctorStatus(session.id, opt.value, opt.value === 'delayed' ? delayInput : undefined))}
              className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40 ${
                session.doctorStatus === opt.value
                  ? 'bg-[var(--color-brand-600)] text-white'
                  : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
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
      </div>

      {/* Current / Next / Call Next */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BigStat label="Current token" value={current?.tokenNumber ?? session.currentToken ?? '—'} />
        <BigStat label="Next patient" value={next?.tokenNumber ?? '—'} />
        <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-black/5 bg-white p-5">
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
      </div>

      {/* Generate walk-in */}
      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-black/5 bg-white p-5 sm:flex-row sm:items-center">
        <p className="shrink-0 text-sm font-bold text-[var(--color-text)]">Generate walk-in token</p>
        <input
          value={walkInName}
          onChange={(e) => setWalkInName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && walkInName.trim()) {
              runAction(() => generateToken(session.id, { source: 'offline', patientName: walkInName.trim() }))
              setWalkInName('')
            }
          }}
          placeholder="Patient name at the counter"
          className="w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] px-3.5 py-2.5 text-sm focus:border-[var(--color-brand-400)] focus:outline-none"
        />
        <Button
          variant="secondary"
          disabled={busy || !walkInName.trim()}
          onClick={() => {
            runAction(() => generateToken(session.id, { source: 'offline', patientName: walkInName.trim() }))
            setWalkInName('')
          }}
        >
          <Plus size={15} aria-hidden="true" />
          Generate
        </Button>
      </div>

      {actionError && <ErrorState message={actionError} />}

      {/* Active queue — call order, this is what staff act on */}
      <div className="rounded-[var(--radius-lg)] border border-black/5 bg-white">
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-3.5">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
            Live queue ({active.length})
          </h2>
        </div>
        {active.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[var(--color-text-faint)]">No one waiting right now.</p>
        ) : (
          <div className="divide-y divide-black/5">
            {active.map((entry) => (
              <QueueRow key={entry.id} entry={entry} assignedBy={doctor.name} disabled={busy} onChanged={refreshAll} onError={setActionError} />
            ))}
          </div>
        )}
      </div>

      {/* History — already resolved, kept visible per the brief's §10
          (nothing is ever deleted) but visually secondary. */}
      {history.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-black/5 bg-white/60">
          <div className="border-b border-black/5 px-5 py-3">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-faint)]">
              Earlier today ({history.length})
            </h2>
          </div>
          <div className="divide-y divide-black/5 opacity-80">
            {history.map((entry) => (
              <QueueRow key={entry.id} entry={entry} assignedBy={doctor.name} disabled={busy} onChanged={refreshAll} onError={setActionError} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BigStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-black/5 bg-white p-5 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
      <p key={value} className="animate-count-pulse mt-1 font-display text-4xl font-semibold text-[var(--color-brand-700)]">
        {value}
      </p>
    </div>
  )
}
