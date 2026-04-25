export interface PlayerHealthBarMetrics {
  x: number
  y: number
  width: number
  height: number
  levelLabelY: number
  xpY: number
  xpWidth: number
  xpHeight: number
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export function getPlayerHealthBarMetrics(
  gameWidth: number,
  _gameHeight: number,
): PlayerHealthBarMetrics {
  const width = Math.min(240, Math.max(160, gameWidth * 0.25))
  const height = 10
  const xpHeight = 6

  return {
    x: (gameWidth - width) / 2,
    y: 22,
    width,
    height,
    levelLabelY: 38,
    xpY: 52,
    xpWidth: width,
    xpHeight,
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

export function getPlayerExperienceFillWidth(
  progressRatio: number,
  barWidth: number,
): number {
  return barWidth * clamp(progressRatio, 0, 1)
}
