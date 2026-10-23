import type { Finding, Severity, Config, Product, Slot } from '../types'
import { buildContext, type Ctx } from './context'
import { CAP_LABEL } from './cost'
import { estimatePayload, evaluatePower } from './power'

export interface Rule { id: string; run: (ctx: Ctx) => Finding[] }

const F = (id: string, severity: Severity, title: string, detail: string, basis: Finding['basis'] = 'engineering', extra: Partial<Finding> = {}): Finding => ({ id, severity, title, detail, basis, ...extra })

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical incompatibility', missing: 'Missing mandatory component', integration: 'Integration work required', validation: 'Experimental validation required', optional: 'Optional recommendation',
}
export const SEVERITY_ORDER: Severity[] = ['critical', 'missing', 'integration', 'validation', 'optional']

// ---- individual rules. Each is independent: add one to RULES to extend the engine. ----

const uwbRules: Rule[] = [
  { id: 'uwb-count', run: (c) => {
    const out: Finding[] = []
    if (!c.anchors) out.push(F('uwb-anchors-missing', 'missing', 'No UWB anchors selected', 'RAPTOR localization uses raw UWB ranges from four fixed anchors.', 'official', { slot: 'uwb-anchor' }))
    else if (c.anchors.qty < 4) out.push(F('uwb-anchors-few', 'missing', `Only ${c.anchors.qty} UWB anchor${c.anchors.qty === 1 ? '' : 's'} configured`, 'The official requirement is four fixed anchors, and the system must keep working when any one becomes unavailable.', 'official', { slot: 'uwb-anchor' }))
    if (!c.tag) out.push(F('uwb-tag-missing', 'missing', 'No UWB tag selected', 'The robot needs one mobile UWB tag.', 'official', { slot: 'uwb-tag' }))
    return out
  } },
  { id: 'uwb-family', run: (c) => {
    if (!c.anchors || !c.tag) return []
    const a = c.anchors.product.uwb, t = c.tag.product.uwb
    if (!a || !t || a.family === t.family) return []
    return [F('uwb-family-mismatch', 'critical', 'UWB anchors and tag use different protocol families', `${c.anchors.product.name} (${a.family}) and ${c.tag.product.name} (${t.family}) are not assumed to range with each other. Choose boards from the same family.`, 'engineering', { slot: 'uwb-tag', productIds: [c.anchors.product.id, c.tag.product.id] })]
  } },
  { id: 'uwb-host-link', run: (c) => {
    if (!c.tag || !c.processor?.proc) return []
    const t = c.tag.product.uwb, io = c.processor.proc.io
    if (!t) return []
    const ok = t.hostLinks.some((l) => (l === 'uart' && io.uart) || (l === 'usb' && io.usb) || (l === 'spi' && io.spi) || (l === 'wifi' && c.processor!.proc!.wifi !== 'None' && !/^none/i.test(c.processor!.proc!.wifi)))
    return ok ? [] : [F('uwb-host-link', 'critical', 'Selected processor has no interface for the UWB tag', `${c.tag.product.name} talks to the host over ${t.hostLinks.join('/').toUpperCase()}; ${c.processor.name} does not offer a matching port.`, 'engineering', { slot: 'uwb-tag' })]
  } },
  { id: 'uwb-quality', run: (c) => {
    const out: Finding[] = []
    for (const [role, sel] of [['anchor', c.anchors], ['tag', c.tag]] as const) {
      const u = sel?.product.uwb
      if (!sel || !u) continue
      if (role === 'tag' && c.anchors?.product.id === sel.product.id) continue // same board in both roles: report once
      if (u.rawRanges === 'unverified') out.push(F(`uwb-raw-${role}`, 'validation', `Raw UWB ranges not confirmed (${sel.product.name})`, u.rawRangesNote, 'official', { slot: role === 'anchor' ? 'uwb-anchor' : 'uwb-tag', productIds: [sel.product.id] }))
      if (u.rawRanges === 'not-available') out.push(F(`uwb-raw-${role}`, 'critical', `${sel.product.name} does not expose raw ranges`, 'RAPTOR localization uses raw UWB range measurements.', 'official', { productIds: [sel.product.id] }))
      if (u.firmware !== 'mature') out.push(F(`uwb-fw-${role}`, 'integration', `Multi-anchor firmware is the team’s job (${sel.product.name})`, u.firmware === 'examples-only' ? 'Only demo libraries exist; no time-multiplexed multi-anchor scheduling is provided by the vendor.' : 'Vendor/custom firmware and protocol must be integrated and characterised.', 'engineering', { productIds: [sel.product.id] }))
      if (u.bareModule) out.push(F(`uwb-bare-${role}`, 'integration', `${sel.product.name} is a bare module`, 'Supporting electronics (power, interface, antenna, enclosure) are required and are shown as unpriced implied parts in the BOM.', 'engineering', { productIds: [sel.product.id] }))
    }
    if (c.anchors?.product.uwb && c.anchors.qty >= 1)
      out.push(F('uwb-failover', 'validation', 'Anchor-failure recovery must be demonstrated', `No UWB product provides this itself (${c.anchors.product.uwb.failover}) Fault-injection tests: remove one anchor, bias one anchor, drop packets.`, 'official', { slot: 'uwb-anchor' }))
    if (c.anchors?.product.uwb)
      out.push(F('uwb-accuracy-claim', 'validation', 'Manufacturer ranging accuracy ≠ robot localization accuracy', 'A vendor claim of about 10 cm ranging accuracy does not establish <20 cm robot localization error: NLOS, anchor geometry, antenna delay calibration and filtering decide that. Verify with ground-truth experiments.', 'official', { slot: 'uwb-anchor' }))
    if (c.anchors?.product.uwb)
      out.push(F('uwb-anchor-power', 'optional', 'Plan power for the fixed anchors', `Anchors: ${c.anchors.product.uwb.anchorPower}. USB supplies / power banks and mounting stands for ${Math.max(c.anchors.qty, 4)} anchors are not in the BOM — add custom items if needed.`, 'engineering', { slot: 'uwb-anchor' }))
    if (c.anchors?.product.uwb) out.push(F('uwb-regulatory', 'validation', 'Verify UWB regulatory status', c.anchors.product.uwb.regulatory, 'engineering', { slot: 'uwb-anchor' }))
    return out
  } },
]

const platformRules: Rule[] = [
  { id: 'platform-host', run: (c) => {
    const pl = c.platform?.plat, pr = c.processor?.proc
    if (!pl || !pr || pl.hostSupport.includes('any') || pl.hostSupport.includes(pr.family)) return []
    return [F('platform-host-mismatch', 'critical', 'Platform control board is designed for a different host', `${c.platform!.name} is built around ${pl.hostSupport.join('/')} hosts; ${c.processor!.name} is a ${pr.family} board and will not plug into its control board.`, 'engineering', { slot: 'processor', productIds: [c.platform!.id, c.processor!.id] })]
  } },
  { id: 'platform-bare', run: (c) => {
    if (!c.platform?.plat) return []
    const out: Finding[] = []
    const k = c.platform.plat.kind
    if (k === 'bare-chassis') out.push(F('platform-bare', 'integration', 'Bare chassis: electronics are all separate', `${c.platform.name} is a mechanical chassis only. Controller, motor driver, power distribution and wiring must be selected and integrated.`, 'engineering', { slot: 'platform' }))
    if (!c.has('motor-driver')) out.push(F('driver-missing', 'missing', 'No motor driver', `${c.platform.name} does not include one. Select a driver in step 8.`, 'engineering', { slot: 'motor-driver' }))
    return out
  } },
  { id: 'platform-encoders', run: (c) => {
    const pl = c.platform?.plat
    if (!pl) return []
    const out: Finding[] = []
    for (const { product } of c.bySlot.odometry) {
      if (pl.encoders === 'incompatible') out.push(F('enc-incompatible', 'critical', 'Encoders are not compatible with this platform', `The manufacturer page for ${c.platform!.name} states motor encoders are not compatible.`, 'engineering', { slot: 'odometry', productIds: [product.id] }))
      if (product.tags.includes('romi-only') && c.platform!.id !== 'pololu-romi') out.push(F('enc-romi-only', 'critical', 'Encoder kit does not fit the chosen chassis', `${product.name} is designed for Pololu Romi motors; ${c.platform!.name} has different motors/shafts.`, 'engineering', { slot: 'odometry', productIds: [product.id] }))
    }
    for (const slot of ['motor-driver', 'controller'] as Slot[]) for (const { product } of c.bySlot[slot])
      if (product.tags.includes('romi-only') && c.platform!.id !== 'pololu-romi') out.push(F(`romi-only-${product.id}`, 'critical', `${product.name} only fits the Romi chassis`, 'Board footprint and connectors are specific to the Romi platform.', 'engineering', { slot, productIds: [product.id] }))
    if (!c.has('encoders') && pl.encoders !== 'incompatible') out.push(F('odometry-none', 'optional', pl.encoders === 'unconfirmed' ? 'Wheel encoders not confirmed on this platform' : 'No wheel odometry', 'Not an official requirement: UWB + IMU + camera can localize without it, but wheel odometry helps bridge UWB dropouts.', 'engineering', { slot: 'odometry' }))
    if (pl.drive === 'mecanum' || pl.drive === 'tracked') out.push(F('slip', 'validation', `${pl.drive === 'mecanum' ? 'Mecanum wheels' : 'Tracks'} slip: wheel odometry will drift`, 'Expect poor dead reckoning; rely on UWB + IMU + camera fusion and validate it experimentally.', 'engineering', { slot: 'platform' }))
    if (pl.drive === 'ackermann') out.push(F('ackermann', 'validation', 'Car-like steering limits maneuvers', 'Minimum turning radius complicates waypoint navigation and target following in a 10 m × 10 m arena.', 'engineering', { slot: 'platform' }))
    return out
  } },
  { id: 'platform-kit-info', run: (c) => {
    const out: Finding[] = []
    const p = c.platform
    if (!p) return out
    for (const [cap, why] of Object.entries(p.providesUnverified ?? {})) out.push(F(`kit-unverified-${cap}`, cap === 'ultrasonic' ? 'validation' : 'validation', `Kit inclusion unverified: ${CAP_LABEL[cap as keyof typeof CAP_LABEL] ?? cap}`, why ?? '', 'data', { slot: 'platform', productIds: [p.id] }))
    if (p.provides.includes('ultrasonic')) out.push(F('kit-ultrasonic', 'validation', 'Kit contains a prohibited-class ranging sensor', 'Ultrasonic ranging is not allowed in RAPTOR. If the module ships with the kit it must stay disconnected and unused.', 'official', { slot: 'platform', productIds: [p.id] }))
    if (p.plat && p.plat.motorVoltage == null && p.plat.kind !== 'complete-kit') out.push(F('motor-voltage-unknown', 'validation', 'Motor voltage is not stated', 'Read it from the manufacturer page before choosing the driver and pack voltage.', 'data', { slot: 'platform' }))
    return out
  } },
  { id: 'payload', run: (c) => {
    const est = estimatePayload(c)
    if (est.limitG == null) return c.platform ? [F('payload-unknown', 'validation', 'Payload rating not published', `${c.platform.name}: no driving-payload figure captured. Estimated electronics mass is ≈${Math.round(est.grams)} g (assumed per-part masses).`, 'data', { slot: 'platform' })] : []
    if (est.fraction! > 1) return [F('payload-over', 'critical', 'Estimated load exceeds the platform payload', `≈${Math.round(est.grams)} g of electronics (assumed masses) against a ${Math.round(est.limitG)} g rating.`, 'engineering', { slot: 'platform' })]
    if (est.fraction! > 0.7) return [F('payload-tight', 'validation', 'Payload margin is thin', `≈${Math.round(est.grams)} g of ${Math.round(est.limitG)} g (${Math.round(est.fraction! * 100)}%), using assumed part masses. Weigh the real build.`, 'engineering', { slot: 'platform' })]
    return []
  } },
]

const processorRules: Rule[] = [
  { id: 'processor-core', run: (c) => {
    const out: Finding[] = []
    if (!c.processor && !c.has('linux-computer')) { out.push(F('proc-missing', 'missing', 'No onboard processor', 'Select the onboard computer in step 3.', 'official', { slot: 'processor' })); return out }
    if (!c.processor?.proc) return out
    const p = c.processor, pr = p.proc!
    if (c.platform && c.platform.provides.includes('linux-computer') && c.platform.id !== p.id) out.push(F('proc-duplicate', 'optional', 'Duplicate computer', `${c.platform.name} already includes a Linux computer; ${p.name} would be a second one.`, 'engineering', { slot: 'processor' }))
    if (pr.kind === 'mcu-vision') out.push(F('proc-no-linux', 'integration', `${p.name} is not a Linux computer`, 'Sensor fusion, networking and the GPU-server link would be custom ESP-IDF firmware; ROS 2 is limited to micro-ROS. Confirm the software team accepts this.', 'engineering', { slot: 'processor' }))
    if (pr.ramMB > 0 && pr.ramMB < 1024) out.push(F('proc-ram', 'validation', `Limited RAM (${pr.ramMB} MB)`, 'Local fusion, logging and ROS 2 may not fit; confirm the planned onboard software footprint.', 'engineering', { slot: 'processor' }))
    if (pr.hwEncode === 'sw-only') out.push(F('proc-sw-encode', 'validation', 'No hardware video encoder', pr.hwEncodeNote + ' Measure CPU load and end-to-end latency for the camera stream.', 'engineering', { slot: 'processor' }))
    if (pr.hwEncode === 'hw-h264-unverified' || pr.hwEncode === 'unknown') out.push(F('proc-encode-unverified', 'validation', 'Hardware video encoding unverified', pr.hwEncodeNote, 'engineering', { slot: 'processor' }))
    if (/^none/i.test(pr.wifi)) out.push(F('proc-no-wifi', 'integration', 'No onboard Wi-Fi', 'The robot streams video to the GPU server wirelessly; add a USB Wi-Fi dongle or Ethernet bridge (not in BOM).', 'engineering', { slot: 'processor' }))
    if (!c.has('dc-dc-5v') && !pr.vinDirect && pr.kind !== 'mcu-vision' && c.bySlot.converter.length === 0)
      out.push(F('proc-power', 'missing', 'No 5 V supply for the onboard computer', `${p.name} needs ${pr.powerIn}${pr.supply5vA ? ` (≈${pr.supply5vA} A)` : ''}. Select a regulator in step 7 or use a platform that provides one.`, 'engineering', { slot: 'converter' }))
    for (const { product: cv } of c.bySlot.converter) if (pr.supply5vA && cv.pwr?.outputMaxA && cv.pwr.outputMaxA < pr.supply5vA) out.push(F('proc-power-low', 'critical', 'Regulator cannot supply the computer', `${cv.name} provides ${cv.pwr.outputMaxA} A; ${p.name} wants ≈${pr.supply5vA} A.`, 'engineering', { slot: 'converter' }))
    if (pr.supply5vA && pr.supply5vA >= 5 && c.kit.get('dc-dc-5v')?.product === c.platform) out.push(F('proc-power-5a', 'validation', 'Check the platform’s 5 V rail can deliver 5 A', `${p.name} asks for a 5 V / 5 A supply; the kit’s output rating is not stated in the captured text.`, 'data', { slot: 'processor' }))
    if (!c.processor?.provides.includes('motor-mcu') && !c.has('motor-mcu')) out.push(F('no-rt-layer', 'optional', 'No dedicated real-time motor/safety controller', 'Motor PWM would be generated by a Linux host. A small MCU (e.g. Pico 2) gives a deterministic stop path and a hardware watchdog.', 'engineering', { slot: 'controller' }))
    return out
  } },
  { id: 'camera', run: (c) => {
    const out: Finding[] = []
    const cam = c.bySlot.camera[0]?.product
    const pr = c.processor?.proc
    if (!c.has('camera')) { out.push(F('camera-missing', 'missing', 'No camera', 'RAPTOR detects and tracks a moving target with the camera.', 'official', { slot: 'camera' })); return out }
    if (cam?.cam && pr) {
      const level = pr.cameraSupport[cam.cam.iface]
      if (level === 'no') out.push(F('cam-incompatible', 'critical', `${cam.name} is not supported by ${c.processor!.name}`, `${pr.cameraNote}`, 'engineering', { slot: 'camera', productIds: [cam.id, c.processor!.id] }))
      else if (level === 'unverified' || level == null) out.push(F('cam-unverified', 'validation', `Camera interface compatibility unverified (${cam.cam.iface.toUpperCase()})`, `${c.processor!.name}: ${pr.cameraNote} Do not buy until a working driver is confirmed.`, 'engineering', { slot: 'camera', productIds: [cam.id, c.processor!.id] }))
      if (cam.cam.iface === 'csi-pi' && pr.family === 'raspberry-pi') out.push(F('cam-cable', 'optional', 'Check the camera ribbon connector', 'Pi 4 uses a 15-pin CSI connector; Pi 5 and Zero 2 W use 22-pin. Make sure the right cable is in the package.', 'engineering', { slot: 'camera' }))
      if (pr.kind === 'mcu-vision' && pr.cameraSupport.integrated === 'yes') out.push(F('cam-double', 'optional', 'Board already has an integrated camera', 'An external camera is not assumed compatible with this vision board.', 'engineering', { slot: 'camera' }))
    }
    if (!cam && c.kit.get('camera')?.product === c.platform && c.platform?.plat?.kitCamera && pr) {
      const k = c.platform.plat.kitCamera
      const level = pr.cameraSupport[k.iface]
      if (level !== 'yes') out.push(F('kitcam-host', 'validation', 'Kit camera may not work with the chosen processor', `${c.platform.name} ships a ${k.iface.toUpperCase()} camera (${k.note}); ${c.processor!.name}: ${pr.cameraNote}`, 'engineering', { slot: 'camera' }))
      else out.push(F('kitcam-model', 'validation', 'Verify the kit camera model', k.note + '. Check resolution, field of view and frame rate before relying on it for tracking.', 'data', { slot: 'camera' }))
    }
    if (cam && c.kit.get('camera')) out.push(F('camera-duplicate', 'optional', 'Camera already included', `${c.kit.get('camera')!.product.name} already provides a camera; ${cam.name} is an optional upgrade.`, 'engineering', { slot: 'camera' }))
    if (cam?.needs?.some((n) => n.price == null)) out.push(F('cam-lens', 'integration', 'Lens is not priced', 'This camera body needs a separate lens, which has no price in the BOM yet.', 'data', { slot: 'camera' }))
    if (cam?.cam?.shutter === 'rolling') out.push(F('cam-rolling', 'validation', 'Rolling shutter will skew fast motion', 'Validate detection and tracking while the robot and target move.', 'engineering', { slot: 'camera' }))
    return out
  } },
]

const sensorPowerRules: Rule[] = [
  { id: 'imu', run: (c) => {
    const out: Finding[] = []
    if (!c.has('imu')) out.push(F('imu-missing', 'missing', 'No IMU', 'Select an IMU in step 5 (or a platform that includes one).', 'official', { slot: 'imu' }))
    const k = c.kit.get('imu')
    if (k && c.bySlot.imu.length) out.push(F('imu-duplicate', 'optional', 'IMU already included in the kit', `${k.product.name} already provides one. The selected ${c.bySlot.imu[0].product.name} is treated as an optional replacement — not a mandatory cost.`, 'engineering', { slot: 'imu' }))
    const pm = c.kit.get('power-monitor')
    if (pm && c.bySlot['power-monitor'].length) out.push(F('pm-duplicate', 'optional', 'Power monitor already included', `${pm.product.name} already provides one.`, 'engineering', { slot: 'power-monitor' }))
    const enc = c.kit.get('encoders')
    if (enc && c.bySlot.odometry.length) out.push(F('enc-duplicate', 'optional', 'Encoders already included', `${enc.product.name} already provides encoders.`, 'engineering', { slot: 'odometry' }))
    const drv = c.kit.get('motor-driver')
    if (drv && c.bySlot['motor-driver'].length) out.push(F('driver-duplicate', 'optional', 'Motor driver already included', `${drv.product.name} already has one; the selected driver is redundant unless you replace the kit electronics.`, 'engineering', { slot: 'motor-driver' }))
    return out
  } },
  { id: 'prohibited', run: (c) => {
    const out: Finding[] = []
    for (const { product } of c.bySlot.prohibited) out.push(F(`prohibited-${product.id}`, 'critical', `Prohibited by official requirements: ${product.name}`, product.prohibitedReason ?? 'LiDAR, GNSS and additional ranging devices are not allowed.', 'official', { slot: 'prohibited', productIds: [product.id] }))
    for (const { product } of c.bySlot['extra-sensor']) if (product.tags.includes('approval-required')) out.push(F(`approval-${product.id}`, 'validation', `Needs supervisor approval: ${product.name}`, 'This is not part of the confirmed allowed hardware. Do not rely on it until the supervisor approves in writing.', 'official', { slot: 'extra-sensor', productIds: [product.id] }))
    for (const { product } of c.bySlot.upgrade) if (product.tags.includes('approval-required')) out.push(F(`approval-${product.id}`, 'validation', `Needs supervisor approval: ${product.name}`, 'Would change the sensor restrictions.', 'official', { slot: 'upgrade', productIds: [product.id] }))
    return out
  } },
  { id: 'power', run: (c) => {
    const out: Finding[] = []
    const cfg = c.cfg
    const pl = c.platform?.plat
    if (!c.has('battery-cells')) out.push(F('cells-missing', 'missing', 'Battery cells not selected', c.platform?.excludes.some((e) => /cell|18650|battery/i.test(e)) ? `${c.platform.name} does not include cells.` : 'No energy source selected.', 'engineering', { slot: 'battery' }))
    else if (!c.has('battery-holder')) out.push(F('holder-missing', 'missing', 'No battery holder or pack', 'Cells need a holder (the platform has none).', 'engineering', { slot: 'battery' }))
    if (c.has('battery-holder') && c.bySlot.battery.some((b) => b.product.provides.includes('battery-holder')) && c.kit.get('battery-holder')) out.push(F('holder-duplicate', 'optional', 'Battery holder already included', `${c.kit.get('battery-holder')!.product.name} already has a holder/UPS module.`, 'engineering', { slot: 'battery' }))
    if (c.has('battery-cells') && !c.bySlot.charger.length && !c.has('charger')) out.push(F('charger-none', 'optional', 'No charger selected', 'Do not assume the robot’s UPS module can charge cells safely unless the manufacturer states it. Verify the kit, otherwise add a Li-ion charger.', 'engineering', { slot: 'charger' }))
    if (!c.bySlot.safety.some((s) => s.product.provides.includes('estop'))) out.push(F('estop-missing', 'missing', 'No emergency-stop mechanism identified', 'RAPTOR must stop safely when required. A latching hardware switch that cuts motor power independent of software is recommended; the kit’s own power switch (if any) is not an e-stop.', 'engineering', { slot: 'safety' }))
    if (!c.bySlot.safety.some((s) => s.product.provides.includes('fuse'))) out.push(F('fuse-none', 'optional', 'No fuse in the power path', 'A fuse protects Li-ion packs and wiring from shorts.', 'engineering', { slot: 'safety' }))
    // motor voltage vs driver / pack
    const pe = evaluatePower(cfg, c)
    const drv = c.bySlot['motor-driver'][0]?.product
    if (drv?.pwr?.inputMaxV != null) {
      if (pe.packV && pe.packV > drv.pwr.inputMaxV) out.push(F('drv-pack', 'critical', 'Pack voltage exceeds motor driver rating', `${drv.name} accepts up to ${drv.pwr.inputMaxV} V; the pack is ≈${pe.packV.toFixed(1)} V.`, 'engineering', { slot: 'motor-driver' }))
      if (pl?.motorVoltage && pl.motorVoltage > drv.pwr.inputMaxV) out.push(F('drv-motor', 'critical', 'Motor voltage mismatch', `${c.platform!.name} motors are rated ${pl.motorVoltage} V but ${drv.name} supports ${drv.pwr.inputMaxV} V maximum.`, 'engineering', { slot: 'motor-driver' }))
      if (!pl?.motorVoltage) out.push(F('drv-motor-unknown', 'validation', 'Check motor voltage against the driver', `Motor voltage for ${c.platform?.name ?? 'the platform'} is unknown; ${drv.name} supports ${drv.pwr.inputMinV}–${drv.pwr.inputMaxV} V.`, 'data', { slot: 'motor-driver' }))
    }
    if (pe.runtimeMin != null && pe.runtimeMin < 20) out.push(F('runtime', 'validation', `Estimated runtime ≈ ${Math.round(pe.runtimeMin)} min (assumptions)`, 'Below a 20-minute working session. Based on assumed loads, not measurements — measure the real current draw.', 'engineering', { slot: 'battery' }))
    return out
  } },
]

export const RULES: Rule[] = [...uwbRules, ...platformRules, ...processorRules, ...sensorPowerRules]

export function evaluate(cfg: Config): Finding[] {
  const ctx = buildContext(cfg)
  const seen = new Set<string>()
  const out: Finding[] = []
  for (const r of RULES) for (const f of r.run(ctx)) if (!seen.has(f.id)) { seen.add(f.id); out.push(f) }
  return out.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
}

export function countBySeverity(fs: Finding[]): Record<Severity, number> {
  const r = { critical: 0, missing: 0, integration: 0, validation: 0, optional: 0 } as Record<Severity, number>
  for (const f of fs) r[f.severity]++
  return r
}

/** Findings that a particular product contributes to (for card badges). */
export const findingsFor = (fs: Finding[], p: Product): Finding[] => fs.filter((f) => f.productIds?.includes(p.id))
