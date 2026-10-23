import type { Capability, Config, Product, SelectedItem, Slot } from '../types'
import { getProduct } from '../data/catalog'

export interface CapSource { product: Product; unverified?: string }

/** Everything the rules need, derived once from a configuration. */
export interface Ctx {
  cfg: Config
  bySlot: Record<Slot, { item: SelectedItem; product: Product }[]>
  platform?: Product
  processor?: Product
  anchors?: { product: Product; qty: number }
  tag?: { product: Product; qty: number }
  /** capabilities provided by the platform / processor themselves (kit inclusion) */
  kit: Map<Capability, CapSource>
  /** capabilities provided by separately selected products */
  extra: Map<Capability, CapSource[]>
  has: (c: Capability) => boolean
  first: (s: Slot) => Product | undefined
  qty: (s: Slot) => number
}

const ALL_SLOTS: Slot[] = ['platform', 'uwb-anchor', 'uwb-tag', 'processor', 'controller', 'camera', 'imu', 'odometry', 'extra-sensor', 'battery', 'charger', 'converter', 'power-monitor', 'motor-driver', 'safety', 'wiring', 'upgrade', 'prohibited']

export function buildContext(cfg: Config): Ctx {
  const bySlot = Object.fromEntries(ALL_SLOTS.map((s) => [s, [] as { item: SelectedItem; product: Product }[]])) as Ctx['bySlot']
  for (const item of cfg.items) {
    const product = getProduct(item.productId)
    if (product) bySlot[item.slot]?.push({ item, product })
  }
  const platform = bySlot.platform[0]?.product
  const processor = bySlot.processor[0]?.product
  const kit = new Map<Capability, CapSource>()
  for (const host of [platform, processor]) {
    if (!host) continue
    for (const c of host.provides) if (!kit.has(c)) kit.set(c, { product: host, unverified: host.providesUnverified?.[c] })
  }
  const extra = new Map<Capability, CapSource[]>()
  for (const s of ALL_SLOTS) {
    if (s === 'platform' || s === 'processor') continue
    for (const { product } of bySlot[s]) for (const c of product.provides) extra.set(c, [...(extra.get(c) ?? []), { product, unverified: product.providesUnverified?.[c] }])
  }
  const a = bySlot['uwb-anchor'][0], t = bySlot['uwb-tag'][0]
  return {
    cfg, bySlot, platform, processor,
    anchors: a ? { product: a.product, qty: a.item.qty } : undefined,
    tag: t ? { product: t.product, qty: t.item.qty } : undefined,
    kit, extra,
    has: (c) => kit.has(c) || extra.has(c),
    first: (s) => bySlot[s][0]?.product,
    qty: (s) => bySlot[s].reduce((n, x) => n + x.item.qty, 0),
  }
}
