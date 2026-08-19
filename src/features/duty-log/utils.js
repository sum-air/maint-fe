// 업무일지 — 카테고리 대분류 정의 + 임시 데이터 (백엔드 연동 전 데모)

// 대분류별 카테고리 + 색 (뮤트 톤 — 근무코드 CAT 팔레트 문법)
// 모든 대분류에는 '기타'가 항상 추가되고, 기타 선택 시 내용 입력이 필수다.
export const CAT_GROUPS = [
  { label: '정비작업', bg: '#D4E7F7', tx: '#1C6DA6', cats: ['PR', 'TR', 'PO', 'W/O', 'NRC'] },
  { label: '탑승정비', bg: '#FBE4EA', tx: '#B23E5C', cats: ['Travel', '탑승수속', '하기수속'] },
  { label: '서류작업', bg: '#E0DDF7', tx: '#4A3FB0', cats: ['AMOS 입력', '서류작성', '매뉴얼 검토'] },
  { label: '지원업무', bg: '#E6EDF2', tx: '#45697E', cats: ['공구관리', '자재관리', 'FOD', '폐기물 처리', '청소'] },
  { label: '이동 · 대기', bg: '#FBE0D0', tx: '#B5502A', cats: ['이동', '대기'] },
  { label: '차량 · 장비', bg: '#E4F1DE', tx: '#4C8033', cats: ['차량충전', '차량관리', 'GPU 급유'] },
  { label: '휴식 · 기타', bg: '#F1F1F4', tx: '#43434E', cats: ['휴게', '식사', '교육'] },
]
CAT_GROUPS.forEach((g) => g.cats.push('기타'))

const pad = (n) => String(n).padStart(2, '0')

// 오늘 기준 offset 일의 "MM.DD" 키
export const dayKey = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

export const todayKey = () => dayKey(0)

export const nowHM = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// "MM.DD" → "8월 12일(수)" (올해 기준)
export const fmtDate = (key) => {
  const [m, d] = key.split('.').map(Number)
  const w = ['일', '월', '화', '수', '목', '금', '토'][new Date(new Date().getFullYear(), m - 1, d).getDay()]
  return `${m}월 ${d}일(${w})`
}

// 날짜별 일지 임시 데이터 — { "MM.DD": [{ s, e, gi, c, t }] }
// gi: CAT_GROUPS 인덱스, e 가 빈 값이면 "진행 중"
export const DEMO_LOGS = {
  [todayKey()]: [
    { s: '09:00', e: '09:30', gi: 6, c: '교육', t: '팀 아침 회의 · 안전 브리핑' },
    { s: '09:30', e: '11:00', gi: 0, c: 'W/O', t: 'HL5264 W/O 작성 및 발행' },
    { s: '11:00', e: '12:00', gi: 2, c: 'AMOS 입력', t: '' },
    { s: '13:00', e: '14:00', gi: 6, c: '식사', t: '' },
  ],
  [dayKey(-1)]: [
    { s: '09:00', e: '10:30', gi: 2, c: '서류작성', t: '주간 정비 보고 초안' },
    { s: '10:30', e: '11:30', gi: 4, c: '이동', t: '' },
    { s: '14:00', e: '15:00', gi: 3, c: '자재관리', t: '부품 입고 검수' },
  ],
  [dayKey(-2)]: [
    { s: '09:00', e: '09:30', gi: 6, c: '교육', t: '주간 안전 교육' },
    { s: '10:00', e: '12:00', gi: 0, c: 'PR', t: 'HL5263 PR 수행' },
    { s: '14:00', e: '15:00', gi: 3, c: '공구관리', t: '' },
  ],
  [dayKey(-3)]: [
    { s: '09:30', e: '10:30', gi: 1, c: '탑승수속', t: 'XU2591 탑승 지원' },
    { s: '11:00', e: '12:00', gi: 4, c: '이동', t: '' },
    { s: '13:30', e: '15:30', gi: 0, c: 'NRC', t: 'NRC-0228 후속 조치' },
  ],
  [dayKey(-4)]: [
    { s: '09:30', e: '11:00', gi: 2, c: '매뉴얼 검토', t: 'AMM 개정 확인' },
    { s: '13:30', e: '14:00', gi: 5, c: '차량충전', t: '' },
  ],
  [dayKey(-5)]: [
    { s: '08:30', e: '09:00', gi: 6, c: '휴게', t: '' },
    { s: '09:00', e: '11:30', gi: 0, c: 'W/O', t: 'W/O-2508-007 작업 지원' },
    { s: '14:00', e: '16:00', gi: 2, c: '서류작성', t: '월간 보고 자료' },
  ],
  [dayKey(-6)]: [
    { s: '10:00', e: '11:00', gi: 3, c: '자재관리', t: '부품 재고 실사' },
    { s: '13:00', e: '14:30', gi: 5, c: 'GPU 급유', t: '' },
  ],
  [dayKey(-7)]: [
    { s: '09:00', e: '10:00', gi: 1, c: 'Travel', t: '' },
    { s: '10:30', e: '12:00', gi: 0, c: 'TR', t: 'HL5264 TR 처리' },
    { s: '15:00', e: '16:00', gi: 6, c: '교육', t: '신입 OJT 지원' },
  ],
}

// 다른 사람 일지 데모 — 같은 (이름, 날짜)면 항상 같은 기록이 나온다.
// 백엔드 연동 시 해당 인원의 일지 조회 API 로 교체한다.
const OTHER_POOL = [
  { s: '09:00', e: '09:30', gi: 6, c: '교육', t: '팀 아침 회의' },
  { s: '09:30', e: '10:30', gi: 0, c: 'PR', t: '' },
  { s: '10:30', e: '11:30', gi: 2, c: 'AMOS 입력', t: '검사 기록 입력' },
  { s: '11:30', e: '12:00', gi: 4, c: '이동', t: '' },
  { s: '13:00', e: '14:00', gi: 6, c: '식사', t: '' },
  { s: '14:00', e: '15:30', gi: 0, c: 'W/O', t: 'W/O 작업 지원' },
  { s: '15:30', e: '16:30', gi: 3, c: '공구관리', t: '' },
  { s: '16:30', e: '17:30', gi: 2, c: '서류작성', t: '일일 정비 보고' },
]

export const demoLogsFor = (name, key) => {
  let h = 0
  for (const ch of name + key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const n = 2 + (h % 3)
  const start = h % (OTHER_POOL.length - n + 1)
  return OTHER_POOL.slice(start, start + n)
}

// NRC · W/O — 타입/상태 색 + 임시 데이터 (백엔드 연동 전 데모)
export const AIRCRAFT_REGS = ['HL5264', 'HL5263']

export const NW_TYPE = {
  NRC: { bg: '#FBE4EA', tx: '#B23E5C' },
  'W/O': { bg: '#D4E7F7', tx: '#1C6DA6' },
}

export const NW_ST = {
  OPEN: { c: '#C97A17', b: '#FBEFD9' },
  CLOSE: { c: '#1F9D6B', b: '#E6F5EE' },
}

// reg: 등록일, close: 종결일 (CLOSE 전환 시 자동 기록)
export const DEMO_NRC_WO = [
  { type: 'NRC', no: 'NRC-0231', ac: 'HL5264', t: '객실 시트 트랙 마모', st: 'OPEN', reg: dayKey(-2), close: '' },
  { type: 'W/O', no: 'W/O-2508-012', ac: 'HL5264', t: 'A-Check 준비 작업', st: 'OPEN', reg: dayKey(-4), close: '' },
  { type: 'NRC', no: 'NRC-0228', ac: 'HL5263', t: '', st: 'OPEN', reg: dayKey(-5), close: '' },
  { type: 'W/O', no: 'W/O-2508-007', ac: 'HL5263', t: '좌측 MLG 타이어 교환', st: 'CLOSE', reg: dayKey(-6), close: dayKey(-1) },
  { type: 'NRC', no: 'NRC-0225', ac: 'HL5264', t: '카고 도어 씰 손상', st: 'CLOSE', reg: dayKey(-7), close: dayKey(-3) },
]

// To-do 임시 데이터 — 미완료는 체크될 때까지 매일 이월되고,
// 완료(doneAt)된 항목은 완료한 그날만 보인다 (어제 완료 건은 다음날 사라짐)
export const DEMO_TODOS = [
  { id: 1, text: '7월 시간외 집계 제출', done: true, doneAt: todayKey() },
  { id: 2, text: 'XU2583 지연 보고서 작성', done: false, doneAt: '' },
  { id: 3, text: '공구 인벤토리 확인', done: false, doneAt: '' },
  { id: 4, text: 'NRC-0231 후속 조치 확인', done: false, doneAt: '' },
  { id: 5, text: '주간 정비 회의 자료 준비', done: false, doneAt: '' },
  { id: 6, text: '차량 정기 점검 예약', done: false, doneAt: '' },
  { id: 7, text: '8월 1주차 근무표 검토', done: true, doneAt: dayKey(-1) },
]

export const DEMO_MEMO = 'SPOT 228 변경 가능성 확인\n목요일 오전 교육 일정\n김찬수 대리 인수인계 문서'
