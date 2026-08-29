/**
 * A scalable, flat SVG rendition of the VisitNow mark — a bold two-tone
 * "V", blue on the left stroke and green on the right, in the same
 * spirit as the source logo's blue-downstroke/green-checkmark split.
 * Deliberately simplified from the source artwork's glossy 3D render and
 * checkmark notch detail: an icon this small (header, splash, favicon)
 * needs to read instantly at 24-96px, where fine notch detail would
 * just look like noise. The two-color V carries the identity; the
 * literal checkmark texture is a large-format asset detail, not a UI
 * icon requirement.
 */
export function VisitNowMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <line x1="22" y1="18" x2="50" y2="82" stroke="var(--color-brand-500)" strokeWidth="16" strokeLinecap="round" />
      <line x1="78" y1="18" x2="50" y2="82" stroke="var(--color-accent-500)" strokeWidth="16" strokeLinecap="round" />
    </svg>
  )
}
