const recommendedVideo = {
  title: '추천 테니스 영상',
  description: '',
  url: 'https://youtu.be/Ec9cQyAH6oE?si=pdHfE9Z973YVjugp',
}

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

const embedUrl = getYoutubeEmbedUrl(recommendedVideo.url)

export default function TennisNewsPage() {
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
