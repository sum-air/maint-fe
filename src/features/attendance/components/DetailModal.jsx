import { MONO } from '../../../shared/lib/workCodes.js'

// 일간 표에서 행 클릭 시 뜨는 직원 상세 모달 (기록 수정 버튼은 백엔드 연동 전까지 비활성 동작)
function DetailModal({ m, dateLabel, onClose }) {
  return (
    <div className="att-overlay" onClick={onClose}>
      <div className="att-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '22px 24px', background: m.s.t, borderBottom: `1px solid ${m.s.tl}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.4px' }}>{m.name}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#6E6E7E' }}>{m.rank}</span>
            <span
              style={{
                marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px',
                borderRadius: 999, fontSize: 12.5, fontWeight: 800, color: m.s.c, background: '#fff', whiteSpace: 'nowrap',
              }}
            >
              <i style={{ width: 7, height: 7, borderRadius: '50%', background: m.s.c, flex: 'none' }} />
              {m.s.label}
            </span>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#8A8A98', marginTop: 6 }}>{m.team} · {dateLabel}</div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="att-timecard">
              <div className="att-timecard-label">출근</div>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, marginTop: 4, color: m.in ? '#15151D' : '#C9C9D2' }}>{m.in || '—'}</div>
            </div>
            <div className="att-timecard">
              <div className="att-timecard-label">퇴근</div>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, marginTop: 4, color: m.out ? '#15151D' : '#C9C9D2' }}>{m.out || '—'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', marginTop: 12, border: '1px solid #F0F0F4', borderRadius: 11, overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '12px 15px', borderRight: '1px solid #F0F0F4' }}>
              <div className="att-timecard-label">계획 근무</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 3 }}>{m.plan}</div>
            </div>
            <div style={{ flex: 1, padding: '12px 15px' }}>
              <div className="att-timecard-label">총 근무</div>
              <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, marginTop: 3 }}>{m.dur}</div>
            </div>
          </div>
          {m.note && (
            <div style={{ marginTop: 12, padding: '11px 14px', background: m.s.t, borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#6E6E7E' }}>
              {m.note}
            </div>
          )}
          <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
            <button type="button" className="att-btn att-btn--ghost" onClick={onClose}>닫기</button>
            <button type="button" className="att-btn att-btn--primary">기록 수정</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailModal
