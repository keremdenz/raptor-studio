import type { Config, Finding, RequirementStatus } from '../types'
import { OFFICIAL, type Requirement } from '../data/requirements'
import { buildContext, type Ctx } from './context'

export const STATUS_LABEL: Record<RequirementStatus, string> = {
  'not-started': 'Not started', 'hardware-proposed': 'Hardware proposed', planned: 'Planned', 'in-progress': 'In progress', blocked: 'Blocked',
  'evidence-recorded': 'Evidence recorded', 'needs-approval': 'Needs approval',
}

export interface ReqRow extends Requirement {
  planned: string; hardware: string[]; status: RequirementStatus; blockers: string[]; note?: string; verified: boolean
}

const names = (c: Ctx, ...slots: Parameters<Ctx['first']>[0][]) => [...new Set(slots.map((s) => c.first(s)?.name).filter(Boolean) as string[])]

/** Derived (hardware-readiness) status for every official requirement. Performance is never marked passed without recorded evidence. */
export function evaluateRequirements(cfg: Config, findings: Finding[]): ReqRow[] {
  const c = buildContext(cfg)
  const crit = (slot: string) => findings.filter((f) => f.severity === 'critical' && f.slot === slot)
  const anchorsOk = !!c.anchors && c.anchors.qty >= 4
  const loc = anchorsOk && !!c.tag && c.has('imu') && c.has('camera')
  const locMiss = [!anchorsOk && 'four UWB anchors', !c.tag && 'UWB tag', !c.has('imu') && 'IMU', !c.has('camera') && 'camera'].filter(Boolean) as string[]
  const vision = c.has('camera') && (!!c.processor || c.has('linux-computer'))
  const visMiss = [!c.has('camera') && 'camera', !(c.processor || c.has('linux-computer')) && 'onboard processor'].filter(Boolean) as string[]
  const drive = !!c.platform && c.has('motor-driver') && (!!c.processor || c.has('linux-computer'))
  const driveMiss = [!c.platform && 'robot platform', !c.has('motor-driver') && 'motor driver', !(c.processor || c.has('linux-computer')) && 'onboard processor'].filter(Boolean) as string[]
  const kitUltra = c.kit.has('ultrasonic')
  const prohibited = c.bySlot.prohibited.length > 0
  const estop = c.bySlot.safety.some((s) => s.product.provides.includes('estop'))

  type D = { planned: string; hardware: string[]; ok: boolean; miss: string[]; approval?: boolean; audit?: boolean }
  const d: Record<string, D> = {
    R01: { planned: 'Reserve a ≥10 m × 10 m indoor arena; mark floor grid for ground truth.', hardware: [], ok: false, miss: [] },
    R02: { planned: 'No GNSS hardware in the BOM.', hardware: [], ok: !prohibited, miss: prohibited ? ['remove prohibited parts'] : [], audit: true },
    R03: { planned: 'Raw ranges from four anchors fused with IMU and camera in an estimator.', hardware: [...names(c, 'uwb-anchor', 'uwb-tag', 'imu', 'camera')], ok: loc, miss: locMiss },
    R04: { planned: 'UWB + IMU + camera fusion; anchor placement and calibration study.', hardware: [...names(c, 'uwb-anchor', 'uwb-tag', 'imu')], ok: loc, miss: locMiss },
    R05: { planned: 'Health monitor: range residuals, link heartbeat, frame-rate watchdog, battery monitor.', hardware: names(c, 'processor', 'power-monitor'), ok: !!c.processor || c.has('linux-computer'), miss: ['onboard processor'] },
    R06: { planned: 'Solve with any 3 of 4 anchors; detect bias via residuals; fault-injection test.', hardware: names(c, 'uwb-anchor'), ok: anchorsOk, miss: ['four UWB anchors'] },
    R07: { planned: 'Robust estimator with outlier rejection; vision fallback; auto-exposure handling.', hardware: [...names(c, 'uwb-anchor', 'imu', 'camera')], ok: loc, miss: locMiss },
    R08: { planned: 'Waypoint navigation on top of the localization estimate.', hardware: names(c, 'platform', 'motor-driver', 'processor'), ok: drive, miss: driveMiss },
    R09: { planned: 'Detector on the GPU server; camera stream via wireless link.', hardware: names(c, 'camera', 'processor'), ok: vision && !crit('camera').length, miss: crit('camera').length ? ['camera/processor compatibility'] : visMiss },
    R10: { planned: 'Tracker on the GPU server; commands back to the robot.', hardware: names(c, 'camera', 'processor'), ok: vision && !crit('camera').length, miss: visMiss },
    R11: { planned: 'Re-detection / re-identification after occlusion.', hardware: names(c, 'camera', 'processor'), ok: vision && !crit('camera').length, miss: visMiss },
    R12: { planned: 'Follow controller keeping a safe distance estimated from localization and vision.', hardware: names(c, 'platform', 'camera'), ok: drive && vision, miss: [...driveMiss, ...visMiss] },
    R13: { planned: 'Boundary geofence plus camera-based obstacle avoidance; bumpers as backup.', hardware: [...names(c, 'platform', 'camera'), ...c.bySlot.safety.filter((s) => s.product.id === 'bumper-switch').map((s) => s.product.name)], ok: drive && vision, miss: [...driveMiss, ...visMiss] },
    R14: { planned: 'Safe-stop state machine; hardware stop path.', hardware: [...c.bySlot.safety.map((s) => s.product.name)], ok: drive && estop, miss: [...driveMiss, !estop && 'emergency-stop mechanism'].filter(Boolean) as string[] },
    R15: { planned: 'GUI fed by the robot and GPU server (status, positions, sensors, tracking).', hardware: names(c, 'processor'), ok: !!c.processor || c.has('linux-computer'), miss: ['onboard processor'] },
    R16: { planned: 'BOM audit: no LiDAR / GNSS / ultrasonic / ToF / radar. The app blocks them from selection.', hardware: [], ok: !prohibited && !kitUltra, miss: prohibited ? ['prohibited part selected'] : [], approval: kitUltra, audit: true },
  }

  return OFFICIAL.map((r) => {
    const x = d[r.id]
    const ev = cfg.evidence[r.id]
    const verified = ev?.state === 'evidence-recorded' && !!ev.note.trim()
    let status: RequirementStatus
    if (verified) status = 'evidence-recorded'
    else if (x.approval) status = 'needs-approval'
    else if (r.id === 'R01') status = ev?.state === 'in-progress' ? 'in-progress' : ev?.state === 'planned' ? 'planned' : 'not-started'
    else if (!x.ok) status = 'blocked'
    else if (ev?.state === 'in-progress') status = 'in-progress'
    else if (ev?.state === 'planned' || r.id === 'R05') status = 'planned'
    else status = x.hardware.length > 0 || (x.audit && cfg.items.length > 0) ? 'hardware-proposed' : x.audit ? 'not-started' : 'planned'
    return { ...r, planned: x.planned, hardware: x.hardware, status, blockers: x.ok ? [] : x.miss, note: x.approval ? 'Kit includes an ultrasonic module (prohibited class) — keep it unused and tell the supervisor.' : undefined, verified }
  })
}
