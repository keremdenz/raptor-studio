import type { Capability, Config, Product, Slot } from '../types'
import { catalog } from '../data/catalog'
import { effectivePrice } from './cost'

export interface EffPart { label: string; price: number | null; hint?: boolean; included?: boolean }
export interface EffCost { total: number | null; parts: EffPart[]; basis: string }

/** Hint prices are only used for generic parts; a branded product with an unknown price stays out of the estimate. */
const priceOrHint = (p: Product, cfg: Config) => { const e = effectivePrice(p, cfg).price; return e != null ? { v: e, hint: false } : p.priceHint && p.brand === 'Generic' ? { v: p.priceHint.price, hint: true } : null }

function cheapest(slot: Slot, cfg: Config, ok: (p: Product) => boolean = () => true) {
  let best: { p: Product; v: number; hint: boolean } | null = null
  for (const p of catalog) {
    if (!p.slots.includes(slot) || !ok(p)) continue
    const x = priceOrHint(p, cfg)
    if (x && (!best || x.v < best.v)) best = { p, v: x.v, hint: x.hint }
  }
  return best
}

/**
 * "Effective complete-system cost" puts differently-equipped products on equal footing:
 * product price + cheapest known (or hinted) parts for what it lacks. The basis is shown to the user.
 */
export function effectiveCost(p: Product, cfg: Config): EffCost {
  const parts: EffPart[] = []
  const own = priceOrHint(p, cfg)
  parts.push({ label: p.name, price: own?.v ?? null, hint: own?.hint })
  const addCap = (cap: Capability, slot: Slot, label: string, have: boolean, qty = 1) => {
    if (have) { parts.push({ label: `${label} (included)`, price: 0, included: true }); return }
    const c = cheapest(slot, cfg, (x) => x.provides.includes(cap))
    parts.push({ label: `${label}: ${c?.p.name ?? 'no priced option'}${qty > 1 ? ` ×${qty}` : ''}`, price: c ? c.v * qty : null, hint: c?.hint })
  }
  const has = (c: Capability) => p.provides.includes(c)
  let basis = ''
  if (p.slots.includes('platform') && p.plat) {
    basis = 'Chassis + cheapest motor driver, IMU, battery holder/cells, 5 V supply, camera, Linux computer and e-stop that it does not include.'
    addCap('motor-driver', 'motor-driver', 'Motor driver', has('motor-driver'))
    addCap('imu', 'imu', 'IMU', has('imu'))
    addCap('battery-holder', 'battery', 'Battery holder', has('battery-holder'))
    const cells = p.plat.cells?.count ?? 2
    addCap('battery-cells', 'battery', 'Cells', false, cells)
    addCap('dc-dc-5v', 'converter', '5 V supply', has('dc-dc-5v'))
    addCap('camera', 'camera', 'Camera', has('camera'))
    addCap('linux-computer', 'processor', 'Linux computer', has('linux-computer'))
    addCap('estop', 'safety', 'Emergency stop', false)
  } else if (p.slots.includes('processor') && p.proc) {
    basis = 'Board + cheapest camera it supports + 5 V regulator for its supply current (if it has no VIN input).'
    if (p.proc.cameraSupport.integrated === 'yes') parts.push({ label: 'Camera (integrated)', price: 0, included: true })
    else {
      const sup = (x: Product) => !!x.cam && (p.proc!.cameraSupport[x.cam.iface] === 'yes')
      const c = cheapest('camera', cfg, sup)
      parts.push({ label: `Camera: ${c?.p.name ?? 'none verified compatible'}`, price: c?.v ?? null, hint: c?.hint })
    }
    if (!p.proc.vinDirect && p.proc.kind !== 'mcu-vision') {
      const need = p.proc.supply5vA ?? 0
      const c = cheapest('converter', cfg, (x) => (x.pwr?.outputMaxA ?? 0) >= need)
      parts.push({ label: `5 V regulator ≥ ${need} A: ${c?.p.name ?? 'no priced option'}`, price: c?.v ?? null, hint: c?.hint })
    }
    if (/^none/i.test(p.proc.wifi)) parts.push({ label: 'Wi-Fi dongle (not priced)', price: null })
  } else if (p.slots.includes('camera') && p.cam) {
    basis = 'Camera + any unpriced accessories (lens, cable).'
    for (const n of p.needs ?? []) parts.push({ label: n.label, price: n.price })
  } else if (p.slots.includes('uwb-anchor') && p.uwb) {
    basis = '4 anchors + 1 tag of this model plus implied supporting parts.'
    parts[0] = { label: `${p.name} × 5`, price: own ? own.v * 5 : null, hint: own?.hint }
    for (const n of p.needs ?? []) parts.push({ label: `${n.label} × 5`, price: n.price == null ? null : n.price * 5 })
  } else if (p.needs?.length) {
    basis = 'Product + implied parts.'
    for (const n of p.needs) parts.push({ label: n.label, price: n.price })
  } else basis = 'Product price only.'
  const total = parts.some((x) => x.price == null) ? null : parts.reduce((s, x) => s + (x.price ?? 0), 0)
  return { total, parts, basis }
}
