import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import NotificationMenu from './NotificationMenu'
import UserMenu from './UserMenu'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../services/authService'

export default function Layout() {
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-main">
          <Link className="brand" to="/">ONS TENNIS</Link>
          <div className="header-actions">
            <UserMenu profile={profile} />
            <NotificationMenu profile={profile} />
            <button className="text-button" onClick={handleLogout}>로그아웃</button>
          </div>
        </div>
        <nav className="header-nav">
          <NavLink to="/" end>홈</NavLink>
          <NavLink to="/events" end>일정</NavLink>
          <NavLink to="/members">멤버</NavLink>
          <NavLink to="/ranking">랭킹</NavLink>
          {isAdmin && <NavLink to="/admin/members">멤버관리</NavLink>}
          <NavLink to="/free-opinions">자유의견</NavLink>
        </nav>
      </header>
      <main className="page"><Outlet /></main>
    </div>
  )
}
