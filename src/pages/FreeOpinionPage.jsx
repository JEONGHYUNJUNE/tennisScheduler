import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import { useAuth } from '../contexts/AuthContext'
import {
  addFreeOpinion,
  addFreeOpinionComment,
  deleteFreeOpinionComment,
  deleteFreeOpinion,
  updateFreeOpinionComment,
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

const visibleCommentCount = 3

export default function FreeOpinionPage() {
  const { profile, isAdmin } = useAuth()
  const [searchParams] = useSearchParams()
  const linkedScrollKeyRef = useRef('')
  const [opinions, setOpinions] = useState([])
  const [opinionLikes, setOpinionLikes] = useState({})
  const [message, setMessage] = useState('')
  const [editingOpinionId, setEditingOpinionId] = useState(null)
  const [editMessage, setEditMessage] = useState('')
  const [commentInputs, setCommentInputs] = useState({})
  const [expandedCommentOpinionIds, setExpandedCommentOpinionIds] = useState({})
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editCommentMessage, setEditCommentMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [savingOpinionId, setSavingOpinionId] = useState(null)
  const [deletingOpinionId, setDeletingOpinionId] = useState(null)
  const [submittingCommentOpinionId, setSubmittingCommentOpinionId] = useState(null)
  const [savingCommentId, setSavingCommentId] = useState(null)
  const [deletingCommentId, setDeletingCommentId] = useState(null)
  const [error, setError] = useState('')
  const linkedOpinionId = searchParams.get('opinion')
  const linkedCommentId = searchParams.get('comment')

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

  useEffect(() => {
    if (!linkedOpinionId) return
    setExpandedCommentOpinionIds((current) => ({ ...current, [linkedOpinionId]: true }))
  }, [linkedOpinionId])

  useEffect(() => {
    if (loading || !linkedOpinionId) return undefined

    const scrollKey = `${linkedOpinionId}:${linkedCommentId || ''}:${opinions.length}`
    if (linkedScrollKeyRef.current === scrollKey) return undefined

    let retryTimer = null
    let attempts = 0

    const scrollToLinkedTarget = () => {
      const commentTarget = linkedCommentId ? document.getElementById(`opinion-comment-${linkedCommentId}`) : null
      const opinionTarget = document.getElementById(`opinion-${linkedOpinionId}`)
      const target = commentTarget || opinionTarget

      if (target) {
        linkedScrollKeyRef.current = scrollKey
        target.scrollIntoView({ behavior: 'smooth', block: commentTarget ? 'center' : 'start' })
        return
      }

      attempts += 1
      if (attempts < 12) {
        retryTimer = window.setTimeout(scrollToLinkedTarget, 120)
      }
    }

    retryTimer = window.setTimeout(scrollToLinkedTarget, 120)

    return () => {
      if (retryTimer) window.clearTimeout(retryTimer)
    }
  }, [expandedCommentOpinionIds, linkedCommentId, linkedOpinionId, loading, opinions])

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

  const handleCommentInputChange = (opinionId, value) => {
    setCommentInputs((current) => ({ ...current, [opinionId]: value }))
  }

  const handleCommentSubmit = async (event, opinion) => {
    event.preventDefault()
    const trimmedMessage = (commentInputs[opinion.id] || '').trim()
    if (!trimmedMessage) return

    setSubmittingCommentOpinionId(opinion.id)
    setError('')

    try {
      await addFreeOpinionComment(opinion.id, profile.id, trimmedMessage)
      setCommentInputs((current) => ({ ...current, [opinion.id]: '' }))
      setExpandedCommentOpinionIds((current) => ({ ...current, [opinion.id]: true }))
      await load()
    } catch (err) {
      setError(`${err.message} SQL 021번을 실행했는지 확인해 주세요.`)
    } finally {
      setSubmittingCommentOpinionId(null)
    }
  }

  const startCommentEdit = (comment) => {
    setEditingCommentId(comment.id)
    setEditCommentMessage(comment.message)
    setError('')
  }

  const cancelCommentEdit = () => {
    setEditingCommentId(null)
    setEditCommentMessage('')
  }

  const handleCommentUpdate = async (event, comment) => {
    event.preventDefault()
    const trimmedMessage = editCommentMessage.trim()
    if (!trimmedMessage) return

    setSavingCommentId(comment.id)
    setError('')

    try {
      await updateFreeOpinionComment(comment.id, trimmedMessage)
      cancelCommentEdit()
      await load()
    } catch (err) {
      setError(`${err.message} SQL 021번을 실행했는지 확인해 주세요.`)
    } finally {
      setSavingCommentId(null)
    }
  }

  const handleCommentDelete = async (comment) => {
    if (!window.confirm('이 댓글을 삭제할까요?')) return

    setDeletingCommentId(comment.id)
    setError('')

    try {
      await deleteFreeOpinionComment(comment.id)
      if (editingCommentId === comment.id) cancelCommentEdit()
      await load()
    } catch (err) {
      setError(`${err.message} SQL 021번을 실행했는지 확인해 주세요.`)
    } finally {
      setDeletingCommentId(null)
    }
  }

  const toggleComments = (opinionId) => {
    setExpandedCommentOpinionIds((current) => ({ ...current, [opinionId]: !current[opinionId] }))
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

        {loading && <LoadingState message="의견을 불러오는 중입니다." />}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <div className="opinion-list">
            {opinions.length === 0 && (
              <EmptyState
                title="아직 소통 글이 없어요."
                description="첫 의견을 남겨서 오늘의 이야기를 열어보세요."
              />
            )}
            {opinions.map((opinion) => {
              const canManageOpinion = isAdmin || opinion.member_id === profile.id
              const isEditing = editingOpinionId === opinion.id
              const comments = opinion.comments || []
              const isCommentsExpanded = Boolean(expandedCommentOpinionIds[opinion.id])
              const visibleComments = isCommentsExpanded ? comments : comments.slice(-visibleCommentCount)
              const hiddenCommentCount = Math.max(comments.length - visibleComments.length, 0)

              return (
                <article
                  className={`opinion-item ${linkedOpinionId === opinion.id ? 'linked-opinion' : ''}`}
                  id={`opinion-${opinion.id}`}
                  key={opinion.id}
                >
                  <div className="opinion-meta">
                    <div className="opinion-author">
                      <MemberAvatar name={opinion.member_name} imageUrl={opinion.member_avatar_url} previewable />
                      <strong>{opinion.member_name}</strong>
                    </div>
                    <div className="opinion-meta-side">
                      <time>{formatOpinionTime(opinion.created_at)}</time>
                      {canManageOpinion && !isEditing && (
                        <div className="opinion-manage-actions">
                          <button
                            className="opinion-icon-button edit"
                            type="button"
                            onClick={() => startEdit(opinion)}
                            aria-label="의견 수정"
                            title="수정"
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24">
                              <path d="M13.8 5.2 18.8 10.2" />
                              <path d="M4.5 19.5 9.2 18.4 19.4 8.2a2.1 2.1 0 0 0 0-3L18.8 4.6a2.1 2.1 0 0 0-3 0L5.6 14.8 4.5 19.5Z" />
                              <path d="M4 20h16" />
                            </svg>
                          </button>
                          <button
                            className="opinion-icon-button delete"
                            type="button"
                            onClick={() => handleDelete(opinion)}
                            disabled={deletingOpinionId === opinion.id}
                            aria-label="의견 삭제"
                            title="삭제"
                          >
                            <span aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>
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

                  </div>

                  <section className="opinion-comments">
                    <div className="opinion-comments-head">
                      <strong>댓글 {comments.length}</strong>
                      {comments.length > visibleCommentCount && (
                        <button type="button" onClick={() => toggleComments(opinion.id)}>
                          {isCommentsExpanded ? '접기' : `댓글 ${hiddenCommentCount}개 더보기`}
                        </button>
                      )}
                    </div>

                    {comments.length > 0 && (
                      <div className="opinion-comment-list">
                        {visibleComments.map((comment) => {
                          const canManageComment = isAdmin || comment.member_id === profile.id
                          const isCommentEditing = editingCommentId === comment.id

                          return (
                            <article
                              className={`opinion-comment ${canManageComment && !isCommentEditing ? 'manageable' : ''} ${linkedCommentId === comment.id ? 'linked-opinion-comment' : ''}`}
                              id={`opinion-comment-${comment.id}`}
                              key={comment.id}
                            >
                              <div className="opinion-comment-meta">
                                <div className="opinion-comment-author">
                                  <MemberAvatar name={comment.member_name} imageUrl={comment.member_avatar_url} size="sm" previewable />
                                  <strong>{comment.member_name}</strong>
                                </div>
                                <time>{formatOpinionTime(comment.created_at)}</time>
                              </div>

                              {isCommentEditing ? (
                                <form className="opinion-comment-edit-form" onSubmit={(event) => handleCommentUpdate(event, comment)}>
                                  <textarea
                                    maxLength={300}
                                    rows="2"
                                    value={editCommentMessage}
                                    onChange={(event) => setEditCommentMessage(event.target.value)}
                                  />
                                  <div className="opinion-edit-actions">
                                    <span>{editCommentMessage.length} / 300</span>
                                    <button className="secondary-button" type="button" onClick={cancelCommentEdit}>
                                      취소
                                    </button>
                                    <button className="primary-button" disabled={savingCommentId === comment.id || !editCommentMessage.trim()}>
                                      {savingCommentId === comment.id ? '저장 중...' : '저장'}
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <p>{comment.message}</p>
                              )}

                              {canManageComment && !isCommentEditing && (
                                <div className="opinion-comment-actions">
                                  <button
                                    className="opinion-icon-button edit"
                                    type="button"
                                    onClick={() => startCommentEdit(comment)}
                                    aria-label="댓글 수정"
                                    title="수정"
                                  >
                                    <svg aria-hidden="true" viewBox="0 0 24 24">
                                      <path d="M13.8 5.2 18.8 10.2" />
                                      <path d="M4.5 19.5 9.2 18.4 19.4 8.2a2.1 2.1 0 0 0 0-3L18.8 4.6a2.1 2.1 0 0 0-3 0L5.6 14.8 4.5 19.5Z" />
                                      <path d="M4 20h16" />
                                    </svg>
                                  </button>
                                  <button
                                    className="opinion-icon-button delete"
                                    type="button"
                                    onClick={() => handleCommentDelete(comment)}
                                    disabled={deletingCommentId === comment.id}
                                    aria-label="댓글 삭제"
                                    title="삭제"
                                  >
                                    <span aria-hidden="true" />
                                  </button>
                                </div>
                              )}
                            </article>
                          )
                        })}
                      </div>
                    )}

                    <form className="opinion-comment-form" onSubmit={(event) => handleCommentSubmit(event, opinion)}>
                      <input
                        maxLength={300}
                        placeholder="댓글을 입력하세요."
                        value={commentInputs[opinion.id] || ''}
                        onChange={(event) => handleCommentInputChange(opinion.id, event.target.value)}
                      />
                      <button
                        className="secondary-button"
                        disabled={submittingCommentOpinionId === opinion.id || !(commentInputs[opinion.id] || '').trim()}
                      >
                        {submittingCommentOpinionId === opinion.id ? '등록 중...' : '저장'}
                      </button>
                    </form>
                  </section>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
