import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react'

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  onClick?: () => void | Promise<void>
  kind?: 'primary' | 'secondary' | 'danger' | 'quiet'
  busy?: boolean
  selected?: boolean
  onError?: (error: unknown) => void
}

export function Button({ children, onClick, kind = 'primary', busy = false,
  selected, onError, disabled, ...props }: ButtonProps) {
  const [pending, setPending] = useState(false)
  const lock = useRef(false), alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])
  const run = async () => {
    if (lock.current || disabled || busy || !onClick) return
    lock.current = true
    try {
      const result = onClick()
      if (result && typeof result.then === 'function') {
        setPending(true)
        await result
      }
    } catch (error) {
      if (onError) onError(error)
      else console.error(error)
    } finally {
      lock.current = false
      if (alive.current) setPending(false)
    }
  }
  return <button type="button" {...props}
    className={`dd-button dd-button--${kind} ${props.className ?? ''}`}
    aria-pressed={selected} aria-busy={busy || pending}
    disabled={disabled || busy || pending || !onClick} onClick={() => void run()}>
    {pending || busy ? <span aria-hidden="true">◌ </span> : null}
    {children}{pending || busy ? ' · 처리 중' : ''}
  </button>
}

export function IconButton({ label, children, ...props }: ButtonProps & { label: string }) {
  return <Button {...props} kind={props.kind ?? 'quiet'} aria-label={label}
    title={props.title ?? label} className={`dd-icon-button ${props.className ?? ''}`}>
    {children}
  </Button>
}
