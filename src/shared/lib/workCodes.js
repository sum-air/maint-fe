// 근무 코드 정의 — 코드 사전(시간·분류·팔레트·범례). 실데이터가 아니라 도메인 어휘다.
// 인원·근무 배정 실데이터는 shared/lib/maintRoster.js 와 shared/lib/roster.js 가 담당한다.

export const MONO = "'JetBrains Mono', ui-monospace, monospace"

// 코드별 근무 시간 [시작, 끝(24 넘으면 익일)]
export const TIMES = {
  M1: [6, 15], M2: [7, 16],
  D1: [8, 17], D2: [9, 18], D3: [10, 19],
  N1: [11, 20], N2: [12, 21], N3: [13, 22], MN: [20, 32],
  T1: [6, 15], T2: [13, 22],
}

// 코드 → 분류
export const CODE_CAT = {
  M1: 'm', M2: 'm',
  D1: 'd', D2: 'd', D3: 'd',
  N1: 'n', N2: 'n', N3: 'n', MN: 'n',
  T1: 't', T2: 't',
  OFF: 'off', RO: 'off',
  Y: 'lv', AY: 'lv', PY: 'lv',
  WS: 'ws', AS: 'ws', PS: 'ws',
  EI: 'edu', EO: 'edu', B: 'edu',
  H: 'etc', PV: 'etc', K: 'etc',
  'EC(0)': 'ec',
}

// 분류별 색 (뮤트 톤 — 코드 안내/모달용)
export const CAT = {
  m: { bg: '#FBE0D0', br: '#F2C4AC', tx: '#B5502A', dot: '#E07A4E' },
  d: { bg: '#D4E7F7', br: '#B4D3EF', tx: '#1C6DA6', dot: '#3F91D0' },
  t: { bg: '#D2EED9', br: '#ADDDB8', tx: '#1F7A45', dot: '#4FAE70' },
  n: { bg: '#E0DDF7', br: '#C7C1EE', tx: '#4A3FB0', dot: '#7A6EE0' },
  off: { bg: '#F1F1F4', br: '#D8DBE4', tx: '#43434E', dot: '#B0B0BC' },
  lv: { bg: '#FBE4EA', br: '#F3C8D3', tx: '#B23E5C', dot: '#DE6A85' },
  ws: { bg: '#E4F1DE', br: '#C6E3BC', tx: '#4C8033', dot: '#79B45E' },
  edu: { bg: '#E6EDF2', br: '#C7D8E1', tx: '#45697E', dot: '#7196AC' },
  etc: { bg: '#F0E7F5', br: '#DCC9E7', tx: '#7C469C', dot: '#A876C6' },
  ec: { bg: '#FBE3E3', br: '#F3C6C6', tx: '#B53636', dot: '#DE5151' },
}

// 히트맵 셀용 비비드 톤 (m/d/n/t 근무 분류만)
export const PAL = {
  m: ['#FBE7D4', '#C06A2E'],
  d: ['#D6E7F8', '#2C6FB0'],
  n: ['#E6E0F6', '#6A54B0'],
  t: ['#D8EEDD', '#2E8A56'],
}
export const BADGE = { m: '#D9822B', d: '#3E8FD6', n: '#7C6FD0', t: '#3E9E63' }
export const TINT = { m: '#FCF1E8', d: '#EFF5FB', n: '#F3F0FB', t: '#EDF6F0' }
export const BORDER = { m: '#F7E8D8', d: '#E0ECF7', n: '#EAE3F5', t: '#DEEEE5' }

// 근무코드 그룹 (코드 안내 범례 + 변경 모달 공용)
export const CODE_GROUPS = [
  { key: 'm', label: '조기근무', codes: [{ c: 'M1' }, { c: 'M2' }] },
  { key: 'd', label: '주간근무', codes: [{ c: 'D1' }, { c: 'D2' }, { c: 'D3' }] },
  { key: 't', label: '탑승근무', codes: [{ c: 'T1' }, { c: 'T2' }] },
  { key: 'n', label: '야간근무', codes: [{ c: 'N1' }, { c: 'N2' }, { c: 'N3' }, { c: 'MN' }] },
  { key: 'off', label: '휴무', codes: [{ c: 'OFF', t: '전일 휴무' }, { c: 'RO', t: '야간 후 휴무' }] },
  { key: 'lv', label: '연차 / 반차', codes: [{ c: 'Y', d: '연차', t: '전일' }, { c: 'AY', d: '오전 반차', t: '4시간' }, { c: 'PY', d: '오후 반차', t: '4시간' }] },
  { key: 'ws', label: '대휴', codes: [{ c: 'WS', d: '대휴', t: '전일' }, { c: 'AS', d: '오전', t: '4시간' }, { c: 'PS', d: '오후', t: '4시간' }] },
  { key: 'edu', label: '교육 / 출장', codes: [{ c: 'EI', d: '사내 교육', t: '—' }, { c: 'EO', d: '사외 교육', t: '—' }, { c: 'B', d: '출장/파견', t: '—' }] },
  { key: 'etc', label: '기타', codes: [{ c: 'H', d: '병가', t: '—' }, { c: 'PV', d: '청원/경조', t: '—' }, { c: 'K', d: '공가', t: '—' }] },
  { key: 'ec', label: '긴급', codes: [{ c: 'EC(0)', d: '긴급호출근무', t: '휴무일 호출' }] },
]

const pad = (n) => String(n % 24).padStart(2, '0')

// 코드 → 표시용 시간 문자열
export function codeTime(code) {
  const tt = TIMES[code]
  if (!tt) return '전일'
  return `${pad(tt[0])}:00 – ${pad(tt[1])}:00`
}
