import { useState } from 'react'
import { Battery, Camera, Cpu, CircuitBoard, Gauge, Radio, Settings2, ShieldAlert, ShieldCheck, Truck, Zap, Plug, Boxes, Ban, type LucideIcon } from 'lucide-react'
import type { Product, Slot } from '../types'
import { cx } from './kit'

export const SLOT_ICON: Record<Slot, LucideIcon> = {
  platform: Truck, 'uwb-anchor': Radio, 'uwb-tag': Radio, processor: Cpu, controller: CircuitBoard, camera: Camera, imu: Gauge, odometry: Settings2, 'extra-sensor': Boxes, battery: Battery,
  charger: Plug, converter: Zap, 'power-monitor': Gauge, 'motor-driver': CircuitBoard, safety: ShieldCheck, wiring: Plug, upgrade: Boxes, prohibited: Ban,
}

/** Real product photo when a verified URL exists; otherwise a labelled placeholder. External failures fall back silently. */
export function ProductImage({ product, className, large }: { product: Product; className?: string; large?: boolean }) {
  const [failed, setFailed] = useState(false)
  const Icon = SLOT_ICON[product.slots[0]] ?? ShieldAlert
  if (product.image && !failed) {
    return (
      <div className={cx('relative overflow-hidden bg-white', className)}>
        <img src={product.image} alt={`${product.brand} ${product.name}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-contain" />
      </div>
    )
  }
  return (
    <div className={cx('grid-bg relative grid place-items-center overflow-hidden bg-surface2 text-faint', className)} aria-label={`No image available for ${product.name}`}>
      <div className="flex flex-col items-center gap-1.5 px-3 text-center">
        <Icon size={large ? 46 : 28} strokeWidth={1.4} className="text-accent/70" />
        {large && <span className="text-[11px] leading-tight">{product.image ? 'Image failed to load' : 'No verified product photo stored'}<br />Set `image` in src/data</span>}
        <span className="rounded border border-line bg-surface/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">{product.brand}</span>
      </div>
    </div>
  )
}
