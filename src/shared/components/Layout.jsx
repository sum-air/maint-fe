import { NavLink, Outlet } from 'react-router'

// 모든 화면에 공통으로 깔리는 틀: 상단바 + 메뉴.
// 새 기능이 생기면 MENUS 에 항목을 추가한다. 예: { to: '/duty-log', label: '업무일지' }
const MENUS = [
  { to: '/', label: '홈' },
]

function Layout() {
  return (
    <div className="layout">
      <header className="layout__header">
        <span className="layout__logo">maint</span>
        <nav className="layout__nav">
          {MENUS.map((menu) => (
            <NavLink key={menu.to} to={menu.to} end>
              {menu.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="layout__main">
        <Outlet /> {/* URL 에 해당하는 페이지가 이 자리에 렌더링된다 */}
      </main>
    </div>
  )
}

export default Layout
