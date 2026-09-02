import { useState } from 'react'
import TimeModal from '../../features/duty-log/components/TimeModal.jsx'
import CategorySheet from './CategorySheet.jsx'
import { CAT_GROUPS, todayKey, nowHM, fmtDate } from '../../features/duty-log/utils.js'
import { createWorkLog } from '../../shared/lib/worklog.js'
import { showToast } from '../../shared/lib/toast.js'
import '../../features/duty-log/pages/duty-log.css' // TimeModal 의 dl-tchip/dl-nowlink 스타일

// 일지 추가 모달 (시안 B 확정) — 시간 박스 2개 · 카테고리 행([변경]→시트) · 내용 · [닫기·추가]
function WorkLogAddModal({ onSaved, onClose }) {
  const [start, setStart] = useState(nowHM())
  const [end, setEnd] = useState(nowHM())
  const [cat, setCat] = useState(null) // { gi, c }
  const [content, setContent] = useState('')
  const [timeOpen, setTimeOpen] = useState(null) // 'start' | 'end' | null
  const [catOpen, setCatOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const group = cat ? CAT_GROUPS[cat.gi] : null
  // 웹과 같은 규칙 — 카테고리 필수, '기타'는 내용도 필수
  const canAdd = cat && (cat.c !== '기타' || content.trim())

  const save = () => {
    if (!canAdd || busy) return
    setBusy(true)
    createWorkLog({ key: todayKey(), start, end: end === start ? '' : end, gi: cat.gi, c: cat.c, t: content.trim() })
      .then((entry) => {
        showToast('일지가 추가되었습니다')
        onSaved(entry)
        onClose()
      })
      .catch((e) => showToast(`일지 저장 실패 — ${e.message}`, 'error'))
      .finally(() => setBusy(false))
  }

  return (
    <>
      <div className="msheet-overlay" onClick={onClose}>
        <div className="mmodal" onClick={(e) => e.stopPropagation()}>
          <div className="mmodal__head">
            <span className="mmodal__title">일지 추가</span>
            <span className="mmodal__sub">{fmtDate(todayKey())}</span>
          </div>
          <div className="mmodal__times">
            <button type="button" className="mmodal__tbox" onClick={() => setTimeOpen('start')}>
              <span className="k">시작</span>
              <span className="v">{start}</span>
            </button>
            <span className="mmodal__arrow">→</span>
            <button type="button" className="mmodal__tbox" onClick={() => setTimeOpen('end')}>
              <span className="k">종료</span>
              <span className="v" style={end === start ? { color: '#ADADBC' } : undefined}>
                {end === start ? '진행 중' : end}
              </span>
            </button>
          </div>
          <button type="button" className="mmodal__catrow" onClick={() => setCatOpen(true)}>
            {group ? (
              <>
                <span className="mmodal__catchip" style={{ background: group.bg, color: group.tx }}>{cat.c}</span>
                <span className="mmodal__catname">{group.label}</span>
              </>
            ) : (
              <span className="mmodal__catname" style={{ color: '#ADADBC' }}>카테고리 선택</span>
            )}
            <span className="mmodal__catgo">{group ? '변경 ›' : '선택 ›'}</span>
          </button>
          <input
            className="mmodal__inp"
            value={content}
            placeholder={cat?.c === '기타' ? '내용 입력 (필수)' : '내용 입력 (선택)'}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="mmodal__btns">
            <button type="button" className="mbtn mbtn--ghost" onClick={onClose}>닫기</button>
            <button type="button" className="mbtn mbtn--main" disabled={!canAdd || busy} onClick={save}>추가</button>
          </div>
        </div>
      </div>

      {timeOpen && (
        <TimeModal
          title={timeOpen === 'start' ? '시작 시간' : '종료 시간'}
          value={timeOpen === 'start' ? start : end}
          onConfirm={(t) => (timeOpen === 'start' ? setStart(t) : setEnd(t))}
          onClose={() => setTimeOpen(null)}
        />
      )}
      {catOpen && <CategorySheet sel={cat} onPick={setCat} onClose={() => setCatOpen(false)} />}
    </>
  )
}

export default WorkLogAddModal
