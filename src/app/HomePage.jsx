import { useState } from 'react'
import { Link } from 'react-router'
import { MONO, ROSTER, CAT, CODE_CAT, TIMES, pickCode } from '../shared/lib/workCodes.js'
import { CURRENT_USER } from '../shared/lib/currentUser.js'
import { CAT_GROUPS, DEMO_LOGS, DEMO_NRC_WO, todayKey } from '../features/duty-log/utils.js'

const pad = (n) => String(n).padStart(2, '0')
const nowHM = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

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

// ── 출퇴근 카드 (A안 스탯 분리형) — 기록은 화면 상태만, 백엔드 연동 시 출퇴근 API 로 교체 ──
function Stat({ label, value, color = '#1A1A22' }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 86 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: '#B0B0BA' }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 14.5, fontWeight: 750, color }}>{value}</span>
    </span>
  )
}
const VLine = () => <span style={{ width: 1, height: 30, background: '#EEEEF1' }} />

function PunchCard() {
  const [inAt, setInAt] = useState('')
  const [outAt, setOutAt] = useState('')

  const now = new Date()
  const pi = ROSTER.findIndex((p) => p.name === CURRENT_USER.name)
  const code = pickCode(pi, now.getDate(), now.getDay())
  const tt = TIMES[code]
  const cc = CAT[CODE_CAT[code] ?? 'off']
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 ${'일월화수목금토'[now.getDay()]}요일`
  const done = inAt && outAt

  return (
    <div style={{ ...CARD, padding: '18px 26px', display: 'flex', alignItems: 'center', gap: 22 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#A0A0AC' }}>{dateLabel}</div>
        <div style={{ fontSize: 19, fontWeight: 750, letterSpacing: '-.4px', marginTop: 3 }}>
          {greetingOf(now.getHours())}, {CURRENT_USER.name}님
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18 }}>
        <Stat label="오늘 근무" value={code} color={cc.tx} />
        <VLine />
        <Stat label="근무 시간" value={tt ? `${pad(tt[0] % 24)}:00–${pad(tt[1] % 24)}:00` : '휴무'} />
        <VLine />
        <Stat label="출근" value={inAt || '--:--'} color={inAt ? '#5350E2' : '#C4C4CC'} />
        <VLine />
        <Stat label="퇴근" value={outAt || '--:--'} color={outAt ? '#5350E2' : '#C4C4CC'} />
        <button
          type="button"
          disabled={done}
          style={{
            height: 44, padding: '0 26px', border: 'none', borderRadius: 12, marginLeft: 6,
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
            ...(done
              ? { background: '#E6F5EE', color: '#1F9D6B', cursor: 'default' }
              : { background: '#5350E2', color: '#fff', cursor: 'pointer' }),
          }}
          onClick={() => (inAt ? setOutAt(nowHM()) : setInAt(nowHM()))}
        >
          {done ? '근무 완료' : inAt ? '퇴근 체크' : '출근 체크'}
        </button>
      </div>
    </div>
  )
}

// ── 오늘 업무일지 요약 — DEMO_LOGS(백엔드 연동 시 일지 API) ──
function TodayLogCard() {
  const logs = DEMO_LOGS[todayKey()] ?? []
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

// ── 이번 달 스케줄 — 스케줄 데모 로직(pickCode), 오늘 강조 ──
function MonthCard() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() // 0-base
  const pi = ROSTER.findIndex((p) => p.name === CURRENT_USER.name)
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
          const code = pickCode(pi, d, new Date(y, m, d).getDay())
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
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 800, color: codeColor(code) }}>{code}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── 작업지시 (NRC·W/O 통합 5건) — DEMO_NRC_WO(백엔드 연동 시 API) ──
const WCOL = '130px 90px 70px 1fr 110px 90px'

function WorkCard() {
  const items = DEMO_NRC_WO.slice(0, 5)
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
    </div>
  )
}

// 홈 — 요약 대시보드: 출퇴근 → [오늘 업무일지 | 이번 달 스케줄] → 작업지시
function HomePage() {
  return (
    <section
      style={{
        // 헤더(60px)를 뺀 화면 높이 — 반올림·줌으로 1px 넘치며 스크롤이 생기지 않게 2px 여유
        margin: '-1.75rem -2rem', padding: '1.75rem 2rem', minHeight: 'calc(100vh - 62px)',
        background: '#F7F7F9', display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <PunchCard />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <TodayLogCard />
        <MonthCard />
      </div>
      <WorkCard />
    </section>
  )
}

export default HomePage
