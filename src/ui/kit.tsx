import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

type Tone = 'neutral' | 'accent' | 'violet' | 'good' | 'warn' | 'bad' | 'info'
const TONE: Record<Tone, string> = {
  neutral: 'bg-surface3 text-muted border-line', accent: 'bg-accent-soft text-accent border-accent/30', violet: 'bg-violet-soft text-violet border-violet/30',
  good: 'bg-good-soft text-good border-good/30', warn: 'bg-warn-soft text-warn border-warn/30', bad: 'bg-bad-soft text-bad border-bad/30', info: 'bg-info-soft text-info border-info/30',
}
export function Badge({ tone = 'neutral', children, className, title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return <span title={title} className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap', TONE[tone], className)}>{children}</span>
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export function Button({ variant = 'secondary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg' }) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-accent text-accent-ink hover:brightness-110 border-transparent font-semibold',
    secondary: 'bg-surface2 hover:bg-surface3 border-line text-fg', ghost: 'bg-transparent hover:bg-surface2 border-transparent text-muted hover:text-fg',
    danger: 'bg-bad-soft hover:brightness-125 border-bad/30 text-bad',
  }
  const s = { sm: 'h-7 px-2.5 text-xs gap-1', md: 'h-9 px-3.5 text-sm gap-1.5', lg: 'h-11 px-5 text-sm gap-2' }[size]
  return <button type="button" {...p} className={cx('inline-flex items-center justify-center rounded-lg border transition active:scale-[.98] select-none', v[variant], s, className)} />
}

export function IconButton({ label, children, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" aria-label={label} title={label} {...p} className={cx('inline-grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface2 text-muted transition hover:bg-surface3 hover:text-fg', className)}>{children}</button>
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; className?: string }) {
  return (
    <div role="tablist" className={cx('inline-flex rounded-lg border border-line bg-surface2 p-0.5', className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx('rounded-md px-3 py-1 text-xs font-medium transition', value === o.value ? 'bg-surface text-fg shadow' : 'text-muted hover:text-fg')}>{o.label}</button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cx('relative h-5 w-9 rounded-full border transition', checked ? 'border-accent bg-accent' : 'border-line2 bg-surface3')}>
      <span className={cx('absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
    </button>
  )
}

export function Drawer({ open, onClose, children, title, width = 480 }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; width?: number }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="no-print fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className="anim-slide absolute right-0 top-0 flex h-full max-w-full flex-col border-l border-line bg-surface shadow-2xl" style={{ width }}>
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="label">{title ?? 'Details'}</span>
          <IconButton label="Close" onClick={onClose} className="h-8 w-8"><X size={16} /></IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="no-print fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cx('anim-in card relative max-h-[88vh] w-full overflow-y-auto p-5', wide ? 'max-w-3xl' : 'max-w-md')}>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-base font-semibold">{title}</h3><IconButton label="Close" onClick={onClose} className="h-8 w-8"><X size={16} /></IconButton></div>
        {children}
      </div>
    </div>
  )
}

export function Tip({ text, children }: { text: string; children: ReactNode }) {
  return <span className="group relative inline-flex">{children}<span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1.5 hidden w-max max-w-[240px] -translate-x-1/2 rounded-md border border-line2 bg-surface3 px-2 py-1 text-[11px] leading-snug text-fg shadow-xl group-hover:block group-focus-within:block">{text}</span></span>
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted">{label}</span>{children}{hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}</label>
}
export const inputCls = 'h-9 w-full rounded-lg border border-line bg-surface2 px-3 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none'

export function NumberInput({ value, onChange, min = 0, max, step = 1, className, 'aria-label': aria }: { value: number | null; onChange: (v: number | null) => void; min?: number; max?: number; step?: number; className?: string; 'aria-label'?: string }) {
  const [text, setText] = useState(value == null ? '' : String(value))
  const last = useRef(value)
  useEffect(() => { if (last.current !== value) { last.current = value; setText(value == null ? '' : String(value)) } }, [value])
  return (
    <input aria-label={aria} className={cx(inputCls, 'num', className)} inputMode="decimal" value={text} min={min} max={max} step={step}
      onChange={(e) => {
        setText(e.target.value)
        const v = e.target.value.trim() === '' ? null : Number(e.target.value)
        if (v === null || (!Number.isNaN(v) && v >= min && (max == null || v <= max))) { last.current = v; onChange(v) }
      }} />
  )
}

export function Stat({ label, value, sub, tone, onClick }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; onClick?: () => void }) {
  const col = tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : tone === 'good' ? 'text-good' : tone === 'accent' ? 'text-accent' : 'text-fg'
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} className={cx('card card-hover p-4 text-left', onClick && 'hover:bg-surface2')}>
      <div className="label">{label}</div>
      <div className={cx('num mt-1.5 text-2xl font-semibold tracking-tight', col)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Tag>
  )
}

export const SectionTitle = ({ children, right, sub }: { children: ReactNode; right?: ReactNode; sub?: ReactNode }) => (
  <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight">{children}</h2>{sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}</div>{right}</div>
)

export const Empty = ({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) => (
  <div className="card grid place-items-center gap-2 p-8 text-center"><div className="text-faint">{icon}</div><div className="font-medium">{title}</div><div className="max-w-md text-sm text-muted">{children}</div></div>
)
