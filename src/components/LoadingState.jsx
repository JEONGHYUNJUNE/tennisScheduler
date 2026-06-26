export default function LoadingState({ message = '불러오는 중입니다.', variant = 'page' }) {
  const content = (
    <>
      <div className="loading-state-ball" aria-hidden="true" />
      <p>{message}</p>
    </>
  )

  return (
    <div className={`loading-state loading-state-${variant}`} role="status" aria-live="polite">
      {variant === 'screen' ? <div className="loading-state-card">{content}</div> : content}
    </div>
  )
}
