import { CAT, CODE_CAT, TIMES, MONO } from '../../../shared/lib/workCodes.js'
import { STATUS, ATT_ROSTER, groupByTeam } from '../utils.js'

const SHORT = { m: '조기', d: '주간', t: '탑승', n: '야간', off: '휴무', ws: '대휴', lv: '연차' }
const pad = (n) => String(n).padStart(2, '0')

// 일간 행 데이터 가공: 초과근무·계획근무 계산 (디자인 deco 로직)
export function decoRow(r) {
  const cat = CODE_CAT[r.code]
  const cc = CAT[cat]
  const s = STATUS[r.st]
  const isOff = cat === 'off' || cat === 'ws' || cat === 'lv'
  let otTxt = '—'
  let otMin = 0
  if (r.dur && r.dur.includes(':')) {
    const [h, m] = r.dur.split(':')
    otMin = +h * 60 + +m - 540 // 기준 9시간
    otTxt = otMin >= 10 ? `+${Math.floor(otMin / 60)}:${pad(otMin % 60)}` : '—'
  }
  const tt = TIMES[r.code]
  const plan = isOff ? SHORT[cat] : `${pad(tt[0])}:00–${pad(tt[1] % 24)}:00`
  return { ...r, cat, cc, s, isOff, otTxt, otMin, plan }
}

// 일간 출퇴근 표: 이름 · 근무코드 · 출근 · 퇴근 · 초과 · 총 근무 · 상태
function DailyTable({ onOpen }) {
  const teams = groupByTeam(ATT_ROSTER.map(decoRow))
  return (
    <div className="att-card">
      <div className="att-gridhead">
        {['이름 · 직급', '근무코드', '출근', '퇴근', '초과', '총 근무', '상태'].map((h) => (
          <div key={h} className="att-hh">{h}</div>
        ))}
      </div>
      {teams.map((tm) => (
        <div key={tm.name}>
          <div className="att-band">
            <i style={{ width: 8, height: 8, borderRadius: 2, background: tm.dot }} />
            <span className="att-bandname">{tm.name}</span>
            <span className="att-cnt">{tm.count}명</span>
          </div>
          {tm.members.map((m) => (
            <div key={m.name} className="att-row att-row--click" onClick={() => onOpen(m)}>
              <div className="att-cell">
                <span style={{ fontSize: 14, fontWeight: 700 }}>{m.name}</span>
                <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 600, color: '#9C9CAB' }}>{m.rank}</span>
              </div>
              <div className="att-cell" style={{ display: 'flex', justifyContent: 'center' }}>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 52,
                    padding: '4px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 700, fontFamily: MONO,
                    color: m.cc.tx, background: m.cc.bg, border: `1px solid ${m.cc.br}`,
                  }}
                >
                  {m.code}
                </span>
              </div>
              <div className="att-cell att-mono" style={{ color: m.in ? '#15151D' : '#C9C9D2' }}>{m.in || '—'}</div>
              <div className="att-cell att-mono" style={{ color: m.out ? '#15151D' : '#C9C9D2' }}>{m.out || '—'}</div>
              <div className="att-cell att-mono" style={{ fontWeight: 700, color: m.otMin >= 10 ? '#0B8C50' : '#C9C9D2' }}>{m.otTxt}</div>
              <div className="att-cell att-mono" style={{ fontWeight: 700, color: '#4E4E5E' }}>{m.dur}</div>
              <div className="att-cell" style={{ display: 'flex', justifyContent: 'center' }}>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999,
                    fontSize: 12, fontWeight: 800, color: m.s.c, background: m.s.b, whiteSpace: 'nowrap',
                  }}
                >
                  <i style={{ width: 6, height: 6, borderRadius: '50%', background: m.s.c, flex: 'none' }} />
                  {m.s.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default DailyTable
