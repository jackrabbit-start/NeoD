import type { WaveDefinition } from '../domain/types.js'

export const WAVE_DEFINITIONS: WaveDefinition[] = [
  {
    id: 'wave-1',
    label: '1 웨이브',
    entries: [{ enemyId: 'slime', count: 6 }],
    spawnIntervalMs: 850,
  },
  {
    id: 'wave-2',
    label: '2 웨이브',
    entries: [
      { enemyId: 'slime', count: 5 },
      { enemyId: 'dash-slime', count: 3 },
    ],
    spawnIntervalMs: 650,
  },
  {
    id: 'wave-3',
    label: '3 웨이브',
    entries: [
      { enemyId: 'spark-slime', count: 4 },
      { enemyId: 'orbit-slime', count: 3 },
      { enemyId: 'needle-wasp', count: 2 },
      { enemyId: 'dash-slime', count: 2 },
    ],
    spawnIntervalMs: 520,
  },
  {
    id: 'elite-wave',
    label: '엘리트 웨이브',
    entries: [{ enemyId: 'prism-slime', count: 1 }],
    spawnIntervalMs: 0,
  },
  {
    id: 'boss-wave',
    label: '보스 웨이브',
    entries: [{ enemyId: 'slime-boss', count: 1 }],
    spawnIntervalMs: 0,
    isBossWave: true,
  },
]
