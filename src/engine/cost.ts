import type { BomLine, Capability, Config, CostSummary, PriceStatus, Product, Slot } from '../types'
import { BOM_GROUP, GROUPS, SLOTS } from '../data/catalog'
import { buildContext, type Ctx } from './context'

export type PriceSource = 'override' | 'observed' | 'catalog' | 'unknown'

export function effectivePrice(p: Product, cfg: Config): { price: number | null; source: PriceSource } {
  if (p.id in cfg.priceOverrides) {
    const v = cfg.priceOverrides[p.id]
    return { price: v == null || Number.isNaN(Number(v)) ? null : Number(v), source: 'override' }
  }
  if (cfg.settings.priceBasis === 'observed' && p.observed) return { price: p.observed.price, source: 'observed' }
  if (p.price == null) return { price: null, source: 'unknown' }
  return { price: p.price, source: 'catalog' }
}

export const CAP_LABEL: Partial<Record<Capability, string>> = {
  imu: 'IMU', 'motor-driver': 'Motor driver', 'motor-mcu': 'Motor-control MCU (ESP32/other)', 'power-monitor': 'Power monitor', encoders: 'Wheel encoders', 'battery-holder': 'Battery holder / UPS module',
  camera: 'Camera', 'linux-computer': 'Linux onboard computer', 'power-switch': 'Power switch', 'dc-dc-5v': '5 V supply for host computer', ultrasonic: 'Ultrasonic module (prohibited class)',
}
/** capability → slot whose purchase would duplicate it */
export const CAP_SLOT: Partial<Record<Capability, Slot>> = {
  imu: 'imu', 'motor-driver': 'motor-driver', 'power-monitor': 'power-monitor', encoders: 'odometry', camera: 'camera', 'linux-computer': 'processor', 'dc-dc-5v': 'converter', 'motor-mcu': 'controller',
}
const CAP_INCLUDED_SHOWN: Capability[] = ['imu', 'motor-driver', 'motor-mcu', 'power-monitor', 'encoders', 'camera', 'battery-holder', 'linux-computer', 'power-switch', 'dc-dc-5v', 'ultrasonic']

const verLabel = (s: PriceStatus | undefined, source: PriceSource, p?: Product): string => {
  if (source === 'override') return 'Manual price'
  if (source === 'observed') return 'Distributor listing (observed)'
  if (s === 'page-verified') return 'Price matches seller page'
  if (s === 'unknown') return 'Price unknown'
  return p?.priceHint ? 'Preliminary / hint only' : 'Preliminary — unverified'
}

/** Capability duplicated by a selected product relative to what the kit/host already provides. */
function duplicateOf(ctx: Ctx, slot: Slot, p: Product): Capability | undefined {
  for (const c of p.provides) {
    if (CAP_SLOT[c] !== slot) continue
    const k = ctx.kit.get(c)
    if (k && k.product.id !== p.id) return c
  }
  return undefined
}

export function computeCost(cfg: Config): CostSummary {
  const ctx = buildContext(cfg)
  const lines: BomLine[] = []
  const designMissing: string[] = []

  // 1. selected purchases
  const merged = new Map<string, BomLine>()
  for (const slot of Object.keys(ctx.bySlot) as Slot[]) {
    if (slot === 'prohibited') continue
    for (const { item, product: p } of ctx.bySlot[slot]) {
      const { price, source } = effectivePrice(p, cfg)
      const dup = duplicateOf(ctx, slot, p)
      const role = slot === 'uwb-anchor' ? `${item.qty} anchor${item.qty > 1 ? 's' : ''}` : slot === 'uwb-tag' ? `${item.qty} tag${item.qty > 1 ? 's' : ''}` : undefined
      const reqBase = SLOTS[slot].required
      const key = p.id
      const existing = merged.get(key)
      if (existing) {
        existing.qty += item.qty
        existing.roles = [existing.roles, role].filter(Boolean).join(' + ')
        existing.ext = existing.unitPrice == null ? null : existing.unitPrice * existing.qty
        continue
      }
      const line: BomLine = {
        key, kind: 'purchase', category: BOM_GROUP[slot], slot, productId: p.id, label: p.name, brand: p.brand, model: p.variant, qty: item.qty, unitPrice: price,
        ext: price == null ? null : price * item.qty, required: dup ? false : reqBase, seller: p.seller, url: p.url, priceStatus: source === 'override' ? 'manual' : p.priceStatus,
        verification: verLabel(p.priceStatus, source, p), priority: cfg.priority[p.id] ?? p.purchasePriority ?? 'before-integration', roles: role, duplicate: !!dup,
        note: dup ? `Kit already includes ${CAP_LABEL[dup] ?? dup}; this is an optional ${slot === 'processor' ? 'extra computer' : 'replacement/upgrade'}.` : p.priceNote,
      }
      merged.set(key, line)
    }
  }
  lines.push(...merged.values())

  // 2. implied parts (e.g. bare UWB module needs a PCB)
  for (const slot of Object.keys(ctx.bySlot) as Slot[]) {
    for (const { item, product: p } of ctx.bySlot[slot]) {
      for (const n of p.needs ?? []) {
        const qty = item.qty * n.perUnit
        lines.push({
          key: `need:${p.id}:${n.label}`, kind: 'implied', category: BOM_GROUP[slot], slot, productId: p.id, label: n.label, qty, unitPrice: n.price, ext: n.price == null ? null : n.price * qty,
          required: true, verification: n.price == null ? 'Price unknown' : 'Estimate', priority: 'before-integration', note: `Implied by ${p.name}`,
        })
      }
    }
  }

  // 3. included-in-kit lines at $0
  for (const c of CAP_INCLUDED_SHOWN) {
    const k = ctx.kit.get(c)
    if (!k) continue
    const dupSelected = ctx.extra.get(c)?.length
    lines.push({
      key: `inc:${c}`, kind: 'included', category: k.product === ctx.processor ? 'Processor' : 'Robot platform', slot: k.product === ctx.processor ? 'processor' : 'platform',
      productId: k.product.id, label: CAP_LABEL[c] ?? c, qty: 1, unitPrice: 0, ext: 0, required: false, includedIn: k.product.name,
      reason: `Already included in ${k.product.name}${k.product.variant ? ` (${k.product.variant})` : ''} — $0 incremental cost.${dupSelected ? ' You also selected a separate part; see the optional line above.' : ''}`,
      verification: k.unverified ? 'Inclusion unverified — check source' : 'From product listing', priority: 'before-integration', note: k.unverified,
    })
  }

  // 4. custom items
  for (const ci of cfg.customItems) {
    lines.push({
      key: `custom:${ci.id}`, kind: 'custom', category: ci.category || 'Additional electronics', label: ci.label, qty: ci.qty, unitPrice: ci.unitPrice, ext: ci.unitPrice == null ? null : ci.unitPrice * ci.qty,
      required: ci.required, verification: ci.unitPrice == null ? 'Price unknown' : 'Manual entry', priority: 'before-integration', note: ci.note,
    })
  }

  // 5. mandatory gaps (design completeness, not price completeness)
  if (!ctx.platform) designMissing.push('Robot platform')
  if (!ctx.anchors || ctx.anchors.qty < 4) designMissing.push('Four UWB anchors')
  if (!ctx.tag) designMissing.push('UWB tag')
  if (!ctx.processor && !ctx.has('linux-computer')) designMissing.push('Onboard processor')
  if (!ctx.has('camera')) designMissing.push('Camera')
  if (!ctx.has('imu')) designMissing.push('IMU')
  if (!ctx.has('motor-driver')) designMissing.push('Motor driver')
  if (!ctx.has('battery-cells')) designMissing.push('Battery cells')
  if (!ctx.has('battery-holder')) designMissing.push('Battery holder / pack')
  if (!ctx.has('dc-dc-5v') && !(ctx.processor?.proc?.vinDirect) && ctx.processor && ctx.processor.proc?.kind !== 'mcu-vision') designMissing.push('5 V supply for the onboard computer')

  // 6. totals
  const priced = lines.filter((l) => l.kind !== 'included')
  const unknown = priced.filter((l) => l.ext == null)
  const subtotal = priced.reduce((s, l) => s + (l.ext ?? 0), 0)
  const s = cfg.settings
  const shippingTax = subtotal * (s.shippingTaxPct / 100)
  const contingency = subtotal * (s.contingencyPct / 100)
  const total = subtotal + shippingTax + (s.includeContingencyInTotal ? contingency : 0)
  const totalWithContingency = subtotal + shippingTax + contingency
  const byGroup: Record<string, number> = Object.fromEntries(GROUPS.map((g) => [g, 0]))
  for (const l of priced) byGroup[l.category] = (byGroup[l.category] ?? 0) + (l.ext ?? 0)
  let hintExtra = 0, unresolved = 0
  for (const l of unknown) {
    const p = l.productId ? ctx.bySlot[l.slot ?? 'platform'].find((x) => x.product.id === l.productId)?.product ?? undefined : undefined
    const hint = l.kind === 'purchase' ? (p ?? lookup(ctx, l.productId))?.priceHint?.price : undefined
    if (hint != null) hintExtra += hint * l.qty
    else unresolved++
  }
  const budget = s.budget
  return {
    lines, subtotal, unknownCount: unknown.length, unknownLabels: unknown.map((l) => l.label), shippingTax, contingency, total, totalWithContingency,
    hintSubtotal: subtotal + hintExtra, unresolvedAfterHints: unresolved, remaining: budget - total, utilization: budget > 0 ? total / budget : 0,
    overBudget: total > budget, tight: total <= budget && totalWithContingency > budget, byGroup, designMissing,
  }
}

function lookup(ctx: Ctx, id?: string): Product | undefined {
  if (!id) return undefined
  for (const slot of Object.keys(ctx.bySlot) as Slot[]) { const f = ctx.bySlot[slot].find((x) => x.product.id === id); if (f) return f.product }
  return undefined
}

export const money = (n: number | null | undefined, digits = 2): string => (n == null ? '—' : `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`)

/** Human status for the total line. Never claims completeness when prices or parts are missing. */
export function totalStatus(c: CostSummary): { label: string; tone: 'ok' | 'warn' | 'bad' } {
  if (c.unknownCount > 0) return { label: `Total is incomplete — ${c.unknownCount} missing price${c.unknownCount > 1 ? 's' : ''}`, tone: 'bad' }
  if (c.designMissing.length > 0) return { label: `Design incomplete — ${c.designMissing.length} mandatory part${c.designMissing.length > 1 ? 's' : ''} missing`, tone: 'warn' }
  if (c.overBudget) return { label: 'Over budget', tone: 'bad' }
  if (c.tight) return { label: 'Within budget, reserve exceeded', tone: 'warn' }
  return { label: 'Complete and within budget', tone: 'ok' }
}
