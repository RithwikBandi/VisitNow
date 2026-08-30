import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-btn)] font-display font-bold tracking-tight transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-500)] disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap active:scale-[0.96]'

const variants: Record<Variant, string> = {
  primary: 'bg-[var(--color-brand-600)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-brand-700)]',
  secondary:
    'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:border-[var(--color-brand-400)] hover:text-[var(--color-brand-700)]',
  ghost: 'bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-700)]',
  danger: 'bg-transparent text-[var(--color-danger)] border border-[var(--color-danger)]/30 hover:bg-[var(--color-danger-bg)]',
}

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3.5 py-2',
  md: 'text-[15px] px-5 py-2.5',
  lg: 'text-base px-7 py-3.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', ...props },
  ref,
) {
  return <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
})
