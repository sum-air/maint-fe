// 시간외근무 — 상태 정의. 신청·승인 데이터는 백엔드(overtime_record)가 아직 없어
// 화면 상태로만 산다 (새로고침 시 소실). API 가 생기면 조회/저장으로 교체한다.

export const OT_ST = {
  wait: { c: '#C97A17', b: '#FBEFD9', label: '대기' },
  ok: { c: '#1F9D6B', b: '#E6F5EE', label: '승인' },
  no: { c: '#D23B3B', b: '#FBE6E6', label: '반려' },
}

// 내 신청 내역 — 최신순
export const INITIAL_MY_REQS = []

// "MM.DD" 의 월 추출
export const monthOf = (d) => Number(d.split('.')[0])

// 팀 관리 — 접수된 신청 (week: 이번 주 총 근무시간, 52h 게이지용)
export const INITIAL_ADMIN_REQS = []

// "07.20" → "7월 20일(월)" (올해 기준, 앞자리 0 제거)
export const dateWithDow = (d) => {
  const [mm, dd] = d.split('.').map(Number)
  const w = ['일', '월', '화', '수', '목', '금', '토'][new Date(new Date().getFullYear(), mm - 1, dd).getDay()]
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
