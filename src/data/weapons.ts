import type { WeaponDefinition, WeaponId } from '../domain/types.js'

export const WEAPON_DEFINITIONS: Record<WeaponId, WeaponDefinition> = {
  'starter-blaster': {
    id: 'starter-blaster',
    name: 'Starter Blaster',
    description: 'Steady low-power shots for the opening wave.',
    damage: 12,
    fireRateMs: 280,
    projectileSpeed: 460,
    projectileTint: 0xf8fafc,
    projectileTextureKey: 'starter-projectile',
    visual: {
      hudIconKey: 'weapon-starter-blaster',
      accentColor: 0xf8fafc,
    },
  },
  'acid-sprayer': {
    id: 'acid-sprayer',
    name: 'Acid Sprayer',
    description: 'Higher damage blasts fueled by unstable slime acid.',
    damage: 20,
    fireRateMs: 230,
    projectileSpeed: 500,
    projectileTint: 0xc1ff72,
    projectileTextureKey: 'acid-projectile',
    visual: {
      hudIconKey: 'weapon-acid-sprayer',
      accentColor: 0xc1ff72,
    },
  },
  'frost-lance': {
    id: 'frost-lance',
    name: 'Frost Lance',
    description: 'Fast piercing shots with high travel speed.',
    damage: 18,
    fireRateMs: 190,
    projectileSpeed: 620,
    projectileTint: 0x9ce7ff,
    projectileTextureKey: 'frost-projectile',
    visual: {
      hudIconKey: 'weapon-frost-lance',
      accentColor: 0x9ce7ff,
    },
  },
  'storm-cannon': {
    id: 'storm-cannon',
    name: 'Storm Cannon',
    description: 'A heavier hybrid weapon formed from balanced energy.',
    damage: 28,
    fireRateMs: 210,
    projectileSpeed: 560,
    projectileTint: 0xd4b5ff,
    projectileTextureKey: 'storm-projectile',
    visual: {
      hudIconKey: 'weapon-storm-cannon',
      accentColor: 0xd4b5ff,
    },
  },
  'arc-loom': {
    id: 'arc-loom',
    name: 'Arc Loom',
    description: 'Weaves static pulses into quick chained bursts.',
    damage: 24,
    fireRateMs: 175,
    projectileSpeed: 590,
    projectileTint: 0xffd866,
    projectileTextureKey: 'arc-projectile',
    visual: {
      hudIconKey: 'weapon-arc-loom',
      accentColor: 0xffd866,
    },
  },
}
