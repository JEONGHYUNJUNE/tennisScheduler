const mentionPattern = /(@[가-힣a-zA-Z0-9_]+)/g
const exactMentionPattern = /^@[가-힣a-zA-Z0-9_]+$/

export default function MentionText({ text = '' }) {
  const parts = String(text).split(mentionPattern)

  return (
    <>
      {parts.map((part, index) => (
        exactMentionPattern.test(part) ? (
          <span className="mention-token" key={`${part}-${index}`}>{part}</span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      ))}
    </>
  )
}
