export default function LoadingState({ message = '불러오는 중입니다.', variant = 'page' }) {
  const loaderSrc = `${import.meta.env.BASE_URL}ons-tennis-logo-fill-loader.gif`
  const content = (
    <>
      <img className="loading-state-logo" src={loaderSrc} alt="" aria-hidden="true" draggable="false" />
      <p>{message}</p>
    </>
  )

  return (
    <div className={`loading-state loading-state-${variant}`} role="status" aria-live="polite">
      {variant === 'screen' ? <div className="loading-state-card">{content}</div> : content}
    </div>
  )
}
