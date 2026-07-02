import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import NotificationMenu from './NotificationMenu'
import PushNotificationButton from './PushNotificationButton'
import UserMenu from './UserMenu'
import { useAuth } from '../contexts/AuthContext'
import { getUnreadChatCount } from '../services/chatService'
import { getUnreadFreeOpinionCount, markFreeOpinionsRead } from '../services/freeOpinionService'
import { signOut } from '../services/authService'
import onsTennisLogo from '../assets/home-header-logo.png'

function NavIcon({ type }) {
  if (type === 'home') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6.5 10.5V20h11v-9.5" />
        <path d="M9.5 20v-5h5v5" />
      </svg>
    )
  }

  if (type === 'events') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="5" width="14" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M5 10h14" />
        <path d="M8.5 14h2M13.5 14h2M8.5 17h2" />
      </svg>
    )
  }

  if (type === 'members') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M15.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
        <path d="M3.5 19c.6-3.2 2.4-5 5-5s4.4 1.8 5 5" />
        <path d="M13.5 14.5c2.7.2 4.5 1.8 5 4.5" />
      </svg>
    )
  }

  if (type === 'ranking') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5h8v4a4 4 0 0 1-8 0V5Z" />
        <path d="M8 7H5.5a2 2 0 0 0 2 4H8M16 7h2.5a2 2 0 0 1-2 4H16" />
        <path d="M12 13v4M8.5 20h7M10 17h4" />
      </svg>
    )
  }

  if (type === 'tv') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" rx="2.5" />
        <path d="m10 10 5 2-5 2v-4Z" />
      </svg>
    )
  }

  if (type === 'talk') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 18.5v-10A3.5 3.5 0 0 1 8.5 5h7A3.5 3.5 0 0 1 19 8.5v4A3.5 3.5 0 0 1 15.5 16H10l-5 2.5Z" />
        <path d="M8.5 10.5h7M8.5 13h4" />
      </svg>
    )
  }

  if (type === 'diary') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4.5h10.5A1.5 1.5 0 0 1 18 6v12.5A1.5 1.5 0 0 1 16.5 20H6V4.5Z" />
        <path d="M6 4.5A2.5 2.5 0 0 0 6 9.5h12" />
        <path d="M9 13h5M9 16h3" />
      </svg>
    )
  }

  if (type === 'admin') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="6" width="14" height="12" rx="2" />
        <path d="M8 10h3M8 14h3M14 10h2M14 14h2" />
        <path d="M9 6V4h6v2" />
      </svg>
    )
  }

  if (type === 'plus') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 20c.8-4 3.5-6 7.5-6s6.7 2 7.5 6" />
    </svg>
  )
}

export default function Layout() {
  const { profile, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const shellRef = useRef(null)
  const [freeOpinionUnreadCount, setFreeOpinionUnreadCount] = useState(0)
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false)

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

  useEffect(() => {
    if (!profile?.id) return undefined

    let ignore = false

    const loadChatCount = async () => {
      try {
        const count = await getUnreadChatCount(profile.id)
        if (!ignore) setChatUnreadCount(count)
      } catch {
        if (!ignore) setChatUnreadCount(0)
      }
    }

    loadChatCount()
    const timer = setInterval(loadChatCount, 30000)

    return () => {
      ignore = true
      clearInterval(timer)
    }
  }, [profile?.id])

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    const resetScroll = () => {
      window.scrollTo(0, 0)
      if (shellRef.current) {
        shellRef.current.scrollTop = 0
      }
    }

    resetScroll()
    const frameId = window.requestAnimationFrame(resetScroll)
    return () => window.cancelAnimationFrame(frameId)
  }, [location.pathname, location.search])

  useEffect(() => {
    const visualViewport = window.visualViewport
    const root = document.documentElement
    const shell = shellRef.current
    if (!visualViewport || !shell) return undefined

    const isStandalonePwa =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    const isIOSWebKit =
      /iP(ad|hone|od)/.test(window.navigator.userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
    const needsSafariViewportPatch = isIOSWebKit && !isStandalonePwa

    const syncViewportHeight = () => {
      if (!needsSafariViewportPatch) return
      const activeEditable = isEditableElement(document.activeElement)
      const nextHeight = Math.round(activeEditable ? visualViewport.height : (window.innerHeight || visualViewport.height))
      root.style.setProperty('--app-viewport-height', `${nextHeight}px`)
    }

    const isEditableElement = (element) => {
      if (!element) return false
      const tagName = element.tagName?.toLowerCase()
      return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || element.isContentEditable
    }

    const restoreViewportPosition = () => {
      syncViewportHeight()
      window.scrollTo(0, 0)
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      if (needsSafariViewportPatch) {
        shell.style.transform = 'translateZ(0)'
        window.requestAnimationFrame(() => {
          shell.style.transform = ''
        })
      }
    }

    const updateKeyboardState = () => {
      syncViewportHeight()
      const activeEditable = isEditableElement(document.activeElement)
      const heightGap = window.innerHeight - visualViewport.height
      const viewportShift = visualViewport.offsetTop
      const nextKeyboardOpen = activeEditable && (heightGap > 120 || viewportShift > 80)

      setIsKeyboardOpen((current) => {
        if (current && !nextKeyboardOpen) {
          window.setTimeout(restoreViewportPosition, 50)
          window.setTimeout(restoreViewportPosition, 180)
          window.setTimeout(restoreViewportPosition, 360)
          if (needsSafariViewportPatch) {
            window.setTimeout(restoreViewportPosition, 720)
          }
        }

        return nextKeyboardOpen
      })
    }

    if (needsSafariViewportPatch) {
      root.classList.add('ios-safari-browser')
    }

    syncViewportHeight()
    updateKeyboardState()
    visualViewport.addEventListener('resize', updateKeyboardState)
    visualViewport.addEventListener('scroll', updateKeyboardState)
    window.addEventListener('focusin', updateKeyboardState)
    window.addEventListener('focusout', updateKeyboardState)
    window.addEventListener('resize', updateKeyboardState)
    window.addEventListener('orientationchange', updateKeyboardState)
    document.addEventListener('visibilitychange', updateKeyboardState)

    return () => {
      root.classList.remove('ios-safari-browser')
      root.style.removeProperty('--app-viewport-height')
      visualViewport.removeEventListener('resize', updateKeyboardState)
      visualViewport.removeEventListener('scroll', updateKeyboardState)
      window.removeEventListener('focusin', updateKeyboardState)
      window.removeEventListener('focusout', updateKeyboardState)
      window.removeEventListener('resize', updateKeyboardState)
      window.removeEventListener('orientationchange', updateKeyboardState)
      document.removeEventListener('visibilitychange', updateKeyboardState)
    }
  }, [])

  useEffect(() => {
    setIsCreateMenuOpen(false)
  }, [location.pathname, location.search])

  const isChatRoomRoute = location.pathname.startsWith('/chats/')

  return (
    <div className={`app-shell ${isKeyboardOpen ? 'keyboard-open' : ''} ${isChatRoomRoute ? 'chat-route' : ''}`} ref={shellRef}>
      <header className="site-header">
        <div className="header-main">
          <Link className="brand" to="/" aria-label="ONS TENNIS 홈">
            <img src={onsTennisLogo} alt="ONS TENNIS" />
          </Link>
        </div>
        <nav className="header-nav desktop-nav">
          <NavLink to="/" end>홈</NavLink>
          <NavLink to="/events" end>일정</NavLink>
          <NavLink to="/members">멤버</NavLink>
          <NavLink to="/ranking">랭킹</NavLink>
          <NavLink to="/tennis-news">테니스TV</NavLink>
          {isAdmin && <NavLink to="/admin/members">멤버관리</NavLink>}
          <NavLink to="/free-opinions">
            <span>소통</span>
            {freeOpinionUnreadCount > 0 && (
              <span className="nav-new-badge">NEW {freeOpinionUnreadCount}</span>
            )}
          </NavLink>
          <NavLink to="/diary">다이어리</NavLink>
        </nav>
        <div className="header-actions">
          <UserMenu profile={profile} onLogout={handleLogout} />
          <PushNotificationButton profile={profile} />
          <Link className="notification-button chat-header-button" to="/chats" aria-label="채팅">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 18.5v-10A3.5 3.5 0 0 1 8.5 5h7A3.5 3.5 0 0 1 19 8.5v4A3.5 3.5 0 0 1 15.5 16H10l-5 2.5Z" />
              <path d="M8.5 10.5h7M8.5 13h4" />
            </svg>
            {chatUnreadCount > 0 && <span>{chatUnreadCount}</span>}
          </Link>
          <NotificationMenu profile={profile} />
        </div>
        <nav className="mobile-quick-nav" aria-label="빠른 메뉴">
          <NavLink to="/ranking"><NavIcon type="ranking" /><span>랭킹</span></NavLink>
          <NavLink to="/tennis-news"><NavIcon type="tv" /><span>테니스TV</span></NavLink>
          {isAdmin && <NavLink to="/admin/members"><NavIcon type="admin" /><span>관리</span></NavLink>}
          <NavLink to="/free-opinions">
            <NavIcon type="talk" />
            <span>소통</span>
            {freeOpinionUnreadCount > 0 && <em>{freeOpinionUnreadCount}</em>}
          </NavLink>
          <NavLink to="/diary"><NavIcon type="diary" /><span>다이어리</span></NavLink>
        </nav>
      </header>
      <main className="page"><Outlet /></main>
      <footer className="site-footer">
        <span> ONS Tennis</span>
        <span>제작.정현준</span>
      </footer>
      <nav className="mobile-bottom-nav" aria-label="하단 메뉴">
        <NavLink to="/" end><NavIcon type="home" /><span>홈</span></NavLink>
        <NavLink to="/events" end><NavIcon type="events" /><span>일정</span></NavLink>
        <div className={`bottom-create-wrap ${isCreateMenuOpen ? 'open' : ''}`}>
          <div className="bottom-create-actions" aria-hidden={!isCreateMenuOpen}>
            <Link to="/diary" className="bottom-create-action diary">
              <NavIcon type="diary" />
              <span>다이어리</span>
            </Link>
            <Link to="/events/new" className="bottom-create-action event">
              <NavIcon type="events" />
              <span>일정</span>
            </Link>
          </div>
          <button
            className="bottom-nav-add"
            type="button"
            onClick={() => setIsCreateMenuOpen((current) => !current)}
            aria-expanded={isCreateMenuOpen}
            aria-label="새 항목 만들기"
          >
            <NavIcon type="plus" />
          </button>
        </div>
        <NavLink to="/members"><NavIcon type="members" /><span>멤버</span></NavLink>
        <NavLink to="/mypage"><NavIcon type="mypage" /><span>마이페이지</span></NavLink>
      </nav>
    </div>
  )
}
