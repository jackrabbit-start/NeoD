import { ENEMY_DEFINITIONS } from '../data/enemies.js'
import type { CodexState } from '../domain/types.js'
import { getEnemyBehaviorSummary } from './enemyBehaviors.js'
import { getEnemyTokenSummary } from './pachinkoRewards.js'

export function getCodexState(isOpen: boolean): CodexState {
  return {
    isOpen,
    title: '생존 코덱스',
    subtitle: '추격 정보 확인 · Q로 닫기',
    hint: '이번 생존 런은 토큰 파친코, 별 합성, 레벨업 패시브 카드로 추격 시간을 버티는 구조입니다.',
    items: [],
    recipes: [],
    enemies: Object.values(ENEMY_DEFINITIONS).map((enemy) => ({
      id: enemy.id,
      iconKey: enemy.textureKey,
      name: enemy.name,
      description: enemy.description,
      tint: enemy.tint,
      stats: [
        `체력 ${enemy.maxHealth}`,
        `속도 ${enemy.speed}`,
        `피해 ${enemy.contactDamage}`,
        getEnemyBehaviorSummary(enemy),
        getEnemyTokenSummary(enemy.id),
      ],
      drops: [],
    })),
  }
}
