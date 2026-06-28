import { Link } from 'react-router-dom'
import emptyStateIllustration from '../assets/empty-state-illustration.png'

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  compact = false,
}) {
  return (
    <div className={`empty-state-card ${compact ? 'compact' : ''}`}>
      <img className="empty-state-illustration" src={emptyStateIllustration} alt="" aria-hidden="true" />
      <div className="empty-state-copy">
        <strong>{title}</strong>
        {description && <p>{description}</p>}
      </div>
      {actionLabel && actionTo && (
        <Link className="empty-state-action" to={actionTo}>{actionLabel}</Link>
      )}
    </div>
  )
}
