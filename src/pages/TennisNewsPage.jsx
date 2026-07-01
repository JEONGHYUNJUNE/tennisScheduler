import { useEffect, useState } from 'react'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import { useAuth } from '../contexts/AuthContext'
import {
  addRecommendedVideoComment,
  defaultRecommendedVideo,
  deleteRecommendedVideoComment,
  getRecommendedVideo,
  getRecommendedVideoComments,
  saveRecommendedVideo,
  updateRecommendedVideoComment,
} from '../services/tennisVideoService'

const formatCommentTime = (dateText) => new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(dateText))

function getYoutubeEmbedUrl(url) {
  try {
    const parsedUrl = new URL(url)
    const getEmbedUrl = (videoId) => (videoId ? `https://www.youtube.com/embed/${videoId}` : '')

    if (parsedUrl.hostname.includes('youtu.be')) {
      return getEmbedUrl(parsedUrl.pathname.split('/').filter(Boolean)[0])
    }

    if (parsedUrl.pathname.startsWith('/shorts/')) {
      return getEmbedUrl(parsedUrl.pathname.split('/').filter(Boolean)[1])
    }

    if (parsedUrl.pathname.startsWith('/embed/')) {
      return getEmbedUrl(parsedUrl.pathname.split('/').filter(Boolean)[1])
    }

    return getEmbedUrl(parsedUrl.searchParams.get('v'))
  } catch {
    return ''
  }
}

export default function TennisNewsPage() {
  const { profile, isAdmin } = useAuth()
  const [recommendedVideo, setRecommendedVideo] = useState(defaultRecommendedVideo)
  const [videoForm, setVideoForm] = useState(defaultRecommendedVideo)
  const [comments, setComments] = useState([])
  const [commentMessage, setCommentMessage] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editCommentMessage, setEditCommentMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [savingCommentId, setSavingCommentId] = useState(null)
  const [deletingCommentId, setDeletingCommentId] = useState(null)
  const [message, setMessage] = useState('')

  const embedUrl = getYoutubeEmbedUrl(recommendedVideo.url)

  useEffect(() => {
    Promise.all([getRecommendedVideo(), getRecommendedVideoComments()])
      .then(([video, nextComments]) => {
        setRecommendedVideo(video)
        setVideoForm(video)
        setComments(nextComments)
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false))
  }, [])

  const loadComments = async () => {
    setComments(await getRecommendedVideoComments())
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const shouldClearComments = videoForm.url.trim() !== recommendedVideo.url
      const savedVideo = await saveRecommendedVideo(videoForm)
      setRecommendedVideo(savedVideo)
      setVideoForm(savedVideo)
      if (shouldClearComments) setComments([])
      setMessage('추천 영상이 저장됐습니다.')
    } catch (error) {
      setMessage(`${error.message} SQL 014번을 실행했는지 확인해 주세요.`)
    } finally {
      setSaving(false)
    }
  }

  const handleCommentSubmit = async (event) => {
    event.preventDefault()
    const trimmedMessage = commentMessage.trim()
    if (!trimmedMessage) return

    setSubmittingComment(true)
    setMessage('')

    try {
      await addRecommendedVideoComment(profile.id, trimmedMessage)
      setCommentMessage('')
      await loadComments()
    } catch (error) {
      setMessage(`${error.message} SQL 030번을 실행했는지 확인해 주세요.`)
    } finally {
      setSubmittingComment(false)
    }
  }

  const startCommentEdit = (comment) => {
    setEditingCommentId(comment.id)
    setEditCommentMessage(comment.message)
    setMessage('')
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
    setMessage('')

    try {
      await updateRecommendedVideoComment(comment.id, trimmedMessage)
      cancelCommentEdit()
      await loadComments()
    } catch (error) {
      setMessage(`${error.message} SQL 030번을 실행했는지 확인해 주세요.`)
    } finally {
      setSavingCommentId(null)
    }
  }

  const handleCommentDelete = async (comment) => {
    if (!window.confirm('이 댓글을 삭제할까요?')) return

    setDeletingCommentId(comment.id)
    setMessage('')

    try {
      await deleteRecommendedVideoComment(comment.id)
      if (editingCommentId === comment.id) cancelCommentEdit()
      await loadComments()
    } catch (error) {
      setMessage(`${error.message} SQL 030번을 실행했는지 확인해 주세요.`)
    } finally {
      setDeletingCommentId(null)
    }
  }

  return (
    <>
      <div className="page-heading main-heading">
        <div>
          <p className="eyebrow">Tennis TV</p>
          <h1>테니스 TV</h1>
          <p className="heading-copy">최근 추천하는 테니스 영상을 시청하는 공간입니다.</p>
        </div>
      </div>

      <section className="tennis-news-shell">
        {loading && <LoadingState message="추천 영상을 불러오는 중입니다." variant="inline" />}
        {message && <p className="notice">{message}</p>}

        <article className="video-pick-card">
          <div className="video-pick-copy">
            <p className="eyebrow">YOUTUBE</p>
            <h2>{recommendedVideo.title}</h2>
            <p>{recommendedVideo.description}</p>
          </div>

          {embedUrl ? (
            <div className="youtube-frame">
              <iframe
                src={embedUrl}
                title={recommendedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="empty-state">YouTube URL을 확인해 주세요.</div>
          )}
        </article>

        <section className="video-comments-card">
          <div className="opinion-comments-head">
            <strong>댓글 {comments.length}</strong>
          </div>

          {comments.length > 0 ? (
            <div className="opinion-comment-list">
              {comments.map((comment) => {
                const canManageComment = isAdmin || comment.member_id === profile.id
                const isCommentEditing = editingCommentId === comment.id

                return (
                  <article
                    className={`opinion-comment ${canManageComment && !isCommentEditing ? 'manageable' : ''}`}
                    key={comment.id}
                  >
                    <div className="opinion-comment-meta">
                      <div className="opinion-comment-author">
                        <MemberAvatar name={comment.member_name} imageUrl={comment.member_avatar_url} size="sm" previewable />
                        <strong>{comment.member_name}</strong>
                      </div>
                      <time>{formatCommentTime(comment.created_at)}</time>
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
          ) : (
            <p className="video-comments-empty">아직 댓글이 없어요. 영상에 대한 생각을 가볍게 남겨보세요.</p>
          )}

          <form className="opinion-comment-form video-comment-form" onSubmit={handleCommentSubmit}>
            <input
              maxLength={300}
              placeholder="댓글을 입력하세요."
              value={commentMessage}
              onChange={(event) => setCommentMessage(event.target.value)}
            />
            <button className="secondary-button" disabled={submittingComment || !commentMessage.trim()}>
              {submittingComment ? '등록 중...' : '저장'}
            </button>
          </form>
        </section>

        {isAdmin && (
          <form className="video-admin-form" onSubmit={handleSubmit}>
            <div>
              <p className="eyebrow">ADMIN</p>
              <h2>추천 영상 변경</h2>
            </div>
            <label>
              제목
              <input
                value={videoForm.title}
                onChange={(event) => setVideoForm({ ...videoForm, title: event.target.value })}
                placeholder="추천 테니스 영상"
              />
            </label>
            <label>
              YouTube URL
              <input
                required
                value={videoForm.url}
                onChange={(event) => setVideoForm({ ...videoForm, url: event.target.value })}
                placeholder="https://youtu.be/..."
              />
            </label>
            <label>
              설명
              <textarea
                rows="2"
                value={videoForm.description}
                onChange={(event) => setVideoForm({ ...videoForm, description: event.target.value })}
                placeholder="영상 설명을 입력해 주세요."
              />
            </label>
            <button className="primary-button" disabled={saving || !videoForm.url.trim()}>
              {saving ? '저장 중...' : '추천 영상 저장'}
            </button>
          </form>
        )}

        <div className="news-link-grid">
          <a href="https://www.flashscore.co.kr/tennis/" target="_blank" rel="noreferrer">
            <strong>오늘의 경기/결과</strong>
            <span>전세계 ATP/WTA 주요 경기 확인</span>
          </a>
          <a href="https://www.youtube.com/results?search_query=%EC%9D%B4%ED%98%95%ED%83%9D+%EB%A8%B8%EB%93%9C%EB%A6%ACTV" target="_blank" rel="noreferrer">
            <strong>이형택 머드리TV</strong>
            <span>국내 테니스 콘텐츠와 레슨 영상 보기</span>
          </a>
          <a href="https://www.youtube.com/@TennisTV" target="_blank" rel="noreferrer">
            <strong>Tennis TV</strong>
            <span>해외 유명 테니스 TV 채널</span>
          </a>
        </div>
      </section>
    </>
  )
}
