import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../services/authService'

function formatTennisExperience(startDate) {
  if (!startDate) return '-'

  const start = new Date(`${startDate}T00:00:00`)
  const today = new Date()
  if (Number.isNaN(start.getTime()) || start > today) return '-'

  let months = (today.getFullYear() - start.getFullYear()) * 12
  months += today.getMonth() - start.getMonth()
  if (today.getDate() < start.getDate()) months -= 1
  months = Math.max(months, 0)

  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (years === 0) return `${remainingMonths}개월`
  if (remainingMonths === 0) return `${years}년`
  return `${years}년 ${remainingMonths}개월`
}

export default function MyPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <section className="my-page-shell">
      <div className="my-page-card">
        <div className="my-page-profile">
          <div className="my-page-avatar" aria-hidden="true">{profile?.name?.slice(0, 1) || '?'}</div>
          <div>
            <p className="eyebrow">MY PAGE</p>
            <h1>{profile?.name || '회원'}님</h1>
            <span>{profile?.user_id || '-'}</span>
          </div>
        </div>

        <dl className="profile-list my-page-list">
          <div><dt>이름</dt><dd>{profile?.name || '-'}</dd></div>
          <div><dt>아이디</dt><dd>{profile?.user_id || '-'}</dd></div>
          <div><dt>권한</dt><dd>{profile?.role || 'member'}</dd></div>
          <div><dt>테니스 시작일</dt><dd>{profile?.tennis_start_date || '-'}</dd></div>
          <div><dt>구력</dt><dd>{formatTennisExperience(profile?.tennis_start_date)}</dd></div>
        </dl>

        <button className="danger-button my-page-logout" type="button" onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </section>
  )
}
