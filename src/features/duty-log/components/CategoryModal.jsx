import { useState } from 'react'
import { CAT_GROUPS } from '../utils.js'

// 카테고리 선택 모달 — 대분류: 색 점 + 구분선 헤더 (시안 A안)
// 칩 클릭 = 임시 선택(하이라이트), 하단 [선택] 으로 확정
function CategoryModal({ selected, onPick, onClose }) {
  const [temp, setTemp] = useState(selected) // { gi, c } | null

  const confirm = () => {
    if (!temp) return
    onPick(temp)
    onClose()
  }

  return (
    <div className="ui-overlay" onClick={onClose}>
      <div
        className="ui-modal"
        style={{ width: 340, padding: 20, textAlign: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.3px', marginBottom: 14 }}>카테고리 선택</div>

        {CAT_GROUPS.map((g, gi) => (
          <div key={g.label}>
            {/* 대분류 헤더 — 색 점 + 양옆 구분선 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: `${gi ? 22 : 2}px 0 8px` }}>
              <span style={{ flex: 1, height: 1, background: '#F0F0F4' }} />
              <i style={{ width: 8, height: 8, borderRadius: 3, background: g.tx }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#3A3A46' }}>{g.label}</span>
              <span style={{ flex: 1, height: 1, background: '#F0F0F4' }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {g.cats.map((c) => {
                const on = temp && temp.gi === gi && temp.c === c
                return (
                  <span
                    key={c}
                    onClick={() => setTemp(on ? null : { gi, c })}
                    className="dl-chip"
                    style={{
                      background: g.bg, color: g.tx,
                      ...(on ? { borderColor: g.tx, fontWeight: 800, boxShadow: '0 2px 8px rgba(21,21,29,.10)' } : {}),
                    }}
                  >
                    {c}
                  </span>
                )
              })}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>취소</button>
          <button
            type="button"
            className="ui-btn"
            style={temp
              ? { border: 'none', color: '#fff', background: 'linear-gradient(120deg,#5350E2,#7A6FF0)', boxShadow: '0 5px 14px rgba(83,80,226,.32)' }
              : { border: 'none', color: '#B4B7C0', background: '#EEEEF2', cursor: 'not-allowed' }}
            onClick={confirm}
          >
            선택
          </button>
        </div>
      </div>
    </div>
  )
}

export default CategoryModal
