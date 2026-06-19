import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { defaultRecommendedVideo, getRecommendedVideo, saveRecommendedVideo } from '../services/tennisVideoService'

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
  const { isAdmin } = useAuth()
  const [recommendedVideo, setRecommendedVideo] = useState(defaultRecommendedVideo)
  const [videoForm, setVideoForm] = useState(defaultRecommendedVideo)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const embedUrl = getYoutubeEmbedUrl(recommendedVideo.url)

  useEffect(() => {
    getRecommendedVideo()
      .then((video) => {
        setRecommendedVideo(video)
        setVideoForm(video)
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const savedVideo = await saveRecommendedVideo(videoForm)
      setRecommendedVideo(savedVideo)
      setVideoForm(savedVideo)
      setMessage('추천 영상이 저장됐습니다.')
    } catch (error) {
      setMessage(`${error.message} SQL 014번을 실행했는지 확인해 주세요.`)
    } finally {
      setSaving(false)
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
        {loading && <p className="notification-empty">추천 영상을 불러오는 중입니다.</p>}
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
          <a href="https://www.flashscore.com/tennis/" target="_blank" rel="noreferrer">
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
