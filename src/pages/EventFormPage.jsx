import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getEvent, getTodayDateText, saveEvent } from '../services/eventService'

const emptyForm = { title: '', event_date: '', start_time: '', end_time: '', location: '', max_players: '', memo: '' }

export default function EventFormPage() {
  const { eventId } = useParams()
  const { profile, isAdmin } = useAuth()
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

  if (loading) return <p>일정 정보를 불러오는 중입니다.</p>

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
    <section className="form-card">
      <p className="eyebrow">{eventId ? 'EDIT EVENT' : 'NEW EVENT'}</p>
      <h1>{eventId ? '일정 수정' : '일정 등록'}</h1>
      <form onSubmit={handleSubmit}>
        <label>일정명<input required value={form.title} onChange={update('title')} /></label>
        <div className="form-row"><label>날짜<input required type="date" min={getTodayDateText()} value={form.event_date} onChange={update('event_date')} /></label><label>최대 인원<input min="1" type="number" value={form.max_players} onChange={update('max_players')} /></label></div>
        <div className="form-row"><label>시작 시간<input required type="time" value={form.start_time} onChange={update('start_time')} /></label><label>종료 시간<input type="time" value={form.end_time} onChange={update('end_time')} /></label></div>
        <label>장소<input required value={form.location} onChange={update('location')} /></label>
        <label>메모<textarea rows="5" value={form.memo} onChange={update('memo')} /></label>
        {error && <p className="error">{error}</p>}
        <button className="primary-button" disabled={submitting}>{submitting ? '저장 중...' : '저장'}</button>
      </form>
    </section>
  )
}
