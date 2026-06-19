import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { addFreeOpinion, getFreeOpinions, markFreeOpinionsRead } from '../services/freeOpinionService'

const formatOpinionTime = (dateText) => new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(dateText))

export default function FreeOpinionPage() {
  const { profile } = useAuth()
  const [opinions, setOpinions] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => getFreeOpinions()
    .then(setOpinions)
    .catch((err) => setError(err.message))
    .finally(() => setLoading(false)), [])

  useEffect(() => {
    load()
    if (profile?.id) {
      markFreeOpinionsRead(profile.id).catch(() => {})
    }
  }, [load, profile?.id])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return

    setSubmitting(true)
    setError('')

    try {
      await addFreeOpinion(profile.id, trimmedMessage)
      setMessage('')
      await load()
      await markFreeOpinionsRead(profile.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="page-heading main-heading">
        <div>
          <p className="eyebrow">FREE TALK</p>
          <h1>자유의견</h1>
          <p className="heading-copy">가볍게 남기는 한 줄 의견입니다. 최신 20개만 보관됩니다.</p>
        </div>
      </div>

      <section className="opinion-shell">
        <form className="opinion-form" onSubmit={handleSubmit}>
          <label>
            의견 남기기
            <textarea
              maxLength={300}
              placeholder="운영 아이디어, 코트 추천, 모임 후기, 하고 싶은 말 등을 편하게 남겨주세요."
              rows="3"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>
          <div className="opinion-form-actions">
            <span>{message.length} / 300</span>
            <button className="primary-button" disabled={submitting || !message.trim()}>
              {submitting ? '등록 중...' : '올리기'}
            </button>
          </div>
        </form>

        {loading && <p className="notification-empty">의견을 불러오는 중입니다.</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <div className="opinion-list">
            {opinions.length === 0 && <p className="notification-empty">아직 남겨진 의견이 없습니다.</p>}
            {opinions.map((opinion) => (
              <article className="opinion-item" key={opinion.id}>
                <div>
                  <strong>{opinion.member_name}</strong>
                  <time>{formatOpinionTime(opinion.created_at)}</time>
                </div>
                <p>{opinion.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
