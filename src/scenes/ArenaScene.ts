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
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config.js'
import type { CodexController } from '../ui/Codex.js'
import type { HudController } from '../ui/Hud.js'
import { getCodexState, describeAvailableRecipes, describeInventoryEntries } from '../systems/codex.js'
import { resolveWeightedDrop } from '../systems/drop.js'
import { getEnemyHealthBarMetrics, getEnemyHealthFillWidth } from '../systems/enemyHealthBar.js'
import { addItem } from '../systems/inventory.js'
import {
  advanceHazardState,
  applyProjectileHitState,
  buildAttackPlan,
  collectTargetsInRadius,
  getChainDamage,
  getWeaponIdentityLabel,
  getWeaponSummary,
  isProjectileOutOfBounds,
  shouldWeaponFire,
  selectChainTargets,
} from '../systems/weaponBehaviors.js'
import type { ChainSpec, HazardSpawnSpec, ProjectileSpawnSpec } from '../systems/weaponBehaviors.js'
import {
  applyRecipeSelection,
  equipOwnedWeapon,
  getActionableRecipes,
  seedOwnedWeapons,
} from '../systems/weaponOwnership.js'
import { getWaveByIndex, shouldAdvanceWave } from '../systems/waves.js'

type PhysicsImage = Phaser.Physics.Arcade.Image

interface EnemyHealthBar {
  background: Phaser.GameObjects.Rectangle
  fill: Phaser.GameObjects.Rectangle
  width: number
  height: number
  offsetY: number
}

interface EnemyEntity {
  runtimeId: number
  sprite: PhysicsImage
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
  tint: number
  damage: number
  radius: number
  remainingLifetimeMs: number
  remainingHits: number
  hitEnemyIds: Set<number>
  chain?: ChainSpec
  hazardOnHit?: HazardSpawnSpec
  hazardOnExpire?: HazardSpawnSpec
}

interface HazardZoneEntity {
  visual: Phaser.GameObjects.Arc
  x: number
  y: number
  radius: number
  damage: number
  remainingLifetimeMs: number
  totalLifetimeMs: number
  tickEveryMs: number
  tickCountdownMs: number
}

export class ArenaScene extends Phaser.Scene {
  private hud!: HudController

  private codex!: CodexController

  private player!: PhysicsImage

  private enemySprites!: Phaser.Physics.Arcade.Group

  private enemySpacingCollider?: Phaser.Physics.Arcade.Collider

  private cursors!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>

  private codexKey!: Phaser.Input.Keyboard.Key

  private enemies: EnemyEntity[] = []

  private lootDrops: LootEntity[] = []

  private projectiles: ProjectileEntity[] = []

  private hazardZones: HazardZoneEntity[] = []

  private ownedWeaponIds: WeaponId[] = seedOwnedWeapons()

  private activeWeaponId: WeaponId = 'starter-blaster'

  private inventory: InventoryState = {}

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

  private statusMessage = 'Move with WASD, aim with the mouse, and click to fire.'

  private lastPlayerHitAt = 0

  private nextEnemyRuntimeId = 1

  constructor() {
    super('arena')
  }

  create(): void {
    this.hud = this.game.registry.get('hud') as HudController
    this.codex = this.game.registry.get('codex') as CodexController
    this.hud.setHandlers({
      onInventoryToggle: () => {
        this.toggleInventory()
      },
      onInventoryClose: () => {
        this.closeInventory()
      },
      onRecipeSelect: (recipeId) => {
        this.handleRecipeSelection(recipeId)
      },
      onWeaponEquip: (weaponId) => {
        this.handleWeaponEquip(weaponId)
      },
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

    this.add
      .text(40, GAME_HEIGHT - 36, 'Prototype goal: survive the slime waves and beat the boss', {
        fontSize: '16px',
        color: '#9bb5ff',
      })
      .setDepth(1)

    this.player = this.physics.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player')
    this.player.setCircle(14)
    this.player.setCollideWorldBounds(true)

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
    this.codexKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)

    this.startWave(0)
    this.updateHud()
    this.updateCodex()
  }

  update(time: number, delta: number): void {
    this.handleCodexToggle()
    this.handlePlayerMovement()
    this.handleFiring(time)
    this.updateEnemies()
    this.updateProjectiles(delta)
    this.updateHazards(delta)
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
      return
    }

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
    if (!shouldWeaponFire(this.isInteractionBlocked(), this.input.activePointer.isDown, time, this.nextFireAt)) {
      return
    }

    const weapon = WEAPON_DEFINITIONS[this.activeWeaponId]
    const pointer = this.input.activePointer
    const target = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY)
    const origin = new Phaser.Math.Vector2(this.player.x, this.player.y)
    const attackPlan = buildAttackPlan(weapon, origin, target)
    if (attackPlan.projectiles.length === 0) {
      return
    }

    for (const projectileSpec of attackPlan.projectiles) {
      this.spawnProjectile(projectileSpec)
    }

    this.nextFireAt = time + attackPlan.cooldownMs
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

      this.syncEnemyHealthBar(enemy)
    }
  }

  private updateProjectiles(delta: number): void {
    if (this.isInteractionBlocked()) {
      return
    }

    for (const projectile of this.projectiles) {
      if (!projectile.sprite.active) {
        continue
      }

      projectile.remainingLifetimeMs -= delta
      if (projectile.remainingLifetimeMs <= 0) {
        this.destroyProjectile(projectile, projectile.hazardOnExpire)
        continue
      }

      if (
        isProjectileOutOfBounds(
          {
            x: projectile.sprite.x,
            y: projectile.sprite.y,
          },
          GAME_WIDTH,
          GAME_HEIGHT,
        )
      ) {
        this.destroyProjectile(projectile, projectile.hazardOnExpire)
        continue
      }

      for (const enemy of this.enemies) {
        if (!enemy.sprite.active) {
          continue
        }

        const hitDistance = enemy.config.size / 2 + projectile.radius
        if (
          Phaser.Math.Distance.Between(
            projectile.sprite.x,
            projectile.sprite.y,
            enemy.sprite.x,
            enemy.sprite.y,
          ) <= hitDistance
        ) {
          const hitStep = applyProjectileHitState(
            projectile.hitEnemyIds,
            enemy.runtimeId,
            projectile.remainingHits,
          )
          if (!hitStep.applied) {
            continue
          }

          projectile.hitEnemyIds = hitStep.hitEnemyIds
          projectile.remainingHits = hitStep.remainingHits
          this.damageEnemy(enemy, projectile.damage)

          if (projectile.chain) {
            this.applyChainDamage(enemy, projectile.chain, projectile.damage, projectile.tint)
          }

          if (projectile.hazardOnHit) {
            this.spawnHazardZone(projectile.sprite.x, projectile.sprite.y, projectile.hazardOnHit)
          }

          if (hitStep.destroyed) {
            this.destroyProjectile(projectile)
            break
          }
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
        this.inventory = addItem(this.inventory, loot.itemId)
        this.statusMessage = `Collected ${ITEM_DEFINITIONS[loot.itemId].name}.`
        loot.sprite.destroy()
      }
    }
  }

  private updateHazards(delta: number): void {
    if (this.isInteractionBlocked()) {
      return
    }

    for (const hazard of this.hazardZones) {
      if (!hazard.visual.active) {
        continue
      }

      const hazardStep = advanceHazardState(
        hazard.remainingLifetimeMs,
        hazard.tickCountdownMs,
        delta,
        hazard.tickEveryMs,
      )
      hazard.remainingLifetimeMs = hazardStep.remainingLifetimeMs
      hazard.tickCountdownMs = hazardStep.tickCountdownMs

      for (let tickIndex = 0; tickIndex < hazardStep.ticks; tickIndex += 1) {
        const affectedEnemyIds = new Set(
          collectTargetsInRadius(
            {
              x: hazard.x,
              y: hazard.y,
            },
            hazard.radius,
            this.enemies
              .filter((enemy) => enemy.sprite.active)
              .map((enemy) => ({
                id: enemy.runtimeId,
                x: enemy.sprite.x,
                y: enemy.sprite.y,
                radius: enemy.config.size / 2,
              })),
          ),
        )

        for (const enemy of this.enemies) {
          if (!enemy.sprite.active || !affectedEnemyIds.has(enemy.runtimeId)) {
            continue
          }

          this.damageEnemy(enemy, hazard.damage, {
            ignoreRecentHit: true,
          })
        }
      }

      if (hazardStep.expired) {
        hazard.visual.destroy()
        continue
      }

      hazard.visual.setFillStyle(
        hazard.visual.fillColor,
        Math.max(0.12, 0.3 * (hazard.remainingLifetimeMs / hazard.totalLifetimeMs)),
      )
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
    this.hazardZones = this.hazardZones.filter((hazard) => hazard.visual.active)
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

    const sprite = this.physics.add.image(x, y, config.textureKey)
    sprite.setTint(config.tint)
    sprite.setCircle(config.size / 2)
    sprite.setCollideWorldBounds(true)
    sprite.setBounce(0)
    this.enemySprites.add(sprite)

    const enemy: EnemyEntity = {
      runtimeId: this.nextEnemyRuntimeId,
      sprite,
      config,
      currentHealth: config.maxHealth,
      healthBar: this.createEnemyHealthBar(sprite, config),
      lastHitAt: 0,
    }

    this.nextEnemyRuntimeId += 1
    this.syncEnemyHealthBar(enemy)
    this.enemies.push(enemy)
  }

  private damageEnemy(
    enemy: EnemyEntity,
    damage: number,
    options?: {
      ignoreRecentHit?: boolean
    },
  ): void {
    const now = this.time.now
    if (!options?.ignoreRecentHit && now - enemy.lastHitAt < 50) {
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
    this.player.setTint(0xffa8a8)

    this.time.delayedCall(120, () => {
      this.player.clearTint()
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
    } else {
      this.physics.world.resume()
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

    const result = applyRecipeSelection({
      inventory: this.inventory,
      ownedWeaponIds: this.ownedWeaponIds,
    }, recipeId)

    if (!result) {
      this.statusMessage = 'That combine is no longer actionable. Choose another option.'
      this.updateHud()
      return
    }

    const weapon = WEAPON_DEFINITIONS[result.weaponId]
    this.inventory = result.nextInventory
    this.ownedWeaponIds = result.ownedWeaponIds
    this.activeWeaponId = result.activeWeaponId
    this.statusMessage = `${weapon.name} crafted and equipped. Resume the run when ready.`
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

  private createEnemyHealthBar(sprite: PhysicsImage, config: EnemyDefinition): EnemyHealthBar {
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
    const fillWidth = getEnemyHealthFillWidth(
      enemy.currentHealth,
      enemy.config.maxHealth,
      width,
    )

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
      tip: 'WASD move · Mouse aim · Hold click shoot · Open inventory to swap or combine · Q codex',
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
    const weapon = WEAPON_DEFINITIONS[this.activeWeaponId]
    const actionableRecipes = getActionableRecipes(this.inventory, this.ownedWeaponIds)

    this.hud.update({
      title: 'NeoD Prototype',
      subtitle: this.activeWaveLabel || 'Preparing arena',
      stats: [
        `Health: ${this.playerHealth}/${this.playerMaxHealth}`,
        `Weapon: ${weapon.name} · ${getWeaponSummary(weapon)}`,
        `Enemies alive: ${this.enemies.length}`,
        `Remaining spawns: ${this.remainingSpawns}`,
      ],
      inventory: describeInventoryEntries(this.inventory),
      recipes: describeAvailableRecipes(actionableRecipes),
      objective: this.isBossActive
        ? 'Defeat the Crown Slime to clear the run.'
        : 'Survive the waves, collect drops, and open inventory to combine upgrades.',
      tip: 'WASD move · Mouse aim · Hold click shoot · Open inventory to combine or swap weapons · Q codex',
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
      outputWeaponId: recipe.outputWeaponId,
      outputWeaponName: weapon.name,
      damage: weapon.damage,
      identity: getWeaponIdentityLabel(weapon),
      inputs: recipe.inputs.map((itemId) => ITEM_DEFINITIONS[itemId].name),
    }))
  }

  private getOwnedWeaponViews(): HudOwnedWeaponView[] {
    return this.ownedWeaponIds.map((weaponId) => {
      const ownedWeapon = WEAPON_DEFINITIONS[weaponId]

      return {
        id: weaponId,
        name: ownedWeapon.name,
        description: ownedWeapon.description,
        damage: ownedWeapon.damage,
        identity: getWeaponIdentityLabel(ownedWeapon),
        isEquipped: weaponId === this.activeWeaponId,
      }
    })
  }

  private spawnProjectile(projectileSpec: ProjectileSpawnSpec): void {
    const projectile = this.physics.add.image(this.player.x, this.player.y, 'projectile')
    projectile.setTint(projectileSpec.tint)
    projectile.setCircle(projectileSpec.radius)
    projectile.setVelocity(
      projectileSpec.direction.x * projectileSpec.speed,
      projectileSpec.direction.y * projectileSpec.speed,
    )

    this.projectiles.push({
      sprite: projectile,
      tint: projectileSpec.tint,
      damage: projectileSpec.damage,
      radius: projectileSpec.radius,
      remainingLifetimeMs: projectileSpec.lifetimeMs,
      remainingHits: projectileSpec.maxHits,
      hitEnemyIds: new Set<number>(),
      chain: projectileSpec.chain,
      hazardOnHit: projectileSpec.hazardOnHit,
      hazardOnExpire: projectileSpec.hazardOnExpire,
    })
  }

  private destroyProjectile(projectile: ProjectileEntity, hazard?: HazardSpawnSpec): void {
    if (!projectile.sprite.active) {
      return
    }

    if (hazard) {
      this.spawnHazardZone(projectile.sprite.x, projectile.sprite.y, hazard)
    }

    projectile.sprite.destroy()
  }

  private spawnHazardZone(x: number, y: number, hazard: HazardSpawnSpec): void {
    const visual = this.add
      .circle(x, y, hazard.radius, hazard.tint, 0.3)
      .setStrokeStyle(2, hazard.tint, 0.85)
      .setDepth(0.5)

    this.hazardZones.push({
      visual,
      x,
      y,
      radius: hazard.radius,
      damage: hazard.damage,
      remainingLifetimeMs: hazard.durationMs,
      totalLifetimeMs: hazard.durationMs,
      tickEveryMs: hazard.tickEveryMs,
      tickCountdownMs: hazard.tickEveryMs,
    })
  }

  private applyChainDamage(
    primaryEnemy: EnemyEntity,
    chain: ChainSpec,
    baseDamage: number,
    tint: number,
  ): void {
    const start = {
      x: primaryEnemy.sprite.x,
      y: primaryEnemy.sprite.y,
    }
    const nearbyTargetIds = new Set(
      collectTargetsInRadius(
        start,
        chain.range,
        this.enemies
          .filter((enemy) => enemy.sprite.active && enemy.runtimeId !== primaryEnemy.runtimeId)
          .map((enemy) => ({
            id: enemy.runtimeId,
            x: enemy.sprite.x,
            y: enemy.sprite.y,
            radius: enemy.config.size / 2,
          })),
      ),
    )
    const targetIds = selectChainTargets(
      start,
      this.enemies
        .filter(
          (enemy) =>
            enemy.sprite.active &&
            enemy.runtimeId !== primaryEnemy.runtimeId &&
            nearbyTargetIds.has(enemy.runtimeId),
        )
        .map((enemy) => ({
          id: enemy.runtimeId,
          x: enemy.sprite.x,
          y: enemy.sprite.y,
        })),
      chain.range,
      chain.maxChains,
    )

    let previous = start
    targetIds.forEach((runtimeId, chainIndex) => {
      const target = this.enemies.find((enemy) => enemy.runtimeId === runtimeId && enemy.sprite.active)
      if (!target) {
        return
      }

      this.damageEnemy(target, getChainDamage(baseDamage, chainIndex + 1, chain.falloff))
      this.drawChainArc(previous.x, previous.y, target.sprite.x, target.sprite.y, tint)
      previous = {
        x: target.sprite.x,
        y: target.sprite.y,
      }
    })
  }

  private drawChainArc(startX: number, startY: number, endX: number, endY: number, tint: number): void {
    const bolt = this.add.line(0, 0, startX, startY, endX, endY, tint, 0.9).setOrigin(0, 0)
    bolt.setLineWidth(2, 2)
    bolt.setDepth(1.5)
    this.tweens.add({
      targets: bolt,
      alpha: 0,
      duration: 90,
      onComplete: () => {
        bolt.destroy()
      },
    })
  }
}
