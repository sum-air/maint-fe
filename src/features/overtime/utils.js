// 시간외근무 — 상태 정의 + 임시 데이터 (클로드 디자인 "시간외근무 관리/근무자 (시안)" 기준)
// 인원은 프로젝트 공통 로스터(shared/lib/workCodes.js)와 맞췄다. 백엔드 연동 전 데모.

export const OT_ST = {
  wait: { c: '#C97A17', b: '#FBEFD9', label: '대기' },
  ok: { c: '#1F9D6B', b: '#E6F5EE', label: '승인' },
  no: { c: '#D23B3B', b: '#FBE6E6', label: '반려' },
}

// 내(김기홍) 신청 내역 — 최신순
export const MY_REQS = [
  { id: 1, date: '07.20', start: '18:00', end: '20:30', reason: '항공기 정비 지연 대응', status: 'wait' },
  { id: 2, date: '07.17', start: '17:30', end: '19:30', reason: '긴급 결함 수정', status: 'ok' },
  { id: 3, date: '07.15', start: '18:00', end: '20:00', reason: '야간 점검 지원', status: 'ok' },
  { id: 4, date: '07.11', start: '17:00', end: '19:30', reason: '부품 입고 대응', status: 'ok' },
  { id: 5, date: '07.08', start: '18:00', end: '21:00', reason: '정비 마감 작업', status: 'no' },
  { id: 6, date: '07.03', start: '17:30', end: '19:00', reason: '월초 점검 지원', status: 'ok' },
  { id: 7, date: '06.26', start: '18:00', end: '20:00', reason: 'A-Check 마감 지원', status: 'ok' },
  { id: 8, date: '06.18', start: '17:30', end: '20:30', reason: '부품 수급 지연 대응', status: 'ok' },
  { id: 9, date: '06.05', start: '18:00', end: '19:30', reason: '월초 점검 지원', status: 'no' },
]

// "MM.DD" 의 월 추출
export const monthOf = (d) => Number(d.split('.')[0])

// 팀 관리 — 오늘(07.20) 접수된 신청 (week: 이번 주 총 근무시간, 52h 게이지용)
export const ADMIN_REQS = [
  { team: '정비기획팀', dot: '#4E7FD6', name: '김기홍', role: '사원', date: '07.20', start: '18:00', end: '20:30', reason: '항공기 정비 지연 대응', status: 'wait', week: 49.5 },
  { team: '정비기획팀', dot: '#4E7FD6', name: '김기홍', role: '사원', date: '07.17', start: '17:30', end: '19:30', reason: '긴급 결함 수정', status: 'ok', week: 47.0 },
  { team: '정비기획팀', dot: '#4E7FD6', name: '김기홍', role: '사원', date: '07.15', start: '18:00', end: '20:00', reason: '야간 점검 지원', status: 'ok', week: 47.0 },
  { team: '정비기획팀', dot: '#4E7FD6', name: '김기홍', role: '사원', date: '07.11', start: '17:00', end: '19:30', reason: '부품 입고 대응', status: 'ok', week: 44.0 },
  { team: '정비기획팀', dot: '#4E7FD6', name: '김기홍', role: '사원', date: '07.08', start: '18:00', end: '21:00', reason: '정비 마감 작업', status: 'no', week: 44.0 },
  { team: '정비품질팀', dot: '#7C74EE', name: '서강윤', role: '팀장', date: '07.20', start: '17:30', end: '19:30', reason: '부품 입고 검수', status: 'wait', week: 44.5 },
  { team: '정비자재팀', dot: '#E6952F', name: '간성진', role: '팀장', date: '07.20', start: '17:00', end: '19:00', reason: '정기 점검 마감', status: 'ok', week: 47.0 },
  { team: '정비자재팀', dot: '#E6952F', name: '박종진', role: '과장', date: '07.20', start: '18:00', end: '21:00', reason: '부품 교체 작업', status: 'no', week: 51.5 },
  { team: '운항정비팀', dot: '#2A2A38', name: '차면규', role: '팀장', date: '07.20', start: '18:00', end: '20:30', reason: '정비 지연 대응', status: 'ok', week: 48.5 },
  { team: '운항정비팀', dot: '#2A2A38', name: '문지환', role: '과장', date: '07.20', start: '15:00', end: '17:30', reason: '긴급 결함 수정', status: 'wait', week: 50.0 },
  { team: '운항정비팀', dot: '#2A2A38', name: '김동민', role: '사원', date: '07.20', start: '15:00', end: '18:00', reason: '야간 점검 인수인계', status: 'wait', week: 46.0 },
]

// "07.20" → "7월 20일(월)" (2026년 기준, 앞자리 0 제거)
export const dateWithDow = (d) => {
  const [mm, dd] = d.split('.').map(Number)
  const w = ['일', '월', '화', '수', '목', '금', '토'][new Date(2026, mm - 1, dd).getDay()]
  return `${mm}월 ${dd}일(${w})`
}

// 시간(h) → "2시간 30분" 표기
export const fmtHM = (h) => {
  const mins = Math.round(h * 60)
  const H = Math.floor(mins / 60)
  const M = mins % 60
  if (H === 0) return `${M}분`
  return M === 0 ? `${H}시간` : `${H}시간 ${M}분`
}

// 팀 순서 유지 그룹핑
export function groupReqsByTeam(reqs) {
  const order = []
  const map = {}
  reqs.forEach((r) => {
    if (!map[r.team]) {
      map[r.team] = { name: r.team, dot: r.dot, reqs: [] }
      order.push(r.team)
    }
    map[r.team].reqs.push(r)
  })
  return order.map((n) => ({ ...map[n], count: map[n].reqs.length }))
}
