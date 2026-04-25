import Phaser from 'phaser'
import type { ChainSpec, HazardSpawnSpec, MeleeSwingSpec, Point } from '../../systems/weaponBehaviors.js'

export type ProjectileTrailStyle =
  | 'default'
  | 'machinegun'
  | 'acid'
  | 'rocket'
  | 'shotgun'
  | 'kickball'
  | 'turret'
  | 'compiler'
  | 'necro'

export interface HazardZoneEffect {
  core: Phaser.GameObjects.Arc
  ring: Phaser.GameObjects.Graphics
  pulse: Phaser.GameObjects.Graphics
  glyph?: Phaser.GameObjects.Text
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

const mixColor = (base: number, overlay: number, amount: number): number => {
  const clamped = Phaser.Math.Clamp(amount, 0, 1)
  const baseColor = Phaser.Display.Color.IntegerToColor(base)
  const overlayColor = Phaser.Display.Color.IntegerToColor(overlay)

  return Phaser.Display.Color.GetColor(
    Math.round(baseColor.red + (overlayColor.red - baseColor.red) * clamped),
    Math.round(baseColor.green + (overlayColor.green - baseColor.green) * clamped),
    Math.round(baseColor.blue + (overlayColor.blue - baseColor.blue) * clamped),
  )
}

const drawBurstRays = (
  graphics: Phaser.GameObjects.Graphics,
  count: number,
  innerRadius: number,
  outerRadius: number,
  color: number,
  alpha: number,
): void => {
  graphics.lineStyle(2, color, alpha)
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count
    const x1 = Math.cos(angle) * innerRadius
    const y1 = Math.sin(angle) * innerRadius
    const x2 = Math.cos(angle) * outerRadius
    const y2 = Math.sin(angle) * outerRadius
    graphics.lineBetween(x1, y1, x2, y2)
  }
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
  style: ProjectileTrailStyle = 'default',
): void {
  const visualTier = getCombatEffectPowerTier(visualPowerTier)
  const spark = scene.add.container(point.x, point.y).setDepth(0.86)
  const ring = scene.add.graphics()
  const rays = scene.add.graphics()
  const ember = scene.add.circle(0, 0, 2.5 + visualTier * 0.55, mixColor(tint, 0xffffff, 0.3), 0.66)
  const radius = 4 + visualTier * 1.2

  ring.lineStyle(1.5 + visualTier * 0.25, tint, 0.36)
  ring.strokeCircle(0, 0, radius)
  ring.lineStyle(1, mixColor(tint, 0xffffff, 0.55), 0.52)
  ring.strokeCircle(0, 0, radius * 0.56)

  drawBurstRays(
    rays,
    4,
    radius * 0.35,
    radius * 1.25,
    mixColor(tint, 0xffffff, 0.42),
    0.34,
  )

  switch (style) {
    case 'machinegun':
      ring.lineStyle(1, 0xffffff, 0.56)
      ring.lineBetween(-radius * 1.1, 0, radius * 1.4, 0)
      break
    case 'acid': {
      const droplets = scene.add.graphics()
      droplets.fillStyle(mixColor(tint, 0xecfccb, 0.35), 0.36)
      droplets.fillCircle(-radius * 0.6, radius * 0.1, radius * 0.35)
      droplets.fillCircle(radius * 0.3, -radius * 0.25, radius * 0.22)
      droplets.fillCircle(radius * 0.72, radius * 0.4, radius * 0.16)
      spark.add(droplets)
      break
    }
    case 'rocket': {
      const flame = scene.add.graphics()
      flame.fillStyle(mixColor(tint, 0xffedd5, 0.5), 0.5)
      flame.beginPath()
      flame.moveTo(-radius * 1.4, 0)
      flame.lineTo(-radius * 0.4, -radius * 0.42)
      flame.lineTo(-radius * 0.4, radius * 0.42)
      flame.closePath()
      flame.fillPath()
      spark.add(flame)
      break
    }
    case 'shotgun': {
      rays.clear()
      drawBurstRays(rays, 7, radius * 0.18, radius * 1.3, mixColor(tint, 0xffffff, 0.4), 0.34)
      break
    }
    case 'kickball': {
      ring.clear()
      ring.lineStyle(2, mixColor(tint, 0xffffff, 0.25), 0.48)
      ring.strokeCircle(0, 0, radius)
      ring.lineStyle(1.2, 0x1f2937, 0.3)
      ring.strokeCircle(0, 0, radius * 0.65)
      break
    }
    case 'turret': {
      const square = scene.add.graphics()
      square.lineStyle(1.5, mixColor(tint, 0xffffff, 0.3), 0.44)
      square.strokeRect(-radius * 0.65, -radius * 0.65, radius * 1.3, radius * 1.3)
      spark.add(square)
      break
    }
    case 'compiler': {
      const text = scene.add.text(0, 0, 'blast();', {
        fontFamily: 'monospace',
        fontSize: `${Math.max(8, 8 + visualTier)}px`,
        color: '#d9f99d',
        stroke: '#082f49',
        strokeThickness: 2,
      }).setOrigin(0.5).setAlpha(0.35)
      spark.add(text)
      break
    }
    case 'necro': {
      const ghost = scene.add.graphics()
      ghost.lineStyle(1.4, mixColor(tint, 0xdcfce7, 0.4), 0.42)
      ghost.strokeCircle(0, 0, radius * 0.82)
      ghost.lineBetween(0, -radius * 0.8, 0, radius * 0.8)
      spark.add(ghost)
      break
    }
    default:
      break
  }

  spark.add([ring, rays, ember])
  scene.tweens.add({
    targets: spark,
    alpha: 0,
    scaleX: 0.32,
    scaleY: 0.32,
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
  const isTriggerTrap = hazard.mode === 'trigger-trap'
  const core = scene.add.circle(
    x,
    y,
    hazard.radius,
    hazard.tint,
    isTriggerTrap ? 0.1 + visualTier * 0.02 : 0.18 + visualTier * 0.03,
  ).setDepth(0.4)
  const ring = scene.add.graphics({ x, y }).setDepth(0.43)
  const pulse = scene.add.graphics({ x, y }).setDepth(0.44)
  const innerTint = mixColor(hazard.tint, 0xffffff, 0.22)

  core.setStrokeStyle(2 + visualTier * 0.4, innerTint, isTriggerTrap ? 0.46 : 0.3)

  if (isTriggerTrap) {
    ring.lineStyle(2 + visualTier, hazard.tint, 0.8)
    ring.strokeRoundedRect(-hazard.radius, -hazard.radius * 0.62, hazard.radius * 2, hazard.radius * 1.24, 10)
    ring.lineStyle(1.4, innerTint, 0.34)
    ring.strokeRoundedRect(-hazard.radius * 0.68, -hazard.radius * 0.38, hazard.radius * 1.36, hazard.radius * 0.76, 8)
    pulse.lineStyle(2 + visualTier * 0.6, mixColor(hazard.tint, 0xffffff, 0.34), 0.22)
    pulse.strokeRoundedRect(-hazard.radius * 0.82, -hazard.radius * 0.48, hazard.radius * 1.64, hazard.radius * 0.96, 10)
  } else {
    ring.lineStyle(2 + visualTier, hazard.tint, 0.68)
    ring.strokeCircle(0, 0, hazard.radius)
    ring.lineStyle(1.5, innerTint, 0.24)
    ring.strokeCircle(0, 0, Math.max(4, hazard.radius * 0.72))
    ring.lineStyle(1, mixColor(hazard.tint, 0x000000, 0.35), 0.18)
    ring.strokeCircle(0, 0, Math.max(4, hazard.radius * 0.42))
    pulse.lineStyle(3 + visualTier, hazard.tint, 0.18)
    pulse.strokeCircle(0, 0, hazard.radius * 0.72)
  }

  scene.tweens.add({
    targets: pulse,
    alpha: isTriggerTrap ? 0.12 : 0.08,
    scaleX: (isTriggerTrap ? 1.12 : 1.22) + visualTier * 0.04,
    scaleY: (isTriggerTrap ? 1.12 : 1.22) + visualTier * 0.04,
    yoyo: true,
    repeat: Math.max(1, Math.floor(hazard.durationMs / 360)),
    duration: isTriggerTrap ? 240 : 180,
  })

  let glyph: Phaser.GameObjects.Text | undefined
  if (hazard.radius >= 40) {
    glyph = scene.add.text(x, y, isTriggerTrap ? 'if (enemy.near) blast();' : 'if (hit) blast();', {
      fontFamily: 'monospace',
      fontSize: `${Math.max(10, Math.round(hazard.radius * 0.18))}px`,
      color: `#${innerTint.toString(16).padStart(6, '0')}`,
      stroke: '#0f172a',
      strokeThickness: 2,
    })
      .setOrigin(0.5)
      .setAlpha(isTriggerTrap ? 0.42 : 0.3)
      .setDepth(0.45)

    scene.tweens.add({
      targets: glyph,
      alpha: isTriggerTrap ? 0.2 : 0.12,
      yoyo: true,
      repeat: Math.max(1, Math.floor(hazard.durationMs / 520)),
      duration: 220,
    })
  }

  return { core, ring, pulse, glyph }
}

export function updateHazardZoneEffect(effect: HazardZoneEffect, remainingRatio: number): void {
  const alpha = Math.max(0.1, 0.3 * remainingRatio)
  effect.core.setFillStyle(effect.core.fillColor, alpha)
  effect.ring.setAlpha(Math.max(0.18, remainingRatio))
  effect.pulse.setAlpha(Math.max(0.06, remainingRatio * 0.38))
  effect.glyph?.setAlpha(Math.max(0.05, remainingRatio * 0.22))
}

export function destroyHazardZoneEffect(effect: HazardZoneEffect): void {
  effect.core.destroy()
  effect.ring.destroy()
  effect.pulse.destroy()
  effect.glyph?.destroy()
}

export function spawnHazardTickEffect(scene: Phaser.Scene, hazard: HazardSpawnSpec, point: Point): void {
  const visualTier = getCombatEffectPowerTier(hazard.visualPowerTier)
  const tick = scene.add.container(point.x, point.y).setDepth(0.72)
  const ring = scene.add.graphics()
  const burst = scene.add.graphics()
  const radius = 6 + visualTier * 1.4

  ring.lineStyle(1.5 + visualTier * 0.3, hazard.tint, 0.48)
  ring.strokeCircle(0, 0, radius)
  ring.fillStyle(mixColor(hazard.tint, 0xffffff, 0.2), 0.14)
  ring.fillCircle(0, 0, Math.max(2, radius * 0.24))
  drawBurstRays(burst, 6, radius * 0.2, radius * 1.1, hazard.tint, 0.22)
  tick.add([ring, burst])

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

export function spawnExplosionEffect(scene: Phaser.Scene, x: number, y: number, hazard: HazardSpawnSpec): void {
  const visualTier = getCombatEffectPowerTier(hazard.visualPowerTier)
  const container = scene.add.container(x, y).setDepth(0.67)
  const flash = scene.add.circle(0, 0, Math.max(16, hazard.radius * 0.24), 0xffffff, 0.84)
  const shockwave = scene.add.graphics()
  const sparks = scene.add.graphics()
  const emberTint = mixColor(hazard.tint, 0xffd27a, 0.35)

  shockwave.lineStyle(8 + visualTier * 1.4, hazard.tint, 0.3)
  shockwave.strokeCircle(0, 0, Math.max(18, hazard.radius * 0.36))
  shockwave.lineStyle(3 + visualTier * 0.7, emberTint, 0.48)
  shockwave.strokeCircle(0, 0, Math.max(12, hazard.radius * 0.2))
  drawBurstRays(sparks, 10, hazard.radius * 0.16, hazard.radius * 0.78, emberTint, 0.36)

  container.add([shockwave, sparks, flash])
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    scaleX: 1.6,
    scaleY: 1.6,
    duration: 110 + visualTier * 20,
    ease: 'Quad.Out',
  })
  scene.tweens.add({
    targets: container,
    alpha: 0,
    scaleX: 1.18 + visualTier * 0.06,
    scaleY: 1.18 + visualTier * 0.06,
    duration: 180 + visualTier * 30,
    ease: 'Cubic.Out',
    onComplete: () => container.destroy(),
  })
}

export function spawnMeleeSwingEffect(scene: Phaser.Scene, origin: Point, swing: MeleeSwingSpec): void {
  const halfArcRadians = (swing.arcDegrees * Math.PI) / 360
  const visualTier = getCombatEffectPowerTier(swing.visualPowerTier)
  const rotation = Math.atan2(swing.direction.y, swing.direction.x)
  const container = scene.add.container(origin.x, origin.y).setRotation(rotation).setDepth(0.7)

  if (swing.healOnHit && swing.arcDegrees >= 300) {
    const sandTint = mixColor(swing.tint, 0xffb45a, 0.58)
    const aura = scene.add.circle(0, 0, Math.max(18, swing.range * 0.42), sandTint, 0.16)
    const outer = scene.add.graphics()
    const inner = scene.add.graphics()
    const slashes = scene.add.graphics()

    outer.lineStyle(12 + visualTier * 1.8, sandTint, 0.24)
    outer.strokeCircle(0, 0, swing.range * 0.68)
    outer.lineStyle(5 + visualTier, swing.tint, 0.34)
    outer.strokeCircle(0, 0, swing.range * 0.88)

    inner.fillStyle(swing.tint, 0.18 + visualTier * 0.025)
    inner.slice(0, 0, swing.range * 0.9, 0, Math.PI * 2, false)
    inner.fillPath()
    inner.lineStyle(3, 0xffffff, 0.26)
    inner.strokeCircle(0, 0, swing.range * 0.54)

    for (let index = 0; index < 3; index += 1) {
      const angle = ((Math.PI * 2) / 3) * index
      const start = angle - 0.42
      const end = angle + 0.42
      slashes.lineStyle(10 + visualTier, sandTint, 0.22)
      slashes.beginPath()
      slashes.slice(0, 0, swing.range * 0.92, start, end, false)
      slashes.strokePath()
      slashes.lineStyle(4 + visualTier * 0.4, mixColor(swing.tint, 0xffffff, 0.34), 0.58)
      slashes.beginPath()
      slashes.slice(0, 0, swing.range * 0.76, start + 0.08, end - 0.08, false)
      slashes.strokePath()
    }

    container.add([aura, inner, outer, slashes])
    scene.tweens.add({
      targets: container,
      alpha: 0,
      rotation: rotation + Phaser.Math.DegToRad(42),
      scaleX: 1.08 + visualTier * 0.03,
      scaleY: 1.08 + visualTier * 0.03,
      duration: swing.visualDurationMs + 60,
      ease: 'Cubic.Out',
      onComplete: () => container.destroy(),
    })
    return
  }

  const graphics = scene.add.graphics()
  const highlight = scene.add.graphics()

  graphics.fillStyle(swing.tint, Math.min(0.46, 0.24 + visualTier * 0.045))
  graphics.lineStyle(7 + visualTier * 1.5, swing.tint, Math.min(0.42, 0.25 + visualTier * 0.04))
  graphics.beginPath()
  graphics.moveTo(0, 0)
  graphics.slice(0, 0, swing.range, -halfArcRadians, halfArcRadians, false)
  graphics.closePath()
  graphics.fillPath()
  graphics.strokePath()

  highlight.lineStyle(2 + visualTier, 0xffffff, Math.min(0.86, 0.56 + visualTier * 0.05))
  highlight.beginPath()
  highlight.slice(0, 0, swing.range, -halfArcRadians, halfArcRadians, false)
  highlight.strokePath()
  highlight.lineStyle(1.2 + visualTier * 0.2, mixColor(swing.tint, 0xffffff, 0.35), 0.32)
  highlight.beginPath()
  highlight.slice(0, 0, swing.range * 0.62, -halfArcRadians * 0.82, halfArcRadians * 0.82, false)
  highlight.strokePath()

  container.add([graphics, highlight])
  scene.tweens.add({
    targets: container,
    alpha: 0,
    scaleX: 1.1 + visualTier * 0.04,
    scaleY: 1.1 + visualTier * 0.04,
    duration: swing.visualDurationMs,
    ease: 'Quad.Out',
    onComplete: () => container.destroy(),
  })
}
