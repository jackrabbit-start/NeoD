export const GAME_TITLE = '달려라 김동성!'


export const KIM_COMMUNITY_NARRATIONS = [
  '김동성 근황) 오늘도 파친코 앞에서 달리기 연습 중이라 함',
  '목격담: 토큰 소리만 나면 뛰던 사람이 이제는 출구 쪽으로 뛴다',
  '빚쟁이보다 빠르면 인생도 리셋된다는 김동성식 공략법',
] as const

export const GAME_HEADER_CONTROL_HINTS = ['WASD 이동', 'J 대시', 'I 인벤토리', 'Q 코덱스'] as const

export const GAMEPLAY_CONTROL_TIP = `${GAME_HEADER_CONTROL_HINTS.join(
  ' · ',
)} · 자동 사격 · 레벨업 패시브 카드 · 토큰 자동 투입 · 무기 3개 자동 합성 · 스테이지 선택 · 끝까지 버티기`
