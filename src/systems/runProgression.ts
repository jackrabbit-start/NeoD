import { ENEMY_DEFINITIONS } from '../data/enemies.js'
import {
  FINAL_STAGE_START_MS,
  RUN_DURATION_MS,
  RUN_PROGRESS_PHASES,
  RUN_STAGE_DURATION_MS,
} from '../data/runProgression.js'
import type { EnemyId, HudStageView, RunProgressionPhaseDefinition } from '../domain/types.js'

export {
  FINAL_STAGE_START_MS,
  RUN_DURATION_MS,
  RUN_STAGE_DURATION_MS,
} from '../data/runProgression.js'

export function clampRunElapsedMs(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs)) {
    return 0
  }

  return Math.min(RUN_DURATION_MS, Math.max(0, Math.floor(elapsedMs)))
}

export function formatRunTime(elapsedMs: number): string {
  const clamped = clampRunElapsedMs(elapsedMs)
  const totalSeconds = Math.floor(clamped / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function getRunPhaseByElapsedMs(
  elapsedMs: number,
  phases: RunProgressionPhaseDefinition[] = RUN_PROGRESS_PHASES,
): RunProgressionPhaseDefinition {
  const clamped = Math.min(Math.max(0, clampRunElapsedMs(elapsedMs)), RUN_DURATION_MS - 1)
  const phase = [...phases]
    .reverse()
    .find((candidate) => clamped >= candidate.startMs)

  if (!phase) {
    throw new Error('Run progression must define at least one phase.')
  }

  return phase
}

export function getRunStageStartElapsedMs(stageIndex: number): number | null {
  if (!Number.isInteger(stageIndex) || stageIndex < 0) {
    return null
  }

  const startMs = stageIndex * RUN_STAGE_DURATION_MS
  return startMs < RUN_DURATION_MS ? startMs : null
}

export function getRunStageIndex(elapsedMs: number): number {
  return Math.min(29, Math.floor(clampRunElapsedMs(elapsedMs) / RUN_STAGE_DURATION_MS))
}

export function getRunStageReachedLabel(elapsedMs: number): string {
  return getRunPhaseByElapsedMs(elapsedMs).stageLabel
}

export function isRunTimedOut(elapsedMs: number): boolean {
  return clampRunElapsedMs(elapsedMs) >= RUN_DURATION_MS
}

export function isFinaleActive(elapsedMs: number): boolean {
  return clampRunElapsedMs(elapsedMs) >= FINAL_STAGE_START_MS
}

export function flattenRunPhaseEntries(phase: RunProgressionPhaseDefinition): EnemyId[] {
  const weightedEntries = phase.entries.filter((entry) => entry.count > 0)
  if (weightedEntries.length === 0) {
    return []
  }

  const remainingCounts = weightedEntries.map((entry) => Math.max(0, entry.count))
  const sequence: EnemyId[] = []

  while (remainingCounts.some((count) => count > 0)) {
    let pickedAny = false
    for (const [index, entry] of weightedEntries.entries()) {
      if ((remainingCounts[index] ?? 0) <= 0) {
        continue
      }
      sequence.push(entry.enemyId)
      remainingCounts[index] = (remainingCounts[index] ?? 0) - 1
      pickedAny = true
    }

    if (!pickedAny) {
      break
    }
  }

  return sequence
}

export function getRunEnemySpawnChanceRows(
  phase: RunProgressionPhaseDefinition,
): Array<{ enemyId: EnemyId; enemyName: string; count: number; ratio: number; percentLabel: string }> {
  const total = phase.entries.reduce((sum, entry) => sum + Math.max(0, entry.count), 0)
  if (total <= 0) {
    return []
  }

  return phase.entries.map((entry) => {
    const count = Math.max(0, entry.count)
    const ratio = count / total
    return {
      enemyId: entry.enemyId,
      enemyName: ENEMY_DEFINITIONS[entry.enemyId]?.name ?? entry.enemyId,
      count,
      ratio,
      percentLabel: `${Math.round(ratio * 100)}%`,
    }
  })
}

export function getAllowedRunEnemyIds(
  phases: RunProgressionPhaseDefinition[] = RUN_PROGRESS_PHASES,
): EnemyId[] {
  return [...new Set(phases.flatMap((phase) => [
    ...flattenRunPhaseEntries(phase),
    ...(phase.oneTimeSpawns ?? []),
  ]))]
}

export function getUnknownRunEnemyIds(
  phases: RunProgressionPhaseDefinition[] = RUN_PROGRESS_PHASES,
): EnemyId[] {
  return getAllowedRunEnemyIds(phases).filter((enemyId) => !ENEMY_DEFINITIONS[enemyId])
}

export function getRunSpawnCapacity(
  phase: RunProgressionPhaseDefinition,
  aliveEnemyCount: number,
  requestedCount: number,
): number {
  const remainingCapacity = Math.max(0, phase.softEnemyCap - Math.max(0, aliveEnemyCount))
  return Math.min(Math.max(0, requestedCount), remainingCapacity)
}

export function getRunStageSelectionViews(currentElapsedMs: number): HudStageView[] {
  const currentStageIndex = getRunStageIndex(currentElapsedMs)
  const stageStarts = RUN_PROGRESS_PHASES.filter((phase) => phase.startMs % RUN_STAGE_DURATION_MS === 0)

  return stageStarts.map((phase) => {
    const entrySummary = phase.entries
      .map((entry) => `${ENEMY_DEFINITIONS[entry.enemyId]?.name ?? entry.enemyId} × ${entry.count}`)
      .join(' · ')
    const finaleLabel = phase.startMs === FINAL_STAGE_START_MS
      ? '보스 결전'
      : `${phase.softEnemyCap}체 상한 · 체력 ×${phase.healthMultiplier}`

    return {
      index: phase.stageIndex,
      label: `${formatRunTime(phase.startMs)} · ${phase.stageLabel}`,
      description: `${finaleLabel} · ${entrySummary}`,
      isCurrent: phase.stageIndex === currentStageIndex,
      isBoss: phase.startMs === FINAL_STAGE_START_MS,
      startElapsedMs: phase.startMs,
    }
  })
}
