import type { StreamSettings } from '../types'

export interface StreamPreset { label: string; width: number; height: number; fps: number; mbps: number }
export const STREAM_PRESETS: StreamPreset[] = [
  { label: '640 × 480 @ 20 fps', width: 640, height: 480, fps: 20, mbps: 0.8 },
  { label: '1280 × 720 @ 30 fps', width: 1280, height: 720, fps: 30, mbps: 2 },
  { label: '1920 × 1080 @ 30 fps', width: 1920, height: 1080, fps: 30, mbps: 4 },
]

export interface StreamEstimate { mbps: number; mbPerSec: number; mbPerMin: number; mb20min: number; gbPerHour: number }

/** Bitrate → data volumes. The bitrate is a configurable assumption, not a camera guarantee. */
export function estimateStream(s: StreamSettings): StreamEstimate {
  const mbPerSec = s.mbps / 8
  return { mbps: s.mbps, mbPerSec, mbPerMin: mbPerSec * 60, mb20min: mbPerSec * 60 * 20, gbPerHour: (mbPerSec * 3600) / 1000 }
}
