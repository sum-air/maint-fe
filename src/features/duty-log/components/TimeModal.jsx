import { useState } from 'react'
import { MONO } from '../../../shared/lib/workCodes.js'
import { nowHM } from '../utils.js'

const pad = (n) => String(n).padStart(2, '0')
const toMin = (t) => {
  const m = t.match(/^(\d{2}):(\d{2})$/)
  return m ? +m[1] * 60 + +m[2] : null
}
const fmt = (m) => {
  const x = ((m % 1440) + 1440) % 1440
  return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`
}

// 시간 입력 모달 — 스피너형 (시안 A안 확정)
// 위: +1/+5/+10 · 가운데: 직접 타이핑 · 아래: −1/−5/−10 · 하단: 현재 시각 / 취소·확인
function TimeModal({ title, value, onConfirm, onClose }) {
  const [text, setText] = useState(value || nowHM())

  const shift = (delta) => setText(fmt((toMin(text) ?? toMin(nowHM())) + delta))

  const type = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    if (digits.length === 4) {
      setText(`${pad(Math.min(23, +digits.slice(0, 2)))}:${pad(Math.min(59, +digits.slice(2)))}`)
    } else {
      setText(digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`)
    }
  }

  const valid = toMin(text) != null
  const confirm = () => {
    if (!valid) return
    onConfirm(fmt(toMin(text)))
    onClose()
  }

  const chips = (deltas) => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
      {deltas.map((d) => (
        <button key={d} type="button" className="dl-tchip" onClick={() => shift(d)}>
          {d > 0 ? `+${d}` : d}
        </button>
      ))}
    </div>
  )

  return (
    <div className="ui-overlay" onClick={onClose}>
      <div
        className="ui-modal"
        style={{ width: 236, padding: 20, textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.3px', marginBottom: 14 }}>{title}</div>

        {chips([1, 5, 10])}
        <div style={{ margin: '12px 0' }}>
          <input
            autoFocus
            value={text}
            maxLength={5}
            inputMode="numeric"
            onChange={(e) => type(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') confirm() }}
            style={{
              width: 104, border: 'none', borderBottom: '2px solid #C7C5FF', outline: 'none',
              background: 'transparent', fontFamily: MONO, fontSize: 32, fontWeight: 800,
              color: '#433FBB', textAlign: 'center', paddingBottom: 2,
            }}
          />
        </div>
        {chips([-1, -5, -10])}

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 18 }}>
          <button type="button" className="dl-nowlink" onClick={() => setText(nowHM())}>
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            현재 시각
          </button>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
            <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>취소</button>
            <button
              type="button"
              className="ui-btn"
              style={valid
                ? { border: 'none', color: '#fff', background: 'linear-gradient(120deg,#5350E2,#7A6FF0)', boxShadow: '0 5px 14px rgba(83,80,226,.32)' }
                : { border: 'none', color: '#B4B7C0', background: '#EEEEF2', cursor: 'not-allowed' }}
              onClick={confirm}
            >
              확인
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}

export default TimeModal
