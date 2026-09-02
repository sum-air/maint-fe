import { useEffect, useState } from 'react'
import PageHero, { Stepper } from './PageHero.jsx'
import TimeModal from '../../features/duty-log/components/TimeModal.jsx'
import { OT_ST, dateWithDow, fmtHM } from '../../features/overtime/utils.js'
import { fetchMonthOvertimeRequests, createOvertimeRequest, decideOvertimeRequest, cancelOvertimeRequest } from '../../shared/lib/overtime.js'
import { fetchMyRosterScopes } from '../../shared/lib/roster.js'
import { getTokenClaims } from '../../shared/lib/api.js'
import { CURRENT_USER } from '../../shared/lib/currentUser.js'
import { showToast } from '../../shared/lib/toast.js'

const pad = (n) => String(n).padStart(2, '0')
const IS_ADMIN = (getTokenClaims().features ?? []).includes('TENANT_ADMIN')

// "HH:MM" 시작~종료 → 분 (종료가 더 이르면 익일)
const spanMin = (start, end) => {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let s = sh * 60 + sm
  let e = eh * 60 + em
  if (e <= s) e += 1440
  return e - s
}
// 야간(22~06시) 겹침 분 — 엑셀 추출과 같은 창
const NIGHT = [[0, 360], [1320, 1800], [2760, 3240]]
const nightMin = (start, end) => {
  const [sh, sm] = start.split(':').map(Number)
  let s = sh * 60 + sm
  let e = s + spanMin(start, end)
  return NIGHT.reduce((sum, [ws, we]) => sum + Math.max(0, Math.min(e, we) - Math.max(s, ws)), 0)
}

// 시간외 모바일 — 이달 합계 + 내 신청 리스트 + (팀장) 승인 대기, 우하단 + 로 신청
function MobileOvertime() {
  const today = new Date()
  const [monthOffset, setMonthOffset] = useState(0)
  const dt = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const year = dt.getFullYear()
  const month = dt.getMonth()

  const [reqs, setReqs] = useState([])
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setReqs([])
    fetchMonthOvertimeRequests(year, month).then((l) => { if (alive) setReqs(l) }).catch(() => {})
    return () => { alive = false }
  }, [year, month, tick])

  const [canDecide, setCanDecide] = useState(IS_ADMIN)
  useEffect(() => {
    let alive = true
    fetchMyRosterScopes().then((l) => { if (alive && l.length > 0) setCanDecide(true) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const mine = reqs.filter((r) => r.employeeNo === CURRENT_USER.employeeNo)
  const pendingOthers = reqs.filter((r) => r.employeeNo !== CURRENT_USER.employeeNo && r.status === 'wait')

  // 이달 합계 — 승인 + 종료 기록 있는 건만
  const approved = mine.filter((r) => r.status === 'ok' && r.end)
  const totalMin = approved.reduce((s, r) => s + spanMin(r.start, r.end), 0)
  const totalNight = approved.reduce((s, r) => s + nightMin(r.start, r.end), 0)

  const decide = (id, ui) =>
    decideOvertimeRequest(id, ui)
      .then(() => { showToast(ui === 'ok' ? '승인 처리되었습니다' : '반려 처리되었습니다'); setTick((t) => t + 1) })
      .catch((e) => showToast(e.message, 'error'))

  const cancel = (id) =>
    cancelOvertimeRequest(id)
      .then(() => { showToast('신청이 취소되었습니다'); setTick((t) => t + 1) })
      .catch((e) => showToast(e.message, 'error'))

  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="mhome">
      <PageHero
        title="시간외근무"
        right={<Stepper label={`${year}.${pad(month + 1)}`} onPrev={() => setMonthOffset((o) => o - 1)} onNext={() => setMonthOffset((o) => o + 1)} />}
      />
      <div className="mbody">
        <div className="msum">
          <div className="mcard msum__tile">
            <span className="k">이달 승인</span>
            <span className="v" style={{ color: '#5350E2' }}>{totalMin ? fmtHM(totalMin / 60) : '—'}</span>
          </div>
          <div className="mcard msum__tile">
            <span className="k">야간 (22–06시)</span>
            <span className="v">{totalNight ? fmtHM(totalNight / 60) : '—'}</span>
          </div>
        </div>

        {canDecide && pendingOthers.length > 0 && (
          <div className="mcard">
            <div className="mcard__head"><span className="t">승인 대기</span><span className="mcard__sub">{pendingOthers.length}건</span></div>
            {pendingOthers.map((r) => (
              <div key={r.id} className="mot">
                <span className="mot__info">
                  <span className="d">{dateWithDow(r.date)} · {r.employeeNo}</span>
                  <span className="tmono">{r.start} ~ {r.end ?? '(퇴근 전)'}{r.end ? ` · ${fmtHM(spanMin(r.start, r.end) / 60)}` : ''}</span>
                  {r.reason && <span className="rsn">{r.reason}</span>}
                </span>
                <span className="mot__btns">
                  <button type="button" className="mbtn mbtn--main" style={{ padding: '7px 13px', fontSize: 12 }} onClick={() => decide(r.id, 'ok')}>승인</button>
                  <button type="button" className="mbtn mbtn--ghost" style={{ padding: '7px 13px', fontSize: 12 }} onClick={() => decide(r.id, 'no')}>반려</button>
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mcard">
          <div className="mcard__head"><span className="t">내 신청</span><span className="mcard__sub">{mine.length}건</span></div>
          {mine.map((r) => {
            const st = OT_ST[r.status]
            return (
              <div key={r.id} className="mot">
                <span className="mot__info">
                  <span className="d">{dateWithDow(r.date)}</span>
                  <span className="tmono">{r.start} ~ {r.end ?? '(퇴근 전)'}{r.end ? ` · ${fmtHM(spanMin(r.start, r.end) / 60)}` : ''}</span>
                  {r.reason && <span className="rsn">{r.reason}</span>}
                </span>
                {r.status === 'wait' && (
                  <button type="button" className="mot__cancel" onClick={() => cancel(r.id)}>취소</button>
                )}
                <span className="mflt__st" style={{ background: st.b, color: st.c, flex: 'none' }}>{st.label}</span>
              </div>
            )
          })}
          {mine.length === 0 && <div className="mempty">이달 신청 내역이 없습니다</div>}
        </div>
      </div>

      <button type="button" className="mfab" onClick={() => setAddOpen(true)}>＋</button>
      {addOpen && <OvertimeAddModal onSaved={() => setTick((t) => t + 1)} onClose={() => setAddOpen(false)} />}
    </div>
  )
}

// 신청 모달 — 일자(오늘) · 시작 시간(스피너) · 사유, [닫기·신청]. 종료는 그날 퇴근에서 파생(서버 규칙).
function OvertimeAddModal({ onSaved, onClose }) {
  const now = new Date()
  const [start, setStart] = useState('17:00')
  const [reason, setReason] = useState('')
  const [timeOpen, setTimeOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 (${'일월화수목금토'[now.getDay()]})`

  const save = () => {
    if (!reason.trim() || busy) return
    setBusy(true)
    createOvertimeRequest({ date: `${pad(now.getMonth() + 1)}.${pad(now.getDate())}`, start, reason: reason.trim() })
      .then(() => { showToast('시간외 신청이 접수되었습니다'); onSaved(); onClose() })
      .catch((e) => showToast(e.message, 'error'))
      .finally(() => setBusy(false))
  }

  return (
    <>
      <div className="msheet-overlay" onClick={onClose}>
        <div className="mmodal" onClick={(e) => e.stopPropagation()}>
          <div className="mmodal__head">
            <span className="mmodal__title">시간외 신청</span>
            <span className="mmodal__sub">{dateLabel}</span>
          </div>
          <div className="mmodal__times">
            <button type="button" className="mmodal__tbox" onClick={() => setTimeOpen(true)}>
              <span className="k">시작</span>
              <span className="v">{start}</span>
            </button>
            <span className="mmodal__arrow">→</span>
            <span className="mmodal__tbox" style={{ cursor: 'default' }}>
              <span className="k">종료</span>
              <span className="v" style={{ color: '#ADADBC', fontSize: 13, fontWeight: 700, paddingTop: 3 }}>퇴근 시각</span>
            </span>
          </div>
          <input
            className="mmodal__inp"
            value={reason}
            placeholder="사유 입력 (필수)"
            maxLength={50}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="mmodal__btns">
            <button type="button" className="mbtn mbtn--ghost" onClick={onClose}>닫기</button>
            <button type="button" className="mbtn mbtn--main" disabled={!reason.trim() || busy} onClick={save}>신청</button>
          </div>
        </div>
      </div>
      {timeOpen && (
        <TimeModal title="시작 시간" value={start} onConfirm={setStart} onClose={() => setTimeOpen(false)} />
      )}
    </>
  )
}

export default MobileOvertime
