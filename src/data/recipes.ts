import type { RecipeDefinition } from '../domain/types.js'

export const RECIPE_DEFINITIONS: RecipeDefinition[] = [
  {
    id: 'acid-sprayer-recipe',
    name: '산성 분사기',
    inputs: ['gel-shard', 'acid-core'],
    outputWeaponId: 'acid-sprayer',
    note: '안정적인 슬라임 물질을 부식성 화력으로 바꿉니다.',
  },
  {
    id: 'frost-lance-recipe',
    name: '서리 랜스',
    inputs: ['gel-shard', 'frost-mote'],
    outputWeaponId: 'frost-lance',
    note: '얼어붙은 에너지를 빠르고 정밀한 무기로 끌어냅니다.',
  },
  {
    id: 'storm-cannon-recipe',
    name: '폭풍 캐넌',
    inputs: ['acid-core', 'frost-mote'],
    outputWeaponId: 'storm-cannon',
    note: '불안정한 산성과 서리를 결합해 더 강한 혼합 무기를 만듭니다.',
  },
  {
    id: 'arc-loom-recipe',
    name: '아크 룸',
    inputs: ['spark-knot', 'mist-bead'],
    outputWeaponId: 'arc-loom',
    note: '밝은 전하와 차가운 안개를 엮어 더 빠른 격자형 무기를 만듭니다.',
  },
]
