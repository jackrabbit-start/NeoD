export const PLAYER_HIT_COOLDOWN_MS = 375

export function shouldApplyPlayerDamage(
  nowMs: number,
  lastHitAtMs: number,
  isInteractionBlocked: boolean,
): boolean {
  return !isInteractionBlocked && nowMs - lastHitAtMs >= PLAYER_HIT_COOLDOWN_MS
}
