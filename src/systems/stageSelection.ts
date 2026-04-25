import { getRunStageSelectionViews, getRunStageStartElapsedMs } from './runProgression.js'

export { getRunStageSelectionViews as getStageSelectionViews }


export function getStageSelectionStartElapsedMs(stageIndex: number): number | null {
  return getRunStageStartElapsedMs(stageIndex)
}
