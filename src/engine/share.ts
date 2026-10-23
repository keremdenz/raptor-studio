import type { Config } from '../types'
import { normalizeConfig } from './config'

const b64url = (bytes: Uint8Array): string => {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const unb64url = (str: string): Uint8Array => {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4))
  return Uint8Array.from(s, (ch) => ch.charCodeAt(0))
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

/** Encodes a configuration into a URL-safe string: "z." = deflate-compressed, "j." = plain fallback. */
export async function encodeShare(cfg: Config): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(cfg))
  if (typeof CompressionStream !== 'undefined') return 'z.' + b64url(await pipe(json, new CompressionStream('deflate-raw')))
  return 'j.' + b64url(json)
}

export async function decodeShare(code: string): Promise<Config> {
  const kind = code.slice(0, 2), body = code.slice(2)
  let bytes = unb64url(body)
  if (kind === 'z.') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'))
  else if (kind !== 'j.') throw new Error('Unrecognised share code')
  return normalizeConfig(JSON.parse(new TextDecoder().decode(bytes)))
}

export const shareUrl = async (cfg: Config, base = location.href.split('#')[0]): Promise<string> => `${base}#/share/${await encodeShare(cfg)}`
