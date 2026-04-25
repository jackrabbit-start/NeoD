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

export interface RunResultRestartKeyEvent {
  code?: string
  key?: string
  keyCode?: number
  which?: number
  altKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
}

export function isRunResultRestartKey(event: RunResultRestartKeyEvent): boolean {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return false
  }

  const key = event.key?.toLowerCase()
  const legacyKeyCode = event.keyCode ?? event.which

  return event.code === 'KeyR' || key === 'r' || legacyKeyCode === 82
}

export function createRunResultPresentation(payload: RunResultPayload): RunResultPresentation {
  const isWin = payload.outcome === 'win'
  const restartPrompt = 'R 키를 눌러 새 런을 시작하세요'

  return {
    title: isWin ? '런 클리어' : '런 실패',
    subtitle: isWin
      ? '크라운 슬라임을 쓰러뜨리고 토큰 파친코 런 결과가 정리되었습니다.'
      : '런이 중단되었습니다. 토큰 보상과 무기 별 합성 루트를 다시 점검해 보세요.',
    backgroundColor: isWin ? '#171f3f' : '#2b1220',
    accentColor: isWin ? '#a6ffd0' : '#ff9db8',
    status: isWin ? '크라운 슬라임 격파 · 런 종료' : '전투 불능 · 런 종료',
    objective: isWin ? '클리어 완료. 전리품 기록을 확인하고 다음 런을 준비하세요.' : '장비를 다시 정비해 보스 클리어에 다시 도전하세요.',
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
    stageButtonLabel: '스테이지 선택',
    stageButtonDisabled: true,
    stageSelection: {
      isOpen: false,
      stages: [],
    },
    modal: {
      isOpen: false,
      items: [],
      recipes: [],
      weapons: [],
    },
  }
}
