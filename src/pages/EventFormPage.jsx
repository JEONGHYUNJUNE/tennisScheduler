import AppIcon from '../components/AppIcon'
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import LoadingState from '../components/LoadingState'
import { useAuth } from '../contexts/AuthContext'
import { getEvent, getTodayDateText, saveEvent } from '../services/eventService'
import { validatePostImageFile } from '../services/imageAttachmentService'

const emptyForm = { title: '', event_date: '', start_time: '', end_time: '', location: '', max_players: '', memo: '', memo_image_path: '', memo_image_url: '', memo_image_file: null, remove_memo_image: false, repeat_enabled: false, repeat_monthly_day: '1', repeat_until: '' }

export default function EventFormPage() {
  const { eventId } = useParams()
  const { profile, isAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [eventOwnerId, setEventOwnerId] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(Boolean(eventId))
  const [memoImagePreview, setMemoImagePreview] = useState('')

  useEffect(() => {
    if (!eventId) return
    getEvent(eventId)
      .then((data) => {
        setEventOwnerId(data.created_by)
        setForm({
          id: data.id,
          title: data.title,
          event_date: data.original_event_date || data.event_date,
          original_event_date: data.original_event_date || data.event_date,
          repeat_enabled: Boolean(data.repeat_monthly_day),
          repeat_monthly_day: String(data.repeat_monthly_day || 1),
          repeat_until: data.repeat_until || '',
          start_time: data.start_time?.slice(0, 5) || '',
          end_time: data.end_time?.slice(0, 5) || '',
          location: data.location,
          max_players: data.max_players || '',
          memo: data.memo || '',
          memo_image_path: data.memo_image_path || '',
          memo_image_url: data.memo_image_url || '',
          memo_image_file: null,
          remove_memo_image: false,
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [eventId])

  useEffect(() => {
    if (eventId) return

    const dateParam = new URLSearchParams(location.search).get('date')
    if (!dateParam || dateParam < getTodayDateText()) return

    setForm((current) => ({ ...current, event_date: dateParam }))
  }, [eventId, location.search])

  useEffect(() => {
    if (!form.memo_image_file) {
      setMemoImagePreview('')
      return undefined
    }

    const url = URL.createObjectURL(form.memo_image_file)
    setMemoImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [form.memo_image_file])

  if (loading) return <LoadingState message="일정 정보를 불러오는 중입니다." />

  if (eventId && eventOwnerId && !isAdmin && eventOwnerId !== profile.id) {
    return <Navigate to={`/events/${eventId}`} replace />
  }

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  const handleMemoImageChange = (event) => {
    const file = event.target.files?.[0] || null
    setError('')
    if (!file) {
      setForm((current) => ({ ...current, memo_image_file: null }))
      return
    }
    try {
      validatePostImageFile(file)
      setForm((current) => ({ ...current, memo_image_file: file, remove_memo_image: false }))
    } catch (err) {
      setError(err.message)
      setForm((current) => ({ ...current, memo_image_file: null }))
    }
  }

  const clearMemoImage = () => {
    setForm((current) => ({
      ...current,
      memo_image_file: null,
      remove_memo_image: Boolean(current.memo_image_path),
    }))
  }
  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    if (form.event_date < getTodayDateText() && !(form.id && form.repeat_enabled && form.event_date === form.original_event_date)) {
      setError('오늘 이전 날짜로는 일정을 저장할 수 없습니다.')
      setSubmitting(false)
      return
    }
    try {
      const saved = await saveEvent(form, profile.id)
      navigate(`/events/${saved.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="event-form-shell">
      <div className="event-form-hero">
        <button className="event-form-back" type="button" onClick={() => navigate(-1)} aria-label="뒤로">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </button>
        <div>
          <p className="eyebrow">{eventId ? 'EDIT EVENT' : 'NEW EVENT'}</p>
          <h1>{eventId ? '일정 수정' : '일정 등록'}</h1>
          <p>{eventId ? '일정 정보 수정' : '새로운 일정을 등록'}</p>
        </div>
      </div>

      <form className="event-form-card" onSubmit={handleSubmit}>
        <label className="event-form-field">
          <AppIcon type="events" className="event-form-icon" />
          <span className="event-form-control">
            <strong>일정명</strong>
            <input required value={form.title} onChange={update('title')} placeholder="일정명을 입력해주세요" />
          </span>
        </label>

        <label className="event-form-field">
          <AppIcon type="events" className="event-form-icon" />
          <span className="event-form-control">
            <strong>{form.repeat_enabled ? '반복 시작 날짜' : '날짜'}</strong>
            <input required type="date" min={form.id && form.repeat_enabled ? form.original_event_date : getTodayDateText()} value={form.event_date} onChange={update('event_date')} />
          </span>
        </label>

        <div className="event-repeat-settings">
          <label className="event-repeat-toggle">
            <input type="checkbox" checked={form.repeat_enabled} onChange={(event) => setForm((current) => ({ ...current, repeat_enabled: event.target.checked, repeat_monthly_day: current.event_date ? String(Number(current.event_date.slice(8, 10))) : current.repeat_monthly_day }))} />
            <strong>매월 반복 일정</strong>
          </label>
          {form.repeat_enabled && (
            <div className="event-repeat-options">
              <label>반복 날짜<select value={form.repeat_monthly_day} onChange={update('repeat_monthly_day')}>
                {Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>매월 {index + 1}일</option>)}
              </select></label>
              <label>반복 종료일 (선택)<input type="date" min={form.event_date || getTodayDateText()} value={form.repeat_until} onChange={update('repeat_until')} /></label>
              <p>선택한 시작 날짜부터 매월 반복합니다. 종료일을 비우면 계속 반복하며, 해당 날짜가 없는 달은 말일에 진행합니다.</p>
              <p>참석하면 매월 전날 오후 8시·당일 오전 8시에 알림을 받습니다. 참석 취소 또는 일정 삭제 시 이후 반복 알림도 중단됩니다.</p>
            </div>
          )}
        </div>

        <label className="event-form-field">
          <AppIcon type="members" className="event-form-icon" />
          <span className="event-form-control has-suffix">
            <strong>최대 인원</strong>
            <input min="1" type="number" value={form.max_players} onChange={update('max_players')} placeholder="최대 인원을 입력해주세요" />
            <em>명</em>
          </span>
        </label>

        <label className="event-form-field">
          <AppIcon type="clock" className="event-form-icon" />
          <span className="event-form-control">
            <strong>시작 시간</strong>
            <input required type="time" value={form.start_time} onChange={update('start_time')} />
          </span>
        </label>


        <label className="event-form-field">
          <AppIcon type="clock" className="event-form-icon" />
          <span className="event-form-control">
            <strong>종료 시간</strong>
            <input type="time" value={form.end_time} onChange={update('end_time')} />
          </span>
        </label>

        <label className="event-form-field">
          <AppIcon type="pin" className="event-form-icon" />
          <span className="event-form-control">
            <strong>장소</strong>
            <input required value={form.location} onChange={update('location')} placeholder="장소를 입력해주세요" />
          </span>
        </label>

        <label className="event-form-field event-form-field-textarea">
          <AppIcon type="diary" className="event-form-icon" />
          <span className="event-form-control">
            <strong>메모</strong>
            <span className="event-form-textarea-wrap">
              <textarea rows="5" value={form.memo} onChange={update('memo')} placeholder="메모를 입력해주세요" />
              <small>{form.memo.length}자</small>
            </span>
            <span className="post-image-field">
              <input type="file" accept="image/*" onChange={handleMemoImageChange} />
              <span>{form.memo_image_file ? form.memo_image_file.name : '메모 사진 첨부'}</span>
            </span>
            {(memoImagePreview || (form.memo_image_url && !form.remove_memo_image)) && (
              <div className="post-image-preview">
                <img src={memoImagePreview || form.memo_image_url} alt="메모 첨부 이미지 미리보기" />
                <button type="button" onClick={clearMemoImage}>삭제</button>
              </div>
            )}
          </span>
        </label>

        {error && <p className="error">{error}</p>}
        <button className="primary-button event-form-submit" disabled={submitting}>{submitting ? '저장 중...' : '저장'}</button>
      </form>
    </section>
  )
}
