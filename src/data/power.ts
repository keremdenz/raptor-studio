import type { Product } from '../types'
import { CHECK_DATE, product as P } from './helpers'

const AD = 'https://www.adafruit.com/images/480x360'
const PO = 'https://a.pololu-files.com/picture'
const est = [{ label: 'Team estimate (generic part — pick a seller and replace the price)', kind: 'team-estimate' as const }]

export const power: Product[] = [
  P({
    id: 'cell-18650', slots: ['battery'], name: '18650 Li-ion cell (protected, generic)', brand: 'Generic', price: null,
    priceHint: { price: 5, note: 'Typical protected 18650 price — team estimate, not a quote. Buy genuine cells from a reputable seller.' }, defaultQty: 3,
    summary: 'Single 3.7 V Li-ion cell. Capacity below is an assumption (3000 mAh) used for runtime estimates only.',
    pros: ['Used by Waveshare and Freenove kits', 'High energy density', 'Replaceable'], cons: ['No specific cell chosen: price and real capacity unknown', 'Li-ion safety: protection circuit and correct charger required', 'Battery shipping restrictions'],
    specs: [['Nominal voltage', '3.7 V'], ['Capacity (assumed)', '3000 mAh']], includes: ['1 cell'], excludes: ['Holder', 'Charger'], provides: ['battery-cells'], pwr: { voltageNominal: 3.7, capacityMah: 3000 }, massG: 47,
    sources: est, raptorStatus: 'requires-validation', raptorNote: 'Verify real capacity and discharge rating; measure runtime.', tags: ['battery', 'li-ion'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'holder-18650-3s', slots: ['battery'], name: '3 × 18650 series holder', brand: 'Generic', price: null, priceHint: { price: 3, note: 'Typical holder price — team estimate.' },
    summary: 'Series holder for 11.1 V nominal. Not needed when the platform provides one.', pros: ['Cheap'], cons: ['Part not chosen', 'No protection circuit'], specs: [['Configuration', '3S']], includes: ['Holder'], excludes: ['Cells'],
    provides: ['battery-holder'], pwr: { voltageNominal: 11.1 }, sources: est, raptorStatus: 'compatible-in-principle', raptorNote: 'Duplicate if the platform already has a battery holder.', tags: ['battery'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'holder-18650-2s', slots: ['battery'], name: '2 × 18650 series holder', brand: 'Generic', price: null, priceHint: { price: 2, note: 'Typical holder price — team estimate.' },
    summary: 'Series holder for 7.4 V nominal.', pros: ['Cheap'], cons: ['Part not chosen', 'No protection circuit'], specs: [['Configuration', '2S']], includes: ['Holder'], excludes: ['Cells'],
    provides: ['battery-holder'], pwr: { voltageNominal: 7.4 }, sources: est, raptorStatus: 'compatible-in-principle', raptorNote: 'Duplicate if the platform already has a battery holder.', tags: ['battery'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'charger-18650', slots: ['charger'], name: 'Li-ion balance charger (2S/3S)', brand: 'Generic', price: null, priceHint: { price: 12, note: 'Typical hobby charger — team estimate.' },
    summary: 'Dedicated charger. Do not assume a robot board can charge cells safely unless the manufacturer says so.', pros: ['Safe charging'], cons: ['Part not chosen'], specs: [['Chemistry', 'Li-ion']], includes: ['Charger'], excludes: ['Mains adapter (check)'],
    provides: ['charger'], sources: est, raptorStatus: 'requires-validation', raptorNote: 'Verify whether the robot’s UPS module charges cells and under what conditions.', tags: ['charger'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'pololu-d24v50f5', slots: ['converter'], name: '5 V, 5 A step-down regulator D24V50F5', brand: 'Pololu', price: 32.95, priceStatus: 'page-verified', priceDate: CHECK_DATE, seller: 'Pololu',
    url: 'https://www.pololu.com/product/2851', image: `${PO}/0J5851.600x480.jpg`, summary: 'High-current 5 V regulator suitable for a Raspberry Pi 4/5 supply from a 2S/3S pack.',
    pros: ['5 A capability for Pi 5', 'Wide input range', 'Documented'], cons: ['Expensive for a regulator', 'Raspberry Pi 5 may want 5 V/5 A with PD negotiation', 'No power-path protection'], specs: [['Output', '5 V, 5 A'], ['Price', '$32.95 (page)']],
    includes: ['Regulator'], excludes: ['Connectors'], provides: ['dc-dc-5v'], pwr: { outputV: 5, outputMaxA: 5, inputMinV: 6, inputMaxV: 38 },
    sources: [{ label: 'Pololu listing (fetched 2026-10-23)', kind: 'manufacturer', url: 'https://www.pololu.com/product/2851' }], confidence: 'manufacturer', specStatus: 'partial', raptorStatus: 'compatible-in-principle', raptorNote: 'Input range printed here is recalled — confirm on the product page.', tags: ['regulator', '5v'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'buck-5v-5a-generic', slots: ['converter'], name: '5 V / 5 A buck converter module (generic)', brand: 'Generic', price: null, priceHint: { price: 8, note: 'Typical module price — team estimate; quality varies.' },
    summary: 'Low-cost buck converter. Rating and ripple are unverified — measure before powering a Pi.', pros: ['Cheap'], cons: ['Part not chosen', 'Quality/ratings vary'], specs: [['Output', '5 V, 5 A (rating to verify)']], includes: ['Module'], excludes: [],
    provides: ['dc-dc-5v'], pwr: { outputV: 5, outputMaxA: 5, inputMinV: 6, inputMaxV: 24 }, sources: est, raptorStatus: 'requires-validation', raptorNote: 'Verify actual current rating, undervoltage behaviour and ripple under load.', tags: ['regulator', '5v'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'tb6612', slots: ['motor-driver'], name: 'TB6612 dual motor driver', brand: 'Adafruit (Toshiba TB6612FNG)', price: 6.95, priceStatus: 'page-verified', priceDate: CHECK_DATE, seller: 'Adafruit',
    url: 'https://www.adafruit.com/product/2448', image: `${AD}/2448-06.jpg`, summary: '1.2 A per channel dual H-bridge — suited to small N20 / yellow-gearmotor class motors.',
    pros: ['Efficient MOSFET H-bridge (low voltage drop)', 'Cheap', '2 channels (differential drive)'], cons: ['Only 2 channels: a 4-motor skid-steer needs paired motors per channel', '1.2 A continuous limit', 'Motor supply upper limit must be checked vs your pack'],
    specs: [['Channels', '2'], ['Continuous current', '1.2 A per channel (page title)'], ['Price', '$6.95']], includes: ['Breakout'], excludes: ['Headers'], provides: ['motor-driver'], pwr: { channels: 2, motorCurrentA: 1.2, inputMinV: 4.5, inputMaxV: 13.5 },
    sources: [{ label: 'Adafruit listing (fetched 2026-10-23)', kind: 'distributor', url: 'https://www.adafruit.com/product/2448' }], confidence: 'distributor', specStatus: 'partial', raptorStatus: 'requires-validation', raptorNote: 'Check motor stall current against 1.2 A and the pack voltage against the driver range.', tags: ['driver'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'drv8835-pi', slots: ['motor-driver'], name: 'DRV8835 dual motor driver kit for Raspberry Pi', brand: 'Pololu', price: 14.95, priceStatus: 'page-verified', priceDate: CHECK_DATE, seller: 'Pololu',
    url: 'https://www.pololu.com/product/2753', image: `${PO}/0J6601.600x480.jpg`, summary: 'Low-voltage dual driver shaped like a Raspberry Pi add-on.',
    pros: ['Designed for the Pi header', 'Documented', 'Compact'], cons: ['Low motor-voltage range — not suited to 12 V motors', 'Current capability modest', 'Ties the design to a Pi header'], specs: [['Channels', '2'], ['Motor supply', 'Low voltage (recalled ≤ 11 V — verify)']],
    includes: ['Driver board'], excludes: [], provides: ['motor-driver'], pwr: { channels: 2, motorCurrentA: 1.2, inputMinV: 2, inputMaxV: 11 },
    sources: [{ label: 'Pololu listing (fetched 2026-10-23)', kind: 'manufacturer', url: 'https://www.pololu.com/product/2753' }], confidence: 'manufacturer', specStatus: 'partial', raptorStatus: 'requires-validation', raptorNote: 'Electrical limits shown are recalled; check the page.', tags: ['driver', 'pi-header'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'romi-pdb', slots: ['motor-driver'], name: 'Motor Driver & Power Distribution Board for Romi', brand: 'Pololu', price: 34.95, priceStatus: 'page-verified', priceDate: CHECK_DATE, seller: 'Pololu',
    url: 'https://www.pololu.com/product/3543', image: `${PO}/0J7355.600x480.jpg`, summary: 'Mounts under the Romi deck: motor drivers and power distribution from the AA pack.',
    pros: ['Designed for the Romi chassis', 'Encoder connectors', 'Power routing included'], cons: ['Only useful on a Romi', 'Costly versus a $7 driver', 'Needs a control board (e.g. Romi 32U4 or your MCU)'], specs: [['Fits', 'Romi chassis']],
    includes: ['Board'], excludes: ['Controller'], provides: ['motor-driver'], sources: [{ label: 'Pololu listing (fetched 2026-10-23)', kind: 'manufacturer', url: 'https://www.pololu.com/product/3543' }], confidence: 'manufacturer', specStatus: 'partial',
    raptorStatus: 'compatible-in-principle', raptorNote: 'Pair with the Romi chassis only.', tags: ['driver', 'romi-only'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'l298n', slots: ['motor-driver'], name: 'L298N dual H-bridge module (generic)', brand: 'Generic', price: null, priceHint: { price: 3, note: 'Typical module price — team estimate.' },
    summary: 'Cheap bipolar H-bridge; inefficient (≈2 V drop) but handles higher voltage/current than TB6612.', pros: ['Very cheap', '5–35 V, ~2 A per channel'], cons: ['Large voltage drop and heat', 'Part not chosen', 'Wastes battery energy'], specs: [['Channels', '2'], ['Current', '≈2 A per channel (typ.)']],
    includes: ['Module'], excludes: [], provides: ['motor-driver'], pwr: { channels: 2, motorCurrentA: 2, inputMinV: 5, inputMaxV: 35 }, sources: est, raptorStatus: 'compatible-in-principle', raptorNote: 'Acceptable for prototypes; poor efficiency.', tags: ['driver'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'romi-32u4', slots: ['controller'], name: 'Romi 32U4 Control Board', brand: 'Pololu', price: 74.95, priceStatus: 'page-verified', priceDate: CHECK_DATE, seller: 'Pololu',
    url: 'https://www.pololu.com/product/3544', image: `${PO}/0J7510.600x480.jpg`, summary: 'ATmega32U4 control board for Romi with inertial sensors and encoder connections (per Pololu page).',
    pros: ['Includes inertial sensors (page)', 'Encoder inputs', 'Arduino-compatible'], cons: ['$74.95 — more than the Romi chassis itself', 'Needs the Motor Driver & PDB board', 'Only fits Romi'], specs: [['MCU', 'ATmega32U4'], ['Inertial sensors', 'Yes (per page; model not captured)']],
    includes: ['Control board'], excludes: ['Motor driver / PDB'], provides: ['motor-mcu', 'imu'], sources: [{ label: 'Pololu listing (fetched 2026-10-23)', kind: 'manufacturer', url: 'https://www.pololu.com/product/3544' }], confidence: 'manufacturer', specStatus: 'partial',
    proc: { family: 'arduino', kind: 'mcu-controller', cpu: 'ATmega32U4', ramMB: 0, storage: 'flash', wifi: 'None', cameraSupport: {}, cameraNote: 'No camera.', hwEncode: 'unknown', hwEncodeNote: 'N/A', ros2: 'micro-ros', realtime: 'mcu',
      io: { uart: true, i2c: true, spi: true, usb: true, gpio: true, pcie: false, csi: false }, powerIn: 'From Romi PDB', supply5vA: null, upgradePath: 'Romi ecosystem only.' },
    raptorStatus: 'compatible-in-principle', raptorNote: 'Romi-only path; expensive.', tags: ['romi-only', 'mcu'], purchasePriority: 'before-integration',
  }),
  P({
    id: 'wiring-kit', slots: ['wiring'], name: 'Wiring, connectors & mounting hardware', brand: 'Generic', price: null, priceHint: { price: 10, note: 'Allowance — team estimate for wire, JST/Dupont, standoffs, screws, heat-shrink.' },
    summary: 'Allowance for the unavoidable small parts that robots always need.', pros: ['Makes the BOM honest'], cons: ['Not itemised'], specs: [['Contents', 'Wire, connectors, standoffs, fasteners']], includes: ['Assorted'], excludes: [], provides: [], sources: est,
    raptorStatus: 'compatible-in-principle', raptorNote: 'Replace with an itemised list once the design is frozen.', tags: ['wiring'], purchasePriority: 'before-integration',
  }),
]

export const upgrades: Product[] = [
  P({ id: 'up-ai-accel', slots: ['upgrade'], name: 'Edge-AI accelerator (Pi 5 PCIe HAT class)', brand: 'Generic', price: null, summary: 'Optional on-robot neural accelerator for local detection if the GPU link becomes unreliable. Pi 5 only (PCIe).',
    pros: ['Local inference without a network link', 'Resilience to packet loss'], cons: ['Needs Raspberry Pi 5 PCIe', 'Cost and power draw', 'No specific model chosen'], specs: [['Requires', 'PCIe-capable host']], includes: [], excludes: [], provides: [],
    sources: [{ label: 'Team notes', kind: 'team-estimate' }], raptorStatus: 'insufficient-info', raptorNote: 'Future upgrade only.', tags: ['goal:edge-ai', 'future'], purchasePriority: 'research' }),
  P({ id: 'up-arm', slots: ['upgrade'], name: 'Small robotic arm / manipulator kit', brand: 'Generic', price: null, summary: 'Servo-driven manipulator for later experiments; payload and power are the limiting factors.',
    pros: ['Enables manipulation experiments'], cons: ['Heavy for small chassis', 'Peaky servo current', 'No specific model chosen'], specs: [['Mass', 'Unknown — choose a model']], includes: [], excludes: [], provides: [],
    sources: [{ label: 'Team notes', kind: 'team-estimate' }], raptorStatus: 'insufficient-info', raptorNote: 'Future upgrade only.', tags: ['goal:arm', 'future'], purchasePriority: 'research' }),
  P({ id: 'up-battery-large', slots: ['upgrade'], name: 'Larger battery pack', brand: 'Generic', price: null, summary: 'Higher-capacity pack for longer runtime; mass and space are the cost.',
    pros: ['Longer runtime'], cons: ['Mass', 'Charging and protection requirements'], specs: [['Capacity', 'TBD']], includes: [], excludes: [], provides: [],
    sources: [{ label: 'Team notes', kind: 'team-estimate' }], raptorStatus: 'insufficient-info', raptorNote: 'Future upgrade only.', tags: ['goal:battery', 'future'], purchasePriority: 'research' }),
  P({ id: 'up-uwb-tags', slots: ['upgrade'], name: 'Extra UWB tags (for second robot)', brand: 'Generic', price: null, summary: 'Additional tag units for multi-robot cooperation experiments, using the same anchor infrastructure.',
    pros: ['Reuses anchors'], cons: ['Ranging schedule capacity (tags per anchor set) is protocol dependent'], specs: [['Note', 'Select same family as anchors']], includes: [], excludes: [], provides: [],
    sources: [{ label: 'Team notes', kind: 'team-estimate' }], raptorStatus: 'insufficient-info', raptorNote: 'Future upgrade only.', tags: ['goal:multi-robot', 'future'], purchasePriority: 'research' }),
  P({ id: 'up-depth', slots: ['upgrade'], name: 'Depth / stereo camera (3D mapping)', brand: 'Generic', price: null, summary: 'Depth sensing for dense 3D maps. Active depth is ranging and conflicts with the current sensor restrictions; passive stereo from RGB cameras needs approval for extra cameras.',
    pros: ['Dense 3D maps'], cons: ['May violate the "no additional ranging" restriction', 'Needs approval and a more capable host'], specs: [['Status', 'Requires supervisor approval']], includes: [], excludes: [], provides: [],
    sources: [{ label: 'Project requirements', kind: 'team-estimate' }], raptorStatus: 'insufficient-info', raptorNote: 'Treat as a requirement change.', tags: ['goal:3d-mapping', 'future', 'approval-required'], purchasePriority: 'research' }),
]
