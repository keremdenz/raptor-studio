import type { Config } from '../types'
import { PRESETS, type Preset } from '../data/presets'
import { createConfig, selectProduct } from './config'

export function presetConfig(p: Preset, base?: Config): Config {
  let cfg = createConfig(p.name)
  if (base) cfg = { ...cfg, settings: base.settings, owner: base.owner }
  for (const [slot, id, qty] of p.items) cfg = selectProduct(cfg, slot, id, qty)
  cfg.goals = [...p.goals]
  return cfg
}
export const getPreset = (id: string) => PRESETS.find((p) => p.id === id)
