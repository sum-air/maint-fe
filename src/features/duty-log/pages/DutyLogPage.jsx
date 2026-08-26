import { useEffect, useMemo, useRef, useState } from 'react'
import { MONO, CAT, CODE_CAT, TIMES } from '../../../shared/lib/workCodes.js'
import { CURRENT_USER } from '../../../shared/lib/currentUser.js'
import { fetchMaintRoster } from '../../../shared/lib/maintRoster.js'
import { fetchMonthDutyMap, fetchMyRosterScopes } from '../../../shared/lib/roster.js'
import DayCalPopover from '../../../shared/components/DayCalPopover.jsx'
import CategoryModal from '../components/CategoryModal.jsx'
import TimeModal from '../components/TimeModal.jsx'
import NrcWoCard from '../components/NrcWoCard.jsx'
import ExportModal from '../components/ExportModal.jsx'
import {
  addTodo, createWorkLog, deleteTodo, fetchMemo, fetchMonthWorkLogs, fetchTodos, saveMemo, toggleTodo,
} from '../../../shared/lib/worklog.js'
import { CAT_GROUPS, todayKey, nowHM, fmtDate } from '../utils.js'
import './duty-log.css'

const pad = (n) => String(n).padStart(2, '0')

// "HH:MM" 두 시각 사이 소요 표시 — "(30분)" / "(1시간 30분)" (자정 넘김은 +24h)
const durTxt = (s, e) => {
  const [h1, m1] = s.split(':').map(Number)
  const [h2, m2] = e.split(':').map(Number)
  let min = h2 * 60 + m2 - (h1 * 60 + m1)
  if (min < 0) min += 24 * 60
  const h = Math.floor(min / 60)
  return h > 0 ? (min % 60 ? `${h}시간 ${min % 60}분` : `${h}시간`) : `${min}분`
}

// To-do · 메모 — 개인용, 서버 저장 (본인 전용 — 팀장·관리자도 남의 것은 못 본다)
function TodoMemo() {
  const [todos, setTodos] = useState([])
  const [draft, setDraft] = useState('')
  const [memo, setMemo] = useState('')
  const memoDirty = useRef(false)

  useEffect(() => {
    let alive = true
    fetchTodos().then((l) => { if (alive) setTodos(l) }).catch(() => {})
    fetchMemo().then((c) => { if (alive) setMemo(c) }).catch(() => {})
    return () => { alive = false }
  }, [])

  // 메모 자동 저장 — 입력이 멈춘 뒤 800ms (통째 교체 upsert 라 순서 걱정 없음)
  useEffect(() => {
    if (!memoDirty.current) return
    const timer = setTimeout(() => {
      memoDirty.current = false
      saveMemo(memo).catch(() => {})
    }, 800)
    return () => clearTimeout(timer)
  }, [memo])

  // 이월 규칙 — 미완료는 체크될 때까지 계속 보이고, 완료 건은 완료한 그날만 보인다 (서버 doneOn 기준)
  const visible = todos.filter((t) => !t.done || t.doneAt === todayKey())
  const doneN = visible.filter((t) => t.done).length
  const toggle = (id) => {
    const cur = todos.find((t) => t.id === id)
    if (!cur) return
    toggleTodo(id, !cur.done)
      .then((next) => setTodos((s) => s.map((t) => (t.id === id ? next : t))))
      .catch((e) => alert(e.message))
  }
  const remove = (id) =>
    deleteTodo(id)
      .then(() => setTodos((s) => s.filter((t) => t.id !== id)))
      .catch((e) => alert(e.message))
  const add = () => {
    const text = draft.trim()
    if (!text) return
    addTodo(text)
      .then((t) => setTodos((s) => [...s, t]))
      .catch((e) => alert(e.message))
    setDraft('')
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span className="dl-ctitle">To-do</span>
        <span className="dl-cnt">{doneN}/{visible.length}</span>
      </div>
      <div className="dl-todolist">
        {visible.map((t) => (
          <div key={t.id} className="dl-titem">
            <button type="button" className={t.done ? 'dl-cb on' : 'dl-cb'} onClick={() => toggle(t.id)}>
              {t.done && <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>}
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.done ? '#B4B7C0' : '#3A3A46', textDecoration: t.done ? 'line-through' : 'none' }}>
              {t.text}
            </span>
            <button type="button" className="dl-x" onClick={() => remove(t.id)}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <input
          className="dl-ain"
          value={draft}
          placeholder="할 일 추가"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
        />
        <button type="button" className="dl-ab" onClick={add}>추가</button>
      </div>

      <div className="dl-ctitle" style={{ margin: '15px 0 9px' }}>메모</div>
      <textarea
        className="dl-memo"
        value={memo}
        onChange={(e) => { memoDirty.current = true; setMemo(e.target.value) }}
        placeholder="메모를 적어두세요"
      />
    </>
  )
}

// 일별 일지 목록 — 월 필터 + 5일 페이지네이션 (좌측 카드 하단부, 시안 1안)
const PAGE_SIZE = 5

function DayList({ logsByDate, date, onPick, dutyCode }) {
  const [month, setMonth] = useState(() => new Date().getMonth() + 1)
  const [page, setPage] = useState(0)

  const days = Object.keys(logsByDate)
    .filter((k) => (logsByDate[k] ?? []).length > 0 && Number(k.split('.')[0]) === month)
    .sort((a, b) => b.localeCompare(a))
  const totalPages = Math.max(1, Math.ceil(days.length / PAGE_SIZE))
  const cur = Math.min(page, totalPages - 1)
  const pageDays = days.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE)

  const stepMonth = (delta) => {
    setMonth((m) => ((m - 1 + delta + 12) % 12) + 1)
    setPage(0)
  }

  const [mpop, setMpop] = useState(false)
  const year = new Date().getFullYear()

  // 그날 내 근무코드 (실데이터 — 보고 있는 달만 로드돼 있다) + 기록 시간대 (첫 기록~마지막 기록)
  const codeOf = (k) => {
    const [m, d] = k.split('.').map(Number)
    return dutyCode(m, d)
  }
  const spanOf = (k) => {
    const l = logsByDate[k]
    const last = l[l.length - 1]
    return `${l[0].s}–${last.e || last.s}`
  }

  return (
    <div className="dl-card" style={{ background: '#FBFBFD' }}>
      {/* 헤더 높이 28 + 아래 여백 10 — NRC·W/O 카드와 행 시작 위치를 맞춘다 */}
      <div style={{ display: 'flex', alignItems: 'center', height: 28, marginBottom: 10 }}>
        <span className="dl-ctitle">일별 일지</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <button type="button" className="dl-navbtn" style={{ width: 22, height: 22 }} onClick={() => stepMonth(-1)}>
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span
            style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, minWidth: 64, textAlign: 'center', cursor: 'pointer', borderBottom: '1.5px dashed #C7C5FF', paddingBottom: 1 }}
            onClick={() => setMpop((v) => !v)}
          >
            {month}월
          </span>
          <button type="button" className="dl-navbtn" style={{ width: 22, height: 22 }} onClick={() => stepMonth(1)}>
            <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
          </button>

          {mpop && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={() => setMpop(false)} />
              <div className="dl-mpop">
                <div style={{ fontSize: 12, fontWeight: 800, textAlign: 'center', marginBottom: 7 }}>{year}년</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3 }}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <span
                      key={i}
                      className={i + 1 === month ? 'dl-mcell on' : 'dl-mcell'}
                      onClick={() => { setMonth(i + 1); setPage(0); setMpop(false) }}
                    >
                      {i + 1}월
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </span>
      </div>

      <div className="dl-dayrows">
      {pageDays.map((k) => {
        const code = codeOf(k)
        const cg = CAT[CODE_CAT[code] ?? 'off']
        return (
          <button key={k} type="button" className={date === k ? 'dl-drow on' : 'dl-drow'} onClick={() => onPick(k)}>
            <span>{k === todayKey() && <span className="dl-todaybadge">오늘</span>}</span>
            <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 800, color: date === k ? '#433FBB' : '#4E4E5E', justifySelf: 'start' }}>
              {fmtDate(k)}
            </span>
            <span className="dl-tspan">{spanOf(k)}</span>
            {code && <span className="dl-codechip" style={{ background: cg.bg, color: cg.tx }}>{code}</span>}
            <span className="dl-goarrow">
              <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </button>
        )
      })}
      {days.length === 0 && (
        <div style={{ padding: '14px 0', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: '#B4B7C0' }}>
          {month}월 일지가 없습니다
        </div>
      )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 'auto', paddingTop: 10 }}>
        <button type="button" className="dl-navbtn" style={{ width: 22, height: 22 }} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: '#8A8A98' }}>{cur + 1} / {totalPages}</span>
        <button type="button" className="dl-navbtn" style={{ width: 22, height: 22 }} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
          <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  )
}

// 업무일지 — 3열: To-do·메모 │ 오늘 일지(타임라인+입력) │ 일별 리스트
function DutyLogPage() {
  const [date, setDate] = useState(todayKey()) // "MM.DD"
  const [calOpen, setCalOpen] = useState(false)

  // 실데이터 — 정비 로스터(팀·인원 필터), 내 관리 팀(권한), 보고 있는 달의 근무 배정
  const [roster, setRoster] = useState([])
  const [managedTeams, setManagedTeams] = useState([])
  useEffect(() => {
    let alive = true
    fetchMaintRoster().then((l) => { if (alive) setRoster(l) }).catch(() => {})
    fetchMyRosterScopes()
      .then((l) => { if (alive) setManagedTeams(l.map((m) => m.departmentName)) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const dateMonth = Number(date.split('.')[0])
  const [dutyMap, setDutyMap] = useState({ month: 0, map: {} })
  useEffect(() => {
    let alive = true
    fetchMonthDutyMap(new Date().getFullYear(), dateMonth - 1)
      .then((map) => { if (alive) setDutyMap({ month: dateMonth, map }) })
      .catch(() => {})
    return () => { alive = false }
  }, [dateMonth])
  // (사번, 월, 일) → 근무코드. 로드된 달이 아니면 undefined (칩·시각은 폴백 표시)
  const dutyCodeOf = (employeeNo, m, d) =>
    m === dutyMap.month ? dutyMap.map[`${employeeNo}_${d}`]?.code : undefined

  // 일지 실데이터 — 보고 있는 달의 열람 범위 내 전원 일지 (범위는 서버가 거른다:
  // 본인 / 지정 팀 / 관리자 전체). 저장 후엔 응답을 목록에 합쳐 재조회 없이 반영.
  const [monthLogs, setMonthLogs] = useState({ month: 0, list: [] })
  useEffect(() => {
    let alive = true
    fetchMonthWorkLogs(new Date().getFullYear(), dateMonth - 1)
      .then((list) => { if (alive) setMonthLogs({ month: dateMonth, list }) })
      .catch(() => {})
    return () => { alive = false }
  }, [dateMonth])

  // 입력 상태 — 시간은 현재 시각 디폴트, 시작/종료 클릭 시 시간 모달
  const [start, setStart] = useState(() => nowHM())
  const [end, setEnd] = useState(() => nowHM())
  const [cat, setCat] = useState(null) // { gi, c }
  const [content, setContent] = useState('')
  const [catOpen, setCatOpen] = useState(false)
  const [timeTarget, setTimeTarget] = useState(null) // 'start' | 'end' | null

  // 일지 주인 선택 — 관리자(TENANT_ADMIN)는 전체 인원, 근무표 관리자로 지정된 사람은 지정 팀만.
  // 다른 사람 일지는 보기 전용 — 서버가 열람 범위 안의 일지만 내려준다.
  const canPickTeam = CURRENT_USER.isAdmin
  const canPickPerson = CURRENT_USER.isAdmin || managedTeams.length > 0
  const [viewTeam, setViewTeam] = useState(null)
  const [viewName, setViewName] = useState(null)
  const [ownerSel, setOwnerSel] = useState(null) // 'team' | 'name' | null
  const [xlOpen, setXlOpen] = useState(false) // 엑셀 추출 모달 (admin)
  const viewing = viewName != null && viewName !== CURRENT_USER.name

  const teams = canPickTeam ? [...new Set(roster.map((p) => p.team))] : managedTeams
  // admin 은 팀을 먼저 골라야 이름 목록이 나온다 (지정 팀장은 지정 팀이 곧 범위)
  const people = roster
    .filter((p) => (canPickTeam ? p.team === viewTeam : managedTeams.includes(p.team)))
    .map((p) => p.name)

  const pickTeam = (t) => {
    setViewTeam(t)
    if (!t || roster.find((p) => p.name === viewName)?.team !== t) setViewName(null)
  }

  const isToday = date === todayKey()

  // 그날 일지 주인 — 남의 일지를 보는 중이면 그 사람, 아니면 나
  const ownerNo = viewing
    ? roster.find((p) => p.name === viewName)?.employeeNo
    : CURRENT_USER.employeeNo

  // 일지 주인의 "MM.DD" → [엔트리] (시작 시각순) — 타임라인·일별 리스트가 같은 원천을 쓴다
  const logsByDate = useMemo(() => {
    const map = {}
    for (const l of monthLogs.list) {
      if (l.employeeNo !== ownerNo) continue
      ;(map[l.key] ??= []).push(l)
    }
    Object.values(map).forEach((a) => a.sort((x, y) => x.s.localeCompare(y.s)))
    return map
  }, [monthLogs, ownerNo])
  const logs = logsByDate[date] ?? []

  const stepDay = (delta) => {
    const [m, d] = date.split('.').map(Number)
    const dt = new Date(new Date().getFullYear(), m - 1, d + delta)
    setDate(`${pad(dt.getMonth() + 1)}.${pad(dt.getDate())}`)
  }

  // 그날 일지 주인의 근무코드 출근·퇴근 시각 (실데이터 — 배정 없거나 시간 없는 코드는 09:00~18:00)
  const [selM, selD] = date.split('.').map(Number)
  const shiftTT = TIMES[dutyCodeOf(ownerNo, selM, selD)]
  const shiftStart = shiftTT ? `${pad(shiftTT[0] % 24)}:00` : '09:00'
  const shiftEnd = shiftTT ? `${pad(shiftTT[1] % 24)}:00` : '18:00'

  // 추가 가능 조건 — 카테고리 필수, '기타'는 내용도 필수
  const canAdd = cat && (cat.c !== '기타' || content.trim())

  const add = () => {
    if (!canAdd) return
    createWorkLog({ key: date, start, end: end === start ? '' : end, gi: cat.gi, c: cat.c, t: content.trim() })
      .then((entry) => setMonthLogs((m) => ({ ...m, list: [...m.list, entry] })))
      .catch((e) => alert(`일지 저장 실패 — ${e.message}`))
    setCat(null)
    setContent('')
    setStart(nowHM())
    setEnd(nowHM())
  }

  const catGroup = cat ? CAT_GROUPS[cat.gi] : null

  // 일지 주인 필터 — 두 필터 동일 크기, 선택 시 보라 틴트 + 값만 표시
  const ownerFilter = (key, value, label, opts, onPick) => (
    <span style={{ position: 'relative' }}>
      <button
        type="button"
        className="dl-filter"
        style={{
          width: 96, justifyContent: 'center',
          ...(value ? { background: '#E9E8F7', color: '#433FBB', borderColor: 'transparent', fontWeight: 800 } : {}),
        }}
        onClick={() => setOwnerSel((v) => (v === key ? null : key))}
      >
        {value ?? label}
        <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {ownerSel === key && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={() => setOwnerSel(null)} />
          <div className="dl-fmenu">
            {opts.length === 0 ? (
              <div style={{ padding: '8px 14px', fontSize: 11.5, fontWeight: 700, color: '#B4B7C0', whiteSpace: 'nowrap' }}>
                팀을 먼저 선택하세요
              </div>
            ) : (
              <>
                <button type="button" className="dl-fitem" style={{ color: '#B4B7C0' }} onClick={() => { onPick(null); setOwnerSel(null) }}>
                  초기화
                </button>
                {opts.map((o) => (
                  <button key={o} type="button" className={value === o ? 'dl-fitem on' : 'dl-fitem'} onClick={() => { onPick(o); setOwnerSel(null) }}>
                    {o}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </span>
  )

  return (
    <section>
      <div className="dl-head">
        <span className="dl-title">업무일지</span>
      </div>

      <div className="dl-grid">
        {/* 1행: To-do·메모 │ 오늘 일지 · 2행: 일별 일지 │ NRC·W/O */}
        <div className="dl-card" style={{ background: '#FBFBFD' }}>
          <TodoMemo />
        </div>

        {/* 중: 일지 (타임라인 + 입력 줄) */}
        <div className="dl-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{isToday ? '오늘 일지' : '지난 일지'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
              <button type="button" className="dl-navbtn" onClick={() => stepDay(-1)}>
                <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span
                style={{
                  fontFamily: MONO, fontSize: 13.5, fontWeight: 800, minWidth: 100, textAlign: 'center',
                  cursor: 'pointer', borderBottom: '1.5px dashed #C7C5FF', paddingBottom: 1,
                }}
                onClick={() => setCalOpen((v) => !v)}
              >
                {fmtDate(date)}
              </span>
              <button type="button" className="dl-navbtn" onClick={() => stepDay(1)}>
                <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
              </button>
              {calOpen && <DayCalPopover date={date} onPick={setDate} onClose={() => setCalOpen(false)} />}
            </div>
            {canPickPerson ? (
              // 일지 주인 필터 — 초기엔 "팀 / 이름", 선택하면 값만 표시. 초기화로 내 일지 복귀
              <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
                {canPickTeam && ownerFilter('team', viewTeam, '팀', teams, pickTeam)}
                {ownerFilter('name', viewName, '이름', people, setViewName)}
                {CURRENT_USER.isAdmin && (
                  <button type="button" className="dl-xlbtn" onClick={() => setXlOpen(true)}>
                    <svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
                    엑셀
                  </button>
                )}
              </span>
            ) : (
              <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#9C9CAB' }}>
                {CURRENT_USER.name} · {CURRENT_USER.team.replace('섬에어 ', '')}
              </span>
            )}
          </div>

          {/* 세로 타임라인 — 출근 시각에서 시작해 퇴근 시각으로 끝나고, 선이 둘을 잇는다.
              하루(9시간) 분량이 들어가도록 기본 높이 확보. */}
          <div style={{ flex: 1, minHeight: 500, position: 'relative', paddingLeft: 86, display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', left: 70, top: 16, bottom: 16, width: 2, background: '#EEEEF2' }} />

            {/* 출근 */}
            <div style={{ position: 'relative', padding: '6px 0 12px' }}>
              <span style={{ position: 'absolute', left: -86, top: 7, width: 56, textAlign: 'right', fontFamily: MONO, fontSize: 12, fontWeight: 800, color: '#8A8A98' }}>
                {shiftStart}
              </span>
              <span style={{ position: 'absolute', left: -20.5, top: 11, width: 9, height: 9, borderRadius: '50%', background: '#fff', border: '2px solid #C7C5FF', boxShadow: '0 0 0 2.5px #fff' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#8A8A98' }}>출근</span>
            </div>

            {logs.length > 0 ? (
              logs.map((l, i) => {
                const g = CAT_GROUPS[l.gi]
                return (
                  <div key={`${l.s}_${i}`} style={{ position: 'relative', padding: '5px 0 13px' }}>
                    <span style={{ position: 'absolute', left: -86, top: 7, width: 56, textAlign: 'right', fontFamily: MONO, fontSize: 12, fontWeight: 800, color: '#4E4E5E' }}>
                      {l.s}
                    </span>
                    <span style={{ position: 'absolute', left: -20.5, top: 11, width: 9, height: 9, borderRadius: '50%', background: l.e ? '#5350E2' : '#fff', border: '2px solid #5350E2', boxShadow: '0 0 0 2.5px #fff' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="dl-catchip" style={{ background: g.bg, color: g.tx }}>{l.c}</span>
                      {l.t && <span style={{ fontSize: 13.5, fontWeight: 600, color: '#3A3A46' }}>{l.t}</span>}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: '#B6B6C2', marginTop: 3 }}>
                      {l.e ? `${l.s} ~ ${l.e} (${durTxt(l.s, l.e)})` : '진행 중'}
                    </div>
                  </div>
                )
              })
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#B4B7C0' }}>
                {fmtDate(date)} 작성된 일지가 없습니다
              </div>
            )}

            {/* 퇴근 — 항상 타임라인 맨 아래 */}
            <div style={{ position: 'relative', padding: '12px 0 6px', marginTop: 'auto' }}>
              <span style={{ position: 'absolute', left: -86, bottom: 7, width: 56, textAlign: 'right', fontFamily: MONO, fontSize: 12, fontWeight: 800, color: '#8A8A98' }}>
                {shiftEnd}
              </span>
              <span style={{ position: 'absolute', left: -20.5, bottom: 11, width: 9, height: 9, borderRadius: '50%', background: '#fff', border: '2px solid #C7C5FF', boxShadow: '0 0 0 2.5px #fff' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#8A8A98' }}>퇴근</span>
            </div>
          </div>

          {/* 입력 줄 — 오늘 + 내 일지일 때만 (다른 사람 일지는 보기 전용) */}
          {isToday && !viewing && (
            <div className="dl-bar">
              <button
                type="button"
                className="dl-wbox dl-catbox"
                style={catGroup ? { color: catGroup.tx } : undefined}
                onClick={() => setCatOpen(true)}
              >
                <span>{cat ? cat.c : '카테고리'}</span>
                <span style={{ fontSize: 10, color: '#B6B6C2' }}>▾</span>
              </button>
              <span className="dl-wbox dl-timebox">
                <button type="button" className="dl-timebtn" onClick={() => setTimeTarget('start')}>{start}</button>
                <span style={{ color: '#C6C6D0', fontWeight: 600, fontSize: 12 }}>–</span>
                <button type="button" className="dl-timebtn" onClick={() => setTimeTarget('end')}>{end}</button>
              </span>
              <span className="dl-wbox dl-cin">
                <input
                  value={content}
                  placeholder={cat?.c === '기타' ? '내용 (필수)' : '내용 (선택)'}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') add() }}
                />
              </span>
              <button type="button" className={`dl-addbtn ${canAdd ? 'on' : 'off'}`} onClick={add}>추가</button>
            </div>
          )}
        </div>

        {/* 2행: 일별 일지 │ NRC·W/O */}
        <DayList
          logsByDate={logsByDate}
          date={date}
          onPick={setDate}
          dutyCode={(m, d) => dutyCodeOf(ownerNo, m, d)}
        />
        <NrcWoCard roster={roster} />
      </div>

      {xlOpen && <ExportModal roster={roster} onClose={() => setXlOpen(false)} />}
      {catOpen && <CategoryModal selected={cat} onPick={setCat} onClose={() => setCatOpen(false)} />}
      {timeTarget && (
        <TimeModal
          title={timeTarget === 'start' ? '시작 시간' : '종료 시간'}
          value={timeTarget === 'start' ? start : end}
          onConfirm={(v) => (timeTarget === 'start' ? setStart(v) : setEnd(v))}
          onClose={() => setTimeTarget(null)}
        />
      )}
    </section>
  )
}

export default DutyLogPage
