import { WAVE_DEFINITIONS } from '../data/waves.js'
import type { WaveDefinition } from '../domain/types.js'

export function getWaveByIndex(index: number): WaveDefinition | null {
  return WAVE_DEFINITIONS[index] ?? null
}

export function isBossWaveReady(index: number): boolean {
  const wave = getWaveByIndex(index)
  return wave?.isBossWave === true
}

export function shouldAdvanceWave(
  remainingSpawns: number,
  aliveEnemyCount: number,
): boolean {
  return remainingSpawns <= 0 && aliveEnemyCount <= 0
}
