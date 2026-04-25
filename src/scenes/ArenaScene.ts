import Phaser from 'phaser'
import { ENEMY_DEFINITIONS } from '../data/enemies.js'
import { WEAPON_DEFINITIONS } from '../data/weapons.js'
import type {
  EnemyDefinition,
  HudOwnedWeaponView,
  RunEndReason,
  WeaponStack,
  WeaponStackKey,
} from '../domain/types.js'
import {
  ENEMY_CONTACT_PADDING,
  PLAYER_COLLISION_RADIUS,
  PROJECTILE_HIT_PADDING,
  type RectBounds,
} from '../game/combatGeometry.js'
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config.js'
import type { CodexController } from '../ui/Codex.js'
import type { HudController } from '../ui/Hud.js'
import { GAMEPLAY_CONTROL_TIP, GAME_TITLE } from '../ui/controlCopy.js'
import { getCodexState } from '../systems/codex.js'
import {
  advanceEnemyCooldown,
  createEnemyLineBeam,
  createEnemyRadialBurstProjectiles,
  createEnemySpreadBurstProjectiles,
  createEnemyRuntimeState,
  createEnemyTelegraph,
  getDistanceBetween,
  isPointInsideCircle,
  isPointInsideLineBeam,
  resolveEnemyVelocityStep,
  shouldEnemyStartLineBeam,
  shouldEnemyStartRadialBurst,
  shouldEnemyStartSpreadBurst,
  shouldEnemyStartTelegraph,
  type EnemyLineBeamSpec,
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
import {
  getPlayerExperienceFillWidth,
  getPlayerHealthBarMetrics,
  getPlayerHealthFillWidth,
} from '../systems/playerHealthBar.js'
import {
  applyEnemyPlayerXp,
  getPlayerProgressionView,
  type PlayerProgressionResult,
  type PlayerProgressionState,
} from '../systems/playerProgression.js'
import { getPlayerLevelCombatStats } from '../systems/playerScaling.js'
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
import {
  PACHINKO_SLOT_COUNT,
  applyEnemyPachinkoTokenProgress,
  buildPachinkoSlotRewards,
  canLaunchPachinkoToken,
  getPachinkoRewardTableSeed,
  getPachinkoRewardLevel,
  getPachinkoWeaponSynergySummary,
  getTokenXpForEnemy,
  resolvePachinkoSlotIndex,
  resolvePachinkoSlotReward,
  shouldEnemyGrantPachinkoToken,
} from '../systems/pachinkoRewards.js'
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
  resolveEquippedWeaponPresentation,
  resolveEquippedWeaponTextureRefresh,
  resolveWeaponPresentationFacing,
} from '../systems/weaponPresentation.js'
import { deriveEffectiveWeaponStats } from '../systems/tuning.js'
import {
  addWeaponStackWithAutoFusion,
  equipWeaponStack,
  formatWeaponStarLabel,
  getStackKey,
  getWeaponIdFromStackKey,
  parseWeaponStackKey,
  sortWeaponStacks,
} from '../systems/weaponOwnership.js'
import { getStageSelectionStartElapsedMs, getStageSelectionViews } from '../systems/stageSelection.js'
import { getDefeatedEnemyRunOutcome } from '../systems/waves.js'
import {
  formatRunTime,
  getRunEnemySpawnChanceRows,
  getRunPhaseByElapsedMs,
  getRunStageIndex,
  getRunStageReachedLabel,
  isFinaleActive as isRunFinaleActive,
  RUN_DURATION_MS,
} from '../systems/runProgression.js'
import { resolveAutoAttackShot } from './arena/autoAttack.js'
import {
  advanceRunProgressionRuntime,
  createRunProgressionRuntime,
  type RunProgressionRuntimeState,
} from './arena/runProgressionRuntime.js'

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
  levelLabel: Phaser.GameObjects.Text
  xpBackground: Phaser.GameObjects.Rectangle
  xpFill: Phaser.GameObjects.Rectangle
  width: number
  height: number
  xpWidth: number
  xpHeight: number
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

interface EnemyLineBeamCharge {
  visual: Phaser.GameObjects.Graphics
  beam: EnemyLineBeamSpec
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
  lineBeam?: EnemyLineBeamCharge
}

interface PachinkoTokenEntity {
  runtimeId: number
  sprite: PhysicsImage
  collider?: Phaser.Physics.Arcade.Collider
  isResolving: boolean
}

interface PachinkoTokenPickupEntity {
  sprite: PhysicsImage
  aura: Phaser.GameObjects.Arc
  auraTween: Phaser.Tweens.Tween
  enemyId: EnemyDefinition['id']
  isAttracting: boolean
}

interface PachinkoPinEntity {
  sprite: PhysicsImage
  xRatio: number
  yRatio: number
}

interface PachinkoLaneDividerEntity {
  visual: Phaser.GameObjects.Rectangle
  xRatio: number
}

interface PachinkoSlotVisualEntity {
  frame: Phaser.GameObjects.Rectangle
  icon: Phaser.GameObjects.Image
  weaponLabel: Phaser.GameObjects.Text
  starLabel: Phaser.GameObjects.Text
  modifierLabel: Phaser.GameObjects.Text
}

interface PachinkoLightEntity {
  visual: Phaser.GameObjects.Arc
  xRatio: number
  yRatio: number
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
const PACHINKO_TOKEN_COLOR = 0xffd866
const PACHINKO_SLOT_VISUAL_HEIGHT = 48
const PACHINKO_QUEUE_BADGE_WIDTH = 54
const PACHINKO_QUEUE_BADGE_HEIGHT = 38
const PACHINKO_QUEUE_BADGE_Y_OFFSET = 56

interface ArenaSceneStartData {
  startWaveIndex?: number
  startElapsedMs?: number
}

export class ArenaScene extends Phaser.Scene {
  private hud!: HudController

  private codex!: CodexController

  private player!: PhysicsSprite

  private equippedWeaponVisual?: Phaser.GameObjects.Image

  private equippedWeaponTextureKey: string | null = null

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

  private healthPickups: HealthPickupEntity[] = []

  private pachinkoTokenPickups: PachinkoTokenPickupEntity[] = []

  private nextHeartPickupAt = 0

  private projectiles: ProjectileEntity[] = []

  private enemyProjectiles: EnemyProjectileEntity[] = []

  private hazardZones: HazardZoneEntity[] = []

  private weaponStacks: WeaponStack[] = []

  private activeWeaponKey: WeaponStackKey = 'starter-blaster:1'

  private isInventoryOpen = false

  private isCodexOpen = false

  private isStageSelectOpen = false

  private isRunEnding = false

  private playerHealth = 100

  private playerMaxHealth = 100

  private playerProgression: PlayerProgressionState = {
    totalXp: 0,
    level: 1,
  }

  private playerSpeed = 220

  private playerDashState: PlayerDashState = createReadyPlayerDashState()

  private playerDashDirection = new Phaser.Math.Vector2(1, 0)

  private lastPlayerMoveDirection = new Phaser.Math.Vector2(1, 0)

  private heldWeaponFacing = new Phaser.Math.Vector2(1, 0)

  private rememberedWeaponTargetDirection?: Phaser.Math.Vector2

  private nextFireAt = 0

  private runElapsedMs = 0

  private currentStageIndex = 0

  private activeRunLabel = ''

  private activeEnemySoftCap = 0

  private activeEnemyHealthMultiplier = 1

  private runProgressionState: RunProgressionRuntimeState = createRunProgressionRuntime()

  private isFinaleActive = false

  private statusMessage = 'WASD로 이동하고 J 대시로 회피하는 동안 무기가 자동으로 발사됩니다.'

  private lastPlayerHitAt = 0

  private nextEnemyRuntimeId = 1

  private pachinkoTokenXp = 0

  private pachinkoTokenQueue: number[] = []

  private activePachinkoTokens: PachinkoTokenEntity[] = []

  private nextPachinkoTokenRuntimeId = 1

  private lastPachinkoTokenLaunchAt = 0

  private latestPachinkoReward: string | null = null

  private pachinkoRewardTableSeed = 0

  private pachinkoPins?: Phaser.Physics.Arcade.StaticGroup

  private pachinkoVisuals: Phaser.GameObjects.GameObject[] = []

  private pachinkoBoardVisual?: Phaser.GameObjects.Rectangle

  private pachinkoDividerVisual?: Phaser.GameObjects.Rectangle

  private pachinkoTitleVisual?: Phaser.GameObjects.Text

  private pachinkoPinEntities: PachinkoPinEntity[] = []

  private pachinkoLaneDividers: PachinkoLaneDividerEntity[] = []

  private pachinkoSlotVisuals: PachinkoSlotVisualEntity[] = []

  private pachinkoLights: PachinkoLightEntity[] = []

  private pachinkoQueueBadge?: Phaser.GameObjects.Rectangle

  private pachinkoQueueLabel?: Phaser.GameObjects.Text

  private pachinkoLevelBadge?: Phaser.GameObjects.Text

  private pachinkoTopTrimVisual?: Phaser.GameObjects.Rectangle

  private pachinkoBottomGlowVisual?: Phaser.GameObjects.Rectangle

  private pachinkoBoardRect: RectBounds | null = null

  constructor() {
    super('arena')
  }

  create(data: ArenaSceneStartData = {}): void {
    this.resetRunState()
    const startElapsedMs = this.resolveStartElapsedMs(data)

    this.hud = this.game.registry.get('hud') as HudController
    this.codex = this.game.registry.get('codex') as CodexController
    this.hud.setHandlers({
      onInventoryToggle: () => this.toggleInventory(),
      onInventoryClose: () => this.closeInventory(),
      onWeaponEquip: (weaponKey) => this.handleWeaponEquip(weaponKey as WeaponStackKey),
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
    this.createPachinkoBoard()

    this.player = this.physics.add.sprite(playerStart.x, playerStart.y, 'player')
    this.player.setCircle(PLAYER_COLLISION_RADIUS)
    this.player.setCollideWorldBounds(true)
    this.player.play('player-idle')
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09)
    this.createEquippedWeaponVisual()
    this.playerHealthBar = this.createPlayerHealthBar()
    this.syncPlayerHealthBar()

    this.enemySprites = this.physics.add.group()
    this.enemySpacingCollider = this.physics.add.collider(this.enemySprites, this.enemySprites)
    this.createMiniMap()
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

    this.startRunProgression(startElapsedMs)
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
    this.syncEquippedWeaponVisual(time)
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

    this.updateHealthPickups(time, delta)
    this.updatePachinkoTokenPickups(delta)
    this.updatePachinko()
    this.updateHazards(delta)
    if (this.isRunEnding) {
      return
    }

    this.cleanupDestroyedEntities()
    this.syncMiniMap(time)

    if (!this.isInteractionBlocked()) {
      this.advanceRunProgression(delta)
      if (this.runElapsedMs >= RUN_DURATION_MS && !this.isRunEnding) {
        this.endRun('loss', 'timeout')
        return
      }
    }

    this.updateHud()
    this.updateCodex()
  }

  private isInteractionBlocked(): boolean {
    return this.isInventoryOpen || this.isCodexOpen || this.isStageSelectOpen
  }

  private resolveStartElapsedMs(data: ArenaSceneStartData): number {
    if (data.startElapsedMs !== undefined && Number.isFinite(data.startElapsedMs)) {
      return Math.max(0, Math.min(RUN_DURATION_MS - 1, Math.floor(data.startElapsedMs)))
    }

    const startStageIndex = data.startWaveIndex
    if (startStageIndex === undefined || !Number.isInteger(startStageIndex)) {
      return 0
    }

    return getStageSelectionStartElapsedMs(startStageIndex) ?? 0
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
    this.syncPachinkoBoard()
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

    for (const pickup of this.healthPickups) {
      if (!pickup.sprite.active) {
        continue
      }
      const dot = projectWorldPointToMiniMap(pickup.sprite, worldBounds, bounds)
      graphics.fillStyle(HEART_PICKUP_COLOR, 0.95)
      graphics.fillCircle(dot.x, dot.y, 2.4)
    }

    for (const pickup of this.pachinkoTokenPickups) {
      if (!pickup.sprite.active) {
        continue
      }
      const dot = projectWorldPointToMiniMap(pickup.sprite, worldBounds, bounds)
      graphics.fillStyle(PACHINKO_TOKEN_COLOR, 0.95)
      graphics.fillCircle(dot.x, dot.y, 2.2)
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
    const weapon = this.getActiveEffectiveWeapon()
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

    this.rememberWeaponTargetDirection(target.directionX, target.directionY)
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
          if (
            enemy.config.attackBehavior.kind === 'spread-burst' ||
            enemy.config.attackBehavior.kind === 'radial-burst'
          ) {
            enemy.attackCooldownMs = enemy.config.attackBehavior.cooldownMs
          }
        }

        enemy.sprite.setVelocity(0, 0)
        this.syncEnemyHealthBar(enemy)
        continue
      }

      if (enemy.lineBeam) {
        enemy.knockback = clearKnockbackForTelegraph()
        enemy.lineBeam.remainingMs -= delta
        enemy.lineBeam.visual.setAlpha(
          Math.max(0.24, 0.9 * (1 - enemy.lineBeam.remainingMs / enemy.lineBeam.totalMs)),
        )

        if (enemy.lineBeam.remainingMs <= 0) {
          if (
            isPointInsideLineBeam(
              { x: this.player.x, y: this.player.y },
              enemy.lineBeam.beam,
            )
          ) {
            this.damagePlayer(enemy.lineBeam.beam.damage)
            if (this.isRunEnding) {
              return
            }
          }

          enemy.lineBeam.visual.destroy()
          enemy.lineBeam = undefined
          if (enemy.config.attackBehavior.kind === 'line-beam') {
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

      if (
        attackBehavior.kind === 'line-beam' &&
        shouldEnemyStartLineBeam(
          attackBehavior,
          distanceToPlayer,
          enemy.attackCooldownMs,
        )
      ) {
        const beam = createEnemyLineBeam(
          { x: enemy.sprite.x, y: enemy.sprite.y },
          { x: this.player.x, y: this.player.y },
          attackBehavior,
        )

        if (beam) {
          enemy.lineBeam = {
            visual: this.createLineBeamWarning(beam),
            beam,
            remainingMs: beam.durationMs,
            totalMs: beam.durationMs,
          }
          enemy.knockback = clearKnockbackForTelegraph()
          enemy.sprite.setVelocity(0, 0)
          this.syncEnemyHealthBar(enemy)
          continue
        }
      }

      if (
        attackBehavior.kind === 'radial-burst' &&
        shouldEnemyStartRadialBurst(
          attackBehavior,
          distanceToPlayer,
          enemy.attackCooldownMs,
        )
      ) {
        const projectiles = createEnemyRadialBurstProjectiles(attackBehavior)

        if (projectiles.length > 0) {
          enemy.spreadBurst = {
            visual: this.createRadialBurstWarning(enemy, projectiles),
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

  private createRadialBurstWarning(
    enemy: EnemyEntity,
    projectiles: EnemyProjectileSpawnSpec[],
  ): Phaser.GameObjects.Graphics {
    const visual = this.add.graphics().setDepth(0.65)
    const behavior = enemy.config.attackBehavior
    const range = behavior.kind === 'radial-burst'
      ? Math.min(behavior.range, behavior.projectileSpeed * (behavior.projectileLifetimeMs / 1000))
      : 120

    visual.lineStyle(2, enemy.config.tint, 0.76)
    visual.strokeCircle(enemy.sprite.x, enemy.sprite.y, range)
    for (const projectile of projectiles) {
      visual.lineBetween(
        enemy.sprite.x,
        enemy.sprite.y,
        enemy.sprite.x + projectile.direction.x * range,
        enemy.sprite.y + projectile.direction.y * range,
      )
    }
    visual.fillStyle(enemy.config.tint, 0.1)
    visual.fillCircle(enemy.sprite.x, enemy.sprite.y, Math.max(enemy.config.size, range * 0.16))
    visual.setAlpha(0.32)
    return visual
  }

  private createLineBeamWarning(beam: EnemyLineBeamSpec): Phaser.GameObjects.Graphics {
    const visual = this.add.graphics().setDepth(0.66)
    visual.lineStyle(beam.width, beam.tint, 0.18)
    visual.lineBetween(beam.start.x, beam.start.y, beam.end.x, beam.end.y)
    visual.lineStyle(2, beam.tint, 0.88)
    visual.lineBetween(beam.start.x, beam.start.y, beam.end.x, beam.end.y)
    visual.fillStyle(beam.tint, 0.12)
    visual.fillCircle(beam.start.x, beam.start.y, Math.max(10, beam.width * 0.5))
    visual.setAlpha(0.36)
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


  private syncHealthPickupAura(pickup: HealthPickupEntity): void {
    if (pickup.aura.active) {
      pickup.aura.setPosition(pickup.sprite.x, pickup.sprite.y)
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

  private updatePachinkoTokenPickups(delta: number): void {
    if (this.isInteractionBlocked()) {
      return
    }

    for (const pickup of this.pachinkoTokenPickups) {
      if (!pickup.sprite.active) {
        this.destroyPachinkoTokenPickup(pickup)
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
        this.collectPachinkoTokenPickup(pickup)
        continue
      }

      if (pickupPhase === 'attract') {
        this.applyPachinkoTokenAttraction(pickup, distance, delta)
        continue
      }

      this.setPachinkoTokenAttractionStyle(pickup, false)
      this.syncPachinkoTokenAura(pickup)
    }
  }

  private applyPachinkoTokenAttraction(
    pickup: PachinkoTokenPickupEntity,
    distance: number,
    delta: number,
  ): void {
    this.setPachinkoTokenAttractionStyle(pickup, true)

    const attractionStep = getLootAttractionStep(distance, delta)
    const travelDistance = Math.min(attractionStep, Math.max(0, distance - LOOT_COLLECT_RADIUS))
    if (distance <= 0 || travelDistance <= 0) {
      this.syncPachinkoTokenAura(pickup)
      return
    }

    const travelRatio = travelDistance / distance
    pickup.sprite.setPosition(
      pickup.sprite.x + (this.player.x - pickup.sprite.x) * travelRatio,
      pickup.sprite.y + (this.player.y - pickup.sprite.y) * travelRatio,
    )
    this.syncPachinkoTokenAura(pickup)
  }

  private setPachinkoTokenAttractionStyle(pickup: PachinkoTokenPickupEntity, isAttracting: boolean): void {
    if (pickup.isAttracting === isAttracting) {
      return
    }

    pickup.isAttracting = isAttracting

    if (isAttracting) {
      pickup.sprite.setScale(0.95)
      pickup.sprite.setTint(0xffffff)
      pickup.aura.setStrokeStyle(3, 0xffffff, 0.92)
      return
    }

    pickup.sprite.setScale(0.74)
    pickup.sprite.setTint(PACHINKO_TOKEN_COLOR)
    pickup.aura.setStrokeStyle(2, PACHINKO_TOKEN_COLOR, 0.82)
  }

  private syncPachinkoTokenAura(pickup: PachinkoTokenPickupEntity): void {
    if (pickup.aura.active) {
      pickup.aura.setPosition(pickup.sprite.x, pickup.sprite.y)
    }
  }

  private collectPachinkoTokenPickup(pickup: PachinkoTokenPickupEntity): void {
    this.enqueuePachinkoToken(pickup.enemyId)
    this.destroyPachinkoTokenPickup(pickup)
  }

  private destroyPachinkoTokenPickup(pickup: PachinkoTokenPickupEntity): void {
    pickup.auraTween.stop()

    if (pickup.aura.active) {
      pickup.aura.destroy()
    }

    if (pickup.sprite.active) {
      pickup.sprite.destroy()
    }
  }

  private spawnPachinkoTokenPickup(
    x: number,
    y: number,
    enemyId: EnemyDefinition['id'],
  ): void {
    const tokenXp = getTokenXpForEnemy(enemyId)
    if (tokenXp <= 0) {
      return
    }

    const aura = this.add.circle(x, y, 16, PACHINKO_TOKEN_COLOR, 0.18)
    aura.setStrokeStyle(2, PACHINKO_TOKEN_COLOR, 0.82)
    aura.setBlendMode(Phaser.BlendModes.ADD)
    aura.setDepth(3)
    const auraTween = this.tweens.add({
      targets: aura,
      scale: { from: 0.86, to: 1.26 },
      alpha: { from: 0.48, to: 0.88 },
      duration: 620,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })

    const sprite = this.physics.add.image(x, y, 'tuning-capsule')
    sprite.setCircle(9)
    sprite.setDepth(4)
    sprite.setScale(0.74)
    sprite.setTint(PACHINKO_TOKEN_COLOR)
    sprite.setVelocity(Phaser.Math.Between(-42, 42), Phaser.Math.Between(-34, 18))
    sprite.setDrag(420, 420)

    this.pachinkoTokenPickups.push({
      sprite,
      aura,
      auraTween,
      enemyId,
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

    for (const pickup of this.healthPickups) {
      if (!pickup.sprite.active) {
        this.destroyHealthPickup(pickup)
      }
    }
    this.healthPickups = this.healthPickups.filter((pickup) => pickup.sprite.active)

    for (const pickup of this.pachinkoTokenPickups) {
      if (!pickup.sprite.active) {
        this.destroyPachinkoTokenPickup(pickup)
      }
    }
    this.pachinkoTokenPickups = this.pachinkoTokenPickups.filter((pickup) => pickup.sprite.active)

    this.projectiles = this.projectiles.filter((projectile) => projectile.sprite.active)
    this.enemyProjectiles = this.enemyProjectiles.filter((projectile) => projectile.sprite.active)
    this.hazardZones = this.hazardZones.filter((hazard) => hazard.visual.active)
  }

  private startRunProgression(startElapsedMs: number): void {
    this.runProgressionState = createRunProgressionRuntime(startElapsedMs)
    this.runElapsedMs = startElapsedMs
    this.applyRunPhaseState(getRunPhaseByElapsedMs(startElapsedMs))
    this.advanceRunProgression(0)
  }

  private advanceRunProgression(deltaMs: number): void {
    const result = advanceRunProgressionRuntime(
      this.runProgressionState,
      deltaMs,
      this.enemies.length,
    )
    this.runProgressionState = result.state
    this.runElapsedMs = result.state.elapsedMs
    this.applyRunPhaseState(result.activePhase)

    for (const enemyId of result.spawnedEnemyIds) {
      this.spawnEnemy(enemyId)
    }

    if (result.statusMessage) {
      this.statusMessage = result.statusMessage
    }
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

    const scaledMaxHealth = Math.max(1, Math.round(config.maxHealth * this.activeEnemyHealthMultiplier))
    const scaledConfig: EnemyDefinition = {
      ...config,
      maxHealth: scaledMaxHealth,
    }

    const enemy: EnemyEntity = {
      runtimeId: this.nextEnemyRuntimeId,
      sprite,
      config: scaledConfig,
      runtimeState: createEnemyRuntimeState(config.movementBehavior),
      currentHealth: scaledMaxHealth,
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

    const playerXpResult = this.grantPlayerXpForEnemy(enemy.config.id)
    const defeatOutcome = getDefeatedEnemyRunOutcome(enemy.config.id)
    const didDropPachinkoToken = defeatOutcome === 'continue' && shouldEnemyGrantPachinkoToken(enemy.config.id)
    const xpMessage = playerXpResult.grantedXp > 0 ? ` · XP +${playerXpResult.grantedXp}` : ''
    const levelMessage = playerXpResult.didLevelUp ? ` · Lv.${playerXpResult.level}!` : ''
    if (didDropPachinkoToken) {
      this.spawnPachinkoTokenPickup(enemy.sprite.x, enemy.sprite.y, enemy.config.id)
      this.statusMessage = `${enemy.config.name} 처치${xpMessage}${levelMessage}. 토큰이 떨어졌습니다. 캐릭터로 먹으면 파친코에 투입됩니다.`
    }
    if (enemy.telegraph?.visual.active) {
      enemy.telegraph.visual.destroy()
      enemy.telegraph = undefined
    }
    if (enemy.spreadBurst?.visual.active) {
      enemy.spreadBurst.visual.destroy()
      enemy.spreadBurst = undefined
    }
    if (enemy.lineBeam?.visual.active) {
      enemy.lineBeam.visual.destroy()
      enemy.lineBeam = undefined
    }
    enemy.knockback = undefined
    this.destroyEnemyHealthBar(enemy)
    enemy.sprite.destroy()

    if (defeatOutcome === 'win') {
      this.endRun('win', 'boss-defeated')
      return true
    }

    if (!didDropPachinkoToken) {
      this.statusMessage = `${enemy.config.name} 처치${xpMessage}${levelMessage}. 드롭을 계속 모으세요.`
    }
    return true
  }

  private grantPlayerXpForEnemy(enemyId: EnemyDefinition['id']): PlayerProgressionResult {
    const previousMaxHealth = this.playerMaxHealth
    const result = applyEnemyPlayerXp(this.playerProgression, enemyId)
    this.playerProgression = result.state
    this.syncPlayerLevelStats(previousMaxHealth)
    this.syncPlayerHealthBar()

    if (result.didLevelUp) {
      this.showPlayerLevelUpFeedback(result.level)
    }

    return result
  }

  private syncPlayerLevelStats(previousMaxHealth = this.playerMaxHealth): void {
    const playerStats = getPlayerLevelCombatStats(this.playerProgression.level)
    this.playerMaxHealth = playerStats.maxHealth

    const gainedMaxHealth = Math.max(0, this.playerMaxHealth - previousMaxHealth)
    if (gainedMaxHealth > 0) {
      this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + gainedMaxHealth)
    } else {
      this.playerHealth = Math.min(this.playerHealth, this.playerMaxHealth)
    }
  }

  private showPlayerLevelUpFeedback(level: number): void {
    const viewport = this.getViewportSize()
    const text = this.add
      .text(viewport.width / 2, 74, `LEVEL UP · Lv.${level}`, {
        color: '#f7fbff',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '18px',
        fontStyle: '900',
      })
      .setOrigin(0.5)
      .setDepth(44)
      .setScrollFactor(0)
      .setShadow(0, 2, '#020713', 6)

    this.tweens.add({
      targets: text,
      y: 62,
      alpha: 0,
      duration: 820,
      ease: 'Quad.Out',
      onComplete: () => text.destroy(),
    })
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
      this.endRun('loss', 'player-defeated')
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
    this.statusMessage = '인벤토리가 열렸습니다. 장착 무기와 보유 무기를 확인하세요.'
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
    this.statusMessage = '스테이지 선택이 열렸습니다. 시작할 시간대를 고르면 런이 새로 시작됩니다.'
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
    const startElapsedMs = getStageSelectionStartElapsedMs(stageIndex)
    if (!this.isStageSelectOpen || this.isRunEnding || startElapsedMs === null) {
      return
    }

    this.isStageSelectOpen = false
    this.applyInteractionPause(false)
    this.scene.restart({ startWaveIndex: stageIndex, startElapsedMs })
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

    this.setHealthPickupPulsePaused(shouldPause)
    this.setPachinkoTokenPulsePaused(shouldPause)

    this.freezeCombat(shouldPause)
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

  private setPachinkoTokenPulsePaused(shouldPause: boolean): void {
    for (const pickup of this.pachinkoTokenPickups) {
      if (shouldPause) {
        pickup.auraTween.pause()
        continue
      }

      pickup.auraTween.resume()
    }
  }


  private handleWeaponEquip(weaponKey: WeaponStackKey): void {
    if (!this.isInventoryOpen) {
      return
    }

    const nextWeaponKey = equipWeaponStack(this.weaponStacks, this.activeWeaponKey, weaponKey)
    if (nextWeaponKey === this.activeWeaponKey) {
      const weaponId = getWeaponIdFromStackKey(weaponKey)
      this.statusMessage = `${WEAPON_DEFINITIONS[weaponId].name}은 이미 장착 중이거나 보유하지 않았습니다.`
      this.updateHud()
      return
    }

    this.activeWeaponKey = nextWeaponKey
    this.statusMessage = `${this.getActiveWeaponLabel()} 장착 완료.`
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


  private getActiveEffectiveWeapon() {
    const activeStack = parseWeaponStackKey(this.activeWeaponKey)
    return deriveEffectiveWeaponStats(
      activeStack?.weaponId ?? getWeaponIdFromStackKey(this.activeWeaponKey),
      {},
      activeStack?.star ?? 1,
      this.playerProgression.level,
    )
  }

  private createEquippedWeaponVisual(): void {
    if (!this.player?.active) {
      return
    }

    const presentation = resolveEquippedWeaponPresentation(
      this.getActiveEffectiveWeapon(),
      { x: this.heldWeaponFacing.x, y: this.heldWeaponFacing.y },
    )

    this.equippedWeaponVisual = this.add
      .image(
        this.player.x + presentation.offset.x,
        this.player.y + presentation.offset.y,
        presentation.textureKey,
      )
      .setOrigin(0.5)
      .setScale(presentation.scale)
      .setRotation(presentation.rotation)
      .setFlipY(presentation.flipY)
      .setDepth(presentation.depth)
      .setAlpha(0.96)
    this.equippedWeaponTextureKey = presentation.textureKey
  }

  private syncEquippedWeaponVisual(time: number): void {
    if (!this.player?.active) {
      return
    }

    if (!this.equippedWeaponVisual?.active) {
      this.createEquippedWeaponVisual()
    }

    const equippedWeaponVisual = this.equippedWeaponVisual
    if (!equippedWeaponVisual?.active) {
      return
    }

    const weapon = this.getActiveEffectiveWeapon()
    const facing = resolveWeaponPresentationFacing({
      origin: { x: this.player.x, y: this.player.y },
      candidates: this.enemies.map((enemy) => ({
        x: enemy.sprite.x,
        y: enemy.sprite.y,
        radius: enemy.config.size / 2,
        isActive: enemy.sprite.active,
      })),
      maxRange: getWeaponAttackRange(weapon),
      isInteractionBlocked: this.isInteractionBlocked(),
      rememberedDirection: this.rememberedWeaponTargetDirection
        ? {
            x: this.rememberedWeaponTargetDirection.x,
            y: this.rememberedWeaponTargetDirection.y,
          }
        : null,
      isDashing: isPlayerDashActive(time, this.playerDashState),
      dashDirection: { x: this.playerDashDirection.x, y: this.playerDashDirection.y },
      moveDirection: { x: this.lastPlayerMoveDirection.x, y: this.lastPlayerMoveDirection.y },
    })
    this.heldWeaponFacing.set(facing.direction.x, facing.direction.y)
    if (facing.source === 'nearest-target') {
      this.rememberWeaponTargetDirection(facing.direction.x, facing.direction.y)
    }

    const presentation = resolveEquippedWeaponPresentation(weapon, facing.direction)
    const textureRefresh = resolveEquippedWeaponTextureRefresh(this.equippedWeaponTextureKey, weapon)
    if (textureRefresh.shouldRefresh) {
      equippedWeaponVisual.setTexture(textureRefresh.textureKey)
      this.equippedWeaponTextureKey = textureRefresh.textureKey
    }

    equippedWeaponVisual
      .setPosition(
        this.player.x + presentation.offset.x,
        this.player.y + presentation.offset.y,
      )
      .setRotation(presentation.rotation)
      .setFlipY(presentation.flipY)
      .setScale(presentation.scale)
      .setDepth(presentation.depth)
  }

  private destroyEquippedWeaponVisual(): void {
    if (this.equippedWeaponVisual?.active) {
      this.equippedWeaponVisual.destroy()
    }

    this.equippedWeaponVisual = undefined
    this.equippedWeaponTextureKey = null
  }

  private rememberWeaponTargetDirection(x: number, y: number): void {
    if (!this.rememberedWeaponTargetDirection) {
      this.rememberedWeaponTargetDirection = new Phaser.Math.Vector2(x, y)
      return
    }

    this.rememberedWeaponTargetDirection.set(x, y)
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
    const { x, y, width, height, levelLabelY, xpY, xpWidth, xpHeight } = getPlayerHealthBarMetrics(
      viewport.width,
      viewport.height,
    )
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

    const levelLabel = this.add
      .text(viewport.width / 2, levelLabelY, '', {
        color: '#bfe2ff',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: '800',
      })
      .setOrigin(0.5)
      .setDepth(depth + 2)
      .setScrollFactor(0)
      .setShadow(0, 1, '#020713', 2)

    const xpBackground = this.add
      .rectangle(x, xpY, xpWidth, xpHeight, 0x020713, 0.62)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x52d7ff, 0.32)
      .setDepth(depth)
      .setScrollFactor(0)

    const xpFill = this.add
      .rectangle(x + 2, xpY, xpWidth - 4, xpHeight - 2, 0x52d7ff, 0.88)
      .setOrigin(0, 0.5)
      .setDepth(depth + 1)
      .setScrollFactor(0)

    return {
      background,
      fill,
      label,
      levelLabel,
      xpBackground,
      xpFill,
      width,
      height,
      xpWidth,
      xpHeight,
    }
  }

  private syncPlayerHealthBar(): void {
    if (!this.playerHealthBar) {
      return
    }

    const { fill, label, levelLabel, xpFill, width, height, xpWidth, xpHeight } = this.playerHealthBar
    const fillAreaWidth = width - 4
    const fillWidth = getPlayerHealthFillWidth(this.playerHealth, this.playerMaxHealth, fillAreaWidth)
    const healthRatio = this.playerMaxHealth > 0 ? this.playerHealth / this.playerMaxHealth : 0
    const fillColor = healthRatio <= 0.3 ? 0xff5c6c : healthRatio <= 0.6 ? 0xffd166 : 0x43ef9a
    const progression = getPlayerProgressionView(this.playerProgression.totalXp)
    const xpFillAreaWidth = xpWidth - 4
    const xpFillWidth = getPlayerExperienceFillWidth(progression.progressRatio, xpFillAreaWidth)

    fill.setFillStyle(fillColor, 0.92)
    fill.setVisible(fillWidth > 0)
    fill.setDisplaySize(fillWidth, height - 4)
    label.setText(`HP ${this.playerHealth}/${this.playerMaxHealth}`)
    levelLabel.setText(`Lv.${progression.level} · XP ${progression.xpIntoLevel}/${progression.xpToNextLevel}`)
    xpFill.setVisible(xpFillWidth > 0)
    xpFill.setDisplaySize(xpFillWidth, xpHeight - 2)
  }

  private destroyPlayerHealthBar(): void {
    if (!this.playerHealthBar) {
      return
    }

    const { background, fill, label, levelLabel, xpBackground, xpFill } = this.playerHealthBar
    if (background.active) {
      background.destroy()
    }
    if (fill.active) {
      fill.destroy()
    }
    if (label.active) {
      label.destroy()
    }
    if (levelLabel.active) {
      levelLabel.destroy()
    }
    if (xpBackground.active) {
      xpBackground.destroy()
    }
    if (xpFill.active) {
      xpFill.destroy()
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
    this.isInventoryOpen = initialState.isInventoryOpen
    this.isCodexOpen = initialState.isCodexOpen
    this.isStageSelectOpen = false
    this.isRunEnding = initialState.isRunEnding
    this.playerHealth = initialState.playerHealth
    this.playerMaxHealth = initialState.playerMaxHealth
    this.playerProgression = initialState.playerProgression
    this.syncPlayerLevelStats()
    this.playerSpeed = initialState.playerSpeed
    this.playerDashState = createReadyPlayerDashState()
    this.playerDashDirection.set(1, 0)
    this.lastPlayerMoveDirection.set(1, 0)
    this.heldWeaponFacing.set(1, 0)
    this.rememberedWeaponTargetDirection = undefined
    this.nextFireAt = initialState.nextFireAt
    this.runElapsedMs = initialState.runElapsedMs
    this.currentStageIndex = initialState.currentStageIndex
    this.activeRunLabel = initialState.activeRunLabel
    this.activeEnemySoftCap = initialState.activeEnemySoftCap
    this.runProgressionState = createRunProgressionRuntime(initialState.runElapsedMs)
    this.activeEnemyHealthMultiplier = 1
    this.isFinaleActive = initialState.isFinaleActive
    this.statusMessage = initialState.statusMessage
    this.lastPlayerHitAt = initialState.lastPlayerHitAt
    this.nextEnemyRuntimeId = initialState.nextEnemyRuntimeId
    this.nextHeartPickupAt = 0
    this.pachinkoTokenXp = initialState.pachinkoTokenXp
    this.latestPachinkoReward = null
    this.pachinkoRewardTableSeed = 0
  }

  private destroyRunEntities(): void {
    this.enemySpacingCollider?.destroy()
    this.enemySpacingCollider = undefined
    this.destroyPlayerHealthBar()
    this.destroyMiniMap()
    this.destroyEquippedWeaponVisual()

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
      if (enemy.lineBeam?.visual.active) {
        enemy.lineBeam.visual.destroy()
      }
      this.destroyEnemyHealthBar(enemy)
      if (enemy.sprite.active) {
        enemy.sprite.destroy()
      }
    }

    this.destroyPachinkoBoard()

    for (const pickup of this.healthPickups) {
      this.destroyHealthPickup(pickup)
    }

    for (const pickup of this.pachinkoTokenPickups) {
      this.destroyPachinkoTokenPickup(pickup)
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
    this.healthPickups = []
    this.pachinkoTokenPickups = []
    this.pachinkoTokenQueue = []
    this.activePachinkoTokens = []
    this.nextPachinkoTokenRuntimeId = 1
    this.lastPachinkoTokenLaunchAt = 0
    this.projectiles = []
    this.enemyProjectiles = []
    this.hazardZones = []
    this.mapVisuals = []
  }

  private endRun(outcome: RunOutcome, endReason: RunEndReason): void {
    if (this.isRunEnding) {
      return
    }

    this.isRunEnding = true
    this.isInventoryOpen = false
    this.isCodexOpen = false
    this.isStageSelectOpen = false
    this.codex.update(getCodexState(false))
    this.physics.world.pause()
    this.freezeCombat(true)
    this.destroyEquippedWeaponVisual()
    const payload = this.createResultPayload(outcome, endReason)
    this.hud.update(createRunResultHudState(payload))
    this.scene.start('result', payload)
  }

  private createResultPayload(outcome: RunOutcome, endReason?: RunEndReason): RunResultPayload {
    return {
      outcome,
      weaponName: this.getActiveWeaponLabel(),
      elapsedMs: this.runElapsedMs,
      stageReachedLabel: getRunStageReachedLabel(this.runElapsedMs),
      finaleReached: isRunFinaleActive(this.runElapsedMs),
      endReason,
    }
  }

  private getActivePachinkoTokenPickupCount(): number {
    return this.pachinkoTokenPickups.filter((pickup) => pickup.sprite.active).length
  }

  private getActiveWeaponId(): WeaponStack['weaponId'] {
    return getWeaponIdFromStackKey(this.activeWeaponKey)
  }

  private updateHud(): void {
    const weaponId = this.getActiveWeaponId()
    const activeStack = this.weaponStacks.find((stack) => getStackKey(stack) === this.activeWeaponKey)
    const activeStar = activeStack?.star ?? 1
    const weapon = deriveEffectiveWeaponStats(weaponId, {}, activeStar, this.playerProgression.level)
    const playerProgression = getPlayerProgressionView(this.playerProgression.totalXp)
    const currentPhase = getRunPhaseByElapsedMs(this.runElapsedMs)
    const enemyChanceLines = getRunEnemySpawnChanceRows(currentPhase).map(
      (row) => `${row.enemyName} ${row.percentLabel}`,
    )
    const playerStats = getPlayerLevelCombatStats(this.playerProgression.level)

    this.hud.update({
      title: GAME_TITLE,
      subtitle: this.activeRunLabel || '슬라임 아레나 대기 중',
      stats: [
        `체력: ${this.playerHealth}/${this.playerMaxHealth}`,
        `플레이어 레벨: Lv.${playerProgression.level} · XP ${playerProgression.xpIntoLevel}/${playerProgression.xpToNextLevel} · 공격력 ×${playerStats.damageMultiplier.toFixed(2)}`,
        `무기: ${weapon.name} ${formatWeaponStarLabel(activeStar)} · ${getWeaponSummary(weapon)}`,
        `현재 시간: ${formatRunTime(this.runElapsedMs)}`,
        `생존 시간: ${formatRunTime(this.runElapsedMs)} / 30:00`,
        `현재 단계: ${this.currentStageIndex + 1}막`,
        `생존한 적: ${this.enemies.length}/${this.activeEnemySoftCap} 상한`,
        `적 체력 배율: ×${this.activeEnemyHealthMultiplier.toFixed(2)}`,
      ],
      inventory: [
        `파친코 보상 레벨 Lv.${getPachinkoRewardLevel(this.pachinkoTokenXp)}`,
        `바닥 토큰 ${this.getActivePachinkoTokenPickupCount()}개 · 토큰 큐 ${this.pachinkoTokenQueue.length}개`,
        `현재 적 출현 확률 (${currentPhase.minuteIndex + 1}분차)`,
        ...enemyChanceLines,
      ],
      recipes: ['같은 무기·같은 별 3개는 자동으로 다음 별 등급이 됩니다.'],
      objective: this.isFinaleActive
        ? '크라운 슬라임을 30:00 전에 격파하고 네온 아레나를 장악하세요.'
        : '30분 생존 압박을 버티며 토큰을 파친코에 넣고 무기 별 등급을 합성하세요.',
      tip: GAMEPLAY_CONTROL_TIP,
      status: this.statusMessage,
      inventoryButtonLabel: this.isInventoryOpen ? '런 재개' : '인벤토리 열기',
      inventoryButtonDisabled: this.isCodexOpen || this.isStageSelectOpen,
      stageButtonLabel: this.isStageSelectOpen ? '선택 닫기' : '스테이지 선택',
      stageButtonDisabled: this.isInventoryOpen || this.isCodexOpen || this.isRunEnding,
      stageSelection: {
        isOpen: this.isStageSelectOpen,
        stages: getStageSelectionViews(this.runElapsedMs),
      },
      pachinko: {
        level: getPachinkoRewardLevel(this.pachinkoTokenXp),
        totalTokenXp: this.pachinkoTokenXp,
        droppedTokens: this.getActivePachinkoTokenPickupCount(),
        activeTokens: this.activePachinkoTokens.length,
        queuedTokens: this.pachinkoTokenQueue.length,
        isTokenInFlight: this.activePachinkoTokens.length > 0,
        latestReward: this.latestPachinkoReward,
        synergy: getPachinkoWeaponSynergySummary(weaponId),
      },
      modal: {
        isOpen: this.isInventoryOpen,
        items: [],
        recipes: [],
        weapons: this.getOwnedWeaponViews(),
      },
    })
  }

  private updateCodex(): void {
    this.codex.update(getCodexState(this.isCodexOpen))
  }

  private applyRunPhaseState(phase: ReturnType<typeof getRunPhaseByElapsedMs>): void {
    this.currentStageIndex = getRunStageIndex(this.runElapsedMs)
    this.activeRunLabel = phase.label
    this.activeEnemySoftCap = phase.softEnemyCap
    this.activeEnemyHealthMultiplier = phase.healthMultiplier
    this.isFinaleActive = phase.isFinale === true
  }

  private getOwnedWeaponViews(): HudOwnedWeaponView[] {
    return sortWeaponStacks(this.weaponStacks, this.activeWeaponKey).map((stack) => {
      const ownedWeapon = WEAPON_DEFINITIONS[stack.weaponId]
      const effectiveWeapon = deriveEffectiveWeaponStats(stack.weaponId, {}, stack.star, this.playerProgression.level)
      const stackKey = getStackKey(stack)
      return {
        id: stack.weaponId,
        stackKey,
        name: ownedWeapon.name,
        description: ownedWeapon.description,
        star: stack.star,
        count: stack.count,
        damage: effectiveWeapon.damage,
        fireRateMs: effectiveWeapon.fireRateMs,
        projectileSpeed: effectiveWeapon.projectileSpeed,
        isEquipped: stackKey === this.activeWeaponKey,
        hudIconKey: ownedWeapon.visual.hudIconKey,
        accentColor: ownedWeapon.visual.accentColor,
      }
    })
  }


  private getActiveWeaponLabel(): string {
    const weaponId = getWeaponIdFromStackKey(this.activeWeaponKey)
    const stack = this.weaponStacks.find((candidate) => getStackKey(candidate) === this.activeWeaponKey)
    return `${WEAPON_DEFINITIONS[weaponId].name}${stack ? ` ${formatWeaponStarLabel(stack.star)}` : ''}`
  }

  private enqueuePachinkoToken(enemyId: EnemyDefinition['id']): void {
    const nextProgress = applyEnemyPachinkoTokenProgress(
      {
        totalTokenXp: this.pachinkoTokenXp,
        queuedTokenXp: this.pachinkoTokenQueue,
      },
      enemyId,
    )
    if (!nextProgress.didEnqueue) {
      return
    }

    this.pachinkoTokenXp = nextProgress.totalTokenXp
    this.pachinkoTokenQueue = nextProgress.queuedTokenXp
    this.statusMessage = `파친코 토큰 획득: +${nextProgress.grantedTokenXp} XP · 보상 Lv.${nextProgress.rewardLevel}`
    this.syncPachinkoBoard()
    this.launchAvailablePachinkoTokens()
  }

  private updatePachinko(): void {
    if (this.isInteractionBlocked()) {
      return
    }

    this.pachinkoRewardTableSeed = getPachinkoRewardTableSeed(this.time.now)
    const rect = this.syncPachinkoBoard()
    this.launchAvailablePachinkoTokens()

    for (const token of [...this.activePachinkoTokens]) {
      if (!token.sprite.active) {
        this.destroyActivePachinkoToken(token)
        continue
      }

      if (token.sprite.x < rect.x + 8) {
        token.sprite.setX(rect.x + 8)
        token.sprite.setVelocityX(Math.abs(token.sprite.body?.velocity.x ?? 80))
      } else if (token.sprite.x > rect.x + rect.width - 8) {
        token.sprite.setX(rect.x + rect.width - 8)
        token.sprite.setVelocityX(-Math.abs(token.sprite.body?.velocity.x ?? 80))
      }

      if (token.sprite.y >= rect.y + rect.height - PACHINKO_SLOT_VISUAL_HEIGHT - 8) {
        this.resolvePachinkoToken(token)
      }
    }

    this.launchAvailablePachinkoTokens()
  }

  private launchAvailablePachinkoTokens(): void {
    while (canLaunchPachinkoToken({
      activeTokenCount: this.activePachinkoTokens.length,
      queuedTokenCount: this.pachinkoTokenQueue.length,
      now: this.time.now,
      lastLaunchAt: this.lastPachinkoTokenLaunchAt,
    }) && this.launchNextPachinkoToken()) {
      // Keep filling until the cap, queue, or launch cadence stops this frame.
    }
  }

  private launchNextPachinkoToken(): boolean {
    if (this.isInteractionBlocked() || !canLaunchPachinkoToken({
      activeTokenCount: this.activePachinkoTokens.length,
      queuedTokenCount: this.pachinkoTokenQueue.length,
      now: this.time.now,
      lastLaunchAt: this.lastPachinkoTokenLaunchAt,
    })) {
      return false
    }

    this.pachinkoTokenQueue.shift()
    const rect = this.syncPachinkoBoard()
    const spawnOffset = this.activePachinkoTokens.length % PACHINKO_SLOT_COUNT
    const spawnRatio = (spawnOffset + 0.5) / PACHINKO_SLOT_COUNT
    const sprite = this.physics.add.image(
      rect.x + rect.width * spawnRatio,
      rect.y + 12,
      'tuning-capsule',
    )
    sprite.setCircle(9)
    sprite.setScale(0.8)
    sprite.setTint(PACHINKO_TOKEN_COLOR)
    sprite.setDepth(62)
    sprite.setBounce(0.68, 0.52)
    sprite.setVelocity(Phaser.Math.Between(-80, 80), 0)
    sprite.setGravityY(360)
    const token: PachinkoTokenEntity = {
      runtimeId: this.nextPachinkoTokenRuntimeId,
      sprite,
      isResolving: false,
    }
    this.nextPachinkoTokenRuntimeId += 1
    if (this.pachinkoPins) {
      token.collider = this.physics.add.collider(sprite, this.pachinkoPins)
    }
    this.activePachinkoTokens.push(token)
    this.lastPachinkoTokenLaunchAt = this.time.now
    return true
  }

  private resolvePachinkoToken(token: PachinkoTokenEntity): void {
    if (token.isResolving) {
      return
    }
    token.isResolving = true
    const rect = this.syncPachinkoBoard()
    const laneRatio = Phaser.Math.Clamp((token.sprite.x - rect.x) / rect.width, 0, 0.999)
    const slotIndex = resolvePachinkoSlotIndex(laneRatio)
    const reward = resolvePachinkoSlotReward(
      this.pachinkoTokenXp,
      laneRatio,
      PACHINKO_SLOT_COUNT,
      this.pachinkoRewardTableSeed,
      this.playerProgression.level,
      this.getActiveWeaponId(),
    )
    const fusionResult = addWeaponStackWithAutoFusion(
      { weaponStacks: this.weaponStacks, activeWeaponKey: this.activeWeaponKey },
      reward.weaponId,
      reward.star,
      1,
    )
    this.weaponStacks = fusionResult.weaponStacks
    this.activeWeaponKey = fusionResult.activeWeaponKey
    const rewardLabel = `${WEAPON_DEFINITIONS[reward.weaponId].name} ${formatWeaponStarLabel(reward.star)}`
    const lastFusion = fusionResult.fusions.at(-1)
    const fusionLabel = lastFusion
      ? ` · 자동 합성: ${WEAPON_DEFINITIONS[lastFusion.weaponId].name} ${formatWeaponStarLabel(lastFusion.resultStar)}`
      : ''
    const modifierLabel = reward.modifier ? ` · ${reward.modifier.label} 보너스` : ''
    this.latestPachinkoReward = `${rewardLabel}${modifierLabel}${fusionLabel}`
    this.statusMessage = `파친코 ${slotIndex + 1}번 칸 보상 획득: ${rewardLabel}${modifierLabel}${fusionLabel}`
    this.destroyActivePachinkoToken(token)
    this.launchAvailablePachinkoTokens()
  }

  private destroyActivePachinkoToken(token: PachinkoTokenEntity): void {
    token.collider?.destroy()
    if (token.sprite.active) {
      token.sprite.destroy()
    }
    this.activePachinkoTokens = this.activePachinkoTokens.filter((candidate) => candidate.runtimeId !== token.runtimeId)
  }

  private getPachinkoWorldRect(): RectBounds {
    const viewport = this.getViewportSize()
    const camera = this.cameras.main
    const width = Math.min(260, Math.max(156, viewport.width - 32))
    const rightMargin = 20
    const bottomMargin = 24
    const minimapClearanceY = 132
    const y = viewport.height >= 430 ? minimapClearanceY : 72
    const height = Math.max(190, viewport.height - y - bottomMargin)
    const screenX = Math.max(16, viewport.width - width - rightMargin)

    return {
      x: camera.worldView.x + screenX,
      y: camera.worldView.y + y,
      width,
      height,
    }
  }


  private getPachinkoQueueBadgeX(rect: RectBounds): number {
    const leftmostVisibleCenter = this.cameras.main.worldView.x + PACHINKO_QUEUE_BADGE_WIDTH / 2 + 2
    const preferredOutsideX = rect.x - PACHINKO_QUEUE_BADGE_WIDTH / 2 - 11
    const fallbackInsideX = rect.x + PACHINKO_QUEUE_BADGE_WIDTH / 2 + 2
    return Math.min(fallbackInsideX, Math.max(leftmostVisibleCenter, preferredOutsideX))
  }

  private syncPachinkoBoard(): RectBounds {
    const rect = this.getPachinkoWorldRect()
    const previousRect = this.pachinkoBoardRect
    for (const token of this.activePachinkoTokens) {
      const inFlightSprite = token.sprite
      if (!previousRect || !inFlightSprite.active) {
        continue
      }
      const xRatio = previousRect.width > 0
        ? Phaser.Math.Clamp((inFlightSprite.x - previousRect.x) / previousRect.width, 0, 1)
        : 0.5
      const yOffset = inFlightSprite.y - previousRect.y
      inFlightSprite.setPosition(rect.x + rect.width * xRatio, rect.y + yOffset)
    }

    this.pachinkoBoardRect = rect

    this.pachinkoBoardVisual
      ?.setPosition(rect.x + rect.width / 2, rect.y + rect.height / 2)
      .setDisplaySize(rect.width, rect.height)

    this.pachinkoDividerVisual
      ?.setPosition(rect.x - 12, rect.y + rect.height / 2)
      .setDisplaySize(6, rect.height + 26)

    this.pachinkoTitleVisual?.setPosition(rect.x + 12, rect.y + 10)
    this.pachinkoTopTrimVisual
      ?.setPosition(rect.x + rect.width / 2, rect.y + 36)
      .setDisplaySize(rect.width - 18, 5)
    this.pachinkoBottomGlowVisual
      ?.setPosition(rect.x + rect.width / 2, rect.y + rect.height - PACHINKO_SLOT_VISUAL_HEIGHT - 4)
      .setDisplaySize(rect.width - 16, 4)
    this.pachinkoLevelBadge
      ?.setPosition(rect.x + rect.width - 12, rect.y + 14)
      .setText(`Lv.${getPachinkoRewardLevel(this.pachinkoTokenXp)} · LIVE`)
    const queueBadgeX = this.getPachinkoQueueBadgeX(rect)
    this.pachinkoQueueBadge
      ?.setPosition(queueBadgeX, rect.y + PACHINKO_QUEUE_BADGE_Y_OFFSET)
      .setDisplaySize(PACHINKO_QUEUE_BADGE_WIDTH, PACHINKO_QUEUE_BADGE_HEIGHT)
    this.pachinkoQueueLabel
      ?.setPosition(queueBadgeX, rect.y + PACHINKO_QUEUE_BADGE_Y_OFFSET)
      .setText(`대기\n${this.pachinkoTokenQueue.length}`)

    for (const light of this.pachinkoLights) {
      if (!light.visual.active) {
        continue
      }
      light.visual.setPosition(rect.x + rect.width * light.xRatio, rect.y + rect.height * light.yRatio)
    }

    for (const pin of this.pachinkoPinEntities) {
      if (!pin.sprite.active) {
        continue
      }
      pin.sprite.setPosition(rect.x + rect.width * pin.xRatio, rect.y + rect.height * pin.yRatio)
      pin.sprite.refreshBody()
    }

    for (const divider of this.pachinkoLaneDividers) {
      if (!divider.visual.active) {
        continue
      }
      divider.visual.setPosition(rect.x + rect.width * divider.xRatio, rect.y + rect.height - PACHINKO_SLOT_VISUAL_HEIGHT / 2)
    }

    this.syncPachinkoSlotVisuals(rect)

    return rect
  }

  private createPachinkoBoard(): void {
    const rect = this.getPachinkoWorldRect()
    const board = this.add.rectangle(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      rect.width,
      rect.height,
      0x101a32,
      0.94,
    )
    board.setStrokeStyle(2, 0xffd866, 0.78)
    board.setDepth(56)

    const divider = this.add.rectangle(rect.x - 12, rect.y + rect.height / 2, 6, rect.height + 26, 0x050b14, 0.95)
      .setStrokeStyle(1, 0x9bb5ff, 0.4)
      .setDepth(57)
    const topTrim = this.add.rectangle(rect.x + rect.width / 2, rect.y + 36, rect.width - 18, 5, 0xffd866, 0.65)
      .setDepth(61)
    const bottomGlow = this.add.rectangle(rect.x + rect.width / 2, rect.y + rect.height - PACHINKO_SLOT_VISUAL_HEIGHT - 4, rect.width - 16, 4, 0x8fe4ff, 0.44)
      .setDepth(61)
    const title = this.add.text(rect.x + 12, rect.y + 10, 'TOKEN\nPACHINKO', {
      color: '#ffd866',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      fontStyle: '700',
      align: 'left',
    }).setDepth(63)
    const levelBadge = this.add.text(rect.x + rect.width - 12, rect.y + 14, `Lv.${getPachinkoRewardLevel(this.pachinkoTokenXp)} · LIVE`, {
      color: '#101a32',
      backgroundColor: '#ffd866',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '11px',
      fontStyle: '900',
      padding: { x: 5, y: 2 },
    }).setOrigin(1, 0).setDepth(64)
    const queueBadgeX = this.getPachinkoQueueBadgeX(rect)
    const queueBadge = this.add.rectangle(queueBadgeX, rect.y + PACHINKO_QUEUE_BADGE_Y_OFFSET, PACHINKO_QUEUE_BADGE_WIDTH, PACHINKO_QUEUE_BADGE_HEIGHT, 0x101a32, 0.95)
      .setStrokeStyle(1, 0xffd866, 0.8)
      .setDepth(64)
    const queueLabel = this.add.text(queueBadgeX, rect.y + PACHINKO_QUEUE_BADGE_Y_OFFSET, `대기\n${this.pachinkoTokenQueue.length}`, {
      color: '#ffd866',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '10px',
      fontStyle: '800',
      align: 'center',
    }).setOrigin(0.5).setDepth(65)
    this.pachinkoBoardVisual = board
    this.pachinkoDividerVisual = divider
    this.pachinkoTitleVisual = title
    this.pachinkoTopTrimVisual = topTrim
    this.pachinkoBottomGlowVisual = bottomGlow
    this.pachinkoLevelBadge = levelBadge
    this.pachinkoQueueBadge = queueBadge
    this.pachinkoQueueLabel = queueLabel
    this.pachinkoVisuals.push(board, divider, topTrim, bottomGlow, title, levelBadge, queueBadge, queueLabel)

    for (let lightIndex = 0; lightIndex < 8; lightIndex += 1) {
      const xRatio = (lightIndex + 0.5) / 8
      const light = this.add.circle(rect.x + rect.width * xRatio, rect.y + 50, 3.4, lightIndex % 2 === 0 ? 0xffd866 : 0x8fe4ff, 0.82)
        .setDepth(62)
      this.pachinkoLights.push({ visual: light, xRatio, yRatio: 0.1 })
      this.pachinkoVisuals.push(light)
    }

    this.pachinkoPins = this.physics.add.staticGroup()
    for (let row = 0; row < 6; row += 1) {
      const pinsInRow = row % 2 === 0 ? 4 : 5
      for (let column = 0; column < pinsInRow; column += 1) {
        const xRatio = (column + 1) / (pinsInRow + 1)
        const yRatio = 0.18 + row * 0.11
        const x = rect.x + rect.width * xRatio
        const y = rect.y + rect.height * yRatio
        const pin = this.pachinkoPins.create(x, y, 'starter-projectile') as PhysicsImage
        pin.setCircle(5)
        pin.setScale(0.55)
        pin.setTint(0x9bb5ff)
        pin.setDepth(60)
        pin.refreshBody()
        this.pachinkoPinEntities.push({ sprite: pin, xRatio, yRatio })
      }
    }

    for (let lane = 1; lane < PACHINKO_SLOT_COUNT; lane += 1) {
      const xRatio = lane / PACHINKO_SLOT_COUNT
      const laneDivider = this.add.rectangle(rect.x + rect.width * xRatio, rect.y + rect.height - PACHINKO_SLOT_VISUAL_HEIGHT / 2, 1, PACHINKO_SLOT_VISUAL_HEIGHT - 6, 0x9bb5ff, 0.55)
        .setDepth(59)
      this.pachinkoLaneDividers.push({ visual: laneDivider, xRatio })
      this.pachinkoVisuals.push(laneDivider)
    }
    this.createPachinkoSlotVisuals(rect)
    this.syncPachinkoBoard()
  }

  private createPachinkoSlotVisuals(rect: RectBounds): void {
    for (const reward of buildPachinkoSlotRewards(
      this.pachinkoTokenXp,
      PACHINKO_SLOT_COUNT,
      this.pachinkoRewardTableSeed,
      this.playerProgression.level,
      this.getActiveWeaponId(),
    )) {
      const centerX = rect.x + rect.width * ((reward.slotIndex + 0.5) / reward.slotCount)
      const centerY = rect.y + rect.height - PACHINKO_SLOT_VISUAL_HEIGHT / 2
      const strokeColor = reward.modifier?.color ?? WEAPON_DEFINITIONS[reward.weaponId].visual.accentColor
      const frame = this.add.rectangle(centerX, centerY, rect.width / reward.slotCount - 3, PACHINKO_SLOT_VISUAL_HEIGHT - 8, 0x07111f, 0.96)
        .setStrokeStyle(reward.modifier ? 2 : 1, strokeColor, reward.modifier ? 0.95 : 0.82)
        .setDepth(61)
      const icon = this.add.image(centerX, centerY - 7, reward.iconKey)
        .setDepth(62)
        .setDisplaySize(15, 15)
      const weaponLabel = this.add.text(centerX, centerY + 7, `${reward.slotIndex + 1}`, {
        color: '#dbeafe',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '8px',
        fontStyle: '800',
      }).setOrigin(0.5).setDepth(63)
      const starLabel = this.add.text(centerX, centerY + 18, formatWeaponStarLabel(reward.star), {
        color: '#ffd866',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '8px',
        fontStyle: '900',
      }).setOrigin(0.5).setDepth(63)
      const modifierLabel = this.add.text(centerX, centerY - 20, reward.modifier?.label ?? '', {
        color: reward.modifier ? `#${reward.modifier.color.toString(16).padStart(6, '0')}` : '#dbeafe',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '7px',
        fontStyle: '900',
      }).setOrigin(0.5).setDepth(64)
      this.pachinkoSlotVisuals.push({
        frame,
        icon,
        weaponLabel,
        starLabel,
        modifierLabel,
      })
      this.pachinkoVisuals.push(frame, icon, weaponLabel, starLabel, modifierLabel)
    }
  }

  private syncPachinkoSlotVisuals(rect: RectBounds): void {
    const rewards = buildPachinkoSlotRewards(
      this.pachinkoTokenXp,
      PACHINKO_SLOT_COUNT,
      this.pachinkoRewardTableSeed,
      this.playerProgression.level,
      this.getActiveWeaponId(),
    )
    for (let index = 0; index < this.pachinkoSlotVisuals.length; index += 1) {
      const visual = this.pachinkoSlotVisuals[index]
      const reward = rewards[index]
      if (!visual || !reward) {
        continue
      }

      const centerX = rect.x + rect.width * ((reward.slotIndex + 0.5) / reward.slotCount)
      const centerY = rect.y + rect.height - PACHINKO_SLOT_VISUAL_HEIGHT / 2
      const slotWidth = rect.width / reward.slotCount - 3
      const strokeColor = reward.modifier?.color ?? WEAPON_DEFINITIONS[reward.weaponId].visual.accentColor
      visual.frame
        .setPosition(centerX, centerY)
        .setDisplaySize(slotWidth, PACHINKO_SLOT_VISUAL_HEIGHT - 8)
        .setStrokeStyle(reward.modifier ? 2 : 1, strokeColor, reward.modifier ? 0.95 : 0.82)
      visual.icon
        .setTexture(reward.iconKey)
        .setPosition(centerX, centerY - 7)
        .setDisplaySize(Math.min(16, slotWidth - 2), Math.min(16, slotWidth - 2))
      visual.weaponLabel
        .setPosition(centerX, centerY + 7)
        .setText(`${reward.slotIndex + 1}`)
      visual.starLabel
        .setPosition(centerX, centerY + 18)
        .setText(formatWeaponStarLabel(reward.star))
        .setFontSize(8)
      visual.modifierLabel
        .setPosition(centerX, centerY - 20)
        .setText(reward.modifier?.label ?? '')
        .setColor(reward.modifier ? `#${reward.modifier.color.toString(16).padStart(6, '0')}` : '#dbeafe')
    }
  }

  private destroyPachinkoBoard(): void {
    for (const token of [...this.activePachinkoTokens]) {
      this.destroyActivePachinkoToken(token)
    }
    this.pachinkoPins?.clear(true, true)
    this.pachinkoPins = undefined
    this.pachinkoPinEntities = []
    this.pachinkoLaneDividers = []
    this.pachinkoSlotVisuals = []
    this.pachinkoLights = []
    for (const visual of this.pachinkoVisuals) {
      if (visual.active) {
        visual.destroy()
      }
    }
    this.pachinkoVisuals = []
    this.pachinkoBoardVisual = undefined
    this.pachinkoDividerVisual = undefined
    this.pachinkoTitleVisual = undefined
    this.pachinkoLevelBadge = undefined
    this.pachinkoTopTrimVisual = undefined
    this.pachinkoBottomGlowVisual = undefined
    this.pachinkoQueueBadge = undefined
    this.pachinkoQueueLabel = undefined
    this.pachinkoBoardRect = null
    this.activePachinkoTokens = []
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
