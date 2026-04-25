import type { WaveDefinition } from '../domain/types.js'

export const WAVE_DEFINITIONS: WaveDefinition[] = [
  {
    id: 'wave-1',
    label: '1 웨이브',
    enemyId: 'slime',
    count: 6,
    spawnIntervalMs: 900,
  },
  {
    id: 'wave-2',
    label: '2 웨이브',
    enemyId: 'slime',
    count: 8,
    spawnIntervalMs: 720,
  },
  {
    id: 'wave-3',
    label: '3 웨이브',
    enemyId: 'spark-slime',
    count: 9,
    spawnIntervalMs: 560,
  },
  {
    id: 'elite-wave',
    label: 'Elite Wave',
    enemyId: 'prism-slime',
    count: 1,
    spawnIntervalMs: 0,
  },
  {
    id: 'boss-wave',
    label: '보스 웨이브',
    enemyId: 'slime-boss',
    count: 1,
    spawnIntervalMs: 0,
    isBossWave: true,
  },
]
