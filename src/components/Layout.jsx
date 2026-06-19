import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import NotificationMenu from './NotificationMenu'
import UserMenu from './UserMenu'
import { useAuth } from '../contexts/AuthContext'
import { getUnreadFreeOpinionCount, markFreeOpinionsRead } from '../services/freeOpinionService'
import { signOut } from '../services/authService'

export default function Layout() {
  const { profile, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [freeOpinionUnreadCount, setFreeOpinionUnreadCount] = useState(0)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  useEffect(() => {
    if (!profile?.id) return undefined

    let ignore = false

    const loadUnreadCount = async () => {
      try {
        const count = await getUnreadFreeOpinionCount(profile.id)
        if (!ignore) setFreeOpinionUnreadCount(count)
      } catch {
        if (!ignore) setFreeOpinionUnreadCount(0)
      }
    }

    if (location.pathname === '/free-opinions') {
      markFreeOpinionsRead(profile.id)
        .then(() => {
          if (!ignore) setFreeOpinionUnreadCount(0)
        })
        .catch(() => {
          if (!ignore) setFreeOpinionUnreadCount(0)
        })
    } else {
      loadUnreadCount()
    }

    const timer = setInterval(loadUnreadCount, 30000)

    return () => {
      ignore = true
      clearInterval(timer)
    }
  }, [location.pathname, profile?.id])

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-main">
          <Link className="brand" to="/">ONS TENNIS</Link>
        </div>
        <nav className="header-nav">
          <NavLink to="/" end>홈</NavLink>
          <NavLink to="/events" end>일정</NavLink>
          <NavLink to="/members">멤버</NavLink>
          <NavLink to="/ranking">랭킹</NavLink>
          {isAdmin && <NavLink to="/admin/members">멤버관리</NavLink>}
          <NavLink to="/free-opinions">
            <span>소통</span>
            {freeOpinionUnreadCount > 0 && (
              <span className="nav-new-badge">NEW {freeOpinionUnreadCount}</span>
            )}
          </NavLink>
        </nav>
        <div className="header-actions">
          <UserMenu profile={profile} onLogout={handleLogout} />
          <NotificationMenu profile={profile} />
        </div>
      </header>
      <main className="page"><Outlet /></main>
      <footer className="site-footer">
        <span> ONS Tennis</span>
        <span>제작.정현준</span>
      </footer>
    </div>
  )
}
