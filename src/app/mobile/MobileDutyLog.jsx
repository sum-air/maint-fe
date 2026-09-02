import { useEffect, useState } from 'react'
import PageHero, { Stepper } from './PageHero.jsx'
import WorkLogAddModal from './WorkLogAddModal.jsx'
import { CAT_GROUPS, fmtDate } from '../../features/duty-log/utils.js'
import { CURRENT_USER } from '../../shared/lib/currentUser.js'
import { fetchWorkLogs, fetchTodos, addTodo, toggleTodo, fetchMemo, saveMemo } from '../../shared/lib/worklog.js'
import { showToast } from '../../shared/lib/toast.js'

const pad = (n) => String(n).padStart(2, '0')
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const keyOf = (d) => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`

// 업무일지 모바일 — 날짜 이동 + 내 일지 타임라인 + To-do + 메모, 우하단 + 로 일지 추가
function MobileDutyLog() {
  const [offset, setOffset] = useState(0) // 오늘 기준 일수
  const date = new Date()
  date.setDate(date.getDate() + offset)
  const iso = isoOf(date)

  const [logs, setLogs] = useState([])
  useEffect(() => {
    let alive = true
    setLogs([])
    fetchWorkLogs(iso, iso)
      .then((list) => {
        if (!alive) return
        setLogs(list.filter((l) => l.employeeNo === CURRENT_USER.employeeNo).sort((a, b) => a.s.localeCompare(b.s)))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [iso])

  const [todos, setTodos] = useState([])
  const [todoText, setTodoText] = useState('')
  useEffect(() => {
    let alive = true
    fetchTodos().then((l) => { if (alive) setTodos(l) }).catch(() => {})
    return () => { alive = false }
  }, [])
  const doneCount = todos.filter((t) => t.done).length

  const toggle = (t) =>
    toggleTodo(t.id, !t.done)
      .then((saved) => setTodos((s) => s.map((x) => (x.id === t.id ? saved : x))))
      .catch((e) => showToast(e.message, 'error'))
  const add = () => {
    const text = todoText.trim()
    if (!text) return
    addTodo(text)
      .then((saved) => { setTodos((s) => [...s, saved]); setTodoText('') })
      .catch((e) => showToast(e.message, 'error'))
  }

  const [memo, setMemo] = useState('')
  useEffect(() => {
    let alive = true
    fetchMemo().then((c) => { if (alive) setMemo(c) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="mhome">
      <PageHero
        title="업무일지"
        right={<Stepper label={fmtDate(keyOf(date))} onPrev={() => setOffset((o) => o - 1)} onNext={() => setOffset((o) => o + 1)} />}
      />
      <div className="mbody">
        <div className="mcard">
          <div className="mcard__head"><span className="t">내 일지 · {logs.length}건</span></div>
          <div className="mtl">
            {logs.map((l, i) => {
              const g = CAT_GROUPS[l.gi]
              return (
                <div key={`${l.s}_${i}`} className="mtl__item">
                  <span className="mtl__time">{l.s}{l.e ? `–${l.e}` : '~'}</span>
                  <span className="mlog__cat" style={{ background: g.bg, color: g.tx }}>{l.c}</span>
                  {l.t && <span className="mtl__txt">{l.t}</span>}
                </div>
              )
            })}
            {logs.length === 0 && <div className="mempty">작성한 일지가 없습니다</div>}
          </div>
        </div>

        <div className="mcard">
          <div className="mcard__head"><span className="t">To-do</span><span className="mcard__sub">{doneCount} / {todos.length} 완료</span></div>
          {todos.map((t) => (
            <button key={t.id} type="button" className="mtodo" onClick={() => toggle(t)}>
              <span className={`mtodo__box${t.done ? ' on' : ''}`}>{t.done ? '✓' : ''}</span>
              <span className={t.done ? 'mtodo__txt done' : 'mtodo__txt'}>{t.text}</span>
            </button>
          ))}
          <input
            className="mtodo__inp"
            value={todoText}
            placeholder="할 일 추가"
            onChange={(e) => setTodoText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          />
        </div>

        <div className="mcard">
          <div className="mcard__head"><span className="t">메모</span></div>
          <textarea
            className="mmemo"
            value={memo}
            placeholder="메모를 적어두세요"
            onChange={(e) => setMemo(e.target.value)}
            onBlur={() => saveMemo(memo).catch(() => {})}
          />
        </div>
      </div>

      <button type="button" className="mfab" onClick={() => setAddOpen(true)}>＋</button>
      {addOpen && (
        <WorkLogAddModal
          dateKey={keyOf(date)}
          onSaved={(entry) => setLogs((s) => [...s, entry].sort((a, b) => a.s.localeCompare(b.s)))}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  )
}

export default MobileDutyLog
