import Phaser from 'phaser'
import { IDLE_ANIMATIONS, VECTOR_ASSETS, type AnimationDefinition, type VectorAssetDefinition } from '../game/visualManifest.js'

function generateCircleTexture(
  scene: Phaser.Scene,
  key: string,
  radius: number,
  color: number,
): void {
  if (scene.textures.exists(key)) {
    return
  }

  const size = radius * 2
  const graphics = scene.add.graphics()
  graphics.fillStyle(color, 1)
  graphics.fillCircle(radius, radius, radius)
  graphics.generateTexture(key, size, size)
  graphics.destroy()
}

function queueTexture(scene: Phaser.Scene, asset: VectorAssetDefinition): void {
  if (scene.textures.exists(asset.key)) {
    return
  }

  if (asset.path.endsWith('.svg')) {
    scene.load.svg(asset.key, asset.path, {
      width: asset.width,
      height: asset.height,
    })
    return
  }

  scene.load.image(asset.key, asset.path)
}

function ensureFallbackTexture(scene: Phaser.Scene, asset: VectorAssetDefinition): void {
  if (!asset.fallback || scene.textures.exists(asset.key)) {
    return
  }

  generateCircleTexture(scene, asset.key, asset.fallback.radius, asset.fallback.color)
}

function registerLoopingAnimation(scene: Phaser.Scene, definition: AnimationDefinition): void {
  if (scene.anims.exists(definition.key)) {
    return
  }

  const hasAllFrames = definition.frames.every((frameKey) => scene.textures.exists(frameKey))
  if (!hasAllFrames) {
    return
  }

  scene.anims.create({
    key: definition.key,
    frames: definition.frames.map((key) => ({ key })),
    frameRate: definition.frameRate,
    repeat: -1,
  })
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  preload(): void {
    for (const asset of VECTOR_ASSETS) {
      queueTexture(this, asset)
    }
  }

  create(): void {
    for (const asset of VECTOR_ASSETS) {
      ensureFallbackTexture(this, asset)
    }

    for (const animation of IDLE_ANIMATIONS) {
      registerLoopingAnimation(this, animation)
    }

    this.scene.start('start')
  }
}
