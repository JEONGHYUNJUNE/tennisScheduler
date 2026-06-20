import { useEffect, useMemo, useRef, useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getMonthEvents, getMonthlyAttendanceRanking, getTodayDateText, getUpcomingEvents } from '../services/eventService'
import { defaultHomeWidgetOrder, getHomeWidgetOrder, saveHomeWidgetOrder } from '../services/homeWidgetService'
import { getMembers } from '../services/memberService'

const formatEventDate = (dateText) => {
  if (!dateText) return { day: '-', weekday: '' }

  const date = new Date(`${dateText}T00:00:00`)
  return {
    day: `${date.getMonth() + 1}.${date.getDate()}`,
    weekday: new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date),
  }
}

const formatTime = (startTime, endTime) => {
  if (!startTime) return '시간 미정'
  return endTime ? `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}` : startTime.slice(0, 5)
}

const getInitial = (name) => name?.trim()?.slice(0, 1) || '?'

const todayDateText = getTodayDateText()

const getMonthLabel = (date) => new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
}).format(date)

const widgetTitles = {
  upcomingEvents: '다가오는 일정',
  members: '멤버 현황',
  ranking: '참석 현황',
  calendar: '월간 일정',
}

function getCalendarDays(targetDate) {
  const year = targetDate.getFullYear()
  const month = targetDate.getMonth()
  const firstDate = new Date(year, month, 1)
  const lastDate = new Date(year, month + 1, 0)
  const days = []

  for (let i = 0; i < firstDate.getDay(); i += 1) {
    days.push({ key: `blank-${i}`, isBlank: true })
  }

  for (let day = 1; day <= lastDate.getDate(); day += 1) {
    const date = new Date(year, month, day)
    const dateText = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')

    days.push({
      key: dateText,
      day,
      dateText,
      isToday: dateText === todayDateText,
      isPast: dateText < todayDateText,
    })
  }

  return days
}

function SortableHomeWidget({ id, isEditing, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing })

  return (
    <div
      className={`home-widget home-widget-${id} ${isEditing ? 'editing' : ''} ${isDragging ? 'dragging' : ''}`}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {isEditing && (
        <div className="widget-edit-bar">
          <button type="button" {...attributes} {...listeners} aria-label={`${widgetTitles[id]} 순서 이동`}>
            ≡
          </button>
          <span>{widgetTitles[id]}</span>
        </div>
      )}
      {children}
    </div>
  )
}

export default function HomePage() {
  const { profile } = useAuth()
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [widgetOrder, setWidgetOrder] = useState(defaultHomeWidgetOrder)
  const [savedWidgetOrder, setSavedWidgetOrder] = useState(defaultHomeWidgetOrder)
  const [isEditingWidgets, setIsEditingWidgets] = useState(false)
  const [savingLayout, setSavingLayout] = useState(false)
  const [layoutMessage, setLayoutMessage] = useState('')
  const layoutMessageTimerRef = useRef(null)
  const [homeWidgetData, setHomeWidgetData] = useState({
    events: [],
    monthEvents: [],
    members: [],
    ranking: [],
  })
  const [loading, setLoading] = useState(true)
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [error, setError] = useState('')
  const [calendarError, setCalendarError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    Promise.all([getUpcomingEvents(), getMembers(), getMonthlyAttendanceRanking()])
      .then(([events, members, ranking]) => {
        setHomeWidgetData((current) => ({
          events: events.slice(0, 2),
          monthEvents: current.monthEvents,
          members: members.filter((member) => member.is_active !== false),
          ranking: ranking.slice(0, 3),
        }))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!profile?.id) return

    getHomeWidgetOrder(profile.id)
      .then((order) => {
        setWidgetOrder(order)
        setSavedWidgetOrder(order)
      })
      .catch(() => {
        setWidgetOrder(defaultHomeWidgetOrder)
        setSavedWidgetOrder(defaultHomeWidgetOrder)
      })
  }, [profile?.id])

  useEffect(() => {
    let ignore = false

    setCalendarLoading(true)
    setCalendarError('')

    getMonthEvents(calendarMonth)
      .then((monthEvents) => {
        if (!ignore) setHomeWidgetData((current) => ({ ...current, monthEvents }))
      })
      .catch((err) => {
        if (!ignore) setCalendarError(err.message)
      })
      .finally(() => {
        if (!ignore) setCalendarLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [calendarMonth])

  useEffect(() => {
    return () => {
      if (layoutMessageTimerRef.current) {
        window.clearTimeout(layoutMessageTimerRef.current)
      }
    }
  }, [])

  const moveCalendarMonth = (amount) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  const resetCalendarMonth = () => {
    setCalendarMonth(new Date())
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setWidgetOrder((currentOrder) => {
      const oldIndex = currentOrder.indexOf(active.id)
      const newIndex = currentOrder.indexOf(over.id)
      return arrayMove(currentOrder, oldIndex, newIndex)
    })
  }

  const clearLayoutMessageTimer = () => {
    if (layoutMessageTimerRef.current) {
      window.clearTimeout(layoutMessageTimerRef.current)
      layoutMessageTimerRef.current = null
    }
  }

  const showLayoutMessage = (message, { autoHide = false } = {}) => {
    clearLayoutMessageTimer()
    setLayoutMessage(message)

    if (autoHide) {
      layoutMessageTimerRef.current = window.setTimeout(() => {
        setLayoutMessage('')
        layoutMessageTimerRef.current = null
      }, 2500)
    }
  }

  const handleEditWidgets = () => {
    showLayoutMessage('')
    setIsEditingWidgets(true)
  }

  const handleCancelEdit = () => {
    setWidgetOrder(savedWidgetOrder)
    setIsEditingWidgets(false)
    showLayoutMessage('')
  }

  const handleSaveLayout = async () => {
    setSavingLayout(true)
    showLayoutMessage('')

    try {
      const savedOrder = await saveHomeWidgetOrder(profile.id, widgetOrder)
      setWidgetOrder(savedOrder)
      setSavedWidgetOrder(savedOrder)
      setIsEditingWidgets(false)
      showLayoutMessage('위젯 순서가 저장됐습니다.', { autoHide: true })
    } catch (err) {
      showLayoutMessage(`${err.message} SQL 016번을 실행했는지 확인해 주세요.`)
    } finally {
      setSavingLayout(false)
    }
  }

  const recentMembers = homeWidgetData.members.slice(0, 4)
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth])
  const eventsByDate = useMemo(() => homeWidgetData.monthEvents.reduce((groups, event) => {
    const list = groups[event.event_date] ?? []
    list.push(event)
    groups[event.event_date] = list
    return groups
  }, {}), [homeWidgetData.monthEvents])

  const renderWidget = (widgetId) => {
    if (widgetId === 'upcomingEvents') {
      return (
        <article className="widget-card">
          <div className="widget-card-head">
            <h2><span className="widget-icon calendar-icon" />다가오는 일정</h2>
            <Link to="/events">전체 보기</Link>
          </div>

          <div className="widget-event-list">
            {homeWidgetData.events.length === 0 && <p className="widget-empty">예정된 일정이 없습니다.</p>}
            {homeWidgetData.events.map((event) => {
              const date = formatEventDate(event.event_date)
              const attendingCount = event.tennis_attendances?.filter((item) => item.status === 'attending').length || 0

              return (
                <Link className="widget-event-item" to={`/events/${event.id}`} key={event.id}>
                  <div className="widget-date-chip">
                    <strong>{date.day}</strong>
                    <span>{date.weekday}</span>
                  </div>
                  <div>
                    <strong>{event.title}</strong>
                    <span>{formatTime(event.start_time, event.end_time)}</span>
                    <span>{event.location || '장소 미정'}</span>
                  </div>
                  <em>
                    {attendingCount}
                    {event.max_players ? ` / ${event.max_players}` : ''}
                  </em>
                </Link>
              )
            })}
          </div>
        </article>
      )
    }

    if (widgetId === 'members') {
      return (
        <article className="widget-card">
          <div className="widget-card-head">
            <h2><span className="widget-icon member-icon" />멤버 현황</h2>
            <Link to="/members">전체 보기</Link>
          </div>

          <div className="widget-member-count">
            <strong>{homeWidgetData.members.length}</strong>
            <span>명</span>
          </div>
          <p className="widget-subcopy">활동 중인 멤버</p>

          <div className="recent-member-list">
            <p>최근 가입 멤버</p>
            <div>
              {recentMembers.length === 0 && <span className="widget-empty">멤버가 없습니다.</span>}
              {recentMembers.map((member) => (
                <span className="member-chip" key={member.id}>
                  <b>{getInitial(member.name)}</b>
                  <span>{member.name || member.user_id}</span>
                </span>
              ))}
            </div>
          </div>
        </article>
      )
    }

    if (widgetId === 'ranking') {
      return (
        <article className="widget-card">
          <div className="widget-card-head">
            <h2><span className="widget-icon trophy-icon" />참석 현황</h2>
            <Link to="/ranking">전체 보기</Link>
          </div>

          <div className="widget-ranking-list">
            {homeWidgetData.ranking.length === 0 && <p className="widget-empty">최근 3개월 일정이 아직 없습니다.</p>}
            {homeWidgetData.ranking.map((item) => (
              <Link className="widget-ranking-item" to="/ranking" key={item.member_id}>
                <span className={`rank-badge rank-${item.rank}`}>{item.rank}</span>
                <b>{getInitial(item.name)}</b>
                <div>
                  <strong>{item.name}</strong>
                  {item.club_position && <em>{item.club_position}</em>}
                </div>
                <span>
                  <strong>{item.count}</strong>
                  회
                </span>
              </Link>
            ))}
          </div>
        </article>
      )
    }

    if (widgetId === 'calendar') {
      return (
        <section className="month-calendar-card">
          <div className="widget-card-head">
            <h2><span className="widget-icon calendar-icon" />{getMonthLabel(calendarMonth)} 일정</h2>
            <div className="month-calendar-actions">
              <button className="calendar-nav-arrow" type="button" aria-label="이전달" onClick={() => moveCalendarMonth(-1)}>‹</button>
              <button className="calendar-nav-today" type="button" onClick={resetCalendarMonth}>오늘</button>
              <button className="calendar-nav-arrow" type="button" aria-label="다음달" onClick={() => moveCalendarMonth(1)}>›</button>
            </div>
          </div>

          {calendarLoading && <p className="widget-empty">월간 일정을 불러오는 중입니다.</p>}
          {calendarError && <p className="error">{calendarError}</p>}

          <div className="month-calendar-weekdays">
            {['일', '월', '화', '수', '목', '금', '토'].map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="month-calendar-grid">
            {calendarDays.map((day) => {
              if (day.isBlank) return <div className="month-day blank-day" key={day.key} />

              const dayEvents = eventsByDate[day.dateText] ?? []

              return (
                <div className={`month-day ${day.isToday ? 'today' : ''} ${day.isPast ? 'past-day' : ''}`} key={day.key}>
                  <div className="month-day-head">
                    <strong>{day.day}</strong>
                    {day.isToday && <span>오늘</span>}
                  </div>

                  <div className="month-day-events">
                    {dayEvents.slice(0, 3).map((event) => (
                      <Link to={`/events/${event.id}`} key={event.id}>
                        <span>{event.start_time?.slice(0, 5) || '시간 미정'}</span>
                        <strong>{event.title}</strong>
                      </Link>
                    ))}
                    {dayEvents.length > 3 && <em>+{dayEvents.length - 3}개 더</em>}
                  </div>

                  {dayEvents.length === 0 && !day.isPast && (
                    <Link className="month-day-create" to={`/events/new?date=${day.dateText}`}>
                      + 일정 등록
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )
    }

    return null
  }

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-kicker"><span aria-hidden="true" />ONS Tennis</p>
          {/*<h1>일정, 멤버, 랭킹을<br /></h1>
          <p>함께하는 모든 순간이 특별한 플레이가 됩니다.</p>
       */} </div>
        <button className="widget-edit-button" type="button" onClick={handleEditWidgets}>
          위젯 편집
        </button>
        <div className="home-court-art" aria-hidden="true" />
      </section>

      {loading && <p>위젯을 불러오는 중입니다.</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <>
          {isEditingWidgets && (
            <section className="widget-edit-panel">
              <div>
                <strong>위젯 편집 중</strong>
                <p>제목 바를 드래그해서 위젯 순서를 바꿔보세요.</p>
              </div>
              <div className="widget-edit-actions">
                <button className="secondary-button" type="button" onClick={handleCancelEdit} disabled={savingLayout}>취소</button>
                <button className="primary-button" type="button" onClick={handleSaveLayout} disabled={savingLayout}>
                  {savingLayout ? '저장 중...' : '저장'}
                </button>
              </div>
            </section>
          )}
          {layoutMessage && <p className="notice">{layoutMessage}</p>}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
              <section className={`home-widget-grid ${isEditingWidgets ? 'editing' : ''}`}>
                {widgetOrder.map((widgetId) => (
                  <SortableHomeWidget id={widgetId} isEditing={isEditingWidgets} key={widgetId}>
                    {renderWidget(widgetId)}
                  </SortableHomeWidget>
                ))}
              </section>
            </SortableContext>
          </DndContext>
        </>
      )}
    </>
  )
}
