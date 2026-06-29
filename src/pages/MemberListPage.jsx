import { useEffect, useState } from 'react'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import { getMembers } from '../services/memberService'
import { formatTennisExperience } from '../utils/tennisExperience'

export default function MemberListPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getMembers()
      .then((data) => setMembers(data.filter((member) => member.is_active !== false)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="page-heading main-heading">
        <div>
          <p className="eyebrow">MEMBERS</p>
          <h1>멤버</h1>
          <p className="heading-copy">멤버들의 이름과 구력을 확인합니다.</p>
        </div>
      </div>

      {loading && <LoadingState message="멤버를 불러오는 중입니다." />}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <section className="public-member-list">
          {members.map((member) => (
            <article className="public-member-item" key={member.id}>
              <MemberAvatar name={member.name} imageUrl={member.avatar_url} previewable />
              <div className="public-member-copy">
                <div className="public-member-name">
                  <strong>{member.name || '-'}</strong>
                  {member.club_position && <em>{member.club_position}</em>}
                </div>
                <span>구력 : {formatTennisExperience(member.tennis_start_date)}</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  )
}
