import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '../services/authService'

export default function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ userId: '', password: '', name: '', tennisStartDate: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const data = await signUp(form)
      if (data.session) {
        navigate('/events')
      } else {
        alert('회원가입이 완료되었습니다. Supabase 이메일 확인 기능을 끈 뒤 로그인해 주세요.')
        navigate('/login')
      }
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
        <h1><br /></h1>
        <p>가입 후 다가오는 일정에 참석 해주세요</p>
        <small>v1.0.0</small>
      </section>
      <section className="auth-panel">
        <div className="mode-tabs">
          <Link to="/login">로그인</Link>
          <span className="active">회원가입</span>
        </div>
        <form onSubmit={handleSubmit}>
          <label>아이디<input required minLength="3" autoComplete="username" placeholder="id" value={form.userId} onChange={update('userId')} /></label>
          <label>비밀번호<input required minLength="6" type="password" autoComplete="new-password" placeholder="6자 이상" value={form.password} onChange={update('password')} /></label>
          <label>이름<input required placeholder="홍길동" value={form.name} onChange={update('name')} /></label>
          <label>테니스 시작일 <small>참고용</small><input required type="date" value={form.tennisStartDate} onChange={update('tennisStartDate')} /></label>
          {error && <p className="error">{error}</p>}
          <button className="primary-button" disabled={submitting}>{submitting ? '가입 중...' : '회원가입'}</button>
        </form>
      </section>
    </main>
  )
}
