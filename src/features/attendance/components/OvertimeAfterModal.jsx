import { useState } from 'react'
import { MONO } from '../../../shared/lib/workCodes.js'
import { createOvertimeRequest } from '../../../shared/lib/overtime.js'
import { fmtHM } from '../../overtime/utils.js'

// 늦은 퇴근 → 시간외 사후 신청 모달 (시안 A · 요약 카드형)
// info: { date 'MM.DD', shiftCode, endHM, outHM, overMin } — 퇴근은 이미 기록된 뒤에 뜬다.
// 신청 시 시작 = 근무 종료 시각, 종료는 방금 찍은 퇴근이 서버 규칙대로 자동으로 붙는다.
function OvertimeAfterModal({ info, onClose }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const canSubmit = reason.trim().length > 0 && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    try {
      await createOvertimeRequest({ date: info.date, start: info.endHM, reason: reason.trim() })
      onClose()
    } catch (e) {
      alert(`신청 실패 — ${e.message}`)
      setBusy(false)
    }
  }

  const row = (k, v, color = '#4E4E5E') => (
    <>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#9C9CAB' }}>{k}</span>
      <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color }}>{v}</span>
    </>
  )

  return (
    <div className="ui-overlay" onClick={onClose}>
      <div
        className="ui-modal"
        style={{ width: 300, padding: 22, textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.3px', marginBottom: 6 }}>시간외근무 신청</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#8A8A98' }}>
          퇴근이 기록되었습니다. 시간외근무로 신청할까요?
        </div>

        <div style={{ background: '#F7F7FA', borderRadius: 11, padding: '13px 15px', margin: '14px 0', textAlign: 'left' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', rowGap: 7, alignItems: 'baseline' }}>
            {row('근무 종료', `${info.endHM}${info.shiftCode ? ` (${info.shiftCode})` : ''}`)}
            {row('퇴근 시각', info.outHM)}
            {row('초과', fmtHM(info.overMin / 60), '#5350E2')}
          </div>
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#9C9CAB', textAlign: 'left', margin: '0 0 6px' }}>
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>닫기</button>
          <button
            type="button"
            className="ui-btn"
            style={canSubmit
              ? { border: 'none', color: '#fff', background: 'linear-gradient(120deg,#5350E2,#7A6FF0)', boxShadow: '0 5px 14px rgba(83,80,226,.32)' }
              : { border: 'none', color: '#B4B7C0', background: '#EEEEF2', cursor: 'not-allowed' }}
            onClick={submit}
          >
            신청
          </button>
        </div>
      </div>
    </div>
  )
}

export default OvertimeAfterModal
