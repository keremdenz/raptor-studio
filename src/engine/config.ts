import type { Config, Settings, SelectedItem, Slot, Product, StreamSettings, PowerAssumptions } from '../types'
import { SLOTS, getProduct } from '../data/catalog'

export const DEFAULT_BUDGET = 350

export const defaultSettings = (): Settings => ({
  budget: DEFAULT_BUDGET, shippingTaxPct: 10, contingencyPct: 5, priceBasis: 'preliminary', includeContingencyInTotal: false,
})
export const defaultStream = (): StreamSettings => ({ width: 1280, height: 720, fps: 30, mbps: 2 })
export const defaultPower = (): PowerAssumptions => ({ motorAvgA: 0.8, computeW: 6, sensorsW: 1.5, usablePct: 80, capacityMah: 3000 })

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function createConfig(name = 'Untitled RAPTOR', owner = ''): Config {
  const now = new Date().toISOString()
  return {
    id: uid(), name, owner, schema: 1, createdAt: now, updatedAt: now, items: [], goals: [], settings: defaultSettings(),
    priceOverrides: {}, customItems: [], notes: {}, procurement: {}, priority: {}, evidence: {}, riskEdits: {},
    stream: defaultStream(), power: defaultPower(),
  }
}

export function touch(c: Config): Config { return { ...c, updatedAt: new Date().toISOString() } }

export const defaultQty = (slot: Slot, p: Product): number => {
  if (slot === 'uwb-anchor') return 4
  if (slot === 'uwb-tag') return 1
  return p.defaultQty ?? 1
}

/** Select a product for a slot. Single-choice slots replace the existing choice. */
export function selectProduct(cfg: Config, slot: Slot, productId: string, qty?: number): Config {
  const p = getProduct(productId)
  if (!p || !p.slots.includes(slot) || slot === 'prohibited') return cfg
  const meta = SLOTS[slot]
  const q = Math.max(1, Math.round(qty ?? defaultQty(slot, p)))
  let items: SelectedItem[]
  if (meta.single) items = [...cfg.items.filter((i) => i.slot !== slot), { slot, productId, qty: q }]
  else if (cfg.items.some((i) => i.slot === slot && i.productId === productId)) items = cfg.items
  else items = [...cfg.items, { slot, productId, qty: q }]
  return touch({ ...cfg, items })
}

export function removeProduct(cfg: Config, slot: Slot, productId: string): Config {
  return touch({ ...cfg, items: cfg.items.filter((i) => !(i.slot === slot && i.productId === productId)) })
}

export function toggleProduct(cfg: Config, slot: Slot, productId: string): Config {
  return cfg.items.some((i) => i.slot === slot && i.productId === productId) ? removeProduct(cfg, slot, productId) : selectProduct(cfg, slot, productId)
}

export function setQty(cfg: Config, slot: Slot, productId: string, qty: number): Config {
  const q = Math.max(1, Math.min(99, Math.round(qty) || 1))
  return touch({ ...cfg, items: cfg.items.map((i) => (i.slot === slot && i.productId === productId ? { ...i, qty: q } : i)) })
}

export const itemsFor = (cfg: Config, slot: Slot): SelectedItem[] => cfg.items.filter((i) => i.slot === slot)
export const isSelected = (cfg: Config, slot: Slot, id: string): boolean => cfg.items.some((i) => i.slot === slot && i.productId === id)

/** Validates and normalises an untrusted object (import / share link) into a Config. */
export function normalizeConfig(raw: unknown): Config {
  if (!raw || typeof raw !== 'object') throw new Error('Not a configuration object')
  const r = raw as Partial<Config>
  if (!Array.isArray(r.items)) throw new Error('Configuration has no item list')
  const base = createConfig(typeof r.name === 'string' ? r.name : 'Imported configuration')
  const items: SelectedItem[] = []
  for (const it of r.items) {
    if (!it || typeof it.productId !== 'string' || typeof it.slot !== 'string') continue
    if (!(it.slot in SLOTS)) continue
    items.push({ slot: it.slot as Slot, productId: it.productId, qty: Math.max(1, Math.min(99, Math.round(Number(it.qty)) || 1)) })
  }
  const rec = <T,>(v: unknown): Record<string, T> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, T>) : {})
  return {
    ...base,
    id: typeof r.id === 'string' && r.id ? r.id : base.id,
    owner: typeof r.owner === 'string' ? r.owner : '',
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : base.createdAt,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : base.updatedAt,
    items,
    goals: Array.isArray(r.goals) ? r.goals.filter((g): g is string => typeof g === 'string') : [],
    settings: { ...base.settings, ...(r.settings ?? {}) },
    priceOverrides: rec(r.priceOverrides),
    customItems: Array.isArray(r.customItems) ? r.customItems.filter((c) => c && typeof c.label === 'string') : [],
    notes: rec(r.notes), procurement: rec(r.procurement), priority: rec(r.priority), evidence: rec(r.evidence), riskEdits: rec(r.riskEdits),
    stream: { ...base.stream, ...(r.stream ?? {}) }, power: { ...base.power, ...(r.power ?? {}) },
  }
}

export function duplicateConfig(c: Config, name?: string): Config {
  return { ...JSON.parse(JSON.stringify(c)), id: uid(), name: name ?? `${c.name} (copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
}
