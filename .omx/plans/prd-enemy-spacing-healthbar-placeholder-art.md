# PRD: Enemy Spacing + Overhead Health Bars

## Status

- Mode: `ralplan --consensus`
- Planning state: approved
- Source of truth:
  - `.omx/specs/deep-interview-enemy-spacing-healthbar-placeholder-art.md`
  - `.omx/interviews/enemy-spacing-healthbar-placeholder-art-20260423T140303Z.md`
  - `.omx/context/enemy-spacing-healthbar-placeholder-art-20260423T135812Z.md`
  - `src/scenes/ArenaScene.ts`
  - `src/data/enemies.ts`
  - `src/domain/types.ts`

## Requirements Summary

현재 Phaser 브라우저 프로토타입에서 적이 전투 중 한 점처럼 포개져 보이지 않도록 만들고, 모든 적(일반 적 + 보스) 머리 위에 검은 배경 + 빨간 체력바를 표시한다. 이번 변경은 placeholder-safe 범위 안에서 작고 가역적인 brownfield 수정으로 유지한다.

## Problem Statement

`ArenaScene` 는 적을 `EnemyEntity[]` 로 직접 관리하고, 각 적은 플레이어를 향해 매 프레임 이동한다. 하지만 적-적 분리 경로가 없고 개별 적 체력 UI 도 없어, 몰려오는 적 수와 피격 상태를 즉시 읽기 어렵다.

### Evidence

- `src/scenes/ArenaScene.ts` 는 `EnemyEntity[]` 에 `sprite`, `config`, `currentHealth`, `lastHitAt` 를 보관한다.
- `spawnEnemy` 는 `physics.add.image(...)` 와 `setCircle(config.size / 2)` 를 사용하지만 적-적 분리 처리는 없다.
- `damageEnemy` 는 체력을 줄이지만 적 머리 위 체력바는 없다.
- `src/data/enemies.ts` 는 적 크기(`size`)와 최대 체력(`maxHealth`)를 이미 제공한다.

### Inference

- 가장 작은 diff 는 새 시스템 추출보다 `ArenaScene` 내부 책임을 약간 넓혀 적 분리와 월드-스페이스 체력바를 함께 관리하는 방식이다.

## Desired Outcome

1. 여러 적이 플레이어를 추적해도 전투 중 완전히 같은 위치에 포개져 보이지 않는다.
2. 슬라임과 보스 모두 머리 위에 검은 배경 + 빨간 체력바를 항상 표시한다.
3. 체력바 fill 은 `currentHealth / maxHealth` 에 맞춰 즉시 줄어든다.
4. 적이 죽거나 정리될 때 연결된 체력바 오브젝트도 함께 제거된다.
5. 적 아트, HUD, VFX/SFX, 웨이브 밸런스 범위는 건드리지 않는다.

## RALPLAN-DR Summary

### Principles

1. **Spacing first:** 체력바 디테일보다 “적이 포개져 보이지 않음”을 우선한다.
2. **Small brownfield diff:** 새 서브시스템보다 scene-local 변경을 우선한다.
3. **Placeholder-safe:** 아트/HUD/VFX/밸런스 확장을 금지한다.
4. **Reuse existing data:** 체력바 크기/오프셋은 기존 `size` 기반으로 계산하고, 체력 비율만 `maxHealth` 를 사용한다.
5. **Reversible by default:** 튜닝이나 롤백이 쉬운 구조를 유지한다.

### Decision Drivers

1. 적이 한 점처럼 겹쳐 보이지 않아야 한다.
2. 현재 Phaser Arcade + `ArenaScene` 구조에 자연스럽게 맞아야 한다.
3. 새 의존성 없이 작은 범위로 끝나야 한다.

### Viable Options

#### Option A — Scene-local Arcade separation + per-enemy bars

- 접근: 적 sprite 를 scene-local physics group 에 넣고 same-group collider 기반 분리를 켠다. 각 `EnemyEntity` 가 자신의 health-bar background/fill refs 를 소유한다.
- Pros:
  - 현재 `physics.add.image` 기반 구조와 가장 잘 맞는다.
  - diff 가 가장 작다.
  - 기존 `size` 원형 body 를 그대로 활용할 수 있다.
- Cons:
  - `ArenaScene` 책임이 조금 늘어난다.
  - collider 감각은 약간의 튜닝이 필요할 수 있다.

#### Option B — Scene-local manual repulsion + per-enemy bars

- 접근: 현재 추적 이동은 유지하고, update loop 에 커스텀 밀어내기 계산을 추가한다.
- Pros:
  - 시각적으로 “더 벌어져 보이게” 직접 제어하기 쉽다.
- Cons:
  - hot loop 에 bespoke 수학이 늘어난다.
  - 진동/불안정성 위험이 있다.
  - 현재 Arcade usage 와의 일관성이 약하다.

### Recommended Option

Option A.

### Invalidation Rationale

- Option B 는 가능하지만, 현재 코드가 이미 Arcade bodies 를 사용하므로 첫 패스에서 커스텀 repulsion 을 넣는 것은 불필요한 전용 로직 증가다.
- 적 렌더/충돌 서브시스템 추출은 이번 요청의 “작고 가역적” 범위를 넘는다.

## Scope

### In Scope

- 1차 적 anti-overlap 처리
- 슬라임 + 보스 overhead health bar
- create/update/destroy lifecycle 을 위한 최소 scene-local ownership 확장

### Out of Scope

- 적 아트/스프라이트 추가
- 웨이브/난이도/수치 밸런스 조정
- 플레이어 HUD 개편
- 피격 이펙트/사운드 추가
- 대규모 렌더/전투 아키텍처 리팩터

## Acceptance Criteria

1. 여러 적이 동시에 추적할 때 완전히 하나의 blob 처럼 겹쳐 보이지 않는다.
2. 슬라임과 보스 모두 머리 위에 검은 배경 + 빨간 fill 체력바를 가진다.
3. 체력 감소 직후 체력바 fill 이 줄고, 이동 중에도 정렬이 유지된다.
4. 적 사망/cleanup 시 체력바 잔상이 남지 않는다.
5. combine pause/freeze 동작은 깨지지 않는다.
6. 새 dependency 또는 out-of-scope 변경이 추가되지 않는다.

## Brownfield Technical Shape

### Primary Touchpoints

- `src/scenes/ArenaScene.ts`
- `src/data/enemies.ts` (기본적으로 read-only)
- `src/domain/types.ts` (정말 필요할 때만 최소 타입 추가)

### Ownership Model

- `EnemyEntity[]` 는 계속 gameplay truth 로 유지한다.
- 각 `EnemyEntity` 는 scene-local bar refs 를 소유한다.
- bar refs 는 `spawnEnemy` 에서 생성되고:
  - position sync: enemy update/render sync 단계에서 처리
  - fill sync: damage 후 즉시 반영
  - destroy: death path + cleanup guard 둘 다에서 처리

### Separation Mechanism

- enemy sprite 를 scene-local physics group 으로 묶는다.
- same-group collider/separation 을 켜서 기존 circular body 기반으로 적-적 겹침을 완화한다.
- chase velocity 는 유지하되, 목표는 “완벽한 군집 AI” 가 아니라 “보기에 포개지지 않음”이다.

### Health-Bar Geometry Rule

- width / offset: `config.size` 기반 계산 + 소형/대형 clamp
- height: 작고 읽기 쉬운 고정 또는 clamp 기반 값
- fill ratio: `currentHealth / config.maxHealth`
- boss 특이값은 기본 규칙으로 충분하지 않을 때만 최소 override 허용

## Implementation Plan

### Step 1 — Confirm hooks and protect scope

- `ArenaScene` 의 spawn / movement / damage / cleanup 경로를 유지한다.
- scene-local ownership 밖으로 범위를 넓히지 않는다.

### Step 2 — Wire scene-local enemy separation

- enemy physics group 을 도입한다.
- enemy sprite 를 group 에 등록하고 same-group collision/separation 을 활성화한다.
- 현재 chase movement 와 충돌 없이 작동하도록 최소 튜닝만 한다.

### Step 3 — Add per-enemy overhead bar lifecycle

- 각 적 spawn 시 background/fill bar 를 생성한다.
- 이동 중 위치를 따라가게 하고, damage 시 fill 비율을 즉시 갱신한다.

### Step 4 — Make cleanup explicit

- death path 에서 sprite 와 bars 를 함께 정리한다.
- `cleanupDestroyedEntities` 도 bars orphan 방지 guard 역할을 하게 한다.

### Step 5 — Keep the diff data-light

- 가능한 한 `src/data/enemies.ts` 변경 없이 `size` 기반 규칙으로 처리한다.
- boss 가독성이 실제로 부족할 때만 최소 metadata 추가를 검토한다.

### Step 6 — Verify against the deep-interview contract

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- 브라우저 수동 확인

## Risks And Mitigations

- **Collider jitter**
  - Mitigation: 시각적 비중첩을 만족하는 보수적 튜닝을 우선한다.
- **Bar drift / orphan**
  - Mitigation: `EnemyEntity` ownership 에 bar refs 를 명시하고 death + cleanup 양쪽에서 제거한다.
- **Scene complexity creep**
  - Mitigation: 헬퍼를 scene-local 로 유지하고 새 서브시스템 추출은 미룬다.
- **Boss readability mismatch**
  - Mitigation: `size` 기반 clamp 로 시작하고, 필요 시 최소 boss override 만 허용한다.

## Verification Plan

### Static / Regression

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

### Manual Browser Checks

1. 다수 슬라임 추적 시 한 점처럼 뭉쳐 보이지 않는지 확인
2. 슬라임 체력 감소 시 머리 위 검정/빨강 바가 즉시 줄어드는지 확인
3. 보스 이동/피격 tween 중에도 bar 정렬이 유지되는지 확인
4. 적 사망 시 bar 가 함께 사라지는지 확인
5. combine freeze 동안 분리/바 갱신이 pause 동작을 깨지 않는지 확인
6. HUD 개편/아트 추가/밸런스 조정/VFX-SFX 추가가 섞이지 않았는지 확인

## ADR

### Decision

`ArenaScene` 중심의 small brownfield change 로 적-적 Arcade separation 과 per-enemy world-space health bars 를 함께 구현한다.

### Drivers

- spacing-first 성공 기준
- 기존 scene ownership 과의 정합성
- dependency-free / reversible diff 요구

### Alternatives Considered

- manual repulsion
- 더 큰 enemy presentation / collision subsystem 추출

### Why Chosen

현재 코드에 가장 자연스럽고, 가장 작은 변경으로 핵심 문제를 해결할 가능성이 높다.

### Consequences

- `ArenaScene` 책임이 조금 늘어난다.
- collider feel 튜닝이 약간 필요할 수 있다.
- shared data/type 확장은 optional 로 남긴다.

### Follow-ups

- 적 연출/표현이 더 커지면 이후 helper 추출을 재검토한다.
- deferred non-goals(아트, 밸런스, HUD, VFX/SFX)는 별도 후속 작업으로 유지한다.

## Execution Handoff

### Available Agent Types

- `executor`: 구현
- `architect`: 설계 확인 / 트레이드오프 점검
- `test-engineer`: 테스트 전략 / 검증 보강
- `verifier`: 완료 증거 검토
- `explore`: repo-local 코드 맵 확인

### Suggested Reasoning by Lane

- `executor`: high
- `architect`: high
- `test-engineer`: medium
- `verifier`: high
- `explore`: low

### Ralph Staffing Guidance

- 단일 owner 가 `ArenaScene` 중심으로 수정 → 테스트 → 수동 검증까지 순차 수행하기에 적합하다.
- 추천 when:
  - write set 이 거의 `src/scenes/ArenaScene.ts` 로 제한될 때
  - 수동 브라우저 검증을 leader 가 직접 통합하고 싶을 때

### Team Staffing Guidance

- Lane 1 (`executor`): `ArenaScene` separation + bar lifecycle 구현
- Lane 2 (`test-engineer` or `verifier`): verification checklist, regression 확인, 수동 확인 포인트 정리
- Lane 3 (`architect`, optional): 과도한 scene complexity 여부 점검

### Launch Hints

- Sequential execution: `$ralph enemy spacing + overhead health bars implementation from approved prd`
- Team execution: `$team implement approved enemy spacing + health-bar plan`
- Shell form: `omx team "Implement approved enemy spacing + health-bar plan in NeoD"`

### Concrete Team Verification Path

1. `executor` 가 구현 후 `pnpm typecheck`, `pnpm test`, `pnpm build`
2. `verifier` 가 changed-file scope 와 acceptance criteria 매핑 점검
3. 수동 브라우저 확인:
   - multi-slime spacing
   - slime bar fill
   - boss bar readability
   - death cleanup
   - combine freeze regression
4. leader 가 out-of-scope 침범 여부 최종 판정
