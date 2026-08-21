// 실시간 운항 — 상태·노선 정의 + atlas /flights 응답 매핑

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

// 출발/도착 공항 필터 옵션 — 화면에 로드된 편들에서 유도한다 (null = 전체)
export const airportOptsOf = (fleet) => {
  const keys = new Set()
  Object.values(fleet ?? {}).forEach((legs) => legs.forEach((l) => {
    keys.add(l.dir[0])
    keys.add(l.dir[1])
  }))
  return [{ key: null, label: '전체' }, ...[...keys].map((k) => ({ key: k, label: APT[k]?.name ?? k }))]
}

// 실제 시각 색상 — 계획보다 늦으면 빨강, 빠르면 파랑, 같으면 기본
export const actColor = (sched, act) => {
  if (!act) return '#B6B6C2'
  if (act > sched) return '#D23B3B'
  if (act < sched) return '#2F7DB0'
  return '#15151D'
}

// ── atlas /flights 응답 → 화면 leg 매핑 ──
// 시각은 전부 UTC ISO 로 오고 KST 변환은 여기서만 한다.

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

    // SI 스트립 — 전문 SI(영문)를 우선 잇고, 없으면 사람이 쓴 한글 사유(지연→비정상 순)
    const siTexts = (f.supplementaryInfo ?? []).map((s) => s.content).filter(Boolean)
    const si = siTexts.join(' · ')
      || f.reasons?.departureDelay || f.reasons?.arrivalDelay || f.reasons?.irregularity || ''

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
      // 탑승 인원 — 출발 전엔 onBoard 가 null 이라 예약(성인+소아)으로 대신 보여준다
      pax: f.passengers?.onBoard ?? f.passengers?.reserved ?? null,
      // 램프 연료 — 실적이 있으면 실적, 아니면 계획
      fuel: f.actualFuel?.rampKg ?? f.plannedFuel?.rampKg ?? null,
      si,
      spot: f.arrivalSpot ?? f.departureSpot ?? '', // 도착 주기장 우선 (FUEL 호버 툴팁)
    }
    ;(byReg[f.registration ?? '미지정'] ??= []).push(leg)
  }
  return byReg
}
