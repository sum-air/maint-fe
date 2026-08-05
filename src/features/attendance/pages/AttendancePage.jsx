import { useState } from 'react'
import DailyTable from '../components/DailyTable.jsx'
import PeriodTable from '../components/PeriodTable.jsx'
import DetailModal from '../components/DetailModal.jsx'
import MyAttendance from '../components/MyAttendance.jsx'
import { CURRENT_USER } from '../../../shared/lib/currentUser.js'
import { weekMeta, weekOfDate } from '../utils.js'
import './attendance.css'

// 임시 데이터 기준일 (백엔드 연동 전)
const BASE_DAY = { year: 2026, month: 6, day: 20 } // 2026년 7월 20일

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n) => String(n).padStart(2, '0')

function AttendancePage() {
  // my = 내 출퇴근 (모든 사용자), admin = 팀 관리 (관리자만 — 현재 김기홍·본부장 예정)
  const [mode, setMode] = useState('my')
  const [view, setView] = useState('today') // today | week | month
  const [day, setDay] = useState(() => new Date(BASE_DAY.year, BASE_DAY.month, BASE_DAY.day))
  const [wMonth, setWMonth] = useState(7)
  const [wWeek, setWWeek] = useState(4)
  const [mMonth, setMMonth] = useState(7)
  const [modal, setModal] = useState(null)
  const [attEdits, setAttEdits] = useState({}) // 모달에서 수정한 출퇴근 시각 { [이름]: { in, out } }
  const [calOpen, setCalOpen] = useState(false) // 날짜 라벨 클릭 달력 팝오버
  const [pickM, setPickM] = useState(6) // 팝오버가 보여주는 달 (0-based)

  const dateLabel = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())} (${WEEK[day.getDay()]})`
  const shiftDay = (n) => setDay((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n))
  const { nWeeks, wk, rangeLabel } = weekMeta(wMonth, wWeek)

  // ‹ › 통합 스테퍼: 뷰에 따라 하루/한 주/한 달씩 이동 (주간은 두 줄 표기)
  const stepLabel = view === 'today' ? dateLabel : `2026년 ${mMonth}월`

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
                        <span className="att-cal-title">2026년 {pickM + 1}월</span>
                        <span className="att-cal-nav" onClick={() => setPickM((m) => Math.min(11, m + 1))}>
                          <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                        </span>
                      </div>
                    )}

                    {view === 'month' ? (
                      <>
                        <div className="att-cal-head"><span className="att-cal-title" style={{ margin: '0 auto' }}>2026년</span></div>
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
                          {Array.from({ length: new Date(2026, pickM, 1).getDay() }, (_, i) => <span key={`b${i}`} />)}
                          {Array.from({ length: new Date(2026, pickM + 1, 0).getDate() }, (_, i) => {
                            const d = i + 1
                            const dt = new Date(2026, pickM, d)
                            const wd = dt.getDay()
                            const { start, end } = weekMeta(wMonth, wk)
                            const sel =
                              view === 'today'
                                ? day.getFullYear() === 2026 && day.getMonth() === pickM && day.getDate() === d
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
        {mode === 'admin' && view === 'today' && <DailyTable onOpen={setModal} edits={attEdits} />}
        {mode === 'admin' && view === 'week' && <PeriodTable mode="week" month={wMonth} week={wk} />}
        {mode === 'admin' && view === 'month' && <PeriodTable mode="month" month={mMonth} />}
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
