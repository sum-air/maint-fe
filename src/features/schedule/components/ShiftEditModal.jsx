import { CODE_GROUPS, CAT, PAL, BADGE, TINT, BORDER, TIMES, MONO, codeTime } from '../utils.js'

const VIVID = { m: 1, d: 1, n: 1, t: 1 }

// 셀 클릭 시 뜨는 근무코드 변경 모달 (디자인 "근무코드변경 모달" 기준)
// EC(0) 긴급호출근무를 선택하면 근무 시간 입력란이 나타난다.
function ShiftEditModal({ edit, sel, hours, onHours, onPick, onSave, onClose }) {
  return (
    <div className="smodal-overlay" onClick={onClose}>
      <div className="smodal" onClick={(e) => e.stopPropagation()}>
        <div className="smodal-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#1F1F29' }}>{edit.name}</span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#8A8A98' }}>{edit.role}</span>
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#8A8A98' }}>{edit.team}</span>
          </div>
          <span className="smodal-date">{edit.dateLabel}</span>
        </div>

        <div className="smodal-body">
          {CODE_GROUPS.map((g) => {
            const vivid = !!VIVID[g.key]
            const cat = CAT[g.key]
            const accent = vivid ? PAL[g.key][1] : cat.tx
            const solid = vivid ? BADGE[g.key] : cat.dot
            const idleBg = vivid ? PAL[g.key][0] : cat.bg
            const idleBr = vivid ? BORDER[g.key] : cat.br
            const selTint = vivid ? TINT[g.key] : g.key === 'off' ? '#F1F1F4' : cat.bg
            return (
              <div key={g.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="smodal-grouplabel">{g.label}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {g.codes.map((co) => {
                    const cd = co.c
                    const time = co.t ? co.t : TIMES[cd] ? codeTime(cd) : '전일'
                    // 코드 이름(연차·병가 등)이 있으면 시간과 함께 표시
                    const desc = co.d ? `${co.d} · ${time}` : time
                    const isSel = sel === cd
                    return (
                      <div
                        key={cd}
                        onClick={() => onPick(cd)}
                        style={{
                          boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 14,
                          padding: '3px 14px 3px 12px', borderRadius: 11, cursor: 'pointer',
                          background: isSel ? selTint : 'transparent',
                          boxShadow: isSel ? `inset 0 0 0 1.5px ${solid}` : 'none',
                        }}
                      >
                        <span
                          style={{
                            width: 44, height: 32, flex: 'none', borderRadius: 9, display: 'grid', placeItems: 'center',
                            fontFamily: MONO, fontSize: cd.length > 2 ? 13 : 15, fontWeight: 800,
                            ...(isSel
                              ? { background: solid, color: '#fff' }
                              : { background: idleBg, border: `1px solid ${idleBr}`, color: accent }),
                          }}
                        >
                          {cd}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: isSel ? 700 : 600, color: isSel ? accent : '#55555F', flex: 1, textAlign: 'center' }}>
                          {desc}
                        </span>
                        <i
                          style={
                            isSel
                              ? { width: 20, height: 20, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', background: solid, color: '#fff', fontSize: 11, fontStyle: 'normal' }
                              : { width: 20, height: 20, borderRadius: '50%', flex: 'none', border: '2px solid #D6D6DE', boxSizing: 'border-box' }
                          }
                        >
                          {isSel ? '✓' : ''}
                        </i>
                      </div>
                    )
                  })}
                  {/* 긴급호출근무 선택 시 근무 시간 입력 */}
                  {g.key === 'ec' && sel === 'EC(0)' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 14px 2px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#8A8A98', flex: 'none' }}>근무 시간</span>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={hours}
                        onChange={(e) => onHours(e.target.value)}
                        placeholder="예: 4"
                        autoFocus
                        style={{
                          width: 64, padding: '6px 8px', border: '1px solid #E5E5EC', borderRadius: 8,
                          font: 'inherit', fontSize: 13, fontWeight: 700, color: '#1F1F29', outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#55555F' }}>시간</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="smodal-foot">
          <span className="smodal-btn smodal-btn--cancel" onClick={onClose}>취소</span>
          <span className="smodal-btn smodal-btn--save" onClick={onSave}>저장</span>
        </div>
      </div>
    </div>
  )
}

export default ShiftEditModal
