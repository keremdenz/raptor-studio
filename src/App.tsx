import { useEffect, useState } from 'react'
import { FolderCog, Moon, Sun, X } from 'lucide-react'
import { getProduct } from './data/catalog'
import { go, PAGES, useRoute, useStore } from './state/store'
import { BudgetChip } from './ui/BudgetViz'
import { ConfigManager } from './ui/ConfigManager'
import { Inspector } from './ui/Inspector'
import { Drawer, IconButton, cx } from './ui/kit'
import { Bom } from './ui/pages/Bom'
import { Command } from './ui/pages/Command'
import { Compare } from './ui/pages/Compare'
import { Configurator } from './ui/pages/Configurator'
import { Explorer } from './ui/pages/Explorer'
import { Report } from './ui/pages/Report'
import { Requirements } from './ui/pages/Requirements'
import { Roadmap } from './ui/pages/Roadmap'

function Logo() {
  return (
    <button onClick={() => go('command')} className="flex shrink-0 items-center gap-2.5" aria-label="RAPTOR Hardware Design Studio — Command Center">
      <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden><rect width="64" height="64" rx="14" fill="var(--surface3)" /><path d="M12 40 L32 14 L52 40 L42 40 L32 28 L22 40 Z" fill="var(--accent)" /><circle cx="32" cy="46" r="4" fill="var(--violet)" /></svg>
      <span className="hidden text-left leading-tight xl:block"><span className="block text-sm font-semibold tracking-wide">RAPTOR</span><span className="block text-[10px] uppercase tracking-[.14em] text-faint">Hardware Design Studio</span></span>
    </button>
  )
}

export default function App() {
  const route = useRoute()
  const { theme, setTheme, active, notice, setNotice, inspectId, inspect } = useStore()
  const [mgr, setMgr] = useState(false)

  useEffect(() => { inspect(null); window.scrollTo(0, 0) }, [route.page, inspect])
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 7000); return () => clearTimeout(t) }, [notice, setNotice])
  useEffect(() => { document.title = `${PAGES.find((p) => p.id === route.page)?.label ?? 'RAPTOR'} · RAPTOR Hardware Design Studio` }, [route.page])

  const selfDrawer = route.page === 'configurator' || route.page === 'explorer' || route.page === 'compare'
  const inspected = inspectId ? getProduct(inspectId) : undefined

  return (
    <div className="min-h-screen">
      <header className="no-print z-40 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-bg/90 px-3 py-2 backdrop-blur sm:px-5 lg:sticky lg:top-0 lg:h-16 lg:flex-nowrap lg:py-0">
        <Logo />
        <nav aria-label="Pages" className="order-last -mx-1 flex basis-full items-center gap-0.5 overflow-x-auto lg:order-none lg:mx-1 lg:min-w-0 lg:flex-1 lg:basis-auto">
          {PAGES.filter((p) => p.id !== 'report').map((p) => (
            <button key={p.id} onClick={() => go(p.id)} aria-current={route.page === p.id ? 'page' : undefined}
              className={cx('relative shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium transition', route.page === p.id ? 'bg-surface2 text-fg' : 'text-muted hover:bg-surface2/60 hover:text-fg')}>
              {p.short}
              {route.page === p.id && <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded bg-accent" />}
            </button>
          ))}
        </nav>
        <div className="ml-auto lg:ml-0"><BudgetChip /></div>
        <button onClick={() => setMgr(true)} className="hidden max-w-[190px] shrink-0 items-center gap-2 rounded-lg border border-line bg-surface2 px-3 py-2 text-sm transition hover:border-line2 2xl:flex" aria-label="Manage saved configurations"><FolderCog size={15} className="shrink-0 text-accent" /><span className="truncate">{active.name}</span></button>
        <IconButton label={`Saved configurations — active: ${active.name}`} onClick={() => setMgr(true)} className="2xl:hidden"><FolderCog size={16} /></IconButton>
        <IconButton label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</IconButton>
      </header>

      <div key={route.page} className="anim-in">
        {route.page === 'command' && <Command />}
        {route.page === 'configurator' && <Configurator arg={route.arg} />}
        {route.page === 'explorer' && <Explorer />}
        {route.page === 'compare' && <Compare arg={route.arg} />}
        {route.page === 'requirements' && <Requirements arg={route.arg} />}
        {route.page === 'bom' && <Bom />}
        {route.page === 'roadmap' && <Roadmap />}
        {route.page === 'report' && <Report />}
      </div>

      {!selfDrawer && <Drawer open={!!inspected} onClose={() => inspect(null)} title="Product inspector" width={520}><Inspector product={inspected} /></Drawer>}
      <ConfigManager open={mgr} onClose={() => setMgr(false)} />
      {notice && (
        <div role="status" className={cx('no-print anim-in fixed bottom-4 left-1/2 z-[70] flex max-w-[92vw] -translate-x-1/2 items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl', notice.kind === 'good' ? 'border-good/40 bg-surface text-fg' : notice.kind === 'warn' ? 'border-warn/50 bg-surface text-fg' : 'border-line2 bg-surface')}>
          <span className={cx('mt-1 h-2 w-2 shrink-0 rounded-full', notice.kind === 'good' ? 'bg-good' : notice.kind === 'warn' ? 'bg-warn' : 'bg-info')} /><span>{notice.text}</span>
          <button aria-label="Dismiss" onClick={() => setNotice(null)} className="text-muted hover:text-fg"><X size={14} /></button>
        </div>
      )}
    </div>
  )
}
