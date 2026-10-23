import type { PriceStatus, RaptorStatus, Severity, Slot, SourceConfidence, SpecStatus, ProcStatus } from '../types'

export const RAPTOR_LABEL: Record<RaptorStatus, { label: string; tone: 'good' | 'info' | 'warn' | 'neutral' | 'bad' }> = {
  'compatible-in-principle': { label: 'Compatible in principle', tone: 'good' },
  'requires-firmware': { label: 'Requires firmware development', tone: 'info' },
  'requires-validation': { label: 'Requires experimental validation', tone: 'warn' },
  'insufficient-info': { label: 'Insufficient information', tone: 'neutral' },
  incompatible: { label: 'Incompatible', tone: 'bad' },
  prohibited: { label: 'Prohibited by official requirements', tone: 'bad' },
}
export const SEV_TONE: Record<Severity, 'bad' | 'warn' | 'info' | 'violet' | 'neutral'> = { critical: 'bad', missing: 'warn', integration: 'info', validation: 'violet', optional: 'neutral' }
export const PRICE_LABEL: Record<PriceStatus, { label: string; tone: 'good' | 'warn' | 'bad' | 'accent' }> = {
  'page-verified': { label: 'Price matches seller page', tone: 'good' }, preliminary: { label: 'Preliminary — unverified', tone: 'warn' }, manual: { label: 'Manual price', tone: 'accent' }, unknown: { label: 'Price unknown', tone: 'bad' },
}
export const CONF_LABEL: Record<SourceConfidence, string> = { datasheet: 'Official datasheet', manufacturer: 'Manufacturer website', distributor: 'Distributor listing', community: 'Community source', 'team-estimate': 'Team estimate' }
export const SPEC_LABEL: Record<SpecStatus, string> = { checked: 'Specs checked against page', partial: 'Specs partly checked', unchecked: 'Specs not yet checked' }
export const PROC_STATES: { value: ProcStatus; label: string }[] = [
  { value: 'researching', label: 'Researching' }, { value: 'shortlisted', label: 'Shortlisted' }, { value: 'approved', label: 'Approved' }, { value: 'ordered', label: 'Ordered' }, { value: 'received', label: 'Received' }, { value: 'tested', label: 'Tested' },
]
export const PRIORITY_LABEL = { 'buy-now': 'Buy now', 'before-integration': 'Needed before integration', optional: 'Optional upgrade', research: 'Research only' } as const
export const SLOT_NOUN: Record<Slot, string> = {
  platform: 'Platform', 'uwb-anchor': 'UWB anchor', 'uwb-tag': 'UWB tag', processor: 'Processor', controller: 'Controller', camera: 'Camera', imu: 'IMU', odometry: 'Odometry', 'extra-sensor': 'Sensor',
  battery: 'Battery', charger: 'Charger', converter: 'Regulator', 'power-monitor': 'Power monitor', 'motor-driver': 'Motor driver', safety: 'Safety', wiring: 'Wiring', upgrade: 'Upgrade', prohibited: 'Prohibited',
}
