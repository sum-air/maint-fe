import { apiGet } from './api.js'

// 직원 정보 API — ERP 원장을 atlas 가 주기 동기화한 사본을 읽는다 (화면에서 ERP 직접 호출 금지).
// 응답: { id, employeeNo, email, koreanName, departmentId, departmentName, jobType, employmentStatus, directorySyncedAtUtc }

// 내 정보 (토큰의 직원)
export const fetchMe = () => apiGet('/employees/me')

// 직원 목록 — params: { jobType?, status?: 'ACTIVE'|'RESIGNED', name?: 부분일치 }
export const fetchEmployees = (params) => apiGet('/employees', params)
