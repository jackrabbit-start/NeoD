import type { HudState } from '../domain/types.js'

export type RunOutcome = 'win' | 'loss'

export interface RunResultPayload {
  outcome: RunOutcome
  weaponName: string
  wavesCleared: number
}

export interface RunResultPresentation {
  title: string
  subtitle: string
  backgroundColor: string
  accentColor: string
  status: string
  objective: string
  statLines: string[]
  inventoryLines: string[]
  recipeLines: string[]
  restartPrompt: string
}

export function createRunResultPresentation(payload: RunResultPayload): RunResultPresentation {
  const isWin = payload.outcome === 'win'
  const restartPrompt = 'R 키를 눌러 새 런을 시작하세요'

  return {
    title: isWin ? '런 클리어' : '런 실패',
    subtitle: isWin
      ? '크라운 슬라임을 쓰러뜨렸습니다. 토큰 파친코 런 결과가 정리되었습니다.'
      : '런이 중간에 종료되었습니다. 토큰 보상과 무기 별 합성 루트를 다시 점검해 보세요.',
    backgroundColor: isWin ? '#171f3f' : '#2b1220',
    accentColor: isWin ? '#a6ffd0' : '#ff9db8',
    status: isWin ? '보스 처치 확인 · 런 종료' : '플레이어 전투 불능 · 런 종료',
    objective: isWin ? '클리어 완료. 결과를 확인한 뒤 재시작할 수 있습니다.' : '다시 도전해 보스 클리어를 노리세요.',
    statLines: [
      `결과: ${isWin ? '클리어' : '실패'}`,
      `최종 무기: ${payload.weaponName}`,
      `돌파 웨이브: ${payload.wavesCleared}`,
    ],
    inventoryLines: [isWin ? '보스는 추가 토큰을 주지 않고 클리어를 확정합니다.' : '미해결 토큰은 런 종료와 함께 정리됩니다.'],
    recipeLines: ['같은 무기·같은 별 2개 합성으로 다음 별 등급을 노리는 루프입니다.'],
    restartPrompt,
  }
}

export function createRunResultHudState(payload: RunResultPayload): HudState {
  const presentation = createRunResultPresentation(payload)

  return {
    title: presentation.title,
    subtitle: presentation.subtitle,
    stats: presentation.statLines,
    inventory: presentation.inventoryLines,
    recipes: presentation.recipeLines,
    objective: presentation.objective,
    tip: presentation.restartPrompt,
    status: presentation.status,
    inventoryButtonLabel: '런 종료됨',
    inventoryButtonDisabled: true,
    modal: {
      isOpen: false,
      items: [],
      recipes: [],
      weapons: [],
    },
  }
}
