/**
 * The signature live-number primitive (docs/DESIGN.md §4) — an
 * odometer/departure-board digit roll used only where a number
 * represents genuine live queue movement (now-serving, patients-ahead,
 * the token reveal on confirmation). Every other number on the site
 * (landing-page stats, prices) renders as plain text — this motion is
 * meaningful specifically because it's rare.
 *
 * Each digit column stacks 0-9 and translates by percentage of its own
 * height, so no JS measurement is needed. Reduced-motion is handled
 * globally in index.css (a stylesheet !important beats a non-important
 * inline transition), not duplicated here with a matchMedia check.
 */
function Digit({ n }: { n: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-top">
      <span
        className="absolute inset-x-0 top-0 flex flex-col"
        style={{ transform: `translateY(-${n * 10}%)`, transition: 'transform 380ms var(--ease-out)' }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="flex h-[1em] items-center justify-center leading-none">
            {i}
          </span>
        ))}
      </span>
    </span>
  )
}

export function SplitFlapNumber({
  value,
  minDigits = 1,
  className = '',
}: {
  value: number
  minDigits?: number
  className?: string
}) {
  const safe = Math.max(0, Math.floor(value))
  const digits = safe.toString().padStart(minDigits, '0').split('')
  return (
    <span className={`relative inline-flex ${className}`}>
      <span className="tabular-nums inline-flex" aria-hidden="true">
        {digits.map((ch, i) => (
          <Digit key={i} n={Number(ch)} />
        ))}
      </span>
      <span className="sr-only">{safe}</span>
    </span>
  )
}
