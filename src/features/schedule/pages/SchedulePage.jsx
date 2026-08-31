import { useEffect, useState } from 'react'
import MonthHeatmap from '../components/MonthHeatmap.jsx'
import ShiftEditModal from '../components/ShiftEditModal.jsx'
import CodeGuide from '../components/CodeGuide.jsx'
import StatsView from '../components/StatsView.jsx'
import DailyView from '../components/DailyView.jsx'
import { CODE_CAT, CAT, BADGE, TINT, MONO, codeTime } from '../../../shared/lib/workCodes.js'
import { fetchMaintRoster } from '../../../shared/lib/maintRoster.js'
import { fetchDutyAssignments, saveDutyAssignments, fetchMyRosterScopes } from '../../../shared/lib/roster.js'
import printSchedule from '../lib/printSchedule.js'
import { getTokenClaims } from '../../../shared/lib/api.js'
import './schedule.css'
import { showToast } from '../../../shared/lib/toast.js'

// 내 신원 — 토큰 클레임에서 읽는다 (UI 노출 판단용, 강제는 서버가 한다)
const ME = getTokenClaims()
const IS_ADMIN = (ME.features ?? []).includes('TENANT_ADMIN')
const SCOPE_MESSAGE = '본인 근무 또는 지정받은 팀의 근무만 수정할 수 있습니다.'

// 기준 달 = 오늘
const TODAY = new Date()
const BASE = { year: TODAY.getFullYear(), month: TODAY.getMonth() }

// 단축키 안내용 수정키 표기 — 동작은 Cmd/Ctrl 둘 다 받지만(metaKey||ctrlKey) 표기는 OS 를 따른다
const MOD_KEY = /Mac|iP(hone|ad|od)/.test(navigator.platform) ? '⌘' : 'Ctrl'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

function SchedulePage() {
  const [view, setView] = useState('month') // month | daily | stats
  const [monthOffset, setMonthOffset] = useState(0)
  const [calOpen, setCalOpen] = useState(false) // 달력 팝오버 (월간=월 선택, 일간=날짜 선택)
  const [pickYear, setPickYear] = useState(BASE.year)
  const [pickMonth, setPickMonth] = useState(BASE.month)
  const [collapsed, setCollapsed] = useState({})
  const [hover, setHover] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editSel, setEditSel] = useState(null)
  const [editHours, setEditHours] = useState('') // EC(0) 긴급호출 근무 시간
  // 근무 셀 — atlas /duty-assignments 실데이터. 키는 `${pi}_${d}` (컴포넌트들의 기존 키 체계 유지)
  const [cells, setCells] = useState({})
  const [dutyError, setDutyError] = useState(false)
  const [hiCode, setHiCode] = useState(null)

  const [selDay, setSelDay] = useState(TODAY.getDate()) // 일간 뷰에서 보는 날짜

  // 인원 축 실데이터 — 공용 정비 로스터 (표시 순서까지 정렬돼 온다).
  // 행 인덱스(pi) 기반 범위선택·고정이 "화면 인접 행 = 인접 인덱스"를 전제하므로
  // 배열 순서가 곧 표시 순서여야 한다.
  const [people, setPeople] = useState(null)
  const [loadError, setLoadError] = useState(false)
  useEffect(() => {
    let alive = true
    fetchMaintRoster()
      .then((list) => { if (alive) setPeople(list) })
      .catch(() => { if (alive) setLoadError(true) })
    return () => { alive = false }
  }, [])

  const roster = people ?? []
  // people 이 이미 팀 순서로 정렬돼 있으므로 등장 순서가 곧 팀 표시 순서다
  const teams = people ? [...new Set(people.map((p) => p.team))] : []

  // 내가 근무표를 편집할 수 있는 부서 — 조회 실패 시 본인 것만 (닫히는 쪽으로 동작)
  const [managedDeptIds, setManagedDeptIds] = useState(() => new Set())
  useEffect(() => {
    let alive = true
    fetchMyRosterScopes()
      .then((list) => { if (alive) setManagedDeptIds(new Set(list.map((m) => m.departmentId))) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const canEdit = (pi) => {
    const p = roster[pi]
    if (!p) return false
    return IS_ADMIN || p.employeeNo === ME.employeeNo || managedDeptIds.has(p.departmentId)
  }

  const dt = new Date(BASE.year, BASE.month + monthOffset, 1)
  const year = dt.getFullYear()
  const month = dt.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const day = Math.min(selDay, daysInMonth)
  const monthTitle = `${year}년 ${month + 1}월`
  const stepLabel =
    view === 'daily'
      ? `${month + 1}월 ${day}일 (${WEEK[new Date(year, month, day).getDay()]})`
      : `${year}.${String(month + 1).padStart(2, '0')}`
  const viewBadge = view === 'daily' ? '일간 스케줄' : view === 'stats' ? '통계 자료' : '월간 스케줄'

  const dateStr = (d) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  // 보고 있는 달의 근무 배정을 읽어온다. 응답의 사번을 로스터 행 인덱스(pi)로 번역해
  // 컴포넌트들의 기존 셀 키 체계(`${pi}_${d}`)를 그대로 쓴다.
  useEffect(() => {
    if (!people) return
    let alive = true
    setCells({})
    setDutyError(false)
    const piByNo = new Map(people.map((p, pi) => [p.employeeNo, pi]))
    fetchDutyAssignments(dateStr(1), dateStr(daysInMonth))
      .then((list) => {
        if (!alive) return
        const next = {}
        list.forEach((a) => {
          const pi = piByNo.get(a.employeeNo)
          if (pi === undefined) return // 화면에 없는 직원(타 부서 등)의 배정
          next[`${pi}_${Number(a.workDate.slice(8))}`] = { code: a.shiftCode, hours: a.ecHours ?? undefined }
        })
        setCells(next)
      })
      .catch(() => { if (alive) setDutyError(true) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, year, month])

  // 셀 변경을 서버에 반영하고, 성공하면 로컬 상태를 갱신한다.
  // updates: { `${pi}_${d}`: { code, hours } } — code null 은 그 셀의 배정 삭제.
  // 편집 범위 밖의 셀은 걸러 보낸다 — 하나라도 섞이면 서버가 전체를 거절하기 때문.
  const persistCells = (raw) => {
    const updates = Object.fromEntries(
      Object.entries(raw).filter(([key]) => canEdit(Number(key.split('_')[0]))))
    if (Object.keys(updates).length === 0) {
      showToast(SCOPE_MESSAGE, 'error')
      return
    }
    const items = Object.entries(updates).map(([key, v]) => {
      const [pi, d] = key.split('_').map(Number)
      return {
        employeeId: roster[pi].id,
        workDate: dateStr(d),
        shiftCode: v.code ?? null,
        ecHours: v.code === 'EC(0)' && v.hours != null ? v.hours : undefined,
      }
    })
    saveDutyAssignments(items)
      .then(() => setCells((s) => ({ ...s, ...updates })))
      .catch((e) => showToast(`근무 저장 실패 — ${e.message}`, 'error'))
  }

  // 셀 호버 팝오버 (디자인 showPop 로직)
  const showPop = ({ p, code, off, ecHours, d }, e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.min(Math.max(e.clientX, 130), window.innerWidth - 130)
    const cat = CODE_CAT[code]
    const dow = '일월화수목금토'[new Date(year, month, d).getDay()]
    setHover({
      name: p.name, role: p.role, team: p.team,
      dateLabel: `${month + 1}월 ${d}일(${dow})`,
      code: code === 'EC(0)' && ecHours != null ? `EC(${ecHours})` : code,
      time: off ? '휴무' : ecHours != null ? `${ecHours}시간` : codeTime(code),
      badgeBg: off ? '#B4B7C0' : BADGE[cat] ?? CAT[cat].dot,
      tint: off ? '#F4F5F8' : TINT[cat] ?? CAT[cat].bg,
      left: x, top: rect.top,
    })
  }

  const openEdit = (cell) => {
    if (!canEdit(cell.pi)) {
      showToast(SCOPE_MESSAGE, 'error')
      return
    }
    const dow = WEEK[new Date(year, month, cell.d).getDay()]
    setEditing({ ...cell, dateLabel: `${month + 1}월 ${cell.d}일 (${dow})` })
    setEditSel(cell.code || null)
    setEditHours(cell.hours != null ? String(cell.hours) : '')
    setHover(null)
  }

  const saveEdit = () => {
    if (editing && editSel) {
      const hours = editSel === 'EC(0)' && editHours !== '' ? Number(editHours) : undefined
      persistCells({ [`${editing.pi}_${editing.d}`]: { code: editSel, hours } })
    }
    setEditing(null)
  }

  // ‹ › 이동: 월간/통계는 한 달, 일간은 하루 단위
  const changeStep = (delta) => {
    if (view === 'daily') {
      const nd = new Date(year, month, day + delta)
      setSelDay(nd.getDate())
      setMonthOffset((nd.getFullYear() - BASE.year) * 12 + (nd.getMonth() - BASE.month))
    } else {
      setMonthOffset((o) => o + delta)
    }
    setHover(null)
  }

  return (
    <section>
      {/* 페이지 헤더: 월 타이틀 + 배지 + 월 이동 + 뷰 탭 */}
      <div className="sched-head">
        <div className="sched-titlewrap">
          <span className="sched-title">{monthTitle}</span>
          <span className="sched-badge">{viewBadge}</span>
        </div>
        <div className="sched-controls">
          <div className="sched-step">
            <span className="sched-stepbtn" onClick={() => changeStep(-1)}>
              <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
            </span>
            <span
              className="sched-steplabel"
              onClick={() => { setPickYear(year); setPickMonth(month); setCalOpen((v) => !v) }}
            >
              {stepLabel}
            </span>
            <span className="sched-stepbtn" onClick={() => changeStep(1)}>
              <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
            </span>

            {/* 달력 팝오버 — 월간/통계: 월 선택, 일간: 날짜 선택 */}
            {calOpen && (
              <>
                <div className="sched-cal-overlay" onClick={() => setCalOpen(false)} />
                <div className="sched-cal" style={view === 'daily' ? { width: 232 } : undefined}>
                  <div className="sched-cal-head">
                    <span
                      className="sched-cal-nav"
                      onClick={() => {
                        if (view === 'daily') {
                          const nd = new Date(pickYear, pickMonth - 1, 1)
                          setPickYear(nd.getFullYear())
                          setPickMonth(nd.getMonth())
                        } else setPickYear((y) => y - 1)
                      }}
                    >
                      <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
                    </span>
                    <span className="sched-cal-year">
                      {view === 'daily' ? `${pickYear}년 ${pickMonth + 1}월` : `${pickYear}년`}
                    </span>
                    <span
                      className="sched-cal-nav"
                      onClick={() => {
                        if (view === 'daily') {
                          const nd = new Date(pickYear, pickMonth + 1, 1)
                          setPickYear(nd.getFullYear())
                          setPickMonth(nd.getMonth())
                        } else setPickYear((y) => y + 1)
                      }}
                    >
                      <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                    </span>
                  </div>

                  {view === 'daily' ? (
                    <>
                      <div className="sched-cal-wk">
                        {WEEK.map((w, i) => (
                          <span key={w} style={{ color: i === 0 ? '#DE5151' : i === 6 ? '#3B7DE8' : '#A0A0AE' }}>{w}</span>
                        ))}
                      </div>
                      <div className="sched-cal-days">
                        {Array.from({ length: new Date(pickYear, pickMonth, 1).getDay() }, (_, i) => (
                          <span key={`b${i}`} />
                        ))}
                        {Array.from({ length: new Date(pickYear, pickMonth + 1, 0).getDate() }, (_, i) => {
                          const d = i + 1
                          const wd = new Date(pickYear, pickMonth, d).getDay()
                          const sel = pickYear === year && pickMonth === month && d === day
                          return (
                            <span
                              key={d}
                              className={sel ? 'sched-cal-d on' : 'sched-cal-d'}
                              style={sel ? undefined : { color: wd === 0 ? '#DE5151' : wd === 6 ? '#3B7DE8' : '#363643' }}
                              onClick={() => {
                                setMonthOffset((pickYear - BASE.year) * 12 + (pickMonth - BASE.month))
                                setSelDay(d)
                                setCalOpen(false)
                                setHover(null)
                              }}
                            >
                              {d}
                            </span>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="sched-cal-grid">
                      {Array.from({ length: 12 }, (_, i) => (
                        <span
                          key={i}
                          className={pickYear === year && i === month ? 'sched-cal-m on' : 'sched-cal-m'}
                          onClick={() => {
                            setMonthOffset((pickYear - BASE.year) * 12 + (i - BASE.month))
                            setCalOpen(false)
                            setHover(null)
                          }}
                        >
                          {i + 1}월
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="sched-tabs">
            <span className={view === 'daily' ? 'sched-tab on' : 'sched-tab'} onClick={() => setView('daily')}>
              <svg viewBox="0 0 24 24"><path d="M8 2v4M16 2v4M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 10h18M8 14h3v3H8z" /></svg>
              일간
            </span>
            <span className={view === 'month' ? 'sched-tab on' : 'sched-tab'} onClick={() => setView('month')}>
              <svg viewBox="0 0 24 24"><path d="M8 2v4M16 2v4M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 10h18" /></svg>
              월간
            </span>
            <span className={view === 'stats' ? 'sched-tab on' : 'sched-tab'} onClick={() => setView('stats')}>
              <svg viewBox="0 0 24 24"><path d="M3 3v18h18M8 17v-5M13 17V9M18 17v-8" /></svg>
              통계
            </span>
          </div>
          {/* 월간 현황 인쇄/PDF — 인쇄 다이얼로그에서 프린터 또는 "PDF로 저장" 선택 */}
          {view === 'month' && people && (
            <span className="sched-tab sched-print" onClick={() => printSchedule({ year, month, teams, roster, cells })}>
              <svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" /></svg>
              출력
            </span>
          )}
        </div>
      </div>

      {/* 월간 히트맵 */}
      {view === 'month' && (
        <div style={{ marginTop: 18 }}>
          {people ? (
            <>
              {dutyError && (
                <div className="sched-warn">근무 데이터를 불러오지 못했습니다 — 지금 저장하는 변경은 반영되지 않을 수 있습니다.</div>
              )}
              <MonthHeatmap
                key={`${year}-${month}`} // 월이 바뀌면 행/열 고정 상태 초기화
                roster={roster}
                teams={teams}
                year={year}
                month={month}
                collapsed={collapsed}
                onToggleTeam={(team) => setCollapsed((s) => ({ ...s, [team]: !s[team] }))}
                hiCode={hiCode}
                overrides={cells}
                onCellHover={showPop}
                onCellLeave={() => setHover(null)}
                onCellClick={openEdit}
                onPaste={persistCells}
              />
              <div className="sched-hint">
                {`클릭/드래그 = 선택 (${MOD_KEY}+클릭 다중 · Shift+클릭 범위) · ${MOD_KEY}+C 복사 · ${MOD_KEY}+V 붙여넣기 · 더블클릭 = 편집`}
              </div>
            </>
          ) : (
            <div className="hm sched-empty">
              {loadError ? '직원 정보를 불러오지 못했습니다 — 백엔드(atlas) 연결을 확인해주세요.' : '직원 정보를 불러오는 중…'}
            </div>
          )}
        </div>
      )}

      {/* 통계 뷰 */}
      {view === 'stats' && (
        <div style={{ marginTop: 18 }}>
          <StatsView />
        </div>
      )}

      {/* 일간 간트 타임라인 */}
      {view === 'daily' && (
        <div style={{ marginTop: 18 }}>
          {people ? (
            <>
              {dutyError && (
                <div className="sched-warn">근무 데이터를 불러오지 못했습니다.</div>
              )}
              <DailyView roster={roster} teams={teams} year={year} month={month} day={day} overrides={cells} />
            </>
          ) : (
            <div className="hm sched-empty">
              {loadError ? '직원 정보를 불러오지 못했습니다 — 백엔드(atlas) 연결을 확인해주세요.' : '직원 정보를 불러오는 중…'}
            </div>
          )}
        </div>
      )}

      {/* 셀 호버 팝오버 */}
      {hover && (
        <div className="spop" style={{ left: hover.left, top: hover.top - 12 }}>
          <div className="spop-head" style={{ background: hover.tint }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1F1F29' }}>{hover.name}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8A8A98' }}>{hover.role}</span>
            <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 12, fontWeight: 800, color: '#55555F' }}>{hover.dateLabel}</span>
          </div>
          <div className="spop-body">
            <div className="spop-line">
              <span className="spop-key">근무코드</span>
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: '#fff', background: hover.badgeBg, borderRadius: 7, padding: '4px 10px' }}>{hover.code}</span>
            </div>
            <div className="spop-line">
              <span className="spop-key">근무시간</span>
              <span style={{ fontFamily: MONO, fontSize: 13.5, color: '#1F1F29', fontWeight: 800 }}>{hover.time}</span>
            </div>
            <div className="spop-line">
              <span className="spop-key">팀명</span>
              <span style={{ fontSize: 12.5, color: '#3A3A48', fontWeight: 700 }}>{hover.team}</span>
            </div>
          </div>
        </div>
      )}

      {/* 근무코드 변경 모달 */}
      {editing && (
        <ShiftEditModal
          edit={editing}
          sel={editSel}
          hours={editHours}
          onHours={setEditHours}
          onPick={setEditSel}
          onSave={saveEdit}
          onClose={() => setEditing(null)}
        />
      )}

      {/* 근무 코드 안내 — 월간 뷰에서만 표시 */}
      {view === 'month' && (
        <CodeGuide hiCode={hiCode} onToggle={(c) => setHiCode((cur) => (cur === c ? null : c))} />
      )}
    </section>
  )
}

export default SchedulePage
