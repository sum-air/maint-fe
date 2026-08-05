import { MONO } from '../../../shared/lib/workCodes.js'
import { ATT_ROSTER, groupByTeam, weekStats, monthStats } from '../utils.js'

// 지각/결근 배지 (0이면 회색 대시)
const CountChip = ({ n, color, bg }) =>
  n > 0 ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 800, color, background: bg }}>{n}</span>
  ) : (
    <span style={{ fontSize: 13, fontWeight: 700, color: '#C4C4CE' }}>—</span>
  )

const UnChip = ({ n }) =>
  n > 0 ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 800, color: '#8A8A98', background: '#EDEDF1', border: '1px solid #DFDFE6' }}>{n}</span>
  ) : (
    <span style={{ fontSize: 13, fontWeight: 700, color: '#C4C4CE' }}>—</span>
  )

// 주간/월간 집계 표. 주간(mode='week')은 주 52시간 진행 바가 추가된다.
function PeriodTable({ mode, month, week }) {
  const teams = groupByTeam(ATT_ROSTER)
  const heads =
    mode === 'week'
      ? ['이름 · 직급', '근무일', '지각', '결근', '미체크', '초과', '총 근무시간 · 주 52h']
      : ['이름 · 직급', '근무일', '지각', '결근', '미체크', '초과', '총 근무시간']

  return (
    <>
      <div className="att-card">
        <div className="att-gridhead">
          {heads.map((h) => (
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
            {tm.members.map((m) => {
              const st = mode === 'week' ? weekStats(m.name, month, week) : monthStats(m.name, month)
              const over = mode === 'week' && st.tot > 52
              const diff = Math.abs(st.tot - 52)
              const pct = Math.min(100, Math.round((st.tot / 52) * 100))
              return (
                <div key={m.name} className="att-row" style={over ? { background: '#FDF7F7' } : undefined}>
                  <div className="att-cell">
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{m.name}</span>
                    <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 600, color: '#9C9CAB' }}>{m.rank}</span>
                  </div>
                  <div className="att-cell" style={{ fontSize: 13, fontWeight: 700, color: '#3A3A46' }}>
                    <span style={{ fontFamily: MONO, fontWeight: 800 }}>{st.workDays}</span>일
                  </div>
                  <div className="att-cell"><CountChip n={st.late} color="#C97A17" bg="#FBEFD9" /></div>
                  <div className="att-cell"><CountChip n={st.abs} color="#D23B3B" bg="#FBE6E6" /></div>
                  <div className="att-cell"><UnChip n={st.un} /></div>
                  <div className="att-cell att-mono" style={{ fontWeight: st.ot > 0 ? 800 : 700, color: st.ot > 0 ? '#0B8C50' : '#C4C4CE' }}>
                    {st.ot > 0 ? `+${st.ot.toFixed(1)}h` : '—'}
                  </div>
                  {mode === 'week' ? (
                    <div style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: over ? '#D23B3B' : '#3A3A46', minWidth: 50, textAlign: 'center' }}>
                          {st.tot.toFixed(1)}h
                        </span>
                        <div style={{ flex: 1, height: 7, background: '#EEEEF2', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: over ? '#D23B3B' : '#5350E2', borderRadius: 99 }} />
                        </div>
                        <span
                          style={{
                            display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 99,
                            fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                            color: over ? '#D23B3B' : '#1F9D6B', background: over ? '#FBE6E6' : '#E6F5EE',
                          }}
                        >
                          {over ? `초과 +${diff.toFixed(1)}h` : `여유 ${diff.toFixed(1)}h`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="att-cell att-mono" style={{ fontSize: 14, fontWeight: 800, color: '#3A3A46' }}>{st.tot.toFixed(1)}h</div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {mode === 'week' && (
        <div className="att-legend">
          <span><span className="att-legendbar" style={{ background: '#5350E2' }} />주 52시간 이내</span>
          <span><span className="att-legendbar" style={{ background: '#D23B3B' }} />주 52시간 초과</span>
        </div>
      )}
    </>
  )
}

export default PeriodTable
