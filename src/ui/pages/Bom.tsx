import { useState } from 'react'
import { Copy, Download, FileJson, FileSpreadsheet, Link2, Minus, Plus, Printer, Sparkles, Trash2 } from 'lucide-react'
import { GROUPS } from '../../data/catalog'
import { getProduct } from '../../data/catalog'
import type { BomLine, Config, PurchasePriority } from '../../types'
import { setQty } from '../../engine/config'
import { effectivePrice, money, totalStatus } from '../../engine/cost'
import { bomToCsv, configToJson, download } from '../../engine/exporters'
import { shareUrl } from '../../engine/share'
import { go, useStore } from '../../state/store'
import { BudgetBar } from '../BudgetViz'
import { Badge, Button, Empty, Field, NumberInput, SectionTitle, Tip, cx, inputCls } from '../kit'
import { PRIORITY_LABEL, PROC_STATES } from '../labels'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function ExportButtons({ cfg }: { cfg: Config }) {
  const { cost, setNotice } = useStore()
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => download(`raptor-bom-${slug(cfg.name)}.csv`, bomToCsv(cost), 'text/csv')}><FileSpreadsheet size={14} /> CSV</Button>
      <Button size="sm" onClick={() => download(`raptor-config-${slug(cfg.name)}.json`, configToJson(cfg), 'application/json')}><FileJson size={14} /> JSON</Button>
      <Button size="sm" onClick={() => go('report')}><Printer size={14} /> Report / PDF</Button>
      <Button size="sm" onClick={async () => {
        const url = await shareUrl(cfg)
        try { await navigator.clipboard.writeText(url); setNotice({ kind: 'good', text: `Share link copied (${url.length} characters). Teammates who open it get a copy of this configuration.` }) } catch { window.prompt('Copy this share link:', url) }
      }}><Link2 size={14} /> Share link</Button>
    </div>
  )
}

export function Bom() {
  const { active, cost, update, setNotice } = useStore()
  const st = totalStatus(cost)
  const [custom, setCustom] = useState({ label: '', category: 'Additional electronics', qty: 1, price: null as number | null, required: true })
  const s = active.settings
  const setS = (patch: Partial<typeof s>) => update((c) => ({ ...c, settings: { ...c.settings, ...patch } }))
  const byGroup = [...GROUPS, 'Prohibited'].map((g) => ({ g, lines: cost.lines.filter((l) => l.category === g) })).filter((x) => x.lines.length)
  const drift = cost.lines.filter((l) => { const p = l.productId ? getProduct(l.productId) : undefined; return l.kind === 'purchase' && p?.observed && p.price != null && p.observed.price > p.price * 1.1 })
  const dup = cost.lines.filter((l) => l.duplicate)
  const hintable = cost.lines.filter((l) => l.kind === 'purchase' && l.ext == null && l.productId && getProduct(l.productId)?.priceHint)
  const byPri = (['buy-now', 'before-integration', 'optional', 'research'] as PurchasePriority[]).map((k) => ({ k, sum: cost.lines.filter((l) => l.kind !== 'included' && l.priority === k).reduce((a, l) => a + (l.ext ?? 0), 0), n: cost.lines.filter((l) => l.kind !== 'included' && l.priority === k).length }))
  const setPrice = (l: BomLine, v: number | null) => l.productId && update((c) => ({ ...c, priceOverrides: { ...c.priceOverrides, [l.productId!]: v } }), `Manual price for ${l.label}`)
  const qtyOf = (l: BomLine, d: number) => update((c) => { const items = c.items.filter((i) => i.productId === l.productId); return items.length ? setQty(c, items[0].slot, l.productId!, items[0].qty + d) : c })

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <SectionTitle sub={`${active.name} · generated automatically from the configuration`} right={<ExportButtons cfg={active} />}>Bill of Materials</SectionTitle>
      <div className={cx('mb-4 rounded-xl border p-4', st.tone === 'ok' ? 'border-good/40 bg-good-soft' : st.tone === 'warn' ? 'border-warn/40 bg-warn-soft' : 'border-bad/40 bg-bad-soft')}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="text-sm font-semibold">{st.label}</div><div className="num text-sm">Projected total <b className="text-lg">{money(cost.total)}</b> of {money(s.budget)} · {cost.remaining >= 0 ? `${money(cost.remaining)} remaining` : <b className="text-bad">{money(-cost.remaining)} over budget</b>}</div></div>
        {cost.unknownCount > 0 && <div className="mt-1 text-xs">Unpriced: {cost.unknownLabels.join(', ')}. These are <b>not</b> counted as $0.</div>}
        {cost.designMissing.length > 0 && <div className="mt-1 text-xs">Missing mandatory parts: {cost.designMissing.join(', ')}. An unfinished design is not a complete BOM.</div>}
        <div className="mt-3"><BudgetBar cost={cost} budget={s.budget} /></div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card p-4"><h3 className="mb-3 font-semibold">Cost model</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Field label="Budget (USD)"><NumberInput aria-label="Budget" value={s.budget} min={1} onChange={(v) => v && setS({ budget: v })} /></Field>
            <Field label="Shipping + tax (%)" hint="Allowance on known parts"><NumberInput aria-label="Shipping and tax percent" value={s.shippingTaxPct} max={100} step={0.5} onChange={(v) => setS({ shippingTaxPct: v ?? 0 })} /></Field>
            <Field label="Contingency (%)" hint="Reserve on known parts"><NumberInput aria-label="Contingency percent" value={s.contingencyPct} max={100} step={0.5} onChange={(v) => setS({ contingencyPct: v ?? 0 })} /></Field>
            <Field label="Price basis"><select aria-label="Price basis" className={inputCls} value={s.priceBasis} onChange={(e) => setS({ priceBasis: e.target.value as 'preliminary' | 'observed' })}><option value="preliminary">Team preliminary</option><option value="observed">Observed listing (where known)</option></select></Field>
            <Field label="Reserve in total"><label className="flex h-9 items-center gap-2 text-sm"><input type="checkbox" className="accent-[var(--accent)]" checked={s.includeContingencyInTotal} onChange={(e) => setS({ includeContingencyInTotal: e.target.checked })} />Include</label></Field>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div className="rounded-lg bg-surface2 p-2.5"><div className="label">Known parts</div><div className="num font-semibold">{money(cost.subtotal)}</div></div>
            <div className="rounded-lg bg-surface2 p-2.5"><div className="label">Shipping/tax</div><div className="num font-semibold">{money(cost.shippingTax)}</div></div>
            <div className="rounded-lg bg-surface2 p-2.5"><div className="label">Contingency</div><div className="num font-semibold">{money(cost.contingency)}</div></div>
            <div className="rounded-lg bg-surface2 p-2.5"><div className="label">Projected total</div><div className="num font-semibold">{money(cost.total)}</div></div>
          </div>
          {hintable.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-warn/30 bg-warn-soft p-2.5 text-xs"><Sparkles size={14} className="text-warn" />{hintable.length} unpriced generic part(s) have typical-price hints (≈{money(cost.hintSubtotal - cost.subtotal)} total). Hints are team estimates, never applied automatically.
            <Button size="sm" onClick={() => update((c) => { const o = { ...c.priceOverrides }; hintable.forEach((l) => { o[l.productId!] = getProduct(l.productId!)!.priceHint!.price }); return { ...c, priceOverrides: o } }, 'Adopted hint prices')}>Adopt hints as manual prices</Button></div>}
        </div>
        <div className="card p-4"><h3 className="mb-2 font-semibold">Completeness</h3>
          <ul className="space-y-1.5 text-sm"><li className="flex justify-between"><span className="text-muted">Priced lines</span><b>{cost.lines.filter((l) => l.kind !== 'included' && l.ext != null).length}</b></li><li className="flex justify-between"><span className="text-muted">Unknown prices</span><b className={cost.unknownCount ? 'text-bad' : ''}>{cost.unknownCount}</b></li><li className="flex justify-between"><span className="text-muted">Included at $0</span><b>{cost.lines.filter((l) => l.kind === 'included').length}</b></li><li className="flex justify-between"><span className="text-muted">Possible duplicates</span><b className={dup.length ? 'text-warn' : ''}>{dup.length}</b></li><li className="flex justify-between"><span className="text-muted">Price drift &gt;10%</span><b className={drift.length ? 'text-warn' : ''}>{drift.length}</b></li><li className="flex justify-between"><span className="text-muted">Missing parts</span><b className={cost.designMissing.length ? 'text-warn' : ''}>{cost.designMissing.length}</b></li></ul>
          {drift.length > 0 && <p className="mt-2 text-xs text-warn">Distributor listings are &gt;10% above the preliminary price for: {drift.map((l) => l.label).join(', ')}. Switch “Price basis” to see the effect.</p>}
          <div className="mt-3 space-y-1 border-t border-line pt-3">{byPri.map((x) => <div key={x.k} className="flex justify-between text-xs"><span className="text-muted">{PRIORITY_LABEL[x.k]} ({x.n})</span><span className="num">{money(x.sum)}</span></div>)}</div></div>
      </div>

      {cost.lines.length === 0 ? <Empty title="The bill of materials is empty">Select hardware in the configurator and every purchased and included item appears here.<div className="mt-3"><Button variant="primary" onClick={() => go('configurator', 'platform')}>Open configurator</Button></div></Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
            <thead><tr className="text-xs text-muted"><th className="px-3 py-2.5">Item</th><th className="px-3 py-2.5">Qty</th><th className="px-3 py-2.5">Unit (USD)</th><th className="px-3 py-2.5">Extended</th><th className="px-3 py-2.5">Acquisition</th><th className="px-3 py-2.5">Seller / link</th><th className="px-3 py-2.5">Verification</th><th className="px-3 py-2.5">Req.</th><th className="px-3 py-2.5">Priority</th><th className="px-3 py-2.5">Procurement</th><th className="px-3 py-2.5">Notes</th></tr></thead>
            <tbody>
              {byGroup.map(({ g, lines }) => (
                <FragmentRows key={g} title={g} sub={money(lines.reduce((a, l) => a + (l.ext ?? 0), 0))}>
                  {lines.map((l) => {
                    const p = l.productId ? getProduct(l.productId) : undefined
                    const editable = l.kind === 'purchase' && l.productId
                    return (
                      <tr key={l.key} className={cx('border-t border-line align-top', l.kind === 'included' && 'bg-violet-soft/40 text-muted', l.kind === 'implied' && 'bg-warn-soft/40')}>
                        <td className="px-3 py-2.5"><div className="text-[11px] uppercase tracking-wider text-faint">{l.brand}</div><div className="font-medium text-fg">{l.label}</div>{l.model && <div className="text-[11px] text-muted">{l.model}</div>}{l.roles && <div className="mt-0.5"><Badge tone="accent">{l.roles}</Badge></div>}{l.duplicate && <div className="mt-0.5"><Badge tone="warn">duplicate of kit part</Badge></div>}</td>
                        <td className="px-3 py-2.5">{editable ? <span className="inline-flex items-center rounded-lg border border-line bg-surface2"><button aria-label="Decrease" className="grid h-7 w-7 place-items-center" onClick={() => qtyOf(l, -1)}><Minus size={12} /></button><span className="num w-7 text-center">{l.qty}</span><button aria-label="Increase" className="grid h-7 w-7 place-items-center" onClick={() => qtyOf(l, 1)}><Plus size={12} /></button></span> : <span className="num">{l.qty}</span>}</td>
                        <td className="w-28 px-3 py-2.5">{l.kind === 'included' ? <b className="num text-violet">$0.00</b> : editable && p ? <NumberInput aria-label={`Unit price ${l.label}`} value={effectivePrice(p, active).price} step={0.01} onChange={(v) => setPrice(l, v)} className="h-8 text-xs" /> : l.kind === 'custom' ? <NumberInput aria-label={`Unit price ${l.label}`} value={l.unitPrice} step={0.01} onChange={(v) => update((c) => ({ ...c, customItems: c.customItems.map((x) => (`custom:${x.id}` === l.key ? { ...x, unitPrice: v } : x)) }))} className="h-8 text-xs" /> : <span className={cx('num', l.unitPrice == null && 'text-bad')}>{l.unitPrice == null ? 'UNKNOWN' : money(l.unitPrice)}</span>}</td>
                        <td className={cx('num px-3 py-2.5 font-semibold', l.ext == null && 'text-bad')}>{l.ext == null ? 'UNKNOWN' : money(l.ext)}</td>
                        <td className="px-3 py-2.5 text-xs">{l.kind === 'included' ? <span className="text-violet">Included in {l.includedIn}</span> : l.kind === 'implied' ? <span className="text-warn">Implied purchase</span> : l.kind === 'custom' ? 'Custom entry' : 'Purchased separately'}</td>
                        <td className="px-3 py-2.5 text-xs">{l.seller}{l.url && <a className="ml-1 text-accent hover:underline" href={l.url} target="_blank" rel="noreferrer">link</a>}</td>
                        <td className="px-3 py-2.5 text-xs"><Tip text={l.note ?? l.reason ?? l.verification}><span className="cursor-help underline decoration-dotted">{l.verification}</span></Tip></td>
                        <td className="px-3 py-2.5 text-xs">{l.kind === 'included' ? '—' : l.required ? 'Required' : 'Optional'}</td>
                        <td className="px-3 py-2.5 text-xs">{p && l.kind === 'purchase' ? <select aria-label={`Priority ${l.label}`} className={cx(inputCls, 'h-8 w-36 text-xs')} value={active.priority[p.id] ?? ''} onChange={(e) => update((c) => { const m = { ...c.priority }; if (e.target.value) m[p.id] = e.target.value as PurchasePriority; else delete m[p.id]; return { ...c, priority: m } })}><option value="">{PRIORITY_LABEL[l.priority]}</option>{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select> : '—'}</td>
                        <td className="px-3 py-2.5 text-xs">{p && l.kind === 'purchase' ? <select aria-label={`Procurement ${l.label}`} className={cx(inputCls, 'h-8 w-28 text-xs')} value={active.procurement[p.id] ?? ''} onChange={(e) => update((c) => { const m = { ...c.procurement }; if (e.target.value) m[p.id] = e.target.value as never; else delete m[p.id]; return { ...c, procurement: m } })}><option value="">—</option>{PROC_STATES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}</select> : l.kind === 'custom' ? <button aria-label="Delete custom item" className="text-muted hover:text-bad" onClick={() => update((c) => ({ ...c, customItems: c.customItems.filter((x) => `custom:${x.id}` !== l.key) }))}><Trash2 size={14} /></button> : '—'}</td>
                        <td className="max-w-[260px] px-3 py-2.5 text-xs text-muted">{l.reason ?? l.note}{p && active.notes[p.id] && <div className="mt-1 italic text-fg">“{active.notes[p.id]}”</div>}</td>
                      </tr>
                    )
                  })}
                </FragmentRows>
              ))}
              <tr className="border-t-2 border-line2 bg-surface2 font-semibold"><td className="px-3 py-3" colSpan={3}>Total (known prices)</td><td className="num px-3 py-3">{money(cost.subtotal)}</td><td colSpan={7} className="px-3 py-3 text-xs font-normal text-muted">+ shipping/tax {money(cost.shippingTax)} → <b className="text-fg">{money(cost.total)}</b>{cost.unknownCount > 0 && <span className="ml-2 text-bad">INCOMPLETE — {cost.unknownCount} missing price(s)</span>}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="card mt-6 p-4">
        <h3 className="mb-3 font-semibold">Add a custom item</h3>
        <form className="grid grid-cols-2 items-end gap-3 md:grid-cols-6" onSubmit={(e) => { e.preventDefault(); if (!custom.label.trim()) return; update((c) => ({ ...c, customItems: [...c.customItems, { id: Math.random().toString(36).slice(2, 8), label: custom.label.trim(), category: custom.category, qty: custom.qty, unitPrice: custom.price, required: custom.required }] }), `Added custom item ${custom.label}`); setCustom({ ...custom, label: '', price: null, qty: 1 }); setNotice({ kind: 'good', text: 'Custom item added to the BOM.' }) }}>
          <div className="col-span-2"><Field label="Description"><input className={inputCls} value={custom.label} onChange={(e) => setCustom({ ...custom, label: e.target.value })} placeholder="e.g. USB power banks for UWB anchors" /></Field></div>
          <Field label="Category"><select className={inputCls} value={custom.category} onChange={(e) => setCustom({ ...custom, category: e.target.value })}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></Field>
          <Field label="Qty"><NumberInput aria-label="Custom quantity" value={custom.qty} min={1} onChange={(v) => setCustom({ ...custom, qty: v ?? 1 })} /></Field>
          <Field label="Unit price (blank = unknown)"><NumberInput aria-label="Custom price" value={custom.price} step={0.01} onChange={(v) => setCustom({ ...custom, price: v })} /></Field>
          <Button type="submit" variant="primary"><Plus size={14} /> Add</Button>
        </form>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-faint"><Download size={13} /><Copy size={13} /> CSV and JSON exports contain every purchased, implied and included line; unknown prices are exported as UNKNOWN.</div>
    </div>
  )
}

function FragmentRows({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return <><tr className="bg-surface2"><td colSpan={11} className="px-3 py-1.5"><span className="label">{title}</span><span className="num ml-3 text-xs text-muted">{sub}</span></td></tr>{children}</>
}
