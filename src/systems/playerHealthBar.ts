export interface PlayerHealthBarMetrics {
  x: number
  y: number
  width: number
  height: number
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export function getPlayerHealthBarMetrics(
  gameWidth: number,
  gameHeight: number,
): PlayerHealthBarMetrics {
  const width = Math.min(240, Math.max(160, gameWidth * 0.25))
  const height = 10

  return {
    x: (gameWidth - width) / 2,
    y: gameHeight - 22,
    width,
    height,
  }
}

export function getPlayerHealthFillWidth(
  currentHealth: number,
  maxHealth: number,
  barWidth: number,
): number {
  if (maxHealth <= 0) {
    return 0
  }

  return barWidth * clamp(currentHealth / maxHealth, 0, 1)
}
