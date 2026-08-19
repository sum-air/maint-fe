import { useState } from 'react'
import { MONO } from '../lib/workCodes.js'

const YEAR = 2026 // 데모 기준 연도 — 백엔드 연동 시 오늘 날짜로 교체
const pad = (n) => String(n).padStart(2, '0')

const navBtn = {
  width: 19, height: 19, border: '1px solid #E5E5EC', borderRadius: 7,
  display: 'grid', placeItems: 'center', color: '#6E6E80', cursor: 'pointer', fontSize: 11, lineHeight: 1,
}

// 일자 선택 팝오버 — 신청 모달·팀 관리 공용. 부모가 position:relative 여야 한다.
// 단일 선택: date("MM.DD") + onPick — 선택 즉시 닫힌다.
// 복수 선택: dates(배열) + onToggle — 클릭할 때마다 토글되고 열려 있는다.
// onClear 를 주면 상단에 "초기화" 버튼이 나온다 (필터 용도 — 일자 선택 해제).
function DayCalPopover({ date, onPick, onClose, onClear, dates, onToggle }) {
  const multi = Array.isArray(dates)
  const [selM, selD] = date.split('.').map(Number)
  const [pickM, setPickM] = useState(selM)
  const first = new Date(YEAR, pickM - 1, 1).getDay()
  const nDays = new Date(YEAR, pickM, 0).getDate()

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={onClose} />
      <div
        style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
          width: 172, background: '#fff', border: '1px solid #E5E5EC', borderRadius: 11,
          boxShadow: '0 18px 44px rgba(21,21,29,.22)', padding: 9, zIndex: 70,
        }}
      >
        {onClear && (
          <button
            type="button"
            onClick={() => { onClear(); onClose() }}
            style={{
              display: 'block', width: '100%', marginBottom: 6, padding: '5px 0',
              border: '1px solid #E5E5EC', background: '#fff', borderRadius: 7,
              fontFamily: 'inherit', fontSize: 11, fontWeight: 800, color: '#6E6E80',
              textAlign: 'center', cursor: 'pointer',
            }}
          >
            초기화
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={navBtn} onClick={() => setPickM((m) => (m === 1 ? 12 : m - 1))}>‹</span>
          <span style={{ fontSize: 11.5, fontWeight: 800 }}>{YEAR}년 {pickM}월</span>
          <span style={navBtn} onClick={() => setPickM((m) => (m === 12 ? 1 : m + 1))}>›</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, marginBottom: 2 }}>
          {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
            <span key={w} style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 800, color: i === 0 ? '#D06A6A' : i === 6 ? '#5A7FD0' : '#9C9CAB' }}>{w}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
          {Array.from({ length: first }, (_, i) => <span key={`b${i}`} />)}
          {Array.from({ length: nDays }, (_, i) => {
            const d = i + 1
            const wd = (first + i) % 7
            const key = `${pad(pickM)}.${pad(d)}`
            const on = multi ? dates.includes(key) : (pickM === selM && d === selD)
            return (
              <span
                key={d}
                onClick={() => { if (multi) { onToggle(key) } else { onPick(key); onClose() } }}
                style={{
                  height: 21, display: 'grid', placeItems: 'center', fontFamily: MONO,
                  fontSize: 10.5, fontWeight: 700, borderRadius: 6, cursor: 'pointer',
                  ...(on
                    ? { background: '#6868FF', color: '#fff', boxShadow: '0 4px 12px rgba(104,104,255,.32)' }
                    : { color: wd === 0 ? '#D06A6A' : wd === 6 ? '#5A7FD0' : '#363643' }),
                }}
              >
                {d}
              </span>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default DayCalPopover
