const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export interface EnemyHealthBarMetrics {
  width: number
  height: number
  offsetY: number
}

export function getEnemyHealthBarMetrics(size: number): EnemyHealthBarMetrics {
  const width = clamp(size * 1.6, 26, 68)
  const height = clamp(Math.round(size * 0.22), 4, 8)
  const offsetY = size / 2 + height + 8

  return {
    width,
    height,
    offsetY,
  }
}

export function getEnemyHealthFillWidth(
  currentHealth: number,
  maxHealth: number,
  barWidth: number,
): number {
  if (maxHealth <= 0) {
    return 0
  }

  const fillRatio = clamp(currentHealth / maxHealth, 0, 1)
  return barWidth * fillRatio
}
