export interface TextureFallbackDefinition {
  radius: number
  color: number
}

export interface VectorAssetDefinition {
  key: string
  path: string
  width: number
  height: number
  fallback?: TextureFallbackDefinition
}

export interface AnimationDefinition {
  key: string
  frames: string[]
  frameRate: number
}

export const getHudWeaponAssetPath = (iconKey: string) => `assets/hud/weapons/${iconKey.replace(/^weapon-/, '')}.svg`

export const VECTOR_ASSETS: VectorAssetDefinition[] = [
  {
    key: 'player',
    path: 'assets/units/player-idle-0.svg',
    width: 32,
    height: 32,
    fallback: { radius: 14, color: 0x66d9ef },
  },
  {
    key: 'player-idle-1',
    path: 'assets/units/player-idle-1.svg',
    width: 32,
    height: 32,
    fallback: { radius: 14, color: 0x66d9ef },
  },
  {
    key: 'slime',
    path: 'assets/units/slime-idle-0.svg',
    width: 24,
    height: 24,
    fallback: { radius: 12, color: 0x84ff95 },
  },
  {
    key: 'slime-idle-1',
    path: 'assets/units/slime-idle-1.svg',
    width: 24,
    height: 24,
    fallback: { radius: 12, color: 0x84ff95 },
  },
  {
    key: 'spark-slime',
    path: 'assets/units/spark-slime-idle-0.svg',
    width: 26,
    height: 26,
    fallback: { radius: 12, color: 0xffdb6e },
  },
  {
    key: 'spark-slime-idle-1',
    path: 'assets/units/spark-slime-idle-1.svg',
    width: 26,
    height: 26,
    fallback: { radius: 12, color: 0xffdb6e },
  },
  {
    key: 'slime-boss',
    path: 'assets/units/slime-boss-idle-0.svg',
    width: 56,
    height: 56,
    fallback: { radius: 28, color: 0xd8a6ff },
  },
  {
    key: 'slime-boss-idle-1',
    path: 'assets/units/slime-boss-idle-1.svg',
    width: 56,
    height: 56,
    fallback: { radius: 28, color: 0xd8a6ff },
  },
  {
    key: 'starter-projectile',
    path: 'assets/projectiles/starter-projectile.svg',
    width: 20,
    height: 12,
    fallback: { radius: 5, color: 0xf8fafc },
  },
  {
    key: 'acid-projectile',
    path: 'assets/projectiles/acid-projectile.svg',
    width: 20,
    height: 12,
    fallback: { radius: 5, color: 0xc1ff72 },
  },
  {
    key: 'frost-projectile',
    path: 'assets/projectiles/frost-projectile.svg',
    width: 20,
    height: 12,
    fallback: { radius: 5, color: 0x9ce7ff },
  },
  {
    key: 'storm-projectile',
    path: 'assets/projectiles/storm-projectile.svg',
    width: 20,
    height: 12,
    fallback: { radius: 5, color: 0xd4b5ff },
  },
  {
    key: 'arc-projectile',
    path: 'assets/projectiles/arc-projectile.svg',
    width: 20,
    height: 12,
    fallback: { radius: 5, color: 0xffd866 },
  },
  {
    key: 'gel-shard',
    path: 'assets/loot/gel-shard.svg',
    width: 14,
    height: 14,
    fallback: { radius: 7, color: 0x7dffb0 },
  },
  {
    key: 'acid-core',
    path: 'assets/loot/acid-core.svg',
    width: 14,
    height: 14,
    fallback: { radius: 7, color: 0xb4ff5e },
  },
  {
    key: 'frost-mote',
    path: 'assets/loot/frost-mote.svg',
    width: 14,
    height: 14,
    fallback: { radius: 7, color: 0x83d5ff },
  },
  {
    key: 'spark-knot',
    path: 'assets/loot/spark-knot.svg',
    width: 14,
    height: 14,
    fallback: { radius: 7, color: 0xffd866 },
  },
  {
    key: 'mist-bead',
    path: 'assets/loot/mist-bead.svg',
    width: 14,
    height: 14,
    fallback: { radius: 7, color: 0xc4f1ff },
  },
  {
    key: 'tuning-capsule',
    path: 'assets/loot/tuning-capsule.svg',
    width: 14,
    height: 14,
    fallback: { radius: 7, color: 0xff9df3 },
  },
  {
    key: 'weapon-starter-blaster',
    path: getHudWeaponAssetPath('weapon-starter-blaster'),
    width: 96,
    height: 96,
  },
  {
    key: 'weapon-acid-sprayer',
    path: getHudWeaponAssetPath('weapon-acid-sprayer'),
    width: 96,
    height: 96,
  },
  {
    key: 'weapon-frost-lance',
    path: getHudWeaponAssetPath('weapon-frost-lance'),
    width: 96,
    height: 96,
  },
  {
    key: 'weapon-storm-cannon',
    path: getHudWeaponAssetPath('weapon-storm-cannon'),
    width: 96,
    height: 96,
  },
  {
    key: 'weapon-arc-loom',
    path: getHudWeaponAssetPath('weapon-arc-loom'),
    width: 96,
    height: 96,
  },
]

export const IDLE_ANIMATIONS: AnimationDefinition[] = [
  { key: 'player-idle', frames: ['player', 'player-idle-1'], frameRate: 4 },
  { key: 'player-move', frames: ['player', 'player-idle-1'], frameRate: 8 },
  { key: 'slime-idle', frames: ['slime', 'slime-idle-1'], frameRate: 3 },
  { key: 'spark-slime-idle', frames: ['spark-slime', 'spark-slime-idle-1'], frameRate: 4 },
  { key: 'slime-boss-idle', frames: ['slime-boss', 'slime-boss-idle-1'], frameRate: 2 },
]
