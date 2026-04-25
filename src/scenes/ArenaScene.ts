import Phaser from 'phaser'
import { ENEMY_DEFINITIONS } from '../data/enemies.js'
import { ITEM_DEFINITIONS } from '../data/items.js'
import { WEAPON_DEFINITIONS } from '../data/weapons.js'
import type {
  AvailableRecipe,
  EnemyDefinition,
  HudOwnedItemView,
  HudOwnedWeaponView,
  InventoryState,
  LootId,
  RecipeId,
  WeaponId,
} from '../domain/types.js'
import { ENEMY_CONTACT_PADDING, PLAYER_COLLISION_RADIUS, PROJECTILE_COLLISION_RADIUS, PROJECTILE_HIT_PADDING } from '../game/combatGeometry.js'
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config.js'
import type { CodexController } from '../ui/Codex.js'
import type { HudController } from '../ui/Hud.js'
import { getCodexState } from '../systems/codex.js'
import { resolveWeightedDrop } from '../systems/drop.js'
import { getEnemyHealthBarMetrics, getEnemyHealthFillWidth } from '../systems/enemyHealthBar.js'
import {
  deriveEffectiveWeaponStats,
  getTuningEffectLabel,
  getWeaponTuningBlockReason,
  resolveTuningSelection,
  type WeaponTuningState,
} from '../systems/tuning.js'
import {
  equipOwnedWeapon,
  getActionableRecipes,
  seedOwnedWeapons,
} from '../systems/weaponOwnership.js'
import { getWaveByIndex, shouldAdvanceWave } from '../systems/waves.js'
import { resolveAutoAttackShot } from './arena/autoAttack.js'
import { describeAvailableRecipes, describeInventoryEntries } from './arena/combineInventoryPresenter.js'
import {
  applyLootPickup,
  applyRecipeSelectionWorkflow,
} from './arena/combineInventoryWorkflow.js'

type PhysicsImage = Phaser.Physics.Arcade.Image
type PhysicsSprite = Phaser.Physics.Arcade.Sprite

interface EnemyHealthBar {
  background: Phaser.GameObjects.Rectangle
  fill: Phaser.GameObjects.Rectangle
  width: number
  height: number
  offsetY: number
}

interface EnemyEntity {
  sprite: PhysicsSprite
  config: EnemyDefinition
  currentHealth: number
  healthBar: EnemyHealthBar
  lastHitAt: number
}

interface LootEntity {
  sprite: PhysicsImage
  itemId: LootId
}

interface ProjectileEntity {
  sprite: PhysicsImage
  damage: number
  spinTween?: Phaser.Tweens.Tween
}

export class ArenaScene extends Phaser.Scene {
  private hud!: HudController

  private codex!: CodexController

  private player!: PhysicsSprite

  private enemySprites!: Phaser.Physics.Arcade.Group

  private enemySpacingCollider?: Phaser.Physics.Arcade.Collider

  private cursors!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>

  private inventoryKey!: Phaser.Input.Keyboard.Key

  private codexKey!: Phaser.Input.Keyboard.Key

  private enemies: EnemyEntity[] = []

  private lootDrops: LootEntity[] = []

  private projectiles: ProjectileEntity[] = []

  private ownedWeaponIds: WeaponId[] = seedOwnedWeapons()

  private activeWeaponId: WeaponId = 'starter-blaster'

  private inventory: InventoryState = {}

  private tuningState: WeaponTuningState = {}

  private isInventoryOpen = false

  private isCodexOpen = false

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

  private statusMessage = 'Move with WASD while your weapon auto-targets the nearest enemy.'

  private lastPlayerHitAt = 0

  constructor() {
    super('arena')
  }

  create(): void {
    this.hud = this.game.registry.get('hud') as HudController
    this.codex = this.game.registry.get('codex') as CodexController
    this.hud.setHandlers({
      onInventoryToggle: () => this.toggleInventory(),
      onInventoryClose: () => this.closeInventory(),
      onRecipeSelect: (recipeId) => this.handleRecipeSelection(recipeId),
      onWeaponEquip: (weaponId) => this.handleWeaponEquip(weaponId),
      onWeaponTune: (weaponId) => this.handleWeaponTune(weaponId),
    })

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

    this.player = this.physics.add.sprite(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      'player',
    )
    this.player.setCircle(PLAYER_COLLISION_RADIUS)
    this.player.setCollideWorldBounds(true)
    this.player.play('player-idle')

    this.enemySprites = this.physics.add.group()
    this.enemySpacingCollider = this.physics.add.collider(this.enemySprites, this.enemySprites)

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
    this.inventoryKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I)
    this.codexKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)

    this.startWave(0)
    this.updateHud()
    this.updateCodex()
  }

  update(time: number): void {
    this.handleInventoryToggle()
    this.handleCodexToggle()
    this.handlePlayerMovement()
    this.handleFiring(time)
    this.updateEnemies()
    this.updateProjectiles()
    this.cleanupDestroyedEntities()

    if (!this.isInteractionBlocked() && shouldAdvanceWave(this.remainingSpawns, this.enemies.length)) {
      this.advanceWave()
    }

    this.updateHud()
    this.updateCodex()
  }

  private isInteractionBlocked(): boolean {
    return this.isInventoryOpen || this.isCodexOpen
  }

  private handleInventoryToggle(): void {
    if (!Phaser.Input.Keyboard.JustDown(this.inventoryKey)) {
      return
    }

    this.toggleInventory()
  }

  private handleCodexToggle(): void {
    if (!Phaser.Input.Keyboard.JustDown(this.codexKey) || this.isInventoryOpen) {
      return
    }

    this.isCodexOpen = !this.isCodexOpen
    this.applyInteractionPause(this.isCodexOpen)
    this.statusMessage = this.isCodexOpen
      ? 'Field Codex open. Combat is paused while you inspect shared data.'
      : 'Field Codex closed. Combat resumed.'
    this.updateCodex()
    this.updateHud()
  }

  private handlePlayerMovement(): void {
    if (this.isInteractionBlocked()) {
      this.player.setVelocity(0, 0)
      this.setPlayerAnimation(false)
      return
    }

    const velocity = new Phaser.Math.Vector2(
      Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown),
      Number(this.cursors.down.isDown) - Number(this.cursors.up.isDown),
    )

    const isMoving = velocity.lengthSq() > 0
    if (isMoving) {
      velocity.normalize().scale(this.playerSpeed)
    }

    this.player.setVelocity(velocity.x, velocity.y)
    this.setPlayerAnimation(isMoving)
  }

  private handleFiring(time: number): void {
    const weapon = deriveEffectiveWeaponStats(this.activeWeaponId, this.tuningState)
    const target = resolveAutoAttackShot(
      {
        x: this.player.x,
        y: this.player.y,
      },
      this.enemies.map((enemy) => ({
        x: enemy.sprite.x,
        y: enemy.sprite.y,
        isActive: enemy.sprite.active,
      })),
      {
        isInteractionBlocked: this.isInteractionBlocked(),
        time,
        nextFireAt: this.nextFireAt,
      },
    )

    if (!target) {
      return
    }

    const projectile = this.physics.add.image(
      this.player.x,
      this.player.y,
      weapon.projectileTextureKey,
    )
    projectile.setCircle(PROJECTILE_COLLISION_RADIUS)
    projectile.setRotation(Math.atan2(target.directionY, target.directionX))
    projectile.setVelocity(
      target.directionX * weapon.projectileSpeed,
      target.directionY * weapon.projectileSpeed,
    )

    const spinTween = this.tweens.add({
      targets: projectile,
      angle: projectile.angle + 360,
      duration: 1100,
      repeat: -1,
    })

    this.projectiles.push({
      sprite: projectile,
      damage: weapon.damage,
      spinTween,
    })

    this.nextFireAt = time + weapon.fireRateMs
    this.tweens.add({
      targets: this.player,
      scaleX: 0.94,
      scaleY: 1.06,
      duration: 70,
      yoyo: true,
    })
  }

  private updateEnemies(): void {
    for (const enemy of this.enemies) {
      if (!enemy.sprite.active) {
        continue
      }

      if (this.isInteractionBlocked()) {
        enemy.sprite.setVelocity(0, 0)
        this.syncEnemyHealthBar(enemy)
        continue
      }

      const direction = new Phaser.Math.Vector2(
        this.player.x - enemy.sprite.x,
        this.player.y - enemy.sprite.y,
      )

      if (direction.lengthSq() === 0) {
        enemy.sprite.setVelocity(0, 0)
        this.syncEnemyHealthBar(enemy)
        continue
      }

      direction.normalize().scale(enemy.config.speed)
      enemy.sprite.setVelocity(direction.x, direction.y)
      enemy.sprite.play(enemy.config.animationKey, true)

      const touchingPlayer =
        Phaser.Math.Distance.Between(
          enemy.sprite.x,
          enemy.sprite.y,
          this.player.x,
          this.player.y,
        ) <
        enemy.config.size / 2 + ENEMY_CONTACT_PADDING

      if (touchingPlayer) {
        this.damagePlayer(enemy.config.contactDamage)
      }

      this.syncEnemyHealthBar(enemy)
    }
  }

  private updateProjectiles(): void {
    if (this.isInteractionBlocked()) {
      return
    }

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
        projectile.spinTween?.remove()
        projectile.sprite.destroy()
        continue
      }

      for (const enemy of this.enemies) {
        if (!enemy.sprite.active) {
          continue
        }

        const hitDistance = enemy.config.size / 2 + PROJECTILE_HIT_PADDING
        if (
          Phaser.Math.Distance.Between(
            projectile.sprite.x,
            projectile.sprite.y,
            enemy.sprite.x,
            enemy.sprite.y,
          ) <= hitDistance
        ) {
          this.damageEnemy(enemy, projectile.damage)
          projectile.spinTween?.remove()
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
    for (const enemy of this.enemies) {
      if (!enemy.sprite.active) {
        this.destroyEnemyHealthBar(enemy)
      }
    }

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

    const sprite = this.physics.add.sprite(x, y, config.textureKey)
    sprite.setCircle(config.size / 2)
    sprite.setCollideWorldBounds(true)
    sprite.setBounce(0)
    sprite.play(config.animationKey)
    this.enemySprites.add(sprite)

    const enemy: EnemyEntity = {
      sprite,
      config,
      currentHealth: config.maxHealth,
      healthBar: this.createEnemyHealthBar(sprite, config),
      lastHitAt: 0,
    }

    this.syncEnemyHealthBar(enemy)
    this.enemies.push(enemy)
  }

  private damageEnemy(enemy: EnemyEntity, damage: number): void {
    const now = this.time.now
    if (now - enemy.lastHitAt < 50) {
      return
    }

    enemy.lastHitAt = now
    enemy.currentHealth -= damage
    this.syncEnemyHealthBar(enemy)

    if (enemy.currentHealth > 0) {
      enemy.sprite.setScale(1.08)
      this.tweens.add({
        targets: enemy.sprite,
        scale: 1,
        duration: 100,
      })
      return
    }

    if (enemy.config.drops) {
      const droppedItem = resolveWeightedDrop(enemy.config.drops)
      if (droppedItem) {
        const itemDefinition = ITEM_DEFINITIONS[droppedItem]
        const loot = this.physics.add.image(
          enemy.sprite.x,
          enemy.sprite.y,
          itemDefinition.textureKey,
        )
        loot.setCircle(7)
        this.lootDrops.push({
          sprite: loot,
          itemId: droppedItem,
        })
      }
    }

    const wasBoss = enemy.config.id === 'slime-boss'
    this.destroyEnemyHealthBar(enemy)
    enemy.sprite.destroy()

    if (wasBoss) {
      this.endRun('win')
      return
    }

    this.statusMessage = `${enemy.config.name} defeated. Keep collecting drops.`
  }

  private damagePlayer(damage: number): void {
    const now = this.time.now
    if (now - this.lastPlayerHitAt < 450 || this.isInteractionBlocked()) {
      return
    }

    this.lastPlayerHitAt = now
    this.playerHealth = Math.max(0, this.playerHealth - damage)
    this.statusMessage = `Player hit for ${damage}. Stay mobile.`
    this.player.setAlpha(0.55)
    this.tweens.add({
      targets: this.player,
      alpha: 1,
      duration: 130,
      ease: 'Quad.Out',
    })

    if (this.playerHealth <= 0) {
      this.endRun('loss')
    }
  }

  private toggleInventory(): void {
    if (this.isInventoryOpen) {
      this.closeInventory()
      return
    }

    if (this.isCodexOpen) {
      return
    }

    this.openInventory()
  }

  private openInventory(): void {
    this.isInventoryOpen = true
    this.applyInteractionPause(true)
    this.statusMessage = 'Inventory opened. Combat is paused while you inspect and combine.'
    this.updateHud()
  }

  private closeInventory(): void {
    if (!this.isInventoryOpen) {
      return
    }

    this.isInventoryOpen = false
    this.applyInteractionPause(false)
    this.statusMessage = 'Inventory closed. Combat resumed.'
    this.updateHud()
  }

  private applyInteractionPause(shouldPause: boolean): void {
    if (shouldPause) {
      this.player.setVelocity(0, 0)
      this.physics.world.pause()
      this.player.anims.pause()
      for (const enemy of this.enemies) {
        enemy.sprite.anims.pause()
      }
      for (const projectile of this.projectiles) {
        projectile.spinTween?.pause()
      }
    } else {
      this.physics.world.resume()
      this.player.anims.resume()
      for (const enemy of this.enemies) {
        enemy.sprite.anims.resume()
      }
      for (const projectile of this.projectiles) {
        projectile.spinTween?.resume()
      }
    }

    if (this.spawnTimer) {
      this.spawnTimer.paused = shouldPause
    }

    this.freezeCombat(shouldPause)
  }

  private handleRecipeSelection(recipeId: RecipeId): void {
    if (!this.isInventoryOpen) {
      return
    }

    const result = applyRecipeSelectionWorkflow({
      inventory: this.inventory,
      ownedWeaponIds: this.ownedWeaponIds,
    }, recipeId)

    if (result.kind !== 'success') {
      this.statusMessage = result.statusMessage
      this.updateHud()
      return
    }

    this.inventory = result.nextInventory
    this.ownedWeaponIds = result.ownedWeaponIds
    this.activeWeaponId = result.activeWeaponId
    this.statusMessage = result.statusMessage
    this.updateHud()
  }

  private handleWeaponEquip(weaponId: WeaponId): void {
    if (!this.isInventoryOpen) {
      return
    }

    const nextWeaponId = equipOwnedWeapon(this.ownedWeaponIds, this.activeWeaponId, weaponId)
    if (nextWeaponId === this.activeWeaponId) {
      this.statusMessage = `${WEAPON_DEFINITIONS[weaponId].name} is already equipped.`
      this.updateHud()
      return
    }

    this.activeWeaponId = nextWeaponId
    this.statusMessage = `${WEAPON_DEFINITIONS[weaponId].name} equipped.`
    this.updateHud()
  }

  private handleWeaponTune(weaponId: WeaponId): void {
    if (!this.isInventoryOpen) {
      return
    }

    const result = resolveTuningSelection({
      inventory: this.inventory,
      ownedWeaponIds: this.ownedWeaponIds,
      tuningState: this.tuningState,
    }, weaponId)

    if (!result) {
      const reason = getWeaponTuningBlockReason({
        inventory: this.inventory,
        ownedWeaponIds: this.ownedWeaponIds,
        tuningState: this.tuningState,
      }, weaponId)
      this.statusMessage = reason ?? 'That weapon cannot be tuned right now.'
      this.updateHud()
      return
    }

    const effectLabel = getTuningEffectLabel(result.effectId) ?? result.effectId
    this.inventory = result.nextInventory
    this.tuningState = result.nextTuningState
    this.statusMessage = `${WEAPON_DEFINITIONS[weaponId].name} tuned: ${effectLabel}.`
    this.updateHud()
  }

  private freezeCombat(shouldFreeze: boolean): void {
    if (this.enemySpacingCollider) {
      this.enemySpacingCollider.active = !shouldFreeze
    }

    if (!shouldFreeze) {
      return
    }

    for (const enemy of this.enemies) {
      enemy.sprite.setVelocity(0, 0)
    }
  }

  private setPlayerAnimation(isMoving: boolean): void {
    const targetKey = isMoving ? 'player-move' : 'player-idle'
    if (this.player.anims.currentAnim?.key !== targetKey) {
      this.player.play(targetKey)
    }
  }

  private createEnemyHealthBar(sprite: PhysicsSprite, config: EnemyDefinition): EnemyHealthBar {
    const { width, height, offsetY } = getEnemyHealthBarMetrics(config.size)

    const background = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.9)
      .setOrigin(0, 0.5)
      .setDepth(sprite.depth + 2)

    const fill = this.add
      .rectangle(0, 0, width, height, 0xff4d4d, 1)
      .setOrigin(0, 0.5)
      .setDepth(sprite.depth + 3)

    return {
      background,
      fill,
      width,
      height,
      offsetY,
    }
  }

  private syncEnemyHealthBar(enemy: EnemyEntity): void {
    if (!enemy.sprite.active) {
      return
    }

    const { background, fill, width, height, offsetY } = enemy.healthBar
    const left = enemy.sprite.x - width / 2
    const y = enemy.sprite.y - offsetY
    const fillWidth = getEnemyHealthFillWidth(enemy.currentHealth, enemy.config.maxHealth, width)

    background.setPosition(left, y)
    fill.setPosition(left, y)
    fill.setVisible(fillWidth > 0)
    fill.setDisplaySize(fillWidth, height)
  }

  private destroyEnemyHealthBar(enemy: EnemyEntity): void {
    if (enemy.healthBar.background.active) {
      enemy.healthBar.background.destroy()
    }

    if (enemy.healthBar.fill.active) {
      enemy.healthBar.fill.destroy()
    }
  }

  private endRun(outcome: 'win' | 'loss'): void {
    this.spawnTimer?.remove(false)
    this.isInventoryOpen = false
    this.isCodexOpen = false
    this.codex.update(getCodexState(false))
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
      tip: 'WASD move · Auto-fire nearest enemy · Open inventory to swap or combine · Q codex',
      status: this.statusMessage,
      inventoryButtonLabel: 'Inventory unavailable',
      inventoryButtonDisabled: true,
      modal: {
        isOpen: false,
        items: [],
        recipes: [],
        weapons: [],
      },
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
    const weapon = deriveEffectiveWeaponStats(this.activeWeaponId, this.tuningState)
    const actionableRecipes = getActionableRecipes(this.inventory, this.ownedWeaponIds)
    const tuningText = weapon.tuningLabel ? ` · ${weapon.tuningLabel}` : ''

    this.hud.update({
      title: 'NeoD Prototype',
      subtitle: this.activeWaveLabel || 'Preparing arena',
      stats: [
        `Health: ${this.playerHealth}/${this.playerMaxHealth}`,
        `Weapon: ${weapon.name} (${weapon.damage} dmg / ${Math.round(1000 / weapon.fireRateMs)} shots/s${tuningText})`,
        `Enemies alive: ${this.enemies.length}`,
        `Remaining spawns: ${this.remainingSpawns}`,
      ],
      inventory: describeInventoryEntries(this.inventory),
      recipes: describeAvailableRecipes(actionableRecipes),
      objective: this.isBossActive
        ? 'Defeat the Crown Slime to clear the run.'
        : 'Survive the waves, collect drops, and open inventory to combine upgrades.',
      tip: 'WASD move · Auto-fire nearest enemy · Open inventory to combine or swap weapons · Q codex',
      status: this.statusMessage,
      inventoryButtonLabel: this.isInventoryOpen ? 'Resume run' : 'Open inventory',
      inventoryButtonDisabled: this.isCodexOpen,
      modal: {
        isOpen: this.isInventoryOpen,
        items: this.getOwnedItemViews(),
        recipes: this.getRecipeViews(actionableRecipes),
        weapons: this.getOwnedWeaponViews(),
      },
    })
  }

  private updateCodex(): void {
    this.codex.update(getCodexState(this.isCodexOpen))
  }

  private getOwnedItemViews(): HudOwnedItemView[] {
    return (Object.entries(this.inventory) as [LootId, number][]).map(([itemId, count]) => ({
      id: itemId,
      name: ITEM_DEFINITIONS[itemId].name,
      description: ITEM_DEFINITIONS[itemId].description,
      count,
    }))
  }

  private getRecipeViews(recipes: AvailableRecipe[]) {
    return recipes.map(({ recipe, weapon }) => ({
      id: recipe.id,
      name: recipe.name,
      identityLabel: recipe.identityLabel,
      identityHint: recipe.identityHint,
      outputWeaponId: recipe.outputWeaponId,
      outputWeaponName: weapon.name,
      damage: weapon.damage,
      inputs: recipe.inputs.map((itemId) => ITEM_DEFINITIONS[itemId].name),
      outputWeaponHudIconKey: weapon.visual.hudIconKey,
      outputWeaponAccentColor: weapon.visual.accentColor,
    }))
  }

  private getOwnedWeaponViews(): HudOwnedWeaponView[] {
    return this.ownedWeaponIds.map((weaponId) => {
      const ownedWeapon = WEAPON_DEFINITIONS[weaponId]
      const effectiveWeapon = deriveEffectiveWeaponStats(weaponId, this.tuningState)
      const tuningBlockReason = getWeaponTuningBlockReason({
        inventory: this.inventory,
        ownedWeaponIds: this.ownedWeaponIds,
        tuningState: this.tuningState,
      }, weaponId)

      return {
        id: weaponId,
        name: ownedWeapon.name,
        description: ownedWeapon.description,
        damage: effectiveWeapon.damage,
        fireRateMs: effectiveWeapon.fireRateMs,
        projectileSpeed: effectiveWeapon.projectileSpeed,
        isEquipped: weaponId === this.activeWeaponId,
        tuningLabel: effectiveWeapon.tuningLabel ?? null,
        canTune: tuningBlockReason === null,
        tuneDisabledReason: tuningBlockReason,
        hudIconKey: ownedWeapon.visual.hudIconKey,
        accentColor: ownedWeapon.visual.accentColor,
      }
    })
  }
}
