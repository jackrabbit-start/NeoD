import Phaser from 'phaser'

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

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  create(): void {
    generateCircleTexture(this, 'player', 14, 0x66d9ef)
    generateCircleTexture(this, 'slime', 12, 0x84ff95)
    generateCircleTexture(this, 'boss', 28, 0xd8a6ff)
    generateCircleTexture(this, 'projectile', 5, 0xf8fafc)
    generateCircleTexture(this, 'gel-shard', 7, 0x7dffb0)
    generateCircleTexture(this, 'acid-core', 7, 0xb4ff5e)
    generateCircleTexture(this, 'frost-mote', 7, 0x83d5ff)
    generateCircleTexture(this, 'spark-knot', 7, 0xffd866)
    generateCircleTexture(this, 'mist-bead', 7, 0xc4f1ff)
    generateCircleTexture(this, 'tuning-capsule', 7, 0xff9df3)

    this.scene.start('arena')
  }
}
