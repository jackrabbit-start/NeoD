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
      ? '크라운 슬라임을 쓰러뜨리고 네온 아레나를 장악했습니다.'
      : '런이 중단되었습니다. 조합 타이밍과 회피 루트를 재정비하세요.',
    backgroundColor: isWin ? '#171f3f' : '#2b1220',
    accentColor: isWin ? '#a6ffd0' : '#ff9db8',
    status: isWin ? '크라운 슬라임 격파 · 런 종료' : '전투 불능 · 런 종료',
    objective: isWin ? '클리어 완료. 전리품 기록을 확인하고 다음 런을 준비하세요.' : '장비를 다시 정비해 보스 클리어에 다시 도전하세요.',
    statLines: [
      `결과: ${isWin ? '클리어' : '실패'}`,
      `최종 무기: ${payload.weaponName}`,
      `돌파 웨이브: ${payload.wavesCleared}`,
    ],
    inventoryLines: [isWin ? '크라운 슬라임의 잔광이 아레나에 남았습니다.' : '이번 런의 기록을 정리합니다.'],
    recipeLines: ['조합 루트를 확인하고 다음 진입을 준비하세요.'],
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
