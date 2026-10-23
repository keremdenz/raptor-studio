import { Fragment, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ShieldAlert, TriangleAlert } from 'lucide-react'
import { APPROVAL_ITEMS, MILESTONES, NOT_PRESCRIBED, RECOMMENDATIONS, UNVERIFIED_ASSUMPTIONS } from '../../data/requirements'
import { RISKS } from '../../data/risks'
import { buildContext } from '../../engine/context'
import { countBySeverity, SEVERITY_LABEL, SEVERITY_ORDER } from '../../engine/compat'
import { evaluateRequirements, STATUS_LABEL } from '../../engine/requirements'
import type { ReqState, RequirementStatus } from '../../types'
import { useStore } from '../../state/store'
import { Badge, Empty, SectionTitle, Segmented, cx, inputCls } from '../kit'
import { FindingsList } from '../Findings'
import { SEV_TONE } from '../labels'
import { getProduct } from '../../data/catalog'

const ST_TONE: Record<RequirementStatus, 'neutral' | 'info' | 'violet' | 'bad' | 'good' | 'warn' | 'accent'> = {
  'not-started': 'neutral', 'hardware-proposed': 'info', planned: 'violet', 'in-progress': 'accent', blocked: 'bad', 'evidence-recorded': 'good', 'needs-approval': 'warn',
}

function Matrix() {
  const { active, findings, update, inspect } = useStore()
  const rows = useMemo(() => evaluateRequirements(active, findings), [active, findings])
  const groups = [...new Set(rows.map((r) => r.group))]
  const blank: { state: ReqState; note: string } = { state: 'not-started', note: '' }
  const set = (id: string, patch: Partial<{ state: ReqState; note: string }>) => update((c) => ({ ...c, evidence: { ...c.evidence, [id]: { ...blank, ...(c.evidence[id] ?? {}), ...patch } } }), `Updated evidence for ${id}`)
  return (
    <div>
      <div className="mb-4 flex gap-2 rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm"><TriangleAlert size={18} className="mt-0.5 shrink-0 text-warn" /><div><b>“Hardware proposed” is not “passed”.</b> This app never marks a performance requirement as met from a datasheet or a vendor accuracy claim. Only an evidence note that you record yourself changes a row to “Evidence recorded”.</div></div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead><tr className="text-xs text-muted"><th className="px-3 py-2.5">#</th><th className="px-3 py-2.5">Official requirement</th><th className="px-3 py-2.5">Planned solution</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Verification method</th><th className="px-3 py-2.5">Evidence you record</th></tr></thead>
          <tbody>
            {groups.map((g) => <Fragment key={g}>
              <tr className="bg-surface2"><td colSpan={6} className="label px-3 py-1.5">{g}</td></tr>
              {rows.filter((r) => r.group === g).map((r) => (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="px-3 py-3 font-mono text-xs text-faint">{r.id}</td>
                  <td className="px-3 py-3 font-medium">{r.text}</td>
                  <td className="px-3 py-3 text-muted">{r.planned}
                    {r.hardware.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{r.hardware.map((h) => <Badge key={h} tone="accent">{h}</Badge>)}</div>}
                    {r.blockers.length > 0 && <div className="mt-1 text-xs text-bad">Missing: {r.blockers.join(', ')}</div>}
                    {r.note && <div className="mt-1 text-xs text-warn">{r.note}</div>}</td>
                  <td className="px-3 py-3"><Badge tone={ST_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>{r.status !== 'evidence-recorded' && <div className="mt-1 text-[10px] text-faint">Not verified</div>}</td>
                  <td className="px-3 py-3 text-xs text-muted">{r.verification}</td>
                  <td className="w-56 px-3 py-3">
                    <select aria-label={`Status of ${r.id}`} className={cx(inputCls, 'h-8 text-xs')} value={active.evidence[r.id]?.state ?? 'not-started'} onChange={(e) => set(r.id, { state: e.target.value as ReqState })}>
                      <option value="not-started">Not started</option><option value="planned">Planned</option><option value="in-progress">In progress</option><option value="evidence-recorded">Evidence recorded</option></select>
                    <textarea aria-label={`Evidence note for ${r.id}`} rows={2} className={cx(inputCls, 'mt-1 h-auto py-1.5 text-xs')} placeholder="Test name, date, result…" value={active.evidence[r.id]?.note ?? ''} onChange={(e) => set(r.id, { note: e.target.value })} />
                    {active.evidence[r.id]?.state === 'evidence-recorded' && !active.evidence[r.id]?.note.trim() && <div className="mt-0.5 text-[10px] text-warn">A note is required to count as evidence.</div>}</td>
                </tr>))}
            </Fragment>)}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card p-4"><h3 className="mb-2 font-semibold">Kinds of statements in this app</h3>
          <ol className="space-y-2 text-sm text-muted">
            <li><Badge tone="accent">1</Badge> <b className="text-fg">Official mandatory requirements</b> — the table above (from the RAPTOR presentation).</li>
            <li><Badge tone="info">2</Badge> <b className="text-fg">Engineering recommendations</b> — below; not mandated.</li>
            <li><Badge tone="violet">3</Badge> <b className="text-fg">Optional future upgrades</b> — Roadmap page.</li>
            <li><Badge tone="warn">4</Badge> <b className="text-fg">Unverified assumptions</b> — below.</li>
            <li><Badge tone="bad">5</Badge> <b className="text-fg">Items requiring supervisor approval</b> — below.</li></ol></div>
        <div className="card p-4"><h3 className="mb-2 font-semibold">Not prescribed by the original presentation</h3><p className="mb-1 text-xs text-muted">The app never invents requirements for these:</p><ul className="list-disc pl-5 text-sm text-muted">{NOT_PRESCRIBED.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div className="card p-4"><h3 className="mb-2 font-semibold">Engineering recommendations</h3><ul className="space-y-1.5 text-sm">{RECOMMENDATIONS.map((r) => {
          const c = buildContext(active); const done = r.id === 'E01' ? c.bySlot.safety.some((s) => s.product.provides.includes('estop')) : r.id === 'E02' ? c.has('motor-mcu') : r.id === 'E03' ? c.has('power-monitor') : r.id === 'E04' ? c.has('encoders') : c.bySlot.safety.some((s) => s.product.id === 'bumper-switch')
          return <li key={r.id} className="flex gap-2">{done ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-good" /> : <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-line2" />}<span>{r.text} <span className="text-xs text-faint">({done ? 'present in design' : 'not in design'})</span></span></li> })}</ul></div>
        <div className="card p-4"><h3 className="mb-2 font-semibold">Unverified assumptions</h3><ul className="list-disc pl-5 text-sm text-muted">{UNVERIFIED_ASSUMPTIONS.map((x) => <li key={x}>{x}</li>)}</ul>
          <h3 className="mb-2 mt-4 font-semibold">Needs supervisor approval</h3><ul className="list-disc pl-5 text-sm text-muted">{APPROVAL_ITEMS.map((x) => <li key={x}>{x}</li>)}</ul><button className="mt-2 text-xs text-accent hover:underline" onClick={() => inspect('p-lidar')}>View prohibited-sensor notes</button></div>
      </div>
    </div>
  )
}

function Compat() {
  const { findings, inspect } = useStore()
  const counts = countBySeverity(findings)
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">{SEVERITY_ORDER.map((s) => <div key={s} className="card p-3"><Badge tone={SEV_TONE[s]}>{SEVERITY_LABEL[s]}</Badge><div className="num mt-2 text-2xl font-semibold">{counts[s]}</div></div>)}</div>
      {findings.length === 0 ? <Empty icon={<ShieldAlert size={28} />} title="Nothing to evaluate yet">Select hardware in the configurator and its compatibility results appear here.</Empty> : <div className="card p-4"><FindingsList findings={findings} inspect={(id) => inspect(id)} /></div>}
      <p className="mt-3 text-xs text-faint">Rules live in <code className="mono">src/engine/compat.ts</code> and read facts from product data (interfaces, camera support, host support, family, voltage, payload) — add a rule object to extend. Warnings explain their basis: official requirement, engineering judgement, or data gap.</p>
    </div>
  )
}

function Risks() {
  const { active, update } = useStore()
  const ctx = useMemo(() => buildContext(active), [active])
  const [onlyActive, setOnlyActive] = useState(false)
  const rows = RISKS.map((r) => ({ ...r, ...active.riskEdits[r.id], applies: r.appliesTo ? r.appliesTo(ctx) : true })).filter((r) => !onlyActive || r.applies)
  const edit = (id: string, patch: object) => update((c) => ({ ...c, riskEdits: { ...c.riskEdits, [id]: { ...c.riskEdits[id], ...patch } } }))
  return (
    <div>
      <div className="mb-3 flex items-center justify-between"><p className="text-sm text-muted">Score = probability × impact (1–5 each). Seeded by the app author; edit to your team’s judgement.</p><Segmented value={onlyActive ? 'a' : 'all'} onChange={(v) => setOnlyActive(v === 'a')} options={[{ value: 'all', label: 'All risks' }, { value: 'a', label: 'Relevant to this build' }]} /></div>
      <div className="card overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead><tr className="text-xs text-muted"><th className="px-3 py-2">Component</th><th className="px-3 py-2">Risk</th><th className="px-3 py-2">P</th><th className="px-3 py-2">I</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Mitigation</th><th className="px-3 py-2">Verification</th><th className="px-3 py-2">Status</th></tr></thead>
        <tbody>{rows.map((r) => { const score = r.probability * r.impact; return (
          <tr key={r.id} className="border-t border-line align-top">
            <td className="px-3 py-2.5"><Badge>{r.component}</Badge>{r.applies && r.appliesTo && <div className="mt-1"><Badge tone="warn">in this build</Badge></div>}</td>
            <td className="px-3 py-2.5 font-medium">{r.title}</td>
            {(['probability', 'impact'] as const).map((k) => <td key={k} className="px-3 py-2.5"><select aria-label={`${r.id} ${k}`} className={cx(inputCls, 'h-8 w-14 px-1.5 text-xs')} value={r[k]} onChange={(e) => edit(r.id, { [k]: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></td>)}
            <td className="px-3 py-2.5"><Badge tone={score >= 15 ? 'bad' : score >= 8 ? 'warn' : 'good'}>{score}</Badge></td>
            <td className="min-w-[240px] px-3 py-2.5"><textarea aria-label={`${r.id} mitigation`} rows={2} className={cx(inputCls, 'h-auto py-1.5 text-xs')} value={r.mitigation} onChange={(e) => edit(r.id, { mitigation: e.target.value })} /></td>
            <td className="px-3 py-2.5 text-xs text-muted">{r.verification}</td>
            <td className="px-3 py-2.5"><select aria-label={`${r.id} status`} className={cx(inputCls, 'h-8 text-xs')} value={r.status ?? 'open'} onChange={(e) => edit(r.id, { status: e.target.value })}><option value="open">Open</option><option value="mitigating">Mitigating</option><option value="closed">Closed</option></select></td>
          </tr>) })}</tbody></table></div>
    </div>
  )
}

function Milestones() {
  const today = new Date()
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-4"><h3 className="mb-1 font-semibold">EE493 administrative deadlines</h3><p className="mb-3 text-xs text-muted">Course schedule items — separate from the hardware requirements.</p>
        <ul className="space-y-2">{MILESTONES.map((m) => { const d = new Date(m.date); const days = Math.ceil((d.getTime() - today.getTime()) / 86400000); return <li key={m.title} className="flex items-center gap-3 rounded-lg bg-surface2 p-2.5 text-sm"><CalendarDays size={16} className="text-accent" /><div className="flex-1"><div className="font-medium">{m.title}</div><div className="text-xs text-muted">{d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div></div><Badge tone={days < 0 ? 'neutral' : days < 14 ? 'warn' : 'info'}>{days < 0 ? 'past' : `${days} days`}</Badge></li> })}</ul></div>
      <div className="card p-4"><h3 className="mb-1 font-semibold">Hardware design checkpoints</h3><p className="mb-3 text-xs text-muted">Suggested order derived from the procurement status you track per part.</p>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted"><li>Freeze UWB family after raw-range verification on one anchor + tag.</li><li>Confirm camera ↔ processor driver pair before ordering.</li><li>Check kit IMU / power-monitor claims on the vendor wiki.</li><li>Order buy-now items; track status (ordered → received → tested).</li><li>Weigh the build and measure current draw to replace assumptions.</li></ol></div>
    </div>
  )
}

export function Requirements({ arg }: { arg?: string }) {
  const [tab, setTab] = useState<'matrix' | 'compat' | 'risks' | 'plan'>((['matrix', 'compat', 'risks', 'plan'] as const).find((t) => t === arg) ?? 'matrix')
  const { active } = useStore()
  useEffect(() => { const t = (['matrix', 'compat', 'risks', 'plan'] as const).find((x) => x === arg); if (t) setTab(t) }, [arg])
  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <SectionTitle sub={`Configuration: ${active.name}${getProduct(active.items.find((i) => i.slot === 'platform')?.productId ?? '')?.name ? ' · ' + getProduct(active.items.find((i) => i.slot === 'platform')!.productId)!.name : ''}`}
        right={<Segmented value={tab} onChange={setTab} options={[{ value: 'matrix', label: 'Requirements' }, { value: 'compat', label: 'Compatibility' }, { value: 'risks', label: 'Risk register' }, { value: 'plan', label: 'Milestones' }]} />}>Requirements & Compatibility</SectionTitle>
      {tab === 'matrix' && <Matrix />}{tab === 'compat' && <Compat />}{tab === 'risks' && <Risks />}{tab === 'plan' && <Milestones />}
    </div>
  )
}
