import type { Product, Slot } from '../types'
import { platforms } from './platforms'
import { uwb } from './uwb'
import { processors, controllers } from './processors'
import { cameras } from './cameras'
import { imus, odometry, powerMonitors, safety, extraSensors, prohibited } from './sensors'
import { power, upgrades } from './power'

/** The seed catalog. Edit the individual data files to add products or update prices. */
export const catalog: Product[] = [
  ...platforms, ...uwb, ...processors, ...controllers, ...cameras, ...imus, ...odometry, ...powerMonitors, ...safety, ...extraSensors, ...power, ...upgrades, ...prohibited,
]

export const productById = new Map<string, Product>(catalog.map((p) => [p.id, p]))
export const getProduct = (id: string): Product | undefined => productById.get(id)

export interface SlotMeta { slot: Slot; label: string; single: boolean; required: boolean; hint: string }
export const SLOTS: Record<Slot, SlotMeta> = {
  platform: { slot: 'platform', label: 'Robot platform', single: true, required: true, hint: 'Chassis or complete kit. Variants are separate entries.' },
  'uwb-anchor': { slot: 'uwb-anchor', label: 'UWB anchors', single: true, required: true, hint: 'One model, quantity ≥ 4 fixed anchors.' },
  'uwb-tag': { slot: 'uwb-tag', label: 'UWB tag', single: true, required: true, hint: 'Mobile tag on the robot.' },
  processor: { slot: 'processor', label: 'Onboard processor', single: true, required: true, hint: 'Main onboard computer / vision board.' },
  controller: { slot: 'controller', label: 'Motor / safety controller', single: true, required: false, hint: 'Optional lower-level real-time controller.' },
  camera: { slot: 'camera', label: 'Primary camera', single: true, required: true, hint: 'Streams video to the GPU server.' },
  imu: { slot: 'imu', label: 'IMU', single: true, required: true, hint: 'Skipped when the platform already includes one.' },
  odometry: { slot: 'odometry', label: 'Wheel odometry', single: false, required: false, hint: 'Encoders. Optional unless you want wheel odometry.' },
  'extra-sensor': { slot: 'extra-sensor', label: 'Additional sensors', single: false, required: false, hint: 'Optional; some need supervisor approval.' },
  battery: { slot: 'battery', label: 'Batteries & holders', single: false, required: true, hint: 'Cells and holders.' },
  charger: { slot: 'charger', label: 'Charger', single: true, required: false, hint: 'Dedicated Li-ion charger.' },
  converter: { slot: 'converter', label: '5 V regulator', single: true, required: false, hint: 'Powers the onboard computer.' },
  'power-monitor': { slot: 'power-monitor', label: 'Power monitor', single: true, required: false, hint: 'Skipped when the platform already includes one.' },
  'motor-driver': { slot: 'motor-driver', label: 'Motor driver', single: true, required: true, hint: 'Skipped when the platform already includes one.' },
  safety: { slot: 'safety', label: 'Safety hardware', single: false, required: false, hint: 'E-stop, fuse, bumpers.' },
  wiring: { slot: 'wiring', label: 'Wiring & hardware', single: false, required: false, hint: 'Connectors, wire, fasteners.' },
  upgrade: { slot: 'upgrade', label: 'Future hardware upgrades', single: false, required: false, hint: 'Optional hardware that enables future goals.' },
  prohibited: { slot: 'prohibited', label: 'Prohibited sensors', single: false, required: false, hint: 'Not compliant with project restrictions.' },
}

export const BOM_GROUP: Record<Slot, string> = {
  platform: 'Robot platform', 'uwb-anchor': 'UWB', 'uwb-tag': 'UWB', processor: 'Processor', controller: 'Additional electronics', camera: 'Camera', imu: 'Sensors', odometry: 'Sensors',
  'extra-sensor': 'Sensors', battery: 'Power system', charger: 'Power system', converter: 'Power system', 'power-monitor': 'Sensors', 'motor-driver': 'Additional electronics',
  safety: 'Additional electronics', wiring: 'Additional electronics', upgrade: 'Future upgrades', prohibited: 'Prohibited',
}
export const GROUPS = ['Robot platform', 'UWB', 'Processor', 'Camera', 'Sensors', 'Power system', 'Additional electronics', 'Future upgrades'] as const

export interface StepDef { id: string; n: number; title: string; short: string; slots: Slot[]; blurb: string }
export const STEPS: StepDef[] = [
  { id: 'platform', n: 1, title: 'Robot platform / chassis', short: 'Platform', slots: ['platform'], blurb: 'Pick the mobile base. A complete kit and a bare chassis are not equivalent purchases — the engine tracks what each one includes.' },
  { id: 'uwb', n: 2, title: 'UWB localization', short: 'UWB', slots: ['uwb-anchor', 'uwb-tag'], blurb: 'Four fixed anchors plus one mobile tag. Anchor and tag can be different models, but they must share a protocol family.' },
  { id: 'processor', n: 3, title: 'Onboard processor', short: 'Processor', slots: ['processor', 'controller'], blurb: 'The software team decides the final board. Compare Linux computers, hybrids and vision MCUs here.' },
  { id: 'camera', n: 4, title: 'Camera & vision', short: 'Camera', slots: ['camera'], blurb: 'Camera interface must match the processor. The stream estimator below sizes the link to the GPU server.' },
  { id: 'imu', n: 5, title: 'IMU & odometry', short: 'IMU / odometry', slots: ['imu', 'odometry'], blurb: 'If the kit already includes an IMU or encoders, the incremental cost is $0 — upgrades remain optional.' },
  { id: 'sensors', n: 6, title: 'Additional sensors', short: 'Sensors', slots: ['extra-sensor', 'power-monitor', 'prohibited'], blurb: 'Optional extras. Items needing scope approval are marked; prohibited ranging sensors are shown separately and cannot be selected.' },
  { id: 'power', n: 7, title: 'Power system', short: 'Power', slots: ['battery', 'charger', 'converter', 'wiring'], blurb: 'Cells, holders, regulator and charger. Runtime estimates are assumptions, not measurements.' },
  { id: 'motor', n: 8, title: 'Motor control & safety', short: 'Motors / safety', slots: ['motor-driver', 'safety'], blurb: 'Motor driver (when the platform has none), emergency stop, fuse and bumpers.' },
  { id: 'future', n: 9, title: 'Future upgrades', short: 'Upgrades', slots: ['upgrade'], blurb: 'Choose future goals to see what your current hardware can and cannot support.' },
  { id: 'review', n: 10, title: 'Final review', short: 'Review', slots: [], blurb: 'Budget, compatibility, missing parts and BOM summary.' },
]
