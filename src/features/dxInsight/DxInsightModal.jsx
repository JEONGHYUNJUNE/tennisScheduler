import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildTermQuestions, dxInsightParts, dxInsightQuestions, getChapterMeta } from '../../data/dxInsightQuizBank'
import './dxInsight.css'

const wrongNoteStorageKey = 'dxInsightWrongNotes:v1'

const readWrongNotes = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(wrongNoteStorageKey) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveWrongNotes = (notes) => {
  window.localStorage.setItem(wrongNoteStorageKey, JSON.stringify(notes.slice(0, 80)))
}

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5)

export default function DxInsightModal({ onClose }) {
  const termQuestions = useMemo(() => buildTermQuestions(), [])
  const allQuestions = useMemo(() => [...dxInsightQuestions, ...termQuestions], [termQuestions])
  const [selectedPart, setSelectedPart] = useState('all')
  const [selectedChapter, setSelectedChapter] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [mode, setMode] = useState('setup')
  const [quizQueue, setQuizQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const [score, setScore] = useState(0)
  const [wrongNotes, setWrongNotes] = useState(() => readWrongNotes())

  const chapterOptions = useMemo(() => {
    const chapters = dxInsightParts.flatMap((part) => part.chapters.map((chapter) => ({ ...chapter, partId: part.id })))
    if (selectedPart === 'all') return chapters
    return chapters.filter((chapter) => chapter.partId === selectedPart)
  }, [selectedPart])

  useEffect(() => {
    if (selectedChapter !== 'all' && !chapterOptions.some((chapter) => chapter.id === selectedChapter)) {
      setSelectedChapter('all')
    }
  }, [chapterOptions, selectedChapter])

  const filteredQuestions = useMemo(() => {
    const partChapterIds = selectedPart === 'all'
      ? null
      : new Set(dxInsightParts.find((part) => part.id === selectedPart)?.chapters.map((chapter) => chapter.id) || [])

    return allQuestions.filter((question) => {
      if (partChapterIds && !partChapterIds.has(question.chapterId)) return false
      if (selectedChapter !== 'all' && question.chapterId !== selectedChapter) return false
      if (selectedType !== 'all' && question.type !== selectedType) return false
      return true
    })
  }, [allQuestions, selectedChapter, selectedPart, selectedType])

  const currentQuestion = quizQueue[currentIndex]
  const currentMeta = currentQuestion ? getChapterMeta(currentQuestion.chapterId) : null
  const isCorrect = currentQuestion && selectedAnswer === currentQuestion.answerIndex

  const startQuiz = (sourceQuestions = filteredQuestions) => {
    const nextQueue = shuffle(sourceQuestions).slice(0, 10)
    if (nextQueue.length === 0) return
    setQuizQueue(nextQueue)
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setConfirmed(false)
    setScore(0)
    setMode('quiz')
  }

  const recordWrongNote = (question, chosenIndex) => {
    const meta = getChapterMeta(question.chapterId)
    const note = {
      id: question.id,
      chapterId: question.chapterId,
      chapterTitle: meta ? `Ch.${meta.number} ${meta.title}` : question.chapterId,
      type: question.type,
      prompt: question.prompt,
      options: question.options,
      answerIndex: question.answerIndex,
      chosenIndex,
      explanation: question.explanation,
      missedAt: new Date().toISOString(),
    }
    const nextNotes = [note, ...wrongNotes.filter((item) => item.id !== note.id)]
    setWrongNotes(nextNotes)
    saveWrongNotes(nextNotes)
  }

  const confirmAnswer = () => {
    if (!currentQuestion || selectedAnswer === null) return
    setConfirmed(true)
    if (selectedAnswer === currentQuestion.answerIndex) {
      setScore((value) => value + 1)
    } else {
      recordWrongNote(currentQuestion, selectedAnswer)
    }
  }

  const goNext = () => {
    if (currentIndex + 1 >= quizQueue.length) {
      setMode('result')
      return
    }
    setCurrentIndex((value) => value + 1)
    setSelectedAnswer(null)
    setConfirmed(false)
  }

  const clearWrongNotes = () => {
    setWrongNotes([])
    saveWrongNotes([])
  }

  const retryWrongNotes = () => {
    const retryQuestions = wrongNotes.map((note) => ({
      id: note.id,
      chapterId: note.chapterId,
      type: note.type,
      prompt: note.prompt,
      options: note.options,
      answerIndex: note.answerIndex,
      explanation: note.explanation,
    }))
    startQuiz(retryQuestions)
  }

  return createPortal(
    <div className="dx-insight-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div className="dx-insight-modal" role="dialog" aria-modal="true" aria-labelledby="dx-insight-title">
        <div className="dx-insight-head">
          <div>
            <p className="eyebrow">DX INSIGHT</p>
            <h2 id="dx-insight-title">오늘의 학습</h2>
          </div>
          <button className="inquiry-close-button" type="button" onClick={onClose} aria-label="닫기">×</button>
        </div>

        {mode === 'setup' && (
          <>
            <div className="dx-insight-stats">
              <span><b>{allQuestions.length}</b>문항</span>
              <span><b>{wrongNotes.length}</b>오답</span>
              <span><b>{filteredQuestions.length}</b>선택됨</span>
            </div>

            <div className="dx-insight-controls">
              <label>
                파트
                <select value={selectedPart} onChange={(event) => setSelectedPart(event.target.value)}>
                  <option value="all">전체 파트</option>
                  {dxInsightParts.map((part) => <option key={part.id} value={part.id}>{part.title}</option>)}
                </select>
              </label>
              <label>
                챕터
                <select value={selectedChapter} onChange={(event) => setSelectedChapter(event.target.value)}>
                  <option value="all">전체 챕터</option>
                  {chapterOptions.map((chapter) => <option key={chapter.id} value={chapter.id}>Ch.{chapter.number} {chapter.title}</option>)}
                </select>
              </label>
              <label>
                유형
                <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
                  <option value="all">전체 유형</option>
                  <option value="multiple">객관식</option>
                  <option value="term">용어</option>
                </select>
              </label>
            </div>

            <div className="dx-insight-actions">
              <button className="primary-button" type="button" onClick={() => startQuiz()} disabled={filteredQuestions.length === 0}>문제 시작</button>
              <button type="button" onClick={() => setMode('wrong')}>오답노트</button>
            </div>
          </>
        )}

        {mode === 'quiz' && currentQuestion && (
          <div className="dx-insight-quiz">
            <div className="dx-insight-progress">
              <span>{currentIndex + 1} / {quizQueue.length}</span>
              <strong>{currentMeta ? `Ch.${currentMeta.number} ${currentMeta.title}` : 'DX Insight'}</strong>
            </div>
            <h3>{currentQuestion.prompt}</h3>
            <div className="dx-insight-options">
              {currentQuestion.options.map((option, index) => {
                const stateClass = confirmed && index === currentQuestion.answerIndex ? 'correct' : confirmed && index === selectedAnswer ? 'wrong' : ''
                return (
                  <button key={option} className={`${selectedAnswer === index ? 'selected' : ''} ${stateClass}`} type="button" onClick={() => !confirmed && setSelectedAnswer(index)}>
                    <b>{String.fromCharCode(65 + index)}</b>
                    <span>{option}</span>
                  </button>
                )
              })}
            </div>
            {confirmed && (
              <p className={`dx-insight-answer ${isCorrect ? 'correct' : 'wrong'}`}>
                {isCorrect ? '정답입니다.' : `오답입니다. 정답은 ${String.fromCharCode(65 + currentQuestion.answerIndex)}입니다.`}
                <small>{currentQuestion.explanation}</small>
              </p>
            )}
            <div className="dx-insight-actions">
              <button type="button" onClick={() => setMode('setup')}>설정</button>
              {!confirmed ? (
                <button className="primary-button" type="button" onClick={confirmAnswer} disabled={selectedAnswer === null}>정답 확인</button>
              ) : (
                <button className="primary-button" type="button" onClick={goNext}>{currentIndex + 1 >= quizQueue.length ? '결과 보기' : '다음 문제'}</button>
              )}
            </div>
          </div>
        )}

        {mode === 'result' && (
          <div className="dx-insight-result">
            <b>{score} / {quizQueue.length}</b>
            <p>이번 세트가 끝났습니다.</p>
            <div className="dx-insight-actions">
              <button type="button" onClick={() => setMode('wrong')}>오답노트</button>
              <button className="primary-button" type="button" onClick={() => startQuiz()}>다시 시작</button>
            </div>
          </div>
        )}

        {mode === 'wrong' && (
          <div className="dx-insight-wrong-note">
            <div className="dx-insight-note-head">
              <strong>오답노트</strong>
              {wrongNotes.length > 0 && <button type="button" onClick={clearWrongNotes}>전체 삭제</button>}
            </div>
            {wrongNotes.length === 0 ? (
              <p className="notification-empty">저장된 오답이 없습니다.</p>
            ) : (
              <div className="dx-insight-note-list">
                {wrongNotes.map((note) => (
                  <article key={`${note.id}-${note.missedAt}`}>
                    <span>{note.chapterTitle}</span>
                    <strong>{note.prompt}</strong>
                    <p>정답: {note.options[note.answerIndex]}</p>
                    <small>{note.explanation}</small>
                  </article>
                ))}
              </div>
            )}
            <div className="dx-insight-actions">
              <button type="button" onClick={() => setMode('setup')}>돌아가기</button>
              <button className="primary-button" type="button" onClick={retryWrongNotes} disabled={wrongNotes.length === 0}>오답 다시 풀기</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
