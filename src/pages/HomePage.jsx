import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMonthlyAttendanceRanking, getUpcomingEvents } from '../services/eventService'
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

export default function HomePage() {
  const [dashboard, setDashboard] = useState({
    events: [],
    members: [],
    ranking: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getUpcomingEvents(), getMembers(), getMonthlyAttendanceRanking()])
      .then(([events, members, ranking]) => {
        setDashboard({
          events: events.slice(0, 2),
          members: members.filter((member) => member.is_active !== false),
          ranking: ranking.slice(0, 3),
        })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const recentMembers = dashboard.members.slice(0, 4)

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-kicker"><span aria-hidden="true" />ONS Tennis</p>
          {/*<h1>일정, 멤버, 랭킹을<br /></h1>
          <p>함께하는 모든 순간이 특별한 플레이가 됩니다.</p>
       */} </div>
        <div className="home-court-art" aria-hidden="true" />
      </section>

      {loading && <p>대시보드를 불러오는 중입니다.</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <section className="dashboard-grid">
          <article className="dashboard-card">
            <div className="dashboard-card-head">
              <h2><span className="dashboard-icon calendar-icon" />다가오는 일정</h2>
              <Link to="/events">전체 보기</Link>
            </div>

            <div className="dashboard-event-list">
              {dashboard.events.length === 0 && <p className="dashboard-empty">예정된 일정이 없습니다.</p>}
              {dashboard.events.map((event) => {
                const date = formatEventDate(event.event_date)
                const attendingCount = event.tennis_attendances?.filter((item) => item.status === 'attending').length || 0

                return (
                  <Link className="dashboard-event-item" to={`/events/${event.id}`} key={event.id}>
                    <div className="dashboard-date-chip">
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

          <article className="dashboard-card">
            <div className="dashboard-card-head">
              <h2><span className="dashboard-icon member-icon" />멤버 현황</h2>
              <Link to="/members">전체 보기</Link>
            </div>

            <div className="dashboard-member-count">
              <strong>{dashboard.members.length}</strong>
              <span>명</span>
            </div>
            <p className="dashboard-subcopy">활동 중인 멤버</p>

            <div className="recent-member-list">
              <p>최근 가입 멤버</p>
              <div>
                {recentMembers.length === 0 && <span className="dashboard-empty">멤버가 없습니다.</span>}
                {recentMembers.map((member) => (
                  <span className="member-chip" key={member.id}>
                    <b>{getInitial(member.name)}</b>
                    <span>{member.name || member.user_id}</span>
                  </span>
                ))}
              </div>
            </div>
          </article>

          <article className="dashboard-card">
            <div className="dashboard-card-head">
              <h2><span className="dashboard-icon trophy-icon" />참석 현황</h2>
              <Link to="/ranking">전체 보기</Link>
            </div>

            <div className="dashboard-ranking-list">
              {dashboard.ranking.length === 0 && <p className="dashboard-empty">최근 3개월 일정이 아직 없습니다.</p>}
              {dashboard.ranking.map((item) => (
                <Link className="dashboard-ranking-item" to="/ranking" key={item.member_id}>
                  <span className={`rank-badge rank-${item.rank}`}>{item.rank}</span>
                  <b>{getInitial(item.name)}</b>
                  <div>
                    <strong>{item.name}</strong>
                    {item.club_position && <em>{item.club_position}</em>}
                  </div>
                  <span>
                    <strong>{item.count}</strong>
                    회 참석
                  </span>
                </Link>
              ))}
            </div>
          </article>
        </section>
      )}
    </>
  )
}
