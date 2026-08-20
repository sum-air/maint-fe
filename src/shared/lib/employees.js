import { apiGet } from './api.js'

// 직원 정보 API — ERP 원장을 atlas 가 주기 동기화한 사본을 읽는다 (화면에서 ERP 직접 호출 금지).
// 응답: { id, employeeNo, email, koreanName, departmentId, departmentName, jobType, employmentStatus,
//         grade: { code, name },          // 직급 (사원~대표이사) — 일부 직원은 미입력({})
//         responsibility: { code, name }, // 직책 (팀장·본부장 등) — 대부분 빈 객체
//         duty: { code, name },           // 담당업무 — 대부분 빈 객체
//         directorySyncedAtUtc }

// 내 정보 (토큰의 직원)
export const fetchMe = () => apiGet('/employees/me')

// 직원 목록 — params: { jobType?, status?: 'ACTIVE'|'RESIGNED', name?: 부분일치 }
export const fetchEmployees = (params) => apiGet('/employees', params)
