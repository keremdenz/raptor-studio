import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Search, ShieldAlert, X } from 'lucide-react'
import { catalog, getProduct, SLOTS, STEPS } from '../../data/catalog'
import type { Product, Slot } from '../../types'
import { findingsFor } from '../../engine/compat'
import { selectProduct, removeProduct, setQty } from '../../engine/config'
import { buildContext } from '../../engine/context'
import { CAP_LABEL, CAP_SLOT, effectivePrice, money } from '../../engine/cost'
import { suggestSavings } from '../../engine/optimizer'
import { go, useStore } from '../../state/store'
import { Architecture } from '../Architecture'
import { BudgetBar } from '../BudgetViz'
import { FindingsList } from '../Findings'
import { Inspector } from '../Inspector'
import { Badge, Button, Drawer, SectionTitle, cx, inputCls } from '../kit'
import { GoalCard, GoalPicker, PowerPanel, StreamEstimator } from '../Panels'
import { ProductCard } from '../ProductCard'
import { SLOT_NOUN } from '../labels'

type Sort = 'default' | 'price-asc' | 'price-desc' | 'expand' | 'integration'

function SlotSection({ slot, onInspect }: { slot: Slot; onInspect: (id: string) => void }) {
  const { active, update, findings, inspectId } = useStore()
  const meta = SLOTS[slot]
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('default')
  const ctx = useMemo(() => buildContext(active), [active])
  const prohibited = slot === 'prohibited'
  const items = catalog.filter((p) => p.slots.includes(slot) && (q === '' || `${p.name} ${p.brand} ${p.variant ?? ''} ${p.summary}`.toLowerCase().includes(q.toLowerCase())))
  const price = (p: Product) => effectivePrice(p, active).price ?? Infinity
  const sorted = [...items].sort((a, b) => sort === 'price-asc' ? price(a) - price(b) : sort === 'price-desc' ? (price(b) === Infinity ? -1 : price(b)) - (price(a) === Infinity ? -1 : price(a)) : sort === 'expand' ? (b.ratings?.expandability ?? 0) - (a.ratings?.expandability ?? 0) : sort === 'integration' ? (b.ratings?.integration ?? 0) - (a.ratings?.integration ?? 0) : 0)
  const selected = ctx.bySlot[slot]
  const kitCaps = Object.entries(CAP_SLOT).filter(([, s]) => s === slot).map(([c]) => c as keyof typeof CAP_LABEL).filter((c) => ctx.kit.has(c))
  const kitHint = kitCaps.length ? `Kit already includes ${CAP_LABEL[kitCaps[0]]} — optional` : undefined

  return (
    <section className={cx('mb-8', prohibited && 'rounded-2xl border border-bad/40 bg-bad-soft/40 p-4')} aria-label={meta.label}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-2"><h3 className="text-base font-semibold">{prohibited ? 'Not compliant with current project restrictions' : meta.label}</h3>
            {!prohibited && <Badge tone={meta.required ? 'accent' : 'neutral'}>{meta.required ? 'Required' : 'Optional'}</Badge>}
            {!prohibited && <Badge>{meta.single ? 'Choose one' : 'Multiple allowed'}</Badge>}</div>
          <p className="mt-0.5 text-xs text-muted">{prohibited ? 'LiDAR, GNSS and additional ranging devices are not allowed. These are shown for research only and cannot be added to a configuration.' : meta.hint}</p>
        </div>
        {!prohibited && items.length > 4 && (
          <div className="flex gap-2">
            <div className="relative"><Search size={13} className="absolute left-2.5 top-3 text-faint" /><input aria-label={`Search ${meta.label}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className={cx(inputCls, 'w-36 pl-8')} /></div>
            <select aria-label="Sort" className={cx(inputCls, 'w-36')} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="default">Default order</option><option value="price-asc">Price: low → high</option><option value="price-desc">Price: high → low</option><option value="integration">Easiest integration</option><option value="expand">Most expandable</option></select>
          </div>
        )}
      </div>

      {kitCaps.length > 0 && !prohibited && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-violet/40 bg-violet-soft p-3 text-sm">
          <Check size={16} className="mt-0.5 shrink-0 text-violet" />
          <div><b>Already included in kit — $0 incremental cost.</b> {ctx.kit.get(kitCaps[0])!.product.name} provides {kitCaps.map((c) => CAP_LABEL[c]).join(', ')}.
            {ctx.kit.get(kitCaps[0])!.unverified && <span className="text-muted"> Unverified: {ctx.kit.get(kitCaps[0])!.unverified}</span>}
            <div className="text-xs text-muted">You may still pick a replacement below; it will be shown as an optional upgrade, not a mandatory cost.</div></div>
        </div>
      )}
      {selected.length > 0 && !meta.single && (
        <div className="mb-3 flex flex-wrap gap-1.5">{selected.map(({ product, item }) => <span key={product.id} className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-soft py-0.5 pl-2.5 pr-1 text-xs text-accent">{product.name} ×{item.qty}<button aria-label={`Remove ${product.name}`} onClick={() => update((c) => removeProduct(c, slot, product.id), `Removed ${product.name}`)} className="grid h-4 w-4 place-items-center rounded-full hover:bg-accent/20"><X size={11} /></button></span>)}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
        {sorted.map((p) => {
          const sel = ctx.bySlot[slot].find((x) => x.product.id === p.id)
          return (
            <ProductCard key={p.id} product={p} slot={slot} readOnly={prohibited} selected={!!sel} qty={sel?.item.qty} hint={kitHint && !sel ? kitHint : undefined}
              findings={sel ? findingsFor(findings, p) : []} inspecting={inspectId === p.id}
              onInspect={() => onInspect(p.id)}
              onToggle={() => update((c) => (sel ? removeProduct(c, slot, p.id) : selectProduct(c, slot, p.id)), `${sel ? 'Removed' : 'Selected'} ${p.name} (${SLOT_NOUN[slot]})`)}
              onQty={(n) => update((c) => setQty(c, slot, p.id, n), `${p.name} quantity → ${Math.max(1, n)}`)} />
          )
        })}
        {sorted.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No matching products.</div>}
      </div>
    </section>
  )
}

function ReviewStep() {
  const { active, cost, findings, update, inspect } = useStore()
  const sug = useMemo(() => (cost.overBudget || cost.tight || cost.unknownCount ? suggestSavings(active) : []), [active, cost.overBudget, cost.tight, cost.unknownCount])
  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Budget</h3><Button size="sm" onClick={() => go('bom')}>Open full BOM</Button></div>
        <BudgetBar cost={cost} budget={active.settings.budget} />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Known parts', money(cost.subtotal)], ['Shipping/tax', money(cost.shippingTax)], ['Projected total', money(cost.total)], [cost.remaining >= 0 ? 'Remaining' : 'Over by', money(Math.abs(cost.remaining))]].map(([k, v]) => <div key={k} className="rounded-lg bg-surface2 p-3"><div className="label">{k}</div><div className="num mt-0.5 text-lg font-semibold">{v}</div></div>)}
        </div>
        {cost.unknownCount > 0 && <p className="mt-3 text-sm text-bad">Total is incomplete — missing prices: {cost.unknownLabels.join(', ')}.{cost.hintSubtotal > cost.subtotal && <span className="text-muted"> With hint prices adopted the known-parts subtotal would be about {money(cost.hintSubtotal)}.</span>}</p>}
        {cost.designMissing.length > 0 && <p className="mt-2 text-sm text-warn">Design incomplete — missing: {cost.designMissing.join(', ')}.</p>}
      </div>
      {sug.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold">Cost-saving alternatives</h3><p className="mb-3 text-xs text-muted">Suggestions only — nothing is replaced until you apply it. Alternatives that would add a critical incompatibility are excluded.</p>
          <ul className="divide-y divide-line">{sug.map((s) => (
            <li key={s.slot + s.to.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
              <div className="min-w-0 flex-1"><b>{s.from.name}</b> → <b className="text-accent">{s.to.name}</b> <span className="text-muted">({SLOT_NOUN[s.slot]})</span><div className="text-xs text-muted">{s.note}</div></div>
              <span className="num font-semibold text-good">−{money(s.saving)}</span>
              <Button size="sm" onClick={() => inspect(s.to.id)}>Inspect</Button>
              <Button size="sm" variant="primary" onClick={() => update((c) => selectProduct(c, s.slot, s.to.id, active.items.find((i) => i.slot === s.slot)?.qty), `Swapped ${s.from.name} → ${s.to.name}`)}>Apply</Button>
            </li>))}</ul>
        </div>
      )}
      <div className="card p-4"><h3 className="mb-3 font-semibold">Architecture of this configuration</h3><Architecture /></div>
      <div className="card p-4"><h3 className="mb-3 font-semibold">Compatibility & missing parts</h3><FindingsList findings={findings} inspect={inspect} /></div>
    </div>
  )
}

export function Configurator({ arg }: { arg?: string }) {
  const { active, inspect, inspectId, findings, cost } = useStore()
  const idx = Math.max(0, STEPS.findIndex((s) => s.id === arg))
  const step = STEPS[idx]
  const [drawer, setDrawer] = useState(false)
  const inspected = inspectId ? getProduct(inspectId) : undefined
  const stepFindings = findings.filter((f) => f.slot && step.slots.includes(f.slot) && f.severity !== 'optional')
  const stepCount = (i: number) => STEPS[i].slots.reduce((n, s) => n + active.items.filter((it) => it.slot === s).length, 0)
  const showInspect = (id: string | null) => { inspect(id); if (id && window.matchMedia('(max-width: 1279px)').matches) setDrawer(true) }

  return (
    <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_420px]">
      <nav aria-label="Configuration steps" className="no-print border-line lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] lg:overflow-y-auto lg:border-r">
        <ol className="flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-0.5 lg:p-3">
          {STEPS.map((s, i) => {
            const n = i < 9 ? stepCount(i) : 0
            const bad = findings.some((f) => f.slot && s.slots.includes(f.slot) && (f.severity === 'critical' || f.severity === 'missing'))
            return (
              <li key={s.id} className="shrink-0">
                <button onClick={() => go('configurator', s.id)} aria-current={i === idx ? 'step' : undefined}
                  className={cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition', i === idx ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface2 hover:text-fg')}>
                  <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold', i === idx ? 'border-accent' : n > 0 ? 'border-good bg-good-soft text-good' : 'border-line2')}>{n > 0 && i !== idx ? <Check size={12} /> : s.n}</span>
                  <span className="whitespace-nowrap">{s.short}</span>
                  {bad && i < 9 && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-warn" title="Open issues in this step" />}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <main className="min-w-0 px-4 pb-24 pt-4 sm:px-6">
        <div className="sticky top-0 z-20 -mx-4 mb-4 lg:top-16 border-b border-line bg-bg/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 text-xs">
            <span className="num"><b className="text-sm">{money(cost.total)}</b> <span className="text-muted">projected of {money(active.settings.budget, 0)}</span></span>
            <span className={cx('num', cost.remaining < 0 ? 'font-semibold text-bad' : 'text-muted')}>{cost.remaining >= 0 ? `${money(cost.remaining)} remaining` : `${money(-cost.remaining)} over budget`}{cost.unknownCount > 0 && <span className="ml-2 text-bad">· incomplete: {cost.unknownCount} unpriced</span>}{cost.designMissing.length > 0 && <span className="ml-2 text-warn">· {cost.designMissing.length} mandatory missing</span>}</span>
          </div>
          <BudgetBar cost={cost} budget={active.settings.budget} compact />
        </div>
        <SectionTitle sub={step.blurb} right={<div className="flex gap-2">
          <Button size="sm" disabled={idx === 0} onClick={() => go('configurator', STEPS[idx - 1].id)}><ArrowLeft size={14} /> Back</Button>
          <Button size="sm" variant="primary" disabled={idx === STEPS.length - 1} onClick={() => go('configurator', STEPS[idx + 1].id)}>Next <ArrowRight size={14} /></Button></div>}>
          <span className="mr-2 text-faint">{step.n}.</span>{step.title}
        </SectionTitle>

        {stepFindings.length > 0 && step.id !== 'review' && (
          <div className="mb-6 rounded-xl border border-line bg-surface p-3"><div className="label mb-2 flex items-center gap-1.5"><ShieldAlert size={13} /> Compatibility for this step</div><FindingsList findings={stepFindings} inspect={(id) => showInspect(id)} max={4} /></div>
        )}

        {step.id === 'uwb' && (
          <div className="mb-6 rounded-xl border border-line bg-surface p-3 text-sm text-muted">
            <b className="text-fg">Default architecture: 4 fixed anchors + 1 robot tag.</b> Anchors and tag may be different models of the same protocol family; their prices are counted separately. Vendor accuracy numbers are ranging claims, not proof of &lt;20 cm robot localization.
          </div>
        )}
        {step.id === 'review' ? <ReviewStep /> : step.slots.filter((s) => s !== 'prohibited').map((s) => <SlotSection key={s} slot={s} onInspect={showInspect} />)}
        {step.slots.includes('prohibited') && <SlotSection slot="prohibited" onInspect={showInspect} />}

        {step.id === 'camera' && <div className="mt-2"><StreamEstimator /></div>}
        {step.id === 'power' && <div className="mt-2"><PowerPanel /></div>}
        {step.id === 'future' && (
          <div className="space-y-4">
            <div><h3 className="mb-2 text-base font-semibold">Future goals</h3><GoalPicker /></div>
            {active.goals.length === 0 && <div className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-muted">Choose goals above to see what your current hardware supports and what it lacks.</div>}
            <div className="grid gap-4 xl:grid-cols-2">{active.goals.map((g) => <GoalCard key={g} id={g} />)}</div>
          </div>
        )}
        <div className="mt-6 flex justify-between"><Button disabled={idx === 0} onClick={() => go('configurator', STEPS[idx - 1].id)}><ArrowLeft size={14} /> Back</Button>
          {idx < STEPS.length - 1 ? <Button variant="primary" onClick={() => go('configurator', STEPS[idx + 1].id)}>Next: {STEPS[idx + 1].short} <ArrowRight size={14} /></Button> : <Button variant="primary" onClick={() => go('bom')}>Open bill of materials <ArrowRight size={14} /></Button>}</div>
      </main>

      <aside aria-label="Product inspector" className="no-print hidden border-l border-line xl:sticky xl:top-16 xl:block xl:h-[calc(100vh-64px)] xl:overflow-y-auto"><Inspector product={inspected} compact /></aside>
      <Drawer open={drawer && !!inspected} onClose={() => setDrawer(false)} title="Product inspector"><Inspector product={inspected} compact /></Drawer>
    </div>
  )
}
