import { useMemo, useState } from 'react'
import { Filter, RotateCcw, Search } from 'lucide-react'
import { catalog, SLOTS } from '../../data/catalog'
import type { Capability, Product, Slot } from '../../types'
import { findingsFor } from '../../engine/compat'
import { removeProduct, selectProduct, setQty, isSelected } from '../../engine/config'
import { effectivePrice } from '../../engine/cost'
import { getProduct } from '../../data/catalog'
import { useStore } from '../../state/store'
import { Drawer, Switch, cx, inputCls, SectionTitle } from '../kit'
import { Inspector } from '../Inspector'
import { ProductCard } from '../ProductCard'
import { SLOT_NOUN } from '../labels'
import { Button } from '../kit'

const CATS: { id: string; label: string; slots: Slot[] }[] = [
  { id: 'platform', label: 'Platforms', slots: ['platform'] }, { id: 'uwb', label: 'UWB', slots: ['uwb-anchor', 'uwb-tag'] }, { id: 'processor', label: 'Processors', slots: ['processor'] },
  { id: 'controller', label: 'Controllers', slots: ['controller'] }, { id: 'camera', label: 'Cameras', slots: ['camera'] }, { id: 'imu', label: 'IMU', slots: ['imu'] },
  { id: 'odometry', label: 'Odometry', slots: ['odometry'] }, { id: 'sensors', label: 'Other sensors', slots: ['extra-sensor', 'power-monitor'] }, { id: 'power', label: 'Power', slots: ['battery', 'charger', 'converter'] },
  { id: 'motor', label: 'Drivers & safety', slots: ['motor-driver', 'safety', 'wiring'] }, { id: 'upgrade', label: 'Upgrades', slots: ['upgrade'] }, { id: 'prohibited', label: 'Prohibited', slots: ['prohibited'] },
]
const INCLUDES: { cap: Capability; label: string }[] = [
  { cap: 'motor-driver', label: 'Motor driver' }, { cap: 'imu', label: 'IMU' }, { cap: 'encoders', label: 'Encoders' }, { cap: 'camera', label: 'Camera' }, { cap: 'power-monitor', label: 'Power monitor' },
  { cap: 'battery-holder', label: 'Battery holder' }, { cap: 'linux-computer', label: 'Linux computer' },
]
type Sort = 'relevance' | 'price-asc' | 'price-desc' | 'integration' | 'expand' | 'complete' | 'quality'

export function Explorer() {
  const { active, update, findings, inspect, inspectId } = useStore()
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [brand, setBrand] = useState('all')
  const [maxPrice, setMaxPrice] = useState(300)
  const [unknown, setUnknown] = useState(true)
  const [caps, setCaps] = useState<Capability[]>([])
  const [minExp, setMinExp] = useState(0)
  const [fits, setFits] = useState(false)
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState<Sort>('relevance')
  const [open, setOpen] = useState(false)

  const brands = useMemo(() => [...new Set(catalog.map((p) => p.brand))].sort(), [])
  const platform = getProduct(active.items.find((i) => i.slot === 'platform')?.productId ?? '')
  const proc = getProduct(active.items.find((i) => i.slot === 'processor')?.productId ?? '')

  const fitsCfg = (p: Product): boolean => {
    if (p.plat && proc?.proc) return p.plat.hostSupport.includes('any') || p.plat.hostSupport.includes(proc.proc.family)
    if (p.proc && platform?.plat) return platform.plat.hostSupport.includes('any') || platform.plat.hostSupport.includes(p.proc.family)
    if (p.cam && proc?.proc) return proc.proc.cameraSupport[p.cam.iface] !== 'no'
    if (p.proc && active.items.some((i) => i.slot === 'camera')) { const cam = getProduct(active.items.find((i) => i.slot === 'camera')!.productId); return !cam?.cam || p.proc.cameraSupport[cam.cam.iface] !== 'no' }
    if (p.uwb) { const other = active.items.find((i) => i.slot === 'uwb-anchor' || i.slot === 'uwb-tag'); const o = other && getProduct(other.productId); return !o?.uwb || o.uwb.family === p.uwb.family }
    return true
  }
  const price = (p: Product) => effectivePrice(p, active).price
  const results = useMemo(() => {
    const slots = cat === 'all' ? null : CATS.find((c) => c.id === cat)!.slots
    const list = catalog.filter((p) => {
      if (slots && !p.slots.some((s) => slots.includes(s))) return false
      if (q) { const hay = `${p.name} ${p.brand} ${p.variant ?? ''} ${p.summary} ${p.tags.join(' ')} ${p.specs.map((s) => s.join(' ')).join(' ')}`.toLowerCase(); if (!q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false }
      if (brand !== 'all' && p.brand !== brand) return false
      const pr = price(p)
      if (pr == null ? !unknown : pr > maxPrice) return false
      if (caps.length && !caps.every((c) => p.provides.includes(c))) return false
      if (minExp && (p.ratings?.expandability ?? 0) < minExp) return false
      if (status !== 'all' && p.raptorStatus !== status) return false
      if (fits && !fitsCfg(p)) return false
      return true
    })
    const val = (p: Product, k: 'integration' | 'expandability' | 'docs') => p.ratings?.[k === 'expandability' ? 'expandability' : k] ?? 0
    return list.sort((a, b) => {
      switch (sort) {
        case 'price-asc': return (price(a) ?? Infinity) - (price(b) ?? Infinity)
        case 'price-desc': return (price(b) ?? -1) - (price(a) ?? -1)
        case 'integration': return val(b, 'integration') - val(a, 'integration')
        case 'expand': return val(b, 'expandability') - val(a, 'expandability')
        case 'complete': return b.provides.length - a.provides.length
        case 'quality': return (val(b, 'integration') + val(b, 'docs') + val(b, 'expandability')) - (val(a, 'integration') + val(a, 'docs') + val(a, 'expandability'))
        default: return 0
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, q, brand, maxPrice, unknown, caps, minExp, status, fits, sort, active.priceOverrides, active.settings.priceBasis, active.items])
  const inspected = inspectId ? getProduct(inspectId) : undefined
  const reset = () => { setCat('all'); setQ(''); setBrand('all'); setMaxPrice(300); setUnknown(true); setCaps([]); setMinExp(0); setFits(false); setStatus('all'); setSort('relevance') }
  const slotFor = (p: Product): Slot => { const s = CATS.find((c) => c.id === cat)?.slots.find((x) => p.slots.includes(x)); return s ?? p.slots[0] }

  return (
    <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start" aria-label="Filters">
        <div className="card space-y-4 p-4">
          <div className="flex items-center justify-between"><span className="label flex items-center gap-1.5"><Filter size={12} /> Filters</span><button onClick={reset} className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent"><RotateCcw size={11} /> Reset</button></div>
          <div className="relative"><Search size={14} className="absolute left-2.5 top-2.5 text-faint" /><input aria-label="Search components" className={cx(inputCls, 'pl-8')} placeholder="Search name, spec, tag…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <label className="block text-xs font-medium text-muted">Manufacturer<select className={cx(inputCls, 'mt-1')} value={brand} onChange={(e) => setBrand(e.target.value)}><option value="all">All manufacturers</option>{brands.map((b) => <option key={b}>{b}</option>)}</select></label>
          <label className="block text-xs font-medium text-muted"><span className="flex justify-between"><span>Max price</span><b className="num text-fg">${maxPrice}</b></span><input type="range" min={5} max={600} step={5} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="mt-1 w-full accent-[var(--accent)]" /></label>
          <div className="flex items-center justify-between text-xs text-muted"><span>Include price-unknown items</span><Switch checked={unknown} onChange={setUnknown} label="Include unknown prices" /></div>
          <div><div className="mb-1.5 text-xs font-medium text-muted">Includes (kit contents)</div><div className="flex flex-wrap gap-1.5">{INCLUDES.map((i) => <button key={i.cap} aria-pressed={caps.includes(i.cap)} onClick={() => setCaps(caps.includes(i.cap) ? caps.filter((c) => c !== i.cap) : [...caps, i.cap])} className={cx('rounded-full border px-2 py-0.5 text-[11px]', caps.includes(i.cap) ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:text-fg')}>{i.label}</button>)}</div></div>
          <label className="block text-xs font-medium text-muted">Min. expandability<select className={cx(inputCls, 'mt-1')} value={minExp} onChange={(e) => setMinExp(Number(e.target.value))}><option value={0}>Any</option>{[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5 or better</option>)}</select></label>
          <label className="block text-xs font-medium text-muted">RAPTOR suitability<select className={cx(inputCls, 'mt-1')} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Any</option><option value="compatible-in-principle">Compatible in principle</option><option value="requires-firmware">Requires firmware</option><option value="requires-validation">Requires validation</option><option value="insufficient-info">Insufficient info</option><option value="prohibited">Prohibited</option></select></label>
          <div className="flex items-center justify-between text-xs text-muted"><span>Only parts that fit my current selection</span><Switch checked={fits} onChange={setFits} label="Compatible with current selection" /></div>
        </div>
      </aside>

      <section className="min-w-0">
        <SectionTitle sub={`${results.length} of ${catalog.length} researched components`} right={<select aria-label="Sort results" className={cx(inputCls, 'w-48')} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="relevance">Sort: catalog order</option><option value="price-asc">Price: low → high</option><option value="price-desc">Price: high → low</option><option value="quality">Overall engineering rating</option><option value="integration">Easiest integration</option><option value="expand">Expandability</option><option value="complete">Completeness (kit contents)</option></select>}>Component Explorer</SectionTitle>
        <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Categories">
          {[{ id: 'all', label: 'All', slots: [] as Slot[] }, ...CATS].map((c) => <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={cx('rounded-full border px-3 py-1 text-xs font-medium transition', cat === c.id ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:text-fg', c.id === 'prohibited' && 'border-bad/40 text-bad')}>{c.label}</button>)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((p) => {
            const slot = slotFor(p)
            const sel = active.items.find((i) => i.slot === slot && i.productId === p.id)
            const ro = p.slots.includes('prohibited')
            return <ProductCard key={p.id} product={p} slot={slot} readOnly={ro} selected={!!sel || (!ro && isSelected(active, slot, p.id))} qty={sel?.qty} findings={sel ? findingsFor(findings, p) : []}
              hint={SLOTS[slot] && !ro ? SLOT_NOUN[slot] : undefined} onInspect={() => { inspect(p.id); setOpen(true) }}
              onToggle={() => update((c) => (sel ? removeProduct(c, slot, p.id) : selectProduct(c, slot, p.id)), `${sel ? 'Removed' : 'Selected'} ${p.name}`)} onQty={(n) => update((c) => setQty(c, slot, p.id, n))} />
          })}
        </div>
        {results.length === 0 && <div className="card mt-4 grid place-items-center gap-3 p-10 text-center text-sm text-muted">No components match these filters.<Button onClick={reset}>Reset filters</Button></div>}
      </section>
      <Drawer open={open && !!inspected} onClose={() => setOpen(false)} title="Component details" width={520}><Inspector product={inspected} /></Drawer>
    </div>
  )
}
