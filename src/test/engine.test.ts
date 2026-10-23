import { describe, expect, it } from 'vitest'
import { catalog } from '../data/catalog'
import { PRESETS } from '../data/presets'
import { evaluate } from '../engine/compat'
import { createConfig, normalizeConfig, selectProduct, setQty } from '../engine/config'
import { computeCost, totalStatus } from '../engine/cost'
import { bomToCsv, configFromJson, configToJson } from '../engine/exporters'
import { presetConfig } from '../engine/presets'
import { evaluateRequirements } from '../engine/requirements'
import { decodeShare, encodeShare } from '../engine/share'
import { evaluateGoals } from '../engine/upgrades'
import { suggestSavings } from '../engine/optimizer'
import { estimateStream } from '../engine/streaming'
import type { Config } from '../types'

const base = (): Config => createConfig('test')
const sel = (c: Config, slot: Parameters<typeof selectProduct>[1], id: string, q?: number) => selectProduct(c, slot, id, q)
const ids = (c: Config) => evaluate(c).map((f) => f.id)
const line = (c: Config, id: string) => computeCost(c).lines.find((l) => l.productId === id && l.kind === 'purchase')

describe('catalog integrity', () => {
  it('has unique ids and every preset item exists in its slot', () => {
    expect(new Set(catalog.map((p) => p.id)).size).toBe(catalog.length)
    for (const pr of PRESETS) for (const [slot, id] of pr.items) {
      const p = catalog.find((x) => x.id === id)
      expect(p, `${pr.id}:${id}`).toBeTruthy()
      expect(p!.slots, `${pr.id}:${id}`).toContain(slot)
    }
  })
  it('never gives a null/unknown price the status "page-verified"', () => {
    for (const p of catalog) if (p.price == null) expect(p.priceStatus).toBe('unknown')
  })
  it('keeps prohibited sensors out of selectable slots', () => {
    for (const p of catalog.filter((x) => x.tags.includes('prohibited'))) expect(p.slots).toEqual(['prohibited'])
  })
})

describe('Test 1 — UWB quantities', () => {
  it('four Qorvo anchors + one Qorvo tag = five units, $147.50 (preliminary)', () => {
    let c = sel(base(), 'uwb-anchor', 'qorvo-dwm3001cdk', 4)
    c = sel(c, 'uwb-tag', 'qorvo-dwm3001cdk', 1)
    const l = line(c, 'qorvo-dwm3001cdk')!
    expect(l.qty).toBe(5)
    expect(l.ext).toBeCloseTo(147.5)
    expect(l.roles).toContain('anchor')
    expect(l.roles).toContain('tag')
  })
  it('mixed MaUWB set (4 chipset + 1 direct) totals $198.40 plus unpriced anchor power parts', () => {
    let c = sel(base(), 'uwb-anchor', 'mk-mauwb-chipset', 4)
    c = sel(c, 'uwb-tag', 'mk-mauwb-direct', 1)
    const cost = computeCost(c)
    const priced = cost.lines.filter((l) => l.kind === 'purchase').reduce((s, l) => s + (l.ext ?? 0), 0)
    expect(priced).toBeCloseTo(198.4)
    expect(cost.unknownCount).toBeGreaterThan(0)
  })
  it('flags fewer than four anchors and mismatched families', () => {
    let c = sel(base(), 'uwb-anchor', 'mk-mauwb-chipset', 3)
    c = sel(c, 'uwb-tag', 'mk-mauwb-dsto-direct')
    const f = ids(c)
    expect(f).toContain('uwb-anchors-few')
    expect(f).toContain('uwb-family-mismatch')
    expect(setQty(c, 'uwb-anchor', 'mk-mauwb-chipset', 4).items.find((i) => i.slot === 'uwb-anchor')!.qty).toBe(4)
  })
})

describe('Test 2 — kit inclusion & duplicates', () => {
  it('WAVE ROVER IMU is $0 included and not added to cost', () => {
    const c = sel(base(), 'platform', 'wave-rover')
    const cost = computeCost(c)
    const inc = cost.lines.find((l) => l.kind === 'included' && l.label === 'IMU')!
    expect(inc.ext).toBe(0)
    expect(inc.reason).toMatch(/\$0 incremental/)
    expect(cost.designMissing).not.toContain('IMU')
    expect(ids(c)).not.toContain('imu-missing')
  })
  it('selecting an IMU anyway becomes an optional duplicate with a visible price', () => {
    const c = sel(sel(base(), 'platform', 'wave-rover'), 'imu', 'imu-bno085')
    const l = line(c, 'imu-bno085')!
    expect(l.required).toBe(false)
    expect(l.duplicate).toBe(true)
    expect(l.ext).toBeCloseTo(29.5)
    expect(ids(c)).toContain('imu-duplicate')
  })
  it('a bundle with a computer makes a second computer a duplicate', () => {
    const c = sel(sel(base(), 'platform', 'rasprover-kit'), 'processor', 'pi4-2gb')
    expect(line(c, 'pi4-2gb')!.duplicate).toBe(true)
  })
})

describe('Test 3 — bare chassis', () => {
  it('reports missing motor driver and bare-chassis integration work', () => {
    const c = sel(base(), 'platform', 'black-gladiator')
    const f = ids(c)
    expect(f).toContain('driver-missing')
    expect(f).toContain('platform-bare')
    expect(computeCost(c).designMissing).toContain('Motor driver')
    expect(ids(sel(c, 'motor-driver', 'tb6612'))).not.toContain('driver-missing')
  })
})

describe('Test 4 — camera/processor compatibility', () => {
  it('Pi camera on Orange Pi is a critical incompatibility', () => {
    const c = sel(sel(base(), 'processor', 'orangepi-3b-2gb'), 'camera', 'rpi-cam3-wide')
    expect(evaluate(c).find((f) => f.id === 'cam-incompatible')?.severity).toBe('critical')
  })
  it('Pi camera on Arduino UNO Q is unverified; USB camera is fine', () => {
    const a = sel(sel(base(), 'processor', 'arduino-uno-q'), 'camera', 'rpi-cam3')
    expect(evaluate(a).find((f) => f.id === 'cam-unverified')?.severity).toBe('validation')
    const b = sel(sel(base(), 'processor', 'arduino-uno-q'), 'camera', 'logitech-c270')
    expect(ids(b)).not.toContain('cam-unverified')
    expect(ids(b)).not.toContain('cam-incompatible')
  })
  it('Raspberry Pi hosts support Pi cameras; ESP32-P4X-EYE counts its integrated camera', () => {
    expect(ids(sel(sel(base(), 'processor', 'pi4-2gb'), 'camera', 'rpi-cam3'))).not.toContain('cam-incompatible')
    expect(ids(sel(base(), 'processor', 'esp32-p4x-eye'))).not.toContain('camera-missing')
  })
  it('Pi 5 is flagged as lacking a hardware H.264 encoder; Pi 4 is not', () => {
    expect(ids(sel(base(), 'processor', 'pi5-2gb'))).toContain('proc-sw-encode')
    expect(ids(sel(base(), 'processor', 'pi4-2gb'))).not.toContain('proc-sw-encode')
  })
  it('kit control board for Raspberry Pi rejects a non-Pi host', () => {
    const c = sel(sel(base(), 'platform', 'freenove-4wd'), 'processor', 'orangepi-3b-2gb')
    expect(evaluate(c).find((f) => f.id === 'platform-host-mismatch')?.severity).toBe('critical')
  })
})

describe('Test 5 — unknown prices', () => {
  it('never reports a complete total when a price is unknown', () => {
    const c = sel(base(), 'processor', 'luckfox-pico-max')
    const cost = computeCost(c)
    expect(cost.unknownCount).toBe(1)
    expect(cost.unknownLabels).toContain('Luckfox Pico Max')
    expect(totalStatus(cost).label).toMatch(/incomplete/i)
    expect(cost.subtotal).toBe(0)
  })
  it('a manual price override completes it, and hint totals are tracked separately', () => {
    let c = sel(base(), 'processor', 'luckfox-pico-max')
    expect(computeCost(c).hintSubtotal).toBeCloseTo(14.99)
    c = { ...c, priceOverrides: { 'luckfox-pico-max': 18 } }
    const cost = computeCost(c)
    expect(cost.unknownCount).toBe(0)
    expect(cost.subtotal).toBe(18)
  })
})

describe('Test 6/7 — live totals and budget flag', () => {
  it('adding a sensor updates BOM and total immediately', () => {
    const c0 = sel(base(), 'platform', 'wave-rover')
    const c1 = sel(c0, 'odometry', 'romi-encoders')
    expect(computeCost(c1).subtotal - computeCost(c0).subtotal).toBeCloseTo(9.95)
    expect(computeCost(c1).byGroup['Sensors']).toBeCloseTo(9.95)
  })
  it('flags a design over $350 and respects a changed budget', () => {
    let c = presetConfig(PRESETS.find((p) => p.id === 'expansion')!)
    expect(computeCost(c).overBudget).toBe(true)
    c = { ...c, settings: { ...c.settings, budget: 1000 } }
    expect(computeCost(c).overBudget).toBe(false)
  })
  it('allowances are applied to the projected total', () => {
    const c = sel(base(), 'platform', 'wave-rover')
    const cost = computeCost(c)
    expect(cost.shippingTax).toBeCloseTo(8.999, 2)
    expect(cost.total).toBeCloseTo(98.989, 2)
  })
  it('observed-price basis changes totals only when selected', () => {
    let c = sel(base(), 'processor', 'pi4-2gb')
    expect(computeCost(c).subtotal).toBeCloseTo(67.5)
    c = { ...c, settings: { ...c.settings, priceBasis: 'observed' } }
    expect(computeCost(c).subtotal).toBeCloseTo(80)
  })
})

describe('Test 9/10 — import, export, share', () => {
  const c = presetConfig(PRESETS.find((p) => p.id === 'balanced')!)
  it('JSON export round-trips', () => {
    const back = configFromJson(configToJson({ ...c, notes: { x: 'why' }, goals: ['arm'] }))
    expect(back.items).toEqual(c.items)
    expect(back.goals).toEqual(['arm'])
    expect(back.notes.x).toBe('why')
    expect(computeCost(back).subtotal).toBeCloseTo(computeCost(c).subtotal)
  })
  it('share links round-trip', async () => {
    const code = await encodeShare(c)
    expect(code).toMatch(/^[zj]\.[A-Za-z0-9_-]+$/)
    const back = await decodeShare(code)
    expect(back.items).toEqual(c.items)
    expect(back.id).toBe(c.id)
  })
  it('rejects malformed input and drops unknown slots', () => {
    expect(() => normalizeConfig(null)).toThrow()
    expect(() => normalizeConfig({ foo: 1 })).toThrow()
    const n = normalizeConfig({ items: [{ slot: 'nonsense', productId: 'x', qty: 2 }, { slot: 'camera', productId: 'rpi-cam2', qty: 1 }] })
    expect(n.items).toHaveLength(1)
  })
  it('CSV lists purchased and included lines and marks unknown prices', () => {
    const csv = bomToCsv(computeCost(sel(sel(base(), 'platform', 'wave-rover'), 'processor', 'luckfox-pico-max')))
    expect(csv).toContain('Included in WAVE ROVER')
    expect(csv).toContain('UNKNOWN')
    expect(csv.split('\r\n')[0]).toContain('Extended price')
  })
})

describe('Test 15 — prohibited ranging sensors', () => {
  it('cannot be selected through the API', () => {
    const c = selectProduct(base(), 'prohibited', 'p-lidar')
    expect(c.items).toHaveLength(0)
  })
  it('imported configurations containing them are flagged critical', () => {
    const c = normalizeConfig({ items: [{ slot: 'prohibited', productId: 'p-lidar', qty: 1 }] })
    expect(evaluate(c).find((f) => f.id === 'prohibited-p-lidar')?.severity).toBe('critical')
    const reqs = evaluateRequirements(c, evaluate(c))
    expect(reqs.find((r) => r.id === 'R16')!.status).toBe('blocked')
  })
  it('a kit that ships an ultrasonic module needs approval, not a pass', () => {
    const c = sel(base(), 'platform', 'freenove-4wd')
    expect(ids(c)).toContain('kit-ultrasonic')
    expect(evaluateRequirements(c, evaluate(c)).find((r) => r.id === 'R16')!.status).toBe('needs-approval')
  })
})

describe('Requirements honesty', () => {
  it('never shows performance requirements as evidence-recorded without evidence', () => {
    const c = presetConfig(PRESETS.find((p) => p.id === 'balanced')!)
    const rows = evaluateRequirements(c, evaluate(c))
    expect(rows.every((r) => r.status !== 'evidence-recorded')).toBe(true)
    const withEvidence = { ...c, evidence: { R04: { state: 'evidence-recorded' as const, note: '' } } }
    expect(evaluateRequirements(withEvidence, evaluate(withEvidence)).find((r) => r.id === 'R04')!.status).not.toBe('evidence-recorded')
    const real = { ...c, evidence: { R04: { state: 'evidence-recorded' as const, note: 'Run 14, 12 cm RMS' } } }
    expect(evaluateRequirements(real, evaluate(real)).find((r) => r.id === 'R04')!.status).toBe('evidence-recorded')
  })
  it('blocks localization requirements without four anchors', () => {
    const c = sel(base(), 'uwb-anchor', 'qorvo-dwm3001cdk', 3)
    expect(evaluateRequirements(c, evaluate(c)).find((r) => r.id === 'R06')!.status).toBe('blocked')
  })
})

describe('power, goals, optimizer, streaming', () => {
  it('runtime warning only appears with assumptions flagged', () => {
    const c = presetConfig(PRESETS.find((p) => p.id === 'balanced')!)
    const f = evaluate(c).find((x) => x.id === 'runtime')
    if (f) expect(f.title).toMatch(/assumptions/)
  })
  it('robotic-arm goal reports payload margin for the WAVE ROVER', () => {
    const c = { ...presetConfig(PRESETS.find((p) => p.id === 'balanced')!), goals: ['arm'] }
    const g = evaluateGoals(c)[0]
    expect(g.checks.some((k) => k.label === 'Payload margin')).toBe(true)
  })
  it('optimizer proposes cheaper parts but never applies them', () => {
    const c = presetConfig(PRESETS.find((p) => p.id === 'expansion')!)
    const before = JSON.stringify(c.items)
    const s = suggestSavings(c)
    expect(JSON.stringify(c.items)).toBe(before)
    expect(s.every((x) => x.saving > 0)).toBe(true)
  })
  it('stream estimator math', () => {
    const e = estimateStream({ width: 1280, height: 720, fps: 30, mbps: 2 })
    expect(e.mbPerMin).toBeCloseTo(15)
    expect(e.mb20min).toBeCloseTo(300)
    expect(e.gbPerHour).toBeCloseTo(0.9)
  })
})

describe('presets compute from real prices', () => {
  it('every preset evaluates and reports honest status', () => {
    for (const p of PRESETS) {
      const c = presetConfig(p)
      const cost = computeCost(c)
      expect(cost.subtotal).toBeGreaterThan(0)
      if (cost.unknownCount) expect(totalStatus(cost).tone).toBe('bad')
    }
  })
})

describe('Test 8 — persistence', () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }
  it('saved configurations survive a "refresh"', async () => {
    const { loadState, saveState, freshState } = await import('../state/persist')
    const store = mem()
    const s = freshState()
    s.configs[0] = presetConfig(PRESETS[1])
    s.activeId = s.configs[0].id
    expect(saveState(s, store)).toBe(true)
    const back = loadState(store)
    expect(back.activeId).toBe(s.activeId)
    expect(back.configs[0].items).toEqual(s.configs[0].items)
  })
  it('falls back to a fresh state on corrupt storage or when storage throws', async () => {
    const { loadState, saveState, STORAGE_KEY } = await import('../state/persist')
    const bad = mem(); bad.setItem(STORAGE_KEY, '{not json')
    expect(loadState(bad).configs).toHaveLength(1)
    const throwing = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(loadState(throwing).configs).toHaveLength(1)
    expect(saveState(loadState(throwing), throwing)).toBe(false)
  })
})
