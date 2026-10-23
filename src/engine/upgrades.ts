import type { Config } from '../types'
import { GOALS } from '../data/goals'
import { buildContext, type Ctx } from './context'
import { estimatePayload } from './power'

export type CheckResult = 'pass' | 'caution' | 'fail' | 'unknown'
export interface Check { label: string; result: CheckResult; detail: string }
export interface GoalEval {
  id: string; label: string; verdict: 'supported' | 'possible-with-work' | 'limited' | 'blocked' | 'unknown'
  kind: 'software' | 'hardware' | 'mixed'; checks: Check[]; summary: string; extraHardware: string[]
}

/** Assumed mass of a small manipulator, used only to illustrate payload margin. Stated in the UI. */
export const ASSUMED_ARM_MASS_G = 400

const c = (label: string, result: CheckResult, detail: string): Check => ({ label, result, detail })

type Evaluator = (x: Ctx) => { checks: Check[]; extraHardware: string[] }

const marginCheck = (x: Ctx, addG: number, what: string): Check => {
  const est = estimatePayload(x)
  if (est.limitG == null) return c('Payload margin', 'unknown', `Platform payload rating is not published; current electronics ≈${Math.round(est.grams)} g (assumed masses).`)
  const margin = est.limitG - est.grams
  if (margin >= addG) return c('Payload margin', 'pass', `≈${Math.round(margin)} g spare of ${Math.round(est.limitG)} g; ${what} (≈${addG} g assumed) fits.`)
  return c('Payload margin', margin > 0 ? 'fail' : 'fail', `Only ≈${Math.round(margin)} g spare after current electronics, but ${what} is assumed at ≈${addG} g (manufacturer rating ${Math.round(est.limitG)} g).`)
}

const EVAL: Record<string, Evaluator> = {
  'vslam': (x) => {
    const cam = x.bySlot.camera[0]?.product.cam, p = x.processor?.proc
    return { extraHardware: cam?.shutter === 'global' ? [] : ['Optional: global-shutter camera (e.g. OV9281) for cleaner VSLAM'], checks: [
      cam ? c('Camera suitability', cam.vslam >= 4 ? 'pass' : cam.vslam === 3 ? 'caution' : 'fail', `${x.bySlot.camera[0].product.name}: ${cam.vslamNote}`) : c('Camera suitability', 'unknown', x.kit.get('camera') ? 'Kit camera model unverified.' : 'No camera selected.'),
      c('Compute location', 'pass', 'Frames can stream to the GPU server, where VSLAM can run without onboard RAM — software-only upgrade.'),
      p ? c('Local VSLAM headroom', p.ramMB >= 4096 ? 'pass' : 'caution', `${x.processor!.name} has ${p.ramMB ? p.ramMB + ' MB' : 'unknown'} RAM. Running VSLAM onboard would likely need more memory and CPU than the minimum robot.`) : c('Local VSLAM headroom', 'unknown', 'No processor selected.'),
      c('IMU for visual-inertial', x.has('imu') ? 'pass' : 'fail', x.has('imu') ? 'IMU present (hardware timestamping quality must be verified).' : 'No IMU.'),
    ] }
  },
  'adv-tracking': (x) => {
    const cam = x.bySlot.camera[0]?.product.cam, p = x.processor?.proc
    return { extraHardware: [], checks: [
      c('Compute', 'pass', 'Detection / re-identification / multi-target tracking run on the GPU server — software-only.'),
      cam?.fovDeg != null ? c('Field of view', cam.fovDeg >= 90 ? 'pass' : 'caution', `${cam.fovDeg}° diagonal — ${cam.fovDeg >= 90 ? 'wide view helps keep targets in frame' : 'narrow view loses targets sooner; consider the Wide camera'}.`) : c('Field of view', 'unknown', 'FOV not recorded for the selected/kit camera.'),
      p ? c('Streaming path', p.hwEncode === 'sw-only' ? 'caution' : p.hwEncode === 'hw-h264' ? 'pass' : 'unknown', p.hwEncodeNote) : c('Streaming path', 'unknown', 'No processor selected.'),
    ] }
  },
  'obstacle': (x) => ({ extraHardware: x.bySlot.safety.some((s) => s.product.id === 'bumper-switch') ? [] : ['Bumper micro-switches (contact backup)'], checks: [
    c('Sensing method', 'pass', 'Camera-based avoidance on the GPU server; ranging sensors (ultrasonic, ToF, LiDAR) are prohibited.'),
    x.bySlot.safety.some((s) => s.product.id === 'bumper-switch') ? c('Contact backup', 'pass', 'Bumper switches selected.') : c('Contact backup', 'caution', 'No bumper switches selected — consider as a last-resort stop.'),
    c('Motion control', x.has('motor-mcu') ? 'pass' : 'caution', x.has('motor-mcu') ? 'A motor-control MCU is present for a deterministic stop.' : 'Stop commands run through a Linux host; consider an MCU watchdog.'),
  ] }),
  'arm': (x) => {
    const pl = x.platform?.plat
    return { extraHardware: ['Manipulator kit', 'Separate servo power rail', 'Larger battery'], checks: [
      marginCheck(x, ASSUMED_ARM_MASS_G, 'a small arm'),
      pl ? c('Mounting area', pl.mountArea >= 4 ? 'pass' : pl.mountArea === 3 ? 'caution' : 'fail', `Mounting-area rating ${pl.mountArea}/5 (see platform rating basis).`) : c('Mounting area', 'unknown', 'No platform selected.'),
      pl ? c('Rigidity', pl.rigidity >= 4 ? 'pass' : 'caution', `Rigidity rating ${pl.rigidity}/5.`) : c('Rigidity', 'unknown', 'No platform selected.'),
      c('Power', x.has('battery-holder') ? 'caution' : 'unknown', 'Servo current peaks may exceed the motor-driver/regulator budget; a separate rail is advisable.'),
    ] }
  },
  'multi-robot': (x) => {
    const fam = x.anchors?.product.uwb?.family
    const cap = fam === 'mauwb-dw3000' ? 'Makerfabs states 8 anchors + 64 tags for MaUWB firmware.' : fam === 'mauwb-dsto' ? 'DSTO default firmware lists up to 20 nodes in total.' : fam ? 'Multi-tag scheduling is custom firmware for this family.' : 'No anchors selected.'
    return { extraHardware: ['Additional UWB tag(s)', 'Second robot platform'], checks: [
      c('UWB capacity', fam === 'mauwb-dw3000' ? 'pass' : fam ? 'caution' : 'unknown', cap),
      c('Wireless bandwidth', x.processor?.proc ? 'caution' : 'unknown', 'Each robot streams video to the GPU server; check Wi-Fi capacity and server load.'),
    ] }
  },
  'edge-ai': (x) => {
    const p = x.processor?.proc
    if (!p) return { extraHardware: [], checks: [c('Processor', 'unknown', 'No processor selected.')] }
    const pcie = p.io.pcie
    const npu = /NPU|npu/.test(x.processor!.specs.flat().join(' '))
    return { extraHardware: pcie ? ['PCIe AI accelerator HAT'] : npu ? [] : ['USB / external accelerator'], checks: [
      c('Accelerator path', pcie ? 'pass' : npu ? 'caution' : p.io.usb ? 'caution' : 'fail', pcie ? 'PCIe lane available for an accelerator.' : npu ? 'On-SoC NPU exists but toolchain effort is higher.' : p.kind === 'mcu-vision' ? 'ESP32-class MCU: only tiny models.' : 'USB accelerator possible; throughput limited.'),
      c('Power', p.supply5vA && p.supply5vA >= 5 ? 'caution' : 'unknown', 'Accelerator adds load to the 5 V rail and battery.'),
    ] }
  },
  'battery': (x) => ({ extraHardware: ['Higher-capacity pack', 'Matching charger / protection'], checks: [
    marginCheck(x, 150, 'extra cells'),
    x.platform?.plat ? c('Space', x.platform.plat.mountArea >= 3 ? 'pass' : 'caution', `Mounting-area rating ${x.platform.plat.mountArea}/5.`) : c('Space', 'unknown', 'No platform selected.'),
    c('Charging', x.bySlot.charger.length ? 'pass' : 'caution', x.bySlot.charger.length ? 'Charger selected.' : 'Verify the kit’s charging circuit supports larger packs.'),
  ] }),
  'camera2': (x) => {
    const p = x.processor?.proc
    return { extraHardware: ['Second camera (supervisor approval required)', 'Second CSI/USB port'], checks: [
      c('Scope approval', 'caution', 'Additional cameras are not confirmed allowed hardware — obtain approval.'),
      p ? c('Camera ports', x.processor!.id.startsWith('pi5') ? 'pass' : p.io.usb ? 'caution' : 'fail', x.processor!.id.startsWith('pi5') ? 'Two CSI/DSI ports on Pi 5.' : 'One CSI port; a USB camera can be added if USB is free.') : c('Camera ports', 'unknown', 'No processor selected.'),
      c('Bandwidth', 'caution', 'Two streams double the wireless load; check the link.'),
    ] }
  },
  'odometry': (x) => {
    const pl = x.platform?.plat
    return { extraHardware: pl?.encoders === 'included' || x.has('encoders') ? [] : ['Encoders / encoder motors', 'Optional: optical flow (approval)'], checks: [
      pl ? c('Wheel encoders', x.has('encoders') ? 'pass' : pl.encoders === 'incompatible' ? 'fail' : 'caution', x.has('encoders') ? 'Encoders available.' : pl.encoders === 'incompatible' ? 'Manufacturer says encoders are not compatible.' : 'No encoders confirmed — add encoder motors or a custom mount.') : c('Wheel encoders', 'unknown', 'No platform selected.'),
      pl ? c('Slip', pl.drive === 'mecanum' || pl.drive === 'tracked' ? 'fail' : 'pass', pl.drive === 'mecanum' || pl.drive === 'tracked' ? 'Slip dominates wheel odometry; use visual-inertial odometry.' : 'Differential/skid base: moderate slip.') : c('Slip', 'unknown', 'No platform selected.'),
      c('Visual-inertial', 'pass', 'Camera + IMU visual-inertial odometry is a software upgrade on the GPU server.'),
    ] }
  },
  '3d-mapping': (x) => ({ extraHardware: ['Depth/stereo camera — requires a change to project requirements'], checks: [
    c('Sensor restriction', 'fail', 'Active depth sensing is ranging and conflicts with the current restrictions. Passive monocular reconstruction on the server is the compliant path.'),
    c('Compute', 'pass', 'Reconstruction can run on the GPU server (software-only).'),
    x.bySlot.camera[0]?.product.cam ? c('Camera', x.bySlot.camera[0].product.cam.shutter === 'global' ? 'pass' : 'caution', x.bySlot.camera[0].product.cam.vslamNote) : c('Camera', 'unknown', 'No camera selected.'),
  ] }),
}

export function evaluateGoal(cfg: Config, id: string, ctx: Ctx = buildContext(cfg)): GoalEval | undefined {
  const g = GOALS.find((x) => x.id === id)
  if (!g || !EVAL[id]) return undefined
  const { checks, extraHardware } = EVAL[id](ctx)
  const fails = checks.filter((k) => k.result === 'fail').length, cautions = checks.filter((k) => k.result === 'caution').length, unknown = checks.filter((k) => k.result === 'unknown').length
  const verdict: GoalEval['verdict'] = fails > 1 ? 'blocked' : fails === 1 ? 'limited' : unknown > checks.length / 2 ? 'unknown' : cautions > 0 || unknown > 0 ? 'possible-with-work' : 'supported'
  const summary = {
    supported: 'Current configuration meets the checked criteria.',
    'possible-with-work': 'Feasible, with the cautions listed below.',
    limited: 'One criterion fails — expect hardware or scope changes.',
    blocked: 'Multiple criteria fail on this configuration.',
    unknown: 'Not enough information in the current selection to judge.',
  }[verdict]
  return { id, label: g.label, verdict, kind: g.kind, checks, summary, extraHardware }
}

export const evaluateGoals = (cfg: Config): GoalEval[] => { const ctx = buildContext(cfg); return cfg.goals.map((g) => evaluateGoal(cfg, g, ctx)).filter((x): x is GoalEval => !!x) }
