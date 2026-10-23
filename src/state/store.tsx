import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Config, CostSummary, Finding } from '../types'
import { createConfig, duplicateConfig } from '../engine/config'
import { computeCost } from '../engine/cost'
import { evaluate } from '../engine/compat'
import { decodeShare } from '../engine/share'
import { loadState, saveState, type LogEntry, type Persisted } from './persist'

export type { LogEntry } from './persist'
export interface Notice { kind: 'info' | 'good' | 'warn'; text: string }
type Theme = 'dark' | 'light'

interface Store {
  configs: Config[]
  active: Config
  cost: CostSummary
  findings: Finding[]
  log: LogEntry[]
  theme: Theme
  inspectId: string | null
  compare: string[]
  scenarioB: string | null
  teamIds: string[]
  notice: Notice | null
  persisted: boolean
  setTheme: (t: Theme) => void
  inspect: (id: string | null) => void
  update: (fn: (c: Config) => Config, logText?: string) => void
  replaceActive: (c: Config, logText?: string) => void
  setActive: (id: string) => void
  create: (name?: string, from?: Config) => string
  duplicate: (id?: string) => string
  rename: (id: string, name: string) => void
  remove: (id: string) => void
  importConfig: (c: Config, activate?: boolean) => string
  resetAll: () => void
  toggleCompare: (id: string) => void
  clearCompare: () => void
  setScenarioB: (id: string | null) => void
  setTeamIds: (ids: string[]) => void
  setNotice: (n: Notice | null) => void
}

const Ctx = createContext<Store | null>(null)
export const useStore = (): Store => { const s = useContext(Ctx); if (!s) throw new Error('StoreProvider missing'); return s }

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => loadState())
  const [theme, setThemeState] = useState<Theme>(() => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'))
  const [inspectId, inspect] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [persisted, setPersisted] = useState(true)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    setPersisted(saveState(state))
  }, [state])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    try { localStorage.setItem('raptor-theme', t) } catch { /* ignore */ }
  }, [])

  const active = state.configs.find((c) => c.id === state.activeId) ?? state.configs[0]
  const cost = useMemo(() => computeCost(active), [active])
  const findings = useMemo(() => evaluate(active), [active])

  const addLog = (log: Persisted['log'], id: string, text?: string): Persisted['log'] =>
    text ? { ...log, [id]: [{ t: new Date().toISOString(), text }, ...(log[id] ?? [])].slice(0, 40) } : log

  const update = useCallback((fn: (c: Config) => Config, logText?: string) => {
    setState((s) => {
      const cur = s.configs.find((c) => c.id === s.activeId) ?? s.configs[0]
      const next = { ...fn(cur), updatedAt: new Date().toISOString() }
      return { ...s, configs: s.configs.map((c) => (c.id === cur.id ? next : c)), log: addLog(s.log, cur.id, logText) }
    })
  }, [])

  const importConfig = useCallback((c: Config, activate = true): string => {
    const existing = stateRef.current.configs.find((x) => x.id === c.id && x.updatedAt === c.updatedAt)
    if (existing) { if (activate) setState((s) => ({ ...s, activeId: existing.id })); return existing.id }
    const clash = stateRef.current.configs.some((x) => x.id === c.id)
    const cfg = clash ? { ...c, id: createConfig().id } : c
    setState((s) => {
      // an untouched blank starter configuration is replaced rather than left behind
      const blank = s.configs.length === 1 && s.configs[0].items.length === 0 && !(s.log[s.configs[0].id]?.length)
      const configs = blank && s.configs[0].customItems.length === 0 ? [cfg] : [...s.configs, cfg]
      return { ...s, configs, activeId: activate ? cfg.id : s.activeId, log: addLog(s.log, cfg.id, 'Imported configuration') }
    })
    return cfg.id
  }, [])

  // shared links: #/share/<code>
  const handled = useRef(new Set<string>())
  useEffect(() => {
    const run = async () => {
      const m = location.hash.match(/^#\/share\/(.+)$/)
      if (!m || handled.current.has(m[1])) return
      handled.current.add(m[1])
      try {
        const cfg = await decodeShare(m[1])
        const id = importConfig(cfg)
        setNotice({ kind: 'good', text: `Opened shared configuration “${cfg.name}”. It was added to your saved configurations.` })
        history.replaceState(null, '', location.pathname + location.search + '#/command')
        window.dispatchEvent(new HashChangeEvent('hashchange'))
        return id
      } catch (e) {
        setNotice({ kind: 'warn', text: `Could not read that share link: ${(e as Error).message}` })
        history.replaceState(null, '', location.pathname + location.search + '#/command')
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      }
    }
    run()
    window.addEventListener('hashchange', run)
    return () => window.removeEventListener('hashchange', run)
  }, [importConfig])

  const store: Store = {
    configs: state.configs, active, cost, findings, log: state.log[active.id] ?? [], theme, inspectId, compare: state.compare, scenarioB: state.scenarioB, teamIds: state.teamIds, notice, persisted,
    setTheme, inspect, update,
    replaceActive: (c, logText) => update(() => ({ ...c, id: active.id, name: active.name, createdAt: active.createdAt }), logText),
    setActive: (id) => setState((s) => (s.configs.some((c) => c.id === id) ? { ...s, activeId: id } : s)),
    create: (name = 'New RAPTOR', from) => {
      const c = from ? { ...duplicateConfig(from, name) } : createConfig(name)
      setState((s) => ({ ...s, configs: [...s.configs, c], activeId: c.id }))
      return c.id
    },
    duplicate: (id) => {
      const src = state.configs.find((c) => c.id === (id ?? state.activeId)) ?? active
      const c = duplicateConfig(src)
      setState((s) => ({ ...s, configs: [...s.configs, c], activeId: c.id }))
      return c.id
    },
    rename: (id, name) => setState((s) => ({ ...s, configs: s.configs.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name, updatedAt: new Date().toISOString() } : c)) })),
    remove: (id) => setState((s) => {
      if (s.configs.length <= 1) { const fresh = createConfig('My RAPTOR'); return { ...s, configs: [fresh], activeId: fresh.id } }
      const configs = s.configs.filter((c) => c.id !== id)
      return { ...s, configs, activeId: s.activeId === id ? configs[0].id : s.activeId, scenarioB: s.scenarioB === id ? null : s.scenarioB, teamIds: s.teamIds.filter((t) => t !== id) }
    }),
    importConfig,
    resetAll: () => { const c = createConfig('My RAPTOR'); setState({ configs: [c], activeId: c.id, log: {}, compare: [], scenarioB: null, teamIds: [] }) },
    toggleCompare: (id) => setState((s) => ({ ...s, compare: s.compare.includes(id) ? s.compare.filter((x) => x !== id) : s.compare.length >= 4 ? s.compare : [...s.compare, id] })),
    clearCompare: () => setState((s) => ({ ...s, compare: [] })),
    setScenarioB: (id) => setState((s) => ({ ...s, scenarioB: id })),
    setTeamIds: (ids) => setState((s) => ({ ...s, teamIds: ids })),
    setNotice,
  }
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

// ------------------------------- hash routing -------------------------------
export type PageId = 'command' | 'configurator' | 'explorer' | 'compare' | 'requirements' | 'bom' | 'roadmap' | 'report'
export const PAGES: { id: PageId; label: string; short: string }[] = [
  { id: 'command', label: 'Command Center', short: 'Command Center' },
  { id: 'configurator', label: 'Hardware Configurator', short: 'Configurator' },
  { id: 'explorer', label: 'Component Explorer', short: 'Explorer' },
  { id: 'compare', label: 'Comparison Lab', short: 'Comparison Lab' },
  { id: 'requirements', label: 'Requirements & Compatibility', short: 'Requirements' },
  { id: 'bom', label: 'Bill of Materials', short: 'BOM' },
  { id: 'roadmap', label: 'Future Roadmap', short: 'Roadmap' },
  { id: 'report', label: 'Report', short: 'Report' },
]

export interface Route { page: PageId; arg?: string }
export function parseHash(h: string): Route {
  const m = h.replace(/^#\/?/, '').split('/')
  const page = PAGES.find((p) => p.id === m[0])?.id ?? 'command'
  return { page, arg: m[1] || undefined }
}
export function useRoute(): Route {
  const [r, setR] = useState<Route>(() => parseHash(location.hash))
  useEffect(() => {
    const on = () => setR(parseHash(location.hash))
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}
export const go = (page: PageId, arg?: string) => { location.hash = `#/${page}${arg ? `/${arg}` : ''}` }
