# Deep Interview Spec — Enemy spacing + overhead health bars

## Metadata
- Profile: standard
- Rounds: 3
- Final ambiguity: 0.173
- Threshold: 0.20
- Context type: brownfield
- Context snapshot: `.omx/context/enemy-spacing-healthbar-placeholder-art-20260423T135812Z.md`
- Transcript: generated in `.omx/interviews/`

## Prompt-safe initial-context summary
- Status: not_needed

## Clarity breakdown
| Dimension | Score | Notes |
| --- | --- | --- |
| Intent | 0.72 | 전투 가독성과 상태 피드백 개선이 목적이다. |
| Outcome | 0.88 | 적 비중첩 + 적 상단 체력바 + placeholder 유지가 명시되었다. |
| Scope | 0.84 | 밸런스/HUD/VFX/아트 제외와 자율결정 범위가 정리되었다. |
| Constraints | 0.90 | Phaser/Vite/TypeScript, browser-first, V1 경량 범위 유지. |
| Success | 0.82 | 핵심 성공 기준은 “적이 포개져 보이지 않는 것”이다. |
| Context | 0.86 | 현 scene 구조와 적 상태 관리 방식이 확인되었다. |

## Intent
- 전투 중 적이 한 지점에 뭉쳐 보이지 않도록 해서 플레이 가독성을 높인다.
- 각 적의 현재 체력을 적 바로 위에서 빠르게 읽을 수 있게 한다.

## Desired Outcome
- 적들은 전투 중 서로 겹쳐 한 점처럼 보이지 않는다.
- 각 적 머리 위에 빨간 체력바가 표시되고, 검은 배경 바가 함께 깔린다.
- 적 이미지는 이번 변경에 포함하지 않고 현재 placeholder-safe 비주얼을 유지한다.

## In Scope
- 적-적 비중첩을 위한 1차 구현
- 적 개별 체력바 표시
- 보스를 포함한 모든 적 상시 체력바 표시 여부 및 바 크기/오프셋의 구체화
- 현재 Phaser scene 구조 안에서의 최소한의 렌더/업데이트 변경

## Out of Scope / Non-goals
- 적 아트/스프라이트 추가
- 웨이브/난이도 밸런스 조정
- 플레이어 HUD 레이아웃 변경
- 피격 이펙트/사운드 추가

## Decision Boundaries
- OMX may decide without further confirmation:
  - 적들이 “겹치지 않게 보이도록” 만드는 1차 방식(간단한 물리 분리/충돌 또는 동등한 최소 구현)
  - 체력바의 정확한 폭/높이/오프셋/업데이트 방식
  - 보스를 포함한 모든 적에 상시 체력바를 적용하는 구체 표현
- Must preserve:
  - placeholder-safe art 유지
  - 현재 HUD/밸런스/VFX 범위 비침범
  - 1차 성공 기준에서 적이 포개져 보이지 않는 경험 우선

## Constraints
- No new dependencies
- Browser-first Phaser prototype 유지
- 변경은 작고 가역적이어야 한다
- 기존 V1 safe-fiction / placeholder-safe 방향 유지

## Testable Acceptance Criteria
- 여러 적이 동시에 플레이어를 추적할 때 서로 완전히 같은 위치에 포개져 보이지 않는다.
- 일반 적과 보스 모두 적 머리 위에 빨간 체력바와 검은 배경 바가 보인다.
- 체력바 길이는 현재 체력 비율에 맞게 줄어든다.
- 적 아트 추가 없이 현재 placeholder 비주얼로도 체력 상태를 읽을 수 있다.
- 웨이브 밸런스, HUD, VFX/SFX 동작은 이번 변경으로 확장되지 않는다.

## Assumptions exposed + resolutions
- Assumption: 사용자는 세부 구현 방식보다 결과(비중첩 + 체력 가독성)를 원한다.
  - Resolution: 1차 구현 세부는 OMX에 위임하기로 합의.
- Assumption: 둘 중 하나를 먼저 맞춰야 한다면 겹침 방지가 더 중요하다.
  - Resolution: 사용자가 “spacing-is-primary” 를 선택해 우선순위를 명시.

## Pressure-pass findings
- 라운드 2의 자율 위임 답변을 라운드 3에서 재검증했다.
- 결과적으로, 체력바 디테일보다 “적이 포개져 보이지 않는 것”이 핵심 성공 기준으로 잠겼다.

## Brownfield evidence vs inference
- Evidence:
  - `src/scenes/ArenaScene.ts` 에 적 상태와 체력 감소 로직이 있다.
  - 개별 적 체력바/적-적 분리 로직은 현재 없다.
- Inference:
  - 적 분리와 체력바 모두 `ArenaScene` 내부 헬퍼 확장으로 처리하는 것이 가장 작은 diff 일 가능성이 높다.

## Technical context findings
- `EnemyEntity` 는 현재 `sprite`, `config`, `currentHealth`, `lastHitAt` 를 가진다.
- 적 생성은 `spawnEnemy`, 이동은 `updateEnemies`, 피격 처리는 `damageEnemy`, 정리는 `cleanupDestroyedEntities` 가 담당한다.
- 적 정의는 `src/data/enemies.ts` 에 있고 크기/체력 정보가 이미 존재한다.

## Follow-up note
- 사용자는 제외 범위 목록을 git repo issue 로 정리해두길 원했다. 이는 구현과 별개의 후속 작업 후보로 유지한다.

## Condensed transcript
1. 이번 1차에서 아트/밸런스/HUD/VFX-SFX 는 제외.
2. 겹침 방지 방식, 체력바 세부 규칙, 보스 포함 여부는 OMX 자율 결정 가능.
3. 트레이드오프가 생기면 “적이 포개져 보이지 않음”을 최우선 성공 기준으로 본다.
