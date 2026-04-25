import type { WaveDefinition } from '../domain/types.js'

export const WAVE_DEFINITIONS: WaveDefinition[] = [
  {
    id: 'wave-1',
    label: '1 웨이브',
    entries: [{ enemyId: 'slime', count: 18 }],
    spawnIntervalMs: 700,
    burstSize: 2,
  },
  {
    id: 'wave-2',
    label: '2 웨이브',
    entries: [
      { enemyId: 'slime', count: 15 },
      { enemyId: 'dash-slime', count: 9 },
    ],
    spawnIntervalMs: 620,
    burstSize: 3,
  },
  {
    id: 'wave-3',
    label: '3 웨이브',
    entries: [
      { enemyId: 'spark-slime', count: 12 },
      { enemyId: 'orbit-slime', count: 9 },
      { enemyId: 'dash-slime', count: 6 },
    ],
    spawnIntervalMs: 560,
    burstSize: 4,
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
