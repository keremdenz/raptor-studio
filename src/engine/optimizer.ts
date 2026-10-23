import type { Config, Product, Slot } from '../types'
import { catalog, getProduct, SLOTS } from '../data/catalog'
import { computeCost, effectivePrice } from './cost'
import { evaluate, countBySeverity } from './compat'
import { selectProduct } from './config'

export interface Suggestion {
  slot: Slot; from: Product; to: Product; saving: number; criticalDelta: number; missingDelta: number; note: string
}

/** Cheaper alternatives for the currently selected single-choice parts. Never applied automatically. */
export function suggestSavings(cfg: Config): Suggestion[] {
  const base = computeCost(cfg)
  const baseCount = countBySeverity(evaluate(cfg))
  const out: Suggestion[] = []
  for (const it of cfg.items) {
    const meta = SLOTS[it.slot]
    if (!meta.single || it.slot === 'prohibited') continue
    const from = getProduct(it.productId)
    if (!from) continue
    const fromPrice = effectivePrice(from, cfg).price
    if (fromPrice == null) continue
    for (const to of catalog) {
      if (to.id === from.id || !to.slots.includes(it.slot)) continue
      const tp = effectivePrice(to, cfg).price
      if (tp == null || tp >= fromPrice) continue
      const alt = selectProduct(cfg, it.slot, to.id, it.qty)
      const cost = computeCost(alt)
      const saving = base.total - cost.total
      if (saving <= 0.005) continue
      const counts = countBySeverity(evaluate(alt))
      const criticalDelta = counts.critical - baseCount.critical
      const missingDelta = counts.missing - baseCount.missing
      if (criticalDelta > 0 || missingDelta > 0) continue
      out.push({ slot: it.slot, from, to, saving, criticalDelta, missingDelta, note: missingDelta > 0 ? `Creates ${missingDelta} new missing-part warning${missingDelta > 1 ? 's' : ''}.` : missingDelta < 0 ? 'Also resolves a missing-part warning.' : 'No new blocking warnings.' })
    }
  }
  return out.sort((a, b) => b.saving - a.saving).slice(0, 8)
}
