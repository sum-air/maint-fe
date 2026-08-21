// 현재 로그인 사용자 — 앱 시작 시 atlas GET /employees/me 로 채워진다 (Layout 의 loadMe).
// 아래 값은 API 응답 전/실패 시의 폴백.
// ※ 프론트의 isAdmin 은 화면 노출 제어용일 뿐, 실제 데이터 보호는 백엔드 권한 검사가 담당해야 한다.
import { getTokenClaims } from './auth.js'

export const CURRENT_USER = {
  // 응답 전/실패 시 중립 표시 — 특정인 하드코딩을 두면 API 실패가 "다른 사람으로 보이는" 사고가 된다
  name: '—',
  team: '섬에어',
  role: '',
  initial: '·',
  email: '',
  employeeNo: getTokenClaims().employeeNo ?? '',
  // 토큰의 features 기준 — 로그인·dev 토큰 모두 access 토큰에 features 클레임이 실린다
  isAdmin: (getTokenClaims().features ?? []).includes('TENANT_ADMIN'),
}

// /employees/me 응답을 CURRENT_USER 에 반영 — 로그인/전역 상태 도입 전의 브리지.
// (모듈 상수를 제자리 갱신하므로, 이후 렌더링부터 실데이터가 읽힌다)
export function applyMe(me) {
  Object.assign(CURRENT_USER, {
    name: me.koreanName,
    team: `섬에어 ${me.departmentName}`,
    role: me.grade?.name ?? CURRENT_USER.role, // 직급 — 일부 직원은 grade 미입력
    initial: me.koreanName?.[0] ?? CURRENT_USER.initial,
    email: me.email,
    employeeNo: me.employeeNo,
  })
}
