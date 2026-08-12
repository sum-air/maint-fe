import { useState } from 'react'
import { MONO } from '../../../shared/lib/workCodes.js'
import { hoursBetween } from '../../../shared/lib/timeInput.js'
import { APT, FLT_ST, FLEET, AIRPORT_OPTS, actColor } from '../utils.js'
import './flight-ops.css'

const AIRCRAFT = Object.keys(FLEET)

// 여객기 아이콘 (아웃라인, 진행 방향 45°) — 운항중·도착 트랙 공용
function PlaneIcon() {
  return (
    <span style={{ display: 'inline-block', transform: 'rotate(45deg)' }}>
      <svg viewBox="0 0 24 24">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </svg>
    </span>
  )
}

// 공항 블록 — 김포 / GMP / STD 07:20 / AD 07:26 (실제가 늦으면 빨강, 빠르면 파랑)
function AptBlock({ code, sched, act, schedLabel, actLabel, dim }) {
  const label = { fontSize: 10, fontWeight: 800, color: '#B6B6C2', letterSpacing: '.4px' }
  const time = { fontFamily: MONO, fontSize: 12.5, fontWeight: 700 }
  return (
    <div style={{ width: 96, textAlign: 'center' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#6E6E80' }}>{APT[code].name}</div>
      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, letterSpacing: '-.5px', color: dim ? '#B6B6C2' : '#15151D', lineHeight: 1.15 }}>
        {APT[code].code}
      </div>
      <div style={{ marginTop: 4 }}>
        <span style={label}>{schedLabel} </span>
        <span style={{ ...time, color: '#4E4E5E' }}>{sched}</span>
      </div>
      <div>
        <span style={label}>{actLabel} </span>
        <span style={{ ...time, color: actColor(sched, act) }}>{act || '—'}</span>
      </div>
    </div>
  )
}

// 티켓 한 행 — 운항중 진행률은 데모 데이터 고정값.
// movement API 연동 시 갱신된 pct 를 내려주면 CSS transition 으로 스르륵 전진한다.
function TicketRow({ leg }) {
  const cur = leg.st === '운항중'
  const pct = leg.pct ?? 0

  const [from, to] = leg.dir.split('')
  const st = FLT_ST[leg.st]
  const flightMin = Math.round(hoursBetween(leg.std, leg.sta) * 60)
  const remainMin = Math.max(0, Math.round((flightMin * (100 - pct)) / 100))

  return (
    <div className={cur ? 'fo-row now' : 'fo-row'}>
      <div className="fo-leg">
        <AptBlock code={from} sched={leg.std} act={leg.ad} schedLabel="STD" actLabel="AD" />

        {/* 구간 트랙 — 도착: 실선+체크 / 운항중: 진행 바+여객기(줄 가운데) / 예정·지연: 점선 */}
        <div style={{ flex: 1, position: 'relative', height: 24 }}>
          {cur && (
            <>
              {/* 레일(남은 구간) 위에 진행 바 — 비행기는 바 끝의 오른쪽 */}
              <div className="fo-rail" />
              <div className="fo-bar" style={{ width: `${pct}%` }} />
              <div className="fo-planelabel" style={{ left: `calc(${pct}% + 10px)` }}>
                {Math.round(pct)}% · {remainMin}분 남음
              </div>
              <div className="fo-planebox" style={{ left: `calc(${pct}% + 10px)` }}>
                <PlaneIcon />
              </div>
            </>
          )}
          {leg.st === '도착' && (
            <>
              {/* 완료 — 진보라 레일 끝에 비행기 꼬리가 맞닿고, 위에 100% 표시 */}
              <div className="fo-rail" style={{ background: '#5350E2', right: 19 }} />
              <div className="fo-planelabel" style={{ left: 'auto', right: 11, transform: 'translateX(50%)' }}>100%</div>
              <div className="fo-planebox" style={{ left: 'auto', right: 0, transform: 'none' }}>
                <PlaneIcon />
              </div>
            </>
          )}
          {(leg.st === '예정' || leg.st === '지연' || leg.st === '결항') && (
            /* 아직 출발 전 — 빈 레일 (진행 0%) */
            <div className="fo-rail" />
          )}
        </div>

        {/* 운항중이면 실제 도착 대신 예상 도착(EA) 표시 */}
        <AptBlock
          code={to}
          sched={leg.sta}
          act={cur ? leg.eta : leg.aa}
          schedLabel="STA"
          actLabel={cur ? 'EA' : 'AA'}
          dim={leg.st !== '도착'}
        />
      </div>

      <div className="fo-stub">
        <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800 }}>{leg.fno}</div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          <span className="fo-pill" style={{ color: st.c, background: st.b }}>
            <i style={{ background: st.c }} />
            {leg.st}
          </span>
          {/* 딜레이가 있으면 상태 옆 DLA 배지 — 사유는 아래 SI 스트립에 */}
          {(leg.dl || leg.si) && (
            <span
              className="fo-pill"
              style={{ color: '#C97A17', background: '#FBEFD9', fontFamily: MONO, fontSize: 10.5, padding: '4px 9px' }}
            >
              DLA
            </span>
          )}
        </div>
        {/* PAX | FUEL 2열 — 급유 없는 편은 0kg, 스팟이 있으면 호버로 표시 */}
        <div className="fo-stats">
          <div>
            <div className="fo-statlb">PAX</div>
            <div className="fo-statv">{leg.pax}<small>명</small></div>
          </div>
          <div className={leg.spot ? 'fo-fuel' : undefined}>
            <div className="fo-statlb">FUEL</div>
            <div className="fo-statv">{leg.fuel.toLocaleString()}<small>kg</small></div>
            {leg.spot && <div className="fo-fueltip">SPOT {leg.spot}</div>}
          </div>
        </div>
      </div>

      {/* MVT SI 리마크 — 딜레이 사유 등 (있는 행에만 하단 스트립) */}
      {leg.si && (
        <div className="fo-si">
          <span className="fo-si-badge">SI</span>
          <span className="fo-si-text">{leg.si}</span>
          {leg.dl && <span className="fo-si-code">DL/{leg.dl}</span>}
        </div>
      )}
    </div>
  )
}

// 실시간 운항 — 항공기 등록부호 탭 + 구간 필터 + 보딩패스 티켓 스택 (movement API 연동 전 데모)
function FlightOpsPage() {
  const [reg, setReg] = useState(AIRCRAFT[0])
  const [depF, setDepF] = useState(null) // 출발 공항 필터 ('G'|'H'|null)
  const [arrF, setArrF] = useState(null) // 도착 공항 필터
  const [openMenu, setOpenMenu] = useState(null) // 'dep' | 'arr' | null

  const legs = FLEET[reg].filter((l) => {
    const [from, to] = l.dir.split('')
    return (!depF || from === depF) && (!arrF || to === arrF)
  })

  const labelOf = (key) => AIRPORT_OPTS.find((o) => o.key === key)?.label ?? '전체'

  return (
    <section>
      <div className="fo-head">
        <span className="fo-title">실시간 운항</span>
      </div>

      <div className="fo-card" style={{ marginTop: 18 }}>
        {/* 항공기 등록부호 탭 + 구간 필터 */}
        <div className="fo-tabs">
          {AIRCRAFT.map((r) => (
            <button key={r} type="button" className={reg === r ? 'fo-tab on' : 'fo-tab'} onClick={() => setReg(r)}>
              {r}
              <span className="fo-cnt">{FLEET[r].length}</span>
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, padding: '8px 0' }}>
            {[
              ['dep', '출발', depF, setDepF],
              ['arr', '도착', arrF, setArrF],
            ].map(([k, label, val, setVal]) => (
              <div key={k} style={{ position: 'relative', display: 'inline-flex' }}>
                <button
                  type="button"
                  className={val ? 'fo-filter on' : 'fo-filter'}
                  onClick={() => setOpenMenu((v) => (v === k ? null : k))}
                >
                  {label} · {labelOf(val)}
                  <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {openMenu === k && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={() => setOpenMenu(null)} />
                    <div className="fo-fmenu">
                      {AIRPORT_OPTS.map((o) => (
                        <button
                          key={o.key ?? '_all'}
                          type="button"
                          className={val === o.key ? 'fo-fitem on' : 'fo-fitem'}
                          onClick={() => { setVal(o.key); setOpenMenu(null) }}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 티켓 스택 */}
        {legs.map((l) => <TicketRow key={l.fno} leg={l} />)}
        {legs.length === 0 && (
          <div style={{ padding: '36px 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#B4B7C0' }}>
            조건에 맞는 편이 없습니다
          </div>
        )}
      </div>
    </section>
  )
}

export default FlightOpsPage
