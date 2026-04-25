import type { WaveDefinition } from '../domain/types.js'

export const WAVE_DEFINITIONS: WaveDefinition[] = [
  {
    id: 'wave-1',
    label: 'Wave 1',
    enemyId: 'slime',
    count: 6,
    spawnIntervalMs: 900,
  },
  {
    id: 'wave-2',
    label: 'Wave 2',
    enemyId: 'slime',
    count: 8,
    spawnIntervalMs: 720,
  },
  {
    id: 'wave-3',
    label: 'Wave 3',
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
    label: 'Boss Wave',
    enemyId: 'slime-boss',
    count: 1,
    spawnIntervalMs: 0,
    isBossWave: true,
  },
]
