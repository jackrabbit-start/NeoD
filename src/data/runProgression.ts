import type { EnemyId, RunProgressionPhaseDefinition, RunSpawnEntryDefinition } from '../domain/types.js'

export const RUN_PHASE_DURATION_MS = 60_000
export const RUN_STAGE_DURATION_MS = 5 * RUN_PHASE_DURATION_MS
export const RUN_DURATION_MS = 30 * RUN_PHASE_DURATION_MS
export const FINAL_STAGE_START_MS = 25 * RUN_PHASE_DURATION_MS

const stageLabels = [
  '1막 점액 적응',
  '2막 돌진 압박',
  '3막 전격 혼합',
  '4막 궤도와 벌침',
  '5막 엘리트 난전',
  '6막 크라운 피날레',
]

const stageEntries: RunSpawnEntryDefinition[][] = [
  [{ enemyId: 'slime', count: 6 }],
  [
    { enemyId: 'slime', count: 5 },
    { enemyId: 'dash-slime', count: 2 },
  ],
  [
    { enemyId: 'slime', count: 3 },
    { enemyId: 'dash-slime', count: 3 },
    { enemyId: 'spark-slime', count: 2 },
  ],
  [
    { enemyId: 'spark-slime', count: 3 },
    { enemyId: 'orbit-slime', count: 3 },
    { enemyId: 'needle-wasp', count: 1 },
    { enemyId: 'dash-slime', count: 2 },
  ],
  [
    { enemyId: 'spark-slime', count: 3 },
    { enemyId: 'orbit-slime', count: 3 },
    { enemyId: 'needle-wasp', count: 2 },
    { enemyId: 'prism-slime', count: 1 },
  ],
  [
    { enemyId: 'dash-slime', count: 3 },
    { enemyId: 'spark-slime', count: 3 },
    { enemyId: 'orbit-slime', count: 3 },
    { enemyId: 'needle-wasp', count: 2 },
    { enemyId: 'prism-slime', count: 1 },
  ],
]

const stageBaseIntervalMs = [1600, 1450, 1300, 1150, 1000, 860]
const stageBaseCap = [18, 22, 27, 32, 38, 46]

function createPhase(minuteIndex: number): RunProgressionPhaseDefinition {
  const stageIndex = Math.min(stageLabels.length - 1, Math.floor(minuteIndex / 5))
  const minuteInStage = minuteIndex % 5
  const startMs = minuteIndex * RUN_PHASE_DURATION_MS
  const isFinale = startMs >= FINAL_STAGE_START_MS
  const oneTimeSpawns: EnemyId[] = startMs === FINAL_STAGE_START_MS ? ['slime-boss'] : []

  return {
    id: `minute-${String(minuteIndex + 1).padStart(2, '0')}`,
    label: `${stageLabels[stageIndex]} · ${minuteInStage + 1}분`,
    stageIndex,
    stageLabel: stageLabels[stageIndex] ?? '시간 왜곡',
    minuteIndex,
    startMs,
    durationMs: RUN_PHASE_DURATION_MS,
    entries: stageEntries[stageIndex] ?? [{ enemyId: 'slime', count: 1 }],
    spawnIntervalMs: Math.max(520, stageBaseIntervalMs[stageIndex] - minuteInStage * 90),
    burstSize: Math.min(7, 2 + stageIndex + Math.floor(minuteInStage / 2)),
    softEnemyCap: stageBaseCap[stageIndex] + minuteInStage * 2,
    ...(oneTimeSpawns.length > 0 ? { oneTimeSpawns } : {}),
    ...(isFinale ? { isFinale } : {}),
  }
}

export const RUN_PROGRESS_PHASES: RunProgressionPhaseDefinition[] = Array.from(
  { length: RUN_DURATION_MS / RUN_PHASE_DURATION_MS },
  (_, minuteIndex) => createPhase(minuteIndex),
)
