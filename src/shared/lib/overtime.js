// 시간외근무 — atlas /overtime-requests 연동.
//
// 서버: { id, employeeId, employeeNo, workDate ISO, startTime 'HH:MM', endTime 'HH:MM'|없음(퇴근 전),
//        reason, status PENDING|APPROVED|REJECTED, decidedById, decidedAtUtc }
// 화면: { id, employeeNo, date 'MM.DD', start, end|null, reason, status 'wait'|'ok'|'no' }
// 종료 시각은 서버가 그날 퇴근 기록에서 채운다 — 화면은 받은 값을 보여주기만 한다.
// 열람 범위(본인 / 지정 팀 / 관리자)는 서버가 거른다.
import { apiDelete, apiGet, apiPatch, apiPost } from './api.js'

const pad = (n) => String(n).padStart(2, '0')
const toKey = (iso) => `${iso.slice(5, 7)}.${iso.slice(8, 10)}`
const fromKey = (key, year) => `${year}-${key.replace('.', '-')}`

const STATUS_TO_UI = { PENDING: 'wait', APPROVED: 'ok', REJECTED: 'no' }
const UI_TO_STATUS = { ok: 'APPROVED', no: 'REJECTED' }

const toReq = (r) => ({
  id: r.id,
  employeeId: r.employeeId,
  employeeNo: r.employeeNo,
  date: toKey(r.workDate),
  start: r.startTime,
  end: r.endTime ?? null,
  reason: r.reason,
  status: STATUS_TO_UI[r.status] ?? 'wait',
  decidedById: r.decidedById ?? null,
})

/** 기간 조회 (ISO 포함 범위) — 화면 형태 배열 */
export async function fetchOvertimeRequests(from, to) {
  return (await apiGet('/overtime-requests', { from, to })).map(toReq)
}

/** 한 달치. monthIdx 0-base */
export function fetchMonthOvertimeRequests(year, monthIdx) {
  const last = new Date(year, monthIdx + 1, 0).getDate()
  return fetchOvertimeRequests(`${year}-${pad(monthIdx + 1)}-01`, `${year}-${pad(monthIdx + 1)}-${pad(last)}`)
}

/** 신청 — date 'MM.DD' (올해), start 'HH:MM', reason */
export async function createOvertimeRequest({ date, start, reason }) {
  return toReq(await apiPost('/overtime-requests', {
    workDate: fromKey(date, new Date().getFullYear()),
    startTime: start,
    reason,
  }))
}

/** 승인('ok') / 반려('no') */
export async function decideOvertimeRequest(id, uiStatus) {
  return toReq(await apiPatch(`/overtime-requests/${id}/decision`, { decision: UI_TO_STATUS[uiStatus] }))
}

export const cancelOvertimeRequest = (id) => apiDelete(`/overtime-requests/${id}`)

// ── 늦은 퇴근 → 시간외 사후 신청 제안 ──
// 퇴근이 근무 종료보다 LATE_MIN 분 이상 늦고, 그날 내 신청이 아직 없으면 모달 데이터를 돌려준다.
export const LATE_CHECKOUT_MIN = 20

/**
 * @param session 방금 닫힌 세션 { workDate 'YYYY-MM-DD', checkedOutAtUtc, employeeNo }
 * @param endHour 그날 근무코드의 종료 시각(시, 24 이상 = 익일). 없으면(휴무 등) null
 * @return { date 'MM.DD', endHM, outHM, overMin } | null
 */
export async function lateCheckoutSuggestion(session, endHour) {
  if (endHour == null || !session?.checkedOutAtUtc) return null
  const [y, m, d] = session.workDate.split('-').map(Number)
  const plannedEnd = new Date(y, m - 1, d, endHour, 0, 0) // 브라우저 = KST
  const out = new Date(session.checkedOutAtUtc)
  const overMin = Math.floor((out - plannedEnd) / 60000)
  if (overMin < LATE_CHECKOUT_MIN) return null
  const mine = (await fetchOvertimeRequests(session.workDate, session.workDate))
    .filter((r) => r.employeeNo === session.employeeNo)
  if (mine.length > 0) return null // 이미 신청이 있다 — 다시 묻지 않는다
  const hm = (dt) => `${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  return { date: toKey(session.workDate), endHM: hm(plannedEnd), outHM: hm(out), overMin }
}
