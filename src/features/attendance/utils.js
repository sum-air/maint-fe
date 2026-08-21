// 출퇴근 관리 — 상태 정의 + 실데이터 행 구성.
// 인원·근무코드는 실데이터(/employees, /duty-assignments)이고, 출퇴근 기록·집계는
// 백엔드(work_session)가 아직 없어 미체크/0 으로 표시한다.
import { CODE_CAT } from '../../shared/lib/workCodes.js'

// 출퇴근 상태: c=글자색, b=배지 배경, t=모달 머리 틴트, tl=틴트 경계선
export const STATUS = {
  normal: { c: '#1F9D6B', b: '#E6F5EE', t: '#F3FAF6', tl: '#DCEFE6', label: '정상출근' },
  late: { c: '#C97A17', b: '#FBEFD9', t: '#FDF7EC', tl: '#F2E3C5', label: '지각' },
  early: { c: '#D2731E', b: '#FBECDD', t: '#FDF5EE', tl: '#F1DEC9', label: '조퇴' },
  absent: { c: '#D23B3B', b: '#FBE6E6', t: '#FDF1F1', tl: '#F2D2D2', label: '결근' },
  ot: { c: '#5350E2', b: '#ECECFF', t: '#F4F4FF', tl: '#DEDEFB', label: '연장근무' },
  leave: { c: '#9C8B93', b: '#F0EBED', t: '#F7F4F5', tl: '#E6DEE1', label: '휴무' },
  miss: { c: '#8A8A98', b: '#EFEFF2', t: '#F7F7F9', tl: '#E4E4EA', label: '미체크' },
}

// 팀 색 — 일간/기간 표의 팀 밴드 점 색
export const TEAM_COLORS = {
  정비기획팀: '#4E7FD6',
  정비기술팀: '#31A08F',
  정비품질팀: '#7C74EE',
  정비자재팀: '#E6952F',
  운항정비팀: '#2A2A38',
}

// 일간 출퇴근 행 — 인원·근무코드는 실데이터, 출퇴근 기록은 백엔드 연동 전이라
// 휴무 계열 코드는 '휴무', 나머지는 '미체크'로 표시한다.
// roster: maintRoster 결과, codeOf(employeeNo) → 그날 근무코드
export function buildDailyRows(roster, codeOf) {
  return (roster ?? []).map((p) => {
    const code = codeOf(p.employeeNo) ?? ''
    const cat = CODE_CAT[code]
    const off = cat === 'off' || cat === 'ws' || cat === 'lv'
    return {
      team: p.team,
      teamColor: TEAM_COLORS[p.team] ?? '#8A8A98',
      name: p.name,
      rank: p.rank ?? p.role ?? '',
      code,
      in: '',
      out: '',
      dur: '—',
      st: off ? 'leave' : 'miss',
    }
  })
}

// 팀 순서를 유지하며 그룹핑
export function groupByTeam(rows) {
  const order = []
  const map = {}
  rows.forEach((r) => {
    if (!map[r.team]) {
      map[r.team] = { name: r.team, dot: r.teamColor, members: [] }
      order.push(r.team)
    }
    map[r.team].members.push(r)
  })
  return order.map((n) => ({ ...map[n], count: map[n].members.length }))
}

const YEAR = new Date().getFullYear()

const pad = (n) => String(n).padStart(2, '0')

// 해당 월의 주차 수와 주차별 날짜 범위
export function weekMeta(month, week) {
  const first = new Date(YEAR, month - 1, 1)
  const fdW = (first.getDay() + 6) % 7 // 월요일 시작
  const dim = new Date(YEAR, month, 0).getDate()
  const nWeeks = Math.ceil((fdW + dim) / 7)
  const wk = Math.min(week, nWeeks)
  const start = new Date(YEAR, month - 1, 1 - fdW + (wk - 1) * 7)
  const end = new Date(start.getTime() + 6 * 864e5)
  const rangeLabel = `${YEAR}.${pad(month)}.${pad(start.getDate())} ~ ${pad(end.getMonth() + 1)}.${pad(end.getDate())}`
  return { nWeeks, wk, rangeLabel, start, end }
}

// "HH:MM" 출근/퇴근으로 총 근무시간 "H:MM" 계산 (야간 넘김 포함)
export function calcDur(inT, outT) {
  if (!inT || !outT) return '—'
  const [ih, im] = inT.split(':').map(Number)
  const [oh, om] = outT.split(':').map(Number)
  let mins = oh * 60 + om - (ih * 60 + im)
  if (mins < 0) mins += 24 * 60
  return `${Math.floor(mins / 60)}:${pad(mins % 60)}`
}

// 특정 날짜가 그 달의 몇 주차인지 (월요일 시작)
export function weekOfDate(month, d) {
  const first = new Date(YEAR, month - 1, 1)
  const fdW = (first.getDay() + 6) % 7
  return Math.ceil((fdW + d) / 7)
}

// 주간/월간 집계 — 출퇴근 기록 백엔드(work_session)가 아직 없어 전부 0 이다.
// API 가 생기면 서버 집계로 교체한다.
const EMPTY_STATS = { workDays: 0, late: 0, abs: 0, un: 0, tot: 0, ot: 0 }

export function weekStats() {
  return EMPTY_STATS
}

export function monthStats() {
  return EMPTY_STATS
}
