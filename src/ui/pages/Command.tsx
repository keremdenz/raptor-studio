import { useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, ClipboardList, FileDown, History, Rocket, Upload, Wand2 } from 'lucide-react'
import { PRESETS, type Preset } from '../../data/presets'
import { countBySeverity, evaluate } from '../../engine/compat'
import { computeCost, money, totalStatus } from '../../engine/cost'
import { configFromJson } from '../../engine/exporters'
import { presetConfig } from '../../engine/presets'
import { evaluateRequirements } from '../../engine/requirements'
import { go, useStore } from '../../state/store'
import { BudgetBar, CostDonut } from '../BudgetViz'
import { Badge, Button, Modal, SectionTitle, Stat, cx } from '../kit'
import { FindingsList } from '../Findings'
import { getProduct } from '../../data/catalog'

export function PresetCard({ preset, onApply }: { preset: Preset; onApply: (p: Preset) => void }) {
  const { active } = useStore()
  const { cfg, cost, f } = useMemo(() => { const cfg = presetConfig(preset, active); return { cfg, cost: computeCost(cfg), f: countBySeverity(evaluate(cfg)) } }, [preset, active])
  const st = totalStatus(cost)
  const [open, setOpen] = useState(false)
  return (
    <>
      <article className="card card-hover flex flex-col p-4">
        <div className="mb-1 flex items-start justify-between gap-2"><div><div className="label">{preset.alias}</div><h3 className="text-base font-semibold">{preset.name}</h3></div>
          <Badge tone={st.tone === 'ok' ? 'good' : st.tone === 'warn' ? 'warn' : 'bad'}>{cost.overBudget ? 'Over budget' : cost.unknownCount ? 'Incomplete' : 'In budget'}</Badge></div>
        <p className="text-sm text-muted">{preset.tagline}</p>
        <div className="my-3">
          <div className="flex items-baseline justify-between"><span className="num text-2xl font-semibold">{money(cost.subtotal, 0)}</span><span className="text-xs text-muted">known parts{cost.unknownCount > 0 && ` · +${cost.unknownCount} unpriced`}</span></div>
          <div className="mt-1.5"><BudgetBar cost={cost} budget={active.settings.budget} compact /></div>
          <div className="mt-1.5 text-xs text-muted">Projected total with allowances <b className="num text-fg">{money(cost.total, 0)}</b> {cost.hintSubtotal > cost.subtotal && <>· with hint prices ≈ <b className="num text-fg">{money(cost.hintSubtotal * (1 + active.settings.shippingTaxPct / 100), 0)}</b></>}</div>
        </div>
        <ul className="mb-3 space-y-1 text-xs text-muted">{preset.tradeoffs.slice(0, 2).map((t) => <li key={t} className="flex gap-1.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warn" />{t}</li>)}</ul>
        <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]"><Badge tone={f.critical ? 'bad' : 'good'}>{f.critical} critical</Badge><Badge tone={f.missing ? 'warn' : 'good'}>{f.missing} missing parts</Badge><Badge>{f.validation + f.integration} to validate</Badge></div>
        <div className="mt-auto flex gap-2"><Button size="sm" variant="primary" onClick={() => onApply(preset)}>Load into configurator</Button><Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Details</Button></div>
      </article>
      <Modal open={open} onClose={() => setOpen(false)} title={`${preset.name} — ${preset.alias}`} wide>
        <p className="text-sm text-muted">{preset.rationale}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><h4 className="label mb-1.5">Selected components</h4><ul className="space-y-1 text-sm">{cfg.items.map((i) => { const p = getProduct(i.productId); return p && <li key={i.slot + i.productId} className="flex justify-between gap-2"><span>{p.name} {i.qty > 1 && <span className="text-muted">×{i.qty}</span>}</span><span className="num text-muted">{cost.lines.find((l) => l.productId === p.id && l.kind === 'purchase')?.ext == null ? 'TBD' : money(p.price == null ? null : (cost.lines.find((l) => l.productId === p.id && l.kind === 'purchase')!.ext ?? 0))}</span></li> })}</ul>
            <div className="mt-2 border-t border-line pt-2 text-sm"><div className="flex justify-between"><span>Known subtotal</span><b className="num">{money(cost.subtotal)}</b></div><div className="flex justify-between text-muted"><span>Shipping / tax allowance</span><span className="num">{money(cost.shippingTax)}</span></div><div className="flex justify-between"><span>Projected total</span><b className="num">{money(cost.total)}</b></div></div>
            {cost.unknownCount > 0 && <p className="mt-2 text-xs text-bad">Unpriced: {cost.unknownLabels.join(', ')}. Total is incomplete.</p>}
            {cost.designMissing.length > 0 && <p className="mt-1 text-xs text-warn">Missing: {cost.designMissing.join(', ')}</p>}</div>
          <div className="space-y-3 text-sm">
            <div><h4 className="label mb-1">Strengths</h4><ul className="list-disc pl-4 text-muted">{preset.strengths.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h4 className="label mb-1">Limitations & trade-offs</h4><ul className="list-disc pl-4 text-muted">{[...preset.limitations, ...preset.tradeoffs].map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h4 className="label mb-1">Upgrades</h4><ul className="list-disc pl-4 text-muted">{preset.upgrades.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
        </div>
        <div className="mt-4"><h4 className="label mb-1.5">Compatibility status</h4><FindingsList findings={evaluate(cfg)} hideOptional max={6} /></div>
        <div className="mt-4 flex justify-end gap-2"><Button onClick={() => setOpen(false)}>Close</Button><Button variant="primary" onClick={() => { setOpen(false); onApply(preset) }}>Load into configurator</Button></div>
      </Modal>
    </>
  )
}

export function Command() {
  const { active, cost, findings, log, update, create, importConfig, setNotice } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const reqs = useMemo(() => evaluateRequirements(active, findings), [active, findings])
  const counts = countBySeverity(findings)
  const ready = reqs.filter((r) => r.status === 'hardware-proposed' || r.status === 'evidence-recorded' || r.status === 'planned').length
  const blocked = reqs.filter((r) => r.status === 'blocked').length
  const parts = active.items.length
  const platform = active.items.find((i) => i.slot === 'platform')
  const st = totalStatus(cost)
  const maturity = parts === 0 ? 'Concept' : cost.designMissing.length || counts.critical ? 'Draft — incomplete' : cost.unknownCount ? 'Candidate — pricing open' : counts.validation + counts.integration ? 'Candidate — validation pending' : 'Ready for review'
  const apply = (p: Preset) => {
    const cfg = presetConfig(p, active)
    if (active.items.length === 0) update((c) => ({ ...c, items: cfg.items, goals: cfg.goals }), `Loaded preset: ${p.name}`)
    else create(`${p.name}`, cfg)
    go('configurator', 'review')
  }
  const onFile = async (f?: File) => {
    if (!f) return
    try { const c = configFromJson(await f.text()); importConfig(c); setNotice({ kind: 'good', text: `Imported “${c.name}”.` }) } catch (e) { setNotice({ kind: 'warn', text: `Import failed: ${(e as Error).message}` }) }
  }
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <section className="card grid-bg relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-surface via-surface/85 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="mb-3 flex flex-wrap gap-2"><Badge tone="accent">METU EEE · EE493 · 2026–2027</Badge><Badge tone="violet">Senior design project</Badge></div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">RAPTOR <span className="text-accent">Hardware Design Studio</span></h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base"><b className="text-fg">R</b>esilient <b className="text-fg">A</b>utonomous Navigation and <b className="text-fg">P</b>ersistent <b className="text-fg">T</b>arget <b className="text-fg">O</b>bservation in Contested Indoor <b className="text-fg">R</b>obots — a GNSS-denied indoor robot using raw UWB ranges, IMU and camera, with heavy vision processing on an external GPU server.</p>
            <p className="mt-3 max-w-2xl text-sm font-medium">Can we build the minimum RAPTOR robot with these parts, within <span className="num text-accent">{money(active.settings.budget, 0)}</span>, while keeping a reasonable path to future upgrades?</p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button size="lg" variant="primary" onClick={() => go('configurator', 'platform')}><Rocket size={16} /> Build Your RAPTOR</Button>
              <Button size="lg" onClick={() => go('requirements')}><ClipboardList size={16} /> Requirements</Button>
              <Button size="lg" onClick={() => fileRef.current?.click()}><Upload size={16} /> Import JSON</Button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
            </div>
          </div>
          <div className="rounded-xl border border-line bg-bg/60 p-4 backdrop-blur">
            <div className="flex items-baseline justify-between"><span className="label">{active.name}</span><span className={cx('text-xs font-medium', st.tone === 'ok' ? 'text-good' : st.tone === 'warn' ? 'text-warn' : 'text-bad')}>{st.label}</span></div>
            <div className="mt-2 flex items-baseline gap-2"><span className="num text-4xl font-semibold">{money(cost.total, 0)}</span><span className="text-sm text-muted">of {money(active.settings.budget, 0)}</span></div>
            <div className="mt-3"><BudgetBar cost={cost} budget={active.settings.budget} compact /></div>
            <div className="mt-2 flex justify-between text-xs text-muted"><span>{Math.round(cost.utilization * 100)}% used</span><span className="num">{cost.remaining >= 0 ? `${money(cost.remaining, 0)} remaining` : `${money(-cost.remaining, 0)} over`}</span></div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8" aria-label="Project metrics">
        <Stat label="Current cost" value={money(cost.total, 0)} sub={`known parts ${money(cost.subtotal, 0)}`} tone={cost.overBudget ? 'bad' : undefined} />
        <Stat label="Remaining" value={money(cost.remaining, 0)} sub={`${Math.round(cost.utilization * 100)}% utilised`} tone={cost.remaining < 0 ? 'bad' : 'good'} />
        <Stat label="Platform" value={<span className="block truncate text-base leading-8">{platform ? getProduct(platform.productId)?.name : '—'}</span>} sub={platform ? undefined : 'none selected'} onClick={() => go('configurator', 'platform')} />
        <Stat label="Components" value={parts} sub="selected line items" onClick={() => go('bom')} />
        <Stat label="Compatibility" value={counts.critical} tone={counts.critical ? 'bad' : 'good'} sub={`critical · ${counts.integration + counts.validation} to validate`} onClick={() => go('requirements')} />
        <Stat label="Missing parts" value={cost.designMissing.length} tone={cost.designMissing.length ? 'warn' : 'good'} sub={cost.designMissing.slice(0, 2).join(', ') || 'none'} onClick={() => go('configurator', 'review')} />
        <Stat label="Unpriced" value={cost.unknownCount} tone={cost.unknownCount ? 'bad' : 'good'} sub={cost.unknownCount ? 'total incomplete' : 'all priced'} onClick={() => go('bom')} />
        <Stat label="Requirements" value={`${ready}/${reqs.length}`} tone={blocked ? 'warn' : undefined} sub={`hardware-ready · ${blocked} blocked`} onClick={() => go('requirements')} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-4">
          <SectionTitle sub="Click a segment to edit that group.">Budget allocation</SectionTitle>
          <BudgetBar cost={cost} budget={active.settings.budget} />
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[220px_1fr]">
            <CostDonut cost={cost} />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Design maturity</span><Badge tone={maturity.startsWith('Ready') ? 'good' : maturity === 'Concept' ? 'neutral' : 'info'}>{maturity}</Badge></div>
              <div className="flex justify-between"><span className="text-muted">Shipping / tax allowance ({active.settings.shippingTaxPct}%)</span><span className="num">{money(cost.shippingTax)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Contingency reserve ({active.settings.contingencyPct}%)</span><span className="num">{money(cost.contingency)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Total incl. reserve</span><span className={cx('num', cost.totalWithContingency > active.settings.budget && 'text-warn')}>{money(cost.totalWithContingency)}</span></div>
              <p className="text-xs text-faint">Allowances are editable team assumptions (BOM page). Prices are preliminary unless marked verified.</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-4"><SectionTitle>Open issues</SectionTitle>{findings.filter((f) => f.severity !== 'optional').length ? <FindingsList findings={findings} hideOptional max={4} /> : <p className="flex items-center gap-2 text-sm text-muted"><CheckCircle2 size={16} className="text-good" /> {parts ? 'No blocking issues found.' : 'Start a configuration to see compatibility results.'}</p>}</div>
          <div className="card p-4"><SectionTitle>Recent changes</SectionTitle>
            {log.length === 0 ? <p className="text-sm text-muted">Changes you make are listed here (stored locally in this browser).</p> :
              <ul className="space-y-1.5 text-sm">{log.slice(0, 6).map((l, i) => <li key={i} className="flex gap-2"><History size={14} className="mt-0.5 shrink-0 text-faint" /><span className="min-w-0 flex-1 truncate">{l.text}</span><span className="shrink-0 text-xs text-faint">{new Date(l.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></li>)}</ul>}</div>
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle sub="Costs and compatibility are computed from real catalog prices — no fabricated budgets. Loading a preset into a non-empty configuration creates a copy." right={<Badge tone="violet"><Wand2 size={11} /> {PRESETS.length} presets</Badge>}>Starting configurations</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{PRESETS.map((p) => <PresetCard key={p.id} preset={p} onApply={apply} />)}</div>
      </section>

      <footer className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-xs text-faint"><FileDown size={14} /> Prices marked “preliminary” are team research values, not quotations. Specifications marked unchecked have not been verified against manufacturer documentation. <a className="text-accent hover:underline" onClick={() => go('requirements')} href="#/requirements">Honesty rules <ArrowRight size={11} className="inline" /></a></footer>
    </div>
  )
}
