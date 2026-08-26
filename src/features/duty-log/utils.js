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

// 실제 보유 기체 등록부호 — /flights 응답과 같은 실기체다
export const AIRCRAFT_REGS = ['HL5264', 'HL5263']

export const NW_TYPE = {
  NRC: { bg: '#FBE4EA', tx: '#B23E5C' },
  'W/O': { bg: '#D4E7F7', tx: '#1C6DA6' },
}

export const NW_ST = {
  OPEN: { c: '#C97A17', b: '#FBEFD9' },
  CLOSE: { c: '#1F9D6B', b: '#E6F5EE' },
}

// NRC·W/O 목록 — 백엔드(work_order)가 아직 없어 화면 상태로만 산다.
// reg: 등록일, close: 종결일 (CLOSE 전환 시 자동 기록), who: 작업자 표시("대표자 등 N명")
export const INITIAL_NRC_WO = []
