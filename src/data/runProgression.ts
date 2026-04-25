import type { EnemyId, RunProgressionPhaseDefinition, RunSpawnEntryDefinition } from '../domain/types.js'

export const RUN_PHASE_DURATION_MS = 60_000
export const RUN_STAGE_DURATION_MS = RUN_PHASE_DURATION_MS
export const RUN_DURATION_MS = 30 * RUN_PHASE_DURATION_MS
export const FINAL_STAGE_START_MS = 25 * RUN_PHASE_DURATION_MS

const pressureNames = [
  '점액 적응',
  '점액 밀도 상승',
  '돌진 합류',
  '돌진 압박',
  '초반 혼전',
  '전격 점화',
  '전격 확산',
  '추격 가속',
  '중압 교전',
  '혼합 압박',
  '궤도 진입',
  '궤도 포위',
  '벌침 합류',
  '원거리 교란',
  '중반 난전',
  '엘리트 예고',
  '프리즘 교란',
  '엘리트 압박',
  '혼합 엘리트',
  '후반 돌파',
  '고밀도 난전',
  '벌침 폭주',
  '프리즘 증원',
  '피날레 전야',
  '최종 압박',
  '크라운 피날레',
  '보스 지원군',
  '보스 난전',
  '마지막 공세',
  '최후의 1분',
]

function entriesForMinute(minuteIndex: number): RunSpawnEntryDefinition[] {
  const clampedMinute = Math.max(0, Math.min(29, minuteIndex))
  const lateRamp = Math.max(0, clampedMinute - 15)
  const finaleRamp = Math.max(0, clampedMinute - 24)

  const weights: RunSpawnEntryDefinition[] = [
    { enemyId: 'slime', count: Math.max(2, 16 - clampedMinute) },
  ]

  if (clampedMinute >= 2) {
    weights.push({ enemyId: 'dash-slime', count: 3 + Math.min(6, clampedMinute) })
  }
  if (clampedMinute >= 5) {
    weights.push({ enemyId: 'spark-slime', count: 4 + Math.floor(clampedMinute / 3) })
  }
  if (clampedMinute >= 7) {
    weights.push({ enemyId: 'splitter-slime', count: 3 + Math.floor((clampedMinute - 7) / 2) })
  }
  if (clampedMinute >= 10) {
    weights.push({ enemyId: 'orbit-slime', count: 5 + Math.floor((clampedMinute - 10) / 3) })
  }
  if (clampedMinute >= 12) {
    weights.push({ enemyId: 'needle-wasp', count: 3 + Math.floor((clampedMinute - 12) / 3) })
  }
  if (clampedMinute >= 14) {
    weights.push({ enemyId: 'mender-slime', count: 2 + Math.floor((clampedMinute - 14) / 4) })
  }
  if (clampedMinute >= 16) {
    weights.push({ enemyId: 'shard-sentinel', count: 2 + Math.floor(lateRamp / 4) })
  }
  if (clampedMinute >= 18) {
    weights.push({ enemyId: 'prism-slime', count: 2 + Math.floor((clampedMinute - 18) / 4) })
  }
  if (clampedMinute >= 19) {
    weights.push({ enemyId: 'lantern-moth', count: 2 + Math.floor((clampedMinute - 19) / 3) })
  }
  if (clampedMinute >= 20) {
    weights.push({ enemyId: 'void-orb', count: 2 + Math.floor((clampedMinute - 20) / 3) })
  }
  if (clampedMinute >= 21) {
    weights.push({ enemyId: 'mirror-wisp', count: 2 + Math.floor((clampedMinute - 21) / 3) })
  }
  if (clampedMinute >= 23) {
    weights.push({ enemyId: 'crusher-slime', count: 1 + Math.floor((clampedMinute - 23) / 3) + Math.floor(finaleRamp / 2) })
  }
  if (clampedMinute >= 24) {
    weights.push({ enemyId: 'siege-toad', count: 1 + Math.floor((clampedMinute - 24) / 3) + Math.floor(finaleRamp / 2) })
  }

  return weights.filter((entry) => entry.count > 0)
}

function createPhase(minuteIndex: number): RunProgressionPhaseDefinition {
  const stageIndex = minuteIndex
  const startMs = minuteIndex * RUN_PHASE_DURATION_MS
  const isFinale = startMs >= FINAL_STAGE_START_MS
  const oneTimeSpawns: EnemyId[] = startMs === FINAL_STAGE_START_MS ? ['slime-boss'] : []
  const phaseNumber = minuteIndex + 1

  return {
    id: `minute-${String(phaseNumber).padStart(2, '0')}`,
    label: `${phaseNumber}분 · ${pressureNames[minuteIndex] ?? '시간 왜곡'}`,
    stageIndex,
    stageLabel: `${phaseNumber}분 ${pressureNames[minuteIndex] ?? '시간 왜곡'}`,
    minuteIndex,
    startMs,
    durationMs: RUN_PHASE_DURATION_MS,
    entries: entriesForMinute(minuteIndex),
    spawnIntervalMs: Math.max(360, 980 - minuteIndex * 22),
    burstSize: Math.min(12, 4 + Math.floor(minuteIndex / 3)),
    softEnemyCap: Math.min(100, 28 + minuteIndex * 3),
    healthMultiplier: Number((1.15 + minuteIndex * 0.06).toFixed(2)),
    ...(oneTimeSpawns.length > 0 ? { oneTimeSpawns } : {}),
    ...(isFinale ? { isFinale } : {}),
  }
}

export const RUN_PROGRESS_PHASES: RunProgressionPhaseDefinition[] = Array.from(
  { length: RUN_DURATION_MS / RUN_PHASE_DURATION_MS },
  (_, minuteIndex) => createPhase(minuteIndex),
)
