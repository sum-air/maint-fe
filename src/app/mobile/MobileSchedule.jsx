import { useEffect, useState } from 'react'
import PageHero, { Stepper } from './PageHero.jsx'
import { CAT, CODE_CAT, TIMES } from '../../shared/lib/workCodes.js'
import { fetchMyMonthDuties, fetchDutyAssignments } from '../../shared/lib/roster.js'
import { fetchMaintRoster } from '../../shared/lib/maintRoster.js'
import { getTokenClaims } from '../../shared/lib/api.js'

const pad = (n) => String(n).padStart(2, '0')
const WEEK = ['일', '월', '화', '수', '목', '금', '토']

// 코드 글자색 — 히트맵 뮤트 팔레트
const codeColor = (code) => {
  const cat = CODE_CAT[code]
  if (!code || cat === 'off') return '#8A8F9C'
  return (CAT[cat] ?? CAT.etc).tx
}
const codeChip = (code) => {
  const cat = CODE_CAT[code]
  if (!code || cat === 'off') return { background: '#ECECF0', color: '#8A8F9C' }
  const cc = CAT[cat] ?? CAT.etc
  return { background: cc.bg, color: cc.tx }
}

// 스케줄 모바일 — 내 근무 월 달력 + 오늘 우리 팀 근무. 편집은 데스크톱에서.
function MobileSchedule() {
  const today = new Date()
  const [monthOffset, setMonthOffset] = useState(0)
  const dt = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const year = dt.getFullYear()
  const month = dt.getMonth()
  const days = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()

  const [duties, setDuties] = useState({})
  useEffect(() => {
    let alive = true
    setDuties({})
    fetchMyMonthDuties(year, month).then((map) => { if (alive) setDuties(map) }).catch(() => {})
    return () => { alive = false }
  }, [year, month])

  // 오늘 우리 팀 — 로스터에서 내 사번으로 팀을 찾고, 그 팀원 + 오늘 배정
  const [team, setTeam] = useState([])
  const [teamName, setTeamName] = useState('우리 팀')
  useEffect(() => {
    let alive = true
    const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
    Promise.all([fetchMaintRoster(), fetchDutyAssignments(iso, iso)])
      .then(([roster, assigns]) => {
        if (!alive) return
        const myTeam = roster.find((p) => p.employeeNo === getTokenClaims().employeeNo)?.team ?? roster[0]?.team
        if (!myTeam) return
        setTeamName(myTeam)
        const codeByNo = Object.fromEntries(assigns.map((a) => [a.employeeNo, a.shiftCode]))
        setTeam(roster.filter((p) => p.team === myTeam).map((p) => ({ ...p, code: codeByNo[p.employeeNo] ?? null })))
      })
      .catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isThisMonth = monthOffset === 0

  return (
    <div className="mhome">
      <PageHero
        title="스케줄"
        right={<Stepper label={`${year}.${pad(month + 1)}`} onPrev={() => setMonthOffset((o) => o - 1)} onNext={() => setMonthOffset((o) => o + 1)} />}
      />
      <div className="mbody">
        <div className="mcard">
          <div className="mcard__head"><span className="t">내 근무</span><span className="mcard__sub">{month + 1}월</span></div>
          <div className="mcal">
            {WEEK.map((w, i) => (
              <span key={w} className="mcal__h" style={i === 0 ? { color: '#DE5151' } : i === 6 ? { color: '#3B7DE8' } : undefined}>{w}</span>
            ))}
            {Array.from({ length: firstDow }, (_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: days }, (_, i) => {
              const d = i + 1
              const code = duties[d]?.code
              const isToday = isThisMonth && d === today.getDate()
              const dow = (firstDow + i) % 7
              return (
                <span key={d} className={`mcal__cell${isToday ? ' today' : ''}`}>
                  <span className="n" style={dow === 0 ? { color: '#DE5151' } : dow === 6 ? { color: '#3B7DE8' } : undefined}>{d}</span>
                  <span className="c" style={{ color: codeColor(code) }}>{code ?? ''}</span>
                </span>
              )
            })}
          </div>
        </div>

        <div className="mcard">
          <div className="mcard__head">
            <span className="t">오늘 {teamName}</span>
            <span className="mcard__sub">{today.getMonth() + 1}/{today.getDate()} ({WEEK[today.getDay()]})</span>
          </div>
          {team.map((p) => {
            const tt = p.code ? TIMES[p.code] : null
            return (
              <div key={p.employeeNo} className="mrow">
                <span className="mrow__name">{p.name}</span>
                {p.role && <span className="mrow__role">{p.role}</span>}
                <span className="mlog__cat" style={{ ...codeChip(p.code), marginLeft: 'auto' }}>
                  {p.code ?? '—'}{tt ? ` · ${pad(tt[0] % 24)}–${pad(tt[1] % 24)}` : ''}
                </span>
              </div>
            )
          })}
          {team.length === 0 && <div className="mempty">팀 정보를 불러오는 중…</div>}
        </div>
      </div>
    </div>
  )
}

export default MobileSchedule
