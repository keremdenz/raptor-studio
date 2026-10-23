import { Fragment, useMemo, useState } from 'react'
import { AlertTriangle, BadgeCheck, Ban, ExternalLink, GitCompareArrows, PackageCheck, PackageX, RotateCcw, Sparkles, StickyNote } from 'lucide-react'
import type { Product, Slot } from '../types'
import { SLOTS } from '../data/catalog'
import { evaluate, SEVERITY_LABEL } from '../engine/compat'
import { isSelected, selectProduct, toggleProduct } from '../engine/config'
import { effectivePrice, money } from '../engine/cost'
import { useStore } from '../state/store'
import { Badge, Button, NumberInput, cx, inputCls } from './kit'
import { CONF_LABEL, PRIORITY_LABEL, PROC_STATES, RAPTOR_LABEL, SEV_TONE, SLOT_NOUN, SPEC_LABEL } from './labels'
import { PriceTag, Rating } from './ProductCard'
import { ProductImage } from './ProductImage'

const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="border-t border-line px-4 py-3.5"><h4 className="label mb-2">{title}</h4>{children}</section>

export function Inspector({ product: p, compact }: { product: Product | undefined; compact?: boolean }) {
  const { active, update, findings, compare, toggleCompare } = useStore()
  const [open, setOpen] = useState(false)
  const sim = useMemo(() => {
    if (!p) return []
    const base = new Set(findings.map((f) => f.id))
    return p.slots.filter((s) => s !== 'prohibited' && !isSelected(active, s, p.id)).map((slot) => {
      const next = evaluate(selectProduct(active, slot, p.id))
      return { slot, fresh: next.filter((f) => !base.has(f.id) && f.severity !== 'optional') }
    }).filter((x) => x.fresh.length > 0)
  }, [p, active, findings])

  if (!p) return <div className="grid h-full place-items-center p-8 text-center text-sm text-muted">Select or click a product to inspect its specifications, trade-offs and compatibility.</div>
  const st = RAPTOR_LABEL[p.raptorStatus]
  const { price, source } = effectivePrice(p, active)
  const prohibited = p.slots.includes('prohibited')
  const own = findings.filter((f) => f.productIds?.includes(p.id) && f.severity !== 'optional')
  const setOverride = (v: number | null | 'clear') => update((c) => {
    const o = { ...c.priceOverrides }
    if (v === 'clear') delete o[p.id]; else o[p.id] = v
    return { ...c, priceOverrides: o }
  }, v === 'clear' ? `Reset price of ${p.name}` : `Set manual price for ${p.name}`)

  return (
    <div className="anim-in">
      <ProductImage product={p} large className={cx('w-full border-b border-line', compact ? 'h-44' : 'h-60')} />
      {p.imageNote && <div className="border-b border-line px-4 py-1.5 text-[11px] text-faint">{p.imageNote}</div>}
      <div className="px-4 pb-3 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-faint">{p.brand}</div>
            <h3 className="text-lg font-semibold leading-snug">{p.name}</h3>
            {p.variant && <div className="text-xs text-muted">{p.variant}</div>}
          </div>
          <PriceTag p={p} big />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge tone={st.tone}>{st.label}</Badge>
          <Badge tone="neutral">{CONF_LABEL[p.confidence]}</Badge>
          <Badge tone={p.specStatus === 'checked' ? 'good' : p.specStatus === 'partial' ? 'info' : 'warn'}>{SPEC_LABEL[p.specStatus]}</Badge>
          {p.stock && <Badge tone="bad">{p.stock}</Badge>}
        </div>
        <p className="mt-2.5 text-sm text-muted">{p.raptorNote}</p>
        {prohibited && <div className="mt-3 flex gap-2 rounded-lg border border-bad/40 bg-bad-soft p-3 text-sm text-bad"><Ban size={16} className="mt-0.5 shrink-0" /><div><b>Not compliant with current project restrictions.</b> Research only — it cannot be added to a configuration without a change to the official requirements.</div></div>}
        <div className="mt-3 flex flex-wrap gap-2">
          {p.slots.filter((s) => s !== 'prohibited').map((s: Slot) => {
            const on = isSelected(active, s, p.id)
            return <Button key={s} variant={on ? 'secondary' : 'primary'} size="sm" onClick={() => update((c) => toggleProduct(c, s, p.id), `${on ? 'Removed' : 'Selected'} ${p.name} (${SLOT_NOUN[s]})`)}>
              {on ? <PackageX size={14} /> : <PackageCheck size={14} />}{on ? `Remove as ${SLOT_NOUN[s].toLowerCase()}` : `${SLOTS[s].single ? 'Select' : 'Add'} as ${SLOT_NOUN[s].toLowerCase()}`}</Button>
          })}
          <Button variant="ghost" size="sm" onClick={() => toggleCompare(p.id)} className={cx(compare.includes(p.id) && 'text-violet')}><GitCompareArrows size={14} />{compare.includes(p.id) ? 'In comparison' : 'Compare'}</Button>
        </div>
      </div>

      {(own.length > 0 || sim.length > 0) && (
        <Sec title="Compatibility warnings">
          <div className="space-y-2">
            {own.map((f) => <Warn key={f.id} sev={f.severity} title={f.title} detail={f.detail} />)}
            {sim.map((s) => <div key={s.slot} className="rounded-lg border border-line bg-surface2 p-2.5">
              <div className="mb-1.5 text-xs font-medium text-muted">If you select it as {SLOT_NOUN[s.slot].toLowerCase()}:</div>
              <div className="space-y-1.5">{s.fresh.slice(0, 5).map((f) => <Warn key={f.id} sev={f.severity} title={f.title} detail={f.detail} small />)}</div>
            </div>)}
          </div>
        </Sec>
      )}

      <Sec title="Price & sourcing">
        <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-muted">Catalog price</dt><dd className="num">{p.price == null ? <span className="text-warn">Unknown</span> : money(p.price)} <span className="text-xs text-faint">({p.priceDate})</span></dd>
          {p.observed && <><dt className="text-muted">Observed</dt><dd className="num">{money(p.observed.price)} <span className="text-xs text-faint">{p.observed.seller}, {p.observed.date}</span> <a className="text-accent" href={p.observed.url} target="_blank" rel="noreferrer"><ExternalLink size={11} className="inline" /></a></dd></>}
          <dt className="text-muted">Seller</dt><dd>{p.seller}</dd>
          {p.priceNote && <><dt className="text-muted">Note</dt><dd className="text-muted">{p.priceNote}</dd></>}
        </dl>
        {p.priceHint && <div className="mt-2 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn-soft p-2.5 text-xs"><Sparkles size={14} className="mt-0.5 shrink-0 text-warn" /><div><div>Hint ${p.priceHint.price}: {p.priceHint.note}</div><Button size="sm" className="mt-1.5" onClick={() => setOverride(p.priceHint!.price)}>Use hint as manual price</Button></div></div>}
        <div className="mt-3 flex items-end gap-2">
          <label className="block flex-1"><span className="mb-1 block text-xs font-medium text-muted">Manual price correction (USD)</span>
            <NumberInput aria-label="Manual price" value={source === 'override' ? price : null} step={0.01} onChange={(v) => setOverride(v)} className="w-full" /></label>
          {source === 'override' && <Button size="sm" onClick={() => setOverride('clear')}><RotateCcw size={13} /> Reset</Button>}
        </div>
        <p className="mt-1.5 text-[11px] text-faint">Corrections are stored in this configuration, are included in exports and share links, and flag the price as “Manual”.</p>
      </Sec>

      <Sec title="Advantages & disadvantages">
        <ul className="space-y-1.5">{p.pros.map((x) => <li key={x} className="flex gap-2 text-sm"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-good" />{x}</li>)}</ul>
        <ul className="mt-2 space-y-1.5">{p.cons.map((x) => <li key={x} className="flex gap-2 text-sm text-muted"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />{x}</li>)}</ul>
      </Sec>

      <Sec title="Technical specifications">
        <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-sm">{p.specs.map(([k, v]) => <Fragment key={k + v}><dt className="text-muted">{k}</dt><dd>{v}</dd></Fragment>)}</dl>
        {p.proc && <ProcSpecs p={p} />}
        {p.cam && <CamSpecs p={p} />}
        {p.uwb && <UwbSpecs p={p} />}
        {p.plat && <PlatSpecs p={p} />}
      </Sec>

      <Sec title="Included in the package">
        <ul className="space-y-1 text-sm">{p.includes.length ? p.includes.map((x) => <li key={x} className="flex gap-2"><BadgeCheck size={14} className="mt-0.5 shrink-0 text-good" />{x}</li>) : <li className="text-muted">No package contents recorded.</li>}</ul>
        {p.excludes.length > 0 && <><div className="label mb-1 mt-3">Not included — buy separately</div><ul className="space-y-1 text-sm text-muted">{p.excludes.map((x) => <li key={x} className="flex gap-2"><PackageX size={14} className="mt-0.5 shrink-0 text-warn" />{x}</li>)}</ul></>}
        {p.needs && p.needs.length > 0 && <><div className="label mb-1 mt-3">Implied extra parts (in BOM)</div><ul className="space-y-1 text-sm text-muted">{p.needs.map((n) => <li key={n.label}>{n.label} — {n.price == null ? <span className="text-warn">price unknown</span> : money(n.price)}</li>)}</ul></>}
        {p.providesUnverified && Object.keys(p.providesUnverified).length > 0 && <div className="mt-3 space-y-1.5">{Object.entries(p.providesUnverified).map(([k, v]) => <div key={k} className="flex gap-2 rounded-lg border border-warn/30 bg-warn-soft p-2 text-xs"><AlertTriangle size={13} className="mt-0.5 shrink-0 text-warn" /><span><b>{k}:</b> {v}</span></div>)}</div>}
      </Sec>

      {p.ratings && (
        <Sec title="Expandability & ease-of-use ratings">
          <div className="space-y-1.5"><Rating label="Integration" value={p.ratings.integration} /><Rating label="Documentation" value={p.ratings.docs} /><Rating label="Expandability" value={p.ratings.expandability} /></div>
          <button className="mt-2 text-xs text-accent hover:underline" onClick={() => setOpen(!open)}>{open ? 'Hide' : 'How were these rated?'}</button>
          {open && <p className="mt-1 text-xs text-muted">1–5 qualitative judgements by the app author from the sources listed, not measurements. Basis: {p.ratingBasis}</p>}
        </Sec>
      )}

      {p.futureNote && <Sec title="Future upgrade potential"><p className="text-sm text-muted">{p.futureNote}</p></Sec>}

      <Sec title="Sources & links">
        <ul className="space-y-1.5 text-sm">
          {p.url && <li><a className="inline-flex items-center gap-1.5 text-accent hover:underline" href={p.url} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Official / product page</a></li>}
          {p.altUrl && <li><a className="inline-flex items-center gap-1.5 text-accent hover:underline" href={p.altUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Related page</a></li>}
          {p.datasheetUrl && <li><a className="inline-flex items-center gap-1.5 text-accent hover:underline" href={p.datasheetUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Datasheet</a></li>}
          {!p.url && <li className="text-muted">No official link stored — search the manufacturer site and add it to the catalog data.</li>}
          {p.sources.map((s) => <li key={s.label} className="text-xs text-muted">• {s.label} — <i>{CONF_LABEL[s.kind]}</i>{s.url && <> <a className="text-accent" href={s.url} target="_blank" rel="noreferrer">link</a></>}</li>)}
        </ul>
      </Sec>

      {!prohibited && (
        <Sec title="Team decision & procurement">
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted">Procurement status</span>
              <select className={inputCls} value={active.procurement[p.id] ?? ''} onChange={(e) => update((c) => { const m = { ...c.procurement }; if (e.target.value) m[p.id] = e.target.value as never; else delete m[p.id]; return { ...c, procurement: m } }, `Procurement of ${p.name}: ${e.target.value || 'cleared'}`)}>
                <option value="">— not tracked —</option>{PROC_STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-muted">Purchase priority</span>
              <select className={inputCls} value={active.priority[p.id] ?? ''} onChange={(e) => update((c) => { const m = { ...c.priority }; if (e.target.value) m[p.id] = e.target.value as never; else delete m[p.id]; return { ...c, priority: m } })}>
                <option value="">Default ({PRIORITY_LABEL[p.purchasePriority ?? 'before-integration']})</option>{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          </div>
          <label className="mt-2 block"><span className="mb-1 flex items-center gap-1 text-xs font-medium text-muted"><StickyNote size={12} /> Why selected or rejected?</span>
            <textarea rows={3} className={cx(inputCls, 'h-auto py-2')} placeholder="Design decision note…" value={active.notes[p.id] ?? ''} onChange={(e) => update((c) => ({ ...c, notes: { ...c.notes, [p.id]: e.target.value } }))} /></label>
        </Sec>
      )}
    </div>
  )
}

function Warn({ sev, title, detail, small }: { sev: keyof typeof SEV_TONE; title: string; detail: string; small?: boolean }) {
  return <div className="rounded-lg border border-line bg-surface2 p-2.5"><div className="mb-0.5 flex flex-wrap items-center gap-1.5"><Badge tone={SEV_TONE[sev]}>{SEVERITY_LABEL[sev]}</Badge></div><div className={cx('font-medium', small ? 'text-xs' : 'text-sm')}>{title}</div><div className="mt-0.5 text-xs text-muted">{detail}</div></div>
}

const yn = (b: boolean) => (b ? <span className="text-good">yes</span> : <span className="text-faint">no</span>)

function ProcSpecs({ p }: { p: Product }) {
  const a = p.proc!
  const io = a.io
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted">CPU</dt><dd>{a.cpu}</dd><dt className="text-muted">RAM</dt><dd>{a.ramMB ? `${a.ramMB >= 1024 ? a.ramMB / 1024 + ' GB' : a.ramMB + ' MB'}` : <span className="text-warn">unknown</span>}</dd>
        <dt className="text-muted">Storage</dt><dd>{a.storage}</dd><dt className="text-muted">Wi-Fi</dt><dd>{a.wifi}</dd><dt className="text-muted">Power</dt><dd>{a.powerIn}</dd>
        <dt className="text-muted">Video encode</dt><dd>{a.hwEncode === 'hw-h264' ? 'Hardware H.264' : a.hwEncode === 'sw-only' ? 'Software only' : 'Unverified'} <span className="text-xs text-muted">— {a.hwEncodeNote}</span></dd>
        <dt className="text-muted">Cameras</dt><dd className="text-sm">{a.cameraNote}</dd>
        <dt className="text-muted">ROS 2</dt><dd>{{ native: 'Native / well supported', possible: 'Possible (smaller community)', 'micro-ros': 'micro-ROS only', limited: 'Limited' }[a.ros2]}</dd>
        <dt className="text-muted">Real-time</dt><dd>{{ 'none-linux': 'Linux (not hard real-time)', 'hybrid-mcu': 'Linux + real-time MCU', mcu: 'Microcontroller' }[a.realtime]}</dd>
        <dt className="text-muted">Upgrade path</dt><dd className="text-muted">{a.upgradePath}</dd>
      </dl>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs"><span>UART {yn(io.uart)}</span><span>I²C {yn(io.i2c)}</span><span>SPI {yn(io.spi)}</span><span>USB {yn(io.usb)}</span><span>GPIO {yn(io.gpio)}</span><span>PCIe {yn(io.pcie)}</span><span>CSI {yn(io.csi)}</span></div>
    </div>
  )
}
function CamSpecs({ p }: { p: Product }) {
  const a = p.cam!
  return <dl className="mt-3 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 border-t border-line pt-3 text-sm">
    <dt className="text-muted">Interface</dt><dd>{{ 'csi-pi': 'Raspberry Pi CSI (libcamera)', 'usb-uvc': 'USB UVC', integrated: 'Integrated' }[a.iface]}</dd><dt className="text-muted">Sensor</dt><dd>{a.sensor}</dd>
    <dt className="text-muted">Resolution</dt><dd>{a.resolution}</dd><dt className="text-muted">FPS</dt><dd>{a.fps}</dd><dt className="text-muted">FOV</dt><dd>{a.fovDeg ? `${a.fovDeg}° diagonal` : 'Lens-dependent / unknown'}</dd>
    <dt className="text-muted">Shutter / colour</dt><dd>{a.shutter} shutter, {a.color === 'mono' ? 'monochrome' : 'RGB'}{a.autofocus ? ', autofocus' : ''}</dd><dt className="text-muted">Low light</dt><dd>{a.lowLight}</dd>
    <dt className="text-muted">Visual SLAM</dt><dd>{a.vslam}/5 — {a.vslamNote}</dd></dl>
}
function UwbSpecs({ p }: { p: Product }) {
  const a = p.uwb!
  return <dl className="mt-3 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 border-t border-line pt-3 text-sm">
    <dt className="text-muted">Family</dt><dd>{a.family} <span className="text-xs text-muted">({a.chip})</span></dd><dt className="text-muted">Roles</dt><dd>{a.roles.join(' / ')}</dd>
    <dt className="text-muted">Host links</dt><dd>{a.hostLinks.join(', ').toUpperCase()}</dd><dt className="text-muted">Raw ranges</dt><dd>{a.rawRanges === 'documented' ? 'Documented' : a.rawRanges === 'unverified' ? 'Unverified' : 'Not available'} — <span className="text-muted">{a.rawRangesNote}</span></dd>
    <dt className="text-muted">Firmware</dt><dd>{a.firmware}</dd><dt className="text-muted">Channel</dt><dd>{a.channel}</dd><dt className="text-muted">Anchor power</dt><dd>{a.anchorPower}</dd>
    <dt className="text-muted">Calibration</dt><dd>{a.calibration} effort</dd><dt className="text-muted">Failure</dt><dd className="text-muted">{a.failover}</dd><dt className="text-muted">Regulatory</dt><dd className="text-muted">{a.regulatory}</dd>
    <dt className="text-muted">Vendor claim</dt><dd>{a.maxClaimedAccuracyCm ? `≈${a.maxClaimedAccuracyCm} cm ranging (claim, not robot accuracy)` : 'none captured'}</dd></dl>
}
function PlatSpecs({ p }: { p: Product }) {
  const a = p.plat!
  return <dl className="mt-3 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 border-t border-line pt-3 text-sm">
    <dt className="text-muted">Kind</dt><dd>{{ 'complete-kit': 'Complete kit', 'chassis-kit': 'Chassis kit (needs electronics)', 'bare-chassis': 'Bare chassis' }[a.kind]}</dd><dt className="text-muted">Drive</dt><dd>{a.drive}</dd>
    <dt className="text-muted">Payload</dt><dd>{a.payloadKg == null ? <span className="text-warn">not published</span> : `${a.payloadKg} kg`}</dd><dt className="text-muted">Motor voltage</dt><dd>{a.motorVoltage ? `${a.motorVoltage} V` : <span className="text-warn">unknown</span>}</dd>
    <dt className="text-muted">Encoders</dt><dd>{{ included: 'Included', 'optional-accessory': 'Optional accessory', incompatible: 'Not compatible (per page)', unconfirmed: 'Not confirmed' }[a.encoders]}</dd>
    <dt className="text-muted">Host support</dt><dd>{a.hostSupport.join(', ')}</dd><dt className="text-muted">Mounting area</dt><dd>{a.mountArea}/5, rigidity {a.rigidity}/5{a.hasRails ? ', rails' : ''}</dd></dl>
}
