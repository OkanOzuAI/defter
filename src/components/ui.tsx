import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  block?: boolean
}

export function Button({ variant = 'primary', block, className, type, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cx(
        'inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-[15px] font-medium transition-colors disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-accent-fg active:opacity-80',
        variant === 'secondary' && 'border border-border bg-surface-2 text-text active:bg-border',
        variant === 'ghost' && 'text-muted active:bg-surface-2',
        variant === 'danger' && 'border border-danger text-danger active:bg-surface-2',
        block && 'w-full',
        className,
      )}
      {...rest}
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cx('rounded-xl border border-border bg-surface p-4', className)}>
      {children}
    </section>
  )
}

type FieldProps = {
  label: string
  hint?: string
  error?: string
  optional?: string
  children: ReactNode
}

export function Field({ label, hint, error, optional, children }: FieldProps) {
  // Hint and error sit outside the <label> so the control's name is just the label text.
  return (
    <div>
      <label className="block">
        <span className="mb-1.5 flex items-baseline justify-between gap-2 text-sm text-muted">
          <span>{label}</span>
          {optional && <span className="text-xs">{optional}</span>}
        </span>
        {children}
      </label>
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </div>
  )
}

const controlClass =
  'block min-h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-text placeholder:text-muted/60 focus:border-accent focus:outline-none'

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(controlClass, className)} {...rest} />
}

/** Text input with a decimal keypad and no native spinners; parse the value with parseNumber. */
export function NumberInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={cx(controlClass, className)}
      {...rest}
    />
  )
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(controlClass, className)} {...rest} />
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-danger/50 px-3 py-2.5 text-sm text-danger">
      {children}
    </p>
  )
}

type MessageProps = { title: string; body?: string; action?: ReactNode }

/** Empty, loading and error states: says what is going on and what to do next. */
export function Message({ title, body, action }: MessageProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-base font-medium">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action}
    </div>
  )
}

export function FullScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full flex-col items-center justify-center">{children}</div>
}
