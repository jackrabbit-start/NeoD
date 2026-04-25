import { ENEMY_DEFINITIONS } from '../data/enemies.js'
import { WAVE_DEFINITIONS } from '../data/waves.js'
import type { HudStageView, WaveDefinition } from '../domain/types.js'
import { getWaveSpawnCount } from './waves.js'

const describeWaveEntries = (wave: WaveDefinition): string =>
  wave.entries
    .map((entry) => `${ENEMY_DEFINITIONS[entry.enemyId]?.name ?? entry.enemyId} × ${entry.count}`)
    .join(' · ')

export function getStageSelectionViews(
  currentWaveIndex: number,
  waves: WaveDefinition[] = WAVE_DEFINITIONS,
): HudStageView[] {
  return waves.map((wave, index) => {
    const spawnCount = getWaveSpawnCount(wave)
    const entrySummary = describeWaveEntries(wave)
    const pressureLabel = wave.isBossWave
      ? '보스 결전'
      : spawnCount <= 1
        ? '엘리트 압박'
        : `${spawnCount}체 압박`

    return {
      index,
      label: wave.label,
      description: `${pressureLabel} · ${entrySummary}`,
      isCurrent: index === currentWaveIndex,
      isBoss: wave.isBossWave === true,
    }
  })
}

export function getSkippedRegularWaveCount(
  selectedWaveIndex: number,
  waves: WaveDefinition[] = WAVE_DEFINITIONS,
): number {
  return waves
    .slice(0, Math.max(0, selectedWaveIndex))
    .filter((wave) => wave.isBossWave !== true).length
}
