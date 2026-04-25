import { WAVE_DEFINITIONS } from '../data/waves.js'
import type { EnemyId, WaveDefinition, WaveEntryDefinition } from '../domain/types.js'

export type DefeatedEnemyRunOutcome = 'continue' | 'win'

export function getWaveByIndex(index: number): WaveDefinition | null {
  return WAVE_DEFINITIONS[index] ?? null
}

export function flattenWaveEntries(entries: WaveEntryDefinition[]): EnemyId[] {
  return entries.flatMap((entry) =>
    Array.from({ length: Math.max(0, entry.count) }, () => entry.enemyId),
  )
}

export function getWaveSpawnSequence(wave: WaveDefinition): EnemyId[] {
  return flattenWaveEntries(wave.entries)
}

export function getWaveSpawnCount(wave: WaveDefinition): number {
  return wave.entries.reduce((total, entry) => total + Math.max(0, entry.count), 0)
}

export function isBossWaveReady(index: number): boolean {
  const wave = getWaveByIndex(index)
  return wave?.isBossWave === true
}

export function getBossEnemyId(waves: WaveDefinition[] = WAVE_DEFINITIONS): EnemyId | null {
  const bossWave = waves.find((wave) => wave.isBossWave === true)
  if (!bossWave || bossWave.entries.length !== 1) {
    return null
  }

  const [bossEntry] = bossWave.entries
  return bossEntry && bossEntry.count === 1 ? bossEntry.enemyId : null
}

export function isBossEnemyId(enemyId: EnemyId, waves: WaveDefinition[] = WAVE_DEFINITIONS): boolean {
  return getBossEnemyId(waves) === enemyId
}

export function getDefeatedEnemyRunOutcome(
  enemyId: EnemyId,
  waves: WaveDefinition[] = WAVE_DEFINITIONS,
): DefeatedEnemyRunOutcome {
  return isBossEnemyId(enemyId, waves) ? 'win' : 'continue'
}

export function shouldAdvanceWave(
  remainingSpawns: number,
  aliveEnemyCount: number,
): boolean {
  return remainingSpawns <= 0 && aliveEnemyCount <= 0
}
