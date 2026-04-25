import type { EnemyId, RunProgressionPhaseDefinition, RunSpawnEntryDefinition } from '../domain/types.js'

export const RUN_PHASE_DURATION_MS = 30_000
export const RUN_STAGE_DURATION_MS = 60_000
export const RUN_DURATION_MS = 20 * RUN_STAGE_DURATION_MS
export const FINAL_STAGE_START_MS = 16 * RUN_STAGE_DURATION_MS

const pressureNames = [
  '출석 체크 적응',
  '카톡 돌진 합류',
  '밤샘 카페인 점화',
  '프린터 대기열 증식',
  '초반 과제 혼전',
  '실습실 압박',
  '복도 순찰 진입',
  '궤도 포위',
  '코드리뷰 합류',
  '멀티탭 회복전',
  '포인터 교란',
  '프로젝터 난전',
  'A+ 착각 증원',
  '편의점 불빛 압박',
  '와이파이 끊김',
  '발열 위기',
  '캡스톤 피날레',
  '교수님 결전',
  '마지막 발표 리허설',
  '최후의 1분',
]

function scaleEntriesForHackSlash(
  entries: RunSpawnEntryDefinition[],
  minuteIndex: number,
): RunSpawnEntryDefinition[] {
  const multiplier =
    minuteIndex >= 18
      ? 4.8
      : minuteIndex >= 15
        ? 3.8
        : minuteIndex >= 10
          ? 2.5
          : minuteIndex >= 5
            ? 1.45
            : minuteIndex >= 2
              ? 1.05
              : 0.75

  return entries.map((entry) => ({
    ...entry,
    count: Math.max(1, Math.round(entry.count * multiplier)),
  }))
}

function entriesForMinute(minuteIndex: number): RunSpawnEntryDefinition[] {
  const clampedMinute = Math.max(0, Math.min(19, minuteIndex))
  const lateRamp = Math.max(0, clampedMinute - 10)
  const finaleRamp = Math.max(0, clampedMinute - 15)

  const weights: RunSpawnEntryDefinition[] = []

  if (clampedMinute < 4) {
    weights.push({ enemyId: 'slime', count: Math.max(1, 6 - clampedMinute) })
  }

  if (clampedMinute >= 1 && clampedMinute < 8) {
    weights.push({ enemyId: 'dash-slime', count: 1 + Math.min(5, Math.floor(clampedMinute * 0.85)) })
  }
  if (clampedMinute >= 2 && clampedMinute < 11) {
    weights.push({ enemyId: 'spark-slime', count: 1 + Math.floor(clampedMinute / 2) })
  }
  if (clampedMinute >= 3 && clampedMinute < 12) {
    weights.push({ enemyId: 'splitter-slime', count: 1 + Math.floor((clampedMinute - 3) / 2) })
  }
  if (clampedMinute >= 6 && clampedMinute < 15) {
    weights.push({ enemyId: 'orbit-slime', count: 2 + Math.floor((clampedMinute - 6) / 2) })
  }
  if (clampedMinute >= 8 && clampedMinute < 16) {
    weights.push({ enemyId: 'needle-wasp', count: 2 + Math.floor((clampedMinute - 8) / 2) })
  }
  if (clampedMinute >= 9 && clampedMinute < 16) {
    weights.push({ enemyId: 'mender-slime', count: 1 + Math.floor((clampedMinute - 9) / 3) })
  }
  if (clampedMinute >= 10) {
    weights.push({ enemyId: 'shard-sentinel', count: 1 + Math.floor(lateRamp / 3) })
  }
  if (clampedMinute >= 12) {
    weights.push({ enemyId: 'prism-slime', count: 1 + Math.floor((clampedMinute - 12) / 3) })
  }
  if (clampedMinute >= 13) {
    weights.push({ enemyId: 'lantern-moth', count: 1 + Math.floor((clampedMinute - 13) / 3) })
  }
  if (clampedMinute >= 14) {
    weights.push({ enemyId: 'void-orb', count: 1 + Math.floor((clampedMinute - 14) / 3) })
  }
  if (clampedMinute >= 15) {
    weights.push({ enemyId: 'mirror-wisp', count: 1 + Math.floor((clampedMinute - 15) / 3) })
  }
  if (clampedMinute >= 15) {
    weights.push({ enemyId: 'crusher-slime', count: 1 + Math.floor((clampedMinute - 15) / 3) + Math.floor(finaleRamp / 2) })
  }
  if (clampedMinute >= 16) {
    weights.push({ enemyId: 'siege-toad', count: 1 + Math.floor((clampedMinute - 16) / 3) + Math.floor(finaleRamp / 2) })
  }

  return scaleEntriesForHackSlash(
    weights.filter((entry) => entry.count > 0),
    clampedMinute,
  )
}

function entriesForPhase(phaseIndex: number): RunSpawnEntryDefinition[] {
  const minuteIndex = Math.floor(phaseIndex / 2)
  const entries = entriesForMinute(minuteIndex).map((entry) => ({ ...entry }))
  if (phaseIndex >= 1 && minuteIndex === 0) {
    entries.push({ enemyId: 'dash-slime', count: 1 })
  }
  if (entries.length <= 1) {
    return entries
  }

  const surgeIndex = (phaseIndex + minuteIndex) % entries.length
  const surgeAmount = Math.max(1, Math.ceil((minuteIndex + 1) * 1.15))
  entries[surgeIndex] = {
    ...entries[surgeIndex],
    count: entries[surgeIndex].count + surgeAmount,
  }
  return entries
}

function repeatedEnemy(enemyId: EnemyId, count: number): EnemyId[] {
  return Array.from({ length: Math.max(0, count) }, () => enemyId)
}

function oneTimeSpawnsForPhase(phaseIndex: number, startMs: number): EnemyId[] {
  const ambushes: Record<number, EnemyId[]> = {
    3: repeatedEnemy('dash-slime', 14),
    7: repeatedEnemy('splitter-slime', 16),
    12: repeatedEnemy('orbit-slime', 12),
    16: repeatedEnemy('needle-wasp', 16),
    19: [...repeatedEnemy('mender-slime', 7), ...repeatedEnemy('dash-slime', 14)],
    24: repeatedEnemy('prism-slime', 12),
    28: [...repeatedEnemy('void-orb', 10), ...repeatedEnemy('lantern-moth', 10)],
    30: [...repeatedEnemy('crusher-slime', 9), ...repeatedEnemy('mirror-wisp', 10)],
    32: [...repeatedEnemy('siege-toad', 9), ...repeatedEnemy('shard-sentinel', 14)],
    38: [...repeatedEnemy('siege-toad', 12), ...repeatedEnemy('crusher-slime', 12)],
  }

  return [
    ...(startMs === FINAL_STAGE_START_MS ? ['slime-boss' as EnemyId] : []),
    ...(ambushes[phaseIndex] ?? []),
  ]
}

function createPhase(phaseIndex: number): RunProgressionPhaseDefinition {
  const minuteIndex = Math.floor(phaseIndex / 2)
  const stageIndex = minuteIndex
  const startMs = phaseIndex * RUN_PHASE_DURATION_MS
  const isFinale = startMs >= FINAL_STAGE_START_MS
  const oneTimeSpawns = oneTimeSpawnsForPhase(phaseIndex, startMs)
  const phaseNumber = minuteIndex + 1
  const halfLabel = phaseIndex % 2 === 0 ? '전반' : '후반'

  return {
    id: `minute-${String(phaseNumber).padStart(2, '0')}-${phaseIndex % 2 === 0 ? 'a' : 'b'}`,
    label: `Stage ${phaseNumber} ${halfLabel} · ${pressureNames[minuteIndex] ?? '시간 왜곡'}`,
    stageIndex,
    stageLabel: `Stage ${phaseNumber}`,
    minuteIndex,
    startMs,
    durationMs: RUN_PHASE_DURATION_MS,
    entries: entriesForPhase(phaseIndex),
    spawnIntervalMs: Math.max(120, 760 - minuteIndex * 30),
    burstSize: Math.min(48, 2 + Math.floor(minuteIndex * 2.05)),
    softEnemyCap: Math.min(300, 20 + minuteIndex * 16),
    healthMultiplier: Number((1 + minuteIndex * 0.04 + Math.max(0, minuteIndex - 12) * 0.04).toFixed(2)),
    ...(oneTimeSpawns.length > 0 ? { oneTimeSpawns } : {}),
    ...(isFinale ? { isFinale } : {}),
  }
}

export const RUN_PROGRESS_PHASES: RunProgressionPhaseDefinition[] = Array.from(
  { length: RUN_DURATION_MS / RUN_PHASE_DURATION_MS },
  (_, phaseIndex) => createPhase(phaseIndex),
)
