import { useEffect, useRef, useState } from 'react'
import { TEAMS, ROSTER, CODE_CAT, CAT, PAL, pickCode } from '../../../shared/lib/workCodes.js'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const WEEKEND_BG = '#F7F7FC' // 주말 열 틴트
const PIN = '#EA8A0C' // 행/열 고정 강조색
const PIN_TINT = 'rgba(234,138,12,0.10)'
const PIN_BG = '#FDF0DA'

// 팀별 근무코드 히트맵 표. 셀 호버 → 팝오버, 셀 클릭 → 근무코드 변경 모달.
function MonthHeatmap({ year, month, hasData, collapsed, onToggleTeam, hiCode, overrides, onCellHover, onCellLeave, onCellClick, onPaste }) {
  const days = new Date(year, month + 1, 0).getDate()
  const dow = (d) => new Date(year, month, d).getDay()

  // ── 엑셀식 셀 선택 + 복사/붙여넣기 ──
  // 클릭 = 선택, Ctrl/Cmd+클릭 = 다중 선택, Shift+클릭 = 사각 범위, 더블클릭 = 편집 모달
  const cellKey = (pi, d) => `${pi}_${d}`
  const [selected, setSelected] = useState(() => new Set())
  const [anchor, setAnchor] = useState(null)
  const clipRef = useRef(null) // Ctrl+C 로 복사한 { code, hours }
  const dragRef = useRef(null) // 드래그 중: { pi, d, moved }
  const suppressClickRef = useRef(false) // 드래그 직후 따라오는 click 무시

  const codeAt = (pi, d) =>
    overrides[cellKey(pi, d)]?.code ?? (hasData ? pickCode(pi, d, dow(d)) : null)

  // (p0,d0)–(p1,d1) 사각 범위의 셀 키 집합
  const rectSet = (p0, d0, p1, d1) => {
    const [pa, pb] = [Math.min(p0, p1), Math.max(p0, p1)]
    const [da, db] = [Math.min(d0, d1), Math.max(d0, d1)]
    const next = new Set()
    for (let a = pa; a <= pb; a++) for (let b = da; b <= db; b++) next.add(cellKey(a, b))
    return next
  }

  const handleSelect = (pi, d, e) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    const key = cellKey(pi, d)
    if (e.metaKey || e.ctrlKey) {
      setSelected((prev) => {
        const next = new Set(prev)
        next.has(key) ? next.delete(key) : next.add(key)
        return next
      })
      setAnchor({ pi, d })
    } else if (e.shiftKey && anchor) {
      setSelected(rectSet(anchor.pi, anchor.d, pi, d))
    } else {
      setSelected(new Set([key]))
      setAnchor({ pi, d })
    }
  }

  // ── 마우스 드래그 범위 선택 ──
  const startDrag = (pi, d, e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return
    dragRef.current = { pi, d, moved: false }
    onCellLeave() // 드래그 중엔 호버 팝오버 숨김
  }

  // 드래그 중이면 범위를 갱신하고 true 반환 (호버 팝오버 억제용)
  const dragOver = (pi, d) => {
    const st = dragRef.current
    if (!st) return false
    if (st.pi !== pi || st.d !== d) st.moved = true
    setSelected(rectSet(st.pi, st.d, pi, d))
    setAnchor({ pi: st.pi, d: st.d })
    return true
  }

  useEffect(() => {
    const onUp = () => {
      if (dragRef.current) {
        if (dragRef.current.moved) suppressClickRef.current = true
        dragRef.current = null
      }
    }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'c' && anchor) {
        const code = codeAt(anchor.pi, anchor.d)
        if (code) clipRef.current = { code, hours: overrides[cellKey(anchor.pi, anchor.d)]?.hours }
      } else if (mod && e.key === 'v' && clipRef.current && selected.size) {
        const updates = {}
        selected.forEach((k) => { updates[k] = { ...clipRef.current } })
        onPaste(updates)
      } else if (e.key === 'Escape') {
        setSelected(new Set())
        setAnchor(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // 이름/날짜 클릭으로 행·열 고정 강조 (둘 다 여러 개 선택 가능)
  const [pinRows, setPinRows] = useState([])
  const [pinCols, setPinCols] = useState([])
  const togglePinRow = (pi) => setPinRows((cur) => (cur.includes(pi) ? cur.filter((x) => x !== pi) : [...cur, pi]))
  const togglePinCol = (d) => setPinCols((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))

  // 같은 팀 안에서 연속으로 고정된 행은 하나의 블록 — 구간의 위/아래 끝에만 가로 테두리
  const rowPinned = (pi) => pinRows.includes(pi)
  const rowEdge = (pi) => ({
    top: rowPinned(pi) && !(rowPinned(pi - 1) && ROSTER[pi - 1]?.team === ROSTER[pi].team),
    bottom: rowPinned(pi) && !(rowPinned(pi + 1) && ROSTER[pi + 1]?.team === ROSTER[pi].team),
  })

  // 연속으로 고정된 열은 하나의 블록으로 취급 — 구간의 양 끝에만 세로 테두리를 그린다
  const colPinned = (d) => pinCols.includes(d)
  const colEdge = (d) => ({
    left: colPinned(d) && !colPinned(d - 1),
    right: colPinned(d) && !colPinned(d + 1),
  })

  // 고정된 행/열에 속한 셀의 테두리 + 틴트 (box-shadow 로 그린다)
  const pinShadow = (pi, d) => {
    const sh = []
    let pinned = false
    if (rowPinned(pi)) {
      const e = rowEdge(pi)
      if (e.top) sh.push(`inset 0 2px 0 ${PIN}`)
      if (e.bottom) sh.push(`inset 0 -2px 0 ${PIN}`)
      if (d === days) sh.push(`inset -2px 0 0 ${PIN}`)
      pinned = true
    }
    if (colPinned(d)) {
      const e = colEdge(d)
      if (e.left) sh.push(`inset 2px 0 0 ${PIN}`)
      if (e.right) sh.push(`inset -2px 0 0 ${PIN}`)
      pinned = true
    }
    if (!pinned) return null
    sh.push(`inset 0 0 0 999px ${PIN_TINT}`, 'inset -1px -1px 0 #E4E4EC')
    return sh.join(', ')
  }

  // 선택 링(보라) — 이어진 선택 셀들은 한 블록으로 취급해 바깥 테두리만 그린다
  const selShadow = (pi, d) => {
    const sel = (a, b) => selected.has(cellKey(a, b))
    const parts = []
    if (!sel(pi, d - 1)) parts.push('inset 2px 0 0 #6868FF')
    if (!sel(pi, d + 1)) parts.push('inset -2px 0 0 #6868FF')
    if (!(sel(pi - 1, d) && ROSTER[pi - 1]?.team === ROSTER[pi].team)) parts.push('inset 0 2px 0 #6868FF')
    if (!(sel(pi + 1, d) && ROSTER[pi + 1]?.team === ROSTER[pi].team)) parts.push('inset 0 -2px 0 #6868FF')
    parts.push('inset 0 0 0 999px rgba(104,104,255,.10)')
    return parts
  }

  // 선택 링(보라) + 고정 테두리(주황) 조합
  const cellShadow = (pi, d, isSel) => {
    const parts = []
    if (isSel) parts.push(...selShadow(pi, d))
    const pin = pinShadow(pi, d)
    if (pin) parts.push(pin)
    else if (isSel) parts.push('inset -1px -1px 0 #E4E4EC')
    return parts.length ? parts.join(', ') : undefined
  }

  // 로스터 순서 기준 사람 인덱스 (임시 스케줄 생성 키)
  const persons = ROSTER.map((p, pi) => ({ ...p, pi }))

  const renderCell = (p, d) => {
    const ovKey = `${p.pi}_${d}`
    const ov = overrides[ovKey] // { code, hours? } — 모달에서 저장한 값
    const weekend = dow(d) === 0 || dow(d) === 6

    let code = ov?.code
    const ecHours = ov?.hours
    if (code === undefined) code = hasData ? pickCode(p.pi, d, dow(d)) : null

    const isSel = selected.has(ovKey)

    // 데이터 없는 달의 빈 셀
    if (code === null) {
      return (
        <span
          key={d}
          className="hm-cell"
          style={{
            background: weekend ? WEEKEND_BG : '#fff',
            opacity: hiCode ? 0.4 : 1,
            boxShadow: cellShadow(p.pi, d, isSel),
          }}
          onMouseDown={(e) => startDrag(p.pi, d, e)}
          onMouseEnter={() => dragOver(p.pi, d)}
          onClick={(e) => handleSelect(p.pi, d, e)}
          onDoubleClick={() => onCellClick({ pi: p.pi, d, name: p.name, role: p.role, team: p.team, code: '' })}
        />
      )
    }

    const cat = CODE_CAT[code]
    const off = cat === 'off'
    const dim = hiCode && code !== hiCode
    const hit = hiCode && code === hiCode // 코드 안내에서 선택한 근무코드와 일치
    // 배경 없이 텍스트에만 색 (엑셀 스타일) — m/d/n/t 는 비비드, 나머지 분류는 뮤트 톤. 휴무는 옅은 회색.
    const color = off ? '#ADB2BF' : PAL[cat] ? PAL[cat][1] : CAT[cat].tx
    const vivid = off ? '#8A8F9C' : PAL[cat] ? PAL[cat][1] : CAT[cat].dot
    // 긴급호출은 입력한 근무 시간을 괄호에 표시: EC(0) → EC(3)
    const label = code === 'EC(0)' && ecHours != null ? `EC(${ecHours})` : code

    return (
      <span
        key={d}
        className="hm-cell hm-cell--code"
        style={{
          // 하이라이트 매칭 셀은 분류색으로 채우고 흰 글자 — 흐려진 나머지와 확실히 대비
          background: hit ? vivid : weekend ? WEEKEND_BG : '#fff',
          color: hit ? '#fff' : color,
          fontSize: code.length >= 3 ? '11.5px' : '13px',
          letterSpacing: code.length >= 3 ? '-.6px' : '-.3px',
          opacity: dim ? 0.18 : 1,
          filter: dim ? 'grayscale(.5)' : 'none',
          boxShadow: cellShadow(p.pi, d, isSel),
        }}
        onMouseDown={(e) => startDrag(p.pi, d, e)}
        onMouseEnter={(e) => { if (!dragOver(p.pi, d)) onCellHover({ p, code, off, ecHours, d }, e) }}
        onMouseMove={(e) => { if (!dragRef.current) onCellHover({ p, code, off, ecHours, d }, e) }}
        onMouseLeave={onCellLeave}
        onClick={(e) => handleSelect(p.pi, d, e)}
        onDoubleClick={() => onCellClick({ pi: p.pi, d, name: p.name, role: p.role, team: p.team, code, hours: ecHours })}
      >
        {label}
      </span>
    )
  }

  return (
    <div className="hm">
      {/* 날짜 헤더 — 스크롤 시 상단 고정 */}
      <div className="hm-row hm-row--head">
        <span className="hm-corner">인원</span>
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1
          const w = dow(d)
          const col = w === 0 ? '#DE5151' : w === 6 ? '#3B7DE8' : '#5A5A68'
          const pinned = colPinned(d)
          const e = colEdge(d)
          return (
            <span
              key={d}
              className="hm-day"
              style={{
                background: pinned ? PIN_BG : w === 0 || w === 6 ? WEEKEND_BG : '#fff',
                cursor: 'pointer',
                boxShadow: pinned
                  ? [
                      e.left && `inset 2px 0 0 ${PIN}`,
                      e.right && `inset -2px 0 0 ${PIN}`,
                      `inset 0 2px 0 ${PIN}`,
                      'inset -1px -1px 0 #E4E4EC',
                    ].filter(Boolean).join(', ')
                  : undefined,
              }}
              onClick={() => togglePinCol(d)}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: col }}>{WEEK[w]}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: col }}>{d}</span>
            </span>
          )
        })}
      </div>

      {/* 팀 밴드 + 인원 행 */}
      {TEAMS.map((team) => {
        const ppl = persons.filter((p) => p.team === team)
        const open = !collapsed[team]
        return (
          <div key={team}>
            <div className="hm-teamband" onClick={() => onToggleTeam(team)}>
              <span className="hm-teamlabel">
                <span className="hm-chevron">{open ? '▾' : '▸'}</span>
                <span className="hm-teamname">{team}</span>
                <span className="hm-teamcount">{ppl.length}명</span>
              </span>
              {/* 날짜 칸과 같은 폭의 빈 칸들 — 열 고정 테두리가 팀 밴드를 관통해 이어지게 한다 */}
              {Array.from({ length: days }, (_, i) => {
                const d = i + 1
                const e = colEdge(d)
                return (
                  <span
                    key={d}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      alignSelf: 'stretch',
                      boxShadow: colPinned(d)
                        ? [
                            e.left && `inset 2px 0 0 ${PIN}`,
                            e.right && `inset -2px 0 0 ${PIN}`,
                            `inset 0 0 0 999px ${PIN_TINT}`,
                          ].filter(Boolean).join(', ')
                        : undefined,
                    }}
                  />
                )
              })}
            </div>
            {open &&
              ppl.map((p) => (
                <div key={p.name} className="hm-row">
                  <span
                    className="hm-name"
                    style={
                      rowPinned(p.pi)
                        ? {
                            background: PIN_BG,
                            cursor: 'pointer',
                            boxShadow: [
                              `inset 2px 0 0 ${PIN}`,
                              rowEdge(p.pi).top && `inset 0 2px 0 ${PIN}`,
                              rowEdge(p.pi).bottom ? `inset 0 -2px 0 ${PIN}` : 'inset 0 -1px 0 #E7E8EE',
                            ].filter(Boolean).join(', '),
                          }
                        : { cursor: 'pointer' }
                    }
                    onClick={() => togglePinRow(p.pi)}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#3A3A48' }}>{p.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#A0A0AE' }}>{p.role}</span>
                  </span>
                  {Array.from({ length: days }, (_, i) => renderCell(p, i + 1))}
                </div>
              ))}
          </div>
        )
      })}
    </div>
  )
}

export default MonthHeatmap
