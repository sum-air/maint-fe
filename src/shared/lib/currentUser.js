// 현재 로그인 사용자 — 앱 시작 시 atlas GET /employees/me 로 채워진다 (Layout 의 loadMe).
// 아래 값은 API 응답 전/실패 시의 폴백. role·isAdmin 은 ERP 응답에 아직 없어 하드코딩 유지.
// ※ 프론트의 isAdmin 은 화면 노출 제어용일 뿐, 실제 데이터 보호는 백엔드 권한 검사가 담당해야 한다.
export const CURRENT_USER = {
  name: '김기홍',
  team: '섬에어 정비기획팀',
  role: '사원',
  initial: '김',
  email: 'kihong.kim@sumair.kr',
  employeeNo: '',
  isAdmin: true,
}

// /employees/me 응답을 CURRENT_USER 에 반영 — 로그인/전역 상태 도입 전의 브리지.
// (모듈 상수를 제자리 갱신하므로, 이후 렌더링부터 실데이터가 읽힌다)
export function applyMe(me) {
  Object.assign(CURRENT_USER, {
    name: me.koreanName,
    team: `섬에어 ${me.departmentName}`,
    initial: me.koreanName?.[0] ?? CURRENT_USER.initial,
    email: me.email,
    employeeNo: me.employeeNo,
  })
}
