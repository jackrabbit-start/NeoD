import type { EnemyDefinition } from '../domain/types.js'

export const ENEMY_DEFINITIONS: Record<EnemyDefinition['id'], EnemyDefinition> = {
  slime: {
    id: 'slime',
    name: 'Murk Slime',
    maxHealth: 26,
    speed: 60,
    contactDamage: 8,
    score: 10,
    tint: 0x7cff8f,
    size: 20,
    drops: [
      { itemId: 'gel-shard', weight: 5 },
      { itemId: 'acid-core', weight: 3 },
      { itemId: 'frost-mote', weight: 2 },
    ],
  },
  'slime-boss': {
    id: 'slime-boss',
    name: 'Crown Slime',
    maxHealth: 220,
    speed: 44,
    contactDamage: 16,
    score: 150,
    tint: 0xd3a0ff,
    size: 44,
  },
}
