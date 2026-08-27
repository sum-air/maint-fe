import { useEffect, useState } from 'react'
import { MONO } from '../../../shared/lib/workCodes.js'
import { createWorkOrder, deleteWorkOrder, fetchWorkOrders, updateWorkOrder } from '../../../shared/lib/worklog.js'
import DayCalPopover from '../../../shared/components/DayCalPopover.jsx'
import { AIRCRAFT_REGS, NW_TYPE, NW_ST, todayKey, fmtDate } from '../utils.js'

const PAGE_SIZE = 5

// 작업자 후보 — 실작업 수행 팀(정비기획·운항정비)만 (기술·품질·자재팀 제외)
const workerPoolOf = (roster) =>
  (roster ?? []).filter((p) => p.team === '정비기획팀' || p.team === '운항정비팀')

// 등록/수정 모달 — 구분·기체 드롭다운 + 번호(필수) + 내용(선택).
// 수정 모드에는 상태(OPEN/CLOSE) 선택과 삭제가 추가되고, CLOSE 전환 시 종결일이 자동 기록된다.
function NrcWoModal({ mode, item, workerPool, onSave, onDelete, onClose }) {
  const [type, setType] = useState(item?.type ?? 'NRC')
  const [ac, setAc] = useState(item?.ac ?? AIRCRAFT_REGS[0])
  const [no, setNo] = useState(item?.no ?? '')
  const [text, setText] = useState(item?.t ?? '')
  const [st, setSt] = useState(item?.st ?? 'OPEN')
  const [reg, setReg] = useState(item?.reg ?? todayKey())
  const [close, setClose] = useState(item?.close ?? '')
  const [openSel, setOpenSel] = useState(null) // 'type' | 'ac' | 'reg' | 'close' | null

  // CLOSE 전환 시 종결일 자동 채움, OPEN 복귀 시 비움
  const pickSt = (s) => {
    setSt(s)
    setClose(s === 'CLOSE' ? (close || todayKey()) : '')
  }

  // 작업자 — 복수 선택. 직원 PK 로 편집하고 이름은 workerPool 로 해석한다
  const [workerIds, setWorkerIds] = useState(item?.workerIds ?? [])
  const toggleWho = (id) => setWorkerIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const nameOf = (id) => workerPool.find((p) => p.id === id)?.name ?? '?'

  const canSave = no.trim().length > 0
  const save = () => {
    if (!canSave) return
    onSave({ type, ac, no: no.trim(), t: text.trim(), st, reg, close: st === 'CLOSE' ? close : '', workerIds })
    onClose()
  }

  const lb = { fontSize: 10, fontWeight: 800, color: '#B6B6C2', letterSpacing: '.4px', marginBottom: 4, textAlign: 'center' }
  const inBox = {
    width: '100%', height: 36, border: '1px solid #E1E1E9', borderRadius: 9, outline: 'none',
    fontFamily: MONO, fontSize: 12, fontWeight: 700, color: '#3A3A46', textAlign: 'center', background: '#fff',
  }

  const dropdown = (key, value, opts, style, onPick) => (
    <div style={{ position: 'relative', flex: 1 }}>
      <button
        type="button"
        className="dl-filter"
        style={{ width: '100%', height: 34, justifyContent: 'center', borderColor: 'transparent', fontWeight: 800, ...style }}
        onClick={() => setOpenSel((v) => (v === key ? null : key))}
      >
        {value}
        <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {openSel === key && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={() => setOpenSel(null)} />
          <div className="dl-fmenu">
            {opts.map((o) => (
              <button key={o} type="button" className={value === o ? 'dl-fitem on' : 'dl-fitem'} onClick={() => { onPick(o); setOpenSel(null) }}>
                {o}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="ui-overlay" onClick={onClose}>
      <div className="ui-modal" style={{ width: 300, padding: 20, textAlign: 'center', overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.3px', marginBottom: 14 }}>
          {mode === 'new' ? 'NRC · W/O 등록' : `${item.no} 수정`}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={lb}>구분</div>
            {dropdown('type', type, ['NRC', 'W/O'], { background: NW_TYPE[type].bg, color: NW_TYPE[type].tx }, setType)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={lb}>기체</div>
            {dropdown('ac', ac, AIRCRAFT_REGS, { background: '#E9E8F7', color: '#433FBB' }, setAc)}
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={lb}>번호</div>
          <input style={inBox} value={no} placeholder="번호" onChange={(e) => setNo(e.target.value)} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={lb}>내용 (선택)</div>
          <input
            style={{ ...inBox, fontFamily: 'inherit', fontWeight: 600 }}
            value={text}
            placeholder="내용을 입력하세요"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save() }}
          />
        </div>

        {/* 작업자 — 복수 선택 드롭다운 (클릭으로 토글, 메뉴 유지) */}
        <div style={{ marginBottom: 10, position: 'relative' }}>
          <div style={lb}>작업자 (복수 선택)</div>
          <button
            type="button"
            className="dl-filter"
            style={{
              width: '100%', height: 36, justifyContent: 'center', fontWeight: 800,
              ...(workerIds.length > 0 ? { background: '#E9E8F7', color: '#433FBB', borderColor: 'transparent' } : { color: '#B4B7C0' }),
            }}
            onClick={() => setOpenSel((v) => (v === 'who' ? null : 'who'))}
          >
            {workerIds.length === 0 ? '작업자 선택' : workerIds.length === 1 ? nameOf(workerIds[0]) : `${nameOf(workerIds[0])} 외 ${workerIds.length - 1}명`}
            <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {openSel === 'who' && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={() => setOpenSel(null)} />
              <div className="dl-fmenu" style={{ maxHeight: 216, overflowY: 'auto' }}>
                {workerPool.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={workerIds.includes(p.id) ? 'dl-fitem on' : 'dl-fitem'}
                    onClick={() => toggleWho(p.id)}
                  >
                    {p.name}{p.role ? ` · ${p.role}` : ''}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {mode === 'edit' && (
          <div style={{ marginBottom: 10 }}>
            <div style={lb}>상태</div>
              <div style={{ display: 'flex', gap: 6 }}>
              {['OPEN', 'CLOSE'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className="dl-filter"
                  style={{
                    flex: 1, height: 34, justifyContent: 'center', fontWeight: 800,
                    ...(st === s
                      ? { background: NW_ST[s].b, color: NW_ST[s].c, borderColor: 'transparent' }
                      : { background: '#fff', color: '#8A8A98' }),
                  }}
                  onClick={() => pickSt(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 등록일 · 종결일 — 클릭하면 달력 팝오버로 수정 (종결일은 수정 모드에서 CLOSE 일 때만) */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={lb}>등록일</div>
            <div style={{ ...inBox, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span
                style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: '#433FBB', borderBottom: '1.5px dashed #C7C5FF', paddingBottom: 1, marginTop: 3, lineHeight: 1, cursor: 'pointer' }}
                onClick={() => setOpenSel((v) => (v === 'reg' ? null : 'reg'))}
                title={fmtDate(reg)}
              >
                {reg}
              </span>
            </div>
            {openSel === 'reg' && (
              <DayCalPopover date={reg} onPick={setReg} onClose={() => setOpenSel(null)} />
            )}
          </div>
          {mode === 'edit' && (
            <div style={{ flex: 1, position: 'relative' }}>
              <div style={lb}>종결일</div>
              <div style={{ ...inBox, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {st === 'CLOSE' ? (
                  <span
                    style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: '#1F9D6B', borderBottom: '1.5px dashed #BFE3D0', paddingBottom: 1, marginTop: 3, lineHeight: 1, cursor: 'pointer' }}
                    onClick={() => setOpenSel((v) => (v === 'close' ? null : 'close'))}
                    title={close ? fmtDate(close) : ''}
                  >
                    {close}
                  </span>
                ) : (
                  <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: '#D5D5DE' }}>—</span>
                )}
              </div>
              {openSel === 'close' && st === 'CLOSE' && (
                <DayCalPopover date={close || todayKey()} onPick={setClose} onClose={() => setOpenSel(null)} />
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 14 }}>
          {mode === 'edit' && (
            <button
              type="button"
              className="ui-btn"
              style={{ border: 'none', color: '#D23B3B', background: '#FBE6E6' }}
              onClick={() => { onDelete(item); onClose() }}
            >
              삭제
            </button>
          )}
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
            <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>취소</button>
            <button
              type="button"
              className="ui-btn"
              style={canSave
                ? { border: 'none', color: '#fff', background: 'linear-gradient(120deg,#5350E2,#7A6FF0)', boxShadow: '0 5px 14px rgba(83,80,226,.32)' }
                : { border: 'none', color: '#B4B7C0', background: '#EEEEF2', cursor: 'not-allowed' }}
              onClick={save}
            >
              {mode === 'new' ? '등록' : '저장'}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}

// NRC · W/O 카드 — 필터 3종 + 등록 모달 + 행 클릭 수정 + 날짜(등록/종결) 2줄 + 페이지네이션
// 목록은 /work-orders 실데이터 (팀 공유 — 누구나 등록·수정·삭제)
function NrcWoCard({ roster }) {
  const workerPool = workerPoolOf(roster)
  const [items, setItems] = useState([])
  useEffect(() => {
    let alive = true
    fetchWorkOrders().then((l) => { if (alive) setItems(l) }).catch(() => {})
    return () => { alive = false }
  }, [])
  const [fltType, setFltType] = useState(null)
  const [fltSt, setFltSt] = useState(null)
  const [fltAc, setFltAc] = useState(null)
  const [openMenu, setOpenMenu] = useState(null)
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState(null) // { mode: 'new' } | { mode: 'edit', item }

  const shown = items.filter((x) =>
    (!fltType || x.type === fltType) &&
    (!fltSt || x.st === fltSt) &&
    (!fltAc || x.ac === fltAc))
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const cur = Math.min(page, totalPages - 1)
  const pageItems = shown.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE)

  const FILTERS = [
    { key: 'type', label: '구분', value: fltType, set: setFltType, opts: ['W/O', 'NRC'] },
    { key: 'st', label: '상태', value: fltSt, set: setFltSt, opts: ['OPEN', 'CLOSE'] },
    { key: 'ac', label: '기체', value: fltAc, set: setFltAc, opts: AIRCRAFT_REGS },
  ]

  // 날짜(등록/종결)는 모달에서 확정되어 넘어온다. 저장 응답을 목록에 합쳐 재조회 없이 반영.
  const saveNew = (v) =>
    createWorkOrder({ ...v, st: 'OPEN', close: '' })
      .then((saved) => setItems((s) => [saved, ...s]))
      .catch((e) => alert(`등록 실패 — ${e.message}`))
  const saveEdit = (orig) => (v) =>
    updateWorkOrder(orig.id, v)
      .then((saved) => setItems((s) => s.map((x) => (x.id === orig.id ? saved : x))))
      .catch((e) => alert(`저장 실패 — ${e.message}`))
  const remove = (item) =>
    deleteWorkOrder(item.id)
      .then(() => setItems((s) => s.filter((x) => x.id !== item.id)))
      .catch((e) => alert(`삭제 실패 — ${e.message}`))

  return (
    <div className="dl-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, marginBottom: 10 }}>
        <span className="dl-ctitle">NRC · W/O</span>
        <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          {FILTERS.map((f) => (
            <div key={f.key} style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                type="button"
                className={f.value ? 'dl-filter on' : 'dl-filter'}
                onClick={() => setOpenMenu((v) => (v === f.key ? null : f.key))}
              >
                {f.label} · {f.value ?? '전체'}
                <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {openMenu === f.key && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={() => setOpenMenu(null)} />
                  <div className="dl-fmenu">
                    {[null, ...f.opts].map((o) => (
                      <button
                        key={o ?? '_all'}
                        type="button"
                        className={f.value === o ? 'dl-fitem on' : 'dl-fitem'}
                        onClick={() => { f.set(o); setPage(0); setOpenMenu(null) }}
                      >
                        {o ?? '전체'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
          <button type="button" className="dl-newbtn" onClick={() => setModal({ mode: 'new' })}>등록</button>
        </div>
      </div>

      {/* 리스트 — 행 클릭 시 수정 모달 */}
      <div style={{ flex: 1 }}>
        {pageItems.map((x) => (
          <button key={x.id} type="button" className="dl-nwrow" onClick={() => setModal({ mode: 'edit', item: x })}>
            <span className="dl-typebadge" style={{ background: NW_TYPE[x.type].bg, color: NW_TYPE[x.type].tx }}>
              {x.type}
            </span>
            <span className="dl-acchip">{x.ac}</span>
            <span style={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 800, color: '#433FBB', width: 104, flex: 'none', textAlign: 'center' }}>
              {x.no}
            </span>
            {/* 내용 — 넘치면 … + 호버 시 전체 툴팁 */}
            <span className="dl-nwreason" style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#3A3A46', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {x.t}
              </span>
              {x.t && <span className="dl-nwtip">{x.t}</span>}
            </span>
            {/* 등록·종결 2줄 스택 — 라벨/값 2열 그리드로 열 정렬 */}
            <span style={{ width: 96, flex: 'none', display: 'inline-grid', gridTemplateColumns: 'max-content 38px', columnGap: 5, justifyContent: 'center', lineHeight: 1.6, alignItems: 'center' }}>
              <span className="dl-dcap" style={{ textAlign: 'right' }}>등록</span>
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: '#8A8A98', textAlign: 'left' }}>{x.reg}</span>
              <span className="dl-dcap" style={{ textAlign: 'right' }}>종결</span>
              <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: x.close ? '#1F9D6B' : '#D5D5DE', textAlign: 'left' }}>{x.close || '—'}</span>
            </span>
            <span className="dl-stpill" style={{ color: NW_ST[x.st].c, background: NW_ST[x.st].b }}>
              <i style={{ background: NW_ST[x.st].c }} />
              {x.st}
            </span>
          </button>
        ))}
        {pageItems.length === 0 && (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: '#B4B7C0' }}>
            항목이 없습니다
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 'auto', paddingTop: 10 }}>
        <button type="button" className="dl-navbtn" style={{ width: 22, height: 22 }} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, color: '#8A8A98' }}>{cur + 1} / {totalPages}</span>
        <button type="button" className="dl-navbtn" style={{ width: 22, height: 22 }} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
          <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      {modal && (
        <NrcWoModal
          mode={modal.mode}
          item={modal.item}
          workerPool={workerPool}
          onSave={modal.mode === 'new' ? saveNew : saveEdit(modal.item)}
          onDelete={remove}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default NrcWoCard
