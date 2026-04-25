import type { ItemDefinition, LootId } from '../domain/types.js'

export const ITEM_DEFINITIONS = {
  'gel-shard': {
    id: 'gel-shard',
    name: '젤 파편',
    description: '결속 핵으로 쓰이는 안정적인 슬라임 조각입니다.',
    color: 0x7dffb0,
    textureKey: 'gel-shard',
  },
  'acid-core': {
    id: 'acid-core',
    name: '산성 코어',
    description: '타격 피해를 끌어올리는 부식성 잔여물입니다.',
    color: 0xb4ff5e,
    textureKey: 'acid-core',
  },
  'frost-mote': {
    id: 'frost-mote',
    name: '서리 입자',
    description: '투사체의 집중력을 높여 주는 차가운 정수입니다.',
    color: 0x83d5ff,
    textureKey: 'frost-mote',
  },
  'spark-knot': {
    id: 'spark-knot',
    name: '불꽃 매듭',
    description: '전하를 머금은 슬라임 섬유가 뒤엉킨 밝은 덩어리입니다.',
    color: 0xffd866,
    textureKey: 'spark-knot',
  },
  'mist-bead': {
    id: 'mist-bead',
    name: '안개 구슬',
    description: '불안정한 반응을 안정시키는 차가운 물방울입니다.',
    color: 0xc4f1ff,
    textureKey: 'mist-bead',
  },
} as const satisfies Record<LootId, ItemDefinition>
