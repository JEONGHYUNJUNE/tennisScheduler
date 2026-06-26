import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import LoadingState from '../components/LoadingState'
import { useAuth } from '../contexts/AuthContext'
import { getEvent, getTodayDateText, saveEvent } from '../services/eventService'

const emptyForm = { title: '', event_date: '', start_time: '', end_time: '', location: '', max_players: '', memo: '' }

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

  useEffect(() => {
    if (!eventId) return
    getEvent(eventId)
      .then((data) => {
        setEventOwnerId(data.created_by)
        setForm({
          id: data.id,
          title: data.title,
          event_date: data.event_date,
          start_time: data.start_time?.slice(0, 5) || '',
          end_time: data.end_time?.slice(0, 5) || '',
          location: data.location,
          max_players: data.max_players || '',
          memo: data.memo || '',
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

  if (loading) return <LoadingState message="일정 정보를 불러오는 중입니다." />

  if (eventId && eventOwnerId && !isAdmin && eventOwnerId !== profile.id) {
    return <Navigate to={`/events/${eventId}`} replace />
  }

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    if (form.event_date < getTodayDateText()) {
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
          <span className="event-form-icon calendar-icon" aria-hidden="true" />
          <span className="event-form-control">
            <strong>일정명</strong>
            <input required value={form.title} onChange={update('title')} placeholder="일정명을 입력해주세요" />
          </span>
        </label>

        <label className="event-form-field">
          <span className="event-form-icon calendar-icon" aria-hidden="true" />
          <span className="event-form-control">
            <strong>날짜</strong>
            <input required type="date" min={getTodayDateText()} value={form.event_date} onChange={update('event_date')} />
          </span>
        </label>

        <label className="event-form-field">
          <span className="event-form-icon event-form-member-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              <path d="M15.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
              <path d="M3.5 19c.6-3.2 2.4-5 5-5s4.4 1.8 5 5" />
              <path d="M13.5 14.5c2.7.2 4.5 1.8 5 4.5" />
            </svg>
          </span>
          <span className="event-form-control has-suffix">
            <strong>최대 인원</strong>
            <input min="1" type="number" value={form.max_players} onChange={update('max_players')} placeholder="최대 인원을 입력해주세요" />
            <em>명</em>
          </span>
        </label>

        <label className="event-form-field">
          <span className="event-form-icon clock-icon" aria-hidden="true" />
          <span className="event-form-control">
            <strong>시작 시간</strong>
            <input required type="time" value={form.start_time} onChange={update('start_time')} />
          </span>
        </label>

        <label className="event-form-field">
          <span className="event-form-icon clock-icon" aria-hidden="true" />
          <span className="event-form-control">
            <strong>종료 시간</strong>
            <input type="time" value={form.end_time} onChange={update('end_time')} />
          </span>
        </label>

        <label className="event-form-field">
          <span className="event-form-icon pin-icon" aria-hidden="true" />
          <span className="event-form-control">
            <strong>장소</strong>
            <input required value={form.location} onChange={update('location')} placeholder="장소를 입력해주세요" />
          </span>
        </label>

        <label className="event-form-field event-form-field-textarea">
          <span className="event-form-icon memo-icon" aria-hidden="true" />
          <span className="event-form-control">
            <strong>메모</strong>
            <span className="event-form-textarea-wrap">
              <textarea rows="5" value={form.memo} onChange={update('memo')} placeholder="메모를 입력해주세요" />
              <small>{form.memo.length}자</small>
            </span>
          </span>
        </label>

        {error && <p className="error">{error}</p>}
        <button className="primary-button event-form-submit" disabled={submitting}>{submitting ? '저장 중...' : '저장'}</button>
      </form>
    </section>
  )
}
