import { Check, ExternalLink, GitCompareArrows, Info, Minus, Plus, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { Finding, Product, Slot } from '../types'
import { SLOTS } from '../data/catalog'
import { effectivePrice, money } from '../engine/cost'
import { useStore } from '../state/store'
import { Badge, Button, cx } from './kit'
import { PRICE_LABEL, RAPTOR_LABEL } from './labels'
import { ProductImage } from './ProductImage'

export function Rating({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted" title={`${label}: ${value}/5`}>
      <span className="w-[74px] shrink-0">{label}</span>
      <span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((i) => <span key={i} className={cx('h-1.5 w-3.5 rounded-sm', i <= value ? 'bg-accent' : 'bg-surface3')} />)}</span>
    </div>
  )
}

export function PriceTag({ p, big }: { p: Product; big?: boolean }) {
  const { active } = useStore()
  const { price, source } = effectivePrice(p, active)
  const st = source === 'override' ? PRICE_LABEL.manual : PRICE_LABEL[p.priceStatus]
  return (
    <div className="text-right">
      <div className={cx('num font-semibold', big ? 'text-2xl' : 'text-lg', price == null && 'text-warn')}>{price == null ? 'Price TBD' : money(price)}</div>
      <div className="flex items-center justify-end gap-1 text-[10px] text-muted">
        <span className={cx('inline-block h-1.5 w-1.5 rounded-full', st.tone === 'good' ? 'bg-good' : st.tone === 'warn' ? 'bg-warn' : st.tone === 'accent' ? 'bg-accent' : 'bg-bad')} />
        {source === 'observed' ? 'Observed listing' : st.label}
      </div>
    </div>
  )
}

interface Props {
  product: Product
  slot: Slot
  selected: boolean
  qty?: number
  hint?: string
  findings?: Finding[]
  onToggle: () => void
  onQty?: (q: number) => void
  onInspect: () => void
  inspecting?: boolean
  readOnly?: boolean
}

export function ProductCard({ product: p, slot, selected, qty = 1, hint, findings = [], onToggle, onQty, onInspect, inspecting, readOnly }: Props) {
  const { compare, toggleCompare } = useStore()
  const meta = SLOTS[slot]
  const st = RAPTOR_LABEL[p.raptorStatus]
  const crit = findings.filter((f) => f.severity === 'critical').length
  const warn = findings.filter((f) => f.severity !== 'critical' && f.severity !== 'optional').length
  const multiQty = slot === 'uwb-anchor' || slot === 'uwb-tag' || !meta.single
  return (
    <article
      className={cx('card card-hover group relative flex flex-col overflow-hidden transition', selected && 'border-accent ring-1 ring-accent/60', inspecting && !selected && 'border-violet/60', crit > 0 && selected && 'border-bad ring-bad/50')}
      aria-label={p.name}>
      {selected && <div className="absolute left-0 top-0 z-10 flex items-center gap-1 rounded-br-lg bg-accent px-2 py-1 text-[11px] font-semibold text-accent-ink"><Check size={12} /> Selected{multiQty && qty > 1 ? ` ×${qty}` : ''}</div>}
      <button onClick={onInspect} className="block text-left" aria-label={`Inspect ${p.name}`}>
        <ProductImage product={p} className="h-36 w-full border-b border-line" />
      </button>
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-faint">{p.brand}</div>
            <button onClick={onInspect} className="text-left text-[15px] font-semibold leading-snug hover:text-accent">{p.name}</button>
            {p.variant && <div className="mt-0.5 text-[11px] leading-snug text-muted">{p.variant}</div>}
          </div>
          <PriceTag p={p} />
        </div>
        <p className="text-[13px] leading-snug text-muted">{p.summary}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={st.tone}>{st.label}</Badge>
          {p.stock && <Badge tone="bad">{p.stock}</Badge>}
          {hint && <Badge tone="accent">{hint}</Badge>}
          {crit > 0 && <Badge tone="bad">{crit} critical</Badge>}
          {warn > 0 && <Badge tone="warn">{warn} to check</Badge>}
          {p.tags.includes('approval-required') && <Badge tone="warn">Needs approval</Badge>}
        </div>
        <ul className="space-y-1">
          {p.pros.slice(0, 3).map((x) => <li key={x} className="flex gap-1.5 text-[12px] leading-snug"><ThumbsUp size={12} className="mt-0.5 shrink-0 text-good" />{x}</li>)}
          {p.cons.slice(0, 3).map((x) => <li key={x} className="flex gap-1.5 text-[12px] leading-snug text-muted"><ThumbsDown size={12} className="mt-0.5 shrink-0 text-warn" />{x}</li>)}
        </ul>
        {p.ratings && <div className="space-y-1 border-t border-line pt-2"><Rating label="Integration" value={p.ratings.integration} /><Rating label="Documentation" value={p.ratings.docs} /><Rating label="Expandability" value={p.ratings.expandability} /></div>}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {!readOnly && (
            <Button variant={selected ? 'secondary' : 'primary'} size="sm" onClick={onToggle} aria-pressed={selected} className="min-w-[88px]">
              {selected ? 'Remove' : meta.single ? 'Select' : 'Add'}
            </Button>
          )}
          {!readOnly && selected && multiQty && onQty && (
            <span className="inline-flex items-center rounded-lg border border-line bg-surface2">
              <button aria-label="Decrease quantity" className="grid h-7 w-7 place-items-center text-muted hover:text-fg" onClick={() => onQty(qty - 1)}><Minus size={13} /></button>
              <span className="num w-6 text-center text-xs font-semibold">{qty}</span>
              <button aria-label="Increase quantity" className="grid h-7 w-7 place-items-center text-muted hover:text-fg" onClick={() => onQty(qty + 1)}><Plus size={13} /></button>
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={onInspect}><Info size={13} /> Details</Button>
          <Button variant="ghost" size="sm" onClick={() => toggleCompare(p.id)} aria-pressed={compare.includes(p.id)} className={cx(compare.includes(p.id) && 'text-violet')} title="Add to Comparison Lab (max 4)"><GitCompareArrows size={13} /></Button>
          {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:text-accent" title="Official product / source page"><ExternalLink size={13} /> Source</a>}
        </div>
      </div>
    </article>
  )
}
