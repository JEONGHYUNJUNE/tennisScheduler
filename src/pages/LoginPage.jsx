import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import GoogleButton from '../components/GoogleButton'
import { useAuth } from '../contexts/AuthContext'
import { signIn, signInWithGoogle } from '../services/authService'

export default function LoginPage() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ userId: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    const isGoogleUser = session.user?.app_metadata?.provider === 'google'
    return <Navigate to={profile || !isGoogleUser ? '/events' : '/complete-profile'} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await signIn(form.userId, form.password)
      navigate('/events')
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? '아이디 또는 비밀번호가 올바르지 않습니다.' : err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setSubmitting(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-copy">
        <p className="eyebrow">ONS TENNIS</p>
        <h1>ONS Tennis</h1>
        <p>코트 일정 및 참석 관리시스템 입니다.</p>
        <small>v1.0.0</small>
      </section>
      <section className="auth-panel">
        <div className="mode-tabs">
          <span className="active">로그인</span>
          <Link to="/signup">회원가입</Link>
        </div>
        <form onSubmit={handleSubmit}>
          <label>아이디<input required autoComplete="username" placeholder="id" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} /></label>
          <label>비밀번호<input required type="password" autoComplete="current-password" placeholder="******" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          {error && <p className="error">{error}</p>}
          <button className="primary-button" disabled={submitting}>{submitting ? '로그인 중...' : '로그인'}</button>
        </form>
        <GoogleButton disabled={submitting} onClick={handleGoogleLogin}>Google로 계속하기</GoogleButton>
      </section>
    </main>
  )
}
