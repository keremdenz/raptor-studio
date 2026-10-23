// ---------------------------------------------------------------------------
// Core domain types for RAPTOR Hardware Design Studio.
// Everything the engine knows about a part lives in the Product record so that
// prices, specs and compatibility can be edited without touching UI code.
// ---------------------------------------------------------------------------

export type Slot =
  | 'platform' | 'uwb-anchor' | 'uwb-tag' | 'processor' | 'controller' | 'camera'
  | 'imu' | 'odometry' | 'extra-sensor' | 'battery' | 'charger' | 'converter'
  | 'power-monitor' | 'motor-driver' | 'safety' | 'wiring' | 'upgrade' | 'prohibited'

/** What a product physically provides. Used for kit-inclusion and duplicate logic. */
export type Capability =
  | 'motor-driver' | 'motor-mcu' | 'imu' | 'power-monitor' | 'encoders' | 'battery-holder'
  | 'camera' | 'estop' | 'linux-computer' | 'ultrasonic' | 'servo-driver' | 'charger'
  | 'dc-dc-5v' | 'battery-cells' | 'power-switch' | 'fuse' | 'wifi-streaming'

export type PriceStatus = 'preliminary' | 'page-verified' | 'manual' | 'unknown'
export type SourceConfidence = 'datasheet' | 'manufacturer' | 'distributor' | 'community' | 'team-estimate'
/** checked = key specs compared against a fetched page; partial = some; unchecked = recalled/supplied */
export type SpecStatus = 'checked' | 'partial' | 'unchecked'

export type RaptorStatus =
  | 'compatible-in-principle'
  | 'requires-firmware'
  | 'requires-validation'
  | 'insufficient-info'
  | 'incompatible'
  | 'prohibited'

export type CamIface = 'csi-pi' | 'usb-uvc' | 'integrated'
export type SupportLevel = 'yes' | 'no' | 'unverified'

export interface SourceRef { label: string; kind: SourceConfidence; url?: string }
export interface ObservedPrice { price: number; seller: string; date: string; url: string; note?: string }
/** Implied purchase that the product itself does not include (e.g. bare UWB module needs a PCB). */
export interface NeedPart { label: string; price: number | null; perUnit: number }

export interface Ratings {
  /** 1–5. Basis string is mandatory so scores are never unexplained. */
  integration: number; docs: number; expandability: number
}

export interface PlatformAttrs {
  kind: 'complete-kit' | 'chassis-kit' | 'bare-chassis'
  drive: 'skid-4wd' | 'differential' | 'mecanum' | 'tracked' | 'ackermann'
  payloadKg: number | null
  sizeMm?: string
  motorVoltage: number | null
  encoders: 'included' | 'optional-accessory' | 'incompatible' | 'unconfirmed'
  /** Which host-computer families the kit's control board is designed for. */
  hostSupport: ('any' | 'raspberry-pi' | 'arduino' | 'esp32' | 'orange-pi' | 'luckfox')[]
  kitCamera?: { iface: CamIface; note: string }
  cells?: { count: number; label: string; nominalV: number }
  /** 1–5 judgement of expansion room; see ratingBasis. */
  mountArea: 1 | 2 | 3 | 4 | 5
  rigidity: 1 | 2 | 3 | 4 | 5
  hasRails: boolean
}

export interface ProcessorAttrs {
  family: 'raspberry-pi' | 'arduino' | 'esp32' | 'orange-pi' | 'luckfox'
  kind: 'linux-sbc' | 'linux-mcu-hybrid' | 'mcu-vision' | 'mcu-controller'
  cpu: string
  ramMB: number
  storage: string
  wifi: string
  cameraSupport: Partial<Record<CamIface, SupportLevel>>
  cameraNote: string
  hwEncode: 'hw-h264' | 'sw-only' | 'hw-h264-unverified' | 'unknown'
  hwEncodeNote: string
  ros2: 'native' | 'possible' | 'micro-ros' | 'limited'
  realtime: 'none-linux' | 'hybrid-mcu' | 'mcu'
  io: { uart: boolean; i2c: boolean; spi: boolean; usb: boolean; gpio: boolean; pcie: boolean; csi: boolean; can?: boolean }
  powerIn: string
  /** typical supply requirement in amps at 5 V, null when unknown */
  supply5vA: number | null
  upgradePath: string
  /** Board can be fed directly from a 2S/3S pack through a VIN input. */
  vinDirect?: boolean
}

export interface CameraAttrs {
  iface: CamIface
  sensor: string
  resolution: string
  fps: string
  fovDeg: number | null
  shutter: 'rolling' | 'global'
  color: 'rgb' | 'mono'
  autofocus: boolean | null
  lowLight: string
  vslam: 1 | 2 | 3 | 4 | 5
  vslamNote: string
}

export interface UwbAttrs {
  roles: ('anchor' | 'tag')[]
  family: string // protocol family: boards in the same family are assumed able to range with each other
  chip: string
  hostLinks: ('uart' | 'usb' | 'spi' | 'wifi')[]
  rawRanges: 'documented' | 'unverified' | 'not-available'
  rawRangesNote: string
  anchorPower: string
  firmware: 'mature' | 'examples-only' | 'custom'
  channel: string
  calibration: 'low' | 'medium' | 'high'
  failover: string
  regulatory: string
  maxClaimedAccuracyCm: number | null
  bareModule?: boolean
}

export interface PowerAttrs {
  voltageNominal?: number
  capacityMah?: number
  maxLoadA?: number
  outputV?: number
  inputMinV?: number
  inputMaxV?: number
  outputMaxA?: number
  channels?: number
  /** max continuous motor current per channel */
  motorCurrentA?: number
  typCurrentMa?: number
}

export interface Product {
  id: string
  slots: Slot[]
  family?: string
  name: string
  brand: string
  variant?: string
  price: number | null
  priceStatus: PriceStatus
  priceNote?: string
  priceHint?: { price: number; note: string }
  observed?: ObservedPrice
  priceDate: string
  seller: string
  url?: string
  altUrl?: string
  datasheetUrl?: string
  image?: string
  imageNote?: string
  stock?: string
  summary: string
  pros: string[]
  cons: string[]
  specs: [string, string][]
  includes: string[]
  excludes: string[]
  provides: Capability[]
  providesUnverified?: Partial<Record<Capability, string>>
  needs?: NeedPart[]
  sources: SourceRef[]
  confidence: SourceConfidence
  specStatus: SpecStatus
  ratings?: Ratings
  ratingBasis?: string
  raptorStatus: RaptorStatus
  raptorNote: string
  futureNote?: string
  tags: string[]
  plat?: PlatformAttrs
  proc?: ProcessorAttrs
  cam?: CameraAttrs
  uwb?: UwbAttrs
  pwr?: PowerAttrs
  /** For prohibited research items only */
  prohibitedReason?: string
  /** Priority hint used by BOM */
  purchasePriority?: 'buy-now' | 'before-integration' | 'optional' | 'research'
  /** Slot-specific default quantity */
  defaultQty?: number
  /** Mass per unit in grams, when known (otherwise slot defaults are assumed) */
  massG?: number
}

// ------------------------------- configuration -----------------------------

export type ProcStatus = 'researching' | 'shortlisted' | 'approved' | 'ordered' | 'received' | 'tested'
export type PurchasePriority = 'buy-now' | 'before-integration' | 'optional' | 'research'

export interface SelectedItem { slot: Slot; productId: string; qty: number }
export interface CustomItem { id: string; label: string; category: string; qty: number; unitPrice: number | null; required: boolean; note?: string }

export interface Settings {
  budget: number
  shippingTaxPct: number
  contingencyPct: number
  priceBasis: 'preliminary' | 'observed'
  includeContingencyInTotal: boolean
}

export type ReqState = 'not-started' | 'proposed' | 'planned' | 'in-progress' | 'evidence-recorded'
export interface EvidenceRecord { state: ReqState; note: string }
export interface RiskEdit { probability?: number; impact?: number; mitigation?: string; status?: 'open' | 'mitigating' | 'closed' }

export interface StreamSettings { width: number; height: number; fps: number; mbps: number }
export interface PowerAssumptions { motorAvgA: number; computeW: number; sensorsW: number; usablePct: number; capacityMah: number }

export interface Config {
  id: string
  name: string
  owner: string
  schema: 1
  createdAt: string
  updatedAt: string
  items: SelectedItem[]
  goals: string[]
  settings: Settings
  priceOverrides: Record<string, number | null>
  customItems: CustomItem[]
  notes: Record<string, string>
  procurement: Record<string, ProcStatus>
  priority: Record<string, PurchasePriority>
  evidence: Record<string, EvidenceRecord>
  riskEdits: Record<string, RiskEdit>
  stream: StreamSettings
  power: PowerAssumptions
}

// ------------------------------- engine outputs ----------------------------

export type Severity = 'critical' | 'missing' | 'integration' | 'validation' | 'optional'
export interface Finding {
  id: string
  severity: Severity
  title: string
  detail: string
  basis: 'official' | 'engineering' | 'data'
  slot?: Slot
  productIds?: string[]
}

export type BomKind = 'purchase' | 'included' | 'custom' | 'implied' | 'missing'
export interface BomLine {
  key: string
  kind: BomKind
  category: string
  slot?: Slot
  productId?: string
  label: string
  brand?: string
  model?: string
  qty: number
  unitPrice: number | null
  ext: number | null
  required: boolean
  includedIn?: string
  reason?: string
  seller?: string
  url?: string
  priceStatus?: PriceStatus
  note?: string
  verification: string
  priority: PurchasePriority
  roles?: string
  duplicate?: boolean
}

export interface CostSummary {
  lines: BomLine[]
  subtotal: number
  unknownCount: number
  unknownLabels: string[]
  shippingTax: number
  contingency: number
  total: number
  totalWithContingency: number
  /** subtotal if unpriced lines that carry a hint were priced at the hint */
  hintSubtotal: number
  unresolvedAfterHints: number
  remaining: number
  utilization: number
  overBudget: boolean
  tight: boolean
  byGroup: Record<string, number>
  designMissing: string[]
}

export type RequirementStatus =
  | 'not-started' | 'hardware-proposed' | 'planned' | 'in-progress' | 'blocked' | 'evidence-recorded' | 'needs-approval'
