import Phaser from 'phaser'
import type { ChainSpec, HazardSpawnSpec, MeleeSwingSpec, Point } from '../../systems/weaponBehaviors.js'

export interface HazardZoneEffect {
  core: Phaser.GameObjects.Arc
  ring: Phaser.GameObjects.Graphics
  pulse: Phaser.GameObjects.Graphics
}

export function getCombatEffectPowerTier(value?: number): number {
  return Math.max(0, Math.floor(value ?? 0))
}

const drawJaggedLine = (
  graphics: Phaser.GameObjects.Graphics,
  from: Point,
  to: Point,
  jitter: number,
): void => {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.max(1, Math.hypot(dx, dy))
  const normalX = -dy / distance
  const normalY = dx / distance
  const segments = Math.max(3, Math.min(9, Math.ceil(distance / 34)))

  graphics.beginPath()
  graphics.moveTo(from.x, from.y)
  for (let index = 1; index < segments; index += 1) {
    const ratio = index / segments
    const offset = (index % 2 === 0 ? -1 : 1) * jitter * (0.62 + (index % 3) * 0.16)
    graphics.lineTo(from.x + dx * ratio + normalX * offset, from.y + dy * ratio + normalY * offset)
  }
  graphics.lineTo(to.x, to.y)
  graphics.strokePath()
}

export function spawnChainLightningEffect(
  scene: Phaser.Scene,
  from: Point,
  to: Point,
  chain: ChainSpec,
  tint: number,
  chainIndex: number,
): void {
  const visualTier = getCombatEffectPowerTier(chain.visualPowerTier)
  const graphics = scene.add.graphics().setDepth(1.18)
  const jitter = 8 + visualTier * 3 + chainIndex

  graphics.lineStyle(9 + visualTier * 2, 0x7dd3fc, 0.18)
  drawJaggedLine(graphics, from, to, jitter + 4)
  graphics.lineStyle(4 + visualTier, tint, 0.78)
  drawJaggedLine(graphics, from, to, jitter)
  graphics.lineStyle(1.5 + visualTier * 0.35, 0xffffff, 0.96)
  drawJaggedLine(graphics, from, to, Math.max(3, jitter * 0.45))

  const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
  const burst = scene.add.circle(midpoint.x, midpoint.y, 8 + visualTier * 3, 0xffffff, 0.55).setDepth(1.19)

  scene.tweens.add({
    targets: graphics,
    alpha: 0,
    duration: 160 + visualTier * 24,
    ease: 'Quad.Out',
    onComplete: () => graphics.destroy(),
  })
  scene.tweens.add({
    targets: burst,
    alpha: 0,
    scaleX: 1.24,
    scaleY: 1.24,
    duration: 170 + visualTier * 24,
    ease: 'Quad.Out',
    onComplete: () => burst.destroy(),
  })
}

export function spawnProjectileTrailEffect(
  scene: Phaser.Scene,
  point: Point,
  tint: number,
  visualPowerTier?: number,
): void {
  const visualTier = getCombatEffectPowerTier(visualPowerTier)
  const spark = scene.add.graphics({ x: point.x, y: point.y }).setDepth(0.86)
  const radius = 4 + visualTier * 1.2

  spark.lineStyle(1.5 + visualTier * 0.25, tint, 0.42)
  spark.strokeCircle(0, 0, radius)
  spark.lineStyle(1, 0xffffff, 0.46)
  spark.lineBetween(-radius * 0.7, 0, radius * 0.7, 0)
  spark.lineBetween(0, -radius * 0.7, 0, radius * 0.7)

  scene.tweens.add({
    targets: spark,
    alpha: 0,
    scaleX: 0.35,
    scaleY: 0.35,
    duration: 150,
    ease: 'Quad.Out',
    onComplete: () => spark.destroy(),
  })
}

export function createHazardZoneEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  hazard: HazardSpawnSpec,
): HazardZoneEffect {
  const visualTier = getCombatEffectPowerTier(hazard.visualPowerTier)
  const core = scene.add.circle(x, y, hazard.radius, hazard.tint, 0.24 + visualTier * 0.025).setDepth(0.4)
  const ring = scene.add.graphics({ x, y }).setDepth(0.43)
  const pulse = scene.add.graphics({ x, y }).setDepth(0.44)

  ring.lineStyle(2 + visualTier, hazard.tint, 0.68)
  ring.strokeCircle(0, 0, hazard.radius)
  ring.lineStyle(1, 0xffffff, 0.2)
  ring.strokeCircle(0, 0, Math.max(4, hazard.radius * 0.72))

  pulse.lineStyle(3 + visualTier, hazard.tint, 0.18)
  pulse.strokeCircle(0, 0, hazard.radius * 0.72)
  scene.tweens.add({
    targets: pulse,
    alpha: 0.08,
    scaleX: 1.22 + visualTier * 0.04,
    scaleY: 1.22 + visualTier * 0.04,
    yoyo: true,
    repeat: Math.max(1, Math.floor(hazard.durationMs / 360)),
    duration: 180,
  })

  return { core, ring, pulse }
}

export function updateHazardZoneEffect(effect: HazardZoneEffect, remainingRatio: number): void {
  const alpha = Math.max(0.1, 0.3 * remainingRatio)
  effect.core.setFillStyle(effect.core.fillColor, alpha)
  effect.ring.setAlpha(Math.max(0.18, remainingRatio))
  effect.pulse.setAlpha(Math.max(0.06, remainingRatio * 0.38))
}

export function destroyHazardZoneEffect(effect: HazardZoneEffect): void {
  effect.core.destroy()
  effect.ring.destroy()
  effect.pulse.destroy()
}

export function spawnHazardTickEffect(scene: Phaser.Scene, hazard: HazardSpawnSpec, point: Point): void {
  const visualTier = getCombatEffectPowerTier(hazard.visualPowerTier)
  const tick = scene.add.graphics({ x: point.x, y: point.y }).setDepth(0.72)
  const radius = 6 + visualTier * 1.4

  tick.lineStyle(1.5 + visualTier * 0.3, hazard.tint, 0.48)
  tick.strokeCircle(0, 0, radius)
  tick.fillStyle(0xffffff, 0.14)
  tick.fillCircle(0, 0, Math.max(2, radius * 0.24))

  scene.tweens.add({
    targets: tick,
    alpha: 0,
    scaleX: 1.45,
    scaleY: 1.45,
    duration: 210,
    ease: 'Quad.Out',
    onComplete: () => tick.destroy(),
  })
}

export function spawnMeleeSwingEffect(scene: Phaser.Scene, origin: Point, swing: MeleeSwingSpec): void {
  const graphics = scene.add.graphics({ x: origin.x, y: origin.y })
  const halfArcRadians = (swing.arcDegrees * Math.PI) / 360
  const visualTier = getCombatEffectPowerTier(swing.visualPowerTier)

  graphics.fillStyle(swing.tint, Math.min(0.46, 0.24 + visualTier * 0.045))
  graphics.lineStyle(7 + visualTier * 1.5, swing.tint, Math.min(0.42, 0.25 + visualTier * 0.04))
  graphics.beginPath()
  graphics.moveTo(0, 0)
  graphics.slice(0, 0, swing.range, -halfArcRadians, halfArcRadians, false)
  graphics.closePath()
  graphics.fillPath()
  graphics.strokePath()
  graphics.lineStyle(2 + visualTier, 0xffffff, Math.min(0.86, 0.56 + visualTier * 0.05))
  graphics.beginPath()
  graphics.slice(0, 0, swing.range, -halfArcRadians, halfArcRadians, false)
  graphics.strokePath()
  graphics.setRotation(Math.atan2(swing.direction.y, swing.direction.x))
  graphics.setDepth(0.7)

  scene.tweens.add({
    targets: graphics,
    alpha: 0,
    scaleX: 1.1 + visualTier * 0.04,
    scaleY: 1.1 + visualTier * 0.04,
    duration: swing.visualDurationMs,
    onComplete: () => graphics.destroy(),
  })
}
