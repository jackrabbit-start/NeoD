import type { EnemyDefinition } from '../domain/types.js'

export const ENEMY_DEFINITIONS: Record<EnemyDefinition['id'], EnemyDefinition> = {
  slime: {
    id: 'slime',
    name: 'Murk Slime',
    description: 'A baseline slime that sheds the core materials for early combines.',
    maxHealth: 26,
    speed: 60,
    contactDamage: 8,
    score: 10,
    tint: 0x7cff8f,
    size: 20,
    textureKey: 'slime',
    animationKey: 'slime-idle',
    visual: {
      portraitKey: 'slime',
    },
    drops: [
      { itemId: 'gel-shard', weight: 5 },
      { itemId: 'acid-core', weight: 3 },
      { itemId: 'frost-mote', weight: 2 },
    ],
  },
  'spark-slime': {
    id: 'spark-slime',
    name: 'Volt Slime',
    description: 'A brighter slime strain that carries the materials for the new arc recipe.',
    maxHealth: 34,
    speed: 72,
    contactDamage: 10,
    score: 18,
    tint: 0xffdb6e,
    size: 22,
    textureKey: 'spark-slime',
    animationKey: 'spark-slime-idle',
    visual: {
      portraitKey: 'spark-slime',
    },
    drops: [
      { itemId: 'spark-knot', weight: 4 },
      { itemId: 'mist-bead', weight: 4 },
      { itemId: 'frost-mote', weight: 2 },
    ],
  },
  'slime-boss': {
    id: 'slime-boss',
    name: 'Crown Slime',
    description: 'The oversized slime monarch that ends the run when defeated.',
    maxHealth: 220,
    speed: 44,
    contactDamage: 16,
    score: 150,
    tint: 0xd3a0ff,
    size: 44,
    textureKey: 'slime-boss',
    animationKey: 'slime-boss-idle',
    visual: {
      portraitKey: 'slime-boss',
    },
  },
}
