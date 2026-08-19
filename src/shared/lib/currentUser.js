// 현재 로그인 사용자 — 로그인 기능 연동 전 임시 값.
// 로그인이 생기면 서버가 내려주는 사용자 정보로 교체한다.
// isAdmin: 출퇴근 관리 등 관리자 화면 접근 권한 (현재 김기홍·본부장 2명 예정)
// ※ 프론트의 isAdmin 은 화면 노출 제어용일 뿐, 실제 데이터 보호는 백엔드 권한 검사가 담당해야 한다.
export const CURRENT_USER = {
  name: '김기홍',
  team: '섬에어 정비기획팀',
  role: '사원',
  initial: '김',
  email: 'kihong.kim@sumair.kr',
  isAdmin: true,
}
