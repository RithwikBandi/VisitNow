import type { ReactNode } from 'react'

/**
 * The signature container (docs/DESIGN.md §4) — reserved for actual
 * token/visit surfaces (Active Visit, Token Confirmed, Home's active-
 * token summary). Never used for ordinary list rows; diluting the
 * ticket motif onto every card is exactly the "excessive rounded
 * rectangles" pattern the rebuild brief warns against.
 *
 * `stub` is the compact header (doctor · clinic · session); children
 * is the body below the perforation, almost always built around a
 * SplitFlapNumber. `bg-[var(--color-bg)]` must be the ticket's actual
 * background context for the punched-notch illusion (`.ticket-
 * perforation`'s canvas-colored circles) to read correctly — don't use
 * this component floating over a different-colored section.
 */
export function TicketCard({
  stub,
  children,
  className = '',
}: {
  stub: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`ticket-card ${className}`}>
      <div className="px-6 pb-4 pt-5">{stub}</div>
      <div className="ticket-perforation mx-6" />
      <div className="px-6 py-8">{children}</div>
    </div>
  )
}
