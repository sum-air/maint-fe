import { apiGet, apiPost, apiPatch, getTokenClaims } from './api.js'

// 출퇴근 API — 세션은 출근으로 열리고 퇴근으로 닫힌다. 시각은 서버가 찍는다.
// 응답: { id, employeeId, employeeNo, workDate: 'YYYY-MM-DD', checkedInAtUtc, checkedOutAtUtc? }
// 조회 범위는 서버가 강제한다: 본인 / 지정 팀(roster_manager) / TENANT_ADMIN 전체.
export const fetchWorkSessions = (from, to) => apiGet('/work-sessions', { from, to })

// 출근 — 허용 네트워크가 등록돼 있으면 사내망에서만 성공한다 (403 FORBIDDEN_NETWORK)
export const checkIn = () => apiPost('/work-sessions')

// 퇴근 — 열려 있는 본인 세션을 닫는다 (야간은 출근일 세션이 닫힌다)
export const checkOut = (sessionId) => apiPatch(`/work-sessions/${sessionId}`, { checkedOut: true })

// 지금 이 요청이 어느 사내 네트워크에서 왔는지 — 출퇴근 게이트와 같은 판정.
// 응답: { allowed, name: '[SUMAIR]Office' | null, location: '정비 사무실' | null }
// 허용 대역이 하나도 없으면 allowed=true, name=null (제한 없음).
export const fetchNetworkStatus = () => apiGet('/attendance-networks/me')

const pad = (n) => String(n).padStart(2, '0')

// UTC ISO → KST "HH:MM"
export const kstHM = (iso) => {
  if (!iso) return ''
  const k = new Date(Date.parse(iso) + 9 * 3600 * 1000)
  return `${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`
}

// 출근~퇴근 근무시간(시간 단위 소수). 퇴근 전이면 null.
export const durationHours = (s) =>
  s?.checkedInAtUtc && s?.checkedOutAtUtc
    ? (Date.parse(s.checkedOutAtUtc) - Date.parse(s.checkedInAtUtc)) / 3600000
    : null

// 내(토큰 주인) 세션만 — 관리자 토큰은 조회에 전 직원이 오므로 걸러야 한다
export async function fetchMyWorkSessions(from, to) {
  const me = getTokenClaims().employeeNo
  return (await fetchWorkSessions(from, to)).filter((s) => s.employeeNo === me)
}
