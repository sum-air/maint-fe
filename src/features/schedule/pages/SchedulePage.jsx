import { useState } from 'react'
import MonthHeatmap from '../components/MonthHeatmap.jsx'
import ShiftEditModal from '../components/ShiftEditModal.jsx'
import CodeGuide from '../components/CodeGuide.jsx'
import { CODE_CAT, CAT, BADGE, TINT, MONO, codeTime } from '../utils.js'
import './schedule.css'

// 임시 데이터가 있는 기준 달 (백엔드 연동 전)
const BASE = { year: 2026, month: 6 } // 2026년 7월

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

function SchedulePage() {
  const [view, setView] = useState('month') // month | daily | stats
  const [monthOffset, setMonthOffset] = useState(0)
  const [calOpen, setCalOpen] = useState(false) // 월 선택 달력 팝오버
  const [pickYear, setPickYear] = useState(BASE.year)
  const [collapsed, setCollapsed] = useState({})
  const [hover, setHover] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editSel, setEditSel] = useState(null)
  const [editHours, setEditHours] = useState('') // EC(0) 긴급호출 근무 시간
  const [overrides, setOverrides] = useState({})
  const [hiCode, setHiCode] = useState(null)

  const dt = new Date(BASE.year, BASE.month + monthOffset, 1)
  const year = dt.getFullYear()
  const month = dt.getMonth()
  const hasData = monthOffset === 0
  const monthTitle = `${year}년 ${month + 1}월`
  const stepLabel = `${year}.${String(month + 1).padStart(2, '0')}`
  const viewBadge = view === 'daily' ? '일간 스케줄' : view === 'stats' ? '통계 자료' : '월간 스케줄'

  // 셀 호버 팝오버 (디자인 showPop 로직)
  const showPop = ({ p, code, off, ecHours }, e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.min(Math.max(e.clientX, 130), window.innerWidth - 130)
    const cat = CODE_CAT[code]
    setHover({
      name: p.name, role: p.role, team: p.team,
      code: code === 'EC(0)' && ecHours != null ? `EC(${ecHours})` : code,
      time: off ? '휴무' : ecHours != null ? `${ecHours}시간` : codeTime(code),
      badgeBg: off ? '#B4B7C0' : BADGE[cat] ?? CAT[cat].dot,
      tint: off ? '#F4F5F8' : TINT[cat] ?? CAT[cat].bg,
      left: x, top: rect.top,
    })
  }

  const openEdit = (cell) => {
    const dow = WEEK[new Date(year, month, cell.d).getDay()]
    setEditing({ ...cell, dateLabel: `${month + 1}월 ${cell.d}일 (${dow})` })
    setEditSel(cell.code || null)
    setEditHours(cell.hours != null ? String(cell.hours) : '')
    setHover(null)
  }

  const saveEdit = () => {
    if (editing && editSel) {
      const hours = editSel === 'EC(0)' && editHours !== '' ? Number(editHours) : undefined
      setOverrides((s) => ({ ...s, [`${editing.pi}_${editing.d}`]: { code: editSel, hours } }))
    }
    setEditing(null)
  }

  const changeMonth = (delta) => {
    setMonthOffset((o) => o + delta)
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
            <span className="sched-stepbtn" onClick={() => changeMonth(-1)}>
              <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
            </span>
            <span
              className="sched-steplabel"
              onClick={() => { setPickYear(year); setCalOpen((v) => !v) }}
            >
              {stepLabel}
            </span>
            <span className="sched-stepbtn" onClick={() => changeMonth(1)}>
              <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
            </span>

            {/* 월 선택 달력 팝오버 */}
            {calOpen && (
              <>
                <div className="sched-cal-overlay" onClick={() => setCalOpen(false)} />
                <div className="sched-cal">
                  <div className="sched-cal-head">
                    <span className="sched-cal-nav" onClick={() => setPickYear((y) => y - 1)}>
                      <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
                    </span>
                    <span className="sched-cal-year">{pickYear}년</span>
                    <span className="sched-cal-nav" onClick={() => setPickYear((y) => y + 1)}>
                      <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                    </span>
                  </div>
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
        </div>
      </div>

      {/* 월간 히트맵 */}
      {view === 'month' && (
        <div style={{ marginTop: 18 }}>
          <MonthHeatmap
            key={`${year}-${month}`} // 월이 바뀌면 행/열 고정 상태 초기화
            year={year}
            month={month}
            hasData={hasData}
            collapsed={collapsed}
            onToggleTeam={(team) => setCollapsed((s) => ({ ...s, [team]: !s[team] }))}
            hiCode={hiCode}
            overrides={overrides}
            onCellHover={showPop}
            onCellLeave={() => setHover(null)}
            onCellClick={openEdit}
            onPaste={(updates) => setOverrides((s) => ({ ...s, ...updates }))}
          />
          <div className="sched-hint">
            클릭/드래그 = 선택 (Ctrl+클릭 다중 · Shift+클릭 범위) · Ctrl+C 복사 · Ctrl+V 붙여넣기 · 더블클릭 = 편집
          </div>
        </div>
      )}

      {/* 일간/통계 뷰는 추후 구현 */}
      {view !== 'month' && (
        <div className="sched-coming">
          {view === 'daily' ? '일간 스케줄' : '통계'} 화면은 준비 중입니다.
        </div>
      )}

      {/* 셀 호버 팝오버 */}
      {hover && (
        <div className="spop" style={{ left: hover.left, top: hover.top - 12 }}>
          <div className="spop-head" style={{ background: hover.tint }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1F1F29' }}>{hover.name}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8A8A98' }}>{hover.role}</span>
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

      {/* 근무 코드 안내 */}
      <CodeGuide hiCode={hiCode} onToggle={(c) => setHiCode((cur) => (cur === c ? null : c))} />
    </section>
  )
}

export default SchedulePage
