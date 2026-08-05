// 출퇴근 관리 — 상태 정의 + 임시 데이터 (클로드 디자인 "정비본부 출퇴근 관리 (화면)" 기준)
// 백엔드 연동 전까지 디자인의 데모 로스터/시드 생성 로직을 그대로 사용한다.

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

// 임시 일간 출퇴근 기록 (디자인 데모 데이터)
export const ATT_ROSTER = [
  { team: '정비기획팀', teamColor: '#4E7FD6', name: '김기홍', rank: '사원', code: 'D1', in: '07:58', out: '17:05', dur: '9:07', st: 'normal' },
  { team: '정비품질팀', teamColor: '#7C74EE', name: '서강윤', rank: '팀장', code: 'D1', in: '07:49', out: '17:02', dur: '9:13', st: 'normal' },
  { team: '정비자재팀', teamColor: '#E6952F', name: '간성진', rank: '팀장', code: 'OFF', in: '', out: '', dur: '—', st: 'leave' },
  { team: '정비자재팀', teamColor: '#E6952F', name: '박종진', rank: '과장', code: 'M2', in: '06:58', out: '16:04', dur: '9:06', st: 'normal' },
  { team: '정비자재팀', teamColor: '#E6952F', name: '이신행', rank: '사원', code: 'D1', in: '08:11', out: '17:06', dur: '8:55', st: 'late', note: '출근 11분 지연 (교통)' },
  { team: '운항정비팀', teamColor: '#2A2A38', name: '차면규', rank: '팀장', code: 'D1', in: '07:55', out: '17:08', dur: '9:13', st: 'normal' },
  { team: '운항정비팀', teamColor: '#2A2A38', name: '문지환', rank: '과장', code: 'T1', in: '05:56', out: '15:03', dur: '9:07', st: 'normal' },
  { team: '운항정비팀', teamColor: '#2A2A38', name: '김찬수', rank: '대리', code: 'N3', in: '12:58', out: '', dur: '—', st: 'ot', note: '연장근무 진행 중' },
  { team: '운항정비팀', teamColor: '#2A2A38', name: '이서용', rank: '사원', code: 'OFF', in: '', out: '', dur: '—', st: 'leave' },
  { team: '운항정비팀', teamColor: '#2A2A38', name: '김동민', rank: '사원', code: 'M1', in: '05:58', out: '15:02', dur: '9:04', st: 'normal' },
  { team: '운항정비팀', teamColor: '#2A2A38', name: '오명열', rank: '사원', code: 'N3', in: '12:50', out: '16:34', dur: '3:44', st: 'early', note: '조퇴 (병원 방문)' },
  { team: '운항정비팀', teamColor: '#2A2A38', name: '오정훈', rank: '사원', code: 'T2', in: '', out: '', dur: '—', st: 'miss', note: '출근 태그 누락 · 확인 필요' },
  { team: '운항정비팀', teamColor: '#2A2A38', name: '김성은', rank: '사원', code: 'D1', in: '08:03', out: '17:10', dur: '9:07', st: 'normal' },
]

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

const YEAR = 2026

const seedOf = (x) => {
  let h = 0
  for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) >>> 0
  return h
}

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

// 주간 집계 (결정적 시드 — 같은 사람·월·주차면 항상 같은 값)
export function weekStats(name, month, week) {
  const sd = seedOf(name) + month * 131 + week * 17
  let wd = 0, late = 0, abs = 0, un = 0, tot = 0, ot = 0
  const wsat = sd % 4 === 0 // 토요일 근무자
  for (let i = 0; i < 7; i++) {
    const we = i >= 5
    if (we && !(i === 5 && wsat)) continue
    if ((sd * 7 + i * 11) % 31 === 0) { abs++; continue }
    if ((sd * 3 + i * 5) % 41 === 0) { un++; continue }
    wd++
    if ((sd + i * 7) % 19 === 0) late++
    const h = 9.0 + ((sd + i) % 5) * 0.2
    const oth = (sd + i * 3) % 7 === 0 ? 1.0 + ((sd + i) % 3) * 0.5 : (sd + i) % 3 === 0 ? 0.5 : 0
    tot += h + oth
    ot += oth
  }
  return { workDays: wd, late, abs, un, tot, ot }
}

// 월간 집계
export function monthStats(name, month) {
  const sd = seedOf(name) + month * 131
  const dim = new Date(YEAR, month, 0).getDate()
  let wd = 0, late = 0, abs = 0, un = 0, tot = 0, ot = 0
  for (let d = 1; d <= dim; d++) {
    const wday = new Date(YEAR, month - 1, d).getDay()
    if (wday === 0 || wday === 6) continue
    if ((sd * 7 + d * 11) % 47 === 0) { abs++; continue }
    if ((sd * 3 + d * 5) % 53 === 0) { un++; continue }
    wd++
    if ((sd + d * 7) % 13 === 0) late++
    const h = 9.0 + ((sd + d) % 5) * 0.2
    const oth = (sd + d * 3) % 7 === 0 ? 1.0 + ((sd + d) % 3) * 0.5 : (sd + d) % 3 === 0 ? 0.5 : 0
    tot += h + oth
    ot += oth
  }
  return { workDays: wd, late, abs, un, tot, ot }
}
