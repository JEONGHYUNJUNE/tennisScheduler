import { useEffect, useState } from 'react'
import { getMembers, updateMember } from '../services/memberService'

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

export default function MembersPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState('')

  const load = () => getMembers().then(setMembers).catch((err) => setError(err.message)).finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const handleUpdate = async (memberId, updates) => {
    setUpdatingId(memberId)
    setError('')
    try {
      const updated = await updateMember(memberId, updates)
      setMembers((current) => current.map((member) => (member.id === memberId ? updated : member)))
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <>
      <div className="page-heading main-heading">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h1>멤버관리</h1>
          <p className="heading-copy">회원 역할과 활성 상태를 관리합니다.</p>
        </div>
      </div>

      {loading && <p>멤버를 불러오는 중입니다.</p>}
      {error && <p className="error">{error}</p>}

      {!loading && (
        <section className="member-card">
          <div className="member-table">
            <div className="member-row member-row-head">
              <span>이름</span>
              <span>아이디</span>
              <span>테니스 시작일</span>
              <span>구력</span>
              <span>권한</span>
              <span>상태</span>
            </div>
            {members.map((member) => (
              <div className="member-row" key={member.id}>
                <strong>{member.name || '-'}</strong>
                <span>{member.user_id}</span>
                <span>{member.tennis_start_date || '-'}</span>
                <span>{formatTennisExperience(member.tennis_start_date)}</span>
                <select
                  value={member.role || 'member'}
                  disabled={updatingId === member.id}
                  onChange={(event) => handleUpdate(member.id, { role: event.target.value })}
                >
                  <option value="member">member</option>
                  <option value="admin">admin</option>
                </select>
                <button
                  className={member.is_active === false ? 'secondary-button' : 'primary-button'}
                  disabled={updatingId === member.id}
                  onClick={() => handleUpdate(member.id, { is_active: member.is_active === false })}
                >
                  {member.is_active === false ? '비활성' : '활성'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
