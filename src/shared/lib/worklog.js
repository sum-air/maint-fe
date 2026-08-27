// 업무일지 · 개인 To-do · 메모 — atlas /work-logs, /personal-todos, /personal-memos 연동.
//
// 서버 계약: 시각은 KST("HH:MM" + workDate)로 주고받고 저장만 UTC 다.
// 열람 범위는 서버가 거른다 — 본인 / 지정 팀(roster_manager) / TENANT_ADMIN 전체.
// 투두·메모는 항상 토큰 주인 본인 것만 오간다.
import { CAT_GROUPS } from '../../features/duty-log/utils.js'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './api.js'

const pad = (n) => String(n).padStart(2, '0')

// "YYYY-MM-DD" → 화면 키 "MM.DD"
const toKey = (iso) => `${iso.slice(5, 7)}.${iso.slice(8, 10)}`

// 서버 카테고리(이름 저장) → 화면 대분류 인덱스. 개편으로 이름이 사라진 대분류는 '휴식 · 기타' 색으로
const giOf = (categoryGroup) => {
  const gi = CAT_GROUPS.findIndex((g) => g.label === categoryGroup)
  return gi >= 0 ? gi : CAT_GROUPS.length - 1
}

// 서버 일지 한 줄 → 화면 엔트리 { id, employeeNo, key, s, e, gi, c, t }
const toEntry = (r) => ({
  id: r.id,
  employeeNo: r.employeeNo,
  key: toKey(r.workDate),
  s: r.startTime,
  e: r.endTime ?? '',
  gi: giOf(r.categoryGroup),
  c: r.category,
  t: r.content ?? '',
})

/** 기간 일지 (열람 범위 내 전원) — 화면 엔트리 배열. from/to 는 "YYYY-MM-DD" (포함) */
export async function fetchWorkLogs(from, to) {
  return (await apiGet('/work-logs', { from, to })).map(toEntry)
}

/** 한 달치 일지. monthIdx 0-base */
export function fetchMonthWorkLogs(year, monthIdx) {
  const last = new Date(year, monthIdx + 1, 0).getDate()
  return fetchWorkLogs(`${year}-${pad(monthIdx + 1)}-01`, `${year}-${pad(monthIdx + 1)}-${pad(last)}`)
}

/** 일지 작성 (항상 본인 명의) — key "MM.DD" (올해 기준), end 빈 값 = 진행 중 */
export async function createWorkLog({ key, start, end, gi, c, t }) {
  const [m, d] = key.split('.')
  const saved = await apiPost('/work-logs', {
    workDate: `${new Date().getFullYear()}-${m}-${d}`,
    startTime: start,
    endTime: end || null,
    categoryGroup: CAT_GROUPS[gi].label,
    category: c,
    content: t,
  })
  return toEntry(saved)
}

export const deleteWorkLog = (id) => apiDelete(`/work-logs/${id}`)

// ── 개인 To-do — done 전환 시 완료일(doneAt)은 서버가 오늘(KST)로 찍는다 ──

const toTodo = (r) => ({ id: r.id, text: r.text, done: r.done, doneAt: r.doneOn ? toKey(r.doneOn) : '' })

export async function fetchTodos() {
  return (await apiGet('/personal-todos')).map(toTodo)
}

export async function addTodo(text) {
  return toTodo(await apiPost('/personal-todos', { text }))
}

export async function toggleTodo(id, done) {
  return toTodo(await apiPatch(`/personal-todos/${id}`, { done }))
}

export const deleteTodo = (id) => apiDelete(`/personal-todos/${id}`)

// ── 개인 메모 — 1인 1장, 통째 교체(upsert) ──

export async function fetchMemo() {
  return (await apiGet('/personal-memos/me')).content
}

export const saveMemo = (content) => apiPut('/personal-memos/me', { content })

// ── NRC · W/O — /work-orders. 팀 공유 자료라 열람·등록·수정·삭제 모두 인증만 필요 ──
// 서버: type NRC|WO, aircraftReg, number, content, status OPEN|CLOSE, registeredOn/closedOn ISO,
//       workers [{employeeId, employeeNo}]
// 화면: { id, type 'NRC'|'W/O', ac, no, t, st, reg 'MM.DD', close 'MM.DD'|'', workerIds }
// 작업자 이름은 화면이 직원 목록(roster)으로 해석한다.

// "MM.DD" → 올해 "YYYY-MM-DD"
const fromKey = (key) => `${new Date().getFullYear()}-${key.replace('.', '-')}`

const toOrder = (r) => ({
  id: r.id,
  type: r.type === 'WO' ? 'W/O' : r.type,
  ac: r.aircraftReg,
  no: r.number,
  t: r.content ?? '',
  st: r.status,
  reg: toKey(r.registeredOn),
  close: r.closedOn ? toKey(r.closedOn) : '',
  workerIds: r.workers.map((w) => w.employeeId),
})

const toOrderRQ = (v) => ({
  type: v.type === 'W/O' ? 'WO' : v.type,
  aircraftReg: v.ac,
  number: v.no,
  content: v.t,
  status: v.st,
  registeredOn: fromKey(v.reg),
  closedOn: v.st === 'CLOSE' && v.close ? fromKey(v.close) : null,
  workerEmployeeIds: v.workerIds,
})

export async function fetchWorkOrders() {
  return (await apiGet('/work-orders')).map(toOrder)
}

export async function createWorkOrder(v) {
  return toOrder(await apiPost('/work-orders', toOrderRQ(v)))
}

export async function updateWorkOrder(id, v) {
  return toOrder(await apiPut(`/work-orders/${id}`, toOrderRQ(v)))
}

export const deleteWorkOrder = (id) => apiDelete(`/work-orders/${id}`)
