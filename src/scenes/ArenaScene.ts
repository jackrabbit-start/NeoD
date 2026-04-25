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
import {
  ENEMY_CONTACT_PADDING,
  PLAYER_COLLISION_RADIUS,
  PROJECTILE_HIT_PADDING,
} from '../game/combatGeometry.js'
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config.js'
import type { CodexController } from '../ui/Codex.js'
import type { HudController } from '../ui/Hud.js'
import { getCodexState } from '../systems/codex.js'
import { resolveWeightedDrop } from '../systems/drop.js'
import {
  advanceEnemyCooldown,
  createEnemySpreadBurstProjectiles,
  createEnemyRuntimeState,
  createEnemyTelegraph,
  getDistanceBetween,
  isPointInsideCircle,
  resolveEnemyVelocityStep,
  shouldEnemyStartSpreadBurst,
  shouldEnemyStartTelegraph,
  type EnemyRuntimeState,
} from '../systems/enemyBehaviors.js'
import {
  advanceEnemyProjectileState,
  createEnemyProjectileState,
  type EnemyProjectileSpawnSpec,
  type EnemyProjectileState,
} from '../systems/enemyProjectiles.js'
import { getEnemyHealthBarMetrics, getEnemyHealthFillWidth } from '../systems/enemyHealthBar.js'
import {
  getLootAttractionStep,
  getLootPickupPhase,
  LOOT_COLLECT_RADIUS,
} from '../systems/lootPickup.js'
import {
  createMapLayout,
  selectHeartItemSpawnPoint,
  selectEnemySpawnPoint,
  type MapLayout,
} from '../systems/mapLayout.js'
import {
  HEART_PICKUP_COLOR,
  HEART_PICKUP_HEAL_AMOUNT,
  HEART_PICKUP_TEXTURE_KEY,
  getHealedPlayerHealth,
  getInitialHeartPickupSpawnAt,
  getNextHeartPickupSpawnAt,
  shouldSpawnHeartPickup,
} from '../systems/healthPickups.js'
import {
  getTopRightMiniMapBounds,
  projectWorldPointToMiniMap,
  projectWorldRectToMiniMap,
  type MiniMapBounds,
} from '../systems/minimap.js'
import { getPlayerHealthBarMetrics, getPlayerHealthFillWidth } from '../systems/playerHealthBar.js'
import { resolvePlayerMovementStep, type MovementVector } from '../systems/playerMovement.js'
import {
  canStartPlayerDash,
  createReadyPlayerDashState,
  isPlayerDashActive,
  isPlayerDashInvulnerable,
  PLAYER_DASH_SPEED,
  resolvePlayerDashDirection,
  startPlayerDash,
  type PlayerDashState,
} from '../systems/playerDash.js'
import { createRunResultHudState, type RunOutcome, type RunResultPayload } from '../systems/runResult.js'
import { createInitialArenaRunState } from '../systems/runState.js'
import {
  advanceKnockbackState,
  clearKnockbackForTelegraph,
  combineMovementWithKnockback,
  resolveKnockbackHit,
  type KnockbackState,
} from '../systems/knockback.js'
import { shouldApplyPlayerDamage } from '../systems/playerDamageRules.js'
import {
  advanceHazardState,
  applyProjectileHitState,
  buildAttackPlan,
  collectTargetsInCleave,
  collectTargetsInRadius,
  getChainDamage,
  getWeaponAttackRange,
  getWeaponSummary,
  isAttackPlanActionable,
  isPointWithinRadius,
  isProjectileOutOfBounds,
  resolveProjectileRangeStep,
  selectChainTargets,
} from '../systems/weaponBehaviors.js'
import type { ChainSpec, HazardSpawnSpec, MeleeSwingSpec, Point, ProjectileSpawnSpec } from '../systems/weaponBehaviors.js'
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
} from '../systems/weaponOwnership.js'
import { getSkippedRegularWaveCount, getStageSelectionViews } from '../systems/stageSelection.js'
import { getDefeatedEnemyRunOutcome, getWaveByIndex, shouldAdvanceWave } from '../systems/waves.js'
import { resolveAutoAttackShot } from './arena/autoAttack.js'
import { describeAvailableRecipes, describeInventoryEntries } from './arena/combineInventoryPresenter.js'
import {
  applyLootPickup,
  applyRecipeSelectionWorkflow,
} from './arena/combineInventoryWorkflow.js'
import {
  createWaveAdvancePlan,
  setSpawnLoopPaused,
  startWaveRuntime,
  type WaveStatePatch,
} from './arena/waveRuntime.js'

type PhysicsImage = Phaser.Physics.Arcade.Image
type PhysicsSprite = Phaser.Physics.Arcade.Sprite

interface EnemyHealthBar {
  background: Phaser.GameObjects.Rectangle
  fill: Phaser.GameObjects.Rectangle
  width: number
  height: number
  offsetY: number
}

interface PlayerHealthBar {
  background: Phaser.GameObjects.Rectangle
  fill: Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
  width: number
  height: number
}

interface MiniMapDisplay {
  graphics: Phaser.GameObjects.Graphics
  label: Phaser.GameObjects.Text
  bounds: MiniMapBounds
}

interface ViewportSize {
  width: number
  height: number
}

interface EnemyTelegraph {
  visual: Phaser.GameObjects.Arc
  x: number
  y: number
  radius: number
  damage: number
  remainingMs: number
  totalMs: number
}

interface EnemySpreadBurstCharge {
  visual: Phaser.GameObjects.Graphics
  projectiles: EnemyProjectileSpawnSpec[]
  remainingMs: number
  totalMs: number
}

interface EnemyEntity {
  runtimeId: number
  sprite: PhysicsSprite
  config: EnemyDefinition
  runtimeState: EnemyRuntimeState
  currentHealth: number
  healthBar: EnemyHealthBar
  lastHitAt: number
  attackCooldownMs: number
  knockback?: KnockbackState
  telegraph?: EnemyTelegraph
  spreadBurst?: EnemySpreadBurstCharge
}

interface LootEntity {
  sprite: PhysicsImage
  itemId: LootId
  aura: Phaser.GameObjects.Arc
  auraTween: Phaser.Tweens.Tween
  isAttracting: boolean
}

interface HealthPickupEntity {
  sprite: PhysicsImage
  aura: Phaser.GameObjects.Arc
  auraTween: Phaser.Tweens.Tween
  isAttracting: boolean
}

interface ProjectileEntity {
  sprite: PhysicsImage
  tint: number
  damage: number
  radius: number
  remainingLifetimeMs: number
  remainingHits: number
  hitEnemyIds: Set<number>
  origin: Point
  direction: ProjectileSpawnSpec['direction']
  maxTravelDistance: number
  knockback: ProjectileSpawnSpec['knockback']
  chain?: ChainSpec
  hazardOnHit?: HazardSpawnSpec
  hazardOnExpire?: HazardSpawnSpec
}

interface EnemyProjectileEntity extends EnemyProjectileState {
  sprite: PhysicsImage
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

const MINI_MAP_SYNC_INTERVAL_MS = 100

interface ArenaSceneStartData {
  startWaveIndex?: number
}

export class ArenaScene extends Phaser.Scene {
  private hud!: HudController

  private codex!: CodexController

  private player!: PhysicsSprite

  private playerHealthBar?: PlayerHealthBar

  private enemySprites!: Phaser.Physics.Arcade.Group

  private enemySpacingCollider?: Phaser.Physics.Arcade.Collider

  private mapVisuals: Phaser.GameObjects.GameObject[] = []

  private miniMap?: MiniMapDisplay

  private nextMiniMapSyncAt = 0

  private readonly mapLayout: MapLayout = createMapLayout()

  private cursors!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>

  private inventoryKey!: Phaser.Input.Keyboard.Key

  private codexKey!: Phaser.Input.Keyboard.Key

  private dashKey!: Phaser.Input.Keyboard.Key

  private enemies: EnemyEntity[] = []

  private lootDrops: LootEntity[] = []

  private healthPickups: HealthPickupEntity[] = []

  private nextHeartPickupAt = 0

  private projectiles: ProjectileEntity[] = []

  private enemyProjectiles: EnemyProjectileEntity[] = []

  private hazardZones: HazardZoneEntity[] = []

  private ownedWeaponIds: WeaponId[] = []

  private activeWeaponId: WeaponId = 'starter-blaster'

  private inventory: InventoryState = {}

  private tuningState: WeaponTuningState = {}

  private isInventoryOpen = false

  private isCodexOpen = false

  private isStageSelectOpen = false

  private isRunEnding = false

  private playerHealth = 100

  private playerMaxHealth = 100

  private playerSpeed = 220

  private playerDashState: PlayerDashState = createReadyPlayerDashState()

  private playerDashDirection = new Phaser.Math.Vector2(1, 0)

  private lastPlayerMoveDirection = new Phaser.Math.Vector2(1, 0)

  private nextFireAt = 0

  private remainingSpawns = 0

  private currentWaveIndex = 0

  private activeWaveLabel = ''

  private wavesCleared = 0

  private spawnTimer?: Phaser.Time.TimerEvent

  private isBossActive = false

  private statusMessage = 'WASD로 이동하고 J 대시로 회피하는 동안 무기가 자동으로 발사됩니다.'

  private lastPlayerHitAt = 0

  private nextEnemyRuntimeId = 1

  constructor() {
    super('arena')
  }

  create(data: ArenaSceneStartData = {}): void {
    this.resetRunState()
    const startWaveIndex = this.resolveStartWaveIndex(data.startWaveIndex)

    this.hud = this.game.registry.get('hud') as HudController
    this.codex = this.game.registry.get('codex') as CodexController
    this.hud.setHandlers({
      onInventoryToggle: () => this.toggleInventory(),
      onInventoryClose: () => this.closeInventory(),
      onRecipeSelect: (recipeId) => this.handleRecipeSelection(recipeId),
      onWeaponEquip: (weaponId) => this.handleWeaponEquip(weaponId),
      onWeaponTune: (weaponId) => this.handleWeaponTune(weaponId),
      onStageSelectionToggle: () => this.toggleStageSelection(),
      onStageSelectionClose: () => this.closeStageSelection(),
      onStageSelect: (stageIndex) => this.handleStageSelection(stageIndex),
    })

    this.cameras.main.setBackgroundColor('#07111f')
    const { worldBounds, playerStart } = this.mapLayout
    this.physics.world.setBounds(
      worldBounds.x,
      worldBounds.y,
      worldBounds.width,
      worldBounds.height,
    )
    this.cameras.main.setBounds(
      worldBounds.x,
      worldBounds.y,
      worldBounds.width,
      worldBounds.height,
    )
    this.createMapVisuals()

    this.player = this.physics.add.sprite(playerStart.x, playerStart.y, 'player')
    this.player.setCircle(PLAYER_COLLISION_RADIUS)
    this.player.setCollideWorldBounds(true)
    this.player.play('player-idle')
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09)
    this.playerHealthBar = this.createPlayerHealthBar()
    this.syncPlayerHealthBar()

    this.enemySprites = this.physics.add.group()
    this.enemySpacingCollider = this.physics.add.collider(this.enemySprites, this.enemySprites)
    this.createMiniMap()
    this.seedAmbientLoot()
    this.nextHeartPickupAt = getInitialHeartPickupSpawnAt(this.time.now)

    const keyboard = this.input.keyboard
    if (!keyboard) {
      throw new Error('NeoD에는 키보드 입력이 필요합니다.')
    }

    this.cursors = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>
    this.inventoryKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I)
    this.codexKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)
    this.dashKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J)
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize, this)
    })

    this.wavesCleared = getSkippedRegularWaveCount(startWaveIndex)
    this.startWave(startWaveIndex)
    this.syncMiniMap(this.time.now, true)
    this.updateHud()
    this.updateCodex()
  }

  update(time: number, delta: number): void {
    if (this.isRunEnding) {
      return
    }

    this.handleInventoryToggle()
    this.handleCodexToggle()
    this.handlePlayerMovement(time, delta)
    this.handleFiring(time)
    this.updateEnemies(delta)
    if (this.isRunEnding) {
      return
    }

    this.updateProjectiles(delta)
    if (this.isRunEnding) {
      return
    }

    this.updateEnemyProjectiles(delta)
    if (this.isRunEnding) {
      return
    }

    this.updateLootDrops(delta)
    this.updateHealthPickups(time, delta)
    this.updateHazards(delta)
    if (this.isRunEnding) {
      return
    }

    this.cleanupDestroyedEntities()
    this.syncMiniMap(time)

    if (!this.isInteractionBlocked() && shouldAdvanceWave(this.remainingSpawns, this.enemies.length)) {
      this.advanceWave()
    }

    this.updateHud()
    this.updateCodex()
  }

  private isInteractionBlocked(): boolean {
    return this.isInventoryOpen || this.isCodexOpen || this.isStageSelectOpen
  }

  private resolveStartWaveIndex(startWaveIndex?: number): number {
    if (startWaveIndex === undefined || !Number.isInteger(startWaveIndex)) {
      return 0
    }

    return getWaveByIndex(startWaveIndex) ? startWaveIndex : 0
  }

  private getViewportSize(): ViewportSize {
    return {
      width: Math.max(1, Math.round(this.scale.gameSize.width || GAME_WIDTH)),
      height: Math.max(1, Math.round(this.scale.gameSize.height || GAME_HEIGHT)),
    }
  }

  private handleScaleResize(): void {
    if (!this.playerHealthBar || !this.miniMap) {
      return
    }

    this.destroyPlayerHealthBar()
    this.playerHealthBar = this.createPlayerHealthBar()
    this.syncPlayerHealthBar()

    this.destroyMiniMap()
    this.createMiniMap()
    this.syncMiniMap()
  }

  private createMapVisuals(): void {
    const { worldBounds } = this.mapLayout
    const arena = this.add.rectangle(
      worldBounds.x + worldBounds.width / 2,
      worldBounds.y + worldBounds.height / 2,
      worldBounds.width,
      worldBounds.height,
      0x0d1d33,
      1,
    )
    arena.setStrokeStyle(3, 0x214266, 0.9)
    arena.setDepth(-20)
    this.mapVisuals.push(arena)

    const grid = this.add.graphics()
    grid.lineStyle(1, 0x173150, 0.28)
    for (let x = worldBounds.x; x <= worldBounds.x + worldBounds.width; x += 160) {
      grid.lineBetween(x, worldBounds.y, x, worldBounds.y + worldBounds.height)
    }
    for (let y = worldBounds.y; y <= worldBounds.y + worldBounds.height; y += 135) {
      grid.lineBetween(worldBounds.x, y, worldBounds.x + worldBounds.width, y)
    }
    grid.setDepth(-19)
    this.mapVisuals.push(grid)
  }

  private seedAmbientLoot(): void {
    for (const spawn of this.mapLayout.ambientItemSpawns) {
      this.spawnLootDrop(spawn.x, spawn.y, spawn.itemId)
    }
  }

  private createMiniMap(): void {
    const { width } = this.getViewportSize()
    const bounds = getTopRightMiniMapBounds(width)
    const graphics = this.add
      .graphics()
      .setDepth(48)
      .setScrollFactor(0)

    const label = this.add
      .text(bounds.x + bounds.padding, bounds.y + 4, 'MAP', {
        color: '#dbeafe',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '10px',
        fontStyle: '700',
      })
      .setDepth(49)
      .setScrollFactor(0)
      .setShadow(0, 1, '#020713', 2)

    this.miniMap = {
      graphics,
      label,
      bounds,
    }
  }

  private syncMiniMap(time = this.time.now, force = false): void {
    if (!this.miniMap || !this.player?.active) {
      return
    }

    if (!force && time < this.nextMiniMapSyncAt) {
      return
    }
    this.nextMiniMapSyncAt = time + MINI_MAP_SYNC_INTERVAL_MS

    const { graphics, bounds } = this.miniMap
    const { worldBounds } = this.mapLayout
    graphics.clear()
    graphics.fillStyle(0x020713, 0.72)
    graphics.fillRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 10)
    graphics.lineStyle(1, 0x93c5fd, 0.52)
    graphics.strokeRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 10)

    const viewport = projectWorldRectToMiniMap(
      {
        x: this.cameras.main.worldView.x,
        y: this.cameras.main.worldView.y,
        width: this.cameras.main.worldView.width,
        height: this.cameras.main.worldView.height,
      },
      worldBounds,
      bounds,
    )
    graphics.lineStyle(1, 0xffffff, 0.46)
    graphics.strokeRect(viewport.x, viewport.y, viewport.width, viewport.height)

    for (const loot of this.lootDrops) {
      if (!loot.sprite.active) {
        continue
      }
      const dot = projectWorldPointToMiniMap(loot.sprite, worldBounds, bounds)
      graphics.fillStyle(ITEM_DEFINITIONS[loot.itemId].color, 0.82)
      graphics.fillCircle(dot.x, dot.y, 1.9)
    }

    for (const pickup of this.healthPickups) {
      if (!pickup.sprite.active) {
        continue
      }
      const dot = projectWorldPointToMiniMap(pickup.sprite, worldBounds, bounds)
      graphics.fillStyle(HEART_PICKUP_COLOR, 0.95)
      graphics.fillCircle(dot.x, dot.y, 2.4)
    }

    for (const enemy of this.enemies) {
      if (!enemy.sprite.active) {
        continue
      }
      const dot = projectWorldPointToMiniMap(enemy.sprite, worldBounds, bounds)
      graphics.fillStyle(enemy.config.tint, 0.9)
      graphics.fillCircle(dot.x, dot.y, enemy.config.id === 'slime-boss' ? 3.3 : 2.2)
    }

    const playerDot = projectWorldPointToMiniMap(this.player, worldBounds, bounds)
    graphics.fillStyle(0x66d9ef, 1)
    graphics.fillCircle(playerDot.x, playerDot.y, 3)
    graphics.lineStyle(1, 0xffffff, 0.9)
    graphics.strokeCircle(playerDot.x, playerDot.y, 3.8)
  }

  private handleInventoryToggle(): void {
    if (!Phaser.Input.Keyboard.JustDown(this.inventoryKey)) {
      return
    }

    this.toggleInventory()
  }

  private handleCodexToggle(): void {
    if (!Phaser.Input.Keyboard.JustDown(this.codexKey) || this.isInventoryOpen || this.isStageSelectOpen) {
      return
    }

    this.isCodexOpen = !this.isCodexOpen
    this.applyInteractionPause(this.isCodexOpen)
    this.statusMessage = this.isCodexOpen
      ? '현장 코덱스가 열렸습니다. 공유 데이터를 살펴보는 동안 전투가 일시정지됩니다.'
      : '현장 코덱스가 닫혔습니다. 전투가 재개됩니다.'
    this.updateCodex()
    this.updateHud()
  }

  private handlePlayerMovement(time: number, delta: number): void {
    if (this.isInteractionBlocked()) {
      this.player.setVelocity(0, 0)
      this.setPlayerAnimation(false)
      this.syncPlayerMotionPose({ x: 0, y: 0 }, false)
      return
    }

    const rawInput = {
      x: Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown),
      y: Number(this.cursors.down.isDown) - Number(this.cursors.up.isDown),
    }
    const currentVelocity = this.getPlayerBodyVelocity()
    const movementStep = resolvePlayerMovementStep(
      rawInput,
      currentVelocity,
      this.playerSpeed,
      delta,
    )

    if (movementStep.isInputActive) {
      this.lastPlayerMoveDirection.set(movementStep.normalizedInput.x, movementStep.normalizedInput.y)
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.dashKey) &&
      canStartPlayerDash(time, this.playerDashState, false)
    ) {
      const dashDirection = resolvePlayerDashDirection(
        movementStep.normalizedInput,
        this.lastPlayerMoveDirection,
      )
      this.playerDashDirection.set(dashDirection.x, dashDirection.y)
      this.playerDashState = startPlayerDash(time)
      this.statusMessage = 'J 대시! 짧은 무적 시간으로 보스 예고 공격을 피하세요.'
    }

    if (isPlayerDashActive(time, this.playerDashState)) {
      const dashVelocity = {
        x: this.playerDashDirection.x * PLAYER_DASH_SPEED,
        y: this.playerDashDirection.y * PLAYER_DASH_SPEED,
      }
      this.player.setVelocity(dashVelocity.x, dashVelocity.y)
      this.setPlayerAnimation(true)
      this.syncPlayerMotionPose(dashVelocity, true)
      return
    }

    this.player.setVelocity(movementStep.velocity.x, movementStep.velocity.y)
    this.setPlayerAnimation(movementStep.isMoving)
    this.syncPlayerMotionPose(movementStep.velocity, movementStep.isMoving)
  }

  private handleFiring(time: number): void {
    const weapon = deriveEffectiveWeaponStats(this.activeWeaponId, this.tuningState)
    const weaponRange = getWeaponAttackRange(weapon)
    const target = resolveAutoAttackShot(
      {
        x: this.player.x,
        y: this.player.y,
      },
      this.enemies.map((enemy) => ({
        x: enemy.sprite.x,
        y: enemy.sprite.y,
        radius: enemy.config.size / 2,
        isActive: enemy.sprite.active,
      })),
      {
        isInteractionBlocked: this.isInteractionBlocked(),
        time,
        nextFireAt: this.nextFireAt,
        maxRange: weaponRange,
      },
    )

    if (!target) {
      return
    }

    const origin = new Phaser.Math.Vector2(this.player.x, this.player.y)
    const attackPlan = buildAttackPlan(weapon, origin, new Phaser.Math.Vector2(target.x, target.y))
    if (!isAttackPlanActionable(attackPlan)) {
      return
    }

    for (const projectileSpec of attackPlan.projectiles) {
      this.spawnProjectile(projectileSpec, weapon.projectileTextureKey)
    }

    for (const meleeSwing of attackPlan.meleeSwings) {
      this.applyMeleeSwing(meleeSwing)
    }

    this.nextFireAt = time + attackPlan.cooldownMs
    this.tweens.add({
      targets: this.player,
      scaleX: 0.94,
      scaleY: 1.06,
      duration: 70,
      yoyo: true,
    })
  }

  private updateEnemies(delta: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.sprite.active) {
        continue
      }

      if (this.isInteractionBlocked()) {
        enemy.sprite.setVelocity(0, 0)
        this.syncEnemyHealthBar(enemy)
        continue
      }

      enemy.attackCooldownMs = advanceEnemyCooldown(enemy.attackCooldownMs, delta)

      if (enemy.telegraph) {
        enemy.knockback = clearKnockbackForTelegraph()
        enemy.telegraph.remainingMs -= delta
        enemy.telegraph.visual.setFillStyle(
          enemy.telegraph.visual.fillColor,
          Math.max(0.18, 0.42 * (enemy.telegraph.remainingMs / enemy.telegraph.totalMs)),
        )

        if (enemy.telegraph.remainingMs <= 0) {
          if (
            isPointInsideCircle(
              { x: this.player.x, y: this.player.y },
              { x: enemy.telegraph.x, y: enemy.telegraph.y },
              enemy.telegraph.radius,
            )
          ) {
            this.damagePlayer(enemy.telegraph.damage)
            if (this.isRunEnding) {
              return
            }
          }

          enemy.telegraph.visual.destroy()
          enemy.telegraph = undefined
          if (enemy.config.attackBehavior.kind === 'telegraphed-aoe') {
            enemy.attackCooldownMs = enemy.config.attackBehavior.cooldownMs
          }
        }

        enemy.sprite.setVelocity(0, 0)
        this.syncEnemyHealthBar(enemy)
        continue
      }

      if (enemy.spreadBurst) {
        enemy.knockback = clearKnockbackForTelegraph()
        enemy.spreadBurst.remainingMs -= delta
        enemy.spreadBurst.visual.setAlpha(
          Math.max(0.2, 0.86 * (1 - enemy.spreadBurst.remainingMs / enemy.spreadBurst.totalMs)),
        )

        if (enemy.spreadBurst.remainingMs <= 0) {
          for (const projectileSpec of enemy.spreadBurst.projectiles) {
            this.spawnEnemyProjectile(
              { x: enemy.sprite.x, y: enemy.sprite.y },
              projectileSpec,
            )
          }

          enemy.spreadBurst.visual.destroy()
          enemy.spreadBurst = undefined
          if (enemy.config.attackBehavior.kind === 'spread-burst') {
            enemy.attackCooldownMs = enemy.config.attackBehavior.cooldownMs
          }
        }

        enemy.sprite.setVelocity(0, 0)
        this.syncEnemyHealthBar(enemy)
        continue
      }

      const distanceToPlayer = getDistanceBetween(
        { x: enemy.sprite.x, y: enemy.sprite.y },
        { x: this.player.x, y: this.player.y },
      )

      if (
        shouldEnemyStartTelegraph(
          enemy.config.attackBehavior,
          distanceToPlayer,
          enemy.attackCooldownMs,
        )
      ) {
        const telegraphSpec = createEnemyTelegraph(
          { x: enemy.sprite.x, y: enemy.sprite.y },
          { x: this.player.x, y: this.player.y },
          enemy.config.attackBehavior,
        )

        if (telegraphSpec) {
          const visual = this.add
            .circle(telegraphSpec.x, telegraphSpec.y, telegraphSpec.radius, telegraphSpec.tint, 0.25)
            .setStrokeStyle(2, telegraphSpec.tint, 0.9)
            .setDepth(0.5)

          enemy.telegraph = {
            visual,
            x: telegraphSpec.x,
            y: telegraphSpec.y,
            radius: telegraphSpec.radius,
            damage: telegraphSpec.damage,
            remainingMs: telegraphSpec.durationMs,
            totalMs: telegraphSpec.durationMs,
          }
          enemy.knockback = clearKnockbackForTelegraph()
          enemy.sprite.setVelocity(0, 0)
          this.syncEnemyHealthBar(enemy)
          continue
        }
      }

      const attackBehavior = enemy.config.attackBehavior
      if (
        attackBehavior.kind === 'spread-burst' &&
        shouldEnemyStartSpreadBurst(
          attackBehavior,
          distanceToPlayer,
          enemy.attackCooldownMs,
        )
      ) {
        const projectiles = createEnemySpreadBurstProjectiles(
          { x: enemy.sprite.x, y: enemy.sprite.y },
          { x: this.player.x, y: this.player.y },
          attackBehavior,
        )

        if (projectiles.length > 0) {
          enemy.spreadBurst = {
            visual: this.createSpreadBurstWarning(enemy, projectiles),
            projectiles,
            remainingMs: attackBehavior.windupMs,
            totalMs: attackBehavior.windupMs,
          }
          enemy.knockback = clearKnockbackForTelegraph()
          enemy.sprite.setVelocity(0, 0)
          this.syncEnemyHealthBar(enemy)
          continue
        }
      }

      const movementStep = resolveEnemyVelocityStep(
        { x: enemy.sprite.x, y: enemy.sprite.y },
        { x: this.player.x, y: this.player.y },
        enemy.config.speed,
        enemy.config.movementBehavior,
        enemy.runtimeState,
        this.time.now,
      )
      enemy.runtimeState = movementStep.runtimeState
      const knockbackStep = advanceKnockbackState(enemy.knockback, delta)
      enemy.knockback = knockbackStep.state
      const nextVelocity = combineMovementWithKnockback(movementStep.velocity, knockbackStep.velocity)
      enemy.sprite.setVelocity(nextVelocity.x, nextVelocity.y)
      enemy.sprite.play(enemy.config.animationKey, true)

      const touchingPlayer = distanceToPlayer < enemy.config.size / 2 + ENEMY_CONTACT_PADDING
      if (touchingPlayer) {
        this.damagePlayer(enemy.config.contactDamage)
        if (this.isRunEnding) {
          return
        }
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

      const rangeStep = resolveProjectileRangeStep(
        projectile.origin,
        { x: projectile.sprite.x, y: projectile.sprite.y },
        projectile.maxTravelDistance,
      )
      const didExpireAtRange = rangeStep.expired
      if (rangeStep.expired) {
        projectile.sprite.setPosition(rangeStep.point.x, rangeStep.point.y)
      }

      projectile.remainingLifetimeMs -= delta
      if (projectile.remainingLifetimeMs <= 0) {
        this.destroyProjectile(projectile, projectile.hazardOnExpire)
        continue
      }

      if (
        isProjectileOutOfBounds(
          { x: projectile.sprite.x, y: projectile.sprite.y },
          this.mapLayout.worldBounds,
        )
      ) {
        this.destroyProjectile(projectile, projectile.hazardOnExpire)
        continue
      }

      for (const enemy of this.enemies) {
        if (!enemy.sprite.active) {
          continue
        }

        const hitDistance = enemy.config.size / 2 + Math.max(projectile.radius, PROJECTILE_HIT_PADDING)
        if (
          isPointWithinRadius(
            { x: projectile.sprite.x, y: projectile.sprite.y },
            { x: enemy.sprite.x, y: enemy.sprite.y },
            hitDistance,
          )
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
          const didDamage = this.damageEnemy(enemy, projectile.damage)
          if (this.isRunEnding) {
            return
          }

          if (didDamage && enemy.sprite.active) {
            this.applyDirectProjectileKnockback(enemy, projectile)
          }

          if (projectile.chain) {
            this.applyChainDamage(enemy, projectile.chain, projectile.damage)
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

      if (didExpireAtRange && projectile.sprite.active) {
        this.destroyProjectile(projectile, projectile.hazardOnExpire)
      }
    }
  }

  private createSpreadBurstWarning(
    enemy: EnemyEntity,
    projectiles: EnemyProjectileSpawnSpec[],
  ): Phaser.GameObjects.Graphics {
    const behavior = enemy.config.attackBehavior
    const range =
      behavior.kind === 'spread-burst'
        ? Math.min(
            behavior.range,
            behavior.projectileSpeed * (behavior.projectileLifetimeMs / 1000),
          )
        : 140
    const visual = this.add.graphics().setDepth(0.65)
    visual.lineStyle(2, enemy.config.tint, 0.82)

    for (const projectile of projectiles) {
      visual.lineBetween(
        enemy.sprite.x,
        enemy.sprite.y,
        enemy.sprite.x + projectile.direction.x * range,
        enemy.sprite.y + projectile.direction.y * range,
      )
    }

    visual.fillStyle(enemy.config.tint, 0.12)
    visual.fillCircle(enemy.sprite.x, enemy.sprite.y, enemy.config.size * 0.62)
    visual.setAlpha(0.28)
    return visual
  }

  private updateEnemyProjectiles(delta: number): void {
    if (this.isInteractionBlocked()) {
      return
    }

    for (const projectile of this.enemyProjectiles) {
      if (!projectile.sprite.active) {
        continue
      }

      const step = advanceEnemyProjectileState(
        projectile,
        delta,
        { width: GAME_WIDTH, height: GAME_HEIGHT },
        { x: this.player.x, y: this.player.y, radius: PLAYER_COLLISION_RADIUS },
      )

      projectile.x = step.projectile.x
      projectile.y = step.projectile.y
      projectile.remainingLifetimeMs = step.projectile.remainingLifetimeMs
      projectile.sprite.setPosition(projectile.x, projectile.y)

      if (step.hitPlayer) {
        this.damagePlayer(projectile.damage)
        this.destroyEnemyProjectile(projectile)
        if (this.isRunEnding) {
          return
        }
        continue
      }

      if (step.destroyed) {
        this.destroyEnemyProjectile(projectile)
      }
    }
  }

  private spawnEnemyProjectile(origin: { x: number; y: number }, spec: EnemyProjectileSpawnSpec): void {
    const projectileState = createEnemyProjectileState(origin, spec)
    const projectile = this.physics.add.image(origin.x, origin.y, spec.textureKey)
    projectile.setTint(spec.tint)
    projectile.setCircle(spec.radius)
    projectile.setDepth(4)
    projectile.setRotation(Math.atan2(spec.direction.y, spec.direction.x))

    this.enemyProjectiles.push({
      ...projectileState,
      sprite: projectile,
    })
  }

  private destroyEnemyProjectile(projectile: EnemyProjectileEntity): void {
    if (projectile.sprite.active) {
      projectile.sprite.destroy()
    }
  }

  private updateLootDrops(delta: number): void {
    if (this.isInteractionBlocked()) {
      return
    }

    for (const loot of this.lootDrops) {
      if (!loot.sprite.active) {
        this.destroyLootDrop(loot)
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        loot.sprite.x,
        loot.sprite.y,
        this.player.x,
        this.player.y,
      )
      const pickupPhase = getLootPickupPhase(distance)

      if (pickupPhase === 'collect') {
        const pickupResult = applyLootPickup(this.inventory, loot.itemId)
        this.inventory = pickupResult.nextInventory
        this.statusMessage = pickupResult.statusMessage
        this.destroyLootDrop(loot)
        continue
      }

      if (pickupPhase === 'attract') {
        this.applyLootAttraction(loot, distance, delta)
        continue
      }

      this.setLootAttractionStyle(loot, false)
      this.syncLootAura(loot)
    }
  }

  private updateHealthPickups(time: number, delta: number): void {
    if (this.isInteractionBlocked()) {
      return
    }

    const activePickups = this.healthPickups.filter((pickup) => pickup.sprite.active).length
    if (shouldSpawnHeartPickup(time, this.nextHeartPickupAt, activePickups)) {
      this.spawnHeartPickup()
      this.nextHeartPickupAt = getNextHeartPickupSpawnAt(time)
    }

    for (const pickup of this.healthPickups) {
      if (!pickup.sprite.active) {
        this.destroyHealthPickup(pickup)
        continue
      }

      const distance = Phaser.Math.Distance.Between(
        pickup.sprite.x,
        pickup.sprite.y,
        this.player.x,
        this.player.y,
      )
      const pickupPhase = getLootPickupPhase(distance)

      if (pickupPhase === 'collect') {
        this.collectHeartPickup(pickup)
        continue
      }

      if (pickupPhase === 'attract') {
        this.applyHealthPickupAttraction(pickup, distance, delta)
        continue
      }

      this.setHealthPickupAttractionStyle(pickup, false)
      this.syncHealthPickupAura(pickup)
    }
  }

  private applyLootAttraction(loot: LootEntity, distance: number, delta: number): void {
    this.setLootAttractionStyle(loot, true)

    const attractionStep = getLootAttractionStep(distance, delta)
    const travelDistance = Math.min(attractionStep, Math.max(0, distance - LOOT_COLLECT_RADIUS))
    if (distance <= 0 || travelDistance <= 0) {
      this.syncLootAura(loot)
      return
    }

    const travelRatio = travelDistance / distance
    loot.sprite.setPosition(
      loot.sprite.x + (this.player.x - loot.sprite.x) * travelRatio,
      loot.sprite.y + (this.player.y - loot.sprite.y) * travelRatio,
    )
    this.syncLootAura(loot)
  }

  private setLootAttractionStyle(loot: LootEntity, isAttracting: boolean): void {
    if (loot.isAttracting === isAttracting) {
      return
    }

    loot.isAttracting = isAttracting
    const itemColor = ITEM_DEFINITIONS[loot.itemId].color

    if (isAttracting) {
      loot.sprite.setScale(1.18)
      loot.sprite.setTint(0xffffff)
      loot.aura.setStrokeStyle(3, 0xffffff, 0.95)
      return
    }

    loot.sprite.setScale(1.08)
    loot.sprite.clearTint()
    loot.aura.setStrokeStyle(2, itemColor, 0.78)
  }

  private applyHealthPickupAttraction(pickup: HealthPickupEntity, distance: number, delta: number): void {
    this.setHealthPickupAttractionStyle(pickup, true)

    const attractionStep = getLootAttractionStep(distance, delta)
    const travelDistance = Math.min(attractionStep, Math.max(0, distance - LOOT_COLLECT_RADIUS))
    if (distance <= 0 || travelDistance <= 0) {
      this.syncHealthPickupAura(pickup)
      return
    }

    const travelRatio = travelDistance / distance
    pickup.sprite.setPosition(
      pickup.sprite.x + (this.player.x - pickup.sprite.x) * travelRatio,
      pickup.sprite.y + (this.player.y - pickup.sprite.y) * travelRatio,
    )
    this.syncHealthPickupAura(pickup)
  }

  private setHealthPickupAttractionStyle(pickup: HealthPickupEntity, isAttracting: boolean): void {
    if (pickup.isAttracting === isAttracting) {
      return
    }

    pickup.isAttracting = isAttracting

    if (isAttracting) {
      pickup.sprite.setScale(1.2)
      pickup.sprite.setTint(0xffffff)
      pickup.aura.setStrokeStyle(3, 0xffffff, 0.95)
      return
    }

    pickup.sprite.setScale(1.08)
    pickup.sprite.clearTint()
    pickup.aura.setStrokeStyle(2, HEART_PICKUP_COLOR, 0.82)
  }

  private syncLootAura(loot: LootEntity): void {
    if (loot.aura.active) {
      loot.aura.setPosition(loot.sprite.x, loot.sprite.y)
    }
  }

  private syncHealthPickupAura(pickup: HealthPickupEntity): void {
    if (pickup.aura.active) {
      pickup.aura.setPosition(pickup.sprite.x, pickup.sprite.y)
    }
  }

  private destroyLootDrop(loot: LootEntity): void {
    loot.auraTween.stop()

    if (loot.aura.active) {
      loot.aura.destroy()
    }

    if (loot.sprite.active) {
      loot.sprite.destroy()
    }
  }

  private collectHeartPickup(pickup: HealthPickupEntity): void {
    const previousHealth = this.playerHealth
    this.playerHealth = getHealedPlayerHealth(
      this.playerHealth,
      this.playerMaxHealth,
      HEART_PICKUP_HEAL_AMOUNT,
    )
    this.syncPlayerHealthBar()
    const healedAmount = this.playerHealth - previousHealth
    this.statusMessage = healedAmount > 0
      ? `하트 아이템으로 체력 ${healedAmount} 회복.`
      : '체력이 이미 가득합니다.'
    this.destroyHealthPickup(pickup)
  }

  private destroyHealthPickup(pickup: HealthPickupEntity): void {
    pickup.auraTween.stop()

    if (pickup.aura.active) {
      pickup.aura.destroy()
    }

    if (pickup.sprite.active) {
      pickup.sprite.destroy()
    }
  }

  private spawnLootDrop(x: number, y: number, itemId: LootId): void {
    const itemDefinition = ITEM_DEFINITIONS[itemId]
    const aura = this.add.circle(x, y, 16, itemDefinition.color, 0.18)
    aura.setStrokeStyle(2, itemDefinition.color, 0.78)
    aura.setBlendMode(Phaser.BlendModes.ADD)
    aura.setDepth(3)
    const auraTween = this.tweens.add({
      targets: aura,
      scale: { from: 0.88, to: 1.18 },
      alpha: { from: 0.48, to: 0.86 },
      duration: 720,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })

    const loot = this.physics.add.image(x, y, itemDefinition.textureKey)
    loot.setCircle(10)
    loot.setDepth(4)
    loot.setScale(1.08)
    this.lootDrops.push({
      sprite: loot,
      itemId,
      aura,
      auraTween,
      isAttracting: false,
    })
  }

  private spawnHeartPickup(): void {
    const spawn = selectHeartItemSpawnPoint(this.mapLayout.heartItemSpawns, Math.random)
    if (!spawn) {
      return
    }

    const aura = this.add.circle(spawn.x, spawn.y, 18, HEART_PICKUP_COLOR, 0.2)
    aura.setStrokeStyle(2, HEART_PICKUP_COLOR, 0.82)
    aura.setBlendMode(Phaser.BlendModes.ADD)
    aura.setDepth(3)
    const auraTween = this.tweens.add({
      targets: aura,
      scale: { from: 0.86, to: 1.22 },
      alpha: { from: 0.5, to: 0.9 },
      duration: 680,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })

    const sprite = this.physics.add.image(spawn.x, spawn.y, HEART_PICKUP_TEXTURE_KEY)
    sprite.setCircle(11)
    sprite.setDepth(4)
    sprite.setScale(1.08)
    this.healthPickups.push({
      sprite,
      aura,
      auraTween,
      isAttracting: false,
    })
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
            { x: hazard.x, y: hazard.y },
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
          if (this.isRunEnding) {
            return
          }
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
    for (const loot of this.lootDrops) {
      if (!loot.sprite.active) {
        this.destroyLootDrop(loot)
      }
    }
    this.lootDrops = this.lootDrops.filter((loot) => loot.sprite.active)
    for (const pickup of this.healthPickups) {
      if (!pickup.sprite.active) {
        this.destroyHealthPickup(pickup)
      }
    }
    this.healthPickups = this.healthPickups.filter((pickup) => pickup.sprite.active)
    this.projectiles = this.projectiles.filter((projectile) => projectile.sprite.active)
    this.enemyProjectiles = this.enemyProjectiles.filter((projectile) => projectile.sprite.active)
    this.hazardZones = this.hazardZones.filter((hazard) => hazard.visual.active)
  }

  private startWave(index: number): void {
    startWaveRuntime(index, {
      applyState: (patch) => this.applyWaveStatePatch(patch),
      clearSpawnLoop: () => {
        this.spawnTimer?.remove(false)
        this.spawnTimer = undefined
      },
      scheduleSpawnLoop: ({ delayMs, repeat, onTick }) => {
        this.spawnTimer = this.time.addEvent({
          delay: delayMs,
          repeat,
          callback: onTick,
        })
      },
      spawnEnemy: (enemyId) => this.spawnEnemy(enemyId),
    })
  }

  private advanceWave(): void {
    const advancePlan = createWaveAdvancePlan(this.currentWaveIndex)
    if (!advancePlan) {
      return
    }

    if (advancePlan.shouldIncrementWavesCleared) {
      this.wavesCleared += 1
    }

    this.startWave(advancePlan.nextWaveIndex)
  }

  private spawnEnemy(enemyId: EnemyDefinition['id']): void {
    const config = ENEMY_DEFINITIONS[enemyId]
    const spawnPoint = selectEnemySpawnPoint(
      { x: this.player.x, y: this.player.y },
      this.mapLayout.worldBounds,
      this.mapLayout.obstacles,
      Math.random,
      config.size / 2,
    )

    const sprite = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, config.textureKey)
    sprite.setCircle(config.size / 2)
    sprite.setCollideWorldBounds(true)
    sprite.setBounce(0)
    sprite.play(config.animationKey)
    this.enemySprites.add(sprite)

    const enemy: EnemyEntity = {
      runtimeId: this.nextEnemyRuntimeId,
      sprite,
      config,
      runtimeState: createEnemyRuntimeState(config.movementBehavior),
      currentHealth: config.maxHealth,
      healthBar: this.createEnemyHealthBar(sprite, config),
      lastHitAt: 0,
      attackCooldownMs: 'cooldownMs' in config.attackBehavior
        ? Math.round(config.attackBehavior.cooldownMs * 0.35)
        : 0,
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
  ): boolean {
    const now = this.time.now
    if (!options?.ignoreRecentHit && now - enemy.lastHitAt < 50) {
      return false
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
      return true
    }

    if (enemy.config.drops) {
      const droppedItem = resolveWeightedDrop(enemy.config.drops)
      if (droppedItem) {
        this.spawnLootDrop(enemy.sprite.x, enemy.sprite.y, droppedItem)
      }
    }

    const defeatOutcome = getDefeatedEnemyRunOutcome(enemy.config.id)
    if (enemy.telegraph?.visual.active) {
      enemy.telegraph.visual.destroy()
      enemy.telegraph = undefined
    }
    if (enemy.spreadBurst?.visual.active) {
      enemy.spreadBurst.visual.destroy()
      enemy.spreadBurst = undefined
    }
    enemy.knockback = undefined
    this.destroyEnemyHealthBar(enemy)
    enemy.sprite.destroy()

    if (defeatOutcome === 'win') {
      this.endRun('win')
      return true
    }

    this.statusMessage = `${enemy.config.name} 처치. 드롭을 계속 모으세요.`
    return true
  }

  private damagePlayer(damage: number): void {
    const now = this.time.now
    if (
      !shouldApplyPlayerDamage(
        now,
        this.lastPlayerHitAt,
        this.isInteractionBlocked(),
        isPlayerDashInvulnerable(now, this.playerDashState),
      )
    ) {
      return
    }

    this.lastPlayerHitAt = now
    this.playerHealth = Math.max(0, this.playerHealth - damage)
    this.syncPlayerHealthBar()
    this.statusMessage = `플레이어가 ${damage} 피해를 받았습니다. 계속 움직이세요.`
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

    if (this.isCodexOpen || this.isStageSelectOpen) {
      return
    }

    this.openInventory()
  }

  private openInventory(): void {
    this.isInventoryOpen = true
    this.applyInteractionPause(true)
    this.statusMessage = '인벤토리가 열렸습니다. 살펴보고 조합하는 동안 전투가 일시정지됩니다.'
    this.updateHud()
  }

  private closeInventory(): void {
    if (!this.isInventoryOpen) {
      return
    }

    this.isInventoryOpen = false
    this.applyInteractionPause(false)
    this.statusMessage = '인벤토리가 닫혔습니다. 전투가 재개됩니다.'
    this.updateHud()
  }

  private toggleStageSelection(): void {
    if (this.isStageSelectOpen) {
      this.closeStageSelection()
      return
    }

    this.openStageSelection()
  }

  private openStageSelection(): void {
    if (this.isInventoryOpen || this.isCodexOpen || this.isRunEnding) {
      return
    }

    this.isStageSelectOpen = true
    this.applyInteractionPause(true)
    this.statusMessage = '스테이지 선택이 열렸습니다. 시작할 웨이브를 고르면 런이 새로 시작됩니다.'
    this.updateHud()
  }

  private closeStageSelection(): void {
    if (!this.isStageSelectOpen) {
      return
    }

    this.isStageSelectOpen = false
    this.applyInteractionPause(false)
    this.statusMessage = '스테이지 선택을 닫았습니다. 전투가 재개됩니다.'
    this.updateHud()
  }

  private handleStageSelection(stageIndex: number): void {
    if (!this.isStageSelectOpen || this.isRunEnding || !getWaveByIndex(stageIndex)) {
      return
    }

    this.isStageSelectOpen = false
    this.applyInteractionPause(false)
    this.scene.restart({ startWaveIndex: stageIndex })
  }

  private applyInteractionPause(shouldPause: boolean): void {
    if (shouldPause) {
      this.player.setVelocity(0, 0)
      this.physics.world.pause()
      this.player.anims.pause()
      for (const enemy of this.enemies) {
        enemy.sprite.anims.pause()
      }
    } else {
      this.physics.world.resume()
      this.player.anims.resume()
      for (const enemy of this.enemies) {
        enemy.sprite.anims.resume()
      }
    }

    setSpawnLoopPaused(this.spawnTimer, shouldPause)
    this.setLootPulsePaused(shouldPause)
    this.setHealthPickupPulsePaused(shouldPause)

    this.freezeCombat(shouldPause)
  }

  private setLootPulsePaused(shouldPause: boolean): void {
    for (const loot of this.lootDrops) {
      if (shouldPause) {
        loot.auraTween.pause()
        continue
      }

      loot.auraTween.resume()
    }
  }

  private setHealthPickupPulsePaused(shouldPause: boolean): void {
    for (const pickup of this.healthPickups) {
      if (shouldPause) {
        pickup.auraTween.pause()
        continue
      }

      pickup.auraTween.resume()
    }
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
      this.statusMessage = `${WEAPON_DEFINITIONS[weaponId].name}은 이미 장착 중입니다.`
      this.updateHud()
      return
    }

    this.activeWeaponId = nextWeaponId
    this.statusMessage = `${WEAPON_DEFINITIONS[weaponId].name} 장착 완료.`
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
      this.statusMessage = reason ?? '지금은 해당 무기를 튜닝할 수 없습니다.'
      this.updateHud()
      return
    }

    const effectLabel = getTuningEffectLabel(result.effectId) ?? result.effectId
    this.inventory = result.nextInventory
    this.tuningState = result.nextTuningState
    this.statusMessage = `${WEAPON_DEFINITIONS[weaponId].name} 튜닝 완료: ${effectLabel}.`
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
      if (enemy.sprite.active) {
        enemy.sprite.setVelocity(0, 0)
      }
    }
  }

  private getPlayerBodyVelocity(): MovementVector {
    const body = this.player.body as Phaser.Physics.Arcade.Body | null
    if (!body) {
      return { x: 0, y: 0 }
    }

    return { x: body.velocity.x, y: body.velocity.y }
  }

  private syncPlayerMotionPose(velocity: MovementVector, isMoving: boolean): void {
    if (isMoving && Math.abs(velocity.x) > 1) {
      this.player.setFlipX(velocity.x < 0)
    }

    const speedRatio = Math.min(Math.hypot(velocity.x, velocity.y) / Math.max(this.playerSpeed, 1), 1)
    const targetAngle = isMoving
      ? Phaser.Math.Clamp(velocity.x / Math.max(this.playerSpeed, 1), -1, 1) * 5
      : 0
    const targetScaleX = isMoving ? 1 + speedRatio * 0.04 : 1
    const targetScaleY = isMoving ? 1 - speedRatio * 0.03 : 1

    this.player.setAngle(Phaser.Math.Linear(this.player.angle, targetAngle, 0.24))
    this.player.setScale(
      Phaser.Math.Linear(this.player.scaleX, targetScaleX, 0.18),
      Phaser.Math.Linear(this.player.scaleY, targetScaleY, 0.18),
    )
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

  private createPlayerHealthBar(): PlayerHealthBar {
    const viewport = this.getViewportSize()
    const { x, y, width, height } = getPlayerHealthBarMetrics(viewport.width, viewport.height)
    const depth = 30

    const background = this.add
      .rectangle(x, y, width, height, 0x020713, 0.68)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x9cb5ff, 0.36)
      .setDepth(depth)
      .setScrollFactor(0)

    const fill = this.add
      .rectangle(x + 2, y, width - 4, height - 4, 0x43ef9a, 0.92)
      .setOrigin(0, 0.5)
      .setDepth(depth + 1)
      .setScrollFactor(0)

    const label = this.add
      .text(viewport.width / 2, y - 1, '', {
        color: '#f7fbff',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '10px',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setDepth(depth + 2)
      .setScrollFactor(0)
      .setShadow(0, 1, '#020713', 2)

    return {
      background,
      fill,
      label,
      width,
      height,
    }
  }

  private syncPlayerHealthBar(): void {
    if (!this.playerHealthBar) {
      return
    }

    const { fill, label, width, height } = this.playerHealthBar
    const fillAreaWidth = width - 4
    const fillWidth = getPlayerHealthFillWidth(this.playerHealth, this.playerMaxHealth, fillAreaWidth)
    const healthRatio = this.playerMaxHealth > 0 ? this.playerHealth / this.playerMaxHealth : 0
    const fillColor = healthRatio <= 0.3 ? 0xff5c6c : healthRatio <= 0.6 ? 0xffd166 : 0x43ef9a

    fill.setFillStyle(fillColor, 0.92)
    fill.setVisible(fillWidth > 0)
    fill.setDisplaySize(fillWidth, height - 4)
    label.setText(`HP ${this.playerHealth}/${this.playerMaxHealth}`)
  }

  private destroyPlayerHealthBar(): void {
    if (!this.playerHealthBar) {
      return
    }

    const { background, fill, label } = this.playerHealthBar
    if (background.active) {
      background.destroy()
    }
    if (fill.active) {
      fill.destroy()
    }
    if (label.active) {
      label.destroy()
    }

    this.playerHealthBar = undefined
  }

  private destroyMiniMap(): void {
    if (!this.miniMap) {
      return
    }

    const { graphics, label } = this.miniMap
    if (graphics.active) {
      graphics.destroy()
    }
    if (label.active) {
      label.destroy()
    }

    this.miniMap = undefined
  }

  private resetRunState(): void {
    this.destroyRunEntities()
    this.physics.world.resume()

    const initialState = createInitialArenaRunState()
    this.ownedWeaponIds = initialState.ownedWeaponIds
    this.activeWeaponId = initialState.activeWeaponId
    this.inventory = initialState.inventory
    this.tuningState = initialState.tuningState
    this.isInventoryOpen = initialState.isInventoryOpen
    this.isCodexOpen = initialState.isCodexOpen
    this.isStageSelectOpen = false
    this.isRunEnding = initialState.isRunEnding
    this.playerHealth = initialState.playerHealth
    this.playerMaxHealth = initialState.playerMaxHealth
    this.playerSpeed = initialState.playerSpeed
    this.playerDashState = createReadyPlayerDashState()
    this.playerDashDirection.set(1, 0)
    this.lastPlayerMoveDirection.set(1, 0)
    this.nextFireAt = initialState.nextFireAt
    this.remainingSpawns = initialState.remainingSpawns
    this.currentWaveIndex = initialState.currentWaveIndex
    this.activeWaveLabel = initialState.activeWaveLabel
    this.wavesCleared = initialState.wavesCleared
    this.isBossActive = initialState.isBossActive
    this.statusMessage = initialState.statusMessage
    this.lastPlayerHitAt = initialState.lastPlayerHitAt
    this.nextEnemyRuntimeId = initialState.nextEnemyRuntimeId
    this.nextHeartPickupAt = 0
  }

  private destroyRunEntities(): void {
    this.spawnTimer?.remove(false)
    this.spawnTimer = undefined
    this.enemySpacingCollider?.destroy()
    this.enemySpacingCollider = undefined
    this.destroyPlayerHealthBar()
    this.destroyMiniMap()

    if (this.player?.active) {
      this.player.destroy()
    }

    for (const enemy of this.enemies) {
      if (enemy.telegraph?.visual.active) {
        enemy.telegraph.visual.destroy()
      }
      if (enemy.spreadBurst?.visual.active) {
        enemy.spreadBurst.visual.destroy()
      }
      this.destroyEnemyHealthBar(enemy)
      if (enemy.sprite.active) {
        enemy.sprite.destroy()
      }
    }

    for (const loot of this.lootDrops) {
      this.destroyLootDrop(loot)
    }

    for (const pickup of this.healthPickups) {
      this.destroyHealthPickup(pickup)
    }

    for (const projectile of this.projectiles) {
      if (projectile.sprite.active) {
        projectile.sprite.destroy()
      }
    }

    for (const projectile of this.enemyProjectiles) {
      if (projectile.sprite.active) {
        projectile.sprite.destroy()
      }
    }

    for (const hazard of this.hazardZones) {
      if (hazard.visual.active) {
        hazard.visual.destroy()
      }
    }

    if (this.enemySprites) {
      this.enemySprites.clear(true, true)
    }

    for (const visual of this.mapVisuals) {
      if ('active' in visual && visual.active) {
        visual.destroy()
      }
    }

    this.enemies = []
    this.lootDrops = []
    this.healthPickups = []
    this.projectiles = []
    this.enemyProjectiles = []
    this.hazardZones = []
    this.mapVisuals = []
  }

  private endRun(outcome: RunOutcome): void {
    if (this.isRunEnding) {
      return
    }

    this.isRunEnding = true
    this.spawnTimer?.remove(false)
    this.spawnTimer = undefined
    this.isInventoryOpen = false
    this.isCodexOpen = false
    this.isStageSelectOpen = false
    this.codex.update(getCodexState(false))
    this.physics.world.pause()
    this.freezeCombat(true)
    const payload = this.createResultPayload(outcome)
    this.hud.update(createRunResultHudState(payload))
    this.scene.start('result', payload)
  }

  private createResultPayload(outcome: RunOutcome): RunResultPayload {
    return {
      outcome,
      weaponName: WEAPON_DEFINITIONS[this.activeWeaponId].name,
      wavesCleared: this.wavesCleared,
    }
  }

  private updateHud(): void {
    const weapon = deriveEffectiveWeaponStats(this.activeWeaponId, this.tuningState)
    const actionableRecipes = getActionableRecipes(this.inventory, this.ownedWeaponIds)
    const tuningText = weapon.tuningLabel ? ` · ${weapon.tuningLabel}` : ''

    this.hud.update({
      title: 'NeoD',
      subtitle: this.activeWaveLabel || '슬라임 아레나 대기 중',
      stats: [
        `체력: ${this.playerHealth}/${this.playerMaxHealth}`,
        `무기: ${weapon.name} · ${getWeaponSummary(weapon)}${tuningText}`,
        `생존한 적: ${this.enemies.length}`,
        `남은 출현: ${this.remainingSpawns}`,
      ],
      inventory: describeInventoryEntries(this.inventory),
      recipes: describeAvailableRecipes(actionableRecipes),
      objective: this.isBossActive
        ? '크라운 슬라임을 격파하고 네온 아레나를 장악하세요.'
        : '웨이브를 돌파하며 드롭을 모아 새로운 무기를 완성하세요.',
      tip: 'WASD 이동 · J 대시/짧은 무적 · 가장 가까운 적 자동 사격 · 예고 공격 회피 · 인벤토리 조합/무기 교체 · Q 코덱스 · 스테이지 선택 버튼',
      status: this.statusMessage,
      inventoryButtonLabel: this.isInventoryOpen ? '런 재개' : '인벤토리 열기',
      inventoryButtonDisabled: this.isCodexOpen || this.isStageSelectOpen,
      stageButtonLabel: this.isStageSelectOpen ? '선택 닫기' : '스테이지 선택',
      stageButtonDisabled: this.isInventoryOpen || this.isCodexOpen || this.isRunEnding,
      stageSelection: {
        isOpen: this.isStageSelectOpen,
        stages: getStageSelectionViews(this.currentWaveIndex),
      },
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

  private applyWaveStatePatch({
    currentWaveIndex,
    activeWaveLabel,
    remainingSpawns,
    statusMessage,
    isBossActive,
  }: WaveStatePatch): void {
    if (currentWaveIndex !== undefined) {
      this.currentWaveIndex = currentWaveIndex
    }

    if (activeWaveLabel !== undefined) {
      this.activeWaveLabel = activeWaveLabel
    }

    if (remainingSpawns !== undefined) {
      this.remainingSpawns = remainingSpawns
    }

    if (statusMessage !== undefined) {
      this.statusMessage = statusMessage
    }

    if (isBossActive !== undefined) {
      this.isBossActive = isBossActive
    }
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

  private spawnProjectile(projectileSpec: ProjectileSpawnSpec, textureKey: string): void {
    const projectile = this.physics.add.image(this.player.x, this.player.y, textureKey)
    projectile.setTint(projectileSpec.tint)
    projectile.setCircle(projectileSpec.radius)
    projectile.setRotation(Math.atan2(projectileSpec.direction.y, projectileSpec.direction.x))
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
      origin: { x: this.player.x, y: this.player.y },
      direction: projectileSpec.direction,
      maxTravelDistance: projectileSpec.maxTravelDistance,
      knockback: projectileSpec.knockback,
      chain: projectileSpec.chain,
      hazardOnHit: projectileSpec.hazardOnHit,
      hazardOnExpire: projectileSpec.hazardOnExpire,
    })
  }

  private applyMeleeSwing(swing: MeleeSwingSpec): void {
    const affectedEnemyIds = new Set(
      collectTargetsInCleave(
        { x: this.player.x, y: this.player.y },
        swing.direction,
        swing.range,
        swing.arcDegrees,
        this.enemies
          .filter((enemy) => enemy.sprite.active)
          .map((enemy) => ({
            id: enemy.runtimeId,
            x: enemy.sprite.x,
            y: enemy.sprite.y,
            radius: enemy.config.size / 2,
          })),
        swing.maxTargets,
      ),
    )

    this.spawnMeleeSwingVisual(swing)

    for (const enemy of this.enemies) {
      if (!enemy.sprite.active || !affectedEnemyIds.has(enemy.runtimeId)) {
        continue
      }

      const didDamage = this.damageEnemy(enemy, swing.damage)
      if (didDamage && enemy.sprite.active) {
        this.applyMeleeSwingKnockback(enemy, swing)
      }
    }
  }

  private spawnMeleeSwingVisual(swing: MeleeSwingSpec): void {
    const graphics = this.add.graphics({ x: this.player.x, y: this.player.y })
    const halfArcRadians = (swing.arcDegrees * Math.PI) / 360

    graphics.fillStyle(swing.tint, 0.28)
    graphics.lineStyle(3, swing.tint, 0.65)
    graphics.beginPath()
    graphics.moveTo(0, 0)
    graphics.slice(0, 0, swing.range, -halfArcRadians, halfArcRadians, false)
    graphics.closePath()
    graphics.fillPath()
    graphics.strokePath()
    graphics.setRotation(Math.atan2(swing.direction.y, swing.direction.x))
    graphics.setDepth(0.7)

    this.tweens.add({
      targets: graphics,
      alpha: 0,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: swing.visualDurationMs,
      onComplete: () => graphics.destroy(),
    })
  }

  private applyDirectProjectileKnockback(enemy: EnemyEntity, projectile: ProjectileEntity): void {
    const result = resolveKnockbackHit({
      source: 'direct-projectile',
      direction: projectile.direction,
      weapon: projectile.knockback,
      enemy: enemy.config.knockback,
      activeState: enemy.knockback,
      targetIsTelegraphing: Boolean(enemy.telegraph),
      hitTimeMs: this.time.now,
    })

    enemy.knockback = result.state
  }

  private applyMeleeSwingKnockback(enemy: EnemyEntity, swing: MeleeSwingSpec): void {
    const result = resolveKnockbackHit({
      source: 'melee-swing',
      direction: {
        x: enemy.sprite.x - this.player.x,
        y: enemy.sprite.y - this.player.y,
      },
      fallbackDirection: swing.direction,
      weapon: swing.knockback,
      enemy: enemy.config.knockback,
      activeState: enemy.knockback,
      targetIsTelegraphing: Boolean(enemy.telegraph),
      hitTimeMs: this.time.now,
    })

    enemy.knockback = result.state
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
    const visual = this.add.circle(x, y, hazard.radius, hazard.tint, 0.3).setDepth(0.4)

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
  ): void {
    const nearbyTargetIds = selectChainTargets(
      {
        x: primaryEnemy.sprite.x,
        y: primaryEnemy.sprite.y,
      },
      this.enemies
        .filter((enemy) => enemy.sprite.active && enemy.runtimeId !== primaryEnemy.runtimeId)
        .map((enemy) => ({
          id: enemy.runtimeId,
          x: enemy.sprite.x,
          y: enemy.sprite.y,
        })),
      chain.range,
      chain.maxChains,
    )

    for (let chainIndex = 0; chainIndex < nearbyTargetIds.length; chainIndex += 1) {
      const runtimeId = nearbyTargetIds[chainIndex]
      const target = this.enemies.find((enemy) => enemy.runtimeId === runtimeId && enemy.sprite.active)
      if (!target) {
        continue
      }

      this.damageEnemy(target, getChainDamage(baseDamage, chainIndex + 1, chain.falloff))
      if (this.isRunEnding) {
        return
      }
    }
  }
}
