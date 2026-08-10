import { useState } from 'react'
import { MONO, ROSTER, TIMES, pickCode } from '../../../shared/lib/workCodes.js'
import { CURRENT_USER } from '../../../shared/lib/currentUser.js'
import { formatTime, normalizeTime } from '../../../shared/lib/timeInput.js'
import { dateWithDow } from '../utils.js'
import DayCalPopover from './DayCalPopover.jsx'

const YEAR = 2026 // 데모 기준 연도 — 백엔드 연동 시 오늘 날짜로 교체
const pad = (n) => String(n).padStart(2, '0')

// 해당 일자의 내 근무코드 퇴근 시각 — 시간외는 퇴근 직후 시작이 기본.
// 데모: 스케줄 화면과 같은 결정적 로직 사용, 백엔드 연동 시 실제 스케줄로 교체.
const myShiftEnd = (dateStr) => {
  const [m, d] = dateStr.split('.').map(Number)
  const pi = ROSTER.findIndex((p) => p.name === CURRENT_USER.name)
  const dow = new Date(YEAR, m - 1, d).getDay()
  const tt = TIMES[pickCode(pi, d, dow)]
  return tt ? `${pad(tt[1] % 24)}:00` : '18:00' // 휴무 등 시간 없는 코드는 기본 18:00
}

const label = { fontSize: 11.5, fontWeight: 700, color: '#9C9CAB' }
const underline = {
  width: '100%', padding: '7px 0', border: 'none', borderBottom: '1.5px solid #E1E1E9',
  textAlign: 'center', fontWeight: 800, fontFamily: 'inherit', outline: 'none',
  background: 'transparent', boxSizing: 'border-box',
}

// 시간외 신청 모달 — 일자(달력 선택)·시작 시간·사유(50자) 입력 후 신청 (대기 상태로 등록)
// 종료 시간은 퇴근 확정 시 채워지므로 신청 단계에서는 받지 않는다.
function RequestModal({ onSubmit, onClose }) {
  const [date, setDate] = useState('07.21') // "MM.DD"
  const [start, setStart] = useState(() => myShiftEnd('07.21'))
  const [startTouched, setStartTouched] = useState(false) // 직접 수정하면 일자 변경 시 덮어쓰지 않음
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [calOpen, setCalOpen] = useState(false)

  const submit = () => {
    const ns = normalizeTime(start)
    if (!ns) return setError('시작 시간은 HH:MM 형식으로 입력해 주세요')
    if (!reason.trim()) return setError('사유를 입력해 주세요')
    onSubmit({ date, start: ns, reason: reason.trim() })
    onClose()
  }

  return (
    <div className="ui-overlay" onClick={onClose}>
      <div
        className="ui-modal"
        style={{ width: 300, overflow: 'visible', padding: 22, textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.3px', marginBottom: 16 }}>시간외 신청</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* 일자 — 클릭 시 달력 팝오버 */}
          <div style={{ position: 'relative' }}>
            <div style={{ ...label, marginBottom: 2 }}>일자</div>
            <input
              readOnly
              value={dateWithDow(date)}
              onClick={() => setCalOpen((v) => !v)}
              style={{ ...underline, fontSize: 14, cursor: 'pointer' }}
            />
            {calOpen && (
              <DayCalPopover
                date={date}
                onPick={(next) => { setDate(next); if (!startTouched) setStart(myShiftEnd(next)) }}
                onClose={() => setCalOpen(false)}
              />
            )}
          </div>

          {/* 시작 시간 — 숫자 입력 시 HH:MM 자동 포맷 */}
          <div>
            <div style={{ ...label, marginBottom: 2 }}>시작 시간</div>
            <input
              inputMode="numeric"
              maxLength={5}
              value={start}
              onChange={(e) => { setStartTouched(true); setStart(formatTime(e.target.value)) }}
              placeholder="18:00"
              style={{ ...underline, fontSize: 16, fontFamily: MONO }}
            />
          </div>
        </div>

        {/* 사유 — 50자, 실시간 카운터, 좌측 정렬 + 괘선 */}
        <div style={{ ...label, margin: '16px 0 6px' }}>
          사유 <span style={{ fontSize: 10.5, fontWeight: 700, color: '#C2C5CE' }}>{reason.length}/50</span>
        </div>
        <div style={{ background: '#F6F5FE', borderRadius: 12, padding: '6px 13px 13px' }}>
          <textarea
            rows={3}
            maxLength={50}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="사유를 입력해 주세요"
            style={{
              width: '100%', border: 'none', outline: 'none', resize: 'none', boxSizing: 'border-box',
              backgroundColor: 'transparent', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
              color: '#3A3660', textAlign: 'left', lineHeight: '26px',
              backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 25px, #DDD9F5 25px, #DDD9F5 26px)',
              backgroundAttachment: 'local',
            }}
          />
        </div>

        {error && <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 700, color: '#D23B3B' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>취소</button>
          <button
            type="button"
            className="ui-btn"
            style={{ border: 'none', color: '#fff', background: 'linear-gradient(120deg,#5350E2,#7A6FF0)', boxShadow: '0 5px 14px rgba(83,80,226,.32)' }}
            onClick={submit}
          >
            신청
          </button>
        </div>
      </div>
    </div>
  )
}

export default RequestModal
