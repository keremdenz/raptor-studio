import type { Config, CostSummary } from '../types'
import { normalizeConfig } from './config'

const csvCell = (v: unknown): string => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const BOM_HEADERS = ['Category', 'Manufacturer', 'Model / item', 'Variant', 'Quantity', 'Unit price (USD)', 'Extended price (USD)', 'Currency', 'Seller', 'Product link', 'Included or purchased', 'Verification status', 'Required / optional', 'Priority', 'Notes']

export function bomToCsv(cost: CostSummary): string {
  const rows = cost.lines.map((l) => [
    l.category, l.brand ?? '', l.label, l.model ?? '', l.qty, l.unitPrice == null ? 'UNKNOWN' : l.unitPrice.toFixed(2), l.ext == null ? 'UNKNOWN' : l.ext.toFixed(2), 'USD', l.seller ?? '', l.url ?? '',
    l.kind === 'included' ? `Included in ${l.includedIn}` : l.kind === 'implied' ? 'Implied (purchase needed)' : 'Purchased', l.verification, l.required ? 'Required' : 'Optional', l.priority, [l.roles, l.reason, l.note].filter(Boolean).join(' | '),
  ])
  rows.push([], ['', '', 'Subtotal (known prices)', '', '', '', cost.subtotal.toFixed(2), 'USD'], ['', '', 'Shipping / tax allowance', '', '', '', cost.shippingTax.toFixed(2), 'USD'],
    ['', '', 'Contingency reserve', '', '', '', cost.contingency.toFixed(2), 'USD'], ['', '', 'Projected total', '', '', '', cost.total.toFixed(2), 'USD', '', '', '', cost.unknownCount ? `INCOMPLETE — ${cost.unknownCount} missing price(s)` : ''])
  return [BOM_HEADERS, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
}

export const configToJson = (cfg: Config): string => JSON.stringify({ app: 'raptor-hardware-design-studio', exportedAt: new Date().toISOString(), config: cfg }, null, 2)

export function configFromJson(text: string): Config {
  const parsed = JSON.parse(text)
  return normalizeConfig(parsed && typeof parsed === 'object' && 'config' in parsed ? parsed.config : parsed)
}

export function download(filename: string, text: string, mime = 'text/plain'): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
