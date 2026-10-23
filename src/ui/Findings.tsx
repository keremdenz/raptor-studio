import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Finding, Severity } from '../types'
import { SEVERITY_LABEL, SEVERITY_ORDER } from '../engine/compat'
import { go } from '../state/store'
import { Badge, cx } from './kit'
import { SEV_TONE } from './labels'
import { stepForSlot } from './BudgetViz'

const BASIS = { official: 'Official requirement', engineering: 'Engineering judgement', data: 'Data gap' } as const

export function FindingsList({ findings, hideOptional, max, inspect }: { findings: Finding[]; hideOptional?: boolean; max?: number; inspect?: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<Severity | 'all'>('all')
  const list = findings.filter((f) => (!hideOptional || f.severity !== 'optional') && (filter === 'all' || f.severity === filter))
  const shown = max ? list.slice(0, max) : list
  const counts = SEVERITY_ORDER.map((s) => [s, findings.filter((f) => f.severity === s).length] as const)
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <button onClick={() => setFilter('all')} className={cx('rounded-full border px-2.5 py-0.5 text-xs', filter === 'all' ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:text-fg')}>All {findings.length}</button>
        {counts.map(([s, n]) => n > 0 && <button key={s} onClick={() => setFilter(s)} className={cx('rounded-full border px-2.5 py-0.5 text-xs', filter === s ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:text-fg')}>{SEVERITY_LABEL[s]} {n}</button>)}
      </div>
      {shown.length === 0 && <div className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-muted">Nothing to report for this view.</div>}
      <ul className="space-y-1.5">
        {shown.map((f) => {
          const isOpen = open === f.id
          return (
            <li key={f.id} className="rounded-lg border border-line bg-surface2">
              <button className="flex w-full items-start gap-2 px-3 py-2 text-left" onClick={() => setOpen(isOpen ? null : f.id)} aria-expanded={isOpen}>
                {isOpen ? <ChevronDown size={14} className="mt-1 shrink-0 text-faint" /> : <ChevronRight size={14} className="mt-1 shrink-0 text-faint" />}
                <span className="min-w-0 flex-1"><span className="mb-0.5 flex flex-wrap gap-1.5"><Badge tone={SEV_TONE[f.severity]}>{SEVERITY_LABEL[f.severity]}</Badge><Badge>{BASIS[f.basis]}</Badge></span><span className="block text-sm font-medium leading-snug">{f.title}</span></span>
              </button>
              {isOpen && (
                <div className="anim-in border-t border-line px-3 py-2.5 pl-8 text-sm text-muted">
                  {f.detail}
                  <div className="mt-2 flex gap-3 text-xs">
                    {f.slot && f.slot !== 'prohibited' && <button className="text-accent hover:underline" onClick={() => go('configurator', stepForSlot(f.slot))}>Fix in configurator →</button>}
                    {f.productIds?.[0] && inspect && <button className="text-accent hover:underline" onClick={() => inspect(f.productIds![0])}>Inspect part</button>}
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {max && list.length > max && <div className="mt-2 text-xs text-muted">+ {list.length - max} more</div>}
    </div>
  )
}
