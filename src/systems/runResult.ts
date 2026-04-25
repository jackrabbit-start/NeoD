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
      ? '크라운 슬라임을 쓰러뜨렸습니다. 결과 화면이 정상적으로 표시되었습니다.'
      : '런이 중간에 종료되었습니다. 조합과 회피 루트를 다시 점검해 보세요.',
    backgroundColor: isWin ? '#171f3f' : '#2b1220',
    accentColor: isWin ? '#a6ffd0' : '#ff9db8',
    status: isWin ? '보스 처치 확인 · 런 종료' : '플레이어 전투 불능 · 런 종료',
    objective: isWin ? '클리어 완료. 결과를 확인한 뒤 재시작할 수 있습니다.' : '다시 도전해 보스 클리어를 노리세요.',
    statLines: [
      `결과: ${isWin ? '클리어' : '실패'}`,
      `최종 무기: ${payload.weaponName}`,
      `돌파 웨이브: ${payload.wavesCleared}`,
    ],
    inventoryLines: [isWin ? '보스 처치 보상 연출은 아직 추가하지 않습니다.' : '새 보상 없이 현재 런을 종료합니다.'],
    recipeLines: ['새 해금/보상 없이 기존 조합 루프를 유지합니다.'],
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
