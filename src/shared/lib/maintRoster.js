import { fetchEmployees } from './employees.js'

// 정비본부 인원 목록 — 화면들이 공유하는 실데이터 로스터.
// 스케줄 화면에서 검증한 규칙을 그대로 쓴다: 부서명에 '정비' 포함(정비본부 제외),
// 팀 순서 고정, 팀 안은 직급 서열 → 이름순, 운항정비팀은 관행 순서.

// 팀 표시 순서. 목록에 없는 새 팀은 뒤에 붙는다.
export const TEAM_ORDER = ['정비기획팀', '정비기술팀', '정비품질팀', '정비자재팀', '운항정비팀']

// 팀별 수동 표시 순서 (사번) — 직급·이름으로 도출되지 않는 팀 내 관행 순서.
// 여기 없는 인원은 직급 서열 → 이름순으로 목록 뒤에 붙는다. 인사이동 시 갱신 필요.
const MEMBER_ORDER = {
  운항정비팀: ['200342', '200133', '200454', '200315', '200321', '200272'], // 차면규 문지환 김찬수 오정훈 오명열 김동민
}

const teamRank = (t) => {
  const i = TEAM_ORDER.indexOf(t)
  return i === -1 ? TEAM_ORDER.length : i
}
const gradeRank = (e) => Number(e.grade?.code) || 999
const memberRank = (e) => {
  const i = MEMBER_ORDER[e.departmentName]?.indexOf(e.employeeNo) ?? -1
  return i === -1 ? 9999 : i
}

// 반환: [{ id, team, departmentId, name, role(직급), employeeNo }] — 표시 순서대로.
export async function fetchMaintRoster() {
  const list = await fetchEmployees({ status: 'ACTIVE' })
  return list
    .filter((e) => e.departmentName?.includes('정비') && e.departmentName !== '정비본부')
    .sort((a, b) =>
      teamRank(a.departmentName) - teamRank(b.departmentName) ||
      memberRank(a) - memberRank(b) ||
      gradeRank(a) - gradeRank(b) ||
      a.koreanName.localeCompare(b.koreanName, 'ko'))
    .map((e) => ({
      id: e.id,
      team: e.departmentName,
      departmentId: e.departmentId,
      name: e.koreanName,
      role: e.grade?.name, // 직급 — 미입력 직원은 표시 생략
      employeeNo: e.employeeNo,
    }))
}
