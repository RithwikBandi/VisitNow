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
const H = 160
const PAD_X = 16
const PAD_TOP = 12
const PAD_BOTTOM = 26

/** Token volume by day — same plain-SVG, one-hue, no-dual-axis approach
 * as RevenueTrendChart (see its own doc comment), a bar chart rather than
 * a line because token count is a discrete daily total, not a continuous
 * quantity moving between days. */
export function TokensPerDayChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null)

  if (data.length === 0) {
    return <div className="flex h-[160px] items-center justify-center text-sm text-[var(--color-text-faint)]">No data yet.</div>
  }

  const max = Math.max(...data.map((d) => d.value), 1)
  const innerW = W - PAD_X * 2
  const innerH = H - PAD_TOP - PAD_BOTTOM
  const slot = innerW / data.length
  const barW = Math.min(36, slot * 0.55)
  const labelEvery = Math.max(1, Math.ceil(data.length / 6))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Tokens issued by day">
      {[0, 0.5, 1].map((t) => {
        const y = PAD_TOP + innerH * t
        return <line key={t} x1={PAD_X} x2={W - PAD_X} y1={y} y2={y} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="3 4" />
      })}
      {data.map((d, i) => {
        const cx = PAD_X + slot * i + slot / 2
        const barH = (d.value / max) * innerH
        const y = PAD_TOP + innerH - barH
        const active = hover === i
        return (
          <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover((h) => (h === i ? null : h))}>
            <rect x={cx - slot / 2} y={PAD_TOP} width={slot} height={innerH} fill="transparent" />
            <rect x={cx - barW / 2} y={y} width={barW} height={Math.max(barH, 1)} rx={3} fill={active ? 'var(--color-brand-700)' : 'var(--color-brand-400)'} />
            {i % labelEvery === 0 && (
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--color-text-faint)" fontWeight={600}>
                {formatDate(d.date)}
              </text>
            )}
            {active && (
              <g pointerEvents="none">
                <rect x={cx - 24} y={Math.max(y - 24, 2)} width={48} height={20} rx={5} fill="var(--color-text)" />
                <text x={cx} y={Math.max(y - 24, 2) + 13.5} textAnchor="middle" fontSize="10.5" fontWeight={700} fill="white">
                  {d.value}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
