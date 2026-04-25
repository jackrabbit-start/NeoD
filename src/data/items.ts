import type { ItemDefinition, LootId } from '../domain/types.js'

export const ITEM_DEFINITIONS = {
  'gel-shard': {
    id: 'gel-shard',
    name: 'Gel Shard',
    description: 'A stable slime fragment used as a binding core.',
    color: 0x7dffb0,
    textureKey: 'gel-shard',
  },
  'acid-core': {
    id: 'acid-core',
    name: 'Acid Core',
    description: 'Corrosive residue that boosts impact damage.',
    color: 0xb4ff5e,
    textureKey: 'acid-core',
  },
  'frost-mote': {
    id: 'frost-mote',
    name: 'Frost Mote',
    description: 'Chilled essence that sharpens projectile focus.',
    color: 0x83d5ff,
    textureKey: 'frost-mote',
  },
  'spark-knot': {
    id: 'spark-knot',
    name: 'Spark Knot',
    description: 'A bright tangle of charged slime fiber.',
    color: 0xffd866,
    textureKey: 'spark-knot',
  },
  'mist-bead': {
    id: 'mist-bead',
    name: 'Mist Bead',
    description: 'A cool droplet that stabilizes volatile reactions.',
    color: 0xc4f1ff,
    textureKey: 'mist-bead',
  },
} as const satisfies Record<LootId, ItemDefinition>
