import { useState } from 'react'
import { MONO } from '../../../shared/lib/workCodes.js'
import { fetchMonthOvertimeRequests } from '../../../shared/lib/overtime.js'
import { showToast } from '../../../shared/lib/toast.js'
import { fmtHM } from '../utils.js'

const pad = (n) => String(n).padStart(2, '0')
const TODAY = new Date()

// 직급 순서 — 스케줄 정렬과 같은 기준, 모르는 직급은 뒤로
const ROLE_ORDER = ['본부장', '부장', '차장', '과장', '대리', '사원']
const roleRank = (role) => {
  const i = ROLE_ORDER.indexOf(role)
  return i === -1 ? ROLE_ORDER.length : i
}

// "HH:MM" → 분
const toMin = (hm) => {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + m
}

// 한 건의 (시작~종료) 분 구간 — 종료가 시작보다 빠르면 익일로 해석 (서버 규칙과 동일)
const spanOf = (r) => {
  const s = toMin(r.start)
  let e = toMin(r.end)
  if (e <= s) e += 24 * 60
  return [s, e]
}

// 야간(22:00~06:00) 겹침 분 — 구간이 익일까지 갈 수 있어 창을 이틀치 펼쳐서 잰다
const NIGHT_WINDOWS = [[0, 360], [1320, 1800], [2760, 3240]]
export const nightMinutes = (s, e) =>
  NIGHT_WINDOWS.reduce((sum, [ws, we]) => sum + Math.max(0, Math.min(e, we) - Math.max(s, ws)), 0)

// 인원별 집계 — 승인 건만. 종료(퇴근) 없는 건은 시간 0 으로 세고 비고에 남긴다.
export function summarize(requests, roster) {
  const byNo = Object.fromEntries(roster.map((p) => [p.employeeNo, p]))
  const people = {}
  for (const r of requests) {
    const p = (people[r.employeeNo] ??= { employeeNo: r.employeeNo, count: 0, totalMin: 0, nightMin: 0, noEnd: 0 })
    p.count += 1
    if (!r.end) {
      p.noEnd += 1
      continue
    }
    const [s, e] = spanOf(r)
    p.totalMin += e - s
    p.nightMin += nightMinutes(s, e)
  }
  return Object.values(people)
    .map((p) => {
      const info = byNo[p.employeeNo]
      return { ...p, name: info?.name ?? p.employeeNo, role: info?.role ?? '', team: info?.team ?? '' }
    })
    .sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name, 'ko'))
}

// 서식 있는 XLSX 생성 — 제목·안내·표 머리글·테두리·합계. exceljs 는 무거워서(약 1MB) 추출 시점에만 로드.
async function buildWorkbook({ year, month, team, rows }) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(`${year}-${pad(month)}`, { views: [{ showGridLines: false }] })
  ws.columns = [
    { width: 16 }, { width: 11 }, { width: 9 }, { width: 11 }, { width: 14 }, { width: 19 }, { width: 30 },
  ]
  const thin = { style: 'thin', color: { argb: 'FFE1E1E9' } }
  const box = { top: thin, left: thin, bottom: thin, right: thin }

  // 제목 + 안내
  ws.mergeCells('A1:G1')
  const title = ws.getCell('A1')
  title.value = `${year}년 ${month}월 시간외근무 집계`
  title.font = { size: 14, bold: true, color: { argb: 'FF1A1A22' } }
  ws.getRow(1).height = 26
  ws.mergeCells('A2:G2')
  const meta = ws.getCell('A2')
  const now = new Date()
  meta.value = `대상: ${team ?? '전체'}  ·  승인 건만 집계  ·  야간 = 22:00~06:00  ·  추출일 ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  meta.font = { size: 9, color: { argb: 'FF8A8A98' } }
  ws.getRow(2).height = 14
  ws.getRow(3).height = 6

  // 표 머리글
  const header = ws.getRow(4)
  header.values = ['팀', '이름', '직급', '승인 건수', '총 시간외', '야간 (22:00~06:00)', '비고']
  header.height = 20
  header.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F0FB' } }
    c.font = { size: 10, bold: true, color: { argb: 'FF433FBB' } }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = box
  })

  // 데이터
  for (const p of rows) {
    const r = ws.addRow([p.team, p.name, p.role, p.count, fmtHM(p.totalMin / 60), p.nightMin ? fmtHM(p.nightMin / 60) : '—',
      p.noEnd ? `퇴근 미기록 ${p.noEnd}건 (0으로 집계)` : ''])
    r.height = 18
    r.eachCell({ includeEmpty: true }, (c, col) => {
      c.border = box
      c.font = { size: 10, color: { argb: col === 5 ? 'FF433FBB' : col === 7 ? 'FF8A8A98' : 'FF3A3A46' }, bold: col === 5 }
      c.alignment = { horizontal: col <= 2 || col === 7 ? 'left' : 'center', vertical: 'middle' }
    })
  }

  // 합계
  const sum = (k) => rows.reduce((s, p) => s + p[k], 0)
  const total = ws.addRow(['합계', '', '', sum('count'), fmtHM(sum('totalMin') / 60), fmtHM(sum('nightMin') / 60), ''])
  total.height = 20
  total.eachCell({ includeEmpty: true }, (c, col) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7FA' } }
    c.font = { size: 10, bold: true, color: { argb: col === 5 ? 'FF433FBB' : 'FF1A1A22' } }
    c.alignment = { horizontal: col === 1 ? 'left' : 'center', vertical: 'middle' }
    c.border = { ...box, top: { style: 'medium', color: { argb: 'FFC7C5FF' } } }
  })

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

// 시간외근무 월별 엑셀(XLSX) 추출 — 인사팀 제출용. 승인 건만, 직급순, 야간(22:00~06:00) 열 포함.
function OvertimeExportModal({ roster, onClose }) {
  const [year, setYear] = useState(TODAY.getFullYear())
  const [month, setMonth] = useState(TODAY.getMonth() + 1)
  const [team, setTeam] = useState(null) // null = 전체
  const [openSel, setOpenSel] = useState(null) // 'month' | 'team' | null
  const [pickYear, setPickYear] = useState(TODAY.getFullYear())
  const [busy, setBusy] = useState(false)

  const teams = [...new Set(roster.map((p) => p.team))]

  const exportCsv = async () => {
    if (busy) return
    setBusy(true)
    try {
      const all = await fetchMonthOvertimeRequests(year, month - 1)
      const approved = all.filter((r) => r.status === 'ok')
      const rows = summarize(approved, roster).filter((p) => !team || p.team === team)
      if (rows.length === 0) {
        showToast(`${year}년 ${month}월 승인된 시간외 신청이 없습니다`, 'error')
        return
      }
      const blob = await buildWorkbook({ year, month, team, rows })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `시간외근무_${year}-${pad(month)}${team ? `_${team}` : ''}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      onClose()
    } catch (e) {
      showToast(`추출 실패 — ${e.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const lb = { fontSize: 10, fontWeight: 800, color: '#B6B6C2', letterSpacing: '.4px', marginBottom: 4, textAlign: 'center' }

  return (
    <div className="ui-overlay" onClick={onClose}>
      <div className="ui-modal" style={{ width: 300, padding: 20, textAlign: 'center', overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.3px', marginBottom: 14 }}>시간외근무 엑셀 추출</div>

        {/* 기간 — 연/월 팝오버 */}
        <div style={{ marginBottom: 10, position: 'relative' }}>
          <div style={lb}>기간</div>
          <div style={{ height: 36, border: '1px solid #E1E1E9', borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span
              style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: '#433FBB', borderBottom: '1.5px dashed #C7C5FF', paddingBottom: 1, marginTop: 3, lineHeight: 1, cursor: 'pointer' }}
              onClick={() => { setPickYear(year); setOpenSel((v) => (v === 'month' ? null : 'month')) }}
            >
              {year}년 {month}월
            </span>
          </div>
          {openSel === 'month' && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={() => setOpenSel(null)} />
              <div className="ot-cal" style={{ left: '50%', transform: 'translateX(-50%)' }}>
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
                      onClick={() => { setYear(pickYear); setMonth(i + 1); setOpenSel(null) }}
                    >
                      {i + 1}월
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 팀 — 전체 또는 하나 */}
        <div style={{ marginBottom: 10, position: 'relative' }}>
          <div style={lb}>팀</div>
          <button
            type="button"
            className="ot-filter"
            style={{ width: '100%', height: 34, justifyContent: 'center', fontWeight: 800, ...(team ? { background: '#E9E8F7', color: '#433FBB', borderColor: 'transparent' } : {}) }}
            onClick={() => setOpenSel((v) => (v === 'team' ? null : 'team'))}
          >
            {team ?? '전체'}
            <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {openSel === 'team' && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 65 }} onClick={() => setOpenSel(null)} />
              <div className="ot-filtermenu" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                {[null, ...teams].map((t) => (
                  <button key={t ?? '_all'} type="button" className={team === t ? 'ot-filteritem on' : 'ot-filteritem'} onClick={() => { setTeam(t); setOpenSel(null) }}>
                    {t ?? '전체'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F7F7FA', borderRadius: 10, padding: '10px 12px', textAlign: 'left' }}>
          <span style={{ width: 16, height: 16, borderRadius: 5, background: 'linear-gradient(120deg,#5350E2,#7A6FF0)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#4E4E5E' }}>승인된 건만 포함 <span style={{ color: '#B4B7C0' }}>(대기·반려 제외)</span></span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
          <button type="button" className="ui-btn ui-btn--ghost" onClick={onClose}>취소</button>
          <button
            type="button"
            className="ui-btn"
            style={{ border: 'none', color: '#fff', background: 'linear-gradient(120deg,#5350E2,#7A6FF0)', boxShadow: '0 5px 14px rgba(83,80,226,.32)', opacity: busy ? 0.6 : 1 }}
            onClick={exportCsv}
          >
            추출
          </button>
        </div>
      </div>
    </div>
  )
}

export default OvertimeExportModal
