import { useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import { Fragment } from 'react'
import { getProduct } from '../../data/catalog'
import type { Product } from '../../types'
import { NOT_PRESCRIBED, OFFICIAL, UNVERIFIED_ASSUMPTIONS } from '../../data/requirements'
import { RISKS } from '../../data/risks'
import { SEVERITY_LABEL } from '../../engine/compat'
import { buildContext } from '../../engine/context'
import { money, totalStatus } from '../../engine/cost'
import { evaluatePower, estimatePayload } from '../../engine/power'
import { evaluateRequirements, STATUS_LABEL } from '../../engine/requirements'
import { evaluateGoals } from '../../engine/upgrades'
import { shareUrl } from '../../engine/share'
import { useStore } from '../../state/store'
import { Architecture } from '../Architecture'
import { BudgetBar, CostDonut } from '../BudgetViz'
import { Button } from '../kit'
import { GOALS } from '../../data/goals'

const H = ({ n, children }: { n: number; children: React.ReactNode }) => <h2 className="mb-2 mt-7 border-b border-line pb-1 text-lg font-semibold"><span className="mr-2 text-accent">{n}.</span>{children}</h2>
const Th = ({ children }: { children?: React.ReactNode }) => <th className="border border-line bg-surface2 px-2 py-1 text-left text-xs font-semibold">{children}</th>
const Td = ({ children, cls = '' }: { children?: React.ReactNode; cls?: string }) => <td className={`border border-line px-2 py-1 align-top text-xs ${cls}`}>{children}</td>

export function Report() {
  const { active, cost, findings } = useStore()
  const ctx = buildContext(active)
  const reqs = evaluateRequirements(active, findings)
  const power = evaluatePower(active, ctx)
  const pay = estimatePayload(ctx)
  const goals = evaluateGoals(active)
  const st = totalStatus(cost)
  const [link, setLink] = useState('')
  useEffect(() => { shareUrl(active).then(setLink).catch(() => setLink('')) }, [active])
  const sel = (slot: Parameters<typeof ctx.first>[0]) => ctx.bySlot[slot]
  const pn = (slot: Parameters<typeof ctx.first>[0]) => sel(slot).map((x) => `${x.product.brand} ${x.product.name}${x.item.qty > 1 ? ` ×${x.item.qty}` : ''}`).join('; ') || '—'
  const allProducts: Product[] = []
  for (const it of active.items) { const p = getProduct(it.productId); if (p && !allProducts.includes(p)) allProducts.push(p) }
  const sources = [...new Set(allProducts.flatMap((p) => [p.url, ...p.sources.map((x) => x.url)]).filter((u): u is string => !!u))]

  return (
    <div className="mx-auto max-w-[960px] px-4 py-6 sm:px-6">
      <div className="no-print mb-4 flex items-center justify-between rounded-xl border border-line bg-surface p-3"><span className="text-sm text-muted">Print-optimised report. Use “Save as PDF” in the print dialog.</span><Button variant="primary" onClick={() => window.print()}><Printer size={15} /> Print / Save PDF</Button></div>
      <article className="report paper card p-8 text-[13px] leading-relaxed">
        <header className="border-b-2 border-accent pb-4">
          <div className="label">Middle East Technical University · Dept. of Electrical and Electronics Engineering · 2026–2027</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">RAPTOR — Hardware Selection &amp; Engineering Design Report</h1>
          <p className="mt-1 text-muted">Configuration: <b>{active.name}</b>{active.owner && <> · {active.owner}</>} · Generated {new Date().toLocaleString()} · Currency USD</p>
          <p className="mt-2 rounded border border-line p-2 text-xs"><b>Status: {st.label}.</b> Prices marked preliminary are team research values, not quotations. Specifications marked unchecked are unverified. No requirement is claimed as experimentally satisfied unless evidence is recorded in §16.</p>
        </header>

        <H n={1}>Project overview</H>
        <p>RAPTOR — Resilient Autonomous Navigation and Persistent Target Observation in Contested Indoor Environments — is an autonomous mobile robot for a GNSS-denied indoor arena (≥10 m × 10 m). It localizes with raw UWB ranges from four fixed anchors plus IMU and camera, detects and follows a moving target, and offloads heavy vision processing to an external GPU server over a wireless link. Hardware budget: <b>{money(active.settings.budget, 0)}</b>.</p>

        <H n={2}>Official minimum requirements</H>
        <table className="w-full border-collapse"><thead><tr><Th>#</Th><Th>Requirement</Th><Th>Verification method</Th></tr></thead><tbody>{OFFICIAL.map((r) => <tr key={r.id}><Td>{r.id}</Td><Td>{r.text}</Td><Td>{r.verification}</Td></tr>)}</tbody></table>
        <p className="mt-1 text-xs text-muted">Not prescribed by the presentation: {NOT_PRESCRIBED.join('; ')}.</p>

        <H n={3}>Selected system architecture</H>
        <div className="rp-card"><Architecture /></div>

        <H n={4}>Selected robot platform</H>
        <p>{pn('platform')}</p>
        {ctx.platform?.plat && <p className="text-xs text-muted">Kind: {ctx.platform.plat.kind}; drive: {ctx.platform.plat.drive}; payload: {ctx.platform.plat.payloadKg ?? 'not published'} kg; included capabilities: {ctx.platform.provides.join(', ') || 'none'}.</p>}
        <H n={5}>UWB configuration</H>
        <p>Anchors: {pn('uwb-anchor')}. Tag: {pn('uwb-tag')}.</p>
        {ctx.anchors?.product.uwb && <p className="text-xs text-muted">Family {ctx.anchors.product.uwb.family}; raw ranges: {ctx.anchors.product.uwb.rawRanges}. Vendor accuracy claims are ranging claims, not demonstrated robot localization accuracy.</p>}
        <H n={6}>Processor</H><p>{pn('processor')}{sel('controller').length ? ` + ${pn('controller')}` : ''}</p>
        {ctx.processor?.proc && <p className="text-xs text-muted">{ctx.processor.proc.cpu}; {ctx.processor.proc.ramMB || 'unknown'} MB RAM; video encode: {ctx.processor.proc.hwEncode}.</p>}
        <H n={7}>Camera</H><p>{pn('camera') !== '—' ? pn('camera') : ctx.kit.get('camera') ? `Included in ${ctx.kit.get('camera')!.product.name}` : '—'}</p>
        <H n={8}>Sensors</H><p>IMU: {pn('imu') !== '—' ? pn('imu') : ctx.kit.get('imu') ? `Included in ${ctx.kit.get('imu')!.product.name}` : '—'}. Odometry: {pn('odometry') !== '—' ? pn('odometry') : ctx.kit.get('encoders') ? 'kit encoders' : 'none'}. Other: {pn('extra-sensor')}; power monitor: {pn('power-monitor') !== '—' ? pn('power-monitor') : ctx.kit.get('power-monitor') ? 'kit' : '—'}.</p>
        <H n={9}>Power and motor-control architecture</H>
        <p>Batteries: {pn('battery')}; regulator: {pn('converter') !== '—' ? pn('converter') : ctx.kit.get('dc-dc-5v') ? 'kit supply' : '—'}; motor driver: {pn('motor-driver') !== '—' ? pn('motor-driver') : ctx.kit.get('motor-driver') ? `kit (${ctx.kit.get('motor-driver')!.product.name})` : '—'}; safety: {pn('safety')}.</p>
        <p className="text-xs text-muted">Assumption-based estimate (not measured): pack {power.packV ? power.packV.toFixed(1) + ' V' : '—'}, load {power.loadW ? power.loadW.toFixed(1) + ' W' : '—'}, runtime {power.runtimeMin ? Math.round(power.runtimeMin) + ' min' : '—'}; electronics mass ≈{Math.round(pay.grams)} g{pay.limitG ? ` of ${Math.round(pay.limitG)} g rated` : ''}.</p>

        <H n={10}>Bill of materials</H>
        <table className="w-full border-collapse"><thead><tr><Th>Category</Th><Th>Item</Th><Th>Qty</Th><Th>Unit</Th><Th>Ext.</Th><Th>Acquisition</Th><Th>Verification</Th></tr></thead><tbody>
          {cost.lines.map((l) => <tr key={l.key}><Td>{l.category}</Td><Td>{l.brand ? l.brand + ' ' : ''}{l.label}{l.roles ? ` (${l.roles})` : ''}</Td><Td>{l.qty}</Td><Td cls="num">{l.unitPrice == null ? 'UNKNOWN' : money(l.unitPrice)}</Td><Td cls="num">{l.ext == null ? 'UNKNOWN' : money(l.ext)}</Td><Td>{l.kind === 'included' ? `Included in ${l.includedIn}` : l.kind === 'implied' ? 'Implied' : l.required ? 'Purchase' : 'Optional purchase'}</Td><Td>{l.verification}</Td></tr>)}</tbody></table>
        <H n={11}>Total cost</H>
        <table className="w-full max-w-md border-collapse"><tbody>
          <tr><Td>Known parts</Td><Td cls="num text-right">{money(cost.subtotal)}</Td></tr><tr><Td>Shipping / tax allowance ({active.settings.shippingTaxPct}%)</Td><Td cls="num text-right">{money(cost.shippingTax)}</Td></tr>
          <tr><Td>Contingency reserve ({active.settings.contingencyPct}%)</Td><Td cls="num text-right">{money(cost.contingency)}</Td></tr><tr><Td><b>Projected total</b></Td><Td cls="num text-right"><b>{money(cost.total)}</b></Td></tr></tbody></table>
        {cost.unknownCount > 0 && <p className="mt-1 font-semibold text-bad">INCOMPLETE — {cost.unknownCount} unknown price(s): {cost.unknownLabels.join(', ')}.</p>}
        {cost.designMissing.length > 0 && <p className="font-semibold text-warn">Design incomplete — missing: {cost.designMissing.join(', ')}.</p>}
        <H n={12}>Budget remaining</H>
        <p><b>{cost.remaining >= 0 ? money(cost.remaining) + ' remaining' : money(-cost.remaining) + ' OVER BUDGET'}</b> ({Math.round(cost.utilization * 100)}% of {money(active.settings.budget, 0)}).</p>
        <div className="rp-card my-2 grid items-center gap-4 sm:grid-cols-[200px_1fr]"><CostDonut cost={cost} height={180} /><BudgetBar cost={cost} budget={active.settings.budget} interactive={false} /></div>

        <H n={13}>Component advantages</H>
        <ul className="list-disc pl-5">{allProducts.map((p) => <li key={p.id}><b>{p.name}:</b> {p.pros.join('; ')}</li>)}</ul>
        <H n={14}>Component disadvantages</H>
        <ul className="list-disc pl-5">{allProducts.map((p) => <li key={p.id}><b>{p.name}:</b> {p.cons.join('; ')}</li>)}</ul>
        <H n={15}>Identified compatibility risks</H>
        <table className="w-full border-collapse"><thead><tr><Th>Class</Th><Th>Issue</Th><Th>Detail</Th></tr></thead><tbody>{findings.filter((f) => f.severity !== 'optional').map((f) => <tr key={f.id}><Td>{SEVERITY_LABEL[f.severity]}</Td><Td>{f.title}</Td><Td>{f.detail}</Td></tr>)}</tbody></table>
        <p className="mt-2 text-xs font-semibold">Risk register (active for this build)</p>
        <table className="w-full border-collapse"><thead><tr><Th>Component</Th><Th>Risk</Th><Th>Score</Th><Th>Mitigation</Th></tr></thead><tbody>{RISKS.filter((r) => !r.appliesTo || r.appliesTo(ctx)).map((r) => { const e = active.riskEdits[r.id]; const p = e?.probability ?? r.probability, i = e?.impact ?? r.impact; return <tr key={r.id}><Td>{r.component}</Td><Td>{r.title}</Td><Td>{p * i}</Td><Td>{e?.mitigation ?? r.mitigation}</Td></tr> })}</tbody></table>
        <H n={16}>Requirements verification plan</H>
        <table className="w-full border-collapse"><thead><tr><Th>#</Th><Th>Requirement</Th><Th>Planned solution / hardware</Th><Th>Status</Th><Th>Verification &amp; recorded evidence</Th></tr></thead><tbody>
          {reqs.map((r) => <tr key={r.id}><Td>{r.id}</Td><Td>{r.text}</Td><Td>{r.planned}{r.hardware.length ? ` [${r.hardware.join(', ')}]` : ''}</Td><Td>{STATUS_LABEL[r.status]}{r.status !== 'evidence-recorded' ? ' (not verified)' : ''}</Td><Td>{r.verification}{r.verified ? ` — EVIDENCE: ${active.evidence[r.id].note}` : ''}</Td></tr>)}</tbody></table>
        <H n={17}>Future expansion opportunities</H>
        {goals.length === 0 ? <p className="text-muted">No future goals selected.</p> : goals.map((g) => <Fragment key={g.id}><p className="mt-1 font-semibold">{g.label} — {g.verdict.replace(/-/g, ' ')} ({GOALS.find((x) => x.id === g.id)?.kind})</p><ul className="list-disc pl-5 text-xs">{g.checks.map((c) => <li key={c.label}>[{c.result}] {c.label}: {c.detail}</li>)}</ul></Fragment>)}
        <H n={18}>Sources and manufacturer links</H>
        <ul className="list-disc pl-5 text-xs">{allProducts.map((p) => <li key={p.id}><b>{p.brand} {p.name}</b> — {p.url ?? 'no official link stored'} <span className="text-muted">(price: {p.priceStatus}, {p.priceDate}; confidence: {p.confidence})</span></li>)}</ul>
        {sources.length === 0 && <p className="text-xs text-muted">No sources — no components selected.</p>}
        <footer className="mt-8 border-t border-line pt-3 text-[11px] text-muted"><b>Disclaimer.</b> {UNVERIFIED_ASSUMPTIONS.join(' ')} Always verify prices, availability and specifications on the manufacturer’s site before ordering. {link && <span className="break-all">Re-open this configuration: {link}</span>}</footer>
      </article>
    </div>
  )
}
