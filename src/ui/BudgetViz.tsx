import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
import { GROUPS, STEPS } from '../data/catalog'
import type { CostSummary, Slot } from '../types'
import { money } from '../engine/cost'
import { go, useStore } from '../state/store'
import { cx } from './kit'

export const GROUP_COLOR: Record<string, string> = Object.fromEntries(GROUPS.map((g, i) => [g, `var(--g${i + 1})`]))
export const GROUP_STEP: Record<string, string> = { 'Robot platform': 'platform', UWB: 'uwb', Processor: 'processor', Camera: 'camera', Sensors: 'imu', 'Power system': 'power', 'Additional electronics': 'motor', 'Future upgrades': 'future' }
export const stepForSlot = (s: Slot | undefined): string => STEPS.find((st) => s && st.slots.includes(s))?.id ?? 'platform'

export function BudgetBar({ cost, budget, compact, interactive = true }: { cost: CostSummary; budget: number; compact?: boolean; interactive?: boolean }) {
  const span = Math.max(budget, cost.subtotal + cost.shippingTax + cost.contingency)
  const pct = (v: number) => `${(v / span) * 100}%`
  const budgetPct = (budget / span) * 100
  const over = cost.overBudget
  return (
    <div>
      <div className={cx('relative flex w-full overflow-hidden rounded-full border border-line bg-surface2', compact ? 'h-2.5' : 'h-6')} role="img" aria-label={`Budget used ${money(cost.total)} of ${money(budget)}`}>
        {GROUPS.map((g) => {
          const v = cost.byGroup[g] ?? 0
          if (v <= 0) return null
          const content = (
            <span className="group relative block h-full">
              {!compact && <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line2 bg-surface3 px-2.5 py-1.5 text-xs shadow-xl group-hover:block"><b>{g}</b><br /><span className="num">{money(v)}</span> · {((v / budget) * 100).toFixed(0)}% of budget<br /><span className="text-faint">Click to edit</span></span>}
            </span>
          )
          return interactive && !compact
            ? <button key={g} onClick={() => go('configurator', GROUP_STEP[g])} style={{ width: pct(v), background: GROUP_COLOR[g] }} className="h-full border-r border-bg/60 transition hover:brightness-125" aria-label={`${g} ${money(v)}`}>{content}</button>
            : <div key={g} style={{ width: pct(v), background: GROUP_COLOR[g] }} className="h-full border-r border-bg/60" title={`${g}: ${money(v)}`} />
        })}
        {cost.shippingTax > 0 && <div style={{ width: pct(cost.shippingTax) }} className="h-full opacity-70 [background:repeating-linear-gradient(135deg,var(--faint)_0_4px,transparent_4px_8px)]" title={`Shipping/tax allowance ${money(cost.shippingTax)}`} />}
        {cost.contingency > 0 && <div style={{ width: pct(cost.contingency) }} className="h-full border-l border-dashed border-line2 bg-surface3/60" title={`Contingency reserve ${money(cost.contingency)}`} />}
        {span > budget && <div className="absolute inset-y-0 w-0.5 bg-fg" style={{ left: `${budgetPct}%` }} title="Budget limit" />}
      </div>
      {!compact && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          {GROUPS.filter((g) => (cost.byGroup[g] ?? 0) > 0).map((g) => <span key={g} className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_COLOR[g] }} />{g} <b className="num text-fg">{money(cost.byGroup[g])}</b></span>)}
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm opacity-70 [background:repeating-linear-gradient(135deg,var(--faint)_0_2px,transparent_2px_4px)]" />Shipping/tax <b className="num text-fg">{money(cost.shippingTax)}</b></span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-line2 bg-surface3" />Reserve <b className="num text-fg">{money(cost.contingency)}</b></span>
          {over && <span className="font-medium text-bad">Over budget by {money(cost.total - budget)}</span>}
        </div>
      )}
    </div>
  )
}

export function CostDonut({ cost, height = 220 }: { cost: CostSummary; height?: number }) {
  const data = GROUPS.map((g) => ({ name: g, value: Number((cost.byGroup[g] ?? 0).toFixed(2)) })).filter((d) => d.value > 0)
  if (data.length === 0) return <div className="grid place-items-center text-sm text-muted" style={{ height }}>No priced parts yet.</div>
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none" onClick={(d) => go('configurator', GROUP_STEP[(d as { name: string }).name])} cursor="pointer">
            {data.map((d) => <Cell key={d.name} fill={GROUP_COLOR[d.name]} />)}
          </Pie>
          <RTooltip formatter={(v) => money(Number(v))} contentStyle={{ background: 'var(--surface3)', border: '1px solid var(--line2)', borderRadius: 8, color: 'var(--fg)', fontSize: 12 }} itemStyle={{ color: 'var(--fg)' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><div className="label">Known parts</div><div className="num text-xl font-semibold">{money(cost.subtotal)}</div></div></div>
    </div>
  )
}

/** Always-visible compact budget display. */
export function BudgetChip() {
  const { cost, active } = useStore()
  const tone = cost.overBudget || cost.unknownCount ? 'text-bad' : cost.tight || cost.designMissing.length ? 'text-warn' : 'text-good'
  return (
    <button onClick={() => go('bom')} className="group flex min-w-[168px] flex-col gap-1 rounded-lg border border-line bg-surface2 px-3 py-1.5 text-left transition hover:border-line2" title="Open the bill of materials">
      <div className="flex items-baseline justify-between gap-3 text-xs"><span className="text-muted">Budget</span><span className={cx('num font-semibold', tone)}>{money(cost.total, 0)} <span className="font-normal text-faint">/ {money(active.settings.budget, 0)}</span></span></div>
      <BudgetBar cost={cost} budget={active.settings.budget} compact />
    </button>
  )
}
