import { useEffect, useState } from 'react'
import PageHero, { Stepper } from './PageHero.jsx'
import { CAT, CODE_CAT } from '../../shared/lib/workCodes.js'
import { fetchMyWorkSessions, kstHM, durationHours } from '../../shared/lib/attendance.js'
import { fetchMyMonthDuties } from '../../shared/lib/roster.js'
import { fmtHM } from '../../features/overtime/utils.js'

const pad = (n) => String(n).padStart(2, '0')
const WEEK = ['일', '월', '화', '수', '목', '금', '토']

const codeChip = (code) => {
  const cat = CODE_CAT[code]
  if (!code || cat === 'off') return { background: '#ECECF0', color: '#8A8F9C' }
  const cc = CAT[cat] ?? CAT.etc
  return { background: cc.bg, color: cc.tx }
}

// 출퇴근관리 모바일 — 이달 요약 + 일별 기록. 찍기는 홈에서, 여기는 조회 전용.
function MobileAttendance() {
  const today = new Date()
  const [monthOffset, setMonthOffset] = useState(0)
  const dt = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const year = dt.getFullYear()
  const month = dt.getMonth()
  const last = new Date(year, month + 1, 0).getDate()

  const [sessions, setSessions] = useState([])
  const [duties, setDuties] = useState({})
  useEffect(() => {
    let alive = true
    setSessions([])
    setDuties({})
    fetchMyWorkSessions(`${year}-${pad(month + 1)}-01`, `${year}-${pad(month + 1)}-${pad(last)}`)
      .then((l) => { if (alive) setSessions(l.sort((a, b) => b.workDate.localeCompare(a.workDate))) })
      .catch(() => {})
    fetchMyMonthDuties(year, month).then((m) => { if (alive) setDuties(m) }).catch(() => {})
    return () => { alive = false }
  }, [year, month, last])

  const workDays = sessions.length
  const totalH = sessions.reduce((s, x) => s + (durationHours(x) ?? 0), 0)

  return (
    <div className="mhome">
      <PageHero
        title="출퇴근관리"
        right={<Stepper label={`${year}.${pad(month + 1)}`} onPrev={() => setMonthOffset((o) => o - 1)} onNext={() => setMonthOffset((o) => o + 1)} />}
      />
      <div className="mbody">
        <div className="msum">
          <div className="mcard msum__tile">
            <span className="k">근무일</span>
            <span className="v">{workDays}일</span>
          </div>
          <div className="mcard msum__tile">
            <span className="k">총 근무</span>
            <span className="v" style={{ color: '#5350E2' }}>{totalH ? fmtHM(totalH) : '—'}</span>
          </div>
        </div>

        <div className="mcard">
          <div className="mcard__head"><span className="t">일별 기록</span><span className="mcard__sub">{month + 1}월</span></div>
          {sessions.map((s) => {
            const d = Number(s.workDate.slice(8))
            const dow = WEEK[new Date(year, month, d).getDay()]
            const code = duties[d]?.code
            const inAt = kstHM(s.checkedInAtUtc)
            const outAt = kstHM(s.checkedOutAtUtc)
            const h = durationHours(s)
            return (
              <div key={s.id} className="mrow">
                <span className="matt__day">
                  <span className="d">{month + 1}/{d} {dow}</span>
                  <span className="mlog__cat" style={codeChip(code)}>{code ?? '—'}</span>
                </span>
                <span className="matt__time">{inAt || '—'} <i>→</i> {outAt || '--:--'}</span>
                <span className={`matt__dur${outAt ? '' : ' ing'}`}>{outAt ? fmtHM(h) : '근무 중'}</span>
              </div>
            )
          })}
          {sessions.length === 0 && <div className="mempty">이달 출퇴근 기록이 없습니다</div>}
        </div>
      </div>
    </div>
  )
}

export default MobileAttendance
