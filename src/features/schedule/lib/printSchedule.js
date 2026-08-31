// 월간 스케줄 인쇄/PDF — 숨김 iframe 에 인쇄 전용 레이아웃을 그리고 브라우저 인쇄 다이얼로그를 연다.
// 다이얼로그에서 프린터 출력 또는 "PDF로 저장" 을 고르면 된다. (A4 가로, 색상 유지)
import { CODE_CAT, CAT, PAL, CODE_GROUPS, TIMES, codeTime } from '../../../shared/lib/workCodes.js'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n) => String(n).padStart(2, '0')
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// 히트맵과 같은 문법 — 배경 없이 코드 글자에만 색 (엑셀 추출도 같은 색을 쓴다)
export const codeColor = (code) => {
  const cat = CODE_CAT[code]
  if (cat === 'off') return '#8A8F9C'
  return PAL[cat] ? PAL[cat][1] : CAT[cat]?.tx ?? '#3A3A46'
}

export function buildPrintHtml({ year, month, teams, roster, cells }) {
  const days = new Date(year, month + 1, 0).getDate()
  const dow = (d) => new Date(year, month, d).getDay()
  const dowColor = (w) => (w === 0 ? '#DE5151' : w === 6 ? '#3B7DE8' : '#5A5A68')
  const now = new Date()

  const headCells = Array.from({ length: days }, (_, i) => {
    const d = i + 1
    const w = dow(d)
    const weekend = w === 0 || w === 6
    return `<th style="color:${dowColor(w)};${weekend ? 'background:#EEEDF9' : ''}">${WEEK[w]}<br>${d}</th>`
  }).join('')

  const bodyRows = teams
    .map((team) => {
      const ppl = roster.map((p, pi) => ({ ...p, pi })).filter((p) => p.team === team)
      const band = `<tr class="band"><td colspan="${days + 1}">${esc(team)} · ${ppl.length}명</td></tr>`
      const rows = ppl
        .map((p) => {
          const dayCells = Array.from({ length: days }, (_, i) => {
            const d = i + 1
            const w = dow(d)
            const cell = cells[`${p.pi}_${d}`]
            const cls = w === 0 || w === 6 ? ' class="weekend"' : ''
            if (!cell?.code) return `<td${cls}></td>`
            const label = cell.code === 'EC(0)' && cell.hours != null ? `EC(${cell.hours})` : cell.code
            return `<td${cls}><span class="code" style="color:${codeColor(cell.code)}">${esc(label)}</span></td>`
          }).join('')
          return `<tr><td class="name"><b>${esc(p.name)}</b> <span class="role">${esc(p.role)}</span></td>${dayCells}</tr>`
        })
        .join('')
      return band + rows
    })
    .join('')

  // 하단 범례 — 근무 코드 안내 축약판
  const legend = CODE_GROUPS.map((g) => {
    const items = g.codes
      .map((co) => {
        const time = co.t ?? (TIMES[co.c] ? codeTime(co.c).replace(/:00/g, '') : '')
        const name = co.d ? ` ${esc(co.d)}` : ''
        return `<span class="lg-item"><span class="code" style="color:${codeColor(co.c)}">${esc(co.c)}</span>${name}${time ? ` <span class="lg-time">${esc(time)}</span>` : ''}</span>`
      })
      .join('')
    return `<span class="lg"><i style="background:${CAT[g.key].dot}"></i><b>${esc(g.label)}</b>${items}</span>`
  }).join('')

  return `<!doctype html><html><head><meta charset="utf-8"><title>${year}년 ${month + 1}월 근무 스케줄</title><style>
@page { size: A4 landscape; margin: 9mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; color: #1A1A22; }
h1 { margin: 0 0 3px; font-size: 15px; text-align: center; letter-spacing: -.3px; }
.meta { margin: 0 0 9px; font-size: 8px; color: #8A8A98; text-align: center; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid #E1E1E9; padding: 0; text-align: center; height: 15px; font-size: 7.5px; overflow: hidden; }
th.name, td.name { width: 66px; }
thead th { background: #F1F0FB; font-weight: 700; line-height: 1.25; padding: 2px 0; }
thead th.name { color: #433FBB; font-size: 8.5px; }
tr { page-break-inside: avoid; }
.band td { background: #F7F7FA; font-weight: 800; font-size: 8.5px; text-align: left; padding: 2px 6px; color: #3A3A48; }
td.name { text-align: left; padding: 0 5px; font-size: 8.5px; white-space: nowrap; }
td.name .role { color: #A0A0AE; font-weight: 600; font-size: 7px; }
td.weekend { background: #F7F7FC; }
.code { font-family: ui-monospace, 'JetBrains Mono', monospace; font-weight: 800; letter-spacing: -.3px; }
.legend { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: center; }
.lg { display: inline-flex; align-items: center; gap: 5px; font-size: 7px; color: #5E5E70; }
.lg i { width: 6px; height: 6px; border-radius: 50%; flex: none; }
.lg b { font-size: 7.5px; color: #3A3A48; }
.lg-item { display: inline-flex; gap: 3px; align-items: baseline; }
.lg-time { color: #A6A6B4; }
</style></head><body>
<h1>${year}년 ${month + 1}월 근무 스케줄</h1>
<p class="meta">대상: 전체 ${roster.length}명 · 추출일 ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}</p>
<table>
<thead><tr><th class="name">인원</th>${headCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
<div class="legend">${legend}</div>
</body></html>`
}

// 숨김 iframe 에 렌더 → 인쇄 다이얼로그. 끝나면(afterprint) iframe 제거.
export default function printSchedule(data) {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  frame.srcdoc = buildPrintHtml(data)
  frame.onload = () => {
    const win = frame.contentWindow
    const cleanup = () => frame.remove()
    win.addEventListener('afterprint', () => setTimeout(cleanup, 200))
    setTimeout(cleanup, 120000) // afterprint 미지원/미발화 대비
    win.focus()
    win.print()
  }
  document.body.appendChild(frame)
}
