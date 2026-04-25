import { RUN_PROGRESS_PHASES } from '../../data/runProgression.js'
import type { EnemyId, RunProgressionPhaseDefinition } from '../../domain/types.js'
import {
  clampRunElapsedMs,
  flattenRunPhaseEntries,
  getRunPhaseByElapsedMs,
  getRunSpawnCapacity,
  isRunTimedOut,
} from '../../systems/runProgression.js'

export interface RunProgressionRuntimeState {
  elapsedMs: number
  currentPhaseId: string
  spawnCountdownMs: number
  spawnCursor: number
  emittedOneTimePhaseIds: Set<string>
}

export interface RunProgressionAdvanceResult {
  state: RunProgressionRuntimeState
  activePhase: RunProgressionPhaseDefinition
  spawnedEnemyIds: EnemyId[]
  phaseChanged: boolean
  timedOut: boolean
  statusMessage?: string
}

export function createRunProgressionRuntime(
  startElapsedMs = 0,
  phases: RunProgressionPhaseDefinition[] = RUN_PROGRESS_PHASES,
): RunProgressionRuntimeState {
  const elapsedMs = clampRunElapsedMs(startElapsedMs)
  const activePhase = getRunPhaseByElapsedMs(elapsedMs, phases)

  return {
    elapsedMs,
    currentPhaseId: activePhase.id,
    spawnCountdownMs: 0,
    spawnCursor: 0,
    emittedOneTimePhaseIds: new Set<string>(),
  }
}

function nextRecurringSpawnBatch(
  phase: RunProgressionPhaseDefinition,
  cursor: number,
  aliveEnemyCount: number,
): { enemyIds: EnemyId[]; nextCursor: number } {
  const sequence = flattenRunPhaseEntries(phase)
  if (sequence.length === 0) {
    return { enemyIds: [], nextCursor: cursor }
  }

  const capacity = getRunSpawnCapacity(phase, aliveEnemyCount, phase.burstSize)
  const enemyIds: EnemyId[] = []
  let nextCursor = cursor
  for (let index = 0; index < capacity; index += 1) {
    enemyIds.push(sequence[nextCursor % sequence.length] as EnemyId)
    nextCursor += 1
  }

  return { enemyIds, nextCursor }
}

export function advanceRunProgressionRuntime(
  state: RunProgressionRuntimeState,
  deltaMs: number,
  aliveEnemyCount: number,
  phases: RunProgressionPhaseDefinition[] = RUN_PROGRESS_PHASES,
): RunProgressionAdvanceResult {
  const elapsedMs = clampRunElapsedMs(state.elapsedMs + Math.max(0, deltaMs))
  const activePhase = getRunPhaseByElapsedMs(elapsedMs, phases)
  const phaseChanged = activePhase.id !== state.currentPhaseId
  let spawnCountdownMs = phaseChanged ? 0 : state.spawnCountdownMs - Math.max(0, deltaMs)
  let spawnCursor = phaseChanged ? 0 : state.spawnCursor
  const emittedOneTimePhaseIds = new Set(state.emittedOneTimePhaseIds)
  const spawnedEnemyIds: EnemyId[] = []
  let effectiveAliveEnemyCount = Math.max(0, aliveEnemyCount)

  if (!emittedOneTimePhaseIds.has(activePhase.id)) {
    const oneTimeSpawns = activePhase.oneTimeSpawns ?? []
    spawnedEnemyIds.push(...oneTimeSpawns)
    effectiveAliveEnemyCount += oneTimeSpawns.length
    emittedOneTimePhaseIds.add(activePhase.id)
  }

  if (!isRunTimedOut(elapsedMs)) {
    while (spawnCountdownMs <= 0) {
      const tick = nextRecurringSpawnBatch(activePhase, spawnCursor, effectiveAliveEnemyCount)
      spawnedEnemyIds.push(...tick.enemyIds)
      effectiveAliveEnemyCount += tick.enemyIds.length
      spawnCursor = tick.nextCursor
      spawnCountdownMs += activePhase.spawnIntervalMs

      if (tick.enemyIds.length === 0 || deltaMs === 0) {
        break
      }
    }
  }

  return {
    state: {
      elapsedMs,
      currentPhaseId: activePhase.id,
      spawnCountdownMs,
      spawnCursor,
      emittedOneTimePhaseIds,
    },
    activePhase,
    spawnedEnemyIds,
    phaseChanged,
    timedOut: isRunTimedOut(elapsedMs),
    statusMessage: phaseChanged ? `${activePhase.label} 시작. 시간 기반 압박이 강화됩니다.` : undefined,
  }
}
