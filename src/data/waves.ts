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
    enemyId: 'slime',
    count: 10,
    spawnIntervalMs: 560,
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
