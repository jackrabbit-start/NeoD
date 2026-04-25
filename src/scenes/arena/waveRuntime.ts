import type { EnemyId } from '../../domain/types.js'
import { getWaveByIndex, getWaveSpawnSequence } from '../../systems/waves.js'

export interface WaveStatePatch {
  currentWaveIndex?: number
  activeWaveLabel?: string
  remainingSpawns?: number
  statusMessage?: string
  isBossActive?: boolean
}

export interface SpawnLoopConfig {
  delayMs: number
  repeat: number
  onTick: () => void
}

export interface WaveRuntimeCallbacks {
  applyState: (patch: WaveStatePatch) => void
  clearSpawnLoop: () => void
  scheduleSpawnLoop: (config: SpawnLoopConfig) => void
  spawnEnemy: (enemyId: EnemyId) => void
}

export interface WaveAdvancePlan {
  nextWaveIndex: number
  shouldIncrementWavesCleared: boolean
}

export interface SpawnLoopLike {
  paused: boolean
}

export function startWaveRuntime(
  index: number,
  { applyState, clearSpawnLoop, scheduleSpawnLoop, spawnEnemy }: WaveRuntimeCallbacks,
): boolean {
  const wave = getWaveByIndex(index)
  if (!wave) {
    return false
  }

  const pendingSpawns = getWaveSpawnSequence(wave)
  const totalSpawns = pendingSpawns.length
  let remainingSpawns = totalSpawns
  applyState({
    currentWaveIndex: index,
    activeWaveLabel: wave.label,
    remainingSpawns,
    statusMessage: `${wave.label} started.`,
    isBossActive: wave.isBossWave === true,
  })

  const spawnAndDecrement = () => {
    const enemyId = pendingSpawns.shift()
    if (!enemyId) {
      remainingSpawns = 0
      applyState({ remainingSpawns })
      return
    }

    spawnEnemy(enemyId)
    remainingSpawns = pendingSpawns.length
    applyState({
      remainingSpawns,
    })
  }

  if (wave.isBossWave) {
    spawnAndDecrement()
    return true
  }

  clearSpawnLoop()
  spawnAndDecrement()
  if (remainingSpawns <= 0) {
    return true
  }

  scheduleSpawnLoop({
    delayMs: wave.spawnIntervalMs,
    repeat: Math.max(0, totalSpawns - 1),
    onTick: spawnAndDecrement,
  })
  return true
}

export function createWaveAdvancePlan(currentWaveIndex: number): WaveAdvancePlan | null {
  const clearedWave = getWaveByIndex(currentWaveIndex)
  const nextWaveIndex = currentWaveIndex + 1
  const nextWave = getWaveByIndex(nextWaveIndex)
  if (!nextWave) {
    return null
  }

  return {
    nextWaveIndex,
    shouldIncrementWavesCleared: clearedWave?.isBossWave !== true,
  }
}

export function setSpawnLoopPaused(spawnLoop: SpawnLoopLike | undefined, paused: boolean): void {
  if (!spawnLoop) {
    return
  }

  spawnLoop.paused = paused
}
