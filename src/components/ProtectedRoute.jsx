import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../services/authService'
import LoadingState from './LoadingState'

export default function ProtectedRoute({ adminOnly = false, allowIncompleteProfile = false }) {
  const { session, profile, loading, isAdmin } = useAuth()
  const [showMissingProfile, setShowMissingProfile] = useState(false)
  const isGoogleUser = session?.user?.app_metadata?.provider === 'google'

  useEffect(() => {
    if (loading || profile || !session) {
      setShowMissingProfile(false)
      return undefined
    }

    const timer = setTimeout(() => setShowMissingProfile(true), 1200)
    return () => clearTimeout(timer)
  }, [loading, profile, session])

  if (loading && profile && !adminOnly) return <Outlet />
  if (loading) return <LoadingState message="사용자 정보를 확인하고 있습니다." variant="screen" />
  if (!session) return <Navigate to="/login" replace />
  if (!profile && allowIncompleteProfile && isGoogleUser) return <Outlet />
  if (!profile) {
    if (!showMissingProfile) return <LoadingState message="회원 정보를 불러오는 중입니다." variant="screen" />
    if (isGoogleUser) return <Navigate to="/complete-profile" replace />
    return <div className="center-message error">회원 프로필을 찾을 수 없습니다. 관리자에게 문의해 주세요.</div>
  }
  if (profile.is_active === false) {
    return (
      <main className="inactive-page">
        <section className="inactive-card">
          <p className="eyebrow">계정 비활성</p>
          <h1>비활성 회원입니다</h1>
          <p>현재 계정은 서비스 이용이 제한되어 있습니다. 관리자에게 문의해 주세요.</p>
          <button className="primary-button" onClick={signOut}>로그아웃</button>
        </section>
      </main>
    )
  }
  if (adminOnly && !isAdmin) return <Navigate to="/events" replace />
  return <Outlet />
}
