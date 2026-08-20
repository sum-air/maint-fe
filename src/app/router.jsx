import { Routes, Route, Navigate } from 'react-router'
import Layout from '../shared/components/Layout.jsx'
import HomePage from './HomePage.jsx'
import ComingSoonPage from './ComingSoonPage.jsx'
import LoginPage from '../features/auth/pages/LoginPage.jsx'
import SchedulePage from '../features/schedule/pages/SchedulePage.jsx'
import AttendancePage from '../features/attendance/pages/AttendancePage.jsx'
import OvertimePage from '../features/overtime/pages/OvertimePage.jsx'
import FlightOpsPage from '../features/flight-ops/pages/FlightOpsPage.jsx'
import DutyLogPage from '../features/duty-log/pages/DutyLogPage.jsx'
import { hasSession } from '../shared/lib/auth.js'

// 세션 없으면 로그인 화면으로 — dev 는 .env.local 토큰만으로도 세션으로 인정된다
function RequireAuth({ children }) {
  return hasSession() ? children : <Navigate to="/login" replace />
}

// URL ↔ 페이지 연결표. 새 기능 페이지가 생기면 여기에 <Route> 를 추가한다.
// 예: <Route path="duty-log" element={<DutyLogPage />} />
function Router() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<HomePage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="overtime" element={<OvertimePage />} />
        <Route path="flight-ops" element={<FlightOpsPage />} />
        <Route path="duty-log" element={<DutyLogPage />} />
        {/* 아직 안 만든 기능 페이지는 전부 준비 중 화면으로 */}
        <Route path="*" element={<ComingSoonPage />} />
      </Route>
    </Routes>
  )
}

export default Router
