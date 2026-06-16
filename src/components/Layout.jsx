import { Link, Outlet, useNavigate } from 'react-router-dom'
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
        <Link className="brand" to="/events">ONS TENNIS</Link>
        <nav>
          <UserMenu profile={profile} />
          {isAdmin && <Link to="/admin/members">멤버관리</Link>}
          <Link to="/events/new">일정등록</Link>
          <NotificationMenu profile={profile} />
          <button className="text-button" onClick={handleLogout}>로그아웃</button>
        </nav>
      </header>
      <main className="page"><Outlet /></main>
    </div>
  )
}
