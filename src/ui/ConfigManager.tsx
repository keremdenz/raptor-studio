import { useRef, useState } from 'react'
import { Copy, Download, FolderOpen, Link2, Pencil, Plus, Trash2, Upload, User } from 'lucide-react'
import { computeCost, money } from '../engine/cost'
import { configFromJson, configToJson, download } from '../engine/exporters'
import { shareUrl } from '../engine/share'
import { useStore } from '../state/store'
import { Badge, Button, Modal, cx, inputCls } from './kit'

export function ConfigManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { configs, active, setActive, create, duplicate, rename, remove, importConfig, update, resetAll, setNotice, persisted } = useStore()
  const [editing, setEditing] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const share = async (id: string) => {
    const c = configs.find((x) => x.id === id)!
    const url = await shareUrl(c)
    try { await navigator.clipboard.writeText(url); setNotice({ kind: 'good', text: 'Share link copied. Anyone who opens it gets a copy of this configuration.' }) } catch { window.prompt('Copy this share link:', url) }
  }
  const onFile = async (files: FileList | null) => {
    for (const f of Array.from(files ?? [])) {
      try { const c = configFromJson(await f.text()); importConfig(c, false); setNotice({ kind: 'good', text: `Imported “${c.name}”.` }) } catch (e) { setNotice({ kind: 'warn', text: `Could not import ${f.name}: ${(e as Error).message}` }) }
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Saved configurations" wide>
      {!persisted && <div className="mb-3 rounded-lg border border-warn/40 bg-warn-soft p-2.5 text-xs text-warn">Browser storage is unavailable (private window or blocked). Changes will not survive a refresh — export JSON to keep your work.</div>}
      <p className="mb-3 text-xs text-muted">Configurations are saved in this browser only. Teammates see them through a share link or an exported JSON file — nothing is uploaded to a server.</p>
      <ul className="space-y-2">
        {configs.map((c) => { const k = computeCost(c); const on = c.id === active.id; return (
          <li key={c.id} className={cx('rounded-xl border p-3', on ? 'border-accent bg-accent-soft' : 'border-line')}>
            <div className="flex flex-wrap items-center gap-2">
              {editing === c.id ? <input autoFocus aria-label="Configuration name" className={cx(inputCls, 'h-8 max-w-xs')} defaultValue={c.name} onBlur={(e) => { rename(c.id, e.target.value); setEditing(null) }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
                : <button className="text-left font-medium hover:text-accent" onClick={() => { setActive(c.id); onClose() }}>{c.name}</button>}
              {on && <Badge tone="accent">Active</Badge>}
              <span className="num ml-auto text-sm text-muted">{money(k.total, 0)} · {c.items.length} items{k.unknownCount ? ` · ${k.unknownCount} unpriced` : ''}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {!on && <Button size="sm" onClick={() => { setActive(c.id); onClose() }}><FolderOpen size={13} /> Open</Button>}
              <Button size="sm" variant="ghost" onClick={() => setEditing(c.id)}><Pencil size={13} /> Rename</Button>
              <Button size="sm" variant="ghost" onClick={() => duplicate(c.id)}><Copy size={13} /> Duplicate</Button>
              <Button size="sm" variant="ghost" onClick={() => share(c.id)}><Link2 size={13} /> Share link</Button>
              <Button size="sm" variant="ghost" onClick={() => download(`raptor-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`, configToJson(c), 'application/json')}><Download size={13} /> JSON</Button>
              {confirm === c.id ? <><Button size="sm" variant="danger" onClick={() => { remove(c.id); setConfirm(null) }}>Confirm delete</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button></> : <Button size="sm" variant="ghost" onClick={() => setConfirm(c.id)}><Trash2 size={13} /> Delete</Button>}
            </div>
          </li>) })}
      </ul>
      <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <div><div className="label mb-1">New configuration</div><div className="flex gap-2"><input aria-label="New configuration name" className={inputCls} placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} /><Button variant="primary" onClick={() => { create(newName.trim() || 'New RAPTOR'); setNewName(''); onClose() }}><Plus size={14} /> Create</Button></div></div>
        <div><div className="label mb-1 flex items-center gap-1"><User size={11} /> Owner of the active configuration</div><input aria-label="Owner" className={inputCls} placeholder="e.g. Team member 1" value={active.owner} onChange={(e) => update((c) => ({ ...c, owner: e.target.value }))} /></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => fileRef.current?.click()}><Upload size={14} /> Import JSON</Button>
        <input ref={fileRef} type="file" accept="application/json,.json" multiple hidden onChange={(e) => { onFile(e.target.files); e.target.value = '' }} />
        <Button onClick={() => download('raptor-all-configurations.json', JSON.stringify({ app: 'raptor-hardware-design-studio', configs }, null, 2), 'application/json')}><Download size={14} /> Export all</Button>
        <span className="flex-1" />
        {confirm === 'reset' ? <><Button variant="danger" onClick={() => { resetAll(); setConfirm(null); onClose() }}>Yes, erase all and reset</Button><Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button></> : <Button variant="ghost" onClick={() => setConfirm('reset')}>Reset to defaults…</Button>}
      </div>
    </Modal>
  )
}
