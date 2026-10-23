import { ArrowDown, ArrowLeftRight, Battery, Camera, Cpu, Gauge, Radio, Server, ShieldCheck, Truck, Zap, CircuitBoard, type LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { buildContext } from '../engine/context'
import { useStore } from '../state/store'
import { cx } from './kit'

type NodeState = 'ok' | 'kit' | 'missing' | 'warn'
function Node({ icon: Icon, role, name, sub, state }: { icon: LucideIcon; role: string; name: string; sub?: string; state: NodeState }) {
  return (
    <div className={cx('flex items-start gap-2.5 rounded-xl border p-2.5', state === 'missing' ? 'border-dashed border-bad/60 bg-bad-soft' : state === 'warn' ? 'border-warn/50 bg-warn-soft' : state === 'kit' ? 'border-violet/40 bg-violet-soft' : 'border-line bg-surface2')}>
      <Icon size={18} className={cx('mt-0.5 shrink-0', state === 'missing' ? 'text-bad' : state === 'kit' ? 'text-violet' : 'text-accent')} />
      <div className="min-w-0"><div className="label !text-[10px]">{role}</div><div className="truncate text-[13px] font-medium leading-snug" title={name}>{name}</div>{sub && <div className="text-[11px] leading-snug text-muted">{sub}</div>}</div>
    </div>
  )
}
const Link = ({ label, dir = 'down' }: { label: string; dir?: 'down' | 'both' }) => (
  <div className="flex items-center justify-center gap-2 py-1.5 text-[11px] text-faint">{dir === 'down' ? <ArrowDown size={14} /> : <ArrowLeftRight size={14} />}{label}</div>
)

/** Architecture view derived from the live configuration. A kit-provided part is drawn separately from the main computer. */
export function Architecture() {
  const { active } = useStore()
  const c = useMemo(() => buildContext(active), [active])
  const kitName = (cap: Parameters<typeof c.kit.get>[0]) => c.kit.get(cap)?.product
  const src = (cap: Parameters<typeof c.kit.get>[0], slot: Parameters<typeof c.first>[0]) => {
    const sel = c.first(slot)
    const kit = kitName(cap)
    if (sel && kit) return { name: sel.name, sub: `optional replacement (kit has: ${kit.name})`, state: 'ok' as const }
    if (sel) return { name: sel.name, sub: undefined, state: 'ok' as const }
    if (kit) return { name: `Included in ${kit.name}`, sub: c.kit.get(cap)?.unverified ? 'inclusion unverified' : '$0 incremental', state: c.kit.get(cap)?.unverified ? ('warn' as const) : ('kit' as const) }
    return { name: 'Not selected', sub: undefined, state: 'missing' as const }
  }
  const anchors = c.anchors, tag = c.tag
  const imu = src('imu', 'imu'), cam = src('camera', 'camera'), drv = src('motor-driver', 'motor-driver')
  const proc = c.processor ? { name: c.processor.name, sub: c.processor.proc ? `${c.processor.proc.kind === 'mcu-vision' ? 'vision MCU' : c.processor.proc.kind === 'linux-mcu-hybrid' ? 'Linux + MCU' : 'Linux computer'}` : undefined, state: 'ok' as const }
    : c.kit.get('linux-computer') ? { name: `Included in ${c.kit.get('linux-computer')!.product.name}`, sub: undefined, state: 'kit' as const } : { name: 'Not selected', sub: undefined, state: 'missing' as const }
  const mcu = c.first('controller') ? { name: c.first('controller')!.name, sub: 'real-time / safety layer', state: 'ok' as const }
    : c.kit.get('motor-mcu') ? { name: `${c.kit.get('motor-mcu')!.product.name}: ESP32/MCU driver board`, sub: 'separate from the main computer', state: 'kit' as const }
      : { name: 'None — host drives motors directly', sub: 'no hard real-time layer', state: 'warn' as const }
  const estop = c.bySlot.safety.some((s) => s.product.provides.includes('estop'))
  const pw = c.bySlot.battery.find((b) => b.product.provides.includes('battery-cells')), kitCells = c.platform?.plat?.cells
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto_220px] lg:items-stretch">
      <div>
        <Node icon={Radio} role={`Fixed UWB anchors${anchors ? ` ×${anchors.qty}` : ''}`} name={anchors ? anchors.product.name : 'Not selected'} sub={anchors ? (anchors.qty < 4 ? `Only ${anchors.qty} — need 4` : `${anchors.product.uwb?.family}`) : undefined} state={!anchors || anchors.qty < 4 ? 'missing' : 'ok'} />
        <Link label="UWB two-way ranging (raw distances)" />
        <div className="rounded-2xl border border-line2 bg-surface p-3">
          <div className="label mb-2 flex items-center gap-1.5"><Truck size={12} /> Robot — {c.platform?.name ?? 'platform not selected'}</div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Node icon={Radio} role="UWB tag" name={tag ? tag.product.name : 'Not selected'} state={tag ? 'ok' : 'missing'} />
            <Node icon={Gauge} role="IMU" name={imu.name} sub={imu.sub} state={imu.state} />
            <Node icon={Camera} role="Camera" name={cam.name} sub={cam.sub} state={cam.state} />
          </div>
          <Link label="sensor data (UART / USB / I²C / CSI)" />
          <Node icon={Cpu} role="Onboard controller (main computer)" name={proc.name} sub={proc.sub} state={proc.state} />
          <Link label="motor commands (UART / PWM)" />
          <div className="grid gap-2 sm:grid-cols-2">
            <Node icon={CircuitBoard} role="Motor-control MCU" name={mcu.name} sub={mcu.sub} state={mcu.state} />
            <Node icon={Zap} role="Motor driver" name={drv.name} sub={drv.sub} state={drv.state} />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Node icon={ShieldCheck} role="Safety" name={estop ? 'Hardware emergency stop' : 'No emergency stop identified'} sub={c.bySlot.safety.length ? c.bySlot.safety.map((s) => s.product.name).join(', ') : undefined} state={estop ? 'ok' : 'missing'} />
            <Node icon={Battery} role="Power" name={pw ? `${pw.item.qty} × ${pw.product.name}` : kitCells ? `${kitCells.label} (not included in kit)` : 'No battery selected'} sub={c.has('dc-dc-5v') ? '5 V path present' : '5 V path missing'} state={pw || kitCells ? (c.has('dc-dc-5v') || c.processor?.proc?.vinDirect ? 'ok' : 'warn') : 'missing'} />
          </div>
        </div>
      </div>
      <div className="hidden items-center lg:flex"><div className="flex flex-col items-center gap-1 text-[11px] text-faint"><ArrowLeftRight size={18} />Wi-Fi<br />video ↑ / control ↓</div></div>
      <div className="lg:hidden"><Link label="Wi-Fi: video up, results down" dir="both" /></div>
      <div className="flex flex-col justify-center"><div className="rounded-2xl border border-violet/40 bg-violet-soft p-3 text-center"><Server size={26} className="mx-auto text-violet" /><div className="mt-1 text-sm font-semibold">GPU server</div><div className="text-xs text-muted">Detection · tracking · optional Visual SLAM</div><div className="mt-1 text-[11px] text-faint">external, not in BOM</div></div></div>
    </div>
  )
}
