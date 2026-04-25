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
import { getCodexState } from '../systems/codex.js'
import { resolveWeightedDrop } from '../systems/drop.js'
import { getEnemyHealthBarMetrics, getEnemyHealthFillWidth } from '../systems/enemyHealthBar.js'
import {
  equipOwnedWeapon,
  getActionableRecipes,
  seedOwnedWeapons,
} from '../systems/weaponOwnership.js'
import { getWaveByIndex, shouldAdvanceWave } from '../systems/waves.js'
import { describeAvailableRecipes, describeInventoryEntries } from './arena/combineInventoryPresenter.js'
import {
  applyLootPickup,
  applyRecipeSelectionWorkflow,
} from './arena/combineInventoryWorkflow.js'

type PhysicsImage = Phaser.Physics.Arcade.Image

interface EnemyHealthBar {
  background: Phaser.GameObjects.Rectangle
  fill: Phaser.GameObjects.Rectangle
  width: number
  height: number
  offsetY: number
}

interface EnemyEntity {
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
  damage: number
}

export class ArenaScene extends Phaser.Scene {
  private hud!: HudController

  private codex!: CodexController

  private player!: PhysicsImage

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

  private statusMessage = 'WASD로 이동하고, 마우스로 조준한 뒤, 클릭으로 사격하세요.'

  private lastPlayerHitAt = 0

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
      .text(40, GAME_HEIGHT - 36, '프로토타입 목표: 슬라임 웨이브를 버티고 보스를 쓰러뜨리기', {
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
      ? '현장 코덱스를 열었습니다. 공유 데이터를 보는 동안 전투가 일시정지됩니다.'
      : '현장 코덱스를 닫았습니다. 전투를 다시 진행합니다.'
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
    if (this.isInteractionBlocked() || !this.input.activePointer.isDown || time < this.nextFireAt) {
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
    this.statusMessage = `${wave.label} 시작.`

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

    this.statusMessage = `${enemy.config.name} 처치. 드롭을 계속 모으세요.`
  }

  private damagePlayer(damage: number): void {
    const now = this.time.now
    if (now - this.lastPlayerHitAt < 450 || this.isInteractionBlocked()) {
      return
    }

    this.lastPlayerHitAt = now
    this.playerHealth = Math.max(0, this.playerHealth - damage)
    this.statusMessage = `${damage} 피해를 입었습니다. 계속 움직이세요.`
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
    this.statusMessage = '인벤토리를 열었습니다. 확인하고 조합하는 동안 전투가 일시정지됩니다.'
    this.updateHud()
  }

  private closeInventory(): void {
    if (!this.isInventoryOpen) {
      return
    }

    this.isInventoryOpen = false
    this.applyInteractionPause(false)
    this.statusMessage = '인벤토리를 닫았습니다. 전투를 다시 진행합니다.'
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
      this.statusMessage = `${WEAPON_DEFINITIONS[weaponId].name}는 이미 장착 중입니다.`
      this.updateHud()
      return
    }

    this.activeWeaponId = nextWeaponId
    this.statusMessage = `${WEAPON_DEFINITIONS[weaponId].name} 장착 완료.`
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

  private createEnemyHealthBar(
    sprite: PhysicsImage,
    config: EnemyDefinition,
  ): EnemyHealthBar {
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
      title: outcome === 'win' ? '런 완료' : '런 실패',
      subtitle:
        outcome === 'win'
          ? '보스를 처치했습니다. R 키를 눌러 다시 플레이하세요.'
          : '슬라임 무리가 플레이어를 압도했습니다.',
      stats: [],
      inventory: [],
      recipes: [],
      objective: '결과 화면에서 R 키를 눌러 다시 시작하세요.',
      tip: 'WASD 이동 · 마우스 조준 · 클릭 유지 사격 · I 인벤토리 · Q 코덱스',
      status: this.statusMessage,
      inventoryButtonLabel: '인벤토리 사용 불가',
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
      title: 'NeoD 프로토타입',
      subtitle: this.activeWaveLabel || '전장 준비 중',
      stats: [
        `체력: ${this.playerHealth}/${this.playerMaxHealth}`,
        `무기: ${weapon.name} (피해 ${weapon.damage} / 초당 ${Math.round(1000 / weapon.fireRateMs)}발)`,
        `생존 적 수: ${this.enemies.length}`,
        `남은 등장 수: ${this.remainingSpawns}`,
      ],
      inventory: describeInventoryEntries(this.inventory),
      recipes: describeAvailableRecipes(actionableRecipes),
      objective: this.isBossActive
        ? '크라운 슬라임을 쓰러뜨려 런을 클리어하세요.'
        : '웨이브를 버티고, 드롭을 모아, 인벤토리에서 조합해 강화하세요.',
      tip: 'WASD 이동 · 마우스 조준 · 클릭 유지 사격 · I 인벤토리 · Q 코덱스',
      status: this.statusMessage,
      inventoryButtonLabel: this.isInventoryOpen ? '런 재개' : '인벤토리 열기',
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
        isEquipped: weaponId === this.activeWeaponId,
      }
    })
  }
}
