import { useEffect, useState } from 'react'
import PageHero, { Stepper } from './PageHero.jsx'
import { fetchFlights } from '../../features/flight-ops/api.js'
import { mapFlights, FLT_ST, APT, todayKst, kstDateOf, actColor } from '../../features/flight-ops/utils.js'

// "YYYY-MM-DD" ± n일
const shiftDate = (d, delta) => {
  const t = new Date(`${d}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + delta)
  return t.toISOString().slice(0, 10)
}
// "HH:MM" 두 시각 사이 분 (익일 규칙)
const minBetween = (a, b) => {
  const [ah, am] = a.split(':').map(Number)
  const [bh, bm] = b.split(':').map(Number)
  let d = bh * 60 + bm - (ah * 60 + am)
  if (d <= 0) d += 1440
  return d
}

const JET = (
  <svg viewBox="0 0 24 24" style={{ transform: 'rotate(90deg)' }}>
    <path fill="#5350E2" d="M21.5 15.5v-2l-8-5V3c0-.83-.67-1.5-1.5-1.5S10.5 2.17 10.5 3v5.5l-8 5v2l8-2.5v5.5l-2 1.5V21l3.5-1 3.5 1v-1.5l-2-1.5v-5.5l8 2.5z" />
  </svg>
)

// 공항 블록 — 웹 AptBlock 의 모바일판 (이름·코드·계획/실제 시각, 늦으면 빨강·빠르면 파랑)
function Apt({ code, sched, act, schedLabel, actLabel, dim }) {
  return (
    <span className="mfo__apt">
      <span className="nm">{APT[code]?.name ?? code}</span>
      <span className="cd" style={dim ? { color: '#B6B6C2' } : undefined}>{APT[code]?.code ?? code}</span>
      <span className="tr">{schedLabel} <b>{sched}</b></span>
      <span className="tr">{actLabel} <b style={{ color: act ? actColor(sched, act) : '#B6B6C2' }}>{act || '—'}</b></span>
    </span>
  )
}

// 티켓 한 행 — 웹 TicketRow 와 같은 문법을 모바일 폭에 맞게
function Ticket({ leg }) {
  const cur = leg.st === '운항중'
  const pct = leg.pct ?? 0
  const [from, to] = leg.dir.split('')
  const st = FLT_ST[leg.st] ?? FLT_ST['예정']
  const remainMin = cur ? Math.max(0, Math.round((minBetween(leg.std, leg.sta) * (100 - pct)) / 100)) : 0

  return (
    <div className={cur ? 'mfo now' : 'mfo'}>
      <div className="mfo__top">
        <span className="mfo__no">{leg.fno}</span>
        <span className="mfo__pill" style={{ color: st.c, background: st.b }}>
          <i style={{ background: st.c }} />
          {leg.st}
        </span>
        {(leg.dl || leg.si) && <span className="mfo__pill dla">DLA</span>}
        <span className="mfo__stats">
          <span className="mfo__stat"><span className="lb">PAX</span><span className="v">{leg.pax != null ? <>{leg.pax}<small>명</small></> : '—'}</span></span>
          <span className="mfo__stat"><span className="lb">FUEL</span><span className="v">{leg.fuel != null ? <>{leg.fuel.toLocaleString()}<small>kg</small></> : '—'}</span></span>
        </span>
      </div>
      <div className="mfo__leg">
        <Apt code={from} sched={leg.std} act={leg.ad} schedLabel="STD" actLabel="AD" />
        <span className="mfo__track">
          {cur && (
            <>
              <span className="rail" />
              <span className="bar" style={{ width: `${pct}%` }} />
              <span className="lbl" style={{ left: `${Math.min(78, Math.max(22, pct))}%` }}>{Math.round(pct)}% · {remainMin}분 남음</span>
              <span className="plane" style={{ left: `${Math.min(94, Math.max(6, pct))}%` }}>{JET}</span>
            </>
          )}
          {leg.st === '도착' && (
            <>
              <span className="rail" style={{ background: '#5350E2', right: 12 }} />
              <span className="lbl" style={{ left: 'auto', right: 0, transform: 'none' }}>100%</span>
              <span className="plane" style={{ left: 'auto', right: -4, transform: 'none' }}>{JET}</span>
            </>
          )}
          {leg.st !== '운항중' && leg.st !== '도착' && <span className="rail" />}
        </span>
        <Apt
          code={to}
          sched={leg.sta}
          act={cur ? leg.eta : leg.aa}
          schedLabel="STA"
          actLabel={cur ? 'EA' : 'AA'}
          dim={leg.st !== '도착'}
        />
      </div>
      {leg.si && (
        <div className="mfo__si">
          <span className="bdg">SI</span>
          <span className="tx">{leg.si}</span>
          {leg.dl && <span className="dl">DL/{leg.dl}</span>}
        </div>
      )}
    </div>
  )
}

// 실시간 운항 모바일 — 기체 필터 탭 + 웹 티켓 디자인. 60초 자동 갱신.
function MobileFlightOps() {
  const [date, setDate] = useState(todayKst)
  const [fleet, setFleet] = useState(null)
  const [regSel, setRegSel] = useState(null)

  useEffect(() => {
    let alive = true
    setFleet(null)
    const load = () =>
      Promise.all([fetchFlights(shiftDate(date, -1)), fetchFlights(date)])
        .then(([prev, cur]) => {
          if (!alive) return
          const rows = [...(prev ?? []), ...(cur ?? [])].filter((f) => kstDateOf(f.scheduledDepartureUtc) === date)
          setFleet(mapFlights(rows))
        })
        .catch(() => { if (alive) setFleet({}) })
    load()
    const timer = setInterval(load, 60000)
    return () => { alive = false; clearInterval(timer) }
  }, [date])

  const aircraft = Object.keys(fleet ?? {})
  const reg = regSel && aircraft.includes(regSel) ? regSel : aircraft[0]
  const legs = fleet?.[reg] ?? []

  const dateLabel = `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`

  return (
    <div className="mhome">
      <PageHero
        title="실시간 운항"
        right={<Stepper label={dateLabel} onPrev={() => setDate((d) => shiftDate(d, -1))} onNext={() => setDate((d) => shiftDate(d, 1))} />}
      />
      <div className="mbody">
        {fleet === null ? (
          <div className="mempty" style={{ padding: '40px 0' }}>불러오는 중…</div>
        ) : aircraft.length === 0 ? (
          <div className="mempty" style={{ padding: '40px 0' }}>이 운항일에 편이 없습니다</div>
        ) : (
          <>
            <div className="mfotabs">
              {aircraft.map((r) => (
                <button key={r} type="button" className={reg === r ? 'mfotab on' : 'mfotab'} onClick={() => setRegSel(r)}>
                  {r}
                  <span className="cnt">{fleet[r].length}</span>
                </button>
              ))}
            </div>
            {/* 한 카드 안에 편들이 구분선으로 이어진다 — 웹 fo-card 문법 */}
            <div className="mfocard">
              {legs.map((l) => <Ticket key={l.fno} leg={l} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MobileFlightOps
