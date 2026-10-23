import type { Config } from '../types'
import { createConfig, normalizeConfig } from '../engine/config'

export interface LogEntry { t: string; text: string }
export interface Persisted { configs: Config[]; activeId: string; log: Record<string, LogEntry[]>; compare: string[]; scenarioB: string | null; teamIds: string[] }
export const STORAGE_KEY = 'raptor-studio:v1'

type Store = Pick<Storage, 'getItem' | 'setItem'>

export function freshState(): Persisted {
  const c = createConfig('My RAPTOR')
  return { configs: [c], activeId: c.id, log: {}, compare: [], scenarioB: null, teamIds: [] }
}

/** Reads saved state. Corrupt entries are dropped and an unavailable store yields a fresh state. */
export function loadState(storage: Store | undefined = safeStorage()): Persisted {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      const configs: Config[] = (p.configs ?? []).flatMap((c: unknown) => { try { return [normalizeConfig(c)] } catch { return [] } })
      if (configs.length) return { configs, activeId: configs.some((c) => c.id === p.activeId) ? p.activeId : configs[0].id, log: p.log ?? {}, compare: p.compare ?? [], scenarioB: p.scenarioB ?? null, teamIds: p.teamIds ?? [] }
    }
  } catch { /* storage unavailable or corrupt — start fresh */ }
  return freshState()
}

export function saveState(state: Persisted, storage: Store | undefined = safeStorage()): boolean {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); return !!storage } catch { return false }
}

function safeStorage(): Store | undefined {
  try { return typeof localStorage === 'undefined' ? undefined : localStorage } catch { return undefined }
}
