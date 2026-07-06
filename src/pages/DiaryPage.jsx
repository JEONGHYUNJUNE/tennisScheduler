import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ImageLightbox from '../components/ImageLightbox'
import LoadingState from '../components/LoadingState'
import MemberAvatar from '../components/MemberAvatar'
import MentionText from '../components/MentionText'
import MentionTextarea from '../components/MentionTextarea'
import { useAuth } from '../contexts/AuthContext'
import { validatePostImageFile } from '../services/imageAttachmentService'
import {
  addDiaryComment,
  addDiaryEntry,
  deleteDiaryComment,
  deleteDiaryEntry,
  diaryActivityOptions,
  diaryMoodOptions,
  getMyDiaryGroups,
  getDiaryCommentLikeSummaries,
  getDiaryEntryDate,
  getDiaryEntriesByDate,
  getDiaryGroupMembers,
  getDiaryLikeSummaries,
  getDiaryMonthSummary,
  toggleDiaryCommentLike,
  toggleDiaryLike,
  updateDiaryComment,
  updateDiaryEntry,
} from '../services/diaryService'
import { getTodayDateText } from '../services/eventService'
import { getMembers } from '../services/memberService'

const todayText = getTodayDateText()

const formatDiaryDate = (dateText) => new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date(`${dateText}T00:00:00`))

const formatDiaryWeekday = (dateText) => new Intl.DateTimeFormat('ko-KR', {
  weekday: 'short',
}).format(new Date(`${dateText}T00:00:00`))

const formatTime = (dateText) => new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(dateText))

const flattenComments = (comments = []) => comments.flatMap((comment) => [
  comment,
  ...flattenComments(comment.replies || []),
])

const getMoodOption = (value) => diaryMoodOptions.find((option) => option.value === value) || diaryMoodOptions[0]
const getActivityOption = (value) => diaryActivityOptions.find((option) => option.value === value) || diaryActivityOptions[0]

function getMonthDays(year, month) {
  const firstDate = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const leadingBlankCount = firstDate.getDay()
  return [
    ...Array.from({ length: leadingBlankCount }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }),
  ]
}

function getDiaryDraftKey(memberId, dateText) {
  return `ons-diary-draft:${memberId}:${dateText}`
}

function readDiaryDraft(memberId, dateText) {
  if (!memberId || !dateText) return null

  try {
    const rawDraft = window.localStorage.getItem(getDiaryDraftKey(memberId, dateText))
    return rawDraft ? JSON.parse(rawDraft) : null
  } catch {
    return null
  }
}

function writeDiaryDraft(memberId, dateText, draft) {
  if (!memberId || !dateText) return

  try {
    window.localStorage.setItem(getDiaryDraftKey(memberId, dateText), JSON.stringify(draft))
  } catch {
    // 초안 저장 실패는 작성 흐름을 막지 않습니다.
  }
}

function clearDiaryDraft(memberId, dateText) {
  if (!memberId || !dateText) return

  try {
    window.localStorage.removeItem(getDiaryDraftKey(memberId, dateText))
  } catch {
    // 초안 삭제 실패는 작성 흐름을 막지 않습니다.
  }
}

function DiaryCalendar({ monthDate, selectedDate, summary, onMonthChange }) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth() + 1
  const monthDays = getMonthDays(year, month)

  return (
    <section className="diary-calendar-card">
      <div className="diary-calendar-head">
        <button type="button" onClick={() => onMonthChange(-1)} aria-label="이전 달">‹</button>
        <strong>{year}. {month}</strong>
        <button type="button" onClick={() => onMonthChange(1)} aria-label="다음 달">›</button>
      </div>
      <div className="diary-weekdays">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="diary-calendar-grid">
        {monthDays.map((dateText, index) => (
          dateText ? (
            <Link
              className={`diary-day ${dateText === todayText ? 'today' : ''} ${dateText === selectedDate ? 'selected' : ''} ${summary[dateText] ? 'has-entry' : ''}`}
              key={dateText}
              to={`/diary/${dateText}`}
            >
              <span>{Number(dateText.slice(-2))}</span>
              {summary[dateText] > 0 && <em>{summary[dateText]}</em>}
            </Link>
          ) : (
            <span className="diary-day blank" key={`blank-${index}`} />
          )
        ))}
      </div>
    </section>
  )
}

function DiaryEntryForm({ dateText, initialEntry, globalMentionCandidates, onCancel, onSaved }) {
  const { profile } = useAuth()
  const draft = useMemo(() => initialEntry ? null : readDiaryDraft(profile.id, dateText), [dateText, initialEntry, profile.id])
  const [mood, setMood] = useState(initialEntry?.mood || draft?.mood || 'happy')
  const [activityType, setActivityType] = useState(initialEntry?.activity_type || draft?.activityType || 'meetup')
  const [visibility, setVisibility] = useState(initialEntry?.visibility || draft?.visibility || 'public')
  const [groupId, setGroupId] = useState(initialEntry?.group_id || draft?.groupId || '')
  const [groups, setGroups] = useState([])
  const [groupMentionCandidates, setGroupMentionCandidates] = useState([])
  const [title, setTitle] = useState(initialEntry?.title || draft?.title || '')
  const [body, setBody] = useState(initialEntry?.body || draft?.body || '')
  const [mentions, setMentions] = useState(draft?.mentions || [])
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEditing = Boolean(initialEntry)
  const mentionCandidates = visibility === 'private'
    ? []
    : visibility === 'group'
      ? groupMentionCandidates
      : globalMentionCandidates

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return undefined
    }

    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  useEffect(() => {
    getMyDiaryGroups(profile.id)
      .then((nextGroups) => {
        setGroups(nextGroups)
        if (!groupId && nextGroups.length > 0) setGroupId(nextGroups[0].id)
      })
      .catch(() => setGroups([]))
  }, [groupId, profile.id])

  useEffect(() => {
    if (visibility !== 'group' || !groupId) {
      setGroupMentionCandidates([])
      return
    }

    getDiaryGroupMembers(groupId)
      .then((members) => {
        setGroupMentionCandidates(
          members
            .filter((member) => member.status === 'accepted' && member.member_id !== profile.id)
            .map((member) => ({
              id: member.member_id,
              name: member.member_name,
              username: '',
              avatar_url: member.member_avatar_url,
            })),
        )
      })
      .catch(() => setGroupMentionCandidates([]))
  }, [groupId, profile.id, visibility])

  useEffect(() => {
    if (isEditing) return

    writeDiaryDraft(profile.id, dateText, {
      mood,
      activityType,
      visibility,
      groupId,
      title,
      body,
      mentions,
    })
  }, [activityType, body, dateText, groupId, isEditing, mentions, mood, profile.id, title, visibility])

  const persistCurrentDraft = () => {
    if (isEditing) return

    writeDiaryDraft(profile.id, dateText, {
      mood,
      activityType,
      visibility,
      groupId,
      title,
      body,
      mentions,
    })
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null
    setError('')
    if (!file) {
      setImageFile(null)
      return
    }

    try {
      validatePostImageFile(file)
      setImageFile(file)
    } catch (err) {
      setError(err.message)
      setImageFile(null)
    }
  }

  const handleCancel = () => {
    if (!isEditing) clearDiaryDraft(profile.id, dateText)
    onCancel()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!body.trim()) return

    setSaving(true)
    setError('')

    try {
      const payload = {
        diary_date: dateText,
        mood,
        activity_type: activityType,
        visibility,
        group_id: visibility === 'group' ? groupId : null,
        title,
        body,
      }

      if (isEditing) {
        await updateDiaryEntry(initialEntry.id, payload, profile.id, mentions)
      } else {
        await addDiaryEntry(profile.id, payload, imageFile, mentions)
        clearDiaryDraft(profile.id, dateText)
      }
      onSaved()
    } catch (err) {
      setError(`${err.message} SQL 031번을 실행했는지 확인해 주세요.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="diary-write-card" onSubmit={handleSubmit}>
      <div className="diary-step">
        <p className="eyebrow">STEP 1</p>
        <h2>오늘의 기분을 골라주세요</h2>
        <div className="diary-choice-grid mood-grid">
          {diaryMoodOptions.map((option) => (
            <button
              className={mood === option.value ? 'selected' : ''}
              key={option.value}
              type="button"
              onClick={() => setMood(option.value)}
            >
              <strong>{option.label}</strong>
              <span>{option.icon}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="diary-step">
        <p className="eyebrow">STEP 2</p>
        <h2>어떤 활동이었나요?</h2>
        <div className="diary-segment">
          {diaryActivityOptions.map((option) => (
            <button
              className={activityType === option.value ? 'selected' : ''}
              key={option.value}
              type="button"
              onClick={() => setActivityType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="diary-step">
        <p className="eyebrow">STEP 3</p>
        <h2>기록을 남겨주세요</h2>
        <div className="diary-visibility">
          <button className={visibility === 'public' ? 'selected' : ''} type="button" onClick={() => {
            setVisibility('public')
            setMentions([])
          }}>
            전체공개
          </button>
          <button className={visibility === 'group' ? 'selected' : ''} type="button" onClick={() => {
            setVisibility('group')
            setMentions([])
          }}>
            그룹다이어리
          </button>
          <button className={visibility === 'private' ? 'selected' : ''} type="button" onClick={() => {
            setVisibility('private')
            setMentions([])
          }}>
            나만보기
          </button>
        </div>
        {visibility === 'group' && (
          <select className="diary-group-select" value={groupId} onChange={(event) => {
            setGroupId(event.target.value)
            setMentions([])
          }} required>
            {groups.length === 0 && <option value="">마이페이지에서 그룹 다이어리를 먼저 만들어 주세요.</option>}
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        )}
        <MentionTextarea
          candidates={mentionCandidates}
          maxLength={60}
          multiline={false}
          onChange={setTitle}
          onMentionsChange={setMentions}
          placeholder="제목을 입력해 주세요. 선택사항이에요."
          value={title}
        />
        <MentionTextarea
          candidates={mentionCandidates}
          maxLength={2000}
          onChange={setBody}
          onMentionsChange={setMentions}
          placeholder="오늘 코트에서 있었던 일, 배운 점, 기억하고 싶은 순간을 적어주세요."
          rows="6"
          value={body}
        />
        {!isEditing && (
          <>
            <label className="post-image-field diary-image-field">
              <input type="file" accept="image/*" onClick={persistCurrentDraft} onChange={handleImageChange} />
              <span>{imageFile ? imageFile.name : '사진 첨부'}</span>
            </label>
            {imagePreview && (
              <div className="post-image-preview diary-image-preview">
                <img src={imagePreview} alt="다이어리 첨부 이미지 미리보기" />
                <button type="button" onClick={() => setImageFile(null)}>삭제</button>
              </div>
            )}
          </>
        )}
        {error && <p className="error">{error}</p>}
        <div className="diary-form-actions">
          <span>{body.length} / 2000</span>
          <button className="secondary-button" type="button" onClick={handleCancel}>취소</button>
          <button className="primary-button" disabled={saving || !body.trim() || (visibility === 'group' && !groupId)}>
            {saving ? '저장 중...' : isEditing ? '수정 저장' : '다이어리 저장'}
          </button>
        </div>
      </div>
    </form>
  )
}

function DiaryCommentList({ entry, globalMentionCandidates, isAdmin, profile, commentLikes, onReload, setError }) {
  const [commentInput, setCommentInput] = useState('')
  const [replyInputs, setReplyInputs] = useState({})
  const [replyingCommentId, setReplyingCommentId] = useState(null)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editCommentMessage, setEditCommentMessage] = useState('')
  const [commentMentions, setCommentMentions] = useState([])
  const [replyMentions, setReplyMentions] = useState({})
  const [editCommentMentions, setEditCommentMentions] = useState([])
  const [busyId, setBusyId] = useState('')
  const [groupMentionCandidates, setGroupMentionCandidates] = useState([])
  const comments = entry.comments || []
  const totalCommentCount = flattenComments(comments).length
  const mentionCandidates = entry.visibility === 'private'
    ? []
    : entry.visibility === 'group'
      ? groupMentionCandidates
      : globalMentionCandidates

  useEffect(() => {
    if (entry.visibility !== 'group' || !entry.group_id) {
      setGroupMentionCandidates([])
      return
    }

    getDiaryGroupMembers(entry.group_id)
      .then((members) => {
        setGroupMentionCandidates(
          members
            .filter((member) => member.status === 'accepted' && member.member_id !== profile.id)
            .map((member) => ({
              id: member.member_id,
              name: member.member_name,
              username: '',
              avatar_url: member.member_avatar_url,
            })),
        )
      })
      .catch(() => setGroupMentionCandidates([]))
  }, [entry.group_id, entry.visibility, profile.id])

  useEffect(() => {
    setCommentMentions([])
    setReplyMentions({})
    setEditCommentMentions([])
  }, [entry.group_id, entry.visibility])

  const submitComment = async (event) => {
    event.preventDefault()
    if (!commentInput.trim()) return
    setBusyId(entry.id)
    try {
      await addDiaryComment(entry.id, profile.id, commentInput, null, commentMentions)
      setCommentInput('')
      setCommentMentions([])
      await onReload()
    } catch (err) {
      setError(`${err.message} SQL 031번을 실행했는지 확인해 주세요.`)
    } finally {
      setBusyId('')
    }
  }

  const submitReply = async (event, parentComment) => {
    event.preventDefault()
    const message = (replyInputs[parentComment.id] || '').trim()
    if (!message) return
    setBusyId(parentComment.id)
    try {
      await addDiaryComment(entry.id, profile.id, message, parentComment.id, replyMentions[parentComment.id] || [])
      setReplyInputs((current) => ({ ...current, [parentComment.id]: '' }))
      setReplyMentions((current) => ({ ...current, [parentComment.id]: [] }))
      setReplyingCommentId(null)
      await onReload()
    } catch (err) {
      setError(`${err.message} SQL 031번을 실행했는지 확인해 주세요.`)
    } finally {
      setBusyId('')
    }
  }

  const submitCommentUpdate = async (event, comment) => {
    event.preventDefault()
    if (!editCommentMessage.trim()) return
    setBusyId(comment.id)
    try {
      await updateDiaryComment(comment.id, editCommentMessage, profile.id, editCommentMentions)
      setEditingCommentId(null)
      setEditCommentMessage('')
      await onReload()
    } catch (err) {
      setError(`${err.message} SQL 031번을 실행했는지 확인해 주세요.`)
    } finally {
      setBusyId('')
    }
  }

  const removeComment = async (comment) => {
    if (!window.confirm('이 댓글을 삭제할까요?')) return
    setBusyId(comment.id)
    try {
      await deleteDiaryComment(comment.id)
      await onReload()
    } catch (err) {
      setError(`${err.message} SQL 031번을 실행했는지 확인해 주세요.`)
    } finally {
      setBusyId('')
    }
  }

  const toggleCommentHeart = async (comment) => {
    const currentLike = commentLikes[comment.id] ?? { count: 0, likedByMe: false }
    try {
      await toggleDiaryCommentLike(comment.id, profile.id, currentLike.likedByMe)
      await onReload()
    } catch (err) {
      setError(`${err.message} SQL 031번을 실행했는지 확인해 주세요.`)
    }
  }

  const renderComment = (comment, isReply = false) => {
    const canManageComment = isAdmin || comment.member_id === profile.id
    const isEditing = editingCommentId === comment.id

    return (
      <article
        className={`opinion-comment ${isReply ? 'opinion-reply' : ''} ${canManageComment && !isEditing ? 'manageable' : ''}`}
        id={`diary-comment-${comment.id}`}
        key={comment.id}
      >
        <div className="opinion-comment-meta">
          <div className="opinion-comment-author">
            <MemberAvatar name={comment.member_name} imageUrl={comment.member_avatar_url} size="sm" previewable />
            <strong>{comment.member_name}</strong>
          </div>
          <time>{formatTime(comment.created_at)}</time>
        </div>

        {isEditing ? (
          <form className="opinion-comment-edit-form" onSubmit={(event) => submitCommentUpdate(event, comment)}>
            <MentionTextarea
              candidates={mentionCandidates}
              maxLength={300}
              onChange={setEditCommentMessage}
              onMentionsChange={setEditCommentMentions}
              rows="2"
              value={editCommentMessage}
            />
            <div className="opinion-edit-actions">
              <span>{editCommentMessage.length} / 300</span>
              <button className="secondary-button" type="button" onClick={() => setEditingCommentId(null)}>취소</button>
              <button className="primary-button" disabled={busyId === comment.id || !editCommentMessage.trim()}>
                {busyId === comment.id ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        ) : (
          <p><MentionText text={comment.message} /></p>
        )}

        <div className="opinion-comment-quick-actions">
          <button
            className={`comment-heart-button ${commentLikes[comment.id]?.likedByMe ? 'liked' : ''}`}
            type="button"
            onClick={() => toggleCommentHeart(comment)}
          >
            <span>♥</span>
            <strong>{commentLikes[comment.id]?.count || 0}</strong>
          </button>
          {!isReply && !isEditing && (
            <button
              className="comment-reply-toggle"
              type="button"
              onClick={() => setReplyingCommentId(replyingCommentId === comment.id ? null : comment.id)}
            >
              답글
            </button>
          )}
        </div>

        {canManageComment && !isEditing && (
          <div className="opinion-comment-actions">
            <button
              className="opinion-icon-button edit"
              type="button"
              onClick={() => {
                setEditingCommentId(comment.id)
                setEditCommentMessage(comment.message)
                setEditCommentMentions([])
              }}
              aria-label="댓글 수정"
              title="수정"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M13.8 5.2 18.8 10.2" />
                <path d="M4.5 19.5 9.2 18.4 19.4 8.2a2.1 2.1 0 0 0 0-3L18.8 4.6a2.1 2.1 0 0 0-3 0L5.6 14.8 4.5 19.5Z" />
                <path d="M4 20h16" />
              </svg>
            </button>
            <button className="opinion-icon-button delete" type="button" onClick={() => removeComment(comment)} aria-label="댓글 삭제" title="삭제">
              <span aria-hidden="true" />
            </button>
          </div>
        )}

        {comment.replies?.length > 0 && (
          <div className="opinion-reply-list">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}

        {replyingCommentId === comment.id && (
          <form className="opinion-reply-form" onSubmit={(event) => submitReply(event, comment)}>
            <MentionTextarea
              autoFocus
              candidates={mentionCandidates}
              maxLength={300}
              multiline={false}
              placeholder={`${comment.member_name}님에게 답글 남기기`}
              value={replyInputs[comment.id] || ''}
              onChange={(value) => setReplyInputs((current) => ({ ...current, [comment.id]: value }))}
              onMentionsChange={(updater) => setReplyMentions((current) => ({
                ...current,
                [comment.id]: typeof updater === 'function' ? updater(current[comment.id] || []) : updater,
              }))}
            />
            <button className="secondary-button" disabled={busyId === comment.id || !(replyInputs[comment.id] || '').trim()}>
              {busyId === comment.id ? '등록 중...' : '등록'}
            </button>
          </form>
        )}
      </article>
    )
  }

  return (
    <section className="opinion-comments diary-comments">
      <div className="opinion-comments-head">
        <strong>댓글 {totalCommentCount}</strong>
      </div>
      {comments.length > 0 && <div className="opinion-comment-list">{comments.map((comment) => renderComment(comment))}</div>}
      <form className="opinion-comment-form" onSubmit={submitComment}>
        <MentionTextarea
          candidates={mentionCandidates}
          maxLength={300}
          multiline={false}
          onChange={setCommentInput}
          onMentionsChange={setCommentMentions}
          placeholder="댓글을 입력하세요."
          value={commentInput}
        />
        <button className="secondary-button" disabled={busyId === entry.id || !commentInput.trim()}>
          {busyId === entry.id ? '등록 중...' : '저장'}
        </button>
      </form>
    </section>
  )
}

function DiaryEntryCard({ entry, globalMentionCandidates, isAdmin, profile, entryLike, commentLikes, onEdit, onReload, setError }) {
  const mood = getMoodOption(entry.mood)
  const activity = getActivityOption(entry.activity_type)
  const [deleting, setDeleting] = useState(false)
  const canManageEntry = isAdmin || entry.member_id === profile.id

  const toggleHeart = async () => {
    try {
      await toggleDiaryLike(entry.id, profile.id, entryLike?.likedByMe)
      await onReload()
    } catch (err) {
      setError(`${err.message} SQL 031번을 실행했는지 확인해 주세요.`)
    }
  }

  const removeEntry = async () => {
    if (!window.confirm('이 다이어리를 삭제할까요?')) return
    setDeleting(true)
    try {
      await deleteDiaryEntry(entry.id)
      await onReload()
    } catch (err) {
      setError(`${err.message} SQL 031번을 실행했는지 확인해 주세요.`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <article className="diary-entry-card" id={`diary-entry-${entry.id}`}>
      <div className="diary-entry-meta">
        <div className="opinion-author">
          <MemberAvatar name={entry.member_name} imageUrl={entry.member_avatar_url} previewable />
          <div>
            <strong>{entry.member_name}</strong>
            <time>{formatTime(entry.created_at)}</time>
          </div>
        </div>
        <span className={`diary-visibility-badge ${entry.visibility}`}>
          {entry.visibility === 'public' ? '전체공개' : entry.visibility === 'group' ? '그룹다이어리' : '나만보기'}
        </span>
      </div>
      <div className="diary-entry-tags">
        <span>{mood.icon} {mood.label}</span>
        <span>{activity.label}</span>
      </div>
      {entry.title && <h2><MentionText text={entry.title} /></h2>}
      <p><MentionText text={entry.body} /></p>
      {entry.image_url && (
        <ImageLightbox
          src={entry.image_url}
          alt={entry.image_name || '다이어리 첨부 이미지'}
          className="post-image-display diary-image-display"
        />
      )}
      <div className="opinion-item-actions">
        <button className={`heart-button opinion-heart ${entryLike?.likedByMe ? 'liked' : ''}`} type="button" onClick={toggleHeart}>
          <span>♥</span>
          <strong>{entryLike?.count || 0}</strong>
        </button>
        {canManageEntry && (
          <div className="opinion-manage-actions">
            <button className="opinion-icon-button edit" type="button" onClick={() => onEdit(entry)} aria-label="다이어리 수정" title="수정">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M13.8 5.2 18.8 10.2" />
                <path d="M4.5 19.5 9.2 18.4 19.4 8.2a2.1 2.1 0 0 0 0-3L18.8 4.6a2.1 2.1 0 0 0-3 0L5.6 14.8 4.5 19.5Z" />
                <path d="M4 20h16" />
              </svg>
            </button>
            <button className="opinion-icon-button delete" type="button" onClick={removeEntry} disabled={deleting} aria-label="다이어리 삭제" title="삭제">
              <span aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      <DiaryCommentList
        entry={entry}
        isAdmin={isAdmin}
        profile={profile}
        commentLikes={commentLikes}
        onReload={onReload}
        setError={setError}
        globalMentionCandidates={globalMentionCandidates}
      />
    </article>
  )
}

export default function DiaryPage() {
  const { profile, isAdmin } = useAuth()
  const { date } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const linkedEntryId = searchParams.get('entry')
  const linkedCommentId = searchParams.get('comment')
  const calendarOnly = searchParams.get('view') === 'calendar'
  const selectedDate = date || (!calendarOnly && !linkedEntryId ? todayText : '')
  const [monthDate, setMonthDate] = useState(() => {
    const base = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
  const [summary, setSummary] = useState({})
  const [entries, setEntries] = useState([])
  const [globalMentionCandidates, setGlobalMentionCandidates] = useState([])
  const [entryLikes, setEntryLikes] = useState({})
  const [commentLikes, setCommentLikes] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [error, setError] = useState('')

  const canShowDayList = Boolean(selectedDate)

  useEffect(() => {
    if (date || linkedEntryId || calendarOnly) return
    navigate(`/diary/${todayText}`, { replace: true })
  }, [calendarOnly, date, linkedEntryId, navigate])

  const loadMonth = useCallback(async () => {
    const nextSummary = await getDiaryMonthSummary(monthDate.getFullYear(), monthDate.getMonth() + 1)
    setSummary(nextSummary)
  }, [monthDate])

  const loadEntries = useCallback(async () => {
    if (!selectedDate) return
    const nextEntries = await getDiaryEntriesByDate(selectedDate)
    setEntries(nextEntries)
    setEntryLikes(await getDiaryLikeSummaries(nextEntries.map((entry) => entry.id), profile.id))
    setCommentLikes(await getDiaryCommentLikeSummaries(nextEntries.flatMap((entry) => flattenComments(entry.comments).map((comment) => comment.id)), profile.id))
  }, [profile.id, selectedDate])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await loadMonth()
      await loadEntries()
    } catch (err) {
      setError(`${err.message} SQL 031번을 실행했는지 확인해 주세요.`)
    } finally {
      setLoading(false)
    }
  }, [loadEntries, loadMonth])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    getMembers()
      .then((members) => setGlobalMentionCandidates(members.filter((member) => member.is_active !== false && member.id !== profile.id)))
      .catch(() => setGlobalMentionCandidates([]))
  }, [profile.id])

  useEffect(() => {
    if (selectedDate || !linkedEntryId) return
    getDiaryEntryDate(linkedEntryId)
      .then((entryDate) => {
        if (entryDate) {
          const params = new URLSearchParams()
          params.set('entry', linkedEntryId)
          if (linkedCommentId) params.set('comment', linkedCommentId)
          navigate(`/diary/${entryDate}?${params.toString()}`, { replace: true })
        }
      })
      .catch(() => {})
  }, [linkedCommentId, linkedEntryId, navigate, selectedDate])

  useEffect(() => {
    if (loading || !selectedDate || (!linkedEntryId && !linkedCommentId)) return undefined

    const timer = window.setTimeout(() => {
      const commentTarget = linkedCommentId ? document.getElementById(`diary-comment-${linkedCommentId}`) : null
      const entryTarget = linkedEntryId ? document.getElementById(`diary-entry-${linkedEntryId}`) : null
      const target = commentTarget || entryTarget
      target?.scrollIntoView({ behavior: 'smooth', block: commentTarget ? 'center' : 'start' })
    }, 160)

    return () => window.clearTimeout(timer)
  }, [linkedCommentId, linkedEntryId, loading, selectedDate, entries])

  const headingDate = useMemo(() => selectedDate ? formatDiaryDate(selectedDate) : '테니스 다이어리', [selectedDate])
  const headingWeekday = useMemo(() => selectedDate ? formatDiaryWeekday(selectedDate) : '', [selectedDate])

  const handleMonthChange = (offset) => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const handleSaved = async () => {
    setShowForm(false)
    setEditingEntry(null)
    await load()
  }

  return (
    <>
      <div className="page-heading main-heading diary-heading">
        <div>
          <p className="eyebrow">TENNIS DIARY</p>
          <h1>
            {headingDate}
            {headingWeekday && <span className="diary-heading-weekday">({headingWeekday})</span>}
          </h1>
          <p className="heading-copy">오늘의 테니스와 마음을 날짜별로 차곡차곡 남겨보세요.</p>
        </div>
      </div>

      <section className="diary-shell">
        <DiaryCalendar monthDate={monthDate} selectedDate={selectedDate} summary={summary} onMonthChange={handleMonthChange} />

        {loading && <LoadingState message="다이어리를 불러오는 중입니다." variant="inline" />}
        {error && <p className="error">{error}</p>}

        {canShowDayList ? (
          <div className="diary-day-panel">
            <div className="diary-day-head">
              <button className="diary-panel-button ghost" type="button" onClick={() => navigate('/diary?view=calendar')}>달력 보기</button>
              <button
                className="diary-panel-button primary"
                type="button"
                onClick={() => {
                  setEditingEntry(null)
                  setShowForm(true)
                }}
              >
                작성하기
              </button>
            </div>

            {(showForm || editingEntry) && (
              <DiaryEntryForm
                dateText={selectedDate}
                initialEntry={editingEntry}
                globalMentionCandidates={globalMentionCandidates}
                onCancel={() => {
                  setShowForm(false)
                  setEditingEntry(null)
                }}
                onSaved={handleSaved}
              />
            )}

            {!loading && entries.length === 0 && !showForm && !editingEntry && (
              <EmptyState
                title="이날의 다이어리가 없어요."
                description="작성하기를 눌러 오늘의 테니스를 기록해보세요."
              />
            )}

            <div className="diary-entry-list">
              {entries.map((entry) => (
                <DiaryEntryCard
                  commentLikes={commentLikes}
                  entry={entry}
                  entryLike={entryLikes[entry.id]}
                  globalMentionCandidates={globalMentionCandidates}
                  isAdmin={isAdmin}
                  key={entry.id}
                  onEdit={(nextEntry) => {
                    setShowForm(false)
                    setEditingEntry(nextEntry)
                  }}
                  onReload={load}
                  profile={profile}
                  setError={setError}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="diary-calendar-helper">
            <strong>날짜를 선택해 주세요.</strong>
            <p>한 날짜에 여러 개의 다이어리를 남길 수 있어요.</p>
          </div>
        )}
      </section>
    </>
  )
}
