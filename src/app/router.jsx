import { Routes, Route } from 'react-router'
import Layout from '../shared/components/Layout.jsx'
import HomePage from './HomePage.jsx'
import ComingSoonPage from './ComingSoonPage.jsx'
import SchedulePage from '../features/schedule/pages/SchedulePage.jsx'

// URL ↔ 페이지 연결표. 새 기능 페이지가 생기면 여기에 <Route> 를 추가한다.
// 예: <Route path="duty-log" element={<DutyLogPage />} />
function Router() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="schedule" element={<SchedulePage />} />
        {/* 아직 안 만든 기능 페이지는 전부 준비 중 화면으로 */}
        <Route path="*" element={<ComingSoonPage />} />
      </Route>
    </Routes>
  )
}

export default Router
