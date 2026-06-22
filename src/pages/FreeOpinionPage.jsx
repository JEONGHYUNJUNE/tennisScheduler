import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  addFreeOpinion,
  deleteFreeOpinion,
  getFreeOpinionLikeSummaries,
  getFreeOpinions,
  markFreeOpinionsRead,
  toggleFreeOpinionLike,
  updateFreeOpinion,
} from '../services/freeOpinionService'

const formatOpinionTime = (dateText) => new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(dateText))

export default function FreeOpinionPage() {
  const { profile, isAdmin } = useAuth()
  const [opinions, setOpinions] = useState([])
  const [opinionLikes, setOpinionLikes] = useState({})
  const [message, setMessage] = useState('')
  const [editingOpinionId, setEditingOpinionId] = useState(null)
  const [editMessage, setEditMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savingOpinionId, setSavingOpinionId] = useState(null)
  const [deletingOpinionId, setDeletingOpinionId] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setError('')
      const nextOpinions = await getFreeOpinions()
      setOpinions(nextOpinions)
      setOpinionLikes(await getFreeOpinionLikeSummaries(nextOpinions.map((opinion) => opinion.id), profile.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile.id])

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

  const handleLike = async (opinion) => {
    const currentLike = opinionLikes[opinion.id] ?? { count: 0, likedByMe: false }

    setOpinionLikes((current) => ({
      ...current,
      [opinion.id]: {
        count: Math.max((current[opinion.id]?.count || 0) + (currentLike.likedByMe ? -1 : 1), 0),
        likedByMe: !currentLike.likedByMe,
      },
    }))

    try {
      await toggleFreeOpinionLike(opinion.id, profile.id, currentLike.likedByMe)
    } catch (err) {
      setError(`${err.message} SQL 015번을 실행했는지 확인해 주세요.`)
      await load()
    }
  }

  const startEdit = (opinion) => {
    setEditingOpinionId(opinion.id)
    setEditMessage(opinion.message)
    setError('')
  }

  const cancelEdit = () => {
    setEditingOpinionId(null)
    setEditMessage('')
  }

  const handleUpdate = async (event, opinion) => {
    event.preventDefault()
    const trimmedMessage = editMessage.trim()
    if (!trimmedMessage) return

    setSavingOpinionId(opinion.id)
    setError('')

    try {
      await updateFreeOpinion(opinion.id, trimmedMessage)
      cancelEdit()
      await load()
    } catch (err) {
      setError(`${err.message} SQL 017번을 실행했는지 확인해 주세요.`)
    } finally {
      setSavingOpinionId(null)
    }
  }

  const handleDelete = async (opinion) => {
    if (!window.confirm('이 의견을 삭제할까요?')) return

    setDeletingOpinionId(opinion.id)
    setError('')

    try {
      await deleteFreeOpinion(opinion.id)
      if (editingOpinionId === opinion.id) cancelEdit()
      await load()
    } catch (err) {
      setError(`${err.message} SQL 017번을 실행했는지 확인해 주세요.`)
    } finally {
      setDeletingOpinionId(null)
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
            {opinions.map((opinion) => {
              const canManageOpinion = isAdmin || opinion.member_id === profile.id
              const isEditing = editingOpinionId === opinion.id

              return (
                <article className="opinion-item" key={opinion.id}>
                  <div className="opinion-meta">
                    <strong>{opinion.member_name}</strong>
                    <time>{formatOpinionTime(opinion.created_at)}</time>
                  </div>

                  {isEditing ? (
                    <form className="opinion-edit-form" onSubmit={(event) => handleUpdate(event, opinion)}>
                      <textarea
                        maxLength={300}
                        rows="3"
                        value={editMessage}
                        onChange={(event) => setEditMessage(event.target.value)}
                      />
                      <div className="opinion-edit-actions">
                        <span>{editMessage.length} / 300</span>
                        <button className="secondary-button" type="button" onClick={cancelEdit}>
                          취소
                        </button>
                        <button className="primary-button" disabled={savingOpinionId === opinion.id || !editMessage.trim()}>
                          {savingOpinionId === opinion.id ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p>{opinion.message}</p>
                  )}

                  <div className="opinion-item-actions">
                    <button
                      className={`heart-button opinion-heart ${opinionLikes[opinion.id]?.likedByMe ? 'liked' : ''}`}
                      type="button"
                      onClick={() => handleLike(opinion)}
                      aria-label={opinionLikes[opinion.id]?.likedByMe ? '좋아요 취소' : '좋아요'}
                    >
                      <span>♥</span>
                      <strong>{opinionLikes[opinion.id]?.count || 0}</strong>
                    </button>

                    {canManageOpinion && !isEditing && (
                      <div className="opinion-manage-actions">
                        <button className="secondary-button" type="button" onClick={() => startEdit(opinion)}>
                          수정
                        </button>
                        <button
                          className="danger-button"
                          type="button"
                          onClick={() => handleDelete(opinion)}
                          disabled={deletingOpinionId === opinion.id}
                        >
                          {deletingOpinionId === opinion.id ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
