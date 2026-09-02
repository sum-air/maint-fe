import { CAT_GROUPS } from '../../features/duty-log/utils.js'

// 카테고리 선택 바텀 시트 — 그룹 전체를 색 그대로 펼치고, 칩을 탭하면 즉시 적용 후 닫힘.
function CategorySheet({ sel, onPick, onClose }) {
  return (
    <div className="msheet-overlay" onClick={onClose}>
      <div className="msheet" onClick={(e) => e.stopPropagation()}>
        <div className="msheet__grab" />
        <div className="msheet__head">
          <span className="msheet__title">카테고리 선택</span>
          <span className="msheet__sub">탭하면 바로 적용</span>
        </div>
        <div className="msheet__groups">
          {CAT_GROUPS.map((g, gi) => (
            <div key={g.label}>
              <div className="msheet__glabel" style={{ color: g.tx }}>
                <i style={{ background: g.tx }} />
                {g.label}
              </div>
              <div className="msheet__chips">
                {g.cats.map((c) => {
                  const on = sel && sel.gi === gi && sel.c === c
                  return (
                    <button
                      key={c}
                      type="button"
                      className="msheet__chip"
                      style={on ? { background: g.tx, color: '#fff' } : { background: g.bg, color: g.tx }}
                      onClick={() => { onPick({ gi, c }); onClose() }}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CategorySheet
