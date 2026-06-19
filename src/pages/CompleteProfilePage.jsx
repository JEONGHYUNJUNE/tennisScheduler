import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { completeGoogleProfile, getGoogleProfileDefaults, linkGoogleToExistingProfile } from '../services/authService'

export default function CompleteProfilePage() {
  const { session, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(() => getGoogleProfileDefaults(session?.user))
  const [linkForm, setLinkForm] = useState({ userId: '', password: '' })
  const [mode, setMode] = useState('link')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <div className="center-message">회원 정보를 준비하고 있습니다.</div>
  if (!session) return <Navigate to="/login" replace />
  if (profile) return <Navigate to="/events" replace />
  if (session.user?.app_metadata?.provider !== 'google') return <Navigate to="/events" replace />

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const updateLink = (key) => (event) => setLinkForm({ ...linkForm, [key]: event.target.value })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await completeGoogleProfile(form, session.user)
      await refreshProfile(session)
      navigate('/events', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLinkSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await linkGoogleToExistingProfile({
        userId: linkForm.userId,
        password: linkForm.password,
      }, {
        ...session.user,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
      await refreshProfile()
      navigate('/events', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-copy">
        <p className="eyebrow">ONS TENNIS</p>
        <h1>프로필 완성</h1>
        <p>구글 로그인은 연결됐고, 앱에서 사용할 기본 회원 정보만 한 번 입력하면 됩니다.</p>
        <small>가입 마무리</small>
      </section>
      <section className="auth-panel">
        <div className="mode-tabs">
          <button className={mode === 'link' ? 'active' : ''} type="button" onClick={() => setMode('link')}>기존 계정 연결</button>
          <button className={mode === 'new' ? 'active' : ''} type="button" onClick={() => setMode('new')}>새 계정 가입</button>
        </div>
        {mode === 'link' ? (
          <form onSubmit={handleLinkSubmit}>
            <label>기존 아이디<input required minLength="3" autoComplete="username" value={linkForm.userId} onChange={updateLink('userId')} placeholder="기존 ID" /></label>
            <label>기존 비밀번호<input required type="password" autoComplete="current-password" value={linkForm.password} onChange={updateLink('password')} placeholder="기존 계정 비밀번호" /></label>
            {error && <p className="error">{error}</p>}
            <button className="primary-button" disabled={submitting}>{submitting ? '연결 중...' : '기존 계정에 연결'}</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>아이디<input required minLength="3" autoComplete="username" value={form.userId} onChange={update('userId')} /></label>
            <label>이름<input required value={form.name} onChange={update('name')} /></label>
            <label>테니스 시작일<input required type="date" value={form.tennisStartDate} onChange={update('tennisStartDate')} /></label>
            {error && <p className="error">{error}</p>}
            <button className="primary-button" disabled={submitting}>{submitting ? '저장 중...' : '가입 완료'}</button>
          </form>
        )}
      </section>
    </main>
  )
}
