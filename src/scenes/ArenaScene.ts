import Phaser from 'phaser'
import { ENEMY_DEFINITIONS } from '../data/enemies.js'
import { WEAPON_DEFINITIONS } from '../data/weapons.js'
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config.js'
import type { HudController } from '../ui/Hud.js'
import type { EnemyDefinition, InventoryState, LootId, WeaponId } from '../domain/types.js'
import { getAvailableRecipes } from '../systems/combine.js'
import { resolveWeightedDrop } from '../systems/drop.js'
import { getWaveByIndex, shouldAdvanceWave } from '../systems/waves.js'
import { describeAvailableRecipes, describeInventoryEntries } from './arena/combineInventoryPresenter.js'
import { applyLootPickup, attemptCombine } from './arena/combineInventoryWorkflow.js'

type PhysicsImage = Phaser.Physics.Arcade.Image

interface EnemyEntity {
  sprite: PhysicsImage
  config: EnemyDefinition
  currentHealth: number
  lastHitAt: number
}

interface LootEntity {
  sprite: PhysicsImage
  itemId: LootId
}

interface ProjectileEntity {
  sprite: PhysicsImage
  damage: number
}

export class ArenaScene extends Phaser.Scene {
  private hud!: HudController

  private player!: PhysicsImage

  private cursors!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>

  private combineKey!: Phaser.Input.Keyboard.Key

  private enemies: EnemyEntity[] = []

  private lootDrops: LootEntity[] = []

  private projectiles: ProjectileEntity[] = []

  private activeWeaponId: WeaponId = 'starter-blaster'

  private inventory: InventoryState = {}

  private playerHealth = 100

  private playerMaxHealth = 100

  private playerSpeed = 220

  private nextFireAt = 0

  private remainingSpawns = 0

  private currentWaveIndex = 0

  private activeWaveLabel = ''

  private wavesCleared = 0

  private spawnTimer?: Phaser.Time.TimerEvent

  private isBossActive = false

  private isCombining = false

  private statusMessage = 'Move with WASD, aim with the mouse, and click to fire.'

  private lastPlayerHitAt = 0

  constructor() {
    super('arena')
  }

  create(): void {
    this.hud = this.game.registry.get('hud') as HudController

    this.cameras.main.setBackgroundColor('#07111f')
    this.physics.world.setBounds(24, 24, GAME_WIDTH - 48, GAME_HEIGHT - 48)

    const arena = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH - 48,
      GAME_HEIGHT - 48,
      0x0d1d33,
      1,
    )
    arena.setStrokeStyle(2, 0x214266, 0.9)

    this.add
      .text(40, GAME_HEIGHT - 36, 'Prototype goal: survive the slime waves and beat the boss', {
        fontSize: '16px',
        color: '#9bb5ff',
      })
      .setDepth(1)

    this.player = this.physics.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player')
    this.player.setCircle(14)
    this.player.setCollideWorldBounds(true)

    const keyboard = this.input.keyboard
    if (!keyboard) {
      throw new Error('Keyboard input is required for the NeoD prototype.')
    }

    this.cursors = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>
    this.combineKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C)

    this.startWave(0)
    this.updateHud()
  }

  update(time: number): void {
    this.handlePlayerMovement()
    this.handleFiring(time)
    this.handleCombine()
    this.updateEnemies()
    this.updateProjectiles()
    this.cleanupDestroyedEntities()

    if (shouldAdvanceWave(this.remainingSpawns, this.enemies.length)) {
      this.advanceWave()
    }

    this.updateHud()
  }

  private handlePlayerMovement(): void {
    const velocity = new Phaser.Math.Vector2(
      Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown),
      Number(this.cursors.down.isDown) - Number(this.cursors.up.isDown),
    )

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(this.playerSpeed)
    }

    this.player.setVelocity(velocity.x, velocity.y)
  }

  private handleFiring(time: number): void {
    if (this.isCombining || !this.input.activePointer.isDown || time < this.nextFireAt) {
      return
    }

    const weapon = WEAPON_DEFINITIONS[this.activeWeaponId]
    const pointer = this.input.activePointer
    const target = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY)
    const origin = new Phaser.Math.Vector2(this.player.x, this.player.y)
    const direction = target.subtract(origin)

    if (direction.lengthSq() === 0) {
      return
    }

    direction.normalize()

    const projectile = this.physics.add.image(this.player.x, this.player.y, 'projectile')
    projectile.setTint(weapon.projectileTint)
    projectile.setCircle(5)
    projectile.setVelocity(
      direction.x * weapon.projectileSpeed,
      direction.y * weapon.projectileSpeed,
    )

    this.projectiles.push({
      sprite: projectile,
      damage: weapon.damage,
    })

    this.nextFireAt = time + weapon.fireRateMs
  }

  private handleCombine(): void {
    if (this.isCombining || !Phaser.Input.Keyboard.JustDown(this.combineKey)) {
      return
    }

    const combineAttempt = attemptCombine(this.inventory)
    if (combineAttempt.kind !== 'success') {
      this.statusMessage = combineAttempt.statusMessage
      return
    }

    this.isCombining = true
    this.inventory = combineAttempt.nextInventory
    this.activeWeaponId = combineAttempt.weaponId
    this.statusMessage = combineAttempt.statusMessage

    if (combineAttempt.shouldPauseCombat) {
      this.freezeCombat(true)
      this.time.delayedCall(450, () => {
        this.isCombining = false
        this.freezeCombat(false)
      })
    }
  }

  private updateEnemies(): void {
    for (const enemy of this.enemies) {
      if (!enemy.sprite.active) {
        continue
      }

      if (this.isCombining) {
        enemy.sprite.setVelocity(0, 0)
        continue
      }

      const direction = new Phaser.Math.Vector2(
        this.player.x - enemy.sprite.x,
        this.player.y - enemy.sprite.y,
      )

      if (direction.lengthSq() === 0) {
        enemy.sprite.setVelocity(0, 0)
        continue
      }

      direction.normalize().scale(enemy.config.speed)
      enemy.sprite.setVelocity(direction.x, direction.y)

      const touchingPlayer =
        Phaser.Math.Distance.Between(
          enemy.sprite.x,
          enemy.sprite.y,
          this.player.x,
          this.player.y,
        ) <
        enemy.config.size / 2 + 16

      if (touchingPlayer) {
        this.damagePlayer(enemy.config.contactDamage)
      }
    }
  }

  private updateProjectiles(): void {
    for (const projectile of this.projectiles) {
      if (!projectile.sprite.active) {
        continue
      }

      const outOfBounds =
        projectile.sprite.x < 0 ||
        projectile.sprite.x > GAME_WIDTH ||
        projectile.sprite.y < 0 ||
        projectile.sprite.y > GAME_HEIGHT

      if (outOfBounds) {
        projectile.sprite.destroy()
        continue
      }

      for (const enemy of this.enemies) {
        if (!enemy.sprite.active) {
          continue
        }

        const hitDistance = enemy.config.size / 2 + 7
        if (
          Phaser.Math.Distance.Between(
            projectile.sprite.x,
            projectile.sprite.y,
            enemy.sprite.x,
            enemy.sprite.y,
          ) <= hitDistance
        ) {
          this.damageEnemy(enemy, projectile.damage)
          projectile.sprite.destroy()
          break
        }
      }
    }

    for (const loot of this.lootDrops) {
      if (!loot.sprite.active) {
        continue
      }

      const pickupDistance = 20
      if (
        Phaser.Math.Distance.Between(
          loot.sprite.x,
          loot.sprite.y,
          this.player.x,
          this.player.y,
        ) <= pickupDistance
      ) {
        const pickupResult = applyLootPickup(this.inventory, loot.itemId)
        this.inventory = pickupResult.nextInventory
        this.statusMessage = pickupResult.statusMessage
        loot.sprite.destroy()
      }
    }
  }

  private cleanupDestroyedEntities(): void {
    this.enemies = this.enemies.filter((enemy) => enemy.sprite.active)
    this.lootDrops = this.lootDrops.filter((loot) => loot.sprite.active)
    this.projectiles = this.projectiles.filter((projectile) => projectile.sprite.active)
  }

  private startWave(index: number): void {
    const wave = getWaveByIndex(index)
    if (!wave) {
      return
    }

    this.currentWaveIndex = index
    this.activeWaveLabel = wave.label
    this.remainingSpawns = wave.count
    this.statusMessage = `${wave.label} started.`

    if (wave.isBossWave) {
      this.isBossActive = true
      this.spawnEnemy(wave.enemyId)
      this.remainingSpawns = 0
      return
    }

    this.spawnTimer?.remove(false)
    this.spawnTimer = this.time.addEvent({
      delay: wave.spawnIntervalMs,
      repeat: Math.max(0, wave.count - 1),
      callback: () => {
        this.spawnEnemy(wave.enemyId)
        this.remainingSpawns -= 1
      },
    })

    this.spawnEnemy(wave.enemyId)
    this.remainingSpawns -= 1
  }

  private advanceWave(): void {
    const clearedWave = getWaveByIndex(this.currentWaveIndex)
    const nextIndex = this.currentWaveIndex + 1
    const nextWave = getWaveByIndex(nextIndex)

    if (!nextWave) {
      return
    }

    if (clearedWave && !clearedWave.isBossWave) {
      this.wavesCleared += 1
    }

    this.startWave(nextIndex)
  }

  private spawnEnemy(enemyId: EnemyDefinition['id']): void {
    const config = ENEMY_DEFINITIONS[enemyId]
    const x =
      Math.random() < 0.5
        ? Phaser.Math.Between(48, GAME_WIDTH - 48)
        : Math.random() < 0.5
          ? 48
          : GAME_WIDTH - 48
    const y =
      x === 48 || x === GAME_WIDTH - 48
        ? Phaser.Math.Between(48, GAME_HEIGHT - 48)
        : Math.random() < 0.5
          ? 48
          : GAME_HEIGHT - 48

    const texture = enemyId === 'slime-boss' ? 'boss' : 'slime'
    const sprite = this.physics.add.image(x, y, texture)
    sprite.setTint(config.tint)
    sprite.setCircle(config.size / 2)
    sprite.setCollideWorldBounds(true)
    sprite.setBounce(0.2)

    this.enemies.push({
      sprite,
      config,
      currentHealth: config.maxHealth,
      lastHitAt: 0,
    })
  }

  private damageEnemy(enemy: EnemyEntity, damage: number): void {
    const now = this.time.now
    if (now - enemy.lastHitAt < 50) {
      return
    }

    enemy.lastHitAt = now
    enemy.currentHealth -= damage

    if (enemy.currentHealth > 0) {
      enemy.sprite.setScale(1.08)
      this.tweens.add({
        targets: enemy.sprite,
        scale: 1,
        duration: 80,
      })
      return
    }

    if (enemy.config.drops) {
      const droppedItem = resolveWeightedDrop(enemy.config.drops)
      if (droppedItem) {
        const loot = this.physics.add.image(enemy.sprite.x, enemy.sprite.y, droppedItem)
        loot.setCircle(7)
        this.lootDrops.push({
          sprite: loot,
          itemId: droppedItem,
        })
      }
    }

    const wasBoss = enemy.config.id === 'slime-boss'
    enemy.sprite.destroy()

    if (wasBoss) {
      this.endRun('win')
      return
    }

    this.statusMessage = `${enemy.config.name} defeated. Keep collecting drops.`
  }

  private damagePlayer(damage: number): void {
    const now = this.time.now
    if (now - this.lastPlayerHitAt < 450 || this.isCombining) {
      return
    }

    this.lastPlayerHitAt = now
    this.playerHealth = Math.max(0, this.playerHealth - damage)
    this.statusMessage = `Player hit for ${damage}. Stay mobile.`
    this.player.setTint(0xffa8a8)

    this.time.delayedCall(120, () => {
      this.player.clearTint()
    })

    if (this.playerHealth <= 0) {
      this.endRun('loss')
    }
  }

  private freezeCombat(shouldFreeze: boolean): void {
    if (!shouldFreeze) {
      return
    }

    for (const enemy of this.enemies) {
      enemy.sprite.setVelocity(0, 0)
    }
  }

  private endRun(outcome: 'win' | 'loss'): void {
    this.spawnTimer?.remove(false)
    this.freezeCombat(true)
    this.hud.update({
      title: outcome === 'win' ? 'Run complete' : 'Run failed',
      subtitle:
        outcome === 'win'
          ? 'Boss defeated. Press R to replay.'
          : 'The slime swarm overwhelmed the player.',
      stats: [],
      inventory: [],
      recipes: [],
      objective: 'Press R on the result screen to restart.',
      tip: 'WASD move · Mouse aim · Hold click shoot · C combine',
      status: this.statusMessage,
    })

    this.time.delayedCall(600, () => {
      this.scene.start('result', {
        outcome,
        weaponName: WEAPON_DEFINITIONS[this.activeWeaponId].name,
        wavesCleared: this.wavesCleared,
      })
    })
  }

  private updateHud(): void {
    const weapon = WEAPON_DEFINITIONS[this.activeWeaponId]
    const recipes = getAvailableRecipes(this.inventory)

    this.hud.update({
      title: 'NeoD Prototype',
      subtitle: this.activeWaveLabel || 'Preparing arena',
      stats: [
        `Health: ${this.playerHealth}/${this.playerMaxHealth}`,
        `Weapon: ${weapon.name} (${weapon.damage} dmg / ${Math.round(1000 / weapon.fireRateMs)} shots/s)`,
        `Enemies alive: ${this.enemies.length}`,
        `Remaining spawns: ${this.remainingSpawns}`,
      ],
      inventory: describeInventoryEntries(this.inventory),
      recipes: describeAvailableRecipes(recipes),
      objective: this.isBossActive
        ? 'Defeat the Crown Slime to clear the run.'
        : 'Survive the waves, collect drops, and press C when a combine is ready.',
      tip: 'WASD move · Mouse aim · Hold click shoot · C combine',
      status: this.statusMessage,
    })
  }
}
