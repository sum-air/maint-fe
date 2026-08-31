import { useEffect, useState } from 'react'
import { MONO } from '../../../shared/lib/workCodes.js'
import { hoursBetween } from '../../../shared/lib/timeInput.js'
import { CURRENT_USER } from '../../../shared/lib/currentUser.js'
import { createOvertimeRequest, fetchOvertimeRequests } from '../../../shared/lib/overtime.js'
import { showToast } from '../../../shared/lib/toast.js'
import { OT_ST, dateWithDow, fmtHM, monthOf } from '../utils.js'
import RequestModal from './RequestModal.jsx'

const TODAY = new Date()
const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// 내 시간외근무 — 스탯 4개 + 신청 버튼 + 내역 테이블 (디자인 근무자 1a)
// 내역은 /overtime-requests 실데이터 — 보고 있는 달 + 이번 주를 함께 읽어 주간 합계가 월 경계에서 끊기지 않게 한다.
function MyOvertime() {
  const [reqs, setReqs] = useState([])
  const [year, setYear] = useState(TODAY.getFullYear())
  const [month, setMonth] = useState(TODAY.getMonth() + 1) // 조회 월
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => {
    let alive = true
    const ws = new Date(TODAY)
    ws.setDate(TODAY.getDate() - ((TODAY.getDay() + 6) % 7))
    const we = new Date(ws)
    we.setDate(ws.getDate() + 6)
    const ms = new Date(year, month - 1, 1)
    const me = new Date(year, month, 0)
    const from = ws < ms ? ws : ms
    const to = we > me ? we : me
    fetchOvertimeRequests(iso(from), iso(to))
      .then((l) => { if (alive) setReqs(l.filter((r) => r.employeeNo === CURRENT_USER.employeeNo)) })
      .catch(() => {})
    return () => { alive = false }
  }, [year, month, reloadKey])
  const [calOpen, setCalOpen] = useState(false)
  const [pickYear, setPickYear] = useState(TODAY.getFullYear())
  const [modalOpen, setModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState('list') // list | cal

  // 연/월 이동 (1월 ‹ → 이전 해 12월)
  const stepMonth = (delta) => {
    const next = month + delta
    if (next < 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else if (next > 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth(next)
    }
  }

  // 선택한 달의 내역만 ("MM.DD" 키 체계라 올해 것만 존재한다)
  const monthReqs = reqs.filter((r) => year === TODAY.getFullYear() && monthOf(r.date) === month)

  // 이번 주(월요일 시작) 시간외 — 오늘이 속한 주의 승인·대기 건 합계
  const weekStart = new Date(TODAY)
  weekStart.setDate(TODAY.getDate() - ((TODAY.getDay() + 6) % 7))
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)
  const inThisWeek = (mmdd) => {
    const [m, d] = mmdd.split('.').map(Number)
    const dt = new Date(TODAY.getFullYear(), m - 1, d)
    return dt >= weekStart && dt < weekEnd
  }
  const WEEK_NO = Math.ceil((TODAY.getDate() + new Date(TODAY.getFullYear(), TODAY.getMonth(), 1).getDay()) / 7)
  const weekOt = reqs
    .filter((r) => r.end && r.status !== 'no' && inThisWeek(r.date))
    .reduce((s, r) => s + hoursBetween(r.start, r.end), 0)
  const monthOt = monthReqs.filter((r) => r.end && r.status !== 'no').reduce((s, r) => s + hoursBetween(r.start, r.end), 0)
  const okN = monthReqs.filter((r) => r.status === 'ok').length
  const waitN = monthReqs.filter((r) => r.status === 'wait').length
  const noN = monthReqs.filter((r) => r.status === 'no').length

  // 종료 시간은 퇴근 확정 시 서버가 채운다 — 신청 시점에는 null
  const addReq = ({ date, start, reason }) =>
    createOvertimeRequest({ date, start, reason })
      .then(() => {
        showToast('시간외 신청이 접수되었습니다')
        setYear(TODAY.getFullYear())
        setMonth(monthOf(date)) // 신청한 달로 이동해 바로 보이게
        setReloadKey((k) => k + 1)
      })
      .catch((e) => alert(`신청 실패 — ${e.message}`))

  return (
    <div className="ot-card">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>신청 현황</span>
        {/* 월별 조회 스테퍼 + 라벨 클릭 시 연/월 선택 팝오버 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <button type="button" className="ot-navbtn" onClick={() => stepMonth(-1)}>
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span
            style={{
              fontFamily: MONO, fontSize: 13.5, fontWeight: 800, minWidth: 92, textAlign: 'center',
              cursor: 'pointer', borderBottom: '1.5px dashed #C7C5FF', paddingBottom: 1,
            }}
            onClick={() => { setPickYear(year); setCalOpen((v) => !v) }}
          >
            {year}년 {month}월
          </span>
          <button type="button" className="ot-navbtn" onClick={() => stepMonth(1)}>
            <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
          </button>

          {calOpen && (
            <>
              <div className="ot-cal-overlay" onClick={() => setCalOpen(false)} />
              <div className="ot-cal">
                <div className="ot-cal-head">
                  <span className="ot-cal-nav" onClick={() => setPickYear((y) => y - 1)}>
                    <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{pickYear}년</span>
                  <span className="ot-cal-nav" onClick={() => setPickYear((y) => y + 1)}>
                    <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                  </span>
                </div>
                <div className="ot-cal-grid">
                  {Array.from({ length: 12 }, (_, i) => (
                    <span
                      key={i}
                      className={pickYear === year && i + 1 === month ? 'ot-cal-m on' : 'ot-cal-m'}
                      onClick={() => { setYear(pickYear); setMonth(i + 1); setCalOpen(false) }}
                    >
                      {i + 1}월
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        {/* 리스트 / 캘린더 보기 전환 */}
        <div className="ot-scope" style={{ marginLeft: 'auto' }}>
          {[['list', '리스트'], ['cal', '캘린더']].map(([k, t]) => (
            <button
              key={k}
              type="button"
              className={viewMode === k ? 'ot-scopetab on' : 'ot-scopetab'}
              onClick={() => setViewMode(k)}
            >
              {t}
            </button>
          ))}
        </div>
        <button type="button" className="ot-newbtn" onClick={() => setModalOpen(true)}>
          시간외 신청
        </button>
      </div>

      {/* 스탯: 시간 카드 2개 + 상태 요약 카드 (가운데 정렬) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.1fr 1.6fr', gap: 10, marginBottom: 18 }}>
        <div style={{ background: '#F4F4FE', borderRadius: 13, padding: '15px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6E6E80', marginBottom: 7 }}>{month}월 누적</div>
          <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 800, color: '#5350E2', letterSpacing: '-.3px' }}>{fmtHM(monthOt)}</div>
        </div>
        <div style={{ background: '#F6F6F9', borderRadius: 13, padding: '15px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6E6E80', marginBottom: 7 }}>{month}월 {WEEK_NO}주</div>
          <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 800, color: '#3A3A46', letterSpacing: '-.3px' }}>{fmtHM(weekOt)}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #EEEEF2', borderRadius: 13, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 8 }}>
          {[
            { label: '승인완료', n: okN, c: '#1F9D6B' },
            { label: '승인대기', n: waitN, c: '#C97A17' },
            { label: '반려', n: noN, c: '#D23B3B' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#8A8A98' }}>
                <i style={{ width: 7, height: 7, borderRadius: '50%', background: s.c }} />{s.label}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 800, color: s.c, marginTop: 3 }}>{s.n}건</div>
            </div>
          ))}
        </div>
      </div>

      {/* 캘린더 보기 */}
      {viewMode === 'cal' && (
        <div className="otc">
          <div className="otc-dow">
            {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
              <div key={w} style={{ color: i === 0 ? '#D06A6A' : i === 6 ? '#5A7FD0' : '#9C9CAB' }}>{w}</div>
            ))}
          </div>
          <div className="otc-cells">
            {Array.from({ length: new Date(year, month - 1, 1).getDay() }, (_, i) => (
              <div key={`b${i}`} className="otc-cell" />
            ))}
            {Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => {
              const d = i + 1
              const wd = new Date(year, month - 1, d).getDay()
              const key = `${String(month).padStart(2, '0')}.${String(d).padStart(2, '0')}`
              const dayReqs = monthReqs.filter((r) => r.date === key)
              return (
                <div key={d} className="otc-cell">
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: wd === 0 ? '#D06A6A' : wd === 6 ? '#5A7FD0' : '#3A3A46' }}>{d}</div>
                  {dayReqs.map((r) => {
                    const st = OT_ST[r.status]
                    return (
                      <div key={r.id} className="otc-chip" style={{ background: st.b, color: st.c }}>
                        <span style={{ fontFamily: MONO, fontWeight: 700 }}>{r.start}~{r.end ?? ''}</span>
                        <span style={{ fontWeight: 800 }}>{r.end ? `${fmtHM(hoursBetween(r.start, r.end))} · ${st.label}` : st.label}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 신청 내역 (리스트 보기) */}
      {viewMode === 'list' && (
      <div className="ot-table">
        <div className="ot-gridhead" style={{ gridTemplateColumns: '1.1fr 1.3fr 1fr 1.7fr 1fr' }}>
          {['일자', '시간', '초과근무', '사유', '상태'].map((h) => (
            <div key={h} className="ot-hh">{h}</div>
          ))}
        </div>
        {monthReqs.length === 0 && (
          <div style={{ padding: '36px 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#B4B7C0' }}>
            {month}월 신청 내역이 없습니다
          </div>
        )}
        {monthReqs.map((r) => {
          const st = OT_ST[r.status]
          return (
            <div key={r.id} className="ot-row" style={{ gridTemplateColumns: '1.1fr 1.3fr 1fr 1.7fr 1fr' }}>
              <div className="ot-cell ot-mono">{dateWithDow(r.date)}</div>
              <div className="ot-cell ot-mono">{r.start} ~ {r.end ?? '—'}</div>
              <div className="ot-cell" style={{ fontSize: 13, fontWeight: 800, color: '#5350E2' }}>{r.end ? fmtHM(hoursBetween(r.start, r.end)) : '—'}</div>
              <div className="ot-cell ot-reason" style={{ fontSize: 13, fontWeight: 600, color: '#6E6E80' }}>
                <span className="ot-reason-clip">{r.reason}</span>
                <span className="ot-tip">{r.reason}</span>
              </div>
              <div className="ot-cell" style={{ display: 'flex', justifyContent: 'center' }}>
                <span className="ot-pill" style={{ color: st.c, background: st.b }}>{st.label}</span>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {modalOpen && <RequestModal onSubmit={addReq} onClose={() => setModalOpen(false)} />}
    </div>
  )
}

export default MyOvertime
