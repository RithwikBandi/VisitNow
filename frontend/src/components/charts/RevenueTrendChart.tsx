import { useState } from 'react'

interface Point {
  date: string
  value: number
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const W = 600
const H = 180
const PAD_X = 16
const PAD_TOP = 16
const PAD_BOTTOM = 26

/**
 * A day-by-day revenue line, built as plain SVG rather than pulling in a
 * charting library for two small charts — self-contained, matches the
 * rest of this app's "no generic AI-template UI" custom-component
 * convention (SplitFlapNumber, TicketCard). Deliberately: straight
 * segments, not a smoothed curve (a curve between two real points implies
 * values that were never actually collected); one hue only, no dual
 * y-axis, recessive dashed gridlines behind the data, a hover tooltip
 * per point instead of cramming every number onto the chart at once.
 */
export function RevenueTrendChart({ data, formatValue }: { data: Point[]; formatValue: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null)

  if (data.length === 0) {
    return <div className="flex h-[180px] items-center justify-center text-sm text-[var(--color-text-faint)]">No data yet.</div>
  }

  const max = Math.max(...data.map((d) => d.value), 1)
  const innerW = W - PAD_X * 2
  const innerH = H - PAD_TOP - PAD_BOTTOM
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0
  const points = data.map((d, i) => ({
    x: PAD_X + (data.length > 1 ? i * stepX : innerW / 2),
    y: PAD_TOP + innerH - (d.value / max) * innerH,
    ...d,
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PAD_TOP + innerH} L ${points[0].x} ${PAD_TOP + innerH} Z`
  const labelEvery = Math.max(1, Math.ceil(points.length / 6))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Revenue trend by day">
      <defs>
        <linearGradient id="revenueTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-300)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-brand-300)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => {
        const y = PAD_TOP + innerH * t
        return <line key={t} x1={PAD_X} x2={W - PAD_X} y1={y} y2={y} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="3 4" />
      })}
      <path d={areaPath} fill="url(#revenueTrendFill)" stroke="none" />
      <path d={linePath} fill="none" stroke="var(--color-brand-600)" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover((h) => (h === i ? null : h))}>
          <circle cx={p.x} cy={p.y} r={2.5} fill="var(--color-brand-600)" />
          <circle cx={p.x} cy={p.y} r={9} fill="transparent" />
          {i % labelEvery === 0 && (
            <text x={p.x} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--color-text-faint)" fontWeight={600}>
              {formatDate(p.date)}
            </text>
          )}
        </g>
      ))}
      {hover != null &&
        (() => {
          const p = points[hover]
          const boxW = 78
          const boxX = Math.min(Math.max(p.x - boxW / 2, PAD_X), W - PAD_X - boxW)
          const boxY = Math.max(p.y - 38, 2)
          return (
            <g pointerEvents="none">
              <line x1={p.x} x2={p.x} y1={PAD_TOP} y2={PAD_TOP + innerH} stroke="var(--color-border-strong)" strokeWidth={1} />
              <rect x={boxX} y={boxY} width={boxW} height={28} rx={6} fill="var(--color-text)" />
              <text x={boxX + boxW / 2} y={boxY + 12.5} textAnchor="middle" fontSize="9.5" fontWeight={700} fill="white">
                {formatValue(p.value)}
              </text>
              <text x={boxX + boxW / 2} y={boxY + 23} textAnchor="middle" fontSize="8.5" fill="rgba(255,255,255,0.72)">
                {formatDate(p.date)}
              </text>
            </g>
          )
        })()}
    </svg>
  )
}
