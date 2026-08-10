// 시간 입력 헬퍼 — 출퇴근/시간외근무 모달 공용.
// 브라우저 내장 time input 이 환경에 따라 타이핑이 안 되는 문제가 있어 텍스트 입력 + 자동 포맷을 쓴다.

// 숫자만 입력하면 "HH:MM" 으로 자동 포맷 (0811 → 08:11)
export const formatTime = (raw) => {
  const d = raw.replace(/\D/g, '').slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
}

// 저장 시 유효한 시각으로 정규화. 유효하지 않으면 null, 빈 값이면 ''
export const normalizeTime = (s) => {
  if (!s) return ''
  const m = s.match(/^(\d{1,2}):?(\d{2})$/)
  if (!m) return null
  const h = Math.min(23, +m[1])
  const mm = Math.min(59, +m[2])
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

// "HH:MM" 두 시각 사이 시간(h, 소수 1자리) — 자정 넘김 포함
export const hoursBetween = (s, e) => {
  const [a, b] = s.split(':').map(Number)
  const [c, d] = e.split(':').map(Number)
  let mins = c * 60 + d - (a * 60 + b)
  if (mins < 0) mins += 24 * 60
  return Math.round((mins / 60) * 10) / 10
}
