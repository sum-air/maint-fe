// 실시간 운항 — 상태·노선 정의 + 임시 데이터
// 항공기 등록부호별 스케줄. 백엔드 movement API 연동 시 FLEET 를 API 응답으로 교체한다.
// XU2591~2598: 김포(GMP) ↔ 사천(HIN) 왕복 8편 (홀수편 김포→사천, 짝수편 사천→김포)

export const APT = {
  G: { name: '김포', code: 'GMP' },
  H: { name: '사천', code: 'HIN' },
}

export const FLT_ST = {
  도착: { c: '#2F7DB0', b: '#E6F1FA' },
  운항중: { c: '#5350E2', b: '#ECECFF' },
  예정: { c: '#8A8A98', b: '#F1F1F4' },
  지연: { c: '#C97A17', b: '#FBEFD9' },
  결항: { c: '#D23B3B', b: '#FBE6E6' },
}

// std/sta: 계획, ad/aa: 실제 출발/도착 (빈 값 = 아직 없음)
// 데모 시각 14:50 기준 — XU2595 운항중(40%), 이후 편은 예정
export const FLEET = {
  HL5264: [
    { fno: 'XU2591', dir: 'GH', std: '07:20', sta: '08:35', ad: '07:26', aa: '08:39', st: '도착', pax: 68, fuel: 2600, spot: '228' },
    { fno: 'XU2592', dir: 'HG', std: '09:05', sta: '10:20', ad: '09:04', aa: '10:23', st: '도착', pax: 72, fuel: 0, dl: 'VW0003', si: 'DLA/VW03 - GO AROUND 1 TIME' },
    { fno: 'XU2593', dir: 'GH', std: '10:50', sta: '12:05', ad: '10:52', aa: '12:04', st: '도착', pax: 54, fuel: 2600, spot: '228' },
    { fno: 'XU2594', dir: 'HG', std: '12:30', sta: '13:45', ad: '12:38', aa: '13:51', st: '도착', pax: 61, fuel: 0, dl: 'NA0014', si: 'T/O DLA DUE TO MIL TRAINING AT HIN APO' },
    { fno: 'XU2595', dir: 'GH', std: '14:20', sta: '15:35', ad: '14:22', aa: '', eta: '15:37', st: '운항중', pct: 40, pax: 66, fuel: 2600, spot: '228' },
    { fno: 'XU2596', dir: 'HG', std: '16:05', sta: '17:20', ad: '', aa: '', st: '예정', pax: 58, fuel: 0 },
    { fno: 'XU2597', dir: 'GH', std: '17:50', sta: '19:05', ad: '', aa: '', st: '예정', pax: 49, fuel: 2600, spot: '228' },
    { fno: 'XU2598', dir: 'HG', std: '19:35', sta: '20:50', ad: '', aa: '', st: '예정', pax: 63, fuel: 0 },
  ],
  HL5263: [
    { fno: 'XU2581', dir: 'GH', std: '11:30', sta: '12:45', ad: '11:33', aa: '12:47', st: '도착', pax: 57, fuel: 2450, spot: '231' },
    { fno: 'XU2582', dir: 'HG', std: '13:20', sta: '14:35', ad: '13:26', aa: '14:41', st: '도착', pax: 64, fuel: 0 },
    { fno: 'XU2583', dir: 'GH', std: '15:10', sta: '16:25', ad: '', aa: '', st: '지연', pax: 70, fuel: 2450, spot: '231', dl: 'WX', si: 'DLA DUE TO WX AT HIN APO' },
    { fno: 'XU2584', dir: 'HG', std: '17:00', sta: '18:15', ad: '', aa: '', st: '예정', pax: 52, fuel: 0 },
  ],
}

// 출발/도착 공항 필터 옵션 (null = 전체)
export const AIRPORT_OPTS = [
  { key: null, label: '전체' },
  { key: 'G', label: '김포' },
  { key: 'H', label: '사천' },
]

// 실제 시각 색상 — 계획보다 늦으면 빨강, 빠르면 파랑, 같으면 기본
export const actColor = (sched, act) => {
  if (!act) return '#B6B6C2'
  if (act > sched) return '#D23B3B'
  if (act < sched) return '#2F7DB0'
  return '#15151D'
}

// ── atlas /flights 응답 → 화면 leg 매핑 ──
// 시각은 전부 UTC ISO 로 오고 KST 변환은 여기서만 한다.
// PAX·FUEL·SPOT·SI 는 아직 응답에 없다 (백엔드 필드 추가 요청 상태) — 화면은 '—' 처리.

const pad2 = (n) => String(n).padStart(2, '0')

// 오늘의 KST 달력일 (YYYY-MM-DD) — 화면은 한국 날짜 기준으로 하루를 센다
export const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)

// UTC ISO → 그 시각의 KST 달력일 (YYYY-MM-DD)
export const kstDateOf = (iso) => (iso ? new Date(Date.parse(iso) + 9 * 3600 * 1000).toISOString().slice(0, 10) : '')

const kstHM = (iso) => {
  if (!iso) return ''
  const k = new Date(Date.parse(iso) + 9 * 3600 * 1000)
  return `${pad2(k.getUTCHours())}:${pad2(k.getUTCMinutes())}`
}

// 백엔드 FlightStatus → 화면 상태 라벨. 판정은 백엔드 몫이고 여기선 라벨만 붙인다.
const STATUS_TO_ST = {
  SCHEDULED: '예정',
  DEPARTED: '운항중',
  AIRBORNE: '운항중',
  LANDED: '도착',
  ARRIVED: '도착',
  CANCELLED: '결항',
  IRREGULAR: '지연',
}

// 공항 코드 → APT 키. 미등록 공항은 즉석 등록해서 화면이 깨지지 않게 한다.
const aptKey = (code) => {
  const found = Object.keys(APT).find((k) => APT[k].code === code)
  if (found) return found
  APT[code] = { name: code, code }
  return code
}

export function mapFlights(rows) {
  const sorted = [...(rows ?? [])].sort((a, b) =>
    (a.scheduledDepartureUtc ?? '').localeCompare(b.scheduledDepartureUtc ?? ''))

  const byReg = {}
  for (const f of sorted) {
    const delay = Math.max(0, f.departureDelayMinutes ?? 0)
    const st = f.status === 'SCHEDULED' && delay > 0 ? '지연' : (STATUS_TO_ST[f.status] ?? '예정')

    // 진행률 — 실제 출발(없으면 계획)과 예상 도착(백엔드 제공) 사이에서 현재 시각 위치
    const depMs = Date.parse(f.actualRampOutUtc ?? f.actualTakeOffUtc ?? f.scheduledDepartureUtc)
    const arrMs = Date.parse(f.estimatedArrivalUtc ?? f.scheduledArrivalUtc) + (f.estimatedArrivalUtc ? 0 : delay * 60000)
    const cur = st === '운항중'
    const pct = cur && arrMs > depMs
      ? Math.min(98, Math.max(2, Math.round(((Date.now() - depMs) / (arrMs - depMs)) * 100)))
      : undefined

    const leg = {
      fno: f.flightNumber,
      dir: `${aptKey(f.departureAirport)}${aptKey(f.arrivalAirport)}`,
      std: kstHM(f.scheduledDepartureUtc),
      sta: kstHM(f.scheduledArrivalUtc),
      ad: kstHM(f.actualRampOutUtc ?? f.actualTakeOffUtc),
      aa: kstHM(f.actualRampInUtc),
      eta: cur ? kstHM(f.estimatedArrivalUtc ?? new Date(arrMs).toISOString()) : '',
      st,
      pct,
      dl: f.irregularityCode ?? '',
      spot: f.arrivalSpot ?? f.departureSpot ?? '', // 도착 주기장 우선 (FUEL 호버 툴팁)
    }
    ;(byReg[f.registration ?? '미지정'] ??= []).push(leg)
  }
  return byReg
}
