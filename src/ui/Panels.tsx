import { AlertTriangle, Check, CircleHelp, X } from 'lucide-react'
import { GOALS } from '../data/goals'
import { buildContext } from '../engine/context'
import { estimatePayload, evaluatePower } from '../engine/power'
import { estimateStream, STREAM_PRESETS } from '../engine/streaming'
import { evaluateGoal, type CheckResult, type GoalEval } from '../engine/upgrades'
import { useStore } from '../state/store'
import { Badge, Field, NumberInput, cx } from './kit'

export function StreamEstimator() {
  const { active, update } = useStore()
  const s = active.stream
  const e = estimateStream(s)
  const preset = STREAM_PRESETS.find((p) => p.width === s.width && p.height === s.height && p.fps === s.fps && p.mbps === s.mbps)
  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Streaming estimator</h3><Badge tone="warn">Assumed bitrate — not a camera guarantee</Badge></div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {STREAM_PRESETS.map((p) => <button key={p.label} onClick={() => update((c) => ({ ...c, stream: { width: p.width, height: p.height, fps: p.fps, mbps: p.mbps } }))} className={cx('rounded-lg border px-2.5 py-1 text-xs', preset === p ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:text-fg')}>{p.label} · {p.mbps} Mbps</button>)}
        {!preset && <Badge tone="accent">Custom</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Width"><NumberInput aria-label="Width" value={s.width} min={16} onChange={(v) => v && update((c) => ({ ...c, stream: { ...c.stream, width: v } }))} /></Field>
        <Field label="Height"><NumberInput aria-label="Height" value={s.height} min={16} onChange={(v) => v && update((c) => ({ ...c, stream: { ...c.stream, height: v } }))} /></Field>
        <Field label="FPS"><NumberInput aria-label="FPS" value={s.fps} min={1} onChange={(v) => v && update((c) => ({ ...c, stream: { ...c.stream, fps: v } }))} /></Field>
        <Field label="Bitrate (Mbps)"><NumberInput aria-label="Bitrate" value={s.mbps} min={0.05} step={0.1} onChange={(v) => v && update((c) => ({ ...c, stream: { ...c.stream, mbps: v } }))} /></Field>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[['Bitrate', `${e.mbps.toFixed(2)} Mbps`], ['Per minute', `${e.mbPerMin.toFixed(1)} MB`], ['20 minutes', `${e.mb20min.toFixed(0)} MB`], ['1 hour storage', `${e.gbPerHour.toFixed(2)} GB`]].map(([k, v]) => <div key={k} className="rounded-lg bg-surface2 p-2.5"><div className="label">{k}</div><div className="num mt-0.5 font-semibold">{v}</div></div>)}
      </div>
      <p className="mt-2 text-[11px] text-faint">Preset bitrates are suggested configurable assumptions (H.264-class). Real bitrate depends on encoder, scene and settings; measure on the chosen hardware.</p>
    </div>
  )
}

export function PowerPanel() {
  const { active, update } = useStore()
  const ctx = buildContext(active)
  const p = evaluatePower(active, ctx)
  const pay = estimatePayload(ctx)
  const a = active.power
  const set = (k: keyof typeof a) => (v: number | null) => v != null && update((c) => ({ ...c, power: { ...c.power, [k]: v } }))
  return (
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Power-system evaluator</h3><Badge tone="warn">Estimates from assumptions — not measured</Badge></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Field label="Cell capacity (mAh)"><NumberInput aria-label="Cell capacity" value={a.capacityMah} min={100} onChange={set('capacityMah')} /></Field>
        <Field label="Motor avg. current (A)"><NumberInput aria-label="Motor current" value={a.motorAvgA} step={0.1} onChange={set('motorAvgA')} /></Field>
        <Field label="Computer load (W)"><NumberInput aria-label="Computer load" value={a.computeW} step={0.5} onChange={set('computeW')} /></Field>
        <Field label="Sensors + UWB (W)"><NumberInput aria-label="Sensor load" value={a.sensorsW} step={0.5} onChange={set('sensorsW')} /></Field>
        <Field label="Usable capacity (%)"><NumberInput aria-label="Usable capacity" value={a.usablePct} min={10} max={100} onChange={set('usablePct')} /></Field>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[['Cells', p.cells ? String(p.cells) : '—'], ['Pack voltage', p.packV ? `${p.packV.toFixed(1)} V` : '—'], ['Energy', p.energyWh ? `${p.energyWh.toFixed(1)} Wh` : '—'], ['Est. load', p.loadW ? `${p.loadW.toFixed(1)} W` : '—'], ['Est. runtime', p.runtimeMin ? `${Math.round(p.runtimeMin)} min` : '—']].map(([k, v]) => <div key={k} className="rounded-lg bg-surface2 p-2.5"><div className="label">{k}</div><div className="num mt-0.5 font-semibold">{v}</div></div>)}
      </div>
      <ul className="mt-3 space-y-0.5 text-[11px] text-faint">{p.assumptions.map((x) => <li key={x}>• {x}</li>)}</ul>
      <div className="mt-3 rounded-lg border border-line bg-surface2 p-3 text-sm">
        <div className="label mb-1">Estimated payload mass (assumed per-part masses)</div>
        <div className="num font-semibold">≈{Math.round(pay.grams)} g{pay.limitG != null ? <span className="font-normal text-muted"> of {Math.round(pay.limitG)} g rated ({Math.round((pay.fraction ?? 0) * 100)}%)</span> : <span className="font-normal text-warn"> — payload rating not published</span>}</div>
      </div>
    </div>
  )
}

const RES_ICON: Record<CheckResult, React.ReactNode> = {
  pass: <Check size={14} className="text-good" />, caution: <AlertTriangle size={14} className="text-warn" />, fail: <X size={14} className="text-bad" />, unknown: <CircleHelp size={14} className="text-faint" />,
}
const VERDICT: Record<GoalEval['verdict'], { label: string; tone: 'good' | 'info' | 'warn' | 'bad' | 'neutral' }> = {
  supported: { label: 'Supported by current hardware', tone: 'good' }, 'possible-with-work': { label: 'Possible with work', tone: 'info' }, limited: { label: 'Limited', tone: 'warn' }, blocked: { label: 'Blocked', tone: 'bad' }, unknown: { label: 'Not enough information', tone: 'neutral' },
}

export function GoalCard({ id }: { id: string }) {
  const { active } = useStore()
  const g = evaluateGoal(active, id)
  const meta = GOALS.find((x) => x.id === id)
  if (!g || !meta) return null
  const v = VERDICT[g.verdict]
  return (
    <div className="card anim-in p-4">
      <div className="mb-1 flex flex-wrap items-center gap-2"><h3 className="font-semibold">{g.label}</h3><Badge tone={v.tone}>{v.label}</Badge><Badge tone={g.kind === 'software' ? 'accent' : g.kind === 'hardware' ? 'violet' : 'neutral'}>{g.kind === 'software' ? 'Software-only upgrade' : g.kind === 'hardware' ? 'Needs new hardware' : 'Software + hardware'}</Badge></div>
      <p className="text-xs text-muted">{meta.blurb}</p>
      <ul className="mt-3 space-y-2">{g.checks.map((k) => <li key={k.label} className="flex gap-2 text-sm"><span className="mt-0.5">{RES_ICON[k.result]}</span><span><b className="font-medium">{k.label}.</b> <span className="text-muted">{k.detail}</span></span></li>)}</ul>
      {g.extraHardware.length > 0 && <div className="mt-3 rounded-lg bg-surface2 p-2.5 text-xs"><span className="label mr-2">Extra hardware</span>{g.extraHardware.join(' · ')}</div>}
      <p className="mt-2 text-[11px] text-faint">Verdict rule: 2+ failed checks → blocked; 1 → limited; cautions/unknowns → possible with work. No numeric scores are invented.</p>
    </div>
  )
}

export function GoalPicker() {
  const { active, update } = useStore()
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {GOALS.map((g) => {
        const on = active.goals.includes(g.id)
        return (
          <button key={g.id} aria-pressed={on}
            onClick={() => update((c) => ({ ...c, goals: on ? c.goals.filter((x) => x !== g.id) : [...c.goals, g.id] }), `${on ? 'Removed' : 'Added'} goal: ${g.label}`)}
            className={cx('flex items-start gap-2.5 rounded-xl border p-3 text-left transition', on ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line2')}>
            <span className={cx('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border', on ? 'border-accent bg-accent text-accent-ink' : 'border-line2')}>{on && <Check size={11} strokeWidth={3} />}</span>
            <span><span className="block text-sm font-medium">{g.label}</span><span className="block text-xs text-muted">{g.blurb}</span></span>
          </button>
        )
      })}
    </div>
  )
}
