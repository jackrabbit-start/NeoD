import { ENEMY_DEFINITIONS } from '../data/enemies.js'
import type { CodexState } from '../domain/types.js'
import { getEnemyBehaviorSummary } from './enemyBehaviors.js'
import { getEnemyTokenSummary } from './pachinkoRewards.js'

export function getCodexState(isOpen: boolean): CodexState {
  return {
    isOpen,
    title: '현장 코덱스',
    subtitle: '공유 데이터 보기 · Q로 닫기',
    hint: '현재 런의 보상 루프는 토큰 파친코 + 별 합성 + 레벨업 패시브 카드 선택을 사용합니다.',
    items: [],
    recipes: [],
    enemies: Object.values(ENEMY_DEFINITIONS).map((enemy) => ({
      id: enemy.id,
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
