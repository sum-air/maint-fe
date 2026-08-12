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
