import type { HudState, RunEndReason } from '../domain/types.js'
import { formatRunTime } from './runProgression.js'

export type RunOutcome = 'win' | 'loss'

export interface RunResultPayload {
  outcome: RunOutcome
  weaponName: string
  elapsedMs: number
  stageReachedLabel: string
  finaleReached: boolean
  endReason?: RunEndReason
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
  const isTimeout = payload.endReason === 'timeout'
  const restartPrompt = '다시 달려라! 버튼을 눌러 시작 화면으로 돌아가세요'

  return {
    title: isWin ? '런 클리어' : isTimeout ? '시간 종료' : '런 실패',
    subtitle: isWin
      ? '크라운 슬라임을 넘어 김동성의 추격 끝에서 살아남아 30분 생존 기록을 완성했습니다.'
      : isTimeout
        ? '30:00까지 버텼지만 마지막 추격 결전을 끝내지 못했습니다.'
        : '추격에서 밀려 생존 런이 중단되었습니다. 무기 루트와 회피 타이밍을 다시 점검하세요.',
    backgroundColor: isWin ? '#171f3f' : '#2b1220',
    accentColor: isWin ? '#a6ffd0' : '#ff9db8',
    status: isWin
      ? '최종 추격 돌파 · 런 종료'
      : isTimeout
        ? '30:00 타임아웃 · 런 종료'
        : '생존 실패 · 런 종료',
    objective: isWin
      ? '클리어 완료. 살아남은 빌드를 확인하고 다음 추격 런을 준비하세요.'
      : isTimeout
        ? '다음 런에서는 25:00 이후 최종 추격 결전을 더 빨리 끝내세요.'
        : '장비와 회피 루트를 다시 정비해 더 오래 살아남기에 다시 도전하세요.',
    statLines: [
      `결과: ${isWin ? '클리어' : isTimeout ? '시간 종료' : '실패'}`,
      `최종 무기: ${payload.weaponName}`,
      `생존 시간: ${formatRunTime(payload.elapsedMs)}`,
      `도달 단계: ${payload.stageReachedLabel}`,
      `피날레 진입: ${payload.finaleReached ? '예' : '아니오'}`,
    ],
    inventoryLines: [isWin ? '보스는 추가 토큰을 주지 않고 클리어를 확정합니다.' : '미해결 토큰은 런 종료와 함께 정리됩니다.'],
    recipeLines: ['같은 무기·같은 별 3개 자동 합성으로 다음 별 등급을 노리는 루프입니다.'],
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
    passives: ['런 종료 후 패시브는 초기화됩니다.'],
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
    passiveSelection: {
      isOpen: false,
      level: 1,
      choices: [],
    },
    modal: {
      isOpen: false,
      items: [],
      recipes: [],
      weapons: [],
      characterStats: [],
    },
  }
}
