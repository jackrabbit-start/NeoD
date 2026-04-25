import type { WeaponDefinition, WeaponId } from '../domain/types.js'

export const WEAPON_DEFINITIONS: Record<WeaponId, WeaponDefinition> = {
  'starter-blaster': {
    id: 'starter-blaster',
    name: '기본 블래스터',
    description: '초반 웨이브를 버티기 위한 안정적인 저위력 사격입니다.',
    damage: 12,
    fireRateMs: 280,
    projectileSpeed: 460,
    projectileTint: 0xf8fafc,
  },
  'acid-sprayer': {
    id: 'acid-sprayer',
    name: '산성 분사기',
    description: '불안정한 슬라임 산으로 구동되는 고화력 무기입니다.',
    damage: 20,
    fireRateMs: 230,
    projectileSpeed: 500,
    projectileTint: 0xc1ff72,
  },
  'frost-lance': {
    id: 'frost-lance',
    name: '서리 랜스',
    description: '빠른 탄속으로 꿰뚫는 연사를 퍼붓는 무기입니다.',
    damage: 18,
    fireRateMs: 190,
    projectileSpeed: 620,
    projectileTint: 0x9ce7ff,
  },
  'storm-cannon': {
    id: 'storm-cannon',
    name: '폭풍 캐넌',
    description: '균형 잡힌 에너지로 빚어낸 묵직한 혼합 무기입니다.',
    damage: 28,
    fireRateMs: 210,
    projectileSpeed: 560,
    projectileTint: 0xd4b5ff,
  },
  'arc-loom': {
    id: 'arc-loom',
    name: '아크 룸',
    description: '정전기 파동을 엮어 빠른 연쇄 폭발을 만들어냅니다.',
    damage: 24,
    fireRateMs: 175,
    projectileSpeed: 590,
    projectileTint: 0xffd866,
  },
}
