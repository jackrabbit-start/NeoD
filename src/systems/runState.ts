import type { InventoryState, WeaponId, WeaponStack, WeaponStackKey } from '../domain/types.js'
import type { PassiveState } from './passives.js'
import { createInitialPassiveState } from './passives.js'
import { createInitialPlayerProgressionState, type PlayerProgressionState } from './playerProgression.js'
import type { WeaponTuningState } from './tuning.js'
import { seedOwnedWeapons, seedWeaponStacks, STARTER_WEAPON_ID, STARTER_WEAPON_STACK_KEY } from './weaponOwnership.js'

export interface ArenaRunState {
  ownedWeaponIds: WeaponId[]
  activeWeaponId: WeaponId
  weaponStacks: WeaponStack[]
  activeWeaponKey: WeaponStackKey
  inventory: InventoryState
  tuningState: WeaponTuningState
  passiveState: PassiveState
  pachinkoTokenXp: number
  playerProgression: PlayerProgressionState
  isInventoryOpen: boolean
  isCodexOpen: boolean
  isRunEnding: boolean
  playerHealth: number
  playerMaxHealth: number
  playerSpeed: number
  nextFireAt: number
  runElapsedMs: number
  currentStageIndex: number
  activeRunLabel: string
  activeEnemySoftCap: number
  isFinaleActive: boolean
  statusMessage: string
  lastPlayerHitAt: number
  nextEnemyRuntimeId: number
}

export function createInitialArenaRunState(): ArenaRunState {
  return {
    ownedWeaponIds: seedOwnedWeapons(),
    activeWeaponId: STARTER_WEAPON_ID,
    weaponStacks: seedWeaponStacks(),
    activeWeaponKey: STARTER_WEAPON_STACK_KEY,
    inventory: {},
    tuningState: {},
    passiveState: createInitialPassiveState(),
    pachinkoTokenXp: 0,
    playerProgression: createInitialPlayerProgressionState(),
    isInventoryOpen: false,
    isCodexOpen: false,
    isRunEnding: false,
    playerHealth: 100,
    playerMaxHealth: 100,
    playerSpeed: 220,
    nextFireAt: 0,
    runElapsedMs: 0,
    currentStageIndex: 0,
    activeRunLabel: '',
    activeEnemySoftCap: 0,
    isFinaleActive: false,
    statusMessage: 'WASD 이동과 J 대시로 회피하며 토큰을 파친코 보상으로 바꾸세요.',
    lastPlayerHitAt: 0,
    nextEnemyRuntimeId: 1,
  }
}
