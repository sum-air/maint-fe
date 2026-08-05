import { useState } from 'react'
import { MONO } from '../../../shared/lib/workCodes.js'

// 숫자만 입력하면 "HH:MM" 으로 자동 포맷 (0811 → 08:11)
const formatTime = (raw) => {
  const d = raw.replace(/\D/g, '').slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
}

// 저장 시 유효한 시각으로 정규화, 아니면 null
const normalizeTime = (s) => {
  if (!s) return ''
  const m2 = s.match(/^(\d{1,2}):?(\d{2})$/)
  if (!m2) return null
  const h = Math.min(23, +m2[1])
  const mm = Math.min(59, +m2[2])
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// 일간 표에서 행 클릭 시 뜨는 직원 상세 모달 — 열리자마자 출근/퇴근 시각을 바로 수정할 수 있다.
function DetailModal({ m, dateLabel, onSave, onClose }) {
  const [inT, setInT] = useState(m.in || '')
  const [outT, setOutT] = useState(m.out || '')

  const save = () => {
    const ni = normalizeTime(inT)
    const no = normalizeTime(outT)
    if (ni === null || no === null) return // 형식이 안 맞으면 저장하지 않음
    onSave(m.name, { in: ni, out: no })
    onClose()
  }

  const timeInput = (v, set) => (
    <input
      type="text"
      inputMode="numeric"
      value={v}
      placeholder="HH:MM"
      maxLength={5}
      onChange={(e) => set(formatTime(e.target.value))}
      style={{
        marginTop: 4, width: '100%', padding: '7px 10px', border: '1px solid #DCDCE4', borderRadius: 8,
        fontFamily: MONO, fontSize: 17, fontWeight: 700, color: '#15151D', background: '#fff', outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  )

  return (
    <div className="att-overlay" onClick={onClose}>
      <div className="att-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', background: m.s.t, borderBottom: `1px solid ${m.s.tl}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.4px' }}>{m.name}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6E6E7E' }}>{m.rank}</span>
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
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#8A8A98', marginTop: 5 }}>{m.team} · {dateLabel}</div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {/* 출근 / 퇴근 시각 — 바로 수정 가능 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="att-timecard">
              <div className="att-timecard-label">출근</div>
              {timeInput(inT, setInT)}
            </div>
            <div className="att-timecard">
              <div className="att-timecard-label">퇴근</div>
              {timeInput(outT, setOutT)}
            </div>
          </div>

          {/* 버튼: 오른쪽 정렬 · 컴팩트 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="att-btn att-btn--ghost att-btn--sm" onClick={onClose}>취소</button>
            <button type="button" className="att-btn att-btn--primary att-btn--sm" onClick={save}>저장</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailModal
