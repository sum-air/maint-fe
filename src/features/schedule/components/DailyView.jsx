import { useEffect, useRef, useState } from 'react'
import { CODE_CAT, CAT, BADGE, TIMES, MONO, pickCode } from '../../../shared/lib/workCodes.js'

// 일간 스케줄 간트 타임라인 — 클로드 디자인 "정비본부 일간 스케줄 (화면)" 포팅.
// 왼쪽 고정 이름 열 + 가로 스크롤 24시간 트랙. 근무는 시작~종료 위치의 색 막대.
// 월간 뷰와 같은 데이터 소스(pickCode + overrides)를 쓴다.

// 한 화면에 약 14시간이 보이도록 시간 폭을 화면 크기에 맞춰 계산 (최소 56px)
// → 타임라인이 항상 화면보다 넓어서 스크롤이 생기고, 현재 시각을 중앙에 둘 수 있다
const VISIBLE_HOURS = 14
const MIN_HOURW = 56
const CAT_NAME = { m: '조기근무', d: '주간근무', t: '탑승근무', n: '야간근무', off: '휴무', ws: '대휴', lv: '연차', edu: '교육/출장', etc: '기타', ec: '긴급호출' }

const pad = (n) => String(n % 24).padStart(2, '0')
const tlabel = (h) => `${pad(h)}:00`

const PIN = '#EA8A0C' // 행 고정 강조색 (월간과 동일)
const PIN_TINT = 'rgba(234,138,12,0.10)'
const PIN_BG = '#FDF0DA'

// roster/teams 는 SchedulePage 가 내려준다 (실데이터 또는 데모 폴백).
function DailyView({ roster, teams, year, month, day, hasData, overrides }) {
  const [collapsed, setCollapsed] = useState({})
  const [hover, setHover] = useState(null)
  const scrollRef = useRef(null)
  const [hourW, setHourW] = useState(62)
  const trackW = 24 * hourW

  // 화면 폭에 맞춰 시간 폭 재계산
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      setHourW(Math.max(MIN_HOURW, Math.floor(entries[0].contentRect.width / VISIBLE_HOURS)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── 이름 클릭/드래그로 행 고정 강조 (월간과 같은 규칙) ──
  const [pinRows, setPinRows] = useState([])
  const dragRef = useRef(null) // { start, moved }
  const suppressClickRef = useRef(false)

  const rowPinned = (pi) => pinRows.includes(pi)
  // 같은 팀에서 이어진 고정 행은 한 블록 — 위/아래 끝에만 테두리
  const rowEdge = (pi) => ({
    top: rowPinned(pi) && !(rowPinned(pi - 1) && roster[pi - 1]?.team === roster[pi].team),
    bottom: rowPinned(pi) && !(rowPinned(pi + 1) && roster[pi + 1]?.team === roster[pi].team),
  })

  const clickRow = (pi) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    setPinRows((cur) => (cur.includes(pi) ? cur.filter((x) => x !== pi) : [...cur, pi]))
  }

  const startRowDrag = (pi, e) => {
    if (e.button !== 0) return
    dragRef.current = { start: pi, moved: false }
  }

  const rowDragOver = (pi) => {
    const st = dragRef.current
    if (!st) return
    if (st.start !== pi) st.moved = true
    const [a, b] = [Math.min(st.start, pi), Math.max(st.start, pi)]
    setPinRows(Array.from({ length: b - a + 1 }, (_, i) => a + i))
  }

  // ── 시간 눈금 클릭/드래그로 시간대 열 강조 ──
  const [pinHours, setPinHours] = useState([])
  const hourDragRef = useRef(null) // { start, moved }

  const hourPinned = (h) => pinHours.includes(h)

  const clickHour = (h) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    setPinHours((cur) => (cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h]))
  }

  const startHourDrag = (h, e) => {
    if (e.button !== 0) return
    hourDragRef.current = { start: h, moved: false }
  }

  const hourDragOver = (h) => {
    const st = hourDragRef.current
    if (!st) return
    if (st.start !== h) st.moved = true
    const [a, b] = [Math.min(st.start, h), Math.max(st.start, h)]
    setPinHours(Array.from({ length: b - a + 1 }, (_, i) => a + i))
  }

  // 이어진 시간대를 [시작, 끝] 구간 목록으로 (열 오버레이용)
  const hourRuns = () => {
    const runs = []
    let cur = null
    for (let h = 0; h < 24; h++) {
      if (hourPinned(h)) {
        if (cur) cur.e = h
        else cur = { s: h, e: h }
      } else if (cur) {
        runs.push(cur)
        cur = null
      }
    }
    if (cur) runs.push(cur)
    return runs
  }

  useEffect(() => {
    const onUp = () => {
      if (dragRef.current) {
        if (dragRef.current.moved) suppressClickRef.current = true
        dragRef.current = null
      }
      if (hourDragRef.current) {
        if (hourDragRef.current.moved) suppressClickRef.current = true
        hourDragRef.current = null
      }
    }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [])

  const nameShadow = (pi) => {
    if (!rowPinned(pi)) return undefined
    const e = rowEdge(pi)
    return [
      `inset 2px 0 0 ${PIN}`,
      e.top && `inset 0 2px 0 ${PIN}`,
      e.bottom && `inset 0 -2px 0 ${PIN}`,
    ].filter(Boolean).join(', ')
  }

  const trackShadow = (pi) => {
    if (!rowPinned(pi)) return undefined
    const e = rowEdge(pi)
    return [
      e.top && `inset 0 2px 0 ${PIN}`,
      e.bottom && `inset 0 -2px 0 ${PIN}`,
      `inset -2px 0 0 ${PIN}`,
      `inset 0 0 0 999px ${PIN_TINT}`,
    ].filter(Boolean).join(', ')
  }

  const dow = new Date(year, month, day).getDay()

  // 현재 시각 (빨간 세로선) — 데모 데이터라 날짜와 무관하게 현재 벽시계 기준
  const now = new Date()
  const nowFrac = (now.getHours() + now.getMinutes() / 60) / 24
  const nowLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  // 현재 시각이 항상 화면 중앙에 오도록 스크롤 (폭이 바뀌거나 날짜를 옮겨도 유지)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = Math.max(0, trackW * nowFrac - el.clientWidth / 2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hourW, day, month])

  const codeOf = (pi) => {
    const ov = overrides[`${pi}_${day}`]
    if (ov?.code) return { code: ov.code, hours: ov.hours }
    return { code: hasData ? pickCode(pi, day, dow) : null }
  }

  const showPop = (pop, e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = Math.min(Math.max(e.clientX, 130), window.innerWidth - 130)
    setHover({ ...pop, left: x, top: r.top })
  }

  const persons = roster.map((p, pi) => ({ ...p, pi }))
  // 시간 격자: 폭에 비례해 늘어나도록 % 기반으로 그린다
  const gridStyle = {
    backgroundImage: 'linear-gradient(90deg, #F2F2F6 1px, transparent 1px)',
    backgroundSize: `calc(100% / 24) 100%`,
  }

  // 근무 막대 렌더링
  const renderTrack = (p) => {
    const { code, hours } = codeOf(p.pi)
    if (!code) return null

    const cat = CODE_CAT[code] ?? 'etc'
    const c = CAT[cat]
    const tt = TIMES[code]
    const timed = !!tt
    const label = code === 'EC(0)' && hours != null ? `EC(${hours})` : code

    // 솔리드 컬러 막대 + 흰 글자 (구글 캘린더 스타일)
    const barBase = {
      boxSizing: 'border-box', position: 'absolute', top: '50%', transform: 'translateY(-50%)',
      height: 24, borderRadius: 7, background: BADGE[cat] ?? c.dot, color: '#fff',
      display: 'flex', alignItems: 'center', gap: 7, padding: '0 11px', fontSize: 11,
      overflow: 'hidden', whiteSpace: 'nowrap',
    }
    const off = cat === 'off'
    const offStyle = off ? { background: '#EDEFF3', color: '#9A9AA8' } : null

    let barStyle, timeLabel, popTime, popHours
    if (timed) {
      const s = tt[0]
      const e = Math.min(tt[1], 24) // MN(익일) 막대는 24시에서 자름
      barStyle = { ...barBase, left: `${(s / 24) * 100}%`, width: `${((e - s) / 24) * 100}%` }
      timeLabel = `${tlabel(tt[0])}–${tlabel(tt[1])}`
      popTime = `${tlabel(tt[0])} – ${tlabel(tt[1])}`
      popHours = `${tt[1] - tt[0]}h`
    } else {
      // 시간 정보가 없는 코드(휴무·연차·대휴·교육·긴급 등)는 전체 폭 막대
      barStyle = { ...barBase, ...offStyle, left: 0, right: 0, justifyContent: 'center' }
      timeLabel = code === 'EC(0)' && hours != null ? `${hours}시간` : CAT_NAME[cat]
      popTime = code === 'EC(0)' && hours != null ? `${hours}시간` : '전일'
      popHours = code === 'EC(0)' && hours != null ? `${hours}h` : '전일'
    }

    const pop = {
      code: label, shiftName: CAT_NAME[cat], hours: popHours, time: popTime,
      name: p.name, role: p.role, team: p.team,
      headBg: off ? '#EEF0F4' : c.bg, headTx: off ? '#43434E' : c.tx,
    }

    return (
      <div
        style={barStyle}
        onMouseEnter={(e) => showPop(pop, e)}
        onMouseMove={(e) => showPop(pop, e)}
        onMouseLeave={() => setHover(null)}
      >
        <span style={{ fontFamily: MONO, fontWeight: 800, flex: 'none' }}>{label}</span>
        <span style={{ fontFamily: MONO, fontWeight: 600, opacity: 0.85 }}>{timeLabel}</span>
      </div>
    )
  }

  return (
    <div>
      <div className="hm" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {/* 고정 이름 열 */}
          <div style={{ flex: 'none', width: 140, background: '#fff', position: 'relative', zIndex: 3, boxShadow: 'inset -1px 0 0 #E4E4EC' }}>
            <div className="hm-corner" style={{ width: 140 }}>인원</div>
            {teams.map((team) => {
              const ppl = persons.filter((p) => p.team === team)
              const open = !collapsed[team]
              return (
                <div key={team}>
                  <div className="hm-teamband" onClick={() => setCollapsed((s) => ({ ...s, [team]: !s[team] }))}>
                    <span className="hm-teamlabel">
                      <span className="hm-chevron">{open ? '▾' : '▸'}</span>
                      <span className="hm-teamname">{team}</span>
                      <span className="hm-teamcount">{ppl.length}명</span>
                    </span>
                  </div>
                  {open &&
                    ppl.map((p) => (
                      <div
                        key={p.pi}
                        style={{
                          height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          cursor: 'pointer', userSelect: 'none',
                          background: rowPinned(p.pi) ? PIN_BG : undefined,
                          boxShadow: nameShadow(p.pi),
                        }}
                        onMouseDown={(e) => startRowDrag(p.pi, e)}
                        onMouseEnter={() => rowDragOver(p.pi)}
                        onClick={() => clickRow(p.pi)}
                      >
                        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.2px', color: '#3A3A48' }}>{p.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#A0A0AE' }}>{p.role}</span>
                      </div>
                    ))}
                </div>
              )
            })}
          </div>

          {/* 스크롤 타임라인 */}
          <div ref={scrollRef} style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
            <div style={{ width: trackW }}>
              {/* 시간 눈금 — 클릭/드래그로 시간대 열 강조, 10분 단위 보조 눈금 */}
              <div style={{ height: 52, display: 'flex', alignItems: 'stretch', boxShadow: 'inset 0 -1px 0 #E4E4EC' }}>
                {Array.from({ length: 24 }, (_, h) => {
                  const pinned = hourPinned(h)
                  return (
                    <span
                      key={h}
                      style={{
                        width: hourW, flex: 'none', paddingLeft: 4, fontFamily: MONO, fontSize: 13, fontWeight: 700,
                        color: pinned ? '#B06A08' : '#9C9CAB', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none',
                        position: 'relative',
                        background: pinned ? PIN_BG : undefined,
                        boxShadow: pinned
                          ? [
                              !hourPinned(h - 1) && `inset 2px 0 0 ${PIN}`,
                              !hourPinned(h + 1) && `inset -2px 0 0 ${PIN}`,
                              `inset 0 2px 0 ${PIN}`,
                            ].filter(Boolean).join(', ')
                          : undefined,
                      }}
                      onMouseDown={(e) => startHourDrag(h, e)}
                      onMouseEnter={() => hourDragOver(h)}
                      onClick={() => clickHour(h)}
                    >
                      {/* 시간 숫자 — 정시 눈금(칸 왼쪽 끝) 위에 중앙 정렬 */}
                      <span
                        style={{
                          position: 'absolute', left: 0, top: 14,
                          transform: h === 0 ? 'none' : 'translateX(-50%)',
                          paddingLeft: h === 0 ? 4 : 0,
                        }}
                      >
                        {h}
                      </span>
                      {/* 정시(길게) + 10분 단위 눈금 (30분은 중간 길이) */}
                      {[0, 1, 2, 3, 4, 5].map((m) => (
                        <i
                          key={m}
                          style={{
                            position: 'absolute', bottom: 0, left: `${(m / 6) * 100}%`,
                            width: 1, height: m === 0 ? 13 : m === 3 ? 9 : 5,
                            background: m === 0 ? '#C6C6D2' : '#D8D8E0',
                          }}
                        />
                      ))}
                    </span>
                  )
                })}
                {/* 맨 끝 24 라벨 + 정시 눈금 */}
                <span style={{ width: 0, flex: 'none', overflow: 'visible', position: 'relative', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: '#9C9CAB' }}>
                  <span style={{ position: 'absolute', left: 0, top: 14, transform: 'translateX(-50%)' }}>24</span>
                  <i style={{ position: 'absolute', bottom: 0, left: -1, width: 1, height: 13, background: '#C6C6D2' }} />
                </span>
              </div>

              <div style={{ position: 'relative' }}>
                {/* 고정된 시간대 열 오버레이 — 모든 행을 관통하는 테두리 + 틴트 */}
                {hourRuns().map((r) => (
                  <div
                    key={r.s}
                    style={{
                      position: 'absolute', top: 0, bottom: 0,
                      left: `${(r.s / 24) * 100}%`, width: `${((r.e - r.s + 1) / 24) * 100}%`,
                      background: PIN_TINT,
                      boxShadow: `inset 2px 0 0 ${PIN}, inset -2px 0 0 ${PIN}`,
                      zIndex: 4, pointerEvents: 'none',
                    }}
                  />
                ))}
                {/* 현재 시각 선 */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: '#E0413F', left: `${nowFrac * 100}%`, zIndex: 5, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 11, height: 11, borderRadius: '50%', background: '#E0413F', boxShadow: '0 0 0 3px rgba(224,65,63,.18)' }} />
                  <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: '#E0413F', color: '#fff', fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '.3px', padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(224,65,63,.3)' }}>
                    {nowLabel}
                  </div>
                </div>

                {teams.map((team) => {
                  const ppl = persons.filter((p) => p.team === team)
                  const open = !collapsed[team]
                  return (
                    <div key={team}>
                      <div style={{ height: 38, background: '#FAFAFE', borderTop: '1px solid #E4E4EC', borderBottom: '1px solid #E4E4EC' }} />
                      {open &&
                        ppl.map((p) => (
                          <div
                            key={p.pi}
                            style={{
                              position: 'relative', height: 38,
                              ...gridStyle, boxShadow: trackShadow(p.pi),
                            }}
                          >
                            {renderTrack(p)}
                          </div>
                        ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 호버 팝오버 */}
      {hover && (
        <div className="spop" style={{ left: hover.left, top: hover.top - 10, width: 218, borderRadius: 14 }}>
          <div style={{ background: hover.headBg, padding: '11px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: hover.headTx }}>{hover.code}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: hover.headTx }}>{hover.shiftName}</span>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: hover.headTx, opacity: 0.82 }}>{hover.hours}</span>
          </div>
          <div style={{ padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 52, flex: 'none', fontSize: 11.5, fontWeight: 600, color: '#9C9CAB' }}>근무시간</span>
              <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 600, color: '#2A2A38' }}>{hover.time}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 52, flex: 'none', fontSize: 11.5, fontWeight: 600, color: '#9C9CAB' }}>이름</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#2A2A38' }}>{hover.name}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#9C9CAB' }}>{hover.role}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 52, flex: 'none', fontSize: 11.5, fontWeight: 600, color: '#9C9CAB' }}>팀명</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#4E4E5E' }}>{hover.team}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DailyView
