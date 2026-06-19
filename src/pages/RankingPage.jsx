import { useEffect, useState } from 'react'
import { getMonthlyAttendanceRanking } from '../services/eventService'

export default function RankingPage() {
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getMonthlyAttendanceRanking()
      .then(setRanking)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="page-heading main-heading">
        <div>
          <p className="eyebrow">RANKING</p>
          <h1>참석 현황</h1>
          <p className="heading-copy">최근 3개월 참석 랭킹입니다.</p>
        </div>
      </div>

      {loading && <p>랭킹을 불러오는 중입니다.</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <section className="ranking-list">
          {ranking.length === 0 && <div className="empty-state">최근 3개월에 지난 일정이 아직 없습니다.</div>}
          {ranking.map((item) => (
            <article className={`ranking-item ${item.rank <= 3 ? 'ranking-item-top' : ''}`} key={item.member_id}>
              <div className="ranking-rank">{item.rank}</div>
              <div className="ranking-main">
                <div>
                  <strong>{item.name}</strong>
                  {item.club_position && <em>{item.club_position}</em>}
                </div>
                <span>{item.events.map((event) => event.title).join(', ')}</span>
              </div>
              <div className="ranking-count">
                <strong>{item.count}</strong>
                <span>회 참석</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  )
}
