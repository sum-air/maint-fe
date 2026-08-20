import { apiGet, apiPut } from './api.js'

// 근무 배정 API — 스케줄의 셀 (직원 × 날짜 = 근무코드).
// 응답: [{ id, employeeId, employeeNo, workDate: 'YYYY-MM-DD', shiftCode, ecHours }]
export const fetchDutyAssignments = (from, to) => apiGet('/duty-assignments', { from, to })

// 일괄 반영 — 목록에 있는 셀만 만들고/바꾸고/지운다 (목록에 없는 셀은 건드리지 않음).
// 삭제는 shiftCode 를 null 로 보낸다. items: [{ employeeId, workDate, shiftCode, ecHours? }]
export const saveDutyAssignments = (assignments) => apiPut('/duty-assignments', { assignments })
