export default function MemberAvatar({ name, imageUrl, className = '', size = 'md' }) {
  const initial = name?.trim()?.slice(0, 1) || '?'
  const classes = ['member-avatar', `member-avatar-${size}`, className].filter(Boolean).join(' ')

  return (
    <span className={classes} aria-hidden="true">
      {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : <b>{initial}</b>}
    </span>
  )
}
