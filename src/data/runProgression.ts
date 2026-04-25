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
  if (minuteIndex < 2) {
    return [{ enemyId: 'slime', count: 10 + minuteIndex * 2 }]
  }
  if (minuteIndex < 5) {
    return [
      { enemyId: 'slime', count: 10 },
      { enemyId: 'dash-slime', count: 4 + minuteIndex },
    ]
  }
  if (minuteIndex < 10) {
    return [
      { enemyId: 'slime', count: 8 },
      { enemyId: 'dash-slime', count: 8 },
      { enemyId: 'spark-slime', count: 5 + Math.floor(minuteIndex / 2) },
    ]
  }
  if (minuteIndex < 15) {
    return [
      { enemyId: 'dash-slime', count: 8 },
      { enemyId: 'spark-slime', count: 8 },
      { enemyId: 'orbit-slime', count: 6 },
      { enemyId: 'needle-wasp', count: 3 },
    ]
  }
  if (minuteIndex < 20) {
    return [
      { enemyId: 'spark-slime', count: 8 },
      { enemyId: 'orbit-slime', count: 8 },
      { enemyId: 'needle-wasp', count: 5 },
      { enemyId: 'prism-slime', count: 2 },
    ]
  }
  if (minuteIndex < 25) {
    return [
      { enemyId: 'dash-slime', count: 8 },
      { enemyId: 'spark-slime', count: 9 },
      { enemyId: 'orbit-slime', count: 9 },
      { enemyId: 'needle-wasp', count: 7 },
      { enemyId: 'prism-slime', count: 3 },
    ]
  }

  return [
    { enemyId: 'dash-slime', count: 10 },
    { enemyId: 'spark-slime', count: 10 },
    { enemyId: 'orbit-slime', count: 10 },
    { enemyId: 'needle-wasp', count: 8 },
    { enemyId: 'prism-slime', count: 4 },
  ]
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
