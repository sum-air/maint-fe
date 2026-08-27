import { useEffect, useState } from 'react'
import { MONO } from '../../../shared/lib/workCodes.js'
import { hoursBetween } from '../../../shared/lib/timeInput.js'
import { CURRENT_USER } from '../../../shared/lib/currentUser.js'
import { fetchMaintRoster } from '../../../shared/lib/maintRoster.js'
import { decideOvertimeRequest, fetchMonthOvertimeRequests } from '../../../shared/lib/overtime.js'
import { TEAM_COLORS } from '../../attendance/utils.js'
import { OT_ST, groupReqsByTeam, dateWithDow, fmtHM } from '../utils.js'
import DayCalPopover from '../../../shared/components/DayCalPopover.jsx'

const pad = (n) => String(n).padStart(2, '0')
const TODAY = new Date()

// 팀 시간외 관리 — 요약 칩 + 팀 그룹 테이블(월 누적) + 대기 건 승인/반려 + 인원/일자 필터
// 목록은 /overtime-requests 실데이터(서버가 지정 팀/관리자 범위로 거른다), 이름·팀·직급은 정비 로스터로 해석.
function AdminOvertime() {
  const [reqs, setReqs] = useState([])
  const [roster, setRoster] = useState([])
  const [year, setYear] = useState(TODAY.getFullYear())
  const [month, setMonth] = useState(TODAY.getMonth() + 1) // 조회 월
  useEffect(() => {
    let alive = true
    fetchMaintRoster().then((l) => { if (alive) setRoster(l) }).catch(() => {})
    return () => { alive = false }
  }, [])
  useEffect(() => {
    let alive = true
    fetchMonthOvertimeRequests(year, month - 1).then((l) => { if (alive) setReqs(l) }).catch(() => {})
    return () => { alive = false }
  }, [year, month])
  const [calOpen, setCalOpen] = useState(false)
  const [pickYear, setPickYear] = useState(TODAY.getFullYear())
  const [filterTeams, setFilterTeams] = useState([]) // 빈 배열 = 전체 (복수 선택)
  const [filterNames, setFilterNames] = useState([])
  const [filterDates, setFilterDates] = useState([]) // "MM.DD" 배열
  const [teamOpen, setTeamOpen] = useState(false)
  const [nameOpen, setNameOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [confirm, setConfirm] = useState(null) // { req, action: 'ok' | 'no' } — 승인/반려 확인 모달

  // 월별 이동 (1월 ‹ → 이전 해 12월)
  const stepMonth = (delta) => {
    const next = month + delta
    if (next < 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else if (next > 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth(next)
    }
  }

  // 사번 → 이름·팀·직급. 로스터에 없는 사람(퇴사 등)은 사번으로 표시
  const byNo = Object.fromEntries(roster.map((p) => [p.employeeNo, p]))
  const withStatus = reqs.map((r) => {
    const p = byNo[r.employeeNo]
    const team = p?.team ?? '기타'
    return {
      ...r,
      name: p?.name ?? r.employeeNo,
      role: p?.role ?? '',
      team,
      dot: TEAM_COLORS[team] ?? '#8A8A98',
      hours: r.end ? hoursBetween(r.start, r.end) : 0, // 퇴근 전이면 아직 시간 없음
      mine: r.employeeNo === CURRENT_USER.employeeNo, // 본인 건은 스스로 결정 불가 (서버도 거절)
    }
  })

  const decide = (r, status) =>
    decideOvertimeRequest(r.id, status)
      .then((next) => setReqs((s) => s.map((x) => (x.id === r.id ? next : x))))
      .catch((e) => alert(`처리 실패 — ${e.message}`))

  // 월 누적 — 그 사람의 해당 월 신청 중 반려 제외, 해당 행 날짜까지의 누적 (최신 행 = 월 전체 누적)
  const cumFor = (r) =>
    withStatus
      .filter((x) => x.name === r.name && x.status !== 'no' && x.date <= r.date)
      .reduce((s, x) => s + x.hours, 0)

  // 팀/인원/일자 필터 (복수 선택, 빈 배열 = 전체) + 최신 날짜가 위로 (인원 목록은 선택한 팀 기준)
  const teamNames = [...new Set(withStatus.map((r) => r.team))]
  const names = [...new Set(withStatus.filter((r) => !filterTeams.length || filterTeams.includes(r.team)).map((r) => r.name))]

  const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const toggleTeam = (t) => {
    const next = toggleIn(filterTeams, t)
    setFilterTeams(next)
    // 팀 범위를 벗어난 인원 선택은 제거
    if (next.length) {
      const valid = new Set(withStatus.filter((r) => next.includes(r.team)).map((r) => r.name))
      setFilterNames((ns) => ns.filter((n) => valid.has(n)))
    }
  }

  const anyFilter = filterTeams.length > 0 || filterNames.length > 0 || filterDates.length > 0

  const shown = withStatus
    .filter((r) =>
      (!filterTeams.length || filterTeams.includes(r.team)) &&
      (!filterNames.length || filterNames.includes(r.name)) &&
      (!filterDates.length || filterDates.includes(r.date)))
    .sort((a, b) => b.date.localeCompare(a.date))

  // 요약 칩 — 필터 적용된 목록 기준
  const counts = { wait: 0, ok: 0, no: 0 }
  let totalOt = 0
  shown.forEach((r) => {
    counts[r.status]++
    if (r.status !== 'no') totalOt += r.hours
  })

  const teams = groupReqsByTeam(shown)
  const COLS = '1.2fr 1fr 1.1fr 0.9fr 2fr 1.1fr 1fr'

  return (
    <div className="ot-card">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>신청 관리</span>
        {/* 월별 조회 스테퍼 + 라벨 클릭 시 연/월 선택 팝오버 (내 시간외와 동일 문법, 연도는 표시 안 함) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <button type="button" className="ot-navbtn" onClick={() => stepMonth(-1)}>
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span
            style={{
              fontFamily: MONO, fontSize: 13.5, fontWeight: 800, minWidth: 92, textAlign: 'center',
              cursor: 'pointer', borderBottom: '1.5px dashed #C7C5FF', paddingBottom: 1,
            }}
            onClick={() => { setPickYear(year); setCalOpen((v) => !v) }}
          >
            {year}년 {month}월
          </span>
          <button type="button" className="ot-navbtn" onClick={() => stepMonth(1)}>
            <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
          </button>

          {calOpen && (
            <>
              <div className="ot-cal-overlay" onClick={() => setCalOpen(false)} />
              <div className="ot-cal">
                <div className="ot-cal-head">
                  <span className="ot-cal-nav" onClick={() => setPickYear((y) => y - 1)}>
                    <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{pickYear}년</span>
                  <span className="ot-cal-nav" onClick={() => setPickYear((y) => y + 1)}>
                    <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                  </span>
                </div>
                <div className="ot-cal-grid">
                  {Array.from({ length: 12 }, (_, i) => (
                    <span
                      key={i}
                      className={pickYear === year && i + 1 === month ? 'ot-cal-m on' : 'ot-cal-m'}
                      onClick={() => { setYear(pickYear); setMonth(i + 1); setCalOpen(false) }}
                    >
                      {i + 1}월
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 필터 — 팀 → 인원 → 일자 (월 스테퍼 옆) */}
        <div style={{ position: 'relative' }}>
          <button type="button" className={filterTeams.length ? 'ot-filter on' : 'ot-filter'} onClick={() => setTeamOpen((v) => !v)}>
            팀
            {filterTeams.length > 0 && <span className="ot-fbadge">{filterTeams.length}</span>}
            <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {teamOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={() => setTeamOpen(false)} />
              <div className="ot-filtermenu">
                <button
                  type="button"
                  className={filterTeams.length === 0 ? 'ot-filteritem on' : 'ot-filteritem'}
                  onClick={() => { setFilterTeams([]); setTeamOpen(false) }}
                >
                  전체
                </button>
                {teamNames.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={filterTeams.includes(t) ? 'ot-filteritem on' : 'ot-filteritem'}
                    onClick={() => toggleTeam(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button type="button" className={filterNames.length ? 'ot-filter on' : 'ot-filter'} onClick={() => setNameOpen((v) => !v)}>
            인원
            {filterNames.length > 0 && <span className="ot-fbadge">{filterNames.length}</span>}
            <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {nameOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={() => setNameOpen(false)} />
              <div className="ot-filtermenu">
                <button
                  type="button"
                  className={filterNames.length === 0 ? 'ot-filteritem on' : 'ot-filteritem'}
                  onClick={() => { setFilterNames([]); setNameOpen(false) }}
                >
                  전체
                </button>
                {names.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={filterNames.includes(n) ? 'ot-filteritem on' : 'ot-filteritem'}
                    onClick={() => setFilterNames((s) => toggleIn(s, n))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button type="button" className={filterDates.length ? 'ot-filter on' : 'ot-filter'} onClick={() => setDateOpen((v) => !v)}>
            일자
            {filterDates.length > 0 && <span className="ot-fbadge">{filterDates.length}</span>}
            <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {dateOpen && (
            <DayCalPopover
              date={filterDates[0] ?? `${pad(month)}.01`}
              dates={filterDates}
              onToggle={(d) => setFilterDates((s) => toggleIn(s, d).sort())}
              onClear={() => setFilterDates([])}
              onClose={() => setDateOpen(false)}
            />
          )}
        </div>
        {anyFilter && (
          <button
            type="button"
            className="ot-filter"
            style={{ color: '#9C9CAB' }}
            onClick={() => { setFilterTeams([]); setFilterNames([]); setFilterDates([]) }}
          >
            초기화 ✕
          </button>
        )}

        {/* 요약 칩 — 우측: 대기/승인/반려 + 총 시간외 (동일 디자인) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginLeft: 'auto' }}>
          {['wait', 'ok', 'no'].map((k) => (
            <span key={k} className="ot-chip" style={{ color: OT_ST[k].c, background: OT_ST[k].b }}>
              <i style={{ width: 7, height: 7, borderRadius: '50%', background: OT_ST[k].c }} />
              {OT_ST[k].label} <b style={{ fontFamily: MONO }}>{counts[k]}</b>
            </span>
          ))}
          <span className="ot-chip" style={{ color: '#5350E2', background: '#F1F1FF' }}>
            <i style={{ width: 7, height: 7, borderRadius: '50%', background: '#5350E2' }} />
            총 시간외 <b>{fmtHM(totalOt)}</b>
          </span>
        </div>
      </div>

      {/* 팀 그룹 테이블 */}
      <div className="ot-table">
        <div className="ot-gridhead" style={{ gridTemplateColumns: COLS }}>
          {['이름 · 직급', '일자', '시간', '초과근무', '사유', '상태', '월 누적'].map((h) => (
            <div key={h} className="ot-hh">{h}</div>
          ))}
        </div>
        {shown.length === 0 && (
          <div style={{ padding: '36px 0', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#B4B7C0' }}>
            {withStatus.length === 0 ? `${month}월 접수된 신청이 없습니다` : '조건에 맞는 신청이 없습니다'}
          </div>
        )}
        {teams.map((tm) => (
          <div key={tm.name}>
            <div className="ot-band">
              <i style={{ width: 8, height: 8, borderRadius: 2, background: tm.dot }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#433FBB' }}>{tm.name}</span>
              <span className="ot-cnt">{tm.count}건</span>
            </div>
            {tm.reqs.map((r) => {
              const st = OT_ST[r.status]
              return (
                <div key={r.id} className="ot-row" style={{ gridTemplateColumns: COLS }}>
                  <div className="ot-cell">
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</span>
                    <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 600, color: '#9C9CAB' }}>{r.role}</span>
                  </div>
                  <div className="ot-cell ot-mono">{dateWithDow(r.date)}</div>
                  <div className="ot-cell ot-mono">{r.start}~{r.end ?? '—'}</div>
                  <div className="ot-cell" style={{ fontSize: 12.5, fontWeight: 800, color: '#5350E2' }}>{r.end ? fmtHM(r.hours) : '—'}</div>
                  <div className="ot-cell ot-reason" style={{ fontSize: 12.5, fontWeight: 600, color: '#6E6E80' }}>
                    <span className="ot-reason-clip">{r.reason}</span>
                    <span className="ot-tip">{r.reason}</span>
                  </div>
                  <div className="ot-cell" style={{ display: 'flex', justifyContent: 'center', gap: 5 }}>
                    {r.status === 'wait' && !r.mine ? (
                      <>
                        <button type="button" className="ot-act ot-act--ok" onClick={() => setConfirm({ req: r, action: 'ok' })}>승인</button>
                        <button type="button" className="ot-act ot-act--no" onClick={() => setConfirm({ req: r, action: 'no' })}>반려</button>
                      </>
                    ) : (
                      <span className="ot-pill" style={{ color: st.c, background: st.b }}>{st.label}</span>
                    )}
                  </div>
                  <div className="ot-cell" style={{ fontSize: 12.5, fontWeight: 700, color: '#4E4E5E' }}>{fmtHM(cumFor(r))}</div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* 승인/반려 확인 모달 */}
      {confirm && (() => {
        const { req, action } = confirm
        const isOk = action === 'ok'
        const color = isOk ? '#1F9D6B' : '#D23B3B'
        return (
          <div className="ui-overlay" onClick={() => setConfirm(null)}>
            <div
              className="ui-modal"
              style={{ width: 300, padding: 22, textAlign: 'center' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.3px', marginBottom: 14 }}>
                시간외 {isOk ? '승인' : '반려'}
              </div>
              {/* 신청 요약 — [라벨 | 값] 2열, 좌측 정렬 */}
              <div style={{ background: '#F7F7FA', borderRadius: 11, padding: '13px 15px', marginBottom: 14, textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr', rowGap: 7, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9C9CAB' }}>이름</span>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>
                    {req.name} <span style={{ fontSize: 11.5, fontWeight: 600, color: '#9C9CAB' }}>{req.role}</span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9C9CAB' }}>일시</span>
                  <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: '#4E4E5E' }}>
                    {dateWithDow(req.date)} {req.start}~{req.end ?? '—'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9C9CAB' }}>사유</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: '#6E6E80' }}>{req.reason}</span>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#4E4E5E', marginBottom: 16 }}>
                이 신청을 <b style={{ color }}>{isOk ? '승인' : '반려'}</b>하시겠습니까?
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="ui-btn ui-btn--ghost" onClick={() => setConfirm(null)}>취소</button>
                <button
                  type="button"
                  className="ui-btn"
                  style={{ border: 'none', color, background: OT_ST[action].b }}
                  onClick={() => { decide(req, action); setConfirm(null) }}
                >
                  {isOk ? '승인' : '반려'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default AdminOvertime
