import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import { useAuth } from '../contexts/AuthContext'
import { requestChat } from '../services/chatService'
import { getMembers } from '../services/memberService'
import { formatTennisExperience } from '../utils/tennisExperience'

export default function MemberListPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestingId, setRequestingId] = useState('')

  useEffect(() => {
    getMembers()
      .then((data) => setMembers(data.filter((member) => member.is_active !== false && member.id !== profile.id)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [profile.id])

  const handleChatRequest = async (memberId) => {
    setRequestingId(memberId)
    setError('')
    try {
      const room = await requestChat(memberId)
      navigate(`/chats/${room.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setRequestingId('')
    }
  }

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
              <button
                className="member-chat-button"
                type="button"
                onClick={() => handleChatRequest(member.id)}
                disabled={requestingId === member.id}
              >
                {requestingId === member.id ? '요청 중' : '채팅 요청'}
              </button>
            </article>
          ))}
        </section>
      )}
    </>
  )
}
