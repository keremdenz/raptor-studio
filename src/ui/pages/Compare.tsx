import { Fragment, useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { catalog, getProduct, SLOTS } from '../../data/catalog'
import type { Config, Product, Slot } from '../../types'
import { countBySeverity, evaluate } from '../../engine/compat'
import { selectProduct } from '../../engine/config'
import { computeCost, effectivePrice, money } from '../../engine/cost'
import { effectiveCost } from '../../engine/effective'
import { evaluateGoals } from '../../engine/upgrades'
import { useStore } from '../../state/store'
import { Badge, Button, Drawer, Empty, SectionTitle, Segmented, cx, inputCls } from '../kit'
import { RAPTOR_LABEL, SLOT_NOUN } from '../labels'
import { Inspector } from '../Inspector'
import { ProductImage } from '../ProductImage'

const QUICK: { label: string; ids: string[] }[] = [
  { label: 'Platforms: WAVE ROVER · Baron 4WD · Devastator', ids: ['wave-rover', 'baron-4wd', 'devastator-metal'] },
  { label: 'Processors: Pi 4 · UNO Q · ESP32-P4X-EYE', ids: ['pi4-2gb', 'arduino-uno-q', 'esp32-p4x-eye'] },
  { label: 'IMUs: MPU-6050 · LSM6DSOX · BNO085', ids: ['imu-mpu6050', 'imu-lsm6dsox', 'imu-bno085'] },
  { label: 'UWB: Qorvo · MaUWB · ESP32 DW3000', ids: ['qorvo-dwm3001cdk', 'mk-mauwb-direct', 'mk-esp32-uwb-dw3000'] },
  { label: 'Cameras: Module 3 Wide · OV9281 · C270', ids: ['rpi-cam3-wide', 'arducam-ov9281', 'logitech-c270'] },
]

type Best = 'low' | 'high' | undefined
const rank = (vals: (number | null)[], best: Best): Set<number> => {
  if (!best) return new Set()
  const nums = vals.filter((v): v is number => v != null)
  if (nums.length < 2) return new Set()
  const t = best === 'low' ? Math.min(...nums) : Math.max(...nums)
  if (nums.every((n) => n === t)) return new Set()
  return new Set(vals.map((v, i) => (v === t ? i : -1)).filter((i) => i >= 0))
}
const worst = (vals: (number | null)[], best: Best): Set<number> => {
  if (!best) return new Set()
  const nums = vals.filter((v): v is number => v != null)
  if (nums.length < 2) return new Set()
  const t = best === 'low' ? Math.max(...nums) : Math.min(...nums)
  if (nums.every((n) => n === t)) return new Set()
  return new Set(vals.map((v, i) => (v === t ? i : -1)).filter((i) => i >= 0))
}

function ProductCompare() {
  const { compare, toggleCompare, clearCompare, active, inspect, inspectId } = useStore()
  const [add, setAdd] = useState('')
  const [open, setOpen] = useState(false)
  const items = compare.map((id) => getProduct(id)).filter((p): p is Product => !!p)
  const eff = items.map((p) => effectiveCost(p, active))
  const sim = items.map((p) => {
    const slot = p.slots.find((s) => s !== 'prohibited')
    if (!slot) return null
    const base = new Set(evaluate(active).map((f) => f.id))
    const next = evaluate(selectProduct(active, slot, p.id))
    return next.filter((f) => !base.has(f.id) && (f.severity === 'critical' || f.severity === 'missing' || f.severity === 'validation'))
  })
  const specKeys = [...new Set(items.flatMap((p) => p.specs.map((s) => s[0])))]
  const row = (label: string, cells: React.ReactNode[], opts?: { best?: Best; nums?: (number | null)[]; note?: string }) => {
    const good = opts?.nums ? rank(opts.nums, opts.best) : new Set<number>(), bad = opts?.nums ? worst(opts.nums, opts.best) : new Set<number>()
    return (
      <tr className="border-t border-line align-top">
        <th scope="row" className="sticky left-0 z-10 w-36 min-w-36 bg-surface px-3 py-2.5 text-left text-xs font-medium text-muted">{label}{opts?.note && <div className="mt-0.5 text-[10px] font-normal text-faint">{opts.note}</div>}</th>
        {cells.map((c, i) => <td key={i} className={cx('min-w-[210px] px-3 py-2.5 text-sm', good.has(i) && 'bg-good-soft', bad.has(i) && 'bg-bad-soft/60')}>{c}</td>)}
      </tr>
    )
  }
  const list = (a: string[]) => a.length ? <ul className="list-disc space-y-0.5 pl-4 text-xs">{a.map((x) => <li key={x}>{x}</li>)}</ul> : <span className="text-faint">—</span>
  const complexity = (p: Product) => { const i = p.ratings?.integration; return i == null ? 'Unknown' : i >= 5 ? 'Low' : i >= 3 ? 'Medium' : 'High' }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {items.map((p) => <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-violet/40 bg-violet-soft py-1 pl-3 pr-1.5 text-xs">{p.name}<button aria-label={`Remove ${p.name} from comparison`} onClick={() => toggleCompare(p.id)} className="grid h-5 w-5 place-items-center rounded-full hover:bg-violet/20"><X size={12} /></button></span>)}
        <div className="flex gap-1.5"><select aria-label="Add product to comparison" className={cx(inputCls, 'w-64')} value={add} onChange={(e) => { if (e.target.value) toggleCompare(e.target.value); setAdd('') }} disabled={compare.length >= 4}>
          <option value="">{compare.length >= 4 ? 'Maximum 4 products' : '+ Add a product…'}</option>{catalog.filter((p) => !compare.includes(p.id) && !p.slots.includes('prohibited')).map((p) => <option key={p.id} value={p.id}>{p.brand} — {p.name}{p.variant ? ` (${p.variant.slice(0, 28)})` : ''}</option>)}</select></div>
        {items.length > 0 && <Button size="sm" variant="ghost" onClick={clearCompare}>Clear</Button>}
      </div>
      <div className="mb-5 flex flex-wrap gap-2">{QUICK.map((q) => <button key={q.label} onClick={() => { clearCompare(); q.ids.forEach((id) => toggleCompare(id)) }} className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-muted transition hover:border-accent hover:text-accent">{q.label}</button>)}</div>

      {items.length < 2 ? <Empty title="Pick two to four products">Use the quick sets above, the add menu, or the compare button on any product card.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead><tr>
              <th className="sticky left-0 z-10 bg-surface" />
              {items.map((p) => <th key={p.id} className="min-w-[210px] px-3 pb-3 pt-3 align-top font-normal">
                <button onClick={() => { inspect(p.id); setOpen(true) }} className="block w-full text-left"><ProductImage product={p} className="mb-2 h-28 w-full rounded-lg border border-line" /><div className="text-[11px] uppercase tracking-wider text-faint">{p.brand}</div><div className="text-sm font-semibold hover:text-accent">{p.name}</div>{p.variant && <div className="text-[11px] text-muted">{p.variant}</div>}</button></th>)}
            </tr></thead>
            <tbody>
              {row('Catalog price', items.map((p) => <b className="num">{money(effectivePrice(p, active).price)}{effectivePrice(p, active).price == null && <span className="text-warn"> TBD</span>}</b>), { best: 'low', nums: items.map((p) => effectivePrice(p, active).price), note: 'Lower is not “better quality”' })}
              {row('Effective complete-base cost', eff.map((e) => <div><b className="num">{e.total == null ? <span className="text-warn">Incomplete</span> : money(e.total)}</b><ul className="mt-1 space-y-0.5 text-[11px] text-muted">{e.parts.map((x, i) => <li key={i} className={cx(x.included && 'text-good')}>{x.label}: {x.price == null ? 'price TBD' : money(x.price)}{x.hint && ' (hint)'}</li>)}</ul><div className="mt-1 text-[10px] text-faint">{e.basis}</div></div>), { best: 'low', nums: eff.map((e) => e.total), note: 'Equal-footing estimate' })}
              {row('RAPTOR suitability', items.map((p) => <div><Badge tone={RAPTOR_LABEL[p.raptorStatus].tone}>{RAPTOR_LABEL[p.raptorStatus].label}</Badge><p className="mt-1 text-xs text-muted">{p.raptorNote}</p></div>))}
              {row('Included', items.map((p) => list(p.includes)))}
              {row('Additional components required', items.map((p) => list([...p.excludes, ...(p.needs ?? []).map((n) => n.label)])))}
              {row('Integration ease', items.map((p) => <b>{p.ratings?.integration ?? '—'}/5</b>), { best: 'high', nums: items.map((p) => p.ratings?.integration ?? null) })}
              {row('Programming complexity', items.map((p) => <span>{complexity(p)}</span>), { note: 'From the integration rating' })}
              {row('Documentation', items.map((p) => <b>{p.ratings?.docs ?? '—'}/5</b>), { best: 'high', nums: items.map((p) => p.ratings?.docs ?? null) })}
              {row('Expandability', items.map((p) => <b>{p.ratings?.expandability ?? '—'}/5</b>), { best: 'high', nums: items.map((p) => p.ratings?.expandability ?? null) })}
              {row('Rating basis', items.map((p) => <span className="text-xs text-muted">{p.ratingBasis ?? '—'}</span>))}
              {items.some((p) => p.plat) && row('Payload (kg)', items.map((p) => p.plat ? (p.plat.payloadKg ?? <span className="text-warn">not published</span>) : '—'), { best: 'high', nums: items.map((p) => p.plat?.payloadKg ?? null) })}
              {items.some((p) => p.proc) && row('RAM', items.map((p) => p.proc ? (p.proc.ramMB ? `${p.proc.ramMB >= 1024 ? p.proc.ramMB / 1024 + ' GB' : p.proc.ramMB + ' MB'}` : 'unknown') : '—'), { best: 'high', nums: items.map((p) => p.proc?.ramMB || null) })}
              {items.some((p) => p.proc) && row('Video encoding', items.map((p) => p.proc ? <span className="text-xs">{p.proc.hwEncode === 'hw-h264' ? 'Hardware H.264' : p.proc.hwEncode === 'sw-only' ? 'Software only' : 'Unverified'}<br /><span className="text-muted">{p.proc.hwEncodeNote}</span></span> : '—'))}
              {items.some((p) => p.proc) && row('Camera interfaces', items.map((p) => p.proc ? <span className="text-xs text-muted">{p.proc.cameraNote}</span> : '—'))}
              {items.some((p) => p.cam) && row('Shutter / colour', items.map((p) => p.cam ? `${p.cam.shutter} · ${p.cam.color === 'mono' ? 'mono' : 'RGB'}` : '—'))}
              {items.some((p) => p.cam) && row('Visual-SLAM suitability', items.map((p) => p.cam ? <span>{p.cam.vslam}/5 <span className="text-xs text-muted">{p.cam.vslamNote}</span></span> : '—'), { best: 'high', nums: items.map((p) => p.cam?.vslam ?? null) })}
              {items.some((p) => p.uwb) && row('Raw range access', items.map((p) => p.uwb ? <span className="text-xs">{p.uwb.rawRanges}<br /><span className="text-muted">{p.uwb.rawRangesNote}</span></span> : '—'))}
              {items.some((p) => p.uwb) && row('Anchor-failure resilience', items.map((p) => p.uwb ? <span className="text-xs text-muted">{p.uwb.failover}</span> : '—'))}
              {items.some((p) => p.uwb) && row('Calibration effort', items.map((p) => p.uwb?.calibration ?? '—'))}
              {specKeys.map((k) => <Fragment key={k}>{row(k, items.map((p) => <span className="text-xs">{p.specs.find((s) => s[0] === k)?.[1] ?? <span className="text-faint">—</span>}</span>))}</Fragment>)}
              {row('Effect on current configuration', sim.map((s) => s === null ? 'n/a' : s.length === 0 ? <span className="text-xs text-good">No new blocking warnings</span> : <ul className="space-y-1 text-xs">{s.slice(0, 4).map((f) => <li key={f.id}><Badge tone={f.severity === 'critical' ? 'bad' : f.severity === 'missing' ? 'warn' : 'violet'}>{f.severity}</Badge> {f.title}</li>)}</ul>))}
              {row('Engineering risks', items.map((p) => list(p.cons)))}
              {row('Upgrade potential', items.map((p) => <span className="text-xs text-muted">{p.futureNote ?? p.proc?.upgradePath ?? '—'}</span>))}
              {row('Source confidence', items.map((p) => <span className="text-xs text-muted">{p.confidence} · {p.specStatus} specs</span>))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-faint">Green = best of the compared set on a numeric row, red = weakest. Highest price is never treated as highest quality; the ratings are qualitative and carry their basis.</p>
      <Drawer open={open && !!inspectId} onClose={() => setOpen(false)} title="Component details" width={520}><Inspector product={inspectId ? getProduct(inspectId) : undefined} /></Drawer>
    </div>
  )
}

function ConfigCompare() {
  const { configs, active, teamIds, setTeamIds, setActive, setScenarioB, create } = useStore()
  const ids = teamIds.filter((id) => configs.some((c) => c.id === id))
  const picked: Config[] = ids.length >= 2 ? ids.map((id) => configs.find((c) => c.id === id)!) : [active, [...configs].reverse().find((c) => c.id !== active.id)].filter((c): c is Config => !!c).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const data = useMemo(() => picked.map((c) => ({ c, cost: computeCost(c), counts: countBySeverity(evaluate(c)), goals: evaluateGoals(c) })), [picked])
  const slots = (Object.keys(SLOTS) as Slot[]).filter((s) => s !== 'prohibited' && picked.some((c) => c.items.some((i) => i.slot === s)))
  const toggle = (id: string) => setTeamIds(ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= 4 ? ids : [...ids, id])
  const label = (c: Config, i: number) => `Configuration ${'ABCD'[i]}${c.owner ? ` — ${c.owner}` : ''}`
  return (
    <div>
      <div className="card mb-4 p-4">
        <div className="label mb-2">Choose 2–4 saved configurations to compare (team members' exports can be imported from the Command Center)</div>
        <div className="flex flex-wrap gap-2">{configs.map((c) => <label key={c.id} className={cx('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm', (ids.length ? ids.includes(c.id) : picked.some((p) => p.id === c.id)) ? 'border-accent bg-accent-soft' : 'border-line')}>
          <input type="checkbox" className="accent-[var(--accent)]" checked={ids.length ? ids.includes(c.id) : picked.some((p) => p.id === c.id)} onChange={() => (ids.length === 0 ? setTeamIds([...picked.map((p) => p.id), c.id].filter((x, i, a) => a.indexOf(x) === i).slice(0, 4)) : toggle(c.id))} />{c.name}{c.owner && <span className="text-xs text-muted">({c.owner})</span>}</label>)}</div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">{configs.length < 2 ? 'Only one configuration exists. ' : 'Try a variant without touching this design: '}<Button size="sm" variant={configs.length < 2 ? 'primary' : 'secondary'} onClick={() => { create(`${active.name} — scenario B`, active); setScenarioB(null); setTeamIds([]) }}><Plus size={13} /> Duplicate active as scenario B</Button></div>
      </div>
      {picked.length < 2 ? <Empty title="Need a second configuration">Create or import another configuration to compare designs side by side.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead><tr><th className="sticky left-0 z-10 bg-surface" />{data.map((d, i) => <th key={d.c.id} className="min-w-[230px] px-3 py-3 align-top font-normal"><div className="label">{label(d.c, i)}</div><div className="text-sm font-semibold">{d.c.name}</div><Button size="sm" className="mt-1.5" onClick={() => setActive(d.c.id)} disabled={d.c.id === active.id}>{d.c.id === active.id ? 'Active' : 'Make active'}</Button></th>)}</tr></thead>
            <tbody>
              {slots.map((s) => {
                const names = picked.map((c) => c.items.filter((i) => i.slot === s).map((i) => `${getProduct(i.productId)?.name ?? i.productId}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ') || '—')
                const differs = new Set(names).size > 1
                return <tr key={s} className={cx('border-t border-line', differs && 'bg-warn-soft/40')}><th scope="row" className="sticky left-0 z-10 bg-surface px-3 py-2 text-left text-xs font-medium text-muted">{SLOT_NOUN[s]}{differs && <span className="ml-1 text-warn">≠</span>}</th>{names.map((n, i) => <td key={i} className="px-3 py-2 text-sm">{n}</td>)}</tr>
              })}
              {[
                ['Known parts', data.map((d) => d.cost.subtotal), 'low'], ['Projected total', data.map((d) => d.cost.total), 'low'], ['Remaining budget', data.map((d) => d.cost.remaining), 'high'],
              ].map(([l, vals, best]) => { const g = rank(vals as number[], best as Best); return <tr key={l as string} className="border-t border-line"><th scope="row" className="sticky left-0 bg-surface px-3 py-2 text-left text-xs font-medium text-muted">{l as string}</th>{(vals as number[]).map((v, i) => <td key={i} className={cx('num px-3 py-2 text-sm font-semibold', g.has(i) && 'bg-good-soft', v < 0 && 'text-bad')}>{money(v)}</td>)}</tr> })}
              <tr className="border-t border-line"><th scope="row" className="sticky left-0 bg-surface px-3 py-2 text-left text-xs font-medium text-muted">Unpriced items</th>{data.map((d, i) => <td key={i} className={cx('px-3 py-2 text-sm', !!d.cost.unknownCount && 'text-bad')}>{d.cost.unknownCount || 'none'}</td>)}</tr>
              <tr className="border-t border-line"><th scope="row" className="sticky left-0 bg-surface px-3 py-2 text-left text-xs font-medium text-muted">Missing parts</th>{data.map((d, i) => <td key={i} className="px-3 py-2 text-xs">{d.cost.designMissing.join(', ') || <span className="text-good">none</span>}</td>)}</tr>
              <tr className="border-t border-line"><th scope="row" className="sticky left-0 bg-surface px-3 py-2 text-left text-xs font-medium text-muted">Compatibility</th>{data.map((d, i) => <td key={i} className="px-3 py-2"><div className="flex flex-wrap gap-1"><Badge tone={d.counts.critical ? 'bad' : 'good'}>{d.counts.critical} critical</Badge><Badge tone="warn">{d.counts.missing} missing</Badge><Badge tone="info">{d.counts.integration} integration</Badge><Badge tone="violet">{d.counts.validation} validation</Badge></div></td>)}</tr>
              <tr className="border-t border-line"><th scope="row" className="sticky left-0 bg-surface px-3 py-2 text-left text-xs font-medium text-muted">Upgrade potential</th>{data.map((d, i) => <td key={i} className="px-3 py-2 text-xs">{d.goals.length ? <ul className="space-y-0.5">{d.goals.map((g) => <li key={g.id}>{g.label}: <b>{g.verdict.replace(/-/g, ' ')}</b></li>)}</ul> : <span className="text-faint">No goals selected</span>}</td>)}</tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function Compare({ arg }: { arg?: string }) {
  const [tab, setTab] = useState<'products' | 'configs'>(arg === 'configs' ? 'configs' : 'products')
  useEffect(() => { if (arg === 'configs' || arg === 'products') setTab(arg) }, [arg])
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <SectionTitle sub="Side-by-side engineering comparison of parts, or of whole team designs (A/B scenarios)." right={<Segmented value={tab} onChange={setTab} options={[{ value: 'products', label: 'Products' }, { value: 'configs', label: 'Configurations / team' }]} />}>Comparison Lab</SectionTitle>
      {tab === 'products' ? <ProductCompare /> : <ConfigCompare />}
    </div>
  )
}
