import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, PieChart, Pie, Cell, Legend } from 'recharts'
import { CAT, CODE_CAT, TIMES, MONO } from '../../../shared/lib/workCodes.js'
import { fetchMyMonthDuties } from '../../../shared/lib/roster.js'
import { fetchMyWorkSessions, fetchNetworkStatus, checkIn, checkOut, kstHM, durationHours } from '../../../shared/lib/attendance.js'
import { lateCheckoutSuggestion } from '../../../shared/lib/overtime.js'
import OvertimeAfterModal from './OvertimeAfterModal.jsx'
import { weekMeta } from '../utils.js'
import { showToast } from '../../../shared/lib/toast.js'

// 내 출퇴근 (근무자 화면) — 오늘 근무 카드 + 출퇴근 기록 + 이번 달 요약 + 캘린더 + 근무시간 차트.
// 근무코드는 /duty-assignments, 출퇴근 기록은 /work-sessions 실데이터.
// 집계·차트는 올해 내 세션 전체를 한 번 받아 화면에서 계산한다.

const pad = (n) => String(n).padStart(2, '0')
const WL = ['일', '월', '화', '수', '목', '금', '토']
const NOW = new Date()
const TODAY = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate())
const YEAR = TODAY.getFullYear()

const ST = {
  normal: { c: '#1F9D6B', b: '#E6F5EE', label: '정상' },
  late: { c: '#C97A17', b: '#FBEFD9', label: '지각' },
  early: { c: '#D2731E', b: '#FBECDD', label: '조퇴' },
  leave: { c: '#9C8B93', b: '#F0EBED', label: '휴무' },
  sched: { c: '#8A8A98', b: '#EFEFF2', label: '예정' },
  miss: { c: '#8A8A98', b: '#EFEFF2', label: '미체크' },
}

const codeBadge = (code, big) => {
  const cc = CAT[CODE_CAT[code]] ?? CAT.off // 배정 없는 날은 회색 톤
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

// 이번 달 근무 구성 (도넛) 색: 퍼플 → 마젠타 → 핑크 → 앰버 + 회색(휴무)
const COMP_COLORS = ['#433FBB', '#9333EA', '#DB2777', '#F59E0B', '#E1E1E9']

const CompTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E5EC', borderRadius: 10, boxShadow: '0 10px 26px rgba(21,21,29,.14)', padding: '8px 12px', fontSize: 12, fontWeight: 700 }}>
      {payload[0].name} <span style={{ fontFamily: MONO, fontWeight: 800 }}>{payload[0].value}일</span>
    </div>
  )
}

const card = { border: '1px solid #E5E5EC', borderRadius: 16, background: '#fff', boxShadow: '0 1px 2px rgba(21,21,29,.04)' }

// 매초 흐르는 시계는 이 컴포넌트 안에만 둔다 —
// 부모(MyAttendance)가 매초 다시 렌더링되면 차트가 애니메이션을 반복해 깜빡이기 때문.
function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

const fmtHMs = (ms) => {
  const sec = Math.max(0, Math.floor(ms / 1000))
  return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor((sec % 3600) / 60))}`
}

// 와이파이 아이콘 — off 면 사선
const WifiIcon = ({ off }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8.8a15 15 0 0 1 20 0" /><path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8.5 16a5 5 0 0 1 7 0" />
    <circle cx="12" cy="19.5" r=".9" fill="currentColor" />
    {off && <path d="M3 3l18 18" />}
  </svg>
)

// 오늘 근무 카드 — 보라 그라데이션 히어로 (링 게이지 + 날짜 + 출근/경과/남은 + 네트워크 + 버튼)
// session: 오늘/열린 내 세션, todayCode: 오늘 근무코드 (계획 퇴근시각·진행률 계산용)
// network: 서버가 판정한 현재 네트워크 { allowed, name, location } — 아직 모르면 null
function TodayCard({ session, todayCode, network, busy, onPunch }) {
  const now = useClock()
  // 사내망 아님이 확인된 경우만 버튼을 잠근다 (판정 전·제한 없음은 그대로) — 최종 판정은 서버 403
  const blocked = network != null && !network.allowed

  const inMs = session ? Date.parse(session.checkedInAtUtc) : null
  const outMs = session?.checkedOutAtUtc ? Date.parse(session.checkedOutAtUtc) : null
  // 계획 퇴근 시각 — 오늘 근무코드의 종료 시각 (없으면 출근 +9시간)
  const tt = todayCode ? TIMES[todayCode] : null
  const planEndMs = inMs != null
    ? (tt
        ? new Date(now).setHours(tt[1] % 24, 0, 0, 0) + (tt[1] >= 24 ? 864e5 : 0)
        : inMs + 9 * 3600e3)
    : null

  const closed = outMs != null
  const elapsed = inMs == null ? '—' : fmtHMs((closed ? outMs : now.getTime()) - inMs)
  const remain = inMs == null || closed ? '—' : fmtHMs(Math.max(0, planEndMs - now.getTime()))
  const pct = inMs == null
    ? 0
    : closed
      ? 100
      : Math.max(0, Math.min(99, Math.round(((now.getTime() - inMs) / Math.max(1, planEndMs - inMs)) * 100)))

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
        <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.8 }}>{YEAR}년</div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.5px', marginTop: 2 }}>
          {TODAY.getMonth() + 1}월 {TODAY.getDate()}일 {WL[TODAY.getDay()]}요일
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, fontSize: 12.5, fontWeight: 700, opacity: 0.9 }}>
          <span>출근 <span style={{ fontFamily: MONO, fontWeight: 800 }}>{kstHM(session?.checkedInAtUtc) || '—'}</span></span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>경과 <span style={{ fontFamily: MONO, fontWeight: 800 }}>{elapsed}</span></span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span>남은 <span style={{ fontFamily: MONO, fontWeight: 800 }}>{remain}</span></span>
        </div>
      </div>

      {/* 현재 네트워크 — 어느 와이파이에서 찍는지 (허용 대역이 등록된 경우에만 표시) */}
      {network != null && (network.name != null || blocked) && (
        <>
          <span style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.22)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: blocked ? 'rgba(255,255,255,.75)' : '#fff' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: blocked ? 'rgba(21,21,29,.18)' : 'rgba(255,255,255,.16)', flex: 'none' }}>
              <WifiIcon off={blocked} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.3px' }}>
                {blocked ? '사내 네트워크 아님' : network.name}
              </span>
              {blocked ? (
                <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>회사 와이파이에 연결하세요</span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, opacity: 0.85 }}>
                  <i style={{ width: 6, height: 6, borderRadius: '50%', background: '#5EE0A0' }} />
                  {network.location ? `${network.location} · 연결됨` : '연결됨'}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* 출근/퇴근 버튼 — 상태에 맞는 쪽만 활성화, 사내망 아니면 둘 다 잠김 */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 9 }}>
        <button
          type="button"
          disabled={busy || blocked || session != null}
          onClick={onPunch}
          style={{
            height: 52, padding: '0 26px', fontSize: 15, border: 'none', borderRadius: 12,
            fontFamily: 'inherit', fontWeight: 800,
            ...(session == null && !blocked
              ? { background: '#fff', color: '#433FBB', cursor: 'pointer', opacity: busy ? 0.6 : 1 }
              : { background: 'rgba(255,255,255,.22)', color: 'rgba(255,255,255,.75)', cursor: 'default' }),
          }}
        >
          출근하기
        </button>
        <button
          type="button"
          disabled={busy || blocked || session == null || closed}
          onClick={onPunch}
          style={{
            height: 52, padding: '0 26px', fontSize: 15, border: 'none', borderRadius: 12,
            fontFamily: 'inherit', fontWeight: 800,
            ...(session != null && !closed && !blocked
              ? { background: '#fff', color: '#433FBB', cursor: 'pointer', opacity: busy ? 0.6 : 1 }
              : { background: 'rgba(255,255,255,.22)', color: 'rgba(255,255,255,.75)', cursor: 'default' }),
          }}
        >
          {closed ? '근무 완료' : '퇴근하기'}
        </button>
      </div>
    </div>
  )
}

function MyAttendance() {
  const [ym, setYm] = useState(`${YEAR}-${TODAY.getMonth() + 1}`)
  const [week, setWeek] = useState(null)
  const [calY, setCalY] = useState(YEAR)
  const [calM, setCalM] = useState(TODAY.getMonth())
  const [wMonth, setWMonth] = useState(TODAY.getMonth() + 1)
  const [wWeek, setWWeek] = useState(Math.ceil(TODAY.getDate() / 7))
  const [mYear, setMYear] = useState(YEAR)

  // 내 출퇴근 세션 — 올해 전체를 한 번 받아 기록 표·캘린더·요약·차트가 나눠 쓴다.
  const [sessions, setSessions] = useState([])
  const [busy, setBusy] = useState(false)
  const loadSessions = () =>
    fetchMyWorkSessions(`${YEAR}-01-01`, `${YEAR}-12-31`)
      .then(setSessions)
      .catch(() => {})
  useEffect(() => {
    loadSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 현재 네트워크 판정 — 진입 시 + 탭을 다시 볼 때(와이파이를 바꾸고 돌아온 경우) 재확인
  const [network, setNetwork] = useState(null)
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === 'hidden') return
      fetchNetworkStatus().then(setNetwork).catch(() => {})
    }
    check()
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])
  const sessionByDate = {}
  sessions.forEach((s) => { sessionByDate[s.workDate] = s })
  const isoOf = (y, m0, d) => `${y}-${pad(m0 + 1)}-${pad(d)}`
  const todaySession = sessions.find((s) => !s.checkedOutAtUtc)
    ?? sessionByDate[isoOf(YEAR, TODAY.getMonth(), TODAY.getDate())] ?? null

  // 늦은 퇴근(근무 종료 +20분 이상) → 시간외 사후 신청 제안 모달
  const [otSuggest, setOtSuggest] = useState(null)
  const punch = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (todaySession && !todaySession.checkedOutAtUtc) {
        const closed = await checkOut(todaySession.id)
        await loadSessions()
        const code = codeAt(Number(closed.workDate.slice(0, 4)), Number(closed.workDate.slice(5, 7)) - 1,
          Number(closed.workDate.slice(8)))
        const info = await lateCheckoutSuggestion(closed, TIMES[code]?.[1] ?? null).catch(() => null)
        if (info) setOtSuggest({ ...info, shiftCode: code })
      } else {
        await checkIn()
        await loadSessions()
      }
    } catch (e) {
      showToast(e.message, 'error') // 예: 사내 네트워크에서만 출퇴근을 찍을 수 있습니다
    } finally {
      setBusy(false)
    }
  }

  // 내 근무 배정 — 달 단위 캐시. 기록 표(ym)·캘린더(calY/calM)·이번 달 요약이 쓴다.
  const [duties, setDuties] = useState({}) // { 'y-m0': { 일: { code } } }
  const dutyKey = (y, m0) => `${y}-${m0}`
  const codeAt = (y, m0, d) => duties[dutyKey(y, m0)]?.[d]?.code
  const wantMonths = [
    dutyKey(Number(ym.split('-')[0]), Number(ym.split('-')[1]) - 1),
    dutyKey(calY, calM),
    dutyKey(YEAR, TODAY.getMonth()),
  ]
  useEffect(() => {
    let alive = true
    wantMonths.forEach((k) => {
      if (duties[k]) return
      const [y, m0] = k.split('-').map(Number)
      fetchMyMonthDuties(y, m0)
        .then((map) => { if (alive) setDuties((s) => ({ ...s, [k]: map })) })
        .catch(() => { if (alive) setDuties((s) => ({ ...s, [k]: {} })) })
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantMonths.join(',')])

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
  if (yy === YEAR && mIdx === TODAY.getMonth()) {
    const f = weeks.findIndex((w) => w.some(
      (x) => x.getDate() === TODAY.getDate() && x.getMonth() === mIdx))
    defIdx = f < 0 ? 0 : f
  }
  const weekIdx = week == null ? defIdx : Math.max(0, Math.min(weeks.length - 1, week))

  // 지각 판정 — 출근 시각(KST "HH:MM")이 근무코드의 계획 시작보다 늦은가
  const isLate = (session, code) => {
    const tt = TIMES[code]
    if (!session?.checkedInAtUtc || !tt) return false
    const [h, m] = kstHM(session.checkedInAtUtc).split(':').map(Number)
    return h * 60 + m > (tt[0] % 24) * 60
  }
  const durText = (session) => {
    const h = durationHours(session)
    if (h == null) return '—'
    const mins = Math.round(h * 60)
    return `${Math.floor(mins / 60)}:${pad(mins % 60)}`
  }

  // 근무코드·출퇴근 기록 모두 실데이터 — 기록 없는 과거는 미체크, 미래는 예정
  const genRow = (dt) => {
    const m = dt.getMonth(), d = dt.getDate(), wd = dt.getDay()
    const other = m !== mIdx
    const date = `${m + 1}/${d} (${WL[wd]})`
    const code = other ? '' : (codeAt(dt.getFullYear(), m, d) ?? '')
    const cat = CODE_CAT[code]
    const isOff = cat === 'off' || cat === 'ws' || cat === 'lv'
    const day0 = new Date(dt.getFullYear(), m, d)
    const session = other ? null : sessionByDate[isoOf(dt.getFullYear(), m, d)]
    const st = session
      ? (isLate(session, code) ? 'late' : 'normal')
      : isOff ? 'leave' : day0 > TODAY ? 'sched' : 'miss'
    const dur = session ? durText(session) : '—'
    // 초과 계산 (기준 9시간)
    let over = '—', overColor = '#C9C9D2', overW = 700
    if (dur !== '—') {
      const [h, mn] = dur.split(':')
      const mins = +h * 60 + +mn - 540
      if (mins > 0) { over = `+${Math.floor(mins / 60)}:${pad(mins % 60)}`; overColor = '#C97A17'; overW = 800 }
    }
    return {
      date, code,
      in: session ? kstHM(session.checkedInAtUtc) : '',
      out: session?.checkedOutAtUtc ? kstHM(session.checkedOutAtUtc) : '',
      dur, st,
      we: wd === 0 || wd === 6,
      other, over, overColor, overW,
    }
  }
  const rows = weeks[weekIdx].map(genRow)

  // ── 이번 달 요약 — 근무 구성은 배정, 기록 항목은 세션에서 계산 ──
  const curDuties = duties[dutyKey(YEAR, TODAY.getMonth())] ?? {}
  const catCount = (cats) =>
    Object.values(curDuties).filter((v) => cats.includes(CODE_CAT[v.code])).length
  const workDays = catCount(['m', 'd', 'n', 't', 'ec'])
  const offDays = catCount(['off', 'ws'])
  const leaveDays = catCount(['lv'])
  const monthSessions = sessions.filter((s) => Number(s.workDate.slice(5, 7)) === TODAY.getMonth() + 1)
  const lateN = monthSessions.filter((s) =>
    isLate(s, curDuties[Number(s.workDate.slice(8))]?.code)).length
  const totH = monthSessions.reduce((acc, s) => acc + (durationHours(s) ?? 0), 0)
  const otH = monthSessions.reduce((acc, s) => acc + Math.max(0, (durationHours(s) ?? 0) - 9), 0)
  // 미입력 = 이번 달 과거 근무일(배정 있음) 중 세션 없는 날
  const missedN = Object.entries(curDuties).filter(([d, v]) =>
    ['m', 'd', 'n', 't', 'ec'].includes(CODE_CAT[v.code])
    && Number(d) < TODAY.getDate()
    && !sessionByDate[isoOf(YEAR, TODAY.getMonth(), Number(d))]).length
  const summary = [
    { label: '근무일', color: '#3F91D0', val: `${workDays}일`, valColor: '#15151D' },
    { label: '휴무', color: '#B0B0BC', val: `${offDays}일`, valColor: '#9C8B93' },
    { label: '휴가', color: '#E0A04A', val: `${leaveDays}일`, valColor: '#C08A2E' },
    { label: '지각', color: '#E0913A', val: `${lateN}회`, valColor: lateN > 0 ? '#C97A17' : '#4E4E5E' },
    { label: '조퇴', color: '#E8806E', val: '—', valColor: '#9C9CAB' },
    { label: '미입력', color: '#8A8A98', val: `${missedN}회`, valColor: '#6E6E80' },
    { label: '총 근무시간', color: '#5350E2', val: `${Math.round(totH)}h`, valColor: '#5350E2' },
    { label: '초과시간', color: '#1F9D6B', val: otH > 0 ? `+${otH.toFixed(1)}h` : '—', valColor: '#1F9D6B' },
  ]

  // ── 캘린더 ──
  const calDim = new Date(calY, calM + 1, 0).getDate()
  const calFirst = new Date(calY, calM, 1).getDay()
  const calCells = []
  for (let i = 0; i < calFirst; i++) calCells.push(null)
  for (let d = 1; d <= calDim; d++) {
    const dt = new Date(calY, calM, d)
    const wd = dt.getDay()
    const code = codeAt(calY, calM, d) ?? ''
    const cc = CAT[CODE_CAT[code]]
    const isT = dt.getTime() === TODAY.getTime()
    const isOff = (CODE_CAT[code] ?? 'off') === 'off'
    const session = sessionByDate[isoOf(calY, calM, d)]
    const cellDur = durationHours(session)
    calCells.push({
      d, code, isT,
      dayColor: wd === 0 ? '#D06A6A' : wd === 6 ? '#5A7FD0' : '#3A3A46',
      inTime: session ? kstHM(session.checkedInAtUtc) : null,
      outTime: session?.checkedOutAtUtc ? kstHM(session.checkedOutAtUtc) : null,
      ot: cellDur != null && cellDur > 9 ? `${(cellDur - 9).toFixed(1)}h` : null,
      // 코드는 배지 대신 작은 색 점 + 텍스트
      dotColor: isOff || !cc ? '#C6C9D2' : cc.dot,
      codeColor: isOff || !cc ? '#B4B7C0' : cc.tx,
    })
  }

  // ── 이번 달 근무 구성 (도넛) — 실제 배정 일수 기준 ──
  const compData = [
    { name: '주간', value: catCount(['d']) },
    { name: '야간', value: catCount(['n']) },
    { name: '조기', value: catCount(['m']) },
    { name: '탑승', value: catCount(['t']) },
    { name: '휴무', value: catCount(['off', 'ws', 'lv']) },
  ]

  // ── 근무시간 차트 데이터 — 세션에서 계산 (기준 9시간 초과 = 초과분) ──
  const splitBaseOt = (h) => (h == null ? [0, 0] : [Math.min(9, h), Math.max(0, h - 9)])
  const { start: wStart } = weekMeta(wMonth, wWeek)
  let wReal = 0
  let wOt = 0
  const weekData = ['월', '화', '수', '목', '금', '토', '일'].map((label, i) => {
    const dt = new Date(wStart)
    dt.setDate(wStart.getDate() + i)
    const session = sessionByDate[isoOf(dt.getFullYear(), dt.getMonth(), dt.getDate())]
    const [base, ot] = splitBaseOt(durationHours(session))
    wReal += base + ot
    wOt += ot
    return { label, base: Math.round(base * 10) / 10, ot: Math.round(ot * 10) / 10 }
  })
  const monthData = Array.from({ length: 12 }, (_, i) => {
    if (mYear !== YEAR) return { label: `${i + 1}월`, base: 0, ot: 0 }
    let base = 0
    let ot = 0
    sessions
      .filter((s) => Number(s.workDate.slice(5, 7)) === i + 1)
      .forEach((s) => {
        const [b, o] = splitBaseOt(durationHours(s))
        base += b
        ot += o
      })
    return { label: `${i + 1}월`, base: Math.round(base), ot: Math.round(ot) }
  })

  return (
    <div>
      {/* ── 오늘 근무 카드 (매초 갱신은 이 안에서만) ── */}
      <TodayCard
        session={todaySession}
        todayCode={curDuties[TODAY.getDate()]?.code}
        network={network}
        busy={busy}
        onPunch={punch}
      />
      {otSuggest && <OvertimeAfterModal info={otSuggest} onClose={() => setOtSuggest(null)} />}

      {/* ── 출퇴근 기록 + 이번 달 요약 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'stretch' }}>
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '15px 22px', borderBottom: '1px solid #F0F0F4', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>출퇴근 기록</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <select style={selStyle} value={ym} onChange={(e) => { setYm(e.target.value); setWeek(null) }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={`${YEAR}-${i + 1}`}>{YEAR}년 {i + 1}월</option>
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
              <div style={{ display: 'flex', justifyContent: 'center' }}><span style={codeBadge(w.code)}>{w.code || '—'}</span></div>
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
            <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: '#5350E2', background: '#F1F1FF', border: '1px solid #DEDCFF', borderRadius: 99, padding: '3px 11px' }}>{TODAY.getMonth() + 1}월</span>
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
                  data={compData}
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
                  {compData.map((d, i) => <Cell key={d.name} fill={COMP_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<CompTooltip />} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  content={() => (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {compData.map((d, i) => (
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
              {[YEAR - 2, YEAR - 1, YEAR].map((y) => <option key={y} value={y}>{y}년</option>)}
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
