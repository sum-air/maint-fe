// 월간 스케줄 엑셀(XLSX) 추출 — 인쇄 레이아웃과 같은 문법(팀 밴드·요일 색·주말 틴트·코드 색 글자·범례).
// exceljs 는 무거워서(약 1MB) 추출 시점에만 로드.
import { CODE_CAT, CAT, PAL, CODE_GROUPS, TIMES, codeTime } from '../../../shared/lib/workCodes.js'

// 히트맵과 같은 문법 — 배경 없이 코드 글자에만 색
const codeColor = (code) => {
  const cat = CODE_CAT[code]
  if (cat === 'off') return '#8A8F9C'
  return PAL[cat] ? PAL[cat][1] : CAT[cat]?.tx ?? '#3A3A46'
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n) => String(n).padStart(2, '0')
const argb = (hex) => 'FF' + hex.slice(1).toUpperCase()

export default async function exportScheduleXlsx({ year, month, teams, roster, cells }) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const days = new Date(year, month + 1, 0).getDate()
  const dow = (d) => new Date(year, month, d).getDay()
  const dowHex = (w) => (w === 0 ? '#DE5151' : w === 6 ? '#3B7DE8' : '#5A5A68')
  const now = new Date()

  const ws = wb.addWorksheet(`${month + 1}월`, {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 4, showGridLines: false }],
  })
  const thin = { style: 'thin', color: { argb: 'FFE1E1E9' } }
  const box = { top: thin, left: thin, bottom: thin, right: thin }
  const center = { horizontal: 'center', vertical: 'middle' }
  ws.getColumn(1).width = 17
  for (let d = 1; d <= days; d++) ws.getColumn(d + 1).width = 5.4

  // 제목 + 안내줄 (시간외 엑셀과 같은 상단 구성)
  ws.mergeCells(1, 1, 1, days + 1)
  const title = ws.getCell(1, 1)
  title.value = `${year}년 ${month + 1}월 근무 스케줄`
  title.font = { size: 14, bold: true, color: { argb: 'FF1A1A22' } }
  title.alignment = center
  ws.getRow(1).height = 26
  ws.mergeCells(2, 1, 2, days + 1)
  const meta = ws.getCell(2, 1)
  meta.value = `대상: 전체 ${roster.length}명  ·  추출일 ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  meta.font = { size: 9, color: { argb: 'FF8A8A98' } }
  meta.alignment = center
  ws.getRow(2).height = 14
  ws.getRow(3).height = 6

  // 머리글 — 인원 + 요일/일자 (주말은 살짝 진한 연보라)
  const head = ws.getRow(4)
  head.height = 28
  const corner = ws.getCell(4, 1)
  corner.value = '인원'
  corner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F0FB' } }
  corner.font = { size: 10, bold: true, color: { argb: 'FF433FBB' } }
  corner.alignment = center
  corner.border = box
  for (let d = 1; d <= days; d++) {
    const w = dow(d)
    const c = ws.getCell(4, d + 1)
    c.value = `${WEEK[w]}\n${d}`
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: w === 0 || w === 6 ? 'FFEEEDF9' : 'FFF1F0FB' } }
    c.font = { size: 9, bold: true, color: { argb: argb(dowHex(w)) } }
    c.alignment = { ...center, wrapText: true }
    c.border = box
  }

  // 팀 밴드 + 인원 행
  let r = 4
  for (const team of teams) {
    const ppl = roster.map((p, pi) => ({ ...p, pi })).filter((p) => p.team === team)
    r += 1
    ws.mergeCells(r, 1, r, days + 1)
    const band = ws.getCell(r, 1)
    band.value = `${team} · ${ppl.length}명`
    band.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7FA' } }
    band.font = { size: 9.5, bold: true, color: { argb: 'FF3A3A48' } }
    band.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    band.border = box
    ws.getRow(r).height = 17
    for (const p of ppl) {
      r += 1
      ws.getRow(r).height = 17
      const name = ws.getCell(r, 1)
      name.value = { richText: [
        { text: p.name, font: { size: 10, bold: true, color: { argb: 'FF3A3A48' } } },
        ...(p.role ? [{ text: `  ${p.role}`, font: { size: 8, color: { argb: 'FFA0A0AE' } } }] : []),
      ] }
      name.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
      name.border = box
      for (let d = 1; d <= days; d++) {
        const w = dow(d)
        const c = ws.getCell(r, d + 1)
        c.border = box
        c.alignment = center
        if (w === 0 || w === 6) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7FC' } }
        const cell = cells[`${p.pi}_${d}`]
        if (!cell?.code) continue
        c.value = cell.code === 'EC(0)' && cell.hours != null ? `EC(${cell.hours})` : cell.code
        c.font = { size: 9, bold: true, color: { argb: argb(codeColor(cell.code)) } }
      }
    }
  }

  // 하단 범례 — 근무 코드 안내 축약판 (그룹당 한 줄)
  r += 2
  for (const g of CODE_GROUPS) {
    ws.mergeCells(r, 1, r, days + 1)
    const c = ws.getCell(r, 1)
    c.value = { richText: [
      { text: '● ', font: { size: 8, color: { argb: argb(CAT[g.key].dot) } } },
      { text: `${g.label}   `, font: { size: 9, bold: true, color: { argb: 'FF3A3A48' } } },
      ...g.codes.flatMap((co) => {
        const time = co.t ?? (TIMES[co.c] ? codeTime(co.c).replace(/:00/g, '') : '')
        return [
          { text: co.c, font: { size: 9, bold: true, color: { argb: argb(codeColor(co.c)) } } },
          { text: `${co.d ? ` ${co.d}` : ''}${time ? ` ${time}` : ''}    `, font: { size: 8.5, color: { argb: 'FF8A8A98' } } },
        ]
      }),
    ] }
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ws.getRow(r).height = 15
    r += 1
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
