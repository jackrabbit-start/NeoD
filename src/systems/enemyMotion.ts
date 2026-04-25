import type { EnemyAttackBehavior, EnemyDefinition } from '../domain/types.js'

export interface EnemyMotionProfile {
  scaleX: number
  scaleY: number
  angle: number
  durationMs: number
  tint?: number
}

const ATTACK_TINT = {
  contact: 0xffd39a,
  'telegraphed-aoe': 0xfff1a6,
  'spread-burst': 0xffc57a,
  'line-beam': 0xc9f2ff,
  'radial-burst': 0xc8ffb2,
} as const

export function getEnemyAttackMotionProfile(
  enemyId: EnemyDefinition['id'],
  attackBehavior: EnemyAttackBehavior,
): EnemyMotionProfile {
  switch (attackBehavior.kind) {
    case 'contact':
      if (enemyId === 'dash-slime') {
        return { scaleX: 1.2, scaleY: 0.86, angle: -10, durationMs: 110, tint: ATTACK_TINT.contact }
      }
      if (enemyId === 'orbit-slime') {
        return { scaleX: 0.92, scaleY: 1.16, angle: 12, durationMs: 140, tint: ATTACK_TINT.contact }
      }
      return { scaleX: 1.1, scaleY: 0.92, angle: 0, durationMs: 120, tint: ATTACK_TINT.contact }
    case 'telegraphed-aoe':
      return { scaleX: 1.18, scaleY: 0.84, angle: 0, durationMs: 180, tint: ATTACK_TINT['telegraphed-aoe'] }
    case 'spread-burst':
      return { scaleX: 1.22, scaleY: 0.88, angle: enemyId === 'lantern-moth' ? 8 : -8, durationMs: 160, tint: ATTACK_TINT['spread-burst'] }
    case 'line-beam':
      return { scaleX: 0.88, scaleY: 1.18, angle: enemyId === 'mirror-wisp' ? -12 : 12, durationMs: 170, tint: ATTACK_TINT['line-beam'] }
    case 'radial-burst':
      return { scaleX: 1.24, scaleY: 1.24, angle: 0, durationMs: 150, tint: ATTACK_TINT['radial-burst'] }
    default:
      return { scaleX: 1.1, scaleY: 0.92, angle: 0, durationMs: 120 }
  }
}

export function getEnemyHitMotionProfile(enemyId: EnemyDefinition['id']): EnemyMotionProfile {
  switch (enemyId) {
    case 'crusher-slime':
    case 'siege-toad':
      return { scaleX: 1.14, scaleY: 0.86, angle: -6, durationMs: 130, tint: 0xffd0d8 }
    case 'mirror-wisp':
    case 'void-orb':
      return { scaleX: 0.9, scaleY: 1.18, angle: 10, durationMs: 115, tint: 0xe6f7ff }
    case 'needle-wasp':
    case 'lantern-moth':
      return { scaleX: 1.16, scaleY: 0.84, angle: 14, durationMs: 105, tint: 0xffe2a8 }
    default:
      return { scaleX: 1.1, scaleY: 0.9, angle: -8, durationMs: 100, tint: 0xffffff }
  }
}
