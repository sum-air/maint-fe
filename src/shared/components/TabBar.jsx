import { NavLink } from 'react-router'

// 모바일 하단 탭바 — 767px 이하에서만 표시(mobile.css). 시안 확정 5탭.
const TABS = [
  { to: '/', label: '홈', icon: <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /> },
  { to: '/duty-log', label: '업무일지', icon: <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h4" /> },
  { to: '/schedule', label: '스케줄', icon: <path d="M8 2v4M16 2v4M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 10h18" /> },
  { to: '/overtime', label: '시간외', icon: <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6" /></> },
  { to: '/attendance', label: '근무', icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /><circle cx="9.5" cy="7" r="4" /></> },
]

function TabBar() {
  return (
    <nav className="mtab">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className="mtab__item">
          <svg viewBox="0 0 24 24">{t.icon}</svg>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default TabBar
