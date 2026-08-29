import { ArrowRight } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { DoctorStatusLine } from '../../components/ui/Badge'
import { ErrorState } from '../../components/ui/ErrorState'
import { fetchQueue, fetchSession, generateToken } from '../../lib/api'
import { usePolling } from '../../hooks/usePolling'
import { ApiError } from '../../lib/types'

export function SessionQueuePage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const sessionFetcher = useCallback(() => fetchSession(sessionId!), [sessionId])
  const queueFetcher = useCallback(() => fetchQueue(sessionId!), [sessionId])
  const { data: sessionData, loading: sessionLoading, error: sessionError } = usePolling(sessionFetcher, 5_000)
  const { data: queueData } = usePolling(queueFetcher, 5_000)

  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (sessionLoading && !sessionData) {
    return <div className="mt-8 h-64 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-border)]/40" />
  }
  if (sessionError && !sessionData) return <ErrorState message={sessionError} />
  if (!sessionData) return null

  const { session, doctor, clinic } = sessionData
  const waitingCount = queueData?.entries.filter((e) => e.status === 'waiting').length ?? 0

  const canGetToken = session.doctorStatus !== 'closed'

  const submit = async () => {
    if (!name.trim()) {
      setFormError('Enter your name to get a token.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const { entry } = await generateToken(session.id, { source: 'online', patientName: name.trim() })
      navigate(`/queue/${entry.id}`)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="animate-rise-in mx-auto flex max-w-2xl flex-col gap-8 pt-4">
      <div>
        <div className="relative h-36 w-full overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-border)] sm:h-48">
          {clinic.photoUrl && <img src={clinic.photoUrl} alt="" className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
          <p className="absolute bottom-3 left-4 text-[13px] font-semibold text-white">
            {clinic.name} · {clinic.location}
          </p>
        </div>

        <div className="-mt-9 flex items-end gap-3.5 px-3 sm:-mt-11">
          <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-[3px] border-[var(--color-bg)] bg-[var(--color-border)] shadow-[var(--shadow-sm)] sm:h-[88px] sm:w-[88px]">
            {doctor.photoUrl && <img src={doctor.photoUrl} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="pb-1">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-brand-600)]">{doctor.specialty}</p>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--color-text)] sm:text-3xl">{doctor.name}</h1>
          </div>
        </div>

        <div className="mt-3 px-1">
          <p className="text-sm text-[var(--color-text-muted)]">
            {session.label} · {session.startTime}–{session.endTime}
          </p>
          <div className="mt-2">
            <DoctorStatusLine status={session.doctorStatus} delayMinutes={session.delayMinutes} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatBlock label="Now serving" value={session.isQueueOpen ? (session.currentToken ?? '—') : '—'} />
        <StatBlock label="Waiting" value={session.isQueueOpen ? waitingCount : '—'} />
        <StatBlock label="Avg. per patient" value={`~${session.avgConsultMinutes} min`} className="col-span-2 sm:col-span-1" />
      </div>

      {!session.isQueueOpen && session.doctorStatus !== 'closed' && (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-brand-50)] px-4 py-3 text-sm text-[var(--color-brand-700)]">
          This session opens at {session.startTime}. You can still get a token now to hold your place.
        </p>
      )}

      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <h2 className="font-display text-xl font-semibold text-[var(--color-text)]">Get your token</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          No need to visit the clinic to join the queue — enter your name and we'll hold your place.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Your full name"
            disabled={!canGetToken || submitting}
            className="w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-4 py-3 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-brand-400)] focus:outline-none disabled:opacity-50"
          />
          <Button size="lg" onClick={submit} disabled={!canGetToken || submitting} className="shrink-0">
            {submitting ? 'Getting your token…' : 'Get Token'}
            <ArrowRight size={17} aria-hidden="true" />
          </Button>
        </div>
        {formError && <p className="mt-2 text-sm text-[var(--color-danger)]">{formError}</p>}
        {!canGetToken && <p className="mt-2 text-sm text-[var(--color-text-faint)]">This session is closed for today.</p>}
      </div>
    </div>
  )
}

function StatBlock({ label, value, className = '' }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-[var(--color-text)]">{value}</p>
    </div>
  )
}
