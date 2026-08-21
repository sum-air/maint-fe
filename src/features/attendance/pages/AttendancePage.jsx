import { useEffect, useState } from 'react'
import DailyTable from '../components/DailyTable.jsx'
import PeriodTable from '../components/PeriodTable.jsx'
import DetailModal from '../components/DetailModal.jsx'
import MyAttendance from '../components/MyAttendance.jsx'
import { CURRENT_USER } from '../../../shared/lib/currentUser.js'
import { fetchMaintRoster } from '../../../shared/lib/maintRoster.js'
import { fetchMonthDutyMap } from '../../../shared/lib/roster.js'
import { fetchWorkSessions, kstHM, durationHours } from '../../../shared/lib/attendance.js'
import { TIMES } from '../../../shared/lib/workCodes.js'
import { weekMeta, weekOfDate, buildDailyRows, statsByEmployee, EMPTY_STATS } from '../utils.js'
import './attendance.css'

const TODAY = new Date()
const YEAR = TODAY.getFullYear()

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n) => String(n).padStart(2, '0')

function AttendancePage() {
  // my = 내 출퇴근 (모든 사용자), admin = 팀 관리 (관리자만)
  const [mode, setMode] = useState('my')
  const [view, setView] = useState('today') // today | week | month
  const [day, setDay] = useState(() => new Date(YEAR, TODAY.getMonth(), TODAY.getDate()))
  const [wMonth, setWMonth] = useState(TODAY.getMonth() + 1)
  const [wWeek, setWWeek] = useState(() => weekOfDate(TODAY.getMonth() + 1, TODAY.getDate()))
  const [mMonth, setMMonth] = useState(TODAY.getMonth() + 1)
  const [modal, setModal] = useState(null)
  const [attEdits, setAttEdits] = useState({}) // 모달에서 수정한 출퇴근 시각 { [이름]: { in, out } }
  const [calOpen, setCalOpen] = useState(false) // 날짜 라벨 클릭 달력 팝오버
  const [pickM, setPickM] = useState(TODAY.getMonth()) // 팝오버가 보여주는 달 (0-based)

  // 실데이터 — 정비 로스터 + 보고 있는 날의 근무 배정 (기록은 백엔드 연동 전이라 미체크)
  const [roster, setRoster] = useState([])
  useEffect(() => {
    let alive = true
    fetchMaintRoster().then((l) => { if (alive) setRoster(l) }).catch(() => {})
    return () => { alive = false }
  }, [])
  const [dutyMap, setDutyMap] = useState({ month: 0, map: {} })
  const dayMonth = day.getMonth() + 1
  useEffect(() => {
    let alive = true
    fetchMonthDutyMap(YEAR, dayMonth - 1)
      .then((map) => { if (alive) setDutyMap({ month: dayMonth, map }) })
      .catch(() => {})
    return () => { alive = false }
  }, [dayMonth])
  const periodRows = buildDailyRows(roster, () => undefined)

  const dateLabel = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())} (${WEEK[day.getDay()]})`
  const shiftDay = (n) => setDay((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n))
  const { nWeeks, wk, rangeLabel } = weekMeta(wMonth, wWeek)

  // 팀 관리용 세션 — 보고 있는 기간(일간=그날, 주간=그 주, 월간=그 달)을 조회한다.
  // 서버가 조회 범위를 강제한다: 관리자=전체, 지정 팀장=지정 팀+본인, 일반=본인.
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  let range
  if (view === 'today') {
    range = [isoDate(day), isoDate(day)]
  } else if (view === 'week') {
    const { start, end } = weekMeta(wMonth, wk)
    range = [isoDate(start), isoDate(end)]
  } else {
    range = [`${YEAR}-${pad(mMonth)}-01`, `${YEAR}-${pad(mMonth)}-${pad(new Date(YEAR, mMonth, 0).getDate())}`]
  }
  const [adminSessions, setAdminSessions] = useState([])
  useEffect(() => {
    if (mode !== 'admin') return
    let alive = true
    fetchWorkSessions(range[0], range[1])
      .then((list) => { if (alive) setAdminSessions(list) })
      .catch(() => { if (alive) setAdminSessions([]) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, range[0], range[1]])

  // 일간 표 — 배정 코드 + 그날 세션 병합 (지각 = 출근이 계획 시작보다 늦음)
  const sessionByNo = {}
  adminSessions.filter((s) => s.workDate === isoDate(day)).forEach((s) => { sessionByNo[s.employeeNo] = s })
  const dailyRows = buildDailyRows(roster, (no) =>
    dayMonth === dutyMap.month ? dutyMap.map[`${no}_${day.getDate()}`]?.code : undefined)
    .map((r) => {
      const s = sessionByNo[r.employeeNo]
      if (!s) return r
      const tt = TIMES[r.code]
      const [ih, im] = kstHM(s.checkedInAtUtc).split(':').map(Number)
      const late = tt && ih * 60 + im > (tt[0] % 24) * 60
      const h = durationHours(s)
      return {
        ...r,
        in: kstHM(s.checkedInAtUtc),
        out: s.checkedOutAtUtc ? kstHM(s.checkedOutAtUtc) : '',
        dur: h != null ? `${Math.floor(h)}:${pad(Math.round(h * 60) % 60)}` : '—',
        st: late ? 'late' : 'normal',
      }
    })

  const statsMap = statsByEmployee(adminSessions, durationHours)
  const statsOf = (no) => statsMap[no] ?? EMPTY_STATS

  // ‹ › 통합 스테퍼: 뷰에 따라 하루/한 주/한 달씩 이동 (주간은 두 줄 표기)
  const stepLabel = view === 'today' ? dateLabel : `${YEAR}년 ${mMonth}월`

  const stepPeriod = (delta) => {
    if (view === 'today') {
      shiftDay(delta)
    } else if (view === 'week') {
      const next = wk + delta
      if (next < 1) {
        const pm = wMonth === 1 ? 12 : wMonth - 1
        setWMonth(pm)
        setWWeek(weekMeta(pm, 99).nWeeks) // 이전 달 마지막 주차
      } else if (next > nWeeks) {
        setWMonth(wMonth === 12 ? 1 : wMonth + 1)
        setWWeek(1)
      } else {
        setWWeek(next)
      }
    } else {
      setMMonth((m) => (m + delta < 1 ? 12 : m + delta > 12 ? 1 : m + delta))
    }
  }

  return (
    <section>
      {/* 페이지 헤더: 타이틀 + (관리자) 내 출퇴근 ↔ 팀 관리 전환 */}
      <div className="att-head">
        {/* 모드와 무관하게 고정 — 길이가 바뀌면 옆 토글 위치가 흔들린다 */}
        <span className="att-title">출퇴근 관리</span>

        {/* 모드가 바뀌어도 같은 자리에 있도록 타이틀 옆 고정 */}
        {CURRENT_USER.isAdmin && (
          <div className="att-scope" style={{ marginLeft: 0 }}>
            {[['my', '내 출퇴근'], ['admin', '팀 관리']].map(([k, t]) => (
              <button
                key={k}
                type="button"
                className={mode === k ? 'att-scopetab on' : 'att-scopetab'}
                onClick={() => setMode(k)}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* 오른쪽 그룹: 통합 날짜 스테퍼 + 일간/주간/월간 탭 */}
        {mode === 'admin' && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div className="att-daynav" style={{ position: 'relative' }}>
              <button type="button" className="att-navbtn" onClick={() => stepPeriod(-1)}>
                <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span
                className="att-datelabel"
                style={{ minWidth: 148, cursor: 'pointer', lineHeight: 1.25 }}
                onClick={() => {
                  setPickM(view === 'today' ? day.getMonth() : wMonth - 1)
                  setCalOpen((v) => !v)
                }}
              >
                {view === 'week' ? (
                  <>
                    <div>{wMonth}월 {wk}주차</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9C9CAB', marginTop: 2 }}>{rangeLabel.slice(5)}</div>
                  </>
                ) : (
                  stepLabel
                )}
              </span>
              <button type="button" className="att-navbtn" onClick={() => stepPeriod(1)}>
                <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
              </button>

              {/* 날짜 선택 팝오버 — 일간/주간: 날짜 달력, 월간: 12개월 그리드 */}
              {calOpen && (
                <>
                  <div className="att-cal-overlay" onClick={() => setCalOpen(false)} />
                  <div className="att-cal" style={view === 'month' ? { width: 196 } : undefined}>
                    {view !== 'month' && (
                      <div className="att-cal-head">
                        <span className="att-cal-nav" onClick={() => setPickM((m) => Math.max(0, m - 1))}>
                          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
                        </span>
                        <span className="att-cal-title">{YEAR}년 {pickM + 1}월</span>
                        <span className="att-cal-nav" onClick={() => setPickM((m) => Math.min(11, m + 1))}>
                          <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                        </span>
                      </div>
                    )}

                    {view === 'month' ? (
                      <>
                        <div className="att-cal-head"><span className="att-cal-title" style={{ margin: '0 auto' }}>{YEAR}년</span></div>
                        <div className="att-cal-mgrid">
                          {Array.from({ length: 12 }, (_, i) => (
                            <span
                              key={i}
                              className={i + 1 === mMonth ? 'att-cal-m on' : 'att-cal-m'}
                              onClick={() => { setMMonth(i + 1); setCalOpen(false) }}
                            >
                              {i + 1}월
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="att-cal-wk">
                          {WEEK.map((w, i) => (
                            <span key={w} style={{ color: i === 0 ? '#DE5151' : i === 6 ? '#3B7DE8' : '#A0A0AE' }}>{w}</span>
                          ))}
                        </div>
                        <div className="att-cal-days">
                          {Array.from({ length: new Date(YEAR, pickM, 1).getDay() }, (_, i) => <span key={`b${i}`} />)}
                          {Array.from({ length: new Date(YEAR, pickM + 1, 0).getDate() }, (_, i) => {
                            const d = i + 1
                            const dt = new Date(YEAR, pickM, d)
                            const wd = dt.getDay()
                            const { start, end } = weekMeta(wMonth, wk)
                            const sel =
                              view === 'today'
                                ? day.getFullYear() === YEAR && day.getMonth() === pickM && day.getDate() === d
                                : dt >= start && dt <= end // 주간: 선택된 주 전체 강조
                            return (
                              <span
                                key={d}
                                className={sel ? 'att-cal-d on' : 'att-cal-d'}
                                style={sel ? undefined : { color: wd === 0 ? '#DE5151' : wd === 6 ? '#3B7DE8' : '#363643' }}
                                onClick={() => {
                                  if (view === 'today') setDay(dt)
                                  else {
                                    setWMonth(pickM + 1)
                                    setWWeek(weekOfDate(pickM + 1, d))
                                  }
                                  setCalOpen(false)
                                }}
                              >
                                {d}
                              </span>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="att-scope" style={{ marginLeft: 0 }}>
              {[['today', '일간'], ['week', '주간'], ['month', '월간']].map(([k, t]) => (
                <button
                  key={k}
                  type="button"
                  className={view === k ? 'att-scopetab on' : 'att-scopetab'}
                  onClick={() => setView(k)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        {mode === 'my' && <MyAttendance />}
        {mode === 'admin' && view === 'today' && <DailyTable rows={dailyRows} onOpen={setModal} edits={attEdits} />}
        {mode === 'admin' && view === 'week' && <PeriodTable rows={periodRows} mode="week" statsOf={statsOf} />}
        {mode === 'admin' && view === 'month' && <PeriodTable rows={periodRows} mode="month" statsOf={statsOf} />}
      </div>

      {modal && (
        <DetailModal
          m={modal}
          dateLabel={dateLabel}
          onSave={(name, times) => setAttEdits((s) => ({ ...s, [name]: times }))}
          onClose={() => setModal(null)}
        />
      )}
    </section>
  )
}

export default AttendancePage
