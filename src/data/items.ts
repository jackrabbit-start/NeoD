import type { ItemDefinition, LootId } from '../domain/types.js'

export const ITEM_DEFINITIONS = {
  'gel-shard': {
    id: 'gel-shard',
    name: 'Gel Shard',
    description: 'A stable slime fragment used as a binding core.',
    color: 0x7dffb0,
  },
  'acid-core': {
    id: 'acid-core',
    name: 'Acid Core',
    description: 'Corrosive residue that boosts impact damage.',
    color: 0xb4ff5e,
  },
  'frost-mote': {
    id: 'frost-mote',
    name: 'Frost Mote',
    description: 'Chilled essence that sharpens projectile focus.',
    color: 0x83d5ff,
  },
  'spark-knot': {
    id: 'spark-knot',
    name: 'Spark Knot',
    description: 'A bright tangle of charged slime fiber.',
    color: 0xffd866,
  },
  'mist-bead': {
    id: 'mist-bead',
    name: 'Mist Bead',
    description: 'A cool droplet that stabilizes volatile reactions.',
    color: 0xc4f1ff,
  },
  'tuning-capsule': {
    id: 'tuning-capsule',
    name: 'Tuning Capsule',
    description: 'A run-local capsule that tunes a crafted weapon once.',
    color: 0xff9df3,
  },
} as const satisfies Record<LootId, ItemDefinition>
