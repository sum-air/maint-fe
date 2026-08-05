import { CODE_GROUPS, CAT, PAL, MONO, TIMES, codeTime } from '../../../shared/lib/workCodes.js'

// 하단 근무 코드 안내 범례. 코드를 클릭하면 히트맵에서 해당 코드만 강조된다.
// 히트맵과 같은 문법: 색 칩 대신 코드 글자에만 색.
function CodeGuide({ hiCode, onToggle }) {
  return (
    <div className="cg">
      <div className="cg-head">
        <span className="cg-title">근무 코드 안내</span>
        <span className="cg-sub">전체 근무 · 휴가 · 교육/출장</span>
      </div>
      <div className="cg-grid">
        {CODE_GROUPS.map((g) => {
          const cat = CAT[g.key]
          return (
            <div key={g.key}>
              <div className="cg-grouphead">
                <i style={{ width: 9, height: 9, borderRadius: '50%', background: cat.dot, flex: 'none' }} />
                <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-.2px' }}>{g.label}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {g.codes.map((co) => {
                  const active = hiCode === co.c
                  const time = co.t ? co.t : TIMES[co.c] ? codeTime(co.c) : '—'
                  const color = PAL[g.key] ? PAL[g.key][1] : g.key === 'off' ? '#8A8F9C' : cat.tx
                  return (
                    <div
                      key={co.c}
                      className="cg-row"
                      onClick={() => onToggle(co.c)}
                      style={{
                        background: active ? cat.bg : 'transparent',
                        boxShadow: active ? `inset 0 0 0 1px ${cat.br}` : 'none',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color,
                          flex: 'none', letterSpacing: '-.2px', width: 42,
                        }}
                      >
                        {co.c}
                      </span>
                      {co.d && <span style={{ fontSize: 12, fontWeight: 600, color: '#5E5E70' }}>{co.d}</span>}
                      <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 500, color: '#A6A6B4', marginLeft: 'auto' }}>{time}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CodeGuide
