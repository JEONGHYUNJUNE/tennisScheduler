import { useMemo, useRef, useState } from 'react'
import MemberAvatar from './MemberAvatar'
import { normalizeMentionMember } from '../services/mentionService'

function getMentionQuery(value, caretIndex) {
  const beforeCaret = value.slice(0, caretIndex)
  const match = beforeCaret.match(/(^|\s)@([^\s@]*)$/)
  if (!match) return null

  return {
    start: beforeCaret.length - match[2].length - 1,
    query: match[2].toLowerCase(),
  }
}

export default function MentionTextarea({
  candidates = [],
  className = '',
  disabled = false,
  maxLength,
  multiline = true,
  onChange,
  onMentionsChange,
  placeholder,
  rows = 3,
  value,
  ...props
}) {
  const inputRef = useRef(null)
  const [mentionQuery, setMentionQuery] = useState(null)

  const normalizedCandidates = useMemo(
    () => candidates.map(normalizeMentionMember).filter((member) => member.id && member.name),
    [candidates],
  )

  const filteredCandidates = useMemo(() => {
    if (!mentionQuery || !normalizedCandidates.length) return []

    return normalizedCandidates
      .filter((member) => {
        const name = member.name.toLowerCase()
        const username = member.username.toLowerCase()
        return name.includes(mentionQuery.query) || username.includes(mentionQuery.query)
      })
      .slice(0, 6)
  }, [mentionQuery, normalizedCandidates])

  const handleChange = (event) => {
    onChange(event.target.value)
    setMentionQuery(getMentionQuery(event.target.value, event.target.selectionStart || 0))
  }

  const handleKeyUp = (event) => {
    setMentionQuery(getMentionQuery(event.currentTarget.value, event.currentTarget.selectionStart || 0))
  }

  const handleSelectMention = (member) => {
    const input = inputRef.current
    if (!input || !mentionQuery) return

    const mentionText = `@${member.name} `
    const caretIndex = input.selectionStart || value.length
    const nextValue = `${value.slice(0, mentionQuery.start)}${mentionText}${value.slice(caretIndex)}`
    const nextCaretIndex = mentionQuery.start + mentionText.length

    onChange(nextValue)
    onMentionsChange?.((current) => {
      if (current.some((mention) => mention.id === member.id)) return current
      return [...current, member]
    })
    setMentionQuery(null)

    window.requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(nextCaretIndex, nextCaretIndex)
    })
  }

  const InputComponent = multiline ? 'textarea' : 'input'

  return (
    <div className={`mention-input-wrap ${className}`}>
      <InputComponent
        {...props}
        disabled={disabled}
        maxLength={maxLength}
        onChange={handleChange}
        onKeyUp={handleKeyUp}
        placeholder={placeholder}
        ref={inputRef}
        rows={multiline ? rows : undefined}
        type={multiline ? undefined : 'text'}
        value={value}
      />
      {filteredCandidates.length > 0 && (
        <div className="mention-suggestions">
          {filteredCandidates.map((member) => (
            <button key={member.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => handleSelectMention(member)}>
              <MemberAvatar name={member.name} imageUrl={member.avatar_url} size="sm" />
              <span>{member.name}</span>
              {member.username && <em>{member.username}</em>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
