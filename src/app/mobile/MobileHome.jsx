import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CAT, CODE_CAT, TIMES } from '../../shared/lib/workCodes.js'
import { CURRENT_USER } from '../../shared/lib/currentUser.js'
import { fetchMyMonthDuties } from '../../shared/lib/roster.js'
import { fetchMyWorkSessions, checkIn, checkOut, kstHM, fetchNetworkStatus } from '../../shared/lib/attendance.js'
import { fetchWorkLogs, fetchWorkOrders } from '../../shared/lib/worklog.js'
import { lateCheckoutSuggestion } from '../../shared/lib/overtime.js'
import { CAT_GROUPS } from '../../features/duty-log/utils.js'
import OvertimeAfterModal from '../../features/attendance/components/OvertimeAfterModal.jsx'
import WorkLogAddModal from './WorkLogAddModal.jsx'
import { showToast } from '../../shared/lib/toast.js'
import './mobile.css'

const pad = (n) => String(n).padStart(2, '0')
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const WEEK = ['일', '월', '화', '수', '목', '금', '토']

const greetingOf = (h) =>
  h < 5 ? '늦은 밤까지 고생 많아요' : h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '좋은 저녁이에요'

// 근무 코드 → 주간 스트립 칩 색 (히트맵 뮤트 팔레트)
const chipStyle = (code) => {
  const cat = CODE_CAT[code]
  if (!code) return { background: '#ECECF0', color: '#8A8F9C' }
  if (cat === 'off') return { background: '#ECECF0', color: '#8A8F9C' }
  const cc = CAT[cat] ?? CAT.etc
  return { background: cc.bg, color: cc.tx }
}

// 와이파이 아이콘 (헤더 연결 상태용)
const WifiIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01" />
  </svg>
)

// 모바일 홈 — 확정 시안: 보라 헤더(진행 게이지) + 가로 7칸 스케줄 + 카테고리 뱃지 일지 + 작업지시
function MobileHome() {
  const now = new Date()

  // 이번 달 내 근무 배정
  const [duties, setDuties] = useState({})
  useEffect(() => {
    let alive = true
    fetchMyMonthDuties(now.getFullYear(), now.getMonth())
      .then((map) => { if (alive) setDuties(map) })
      .catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 출퇴근 세션 — 야간(어제 출근 후 미퇴근)도 잡히게 어제부터
  const [session, setSession] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    fetchMyWorkSessions(isoDate(yesterday), isoDate(now))
      .then((list) => {
        if (!alive) return
        const open = list.find((s) => !s.checkedOutAtUtc)
        setSession(open ?? list.find((s) => s.workDate === isoDate(now)) ?? null)
      })
      .catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 사내 네트워크 상태
  const [net, setNet] = useState(null)
  useEffect(() => {
    let alive = true
    fetchNetworkStatus().then((s) => { if (alive) setNet(s) }).catch(() => {})
    return () => { alive = false }
  }, [])

  // 오늘 내 일지
  const [logs, setLogs] = useState([])
  useEffect(() => {
    let alive = true
    const iso = isoDate(now)
    fetchWorkLogs(iso, iso)
      .then((list) => {
        if (!alive) return
        setLogs(list.filter((l) => l.employeeNo === CURRENT_USER.employeeNo).sort((a, b) => a.s.localeCompare(b.s)))
      })
      .catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 작업지시 — 최근 3건
  const [orders, setOrders] = useState([])
  useEffect(() => {
    let alive = true
    fetchWorkOrders().then((list) => { if (alive) setOrders(list.slice(0, 3)) }).catch(() => {})
    return () => { alive = false }
  }, [])

  // 늦은 퇴근 → 시간외 사후 신청 제안 (데스크톱 홈과 동일 로직)
  const [otSuggest, setOtSuggest] = useState(null)
  const punch = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (session && !session.checkedOutAtUtc) {
        const closed = await checkOut(session.id)
        setSession(closed)
        const sameMonth = closed.workDate.slice(0, 7) === isoDate(new Date()).slice(0, 7)
        const code = sameMonth ? duties[Number(closed.workDate.slice(8))]?.code : undefined
        const info = await lateCheckoutSuggestion(closed, TIMES[code]?.[1] ?? null).catch(() => null)
        if (info) setOtSuggest({ ...info, shiftCode: code })
      } else {
        setSession(await checkIn())
      }
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const [addOpen, setAddOpen] = useState(false)

  const todayCode = duties[now.getDate()]?.code ?? null
  const tt = todayCode ? TIMES[todayCode] : null
  const inAt = kstHM(session?.checkedInAtUtc)
  const outAt = kstHM(session?.checkedOutAtUtc)
  const done = !!(inAt && outAt)

  // 근무 진행률 — 출근 후, 근무 시작~끝 사이에서 현재 위치 (퇴근하면 100%)
  let progress = 0
  if (tt && inAt) {
    const nowMin = now.getHours() * 60 + now.getMinutes()
    progress = done ? 1 : Math.min(1, Math.max(0, (nowMin - tt[0] * 60) / ((tt[1] - tt[0]) * 60)))
  }

  // 이번 주 (일~토) — 이번 달 밖의 날은 배정 없음으로 표시
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + i)
    const inMonth = d.getMonth() === now.getMonth()
    return { date: d, code: inMonth ? duties[d.getDate()]?.code ?? null : null, today: isoDate(d) === isoDate(now) }
  })

  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEK[now.getDay()]}요일`

  return (
    <div className="mhome">
      {/* 보라 히어로 — 인사 · 출퇴근 · 진행 게이지 · 네트워크 */}
      <div className="mhero">
        <div className="mhero__bar">
          <img className="mhero__logo" src="/sumair_logo.svg" alt="SUMAIR" />
          <button type="button" className="mhero__bell" aria-label="알림" onClick={() => showToast('새 알림이 없습니다')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10.3 21a2 2 0 0 0 3.4 0" />
            </svg>
          </button>
        </div>
        <div className="mhero__date">
          {dateLabel}
          {todayCode && <> · <b>{todayCode}</b>{tt && ` ${pad(tt[0] % 24)}:00–${pad(tt[1] % 24)}:00`}</>}
        </div>
        <div className="mhero__greet">{greetingOf(now.getHours())}, {CURRENT_USER.name}님</div>
        <div className="mhero__punchrow">
          <span>출근 <b className={inAt ? '' : 'dim'}>{inAt || '--:--'}</b></span>
          <span>퇴근 <b className={outAt ? '' : 'dim'}>{outAt || '--:--'}</b></span>
        </div>
        <div className="mhero__gauge"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        <button type="button" className="mhero__btn" disabled={done || busy} onClick={punch}>
          {done ? '근무 완료' : inAt ? '퇴근 체크' : '출근 체크'}
        </button>
        <div className={`mhero__net${net && !net.allowed ? ' off' : ''}`}>
          <WifiIcon />
          {net ? (net.allowed ? `${net.name} · 연결됨` : '사내 네트워크 아님 · 회사 와이파이에 연결하세요') : '네트워크 확인 중…'}
        </div>
      </div>

      <div className="mbody">
        {/* 이번 주 스케줄 — 가로 7칸 */}
        <div className="mcard">
          <div className="mcard__head">
            <span className="t">이번 주 스케줄</span>
            <Link to="/schedule">전체 →</Link>
          </div>
          <div className="mweek">
            {weekDays.map(({ date, code, today }) => (
              <span key={date.getDate()} className={`mweek__day${today ? ' today' : ''}`}>
                <span className="d" style={date.getDay() === 0 ? { color: '#DE5151' } : date.getDay() === 6 ? { color: '#3B7DE8' } : undefined}>
                  {WEEK[date.getDay()]}
                </span>
                <span className="n">{date.getDate()}</span>
                <span className="c" style={today ? undefined : chipStyle(code)}>{code ?? '–'}</span>
              </span>
            ))}
          </div>
        </div>

        {/* 오늘 업무일지 — 카테고리 뱃지 박스 행 + 일지 추가 */}
        <div className="mcard">
          <div className="mcard__head">
            <span className="t">오늘 업무일지</span>
            <Link to="/duty-log">전체 →</Link>
          </div>
          {logs.map((l, i) => {
            const g = CAT_GROUPS[l.gi]
            return (
              <div key={`${l.s}_${i}`} className="mlog">
                <span className="mlog__cat" style={{ background: g.bg, color: g.tx }}>{l.c}</span>
                <span className="mlog__txt">{l.t || l.c}</span>
                <span className="mlog__time">{l.s}{l.e ? `–${l.e}` : '~'}</span>
              </div>
            )
          })}
          {logs.length === 0 && <div className="mempty">아직 작성한 일지가 없습니다</div>}
          <button type="button" className="mlog__add" onClick={() => setAddOpen(true)}>＋ 일지 추가</button>
        </div>

        {/* 작업지시 */}
        <div className="mcard">
          <div className="mcard__head">
            <span className="t">작업지시</span>
            <Link to="/duty-log">전체 →</Link>
          </div>
          {orders.map((x) => (
            <div key={x.id} className="mwo">
              <span className="mwo__no">{x.no}</span>
              <span className="mwo__txt">{x.ac}{x.t ? ` · ${x.t}` : ''}</span>
              <span className={`mwo__st${x.st === 'OPEN' ? ' open' : ''}`}>{x.st === 'OPEN' ? 'OPEN' : 'CLOSED'}</span>
            </div>
          ))}
          {orders.length === 0 && <div className="mempty">등록된 작업지시가 없습니다</div>}
        </div>
      </div>

      {addOpen && (
        <WorkLogAddModal
          onSaved={(entry) => setLogs((s) => [...s, entry].sort((a, b) => a.s.localeCompare(b.s)))}
          onClose={() => setAddOpen(false)}
        />
      )}
      {otSuggest && <OvertimeAfterModal info={otSuggest} onClose={() => setOtSuggest(null)} />}
    </div>
  )
}

export default MobileHome
