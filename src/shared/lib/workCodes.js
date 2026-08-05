// 근무 코드 정의 + 임시 데이터 — 클로드 디자인 "정비본부 월간 스케줄 (화면)" 기준.
// 백엔드 연동 전까지 디자인의 데모 로스터/스케줄 생성 로직을 그대로 사용한다.

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

export const TEAMS = ['정비기획팀', '정비기술팀', '정비품질팀', '정비자재팀', '운항정비팀']

// 임시 로스터 (디자인 데모 데이터)
export const ROSTER = [
  { team: '정비기획팀', name: '김기홍', role: '사원' },
  { team: '정비기술팀', name: '김경목', role: '팀장' },
  { team: '정비기술팀', name: '현은솔', role: '대리' },
  { team: '정비품질팀', name: '서강윤', role: '팀장' },
  { team: '정비품질팀', name: '김정은', role: '사원' },
  { team: '정비자재팀', name: '간성진', role: '팀장' },
  { team: '정비자재팀', name: '박종진', role: '과장' },
  { team: '정비자재팀', name: '이신행', role: '사원' },
  { team: '운항정비팀', name: '차면규', role: '팀장' },
  { team: '운항정비팀', name: '문지환', role: '과장' },
  { team: '운항정비팀', name: '김찬수', role: '대리' },
  { team: '운항정비팀', name: '이서용', role: '사원' },
  { team: '운항정비팀', name: '김동민', role: '사원' },
  { team: '운항정비팀', name: '오명열', role: '사원' },
  { team: '운항정비팀', name: '오정훈', role: '사원' },
  { team: '운항정비팀', name: '김성은', role: '사원' },
]

// 결정적 의사난수 — 같은 (사람, 날짜)면 항상 같은 코드가 나온다 (디자인 로직 그대로)
const hfrac = (a, b) => {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return v - Math.floor(v)
}

const HCATS = ['D', 'M', 'N', 'T', 'O']
const CODE_POOL = { D: ['D1', 'D2', 'D3'], M: ['M1', 'M2'], N: ['N1', 'N2', 'N3', 'MN'], T: ['T1', 'T2'], O: ['OFF', 'RO'] }

// pi(로스터 인덱스), d(일), dow(요일) → 근무코드
export function pickCode(pi, d, dow) {
  let group
  if ((dow === 0 || dow === 6) && hfrac(pi, d) < 0.6) group = 'O'
  else if (hfrac(pi + 3, d * 2) < 0.12) group = 'O'
  else group = HCATS[Math.floor(hfrac(pi, d) * 4)]
  const pool = CODE_POOL[group]
  return pool[Math.floor(hfrac(pi + 5, d * 3) * pool.length)]
}

const pad = (n) => String(n % 24).padStart(2, '0')

// 코드 → 표시용 시간 문자열
export function codeTime(code) {
  const tt = TIMES[code]
  if (!tt) return '전일'
  return `${pad(tt[0])}:00 – ${pad(tt[1])}:00`
}
