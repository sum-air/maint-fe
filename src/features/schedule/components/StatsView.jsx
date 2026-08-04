import { useState } from 'react'
import { MONO } from '../utils.js'

// 월간 통계 히트맵 — 클로드 디자인 "정비본부 통계 (화면)" 포팅.
// 인원 × 지표 표. 지표별로 정규화한 값을 초록 농도로 표현하고,
// 셀 호버 시 지표 종류에 따라 다른 상세 팝오버를 띄운다.
// 데이터는 백엔드 연동 전 임시(2026년 7월 고정).

const METRICS = [
  { k: 'total', s: '총일' }, { k: 'work', s: '근무' }, { k: 'off', s: '휴무' }, { k: 'leave', s: '휴가' },
  { k: 'wsHold', s: '보유대휴' }, { k: 'wsUse', s: '사용대휴' }, { k: 'wsGen', s: '발생대휴' },
  { k: 'edu', s: '교육/출장' }, { k: 'board', s: '탑승' }, { k: 'urgent', s: '긴급정비' }, { k: 'etc', s: '기타' },
]

const P = [
  { name: '김기홍', role: '사원', team: '정비기획팀', v: { total: 31, work: 21, off: 8, edu: 2, wsGen: 1, wsHold: 3, wsUse: 2, board: 4, leave: 2, urgent: 1, etc: 1 } },
  { name: '김경목', role: '팀장', team: '정비기술팀', v: { total: 31, work: 22, off: 9, edu: 0, wsGen: 0, wsHold: 1, wsUse: 1, board: 6, leave: 0, urgent: 3, etc: 0 } },
  { name: '현은솔', role: '대리', team: '정비기술팀', v: { total: 31, work: 20, off: 10, edu: 1, wsGen: 2, wsHold: 4, wsUse: 1, board: 3, leave: 1, urgent: 2, etc: 2 } },
  { name: '서강윤', role: '팀장', team: '정비품질팀', v: { total: 31, work: 23, off: 8, edu: 3, wsGen: 1, wsHold: 2, wsUse: 0, board: 7, leave: 0, urgent: 0, etc: 0 } },
  { name: '김정은', role: '사원', team: '정비품질팀', v: { total: 31, work: 19, off: 11, edu: 4, wsGen: 3, wsHold: 5, wsUse: 3, board: 2, leave: 4, urgent: 1, etc: 1 } },
  { name: '간성진', role: '팀장', team: '정비자재팀', v: { total: 31, work: 22, off: 9, edu: 1, wsGen: 1, wsHold: 2, wsUse: 1, board: 5, leave: 0, urgent: 2, etc: 1 } },
  { name: '박종진', role: '과장', team: '정비자재팀', v: { total: 31, work: 21, off: 9, edu: 1, wsGen: 0, wsHold: 2, wsUse: 2, board: 5, leave: 1, urgent: 4, etc: 0 } },
  { name: '이신행', role: '사원', team: '정비자재팀', v: { total: 31, work: 18, off: 10, edu: 2, wsGen: 1, wsHold: 3, wsUse: 1, board: 1, leave: 3, urgent: 2, etc: 3 } },
  { name: '차면규', role: '팀장', team: '운항정비팀', v: { total: 31, work: 23, off: 8, edu: 1, wsGen: 0, wsHold: 2, wsUse: 1, board: 6, leave: 0, urgent: 3, etc: 0 } },
  { name: '문지환', role: '과장', team: '운항정비팀', v: { total: 31, work: 22, off: 8, edu: 0, wsGen: 2, wsHold: 4, wsUse: 2, board: 8, leave: 1, urgent: 5, etc: 1 } },
  { name: '김찬수', role: '대리', team: '운항정비팀', v: { total: 31, work: 20, off: 9, edu: 3, wsGen: 1, wsHold: 1, wsUse: 0, board: 3, leave: 2, urgent: 2, etc: 2 } },
  { name: '이서용', role: '사원', team: '운항정비팀', v: { total: 31, work: 19, off: 11, edu: 2, wsGen: 2, wsHold: 3, wsUse: 2, board: 2, leave: 2, urgent: 1, etc: 2 } },
  { name: '김동민', role: '사원', team: '운항정비팀', v: { total: 31, work: 21, off: 9, edu: 1, wsGen: 1, wsHold: 2, wsUse: 1, board: 5, leave: 1, urgent: 3, etc: 0 } },
  { name: '오명열', role: '사원', team: '운항정비팀', v: { total: 31, work: 22, off: 8, edu: 0, wsGen: 0, wsHold: 1, wsUse: 1, board: 7, leave: 1, urgent: 4, etc: 1 } },
  { name: '오정훈', role: '사원', team: '운항정비팀', v: { total: 31, work: 20, off: 10, edu: 2, wsGen: 1, wsHold: 3, wsUse: 2, board: 4, leave: 1, urgent: 2, etc: 1 } },
  { name: '김성은', role: '사원', team: '운항정비팀', v: { total: 31, work: 23, off: 8, edu: 1, wsGen: 0, wsHold: 2, wsUse: 0, board: 6, leave: 0, urgent: 3, etc: 0 } },
]

const UNIT = { total: '일', work: '일', off: '일', leave: '일', wsHold: '일', wsUse: '일', wsGen: '일', edu: '일', board: '회', urgent: '건', etc: '건' }

// ── 히트맵 스케일 색 헬퍼 (연보라 → 진보라, 브랜드 계열) ──
const lerp = (a, b, t) => Math.round(a + (b - a) * t)
const h2 = (n) => n.toString(16).padStart(2, '0')
const C0 = [241, 241, 255] // #F1F1FF
const C1 = [67, 63, 187] // #433FBB
const green = (t) => '#' + h2(lerp(C0[0], C1[0], t)) + h2(lerp(C0[1], C1[1], t)) + h2(lerp(C0[2], C1[2], t))
const mixHex = (hex, to, t) => {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return '#' + a.map((c, i) => h2(lerp(c, to[i], t))).join('')
}

// 지표별 min/max (열 단위 정규화)
const STAT = {}
METRICS.forEach((m) => {
  const vs = P.map((p) => p.v[m.k])
  STAT[m.k] = { min: Math.min(...vs), max: Math.max(...vs) }
})
const norm = (k, v) => {
  const s = STAT[k]
  return s.max === s.min ? 1 : (v - s.min) / (s.max - s.min)
}

const YEAR = 2026
const MONTH = 6 // 7월

// 미니 달력 셀 배열 생성: markOf(d) 가 색을 돌려주면 그 날을 채운다
const buildCal = (markOf) => {
  const first = new Date(YEAR, MONTH, 1).getDay()
  const cal = []
  for (let i = 0; i < first; i++) cal.push({ n: '', cellStyle: { height: 22 } })
  for (let d = 1; d <= 31; d++) {
    const wd = new Date(YEAR, MONTH, d).getDay()
    const base = { height: 22, display: 'grid', placeItems: 'center', fontFamily: MONO, fontSize: 10, fontWeight: 700, borderRadius: 4 }
    const mark = markOf(d)
    cal.push({
      n: String(d),
      cellStyle: mark
        ? { ...base, background: mark, color: '#fff' }
        : { ...base, color: wd === 0 ? '#C99' : wd === 6 ? '#9CB' : '#B4B4BE' },
    })
  }
  return cal
}

// 지표별 호버 상세 (디자인 buildDetail 포팅)
const buildDetail = (k, p) => {
  const v = p.v[k]
  if (k === 'work') {
    const wk = Math.round(v * 0.55), am = Math.round(v * 0.22), nt = Math.max(0, v - wk - am), bd = p.v.board
    const arr = [{ label: '오전', val: am }, { label: '주간', val: wk }, { label: '야간', val: nt }, { label: '탑승', val: bd }]
    const mx = Math.max(1, ...arr.map((a) => a.val))
    const tot = arr.reduce((s, a) => s + a.val, 0) || 1
    return {
      mode: 'bars',
      bars: arr.map((a) => ({
        label: a.label,
        val: `${a.val}일(${Math.round((a.val / tot) * 100)}%)`,
        barStyle: { height: 8, width: `${Math.round((a.val / mx) * 100)}%`, minWidth: a.val > 0 ? 6 : 0, borderRadius: 99, background: green(0.4 + 0.5 * (a.val / mx)) },
      })),
    }
  }
  if (k === 'off') {
    const set = {}
    for (let i = 0; i < v; i++) set[2 + Math.round((i * 29) / Math.max(1, v))] = 1
    return { mode: 'offcal', cal: buildCal((d) => (set[d] ? '#1F7A45' : null)) }
  }
  if (k === 'leave') {
    const lv = {}
    for (let i = 0; i < v; i++) lv[4 + Math.round((i * 24) / Math.max(1, v))] = 1
    const of_ = {}
    for (let i = 0; i < p.v.off; i++) of_[2 + Math.round((i * 29) / Math.max(1, p.v.off))] = 1
    return {
      mode: 'offcal',
      cal: buildCal((d) => (lv[d] ? '#EBA400' : of_[d] ? '#1F7A45' : null)),
      legendItems: [{ sw: '#EBA400', label: '휴가' }, { sw: '#1F7A45', label: '휴무' }],
    }
  }
  if (k === 'etc') {
    const seed = (p.name.charCodeAt(0) + v * 6) % 9 + 3
    const kinds = ['병가', '공가', '청원/경조']
    const km = {}
    for (let i = 0; i < v; i++) km[((seed + i * 8) % 29) + 1] = kinds[i % 3]
    const col = { '병가': '#B5506E', '공가': '#3E7C8C', '청원/경조': '#8A6FB8' }
    return {
      mode: 'offcal',
      cal: buildCal((d) => (km[d] ? col[km[d]] : null)),
      legendItems: [{ sw: '#B5506E', label: '병가' }, { sw: '#3E7C8C', label: '공가' }, { sw: '#8A6FB8', label: '청원/경조' }],
    }
  }
  if (k === 'board' || k === 'urgent') {
    const set = {}
    const seed = (p.name.charCodeAt(0) + v * 4) % 7 + 2
    const days = []
    for (let i = 0; i < v; i++) {
      const d = ((seed + i * 7) % 29) + 1
      set[d] = 1
      days.push(d)
    }
    const cal = buildCal((d) => (set[d] ? '#1F7A45' : null))
    if (k === 'urgent') {
      const WD = ['일', '월', '화', '수', '목', '금', '토']
      let th = 0
      const hrRows = days.sort((a, b) => a - b).map((d) => {
        const h = 2 + ((seed + d) % 5)
        th += h
        return { dayLabel: `${d}일(${WD[new Date(YEAR, MONTH, d).getDay()]})`, hr: `${h}시간` }
      })
      return { mode: 'offcal', cal, hrRows, totalHr: `${th}시간` }
    }
    return { mode: 'offcal', cal }
  }
  if (k === 'wsUse') {
    const of_ = {}
    for (let i = 0; i < p.v.off; i++) of_[2 + Math.round((i * 29) / Math.max(1, p.v.off))] = 1
    const lv = {}
    for (let i = 0; i < p.v.leave; i++) lv[4 + Math.round((i * 24) / Math.max(1, p.v.leave))] = 1
    const cu = {}
    const seed = (p.name.charCodeAt(0) + v * 5) % 9 + 3
    for (let i = 0; i < v; i++) cu[((seed + i * 9) % 28) + 1] = 1
    return {
      mode: 'offcal',
      cal: buildCal((d) => (cu[d] ? '#4C6EF5' : lv[d] ? '#EBA400' : of_[d] ? '#1F7A45' : null)),
      legendItems: [{ sw: '#4C6EF5', label: '대휴' }, { sw: '#EBA400', label: '휴가' }, { sw: '#1F7A45', label: '휴무' }],
    }
  }
  if (k === 'edu') {
    const seed = (p.name.charCodeAt(0) + v * 7) % 9 + 3
    const kindMap = {}
    for (let i = 0; i < v; i++) kindMap[((seed + i * 8) % 29) + 1] = i % 3 === 2 ? 'trip' : 'edu'
    const col = { edu: '#45697E', trip: '#B98A2E' }
    return {
      mode: 'offcal',
      cal: buildCal((d) => (kindMap[d] ? col[kindMap[d]] : null)),
      legendItems: [{ sw: '#45697E', label: '교육' }, { sw: '#B98A2E', label: '출장' }],
    }
  }
  if (k === 'wsGen') {
    const base = p.v.off + v
    const actual = p.v.off
    const actualPct = Math.round((actual / Math.max(base, 1)) * 100)
    const short = actual < base
    return {
      mode: 'gen3',
      g3: {
        base: `${base}일`, actual: `${actual}일`, comp: `${v}일`, actualW: `${actualPct}%`,
        actualBar: short ? '#E0912E' : '#7FA98F', actualTx: short ? '#C77A1E' : '#3A3A46',
      },
    }
  }
  if (k === 'wsHold') {
    const used = p.v.wsUse || 0
    const src = [1, 3, 1, 2, 2, 1]
    const gen = []
    let total = v + used, mo = 7, gi = 0
    while (total > 0) {
      const n = Math.min(total, src[gi % src.length])
      gen.push({ mo, orig: n })
      total -= n
      mo--
      gi++
      if (mo < 1) mo = 12
    }
    let toUse = used
    const rows = gen.map((g) => {
      const u = Math.min(toUse, g.orig)
      toUse -= u
      return { mo: `${g.mo}월`, used: u > 0, orig: `${g.orig}일`, after: `${g.orig - u}일` }
    })
    return { mode: 'hold', rows }
  }
  return { mode: 'plain' }
}

const TEAMS_ORDER = [...new Set(P.map((p) => p.team))]

function StatsView() {
  const [collapsed, setCollapsed] = useState({})
  const [hover, setHover] = useState(null)

  const persons = P.map((p, pi) => ({ ...p, pi }))

  const enterCell = (m, p, e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const v = p.v[m.k]
    const t = norm(m.k, v)
    const dark = t > 0.5
    const det = buildDetail(m.k, p)
    setHover({
      name: p.name, role: p.role, team: p.team,
      tintBg: green(0.06 + 0.62 * t),
      tintFg: dark ? '#F3FBF6' : green(0.95),
      tintRole: dark ? 'rgba(255,255,255,.72)' : mixHex(green(0.95), [255, 255, 255], 0.4),
      tintBd: green(0.34 + 0.2 * t),
      tintBadgeFg: green(0.9),
      metric: m.s, value: String(v), unit: UNIT[m.k] || '',
      ...det,
      x: Math.round(r.left + r.width / 2), y: Math.round(r.top),
    })
  }

  const showMeta = hover && hover.mode !== 'offcal' && hover.mode !== 'hold' && hover.mode !== 'gen3'

  return (
    <div>
      {/* 범례: 낮음 → 높음 */}
      <div className="st-legend">
        <span>낮음</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
          <span key={t} style={{ width: 22, height: 12, borderRadius: 2, background: green(t) }} />
        ))}
        <span>높음</span>
      </div>

      <div className="hm">
        {/* 지표 헤더 */}
        <div className="hm-row">
          <span className="hm-corner" style={{ height: 52 }}>인원</span>
          {METRICS.map((m) => (
            <span key={m.k} className="st-head">{m.s}</span>
          ))}
        </div>

        {/* 팀 밴드 + 인원 행 */}
        {TEAMS_ORDER.map((team) => {
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
                  <div key={p.name} className="hm-row">
                    <span className="hm-name">
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#3A3A48' }}>{p.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#A0A0AE' }}>{p.role}</span>
                    </span>
                    {METRICS.map((m) => {
                      const v = p.v[m.k]
                      const t = norm(m.k, v)
                      return (
                        <span
                          key={m.k}
                          className="st-cell"
                          style={{ background: green(t), color: t > 0.55 ? '#F4F3FF' : '#3F3AA8' }}
                          onMouseEnter={(e) => enterCell(m, p, e)}
                          onMouseLeave={() => setHover(null)}
                        >
                          {v}
                        </span>
                      )
                    })}
                  </div>
                ))}
            </div>
          )
        })}
      </div>

      {/* 호버 팝오버 */}
      {hover && (
        <div className="st-pop" style={{ left: hover.x, top: hover.y - 12 }}>
          <div className="st-pop-card">
            <div className="st-pop-head" style={{ background: hover.tintBg }}>
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-.3px', color: hover.tintFg }}>{hover.name}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: hover.tintRole }}>{hover.role}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: hover.tintBadgeFg, background: '#fff', border: `1px solid ${hover.tintBd}`, borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap', flex: 'none' }}>
                {hover.team}
              </span>
            </div>
            <div className="st-pop-body">
              {showMeta && (
                <div className="st-pop-line">
                  <span className="st-pop-key">{hover.metric}</span>
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: '#2A2A34' }}>{hover.value}{hover.unit}</span>
                </div>
              )}

              {/* 근무: 시간대 구성 막대 */}
              {hover.mode === 'bars' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8, borderTop: '1px solid #F1F1F4' }}>
                  {hover.bars.map((b) => (
                    <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 30, flex: 'none', fontSize: 11, fontWeight: 700, color: '#7A7A88' }}>{b.label}</span>
                      <div style={{ flex: 1, background: '#EFF1F0', height: 8, borderRadius: 99, overflow: 'hidden' }}>
                        <div style={b.barStyle} />
                      </div>
                      <span style={{ flex: 'none', textAlign: 'right', fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#3A3A46' }}>{b.val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 미니 달력 */}
              {hover.mode === 'offcal' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
                      <span key={w} style={{ fontSize: 9, fontWeight: 700, color: i === 0 ? '#C99' : i === 6 ? '#9CB' : '#8A8A98', textAlign: 'center' }}>{w}</span>
                    ))}
                    {hover.cal.map((d, i) => (
                      <span key={i} style={d.cellStyle}>{d.n}</span>
                    ))}
                  </div>
                  {hover.legendItems && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 9, paddingTop: 8, borderTop: '1px solid #F1F1F4' }}>
                      {hover.legendItems.map((g) => (
                        <span key={g.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#7A7A88' }}>
                          <span style={{ width: 9, height: 9, borderRadius: 3, background: g.sw }} />{g.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {hover.hrRows && (
                    <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid #F1F1F4', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#3A3A46' }}>총 투입 시간</span>
                        <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: '#1F7A45' }}>{hover.totalHr}</span>
                      </div>
                      {hover.hrRows.map((r) => (
                        <div key={r.dayLabel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#7A7A88' }}>{r.dayLabel}</span>
                          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: '#3A3A46' }}>{r.hr}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 발생대휴: 기준/실제 휴무 비교 + 대휴 지급 */}
              {hover.mode === 'gen3' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#7A7A88' }}>기준 휴무</span>
                      <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: '#3A3A46' }}>{hover.g3.base}</span>
                    </div>
                    <div style={{ height: 5, background: '#EDEFF2', borderRadius: 3 }}>
                      <div style={{ height: 5, width: '100%', background: '#C4CBD3', borderRadius: 3 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#7A7A88' }}>실제 휴무</span>
                      <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: hover.g3.actualTx }}>{hover.g3.actual}</span>
                    </div>
                    <div style={{ height: 5, background: '#EDEFF2', borderRadius: 3 }}>
                      <div style={{ height: 5, width: hover.g3.actualW, background: hover.g3.actualBar, borderRadius: 3 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: '#EAF6EE' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#1F7A45' }}>대휴 지급</span>
                    <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: '#1F7A45' }}>{hover.g3.comp}</span>
                  </div>
                </div>
              )}

              {/* 보유대휴: 월별 적립/사용 내역 */}
              {hover.mode === 'hold' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {hover.rows.map((h) => (
                    <div key={h.mo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#7A7A88' }}>{h.mo}</span>
                      {h.used ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: '#C0392B', textDecoration: 'line-through' }}>{h.orig}</span>
                          <span style={{ fontSize: 11, color: '#B4B4BE' }}>→</span>
                          <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: '#2A2A34' }}>{h.after}</span>
                        </span>
                      ) : (
                        <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: '#2A2A34' }}>{h.orig}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatsView
