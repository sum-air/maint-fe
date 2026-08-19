import { useState } from 'react'
import { MONO, ROSTER, pickCode } from '../../../shared/lib/workCodes.js'
import { CURRENT_USER } from '../../../shared/lib/currentUser.js'
import DayCalPopover from '../../../shared/components/DayCalPopover.jsx'
import { demoLogsFor, todayKey, fmtDate } from '../utils.js'

const pad = (n) => String(n).padStart(2, '0')
const TEAMS = [...new Set(ROSTER.map((p) => p.team))]

// 업무일지 엑셀 추출 모달 (admin 전용) — 월/일 단위 + 팀·인원 중복 선택.
// 미선택 = 전체. 파일은 엑셀에서 바로 열리는 CSV(BOM 포함)로 내려받는다.
function ExportModal({ logsByDate, onClose }) {
  const [unit, setUnit] = useState('month') // 'month' | 'day'
  // 월 범위 — mTo 가 null 이면 단일 월. 시작 월 → 끝 월 두 번 클릭으로 범위 지정
  const [mFrom, setMFrom] = useState(() => new Date().getMonth() + 1)
  const [mTo, setMTo] = useState(null)
  const [mPicking, setMPicking] = useState(false)
  const [day, setDay] = useState(() => todayKey())
  const [selTeams, setSelTeams] = useState([])
  const [selNames, setSelNames] = useState([])
  const [openSel, setOpenSel] = useState(null) // 'period' | 'team' | 'name' | null

  const people = ROSTER.filter((p) => selTeams.length === 0 || selTeams.includes(p.team))

  const toggleTeam = (t) => {
    const next = selTeams.includes(t) ? selTeams.filter((x) => x !== t) : [...selTeams, t]
    setSelTeams(next)
    // 팀 범위를 벗어난 인원 선택은 정리
    setSelNames((ns) => ns.filter((n) => next.length === 0 || next.includes(ROSTER.find((p) => p.name === n)?.team)))
  }
  const toggleName = (n) => setSelNames((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))

  // 월 그리드 클릭 — 첫 클릭 = 시작 월(메뉴 유지), 두 번째 클릭 = 끝 월(범위 확정 후 닫힘)
  const pickMonth = (m) => {
    if (!mPicking) {
      setMFrom(m)
      setMTo(null)
      setMPicking(true)
    } else {
      setMFrom(Math.min(mFrom, m))
      setMTo(m === mFrom ? null : Math.max(mFrom, m))
      setMPicking(false)
      setOpenSel(null)
    }
  }

  // 내 일지는 화면 상태, 다른 사람은 데모 생성 — 백엔드 연동 시 추출 API 다운로드로 교체
  const logsOf = (name, key) => (name === CURRENT_USER.name ? (logsByDate[key] ?? []) : demoLogsFor(name, key))

  const year = new Date().getFullYear()
  const exportCsv = () => {
    const months = Array.from({ length: (mTo ?? mFrom) - mFrom + 1 }, (_, i) => mFrom + i)
    const days = unit === 'month'
      ? months.flatMap((m) =>
          Array.from({ length: new Date(year, m, 0).getDate() }, (_, i) => `${pad(m)}.${pad(i + 1)}`))
      : [day]
    const targets = selNames.length > 0 ? people.filter((p) => selNames.includes(p.name)) : people

    const rows = [['날짜', '팀', '이름', '직급', '근무코드', '시작', '종료', '카테고리', '내용']]
    for (const p of targets) {
      const pi = ROSTER.indexOf(p)
      for (const k of days) {
        const [m, d] = k.split('.').map(Number)
        const code = pickCode(pi, d, new Date(year, m - 1, d).getDay())
        for (const l of logsOf(p.name, k)) rows.push([k, p.team, p.name, p.role, code, l.s, l.e || '', l.c, l.t])
      }
    }

    const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v))
    const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }) // BOM — 엑셀 한글 깨짐 방지
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = unit === 'month'
      ? `업무일지_${year}-${pad(mFrom)}${mTo ? `~${pad(mTo)}` : ''}.csv`
      : `업무일지_${year}-${day.replace('.', '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    onClose()
  }

  const lb = { fontSize: 10, fontWeight: 800, color: '#B6B6C2', letterSpacing: '.4px', marginBottom: 4, textAlign: 'center' }

  // 중복 선택 드롭다운 — 라벨 고정 + 모서리 개수 배지, 항목 클릭으로 토글 (메뉴 유지)
  const multiSel = (key, label, opts, sel, onToggle, onClear) => (
    <div style={{ flex: 1, position: 'relative' }}>
      <div style={lb}>{label}</div>
      <button
        type="button"
        className="dl-filter"
        style={{
          width: '100%', height: 34, justifyContent: 'center', fontWeight: 800, position: 'relative',
          ...(sel.length > 0 ? { background: '#E9E8F7', color: '#433FBB', borderColor: 'transparent' } : {}),
        }}
        onClick={() => setOpenSel((v) => (v === key ? null : key))}
      >
        {sel.length === 0 ? '전체' : sel.length === 1 ? sel[0] : `${sel.length}개 선택`}
        <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
        {sel.length > 1 && <span className="dl-fbadge">{sel.length}</span>}
      </button>
      {openSel === key && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={() => setOpenSel(null)} />
          <div className="dl-fmenu" style={{ maxHeight: 240, overflowY: 'auto' }}>
            <button type="button" className="dl-fitem" style={{ color: '#B4B7C0' }} onClick={onClear}>
              전체 (초기화)
            </button>
            {opts.map((o) => (
              <button key={o} type="button" className={sel.includes(o) ? 'dl-fitem on' : 'dl-fitem'} onClick={() => onToggle(o)}>
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
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.3px', marginBottom: 14 }}>업무일지 엑셀 추출</div>

        <div style={{ marginBottom: 10 }}>
          <div style={lb}>단위</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['month', '월 단위'], ['day', '일 단위']].map(([u, t]) => (
              <button
                key={u}
                type="button"
                className="dl-filter"
                style={{
                  flex: 1, height: 34, justifyContent: 'center', fontWeight: 800,
                  ...(unit === u
                    ? { background: '#E9E8F7', color: '#433FBB', borderColor: 'transparent' }
                    : { background: '#fff', color: '#8A8A98' }),
                }}
                onClick={() => { setUnit(u); setOpenSel(null); setMPicking(false) }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 기간 — 점선 밑줄 클릭 → 월 그리드 / 일 달력 팝오버 */}
        <div style={{ marginBottom: 10, position: 'relative' }}>
          <div style={lb}>기간</div>
          <div style={{ height: 36, border: '1px solid #E1E1E9', borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span
              style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: '#433FBB', borderBottom: '1.5px dashed #C7C5FF', paddingBottom: 1, marginTop: 3, lineHeight: 1, cursor: 'pointer' }}
              onClick={() => setOpenSel((v) => (v === 'period' ? null : 'period'))}
            >
              {unit === 'month'
                ? (mPicking ? `${mFrom}월 – ?` : mTo ? `${year}년 ${mFrom}월 – ${mTo}월` : `${year}년 ${mFrom}월`)
                : fmtDate(day)}
            </span>
          </div>
          {openSel === 'period' && unit === 'month' && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={() => { setOpenSel(null); setMPicking(false) }} />
              <div className="dl-fmenu" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, width: 186 }}>
                <div style={{ gridColumn: '1 / -1', padding: '4px 0 5px', fontSize: 10, fontWeight: 800, color: '#B4B7C0' }}>
                  시작 월 → 끝 월 순서로 클릭
                </div>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={m >= mFrom && m <= (mTo ?? mFrom) ? 'dl-fitem on' : 'dl-fitem'}
                    onClick={() => pickMonth(m)}
                  >
                    {m}월
                  </button>
                ))}
              </div>
            </>
          )}
          {openSel === 'period' && unit === 'day' && (
            <DayCalPopover date={day} onPick={setDay} onClose={() => setOpenSel(null)} />
          )}
        </div>

        {/* 대상 — 팀·인원 중복 선택, 미선택 = 전체 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          {multiSel('team', '팀', TEAMS, selTeams, toggleTeam, () => { setSelTeams([]); setSelNames([]) })}
          {multiSel('name', '인원', people.map((p) => p.name), selNames, toggleName, () => setSelNames([]))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>취소</button>
          <button
            type="button"
            className="ui-btn"
            style={{ border: 'none', color: '#fff', background: 'linear-gradient(120deg,#5350E2,#7A6FF0)', boxShadow: '0 5px 14px rgba(83,80,226,.32)' }}
            onClick={exportCsv}
          >
            추출
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
