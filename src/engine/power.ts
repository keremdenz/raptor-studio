import type { Config, Slot } from '../types'
import { buildContext, type Ctx } from './context'

/** Default per-unit masses (g) used only when a product has no `massG`. Documented assumptions, editable in code. */
export const SLOT_MASS_G: Partial<Record<Slot, number>> = {
  processor: 50, controller: 15, camera: 15, imu: 3, odometry: 10, 'extra-sensor': 15, converter: 25, 'power-monitor': 3, 'motor-driver': 10, safety: 20, wiring: 80,
  'uwb-tag': 30, charger: 0, battery: 0, upgrade: 0,
}
const TAG_MASS_OVERRIDE: Record<string, number> = { 'mk-mauwb-direct': 50, 'mk-mauwb-dsto-direct': 50 }

export interface PayloadEstimate { grams: number; limitG: number | null; fraction: number | null; items: { label: string; grams: number; assumed: boolean }[] }

export function estimatePayload(ctx: Ctx): PayloadEstimate {
  const items: PayloadEstimate['items'] = []
  for (const slot of Object.keys(ctx.bySlot) as Slot[]) {
    if (slot === 'platform' || slot === 'uwb-anchor' || slot === 'prohibited') continue
    for (const { item, product } of ctx.bySlot[slot]) {
      const known = product.massG ?? TAG_MASS_OVERRIDE[product.id]
      const per = known ?? SLOT_MASS_G[slot] ?? 0
      if (per > 0) items.push({ label: `${product.name} × ${item.qty}`, grams: per * item.qty, assumed: known == null })
    }
  }
  // kit-supplied cells (mass counts even though not a purchase)
  const cells = ctx.platform?.plat?.cells
  if (cells && !ctx.bySlot.battery.some((b) => b.product.provides.includes('battery-cells'))) items.push({ label: `${cells.label} (assumed to be fitted)`, grams: cells.count * 47, assumed: true })
  const grams = items.reduce((s, i) => s + i.grams, 0)
  const limitG = ctx.platform?.plat?.payloadKg != null ? ctx.platform.plat.payloadKg * 1000 : null
  return { grams, limitG, fraction: limitG ? grams / limitG : null, items }
}

export interface PowerEval {
  packV: number | null; cells: number; capacityMah: number; energyWh: number | null; loadW: number | null; runtimeMin: number | null
  motorW: number | null; assumptions: string[]
}

export function evaluatePower(cfg: Config, ctx = buildContext(cfg)): PowerEval {
  const a = cfg.power
  const selCells = ctx.bySlot.battery.filter((b) => b.product.provides.includes('battery-cells')).reduce((n, b) => n + b.item.qty, 0)
  const kitCells = ctx.platform?.plat?.cells
  const cells = selCells || kitCells?.count || 0
  const holder = ctx.bySlot.battery.find((b) => b.product.provides.includes('battery-holder'))?.product
  const packV = kitCells && !selCells ? kitCells.nominalV : holder?.pwr?.voltageNominal ?? (kitCells ? kitCells.nominalV : cells ? cells * 3.7 : null)
  const assumptions = [
    `Cell capacity ${a.capacityMah} mAh (assumed — edit below)`, `Average motor current ${a.motorAvgA} A at pack voltage (assumed)`, `Onboard computer ${a.computeW} W, sensors/UWB ${a.sensorsW} W (assumed)`, `${a.usablePct}% of capacity usable (assumed)`,
    'Cells in series: capacity equals one cell; no converter losses beyond the usable fraction',
  ]
  if (!packV || !cells) return { packV: packV ?? null, cells, capacityMah: a.capacityMah, energyWh: null, loadW: null, runtimeMin: null, motorW: null, assumptions }
  const energyWh = (packV * a.capacityMah) / 1000
  const motorW = a.motorAvgA * packV
  const loadW = motorW + a.computeW + a.sensorsW
  const runtimeMin = ((energyWh * a.usablePct) / 100 / loadW) * 60
  return { packV, cells, capacityMah: a.capacityMah, energyWh, loadW, runtimeMin, motorW, assumptions }
}
