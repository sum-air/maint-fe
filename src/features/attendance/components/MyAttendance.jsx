import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, PieChart, Pie, Cell, Legend } from 'recharts'
import { CAT, CODE_CAT, MONO } from '../../../shared/lib/workCodes.js'

// 내 출퇴근 (근무자 화면) — 클로드 디자인 "정비본부 출퇴근 근무자 (화면)" 포팅.
// 오늘 근무 카드(실시간 진행) + 출퇴근 기록 + 이번 달 요약 + 캘린더 + 근무시간 차트.
// 데모 시계: 2026-07-20 10:50 부터 흐른다 (백엔드/실시간 연동 전).

const pad = (n) => String(n).padStart(2, '0')
const WL = ['일', '월', '화', '수', '목', '금', '토']
const TODAY = new Date(2026, 6, 20)
const CODE_SEQ = ['D1', 'D1', 'D2', 'D1', 'M1', 'N3', 'T1']
const IN_MAP = { D1: '07:58', D2: '08:56', M1: '05:57', N3: '12:55', T1: '05:56' }
const OUT_MAP = { D1: '17:05', D2: '18:06', M1: '15:04', N3: '22:06', T1: '15:03' }
const OT_MAP = { 3: '2.0h', 8: '1.5h', 15: '3.0h', 17: '2.5h', 18: '1.0h' }

const ST = {
  normal: { c: '#1F9D6B', b: '#E6F5EE', label: '정상' },
  late: { c: '#C97A17', b: '#FBEFD9', label: '지각' },
  early: { c: '#D2731E', b: '#FBECDD', label: '조퇴' },
  leave: { c: '#9C8B93', b: '#F0EBED', label: '휴무' },
  sched: { c: '#8A8A98', b: '#EFEFF2', label: '예정' },
}

const rnd = (seed) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const codeBadge = (code, big) => {
  const cc = CAT[CODE_CAT[code]]
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: big ? 52 : 42, padding: big ? '6px 14px' : '3px 10px', borderRadius: big ? 9 : 6,
    fontSize: big ? 15 : 11.5, fontWeight: 700, fontFamily: MONO,
    color: cc.tx, background: cc.bg, border: `1px solid ${cc.br}`,
  }
}

const pill = (st) => ({
  display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999,
  fontSize: 11.5, fontWeight: 800, color: ST[st].c, background: ST[st].b, whiteSpace: 'nowrap',
})

const selStyle = {
  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: '#3A3A46', background: '#fff',
  border: '1px solid #DCDCE4', borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
}

// ── Recharts 스택 바 차트 ──
// 정수면 소수점 없이 (8h), 아니면 한 자리 (1.5h)
const fmtH = (v) => `${Number.isInteger(v) ? v : v.toFixed(1)}h`

// 요일 축 라벨 (일=빨강, 토=파랑)
const DayTick = ({ x, y, payload, isWeek }) => {
  const c = isWeek && payload.value === '일' ? '#D06A6A' : isWeek && payload.value === '토' ? '#5A7FD0' : '#8A8A98'
  return (
    <text x={x} y={y + 14} textAnchor="middle" fontSize={11} fontWeight={700} fill={c}>
      {payload.value}
    </text>
  )
}

const ChartTooltip = ({ active, payload, label, isWeek }) => {
  if (!active || !payload?.length) return null
  const base = payload.find((p) => p.dataKey === 'base')?.value ?? 0
  const ot = payload.find((p) => p.dataKey === 'ot')?.value ?? 0
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E5EC', borderRadius: 10, boxShadow: '0 10px 26px rgba(21,21,29,.14)', padding: '9px 12px', fontSize: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4E4E5E', fontWeight: 600 }}>
        <i style={{ width: 8, height: 8, borderRadius: 2, background: CHART_BASE }} />기본
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontWeight: 800 }}>{fmtH(base)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4E4E5E', fontWeight: 600 }}>
        <i style={{ width: 8, height: 8, borderRadius: 2, background: CHART_OT }} />초과
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontWeight: 800 }}>{ot > 0 ? '+' + fmtH(ot) : '—'}</span>
      </div>
    </div>
  )
}

function StackChart({ data, max, isWeek }) {
  // 근무 없는 날(휴무)도 바닥에 짧은 회색 스텁이 보이게 한다
  const withStub = data.map((d) => ({ ...d, stub: d.base + d.ot === 0 ? max * 0.03 : 0 }))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={withStub} margin={{ top: 20, right: 0, left: -18, bottom: 0 }} barCategoryGap="26%">
        <CartesianGrid vertical={false} stroke="#F0F0F5" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={<DayTick isWeek={isWeek} />} interval={0} />
        <YAxis
          domain={[0, max]}
          ticks={[0, max / 2, max]}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#C6C6D0', fontFamily: MONO, fontWeight: 600 }}
          tickFormatter={(v) => (v ? `${v}h` : '0')}
        />
        <Tooltip content={<ChartTooltip isWeek={isWeek} />} cursor={{ fill: 'rgba(67,63,187,.06)' }} />
        <Bar dataKey="stub" stackId="h" fill="#E1E1E9" radius={[3, 3, 3, 3]} maxBarSize={64} />
        <Bar dataKey="base" name="기본" stackId="h" fill={CHART_BASE} maxBarSize={64}>
          {/* 배경 대비가 약한 색을 쓰므로 값을 막대에 직접 표시 */}
          <LabelList
            dataKey="base"
            position="insideTop"
            formatter={(v) => (v > 0 ? fmtH(v) : '')}
            style={{ fill: '#fff', fontFamily: MONO, fontSize: 11, fontWeight: 800 }}
          />
        </Bar>
        <Bar dataKey="ot" name="초과" stackId="h" fill={CHART_OT} radius={[3, 3, 0, 0]} maxBarSize={64}>
          <LabelList
            dataKey="ot"
            position="top"
            formatter={(v) => (v > 0 ? '+' + fmtH(v) : '')}
            style={{ fill: CHART_OT, fontFamily: MONO, fontSize: 11, fontWeight: 800 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// 차트 색 — "딥 선셋" 팔레트 (validate_palette.js 검증 통과)
const CHART_BASE = '#433FBB' // 기본 근무
const CHART_OT = '#DB2777' // 초과 근무

// 이번 달 근무 구성 (도넛): 퍼플 → 마젠타 → 핑크 → 앰버 + 회색(휴무)
const COMP_DATA = [
  { name: '주간', value: 15 },
  { name: '야간', value: 4 },
  { name: '조기', value: 3 },
  { name: '탑승', value: 2 },
  { name: '휴무', value: 6 },
]
const COMP_COLORS = ['#433FBB', '#9333EA', '#DB2777', '#F59E0B', '#E1E1E9']

const CompTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E5EC', borderRadius: 10, boxShadow: '0 10px 26px rgba(21,21,29,.14)', padding: '8px 12px', fontSize: 12, fontWeight: 700 }}>
      {payload[0].name} <span style={{ fontFamily: MONO, fontWeight: 800 }}>{payload[0].value}일</span>
    </div>
  )
}

// 매초 흐르는 시계는 이 컴포넌트 안에만 둔다 —
// 부모(MyAttendance)가 매초 다시 렌더링되면 차트가 애니메이션을 반복해 깜빡이기 때문.
function useDemoClock() {
  const [now, setNow] = useState(() => new Date(2026, 6, 20, 10, 50, 0))
  useEffect(() => {
    const t = setInterval(() => setNow((n) => new Date(n.getTime() + 1000)), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

const card = { border: '1px solid #E5E5EC', borderRadius: 16, background: '#fff', boxShadow: '0 1px 2px rgba(21,21,29,.04)' }

// 오늘 근무 카드 — 보라 그라데이션 히어로 (링 게이지 + 날짜 + 출근/경과/남은 + 버튼)
// 데모 시계가 매초 갱신되므로 별도 컴포넌트로 격리 (차트 깜빡임 방지)
function TodayCard() {
  const now = useDemoClock()
  const start = new Date(now)
  start.setHours(7, 58, 0, 0)
  const sec = Math.max(0, Math.floor((now - start) / 1000))
  const elapsed = `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}`
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const pct = Math.max(0, Math.min(100, Math.round(((nowMin - 480) / 540) * 100)))
  const remMin = Math.max(0, 1020 - nowMin)
  const remain = `${pad(Math.floor(remMin / 60))}:${pad(remMin % 60)}`

  // 링 게이지 (r=52 원 둘레 326.7 기준)
  const CIRC = 2 * Math.PI * 52
  const dashOffset = CIRC * (1 - pct / 100)

  return (
    <div
      style={{
        borderRadius: 16, padding: '24px 30px', marginBottom: 12,
        background: 'linear-gradient(120deg,#5350E2 0%,#6E67F0 55%,#8A7BF5 100%)',
        color: '#fff', display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap',
        boxShadow: '0 10px 30px rgba(83,80,226,.28)',
      }}
    >
      {/* 링 게이지 */}
      <div style={{ position: 'relative', width: 118, height: 118, flex: 'none' }}>
        <svg viewBox="0 0 120 120" style={{ width: 118, height: 118, transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="11" />
          <circle
            cx="60" cy="60" r="52" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset .8s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 21, fontWeight: 800, letterSpacing: '-.5px' }}>{pct}%</span>
          <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.75 }}>근무 진행</span>
        </div>
      </div>

      {/* 날짜 + 스탯 */}
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.8 }}>2026년</div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.5px', marginTop: 2 }}>7월 20일 월요일</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, fontSize: 12.5, fontWeight: 700, opacity: 0.9 }}>
          <span>출근 <span style={{ fontFamily: MONO, fontWeight: 800 }}>07:58</span></span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>경과 <span style={{ fontFamily: MONO, fontWeight: 800 }}>{elapsed}</span></span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>남은 <span style={{ fontFamily: MONO, fontWeight: 800 }}>{remain}</span></span>
        </div>
      </div>

      {/* 출근/퇴근 버튼 — 출근한 상태라 출근하기는 비활성 */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 9 }}>
        <button
          type="button"
          disabled
          style={{ height: 52, padding: '0 26px', fontSize: 15, border: 'none', borderRadius: 12, background: 'rgba(255,255,255,.22)', color: 'rgba(255,255,255,.75)', fontFamily: 'inherit', fontWeight: 800, cursor: 'default' }}
        >
          출근하기
        </button>
        <button
          type="button"
          style={{ height: 52, padding: '0 26px', fontSize: 15, border: 'none', borderRadius: 12, background: '#fff', color: '#433FBB', fontFamily: 'inherit', fontWeight: 800, cursor: 'pointer' }}
        >
          퇴근하기
        </button>
      </div>
    </div>
  )
}

function MyAttendance() {
  const [ym, setYm] = useState('2026-7')
  const [week, setWeek] = useState(null)
  const [calY, setCalY] = useState(2026)
  const [calM, setCalM] = useState(6)
  const [wMonth, setWMonth] = useState(7)
  const [wWeek, setWWeek] = useState(3)
  const [mYear, setMYear] = useState(2026)

  // ── 출퇴근 기록: 선택한 달의 주차별 7일 ──
  const [yy, mm] = ym.split('-').map(Number)
  const mIdx = mm - 1
  const firstMon = new Date(yy, mIdx, 1)
  firstMon.setDate(1 - ((firstMon.getDay() + 6) % 7))
  const lastDate = new Date(yy, mIdx + 1, 0).getDate()
  const weeks = []
  const cur = new Date(firstMon)
  while (cur <= new Date(yy, mIdx, lastDate)) {
    const wk = []
    let inM = false
    for (let i = 0; i < 7; i++) {
      const dd = new Date(cur)
      dd.setDate(cur.getDate() + i)
      wk.push(dd)
      if (dd.getMonth() === mIdx && dd.getFullYear() === yy) inM = true
    }
    if (inM) weeks.push(wk)
    cur.setDate(cur.getDate() + 7)
  }
  let defIdx = 0
  if (yy === 2026 && mIdx === 6) {
    const f = weeks.findIndex((w) => w.some((x) => x.getDate() === 20))
    defIdx = f < 0 ? 0 : f
  }
  const weekIdx = week == null ? defIdx : Math.max(0, Math.min(weeks.length - 1, week))

  const genRow = (dt) => {
    const m = dt.getMonth(), d = dt.getDate(), wd = dt.getDay()
    const other = m !== mIdx
    const date = `${m + 1}/${d} (${WL[wd]})`
    let r
    if (wd === 0 || wd === 6) r = { date, code: 'OFF', in: '', out: '', dur: '—', st: 'leave', we: true }
    else {
      const code = CODE_SEQ[d % CODE_SEQ.length]
      const day0 = new Date(dt.getFullYear(), m, d)
      if (day0 > TODAY) r = { date, code, in: '', out: '', dur: '—', st: 'sched' }
      else if (day0.getTime() === TODAY.getTime()) r = { date, code: 'D1', in: '07:58', out: '', dur: '—', st: 'normal' }
      else {
        const late = (d * 3 + m) % 11 === 0
        r = { date, code, in: late ? `08:1${d % 6}` : IN_MAP[code], out: OUT_MAP[code], dur: `9:0${d % 6}`, st: late ? 'late' : 'normal' }
      }
    }
    // 초과 계산 (기준 9시간)
    let over = '—', overColor = '#C9C9D2', overW = 700
    if (r.dur && r.dur !== '—') {
      const [h, mn] = r.dur.split(':')
      const mins = +h * 60 + +mn - 540
      if (mins > 0) { over = `+${Math.floor(mins / 60)}:${pad(mins % 60)}`; overColor = '#C97A17'; overW = 800 }
    }
    return { ...r, other, over, overColor, overW }
  }
  const rows = weeks[weekIdx].map(genRow)

  // ── 이번 달 요약 ──
  const summary = [
    { label: '근무일', color: '#3F91D0', val: '15일', valColor: '#15151D' },
    { label: '휴무', color: '#B0B0BC', val: '6일', valColor: '#9C8B93' },
    { label: '휴가', color: '#E0A04A', val: '1일', valColor: '#C08A2E' },
    { label: '지각', color: '#E0913A', val: '1회', valColor: '#C97A17' },
    { label: '조퇴', color: '#E8806E', val: '0회', valColor: '#4E4E5E' },
    { label: '미입력', color: '#8A8A98', val: '1회', valColor: '#6E6E80' },
    { label: '총 근무시간', color: '#5350E2', val: '138h', valColor: '#5350E2' },
    { label: '초과시간', color: '#1F9D6B', val: '+2:20', valColor: '#1F9D6B' },
  ]

  // ── 캘린더 ──
  const calDim = new Date(calY, calM + 1, 0).getDate()
  const calFirst = new Date(calY, calM, 1).getDay()
  const calCells = []
  for (let i = 0; i < calFirst; i++) calCells.push(null)
  for (let d = 1; d <= calDim; d++) {
    const dt = new Date(calY, calM, d)
    const wd = dt.getDay()
    const we = wd === 0 || wd === 6
    const code = we ? 'OFF' : CODE_SEQ[d % CODE_SEQ.length]
    const cc = CAT[CODE_CAT[code]]
    const isT = calY === 2026 && calM === 6 && d === 20
    const past = dt < TODAY
    const isOff = code === 'OFF'
    calCells.push({
      d, code, isT,
      dayColor: wd === 0 ? '#D06A6A' : wd === 6 ? '#5A7FD0' : '#3A3A46',
      inTime: past && !we ? IN_MAP[code] : isT ? '07:58' : null,
      outTime: past && !we ? OUT_MAP[code] : null,
      ot: past && !we && calM === 6 ? OT_MAP[d] : null,
      // 코드는 배지 대신 작은 색 점 + 텍스트
      dotColor: isOff ? '#C6C9D2' : cc.dot,
      codeColor: isOff ? '#B4B7C0' : cc.tx,
    })
  }

  // ── 근무시간 차트 데이터 ──
  const wseed = wMonth * 100 + wWeek * 10
  let wReal = 0, wOt = 0
  const weekData = ['월', '화', '수', '목', '금', '토', '일'].map((d, i) => {
    if (i >= 5) return { label: d, base: 0, ot: 0 }
    const base = 8.0
    const ot = Math.round((0.6 + rnd(wseed + i) * 1.3) * 10) / 10
    wReal += base + ot
    wOt += ot
    return { label: d, base, ot }
  })
  const monthData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    let base = 0, ot = 0
    if (mYear !== 2026 || m <= 7) {
      base = 110 + Math.round(rnd(mYear * 100 + m) * 45)
      ot = 8 + Math.round(rnd(mYear * 77 + m) * 24)
    }
    return { label: `${m}월`, base, ot }
  })

  return (
    <div>
      {/* ── 오늘 근무 카드 (매초 갱신은 이 안에서만) ── */}
      <TodayCard />

      {/* ── 출퇴근 기록 + 이번 달 요약 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'stretch' }}>
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '15px 22px', borderBottom: '1px solid #F0F0F4', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>출퇴근 기록</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <select style={selStyle} value={ym} onChange={(e) => { setYm(e.target.value); setWeek(null) }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={`2026-${i + 1}`}>2026년 {i + 1}월</option>
                ))}
              </select>
              <div style={{ display: 'inline-flex', background: '#F0F0F5', border: '1px solid #E8E8EF', borderRadius: 11, padding: 4, gap: 2 }}>
                {weeks.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setWeek(i)}
                    style={{
                      border: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, borderRadius: 8,
                      padding: '6px 13px', cursor: 'pointer',
                      ...(i === weekIdx
                        ? { background: '#fff', color: '#15151D', boxShadow: '0 1px 2px rgba(21,21,29,.08)' }
                        : { background: 'transparent', color: '#8A8A98' }),
                    }}
                  >
                    {i + 1}주차
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '10px 22px', background: '#FAFAFC', borderBottom: '1px solid #F0F0F4', fontSize: 11, fontWeight: 800, color: '#9C9CAB' }}>
            {['일자', '코드', '출근', '퇴근', '근무', '초과', '상태'].map((h) => <div key={h} style={{ textAlign: 'center' }}>{h}</div>)}
          </div>
          {rows.map((w) => (
            <div key={w.date} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', alignItems: 'center', padding: '11px 22px', borderBottom: '1px solid #F4F4F7' }}>
              <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: w.other ? '#C2C2CC' : w.we ? '#C77' : '#4E4E5E' }}>{w.date}</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}><span style={codeBadge(w.code)}>{w.code}</span></div>
              <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 13, fontWeight: 600, color: w.in ? '#15151D' : '#C9C9D2' }}>{w.in || '—'}</div>
              <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 13, fontWeight: 600, color: w.out ? '#15151D' : '#C9C9D2' }}>{w.out || '—'}</div>
              <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: '#4E4E5E' }}>{w.dur}</div>
              <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 13, fontWeight: w.overW, color: w.overColor }}>{w.over}</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {!w.other && <span style={pill(w.st)}>{ST[w.st].label}</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...card, padding: '18px 22px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>이번 달 요약</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: '#5350E2', background: '#F1F1FF', border: '1px solid #DEDCFF', borderRadius: 99, padding: '3px 11px' }}>7월</span>
          </div>
          {summary.map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minHeight: 40, borderTop: '1px solid #F4F4F7' }}>
              <i style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: '#4E4E5E' }}>{s.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 800, fontFamily: MONO, color: s.valColor }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 캘린더 ── */}
      <div style={{ ...card, marginTop: 16, padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>캘린더</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" className="att-navbtn" onClick={() => { const m = calM - 1; setCalM(m < 0 ? 11 : m); if (m < 0) setCalY(calY - 1) }}>
              <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#3A3A46', minWidth: 92, textAlign: 'center' }}>{calY}년 {calM + 1}월</span>
            <button type="button" className="att-navbtn" onClick={() => { const m = calM + 1; setCalM(m > 11 ? 0 : m); if (m > 11) setCalY(calY + 1) }}>
              <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        </div>
        <div style={{ border: '1px solid #DADAE2', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#F4F4F8', borderBottom: '1px solid #DADAE2' }}>
            {WL.map((l, i) => (
              <div key={l} style={{ textAlign: 'center', padding: '7px 0', fontSize: 11.5, fontWeight: 800, color: i === 0 ? '#D06A6A' : i === 6 ? '#5A7FD0' : '#9C9CAB' }}>{l}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {calCells.map((c, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '1.5', borderRight: '1px solid #D3D3DD', borderBottom: '1px solid #D3D3DD',
                  padding: '6px 9px', display: 'flex', flexDirection: 'column',
                  background: c?.isT ? '#F6F5FF' : '#fff', // 오늘 셀 연보라 배경
                  boxShadow: c?.isT ? 'inset 0 0 0 2px #5350E2' : undefined,
                }}
              >
                {c && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: c.dayColor }}>{c.d}</span>
                      {c.isT && <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: '#5350E2', borderRadius: 99, padding: '1px 6px' }}>오늘</span>}
                      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <i style={{ width: 7, height: 7, borderRadius: '50%', background: c.dotColor }} />
                        <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 800, color: c.codeColor }}>{c.code}</span>
                      </span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 }}>
                      {c.inTime && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#AEAEBB' }}>출근</span>
                          <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: '#3A3A46' }}>{c.inTime}</span>
                        </div>
                      )}
                      {c.outTime && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#AEAEBB' }}>퇴근</span>
                          <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: '#3A3A46' }}>{c.outTime}</span>
                        </div>
                      )}
                      {c.ot && (
                        <div style={{ marginTop: 2, display: 'flex', justifyContent: 'center' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: '#E8892F', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                            <span>OT</span><span style={{ fontFamily: MONO }}>+{c.ot}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 근무시간 차트 ── */}
      <div style={{ ...card, marginTop: 16, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>근무시간</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, fontWeight: 700, color: '#8A8A98' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><i style={{ width: 9, height: 9, borderRadius: 2, background: CHART_BASE }} />기본</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><i style={{ width: 9, height: 9, borderRadius: 2, background: CHART_OT }} />초과</span>
          </div>
        </div>

        {/* 주간 스택바 (절반) + 이번 달 근무 구성 도넛 (절반) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ border: '1px solid #EEEEF0', borderRadius: 12, padding: '16px 18px', background: '#FAFAFB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 11px', borderRadius: 99, background: '#5350E2', color: '#fff', fontSize: 12, fontWeight: 800 }}>주간</span>
              <select style={selStyle} value={wMonth} onChange={(e) => setWMonth(+e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}월</option>)}
              </select>
              <select style={selStyle} value={wWeek} onChange={(e) => setWWeek(+e.target.value)}>
                {Array.from({ length: 5 }, (_, i) => <option key={i} value={i + 1}>{i + 1}주차</option>)}
              </select>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, padding: '5px 10px', borderRadius: 8, background: '#ECEBFA', fontWeight: 800, color: CHART_BASE }}>
                  <span style={{ fontSize: 10 }}>근무</span><span style={{ fontFamily: MONO, fontSize: 13 }}>{fmtH(wReal)}</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, padding: '5px 10px', borderRadius: 8, background: '#FBE3EF', fontWeight: 800, color: CHART_OT }}>
                  <span style={{ fontSize: 10 }}>초과</span><span style={{ fontFamily: MONO, fontSize: 13 }}>{fmtH(wOt)}</span>
                </span>
              </div>
            </div>

            {/* 주 52시간 게이지 — 초과 시 빨간색 + 초과 배지 (관리자 주간 탭과 동일 문법) */}
            {(() => {
              const LIMIT = 52
              const over = wReal > LIMIT
              const diff = Math.abs(wReal - LIMIT)
              const wpct = Math.min(100, Math.round((wReal / LIMIT) * 100))
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#8A8A98', flex: 'none' }}>주 52시간</span>
                  <div style={{ flex: 1, height: 7, background: '#EEEEF2', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${wpct}%`, height: '100%', background: over ? '#D23B3B' : CHART_BASE, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 800, color: over ? '#D23B3B' : '#3A3A46' }}>{fmtH(wReal)}</span>
                  <span
                    style={{
                      display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 99,
                      fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                      color: over ? '#D23B3B' : '#1F9D6B', background: over ? '#FBE6E6' : '#E6F5EE',
                    }}
                  >
                    {over ? `초과 +${fmtH(diff)}` : `여유 ${fmtH(diff)}`}
                  </span>
                </div>
              )
            })()}

            <StackChart data={weekData} max={10} isWeek />
          </div>

          <div style={{ border: '1px solid #EEEEF0', borderRadius: 12, padding: '16px 18px', background: '#FAFAFB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 11px', borderRadius: 99, background: '#5350E2', color: '#fff', fontSize: 12, fontWeight: 800 }}>근무 구성</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#9C9CAB' }}>이번 달 · 일수 기준</span>
            </div>
            <ResponsiveContainer width="100%" height={216}>
              <PieChart>
                {/* Chart.js 시안과 동일: 12시에서 시계 방향, 흰 경계 2px */}
                <Pie
                  data={COMP_DATA}
                  dataKey="value"
                  nameKey="name"
                  startAngle={90}
                  endAngle={-270}
                  innerRadius="60%"
                  outerRadius="96%"
                  stroke="#fff"
                  strokeWidth={2}
                  labelLine={false}
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, value, payload }) => {
                    // 조각 한가운데에 일수 표시 (밝은 휴무 조각만 어두운 글자)
                    const RAD = Math.PI / 180
                    const r = (innerRadius + outerRadius) / 2
                    const x = cx + r * Math.cos(-midAngle * RAD)
                    const y = cy + r * Math.sin(-midAngle * RAD)
                    return (
                      <text
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={11}
                        fontWeight={800}
                        fontFamily={MONO}
                        fill={payload.name === '휴무' ? '#6E6E80' : '#fff'}
                      >
                        {value}일
                      </text>
                    )
                  }}
                >
                  {COMP_DATA.map((d, i) => <Cell key={d.name} fill={COMP_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<CompTooltip />} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  content={() => (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {COMP_DATA.map((d, i) => (
                        <li key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 10, height: 10, background: COMP_COLORS[i], flex: 'none' }} />
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#4E4E5E' }}>
                            {d.name} <span style={{ fontFamily: MONO, fontWeight: 800, color: '#15151D' }}>{d.value}일</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ border: '1px solid #EEEEF0', borderRadius: 12, padding: '16px 18px', background: '#FAFAFB', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 11px', borderRadius: 99, background: '#5350E2', color: '#fff', fontSize: 12, fontWeight: 800 }}>월간</span>
            <select style={selStyle} value={mYear} onChange={(e) => setMYear(+e.target.value)}>
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#9C9CAB' }}>월별 총 근무시간</span>
          </div>
          <StackChart data={monthData} max={200} isWeek={false} />
        </div>
      </div>
    </div>
  )
}

export default MyAttendance
