import { Cpu, Wrench } from 'lucide-react'
import { GOALS } from '../../data/goals'
import { evaluateGoal } from '../../engine/upgrades'
import { catalog } from '../../data/catalog'
import { useStore } from '../../state/store'
import { Badge, SectionTitle, cx } from '../kit'
import { GoalCard, GoalPicker } from '../Panels'

interface Item { title: string; kind: 'software' | 'hardware' | 'mixed'; goal?: string; note: string }
const ITEMS: Item[] = [
  { title: 'Camera-based Visual SLAM', kind: 'software', goal: 'vslam', note: 'Runs on the GPU server from the existing camera stream. A global-shutter camera improves it.' },
  { title: '3D mapping', kind: 'mixed', goal: '3d-mapping', note: 'Monocular reconstruction on the server is compliant; depth sensors conflict with the ranging restriction.' },
  { title: 'More sophisticated navigation', kind: 'software', note: 'Better planners and costmaps on the server; same robot hardware.' },
  { title: 'Dynamic obstacle avoidance', kind: 'software', goal: 'obstacle', note: 'Camera-based only; bumpers as backup.' },
  { title: 'Target re-identification', kind: 'software', goal: 'adv-tracking', note: 'Appearance embeddings on the GPU server.' },
  { title: 'Multi-target tracking', kind: 'software', goal: 'adv-tracking', note: 'Needs a wider FOV for best results.' },
  { title: 'Predictive trajectory estimation', kind: 'software', note: 'Motion models fed by tracker output.' },
  { title: 'Learning-based fault detection', kind: 'software', note: 'Needs logged UWB residuals / IMU data — plan onboard or server logging.' },
  { title: 'Edge-AI acceleration', kind: 'mixed', goal: 'edge-ai', note: 'Accelerator hardware depends on the host (PCIe on Pi 5, NPU on RK/RV boards).' },
  { title: 'Onboard data logging', kind: 'hardware', note: 'Needs storage (microSD/NVMe) and enough write bandwidth; often software + a faster card.' },
  { title: 'Robot arm / manipulator', kind: 'hardware', goal: 'arm', note: 'Adds mass and servo current peaks.' },
  { title: 'Additional local safety controller', kind: 'hardware', note: 'A small MCU with a hardware watchdog — cheap and strongly recommended.' },
  { title: 'Multi-robot cooperation', kind: 'mixed', goal: 'multi-robot', note: 'More tags on the same anchors; depends on the UWB family.' },
  { title: 'Improved battery management', kind: 'hardware', goal: 'battery', note: 'Protection/BMS, monitoring and a larger pack.' },
]
const TONE = { software: 'accent', hardware: 'violet', mixed: 'info' } as const
const LABEL = { software: 'Software-only', hardware: 'Needs new hardware', mixed: 'Software + hardware' } as const

export function Roadmap() {
  const { active } = useStore()
  const hw = catalog.filter((p) => p.slots.includes('upgrade'))
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <SectionTitle sub="How the minimum RAPTOR design can evolve, and whether your current chassis and electronics can carry each step. These are optional upgrades, never official requirements.">Future Roadmap</SectionTitle>
      <h3 className="mb-2 text-base font-semibold">Intended goals for {active.name}</h3>
      <GoalPicker />
      {active.goals.length > 0 && <div className="mt-5 grid gap-4 xl:grid-cols-2">{active.goals.map((g) => <GoalCard key={g} id={g} />)}</div>}

      <h3 className="mb-3 mt-8 text-base font-semibold">Upgrade ladder</h3>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ITEMS.map((it) => {
          const ev = it.goal ? evaluateGoal(active, it.goal) : undefined
          return (
            <div key={it.title} className="card p-4">
              <div className="mb-1.5 flex items-start justify-between gap-2"><h4 className="font-medium leading-snug">{it.title}</h4>{it.kind === 'software' ? <Cpu size={16} className="shrink-0 text-accent" /> : <Wrench size={16} className="shrink-0 text-violet" />}</div>
              <div className="mb-2 flex flex-wrap gap-1.5"><Badge tone={TONE[it.kind]}>{LABEL[it.kind]}</Badge>{ev && <Badge tone={ev.verdict === 'supported' ? 'good' : ev.verdict === 'blocked' ? 'bad' : ev.verdict === 'limited' ? 'warn' : 'neutral'}>{active.items.length ? ev.verdict.replace(/-/g, ' ') : 'select hardware'}</Badge>}</div>
              <p className="text-sm text-muted">{it.note}</p>
              {ev && active.items.length > 0 && ev.checks.some((c) => c.result === 'fail' || c.result === 'caution') && <p className={cx('mt-2 text-xs', ev.verdict === 'blocked' ? 'text-bad' : 'text-warn')}>{ev.checks.find((c) => c.result === 'fail' || c.result === 'caution')!.detail}</p>}
            </div>
          )
        })}
      </div>

      <h3 className="mb-3 mt-8 text-base font-semibold">Hardware placeholders (price to be filled in)</h3>
      <div className="grid gap-3 md:grid-cols-3">{hw.map((p) => <div key={p.id} className="card p-4"><div className="font-medium">{p.name}</div><p className="mt-1 text-sm text-muted">{p.summary}</p><div className="mt-2 flex gap-1.5">{p.tags.filter((t) => t.startsWith('goal:')).map((t) => <Badge key={t} tone="violet">{GOALS.find((g) => `goal:${g.id}` === t)?.label}</Badge>)}{p.tags.includes('approval-required') && <Badge tone="warn">Needs approval</Badge>}</div></div>)}</div>
    </div>
  )
}
