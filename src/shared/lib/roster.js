import { apiGet, apiPut, getTokenClaims } from './api.js'

// 근무 배정 API — 스케줄의 셀 (직원 × 날짜 = 근무코드).
// 응답: [{ id, employeeId, employeeNo, workDate: 'YYYY-MM-DD', shiftCode, ecHours }]
export const fetchDutyAssignments = (from, to) => apiGet('/duty-assignments', { from, to })

// 일괄 반영 — 목록에 있는 셀만 만들고/바꾸고/지운다 (목록에 없는 셀은 건드리지 않음).
// 삭제는 shiftCode 를 null 로 보낸다. items: [{ employeeId, workDate, shiftCode, ecHours? }]
// 편집 범위(본인/지정 부서/관리자) 밖의 셀이 섞이면 403 FORBIDDEN_SCOPE 로 전체 거절된다.
export const saveDutyAssignments = (assignments) => apiPut('/duty-assignments', { assignments })

// 내가 근무표를 편집할 수 있는 부서 목록 — UI 노출 판단용 (강제는 서버가 한다).
// 응답: [{ id, employeeId, employeeNo, koreanName, departmentId, departmentName }]
export const fetchMyRosterScopes = () => apiGet('/roster-managers/me')

const pad = (n) => String(n).padStart(2, '0')

// 한 달치 근무 배정을 { `${employeeNo}_${일}`: { code, hours } } 로 눕힌다. month 는 0 기반.
export async function fetchMonthDutyMap(year, month) {
  const last = new Date(year, month + 1, 0).getDate()
  const list = await fetchDutyAssignments(
    `${year}-${pad(month + 1)}-01`, `${year}-${pad(month + 1)}-${pad(last)}`)
  const map = {}
  list.forEach((a) => {
    map[`${a.employeeNo}_${Number(a.workDate.slice(8))}`] = { code: a.shiftCode, hours: a.ecHours }
  })
  return map
}

// 내(토큰 주인) 한 달치 근무 — { 일: { code, hours } }
export async function fetchMyMonthDuties(year, month) {
  const me = getTokenClaims().employeeNo
  const map = await fetchMonthDutyMap(year, month)
  const mine = {}
  Object.entries(map).forEach(([key, v]) => {
    const [no, d] = key.split('_')
    if (no === me) mine[Number(d)] = v
  })
  return mine
}
