import type { InventoryState, WeaponId, WeaponStack, WeaponStackKey } from '../domain/types.js'
import type { WeaponTuningState } from './tuning.js'
import { seedOwnedWeapons, seedWeaponStacks, STARTER_WEAPON_ID, STARTER_WEAPON_STACK_KEY } from './weaponOwnership.js'

export interface ArenaRunState {
  ownedWeaponIds: WeaponId[]
  activeWeaponId: WeaponId
  weaponStacks: WeaponStack[]
  activeWeaponKey: WeaponStackKey
  inventory: InventoryState
  tuningState: WeaponTuningState
  pachinkoTokenXp: number
  isInventoryOpen: boolean
  isCodexOpen: boolean
  isRunEnding: boolean
  playerHealth: number
  playerMaxHealth: number
  playerSpeed: number
  nextFireAt: number
  remainingSpawns: number
  currentWaveIndex: number
  activeWaveLabel: string
  wavesCleared: number
  isBossActive: boolean
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
    pachinkoTokenXp: 0,
    isInventoryOpen: false,
    isCodexOpen: false,
    isRunEnding: false,
    playerHealth: 100,
    playerMaxHealth: 100,
    playerSpeed: 220,
    nextFireAt: 0,
    remainingSpawns: 0,
    currentWaveIndex: 0,
    activeWaveLabel: '',
    wavesCleared: 0,
    isBossActive: false,
    statusMessage: 'WASD 이동과 J 대시로 회피하며 토큰을 파친코 보상으로 바꾸세요.',
    lastPlayerHitAt: 0,
    nextEnemyRuntimeId: 1,
  }
}
