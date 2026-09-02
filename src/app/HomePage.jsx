import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { MONO, CAT, CODE_CAT, TIMES } from '../shared/lib/workCodes.js'
import { CURRENT_USER } from '../shared/lib/currentUser.js'
import { fetchMyMonthDuties } from '../shared/lib/roster.js'
import { fetchMyWorkSessions, checkIn, checkOut, kstHM } from '../shared/lib/attendance.js'
import { fetchWorkLogs } from '../shared/lib/worklog.js'
import { lateCheckoutSuggestion } from '../shared/lib/overtime.js'
import OvertimeAfterModal from '../features/attendance/components/OvertimeAfterModal.jsx'
import { CAT_GROUPS } from '../features/duty-log/utils.js'
import { showToast } from '../shared/lib/toast.js'
import useIsMobile from '../shared/hooks/useIsMobile.js'
import MobileHome from './mobile/MobileHome.jsx'

const pad = (n) => String(n).padStart(2, '0')

// 시간대별 인사말
const greetingOf = (h) =>
  h < 5 ? '늦은 밤까지 고생 많아요' : h < 12 ? '좋은 아침이에요' : h < 18 ? '좋은 오후예요' : '좋은 저녁이에요'

// ── 공통 스타일 ──
const CARD = { background: '#fff', border: '1px solid #ECECF0', borderRadius: 16, padding: '16px 22px' }

function CardHead({ title, more, to }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
      <span style={{ fontSize: 14, fontWeight: 750, letterSpacing: '-.3px' }}>{title}</span>
      <Link to={to} style={{ fontSize: 12, fontWeight: 600, color: '#B0B0BA', textDecoration: 'none' }}>{more} →</Link>
    </div>
  )
}

function StDot({ st }) {
  const open = st === 'OPEN'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: open ? '#C97A17' : '#1F9D6B' }}>
      <i style={{ width: 5, height: 5, borderRadius: '50%', background: open ? '#E8A23D' : '#3DBB87' }} />
      {st}
    </span>
  )
}

// ── 출퇴근 카드 (A안 스탯 분리형) — 오늘 근무·출퇴근 기록 모두 실데이터 (/work-sessions) ──
function Stat({ label, value, color = '#1A1A22' }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 86 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: '#B0B0BA' }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 14.5, fontWeight: 750, color }}>{value}</span>
    </span>
  )
}
const VLine = () => <span style={{ width: 1, height: 30, background: '#EEEEF1' }} />

function PunchCard({ todayCode, session, busy, onPunch }) {
  const now = new Date()
  const tt = todayCode ? TIMES[todayCode] : null
  const cc = CAT[CODE_CAT[todayCode] ?? 'off']
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 ${'일월화수목금토'[now.getDay()]}요일`

  const inAt = kstHM(session?.checkedInAtUtc)
  const outAt = kstHM(session?.checkedOutAtUtc)
  const done = !!(inAt && outAt)

  return (
    <div style={{ ...CARD, padding: '18px 26px', display: 'flex', alignItems: 'center', gap: 22 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#A0A0AC' }}>{dateLabel}</div>
        <div style={{ fontSize: 19, fontWeight: 750, letterSpacing: '-.4px', marginTop: 3 }}>
          {greetingOf(now.getHours())}, {CURRENT_USER.name}님
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18 }}>
        <Stat label="오늘 근무" value={todayCode ?? '—'} color={todayCode ? cc.tx : '#C4C4CC'} />
        <VLine />
        <Stat label="근무 시간" value={tt ? `${pad(tt[0] % 24)}:00–${pad(tt[1] % 24)}:00` : todayCode ? '휴무' : '—'} />
        <VLine />
        <Stat label="출근" value={inAt || '--:--'} color={inAt ? '#5350E2' : '#C4C4CC'} />
        <VLine />
        <Stat label="퇴근" value={outAt || '--:--'} color={outAt ? '#5350E2' : '#C4C4CC'} />
        <button
          type="button"
          disabled={done || busy}
          style={{
            height: 44, padding: '0 26px', border: 'none', borderRadius: 12, marginLeft: 6,
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
            ...(done
              ? { background: '#E6F5EE', color: '#1F9D6B', cursor: 'default' }
              : { background: '#5350E2', color: '#fff', cursor: 'pointer', opacity: busy ? 0.6 : 1 }),
          }}
          onClick={onPunch}
        >
          {done ? '근무 완료' : inAt ? '퇴근 체크' : '출근 체크'}
        </button>
      </div>
    </div>
  )
}

// ── 오늘 업무일지 요약 — 내가 오늘 쓴 일지 (/work-logs 실데이터) ──
function TodayLogCard() {
  const [logs, setLogs] = useState([])
  useEffect(() => {
    let alive = true
    const now = new Date()
    const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    fetchWorkLogs(iso, iso)
      .then((list) => {
        if (!alive) return
        setLogs(list
          .filter((l) => l.employeeNo === CURRENT_USER.employeeNo)
          .sort((a, b) => a.s.localeCompare(b.s)))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  const last = logs[logs.length - 1]
  const span = logs.length > 0 ? `${logs[0].s} ~ ${last.e || last.s}` : ''

  return (
    <div style={CARD}>
      <CardHead title="오늘 업무일지" more="일지 쓰기" to="/duty-log" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 8, fontSize: 12.5, fontWeight: 500, color: '#6E6E78' }}>
        <span style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-.5px', color: '#1A1A22' }}>{logs.length}</span>건 작성
        {span && (
          <>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#D8D8DE' }} />
            <span style={{ fontFamily: MONO, color: '#A0A0AC' }}>{span}</span>
          </>
        )}
      </div>
      <div style={{ marginTop: 4 }}>
        {logs.map((l, i) => (
          <div
            key={`${l.s}_${i}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '9px 0',
              borderBottom: i < logs.length - 1 ? '1px solid #F4F4F6' : 'none',
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, color: '#A0A0AC', fontVariantNumeric: 'tabular-nums' }}>{l.s}</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_GROUPS[l.gi].tx, flex: 'none' }} />
            <span style={{ fontSize: 13, fontWeight: 650, color: '#1A1A22' }}>{l.c}</span>
            {l.t && <span style={{ fontSize: 12.5, fontWeight: 450, color: '#8A8A94' }}>{l.t}</span>}
          </div>
        ))}
        {logs.length === 0 && (
          <div style={{ padding: '22px 0', textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: '#B4B7C0' }}>
            아직 작성한 일지가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}

// ── 이번 달 스케줄 — 내 근무 배정 실데이터 (스케줄 화면과 같은 원천), 오늘 강조 ──
function MonthCard({ duties }) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() // 0-base
  const firstDow = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()

  const codeColor = (code) => {
    const cat = CODE_CAT[code] ?? 'off'
    return cat === 'off' ? '#C4C4CC' : CAT[cat].tx
  }

  return (
    <div style={CARD}>
      <CardHead title="이번 달 스케줄" more="스케줄" to="/schedule" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 3, columnGap: 3, marginTop: 9 }}>
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <span key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 600, color: i === 0 ? '#D89A9A' : '#B4B4BE' }}>{d}</span>
        ))}
        {Array.from({ length: firstDow }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = i + 1
          const code = duties[d]?.code
          const today = d === now.getDate()
          return (
            <span
              key={d}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, padding: '3px 0', borderRadius: 7,
                ...(today
                  ? { background: '#F1F1FF', outline: '1.5px solid #C7C5FF' }
                  : { background: '#FAFAFC', border: '1px solid #F1F1F5' }),
              }}
            >
              <span style={{ fontSize: 11, fontWeight: today ? 800 : 500, color: today ? '#5350E2' : '#55555F', fontVariantNumeric: 'tabular-nums' }}>{d}</span>
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, minHeight: 12, color: code ? codeColor(code) : '#D8D8DE' }}>
                {code ?? ''}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── 작업지시 (NRC·W/O) — 백엔드(work_order) 연동 예정이라 빈 상태로 시작 ──
const WCOL = '130px 90px 70px 1fr 110px 90px'

function WorkCard() {
  const items = []
  return (
    <div style={CARD}>
      <CardHead title="작업지시" more="전체" to="/duty-log" />
      <div
        style={{
          display: 'grid', gridTemplateColumns: WCOL, columnGap: 14, padding: '6px 4px 7px',
          borderBottom: '1px solid #EEEEF1', fontSize: 11, fontWeight: 600, color: '#B0B0BA', textAlign: 'center',
        }}
      >
        <span>W/O 번호</span><span>기체</span><span>구분</span><span>작업내용</span><span>작업자</span><span>상태</span>
      </div>
      {items.map((x, i) => (
        <div
          key={x.no}
          style={{
            display: 'grid', gridTemplateColumns: WCOL, columnGap: 14, alignItems: 'center', padding: '9px 4px',
            borderBottom: i < items.length - 1 ? '1px solid #F5F5F7' : 'none', fontSize: 12.5, textAlign: 'center',
          }}
        >
          <span style={{ fontFamily: MONO, fontWeight: 650, color: '#33333D' }}>{x.no}</span>
          <span style={{ fontFamily: MONO, fontWeight: 600, color: '#6E6E78' }}>{x.ac}</span>
          <span style={{ fontWeight: 700, color: x.type === 'NRC' ? '#B23E5C' : '#1C6DA6' }}>{x.type}</span>
          <span style={{ fontWeight: 500, color: x.t ? '#55555F' : '#C4C4CC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {x.t || '—'}
          </span>
          <span style={{ fontWeight: 500, color: '#6E6E78' }}>{x.who ?? '—'}</span>
          <span style={{ display: 'flex', justifyContent: 'center' }}><StDot st={x.st} /></span>
        </div>
      ))}
      {items.length === 0 && (
        <div style={{ padding: '22px 0', textAlign: 'center', fontSize: 12.5, fontWeight: 600, color: '#B4B7C0' }}>
          등록된 작업지시가 없습니다
        </div>
      )}
    </div>
  )
}

// 홈 — 요약 대시보드: 출퇴근 → [오늘 업무일지 | 이번 달 스케줄] → 작업지시
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function HomePage() {
  const isMobile = useIsMobile()
  // 내 이번 달 근무 배정 — 실패 시 빈 캘린더 (닫히는 쪽으로 동작)
  const [duties, setDuties] = useState({})
  useEffect(() => {
    let alive = true
    const now = new Date()
    fetchMyMonthDuties(now.getFullYear(), now.getMonth())
      .then((map) => { if (alive) setDuties(map) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // 오늘의 내 출퇴근 세션 — 야간(어제 출근 후 미퇴근)도 잡히게 어제부터 조회
  const [session, setSession] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    const now = new Date()
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    fetchMyWorkSessions(isoDate(yesterday), isoDate(now))
      .then((list) => {
        if (!alive) return
        const open = list.find((s) => !s.checkedOutAtUtc)
        setSession(open ?? list.find((s) => s.workDate === isoDate(now)) ?? null)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // 늦은 퇴근(근무 종료 +20분 이상) → 시간외 사후 신청 제안 모달
  const [otSuggest, setOtSuggest] = useState(null)
  const punch = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (session && !session.checkedOutAtUtc) {
        const closed = await checkOut(session.id)
        setSession(closed)
        // duties 는 이번 달 것만 있다 — 다른 달(월말 야간 등) 근무일이면 판정을 건너뛴다
        const sameMonth = closed.workDate.slice(0, 7) === isoDate(new Date()).slice(0, 7)
        const code = sameMonth ? duties[Number(closed.workDate.slice(8))]?.code : undefined
        const info = await lateCheckoutSuggestion(closed, TIMES[code]?.[1] ?? null).catch(() => null)
        if (info) setOtSuggest({ ...info, shiftCode: code })
      } else {
        setSession(await checkIn())
      }
    } catch (e) {
      showToast(e.message, 'error') // 예: 사내 네트워크에서만 출퇴근을 찍을 수 있습니다
    } finally {
      setBusy(false)
    }
  }

  // 모바일 — 확정 시안 전용 화면 (데이터 훅은 자체 보유)
  if (isMobile) return <MobileHome />

  return (
    <section
      style={{
        // 헤더(60px)를 뺀 화면 높이 — 반올림·줌으로 1px 넘치며 스크롤이 생기지 않게 2px 여유
        margin: '-1.75rem -2rem', padding: '1.75rem 2rem', minHeight: 'calc(100vh - 62px)',
        background: '#F7F7F9', display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <PunchCard
        todayCode={duties[new Date().getDate()]?.code ?? null}
        session={session}
        busy={busy}
        onPunch={punch}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <TodayLogCard />
        <MonthCard duties={duties} />
      </div>
      <WorkCard />
      {otSuggest && <OvertimeAfterModal info={otSuggest} onClose={() => setOtSuggest(null)} />}
    </section>
  )
}

export default HomePage
