import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { competencyAreas, competencyQuestions } from '../../data/competencyQuizBank'
import './dxInsight.css'

const storageKey = 'competencyQuizWrongNotes:v1'
const readNotes = () => {
  try {
    const ids = JSON.parse(window.localStorage.getItem(storageKey) || '[]')
    return Array.isArray(ids) ? ids.filter((id) => competencyQuestions.some((question) => question.id === id)) : []
  } catch { return [] }
}
const shuffled = (items) => {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export default function DxInsightModal({ onClose }) {
  const [area, setArea] = useState('all')
  const [type, setType] = useState('all')
  const [mode, setMode] = useState('setup')
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState([])
  const [written, setWritten] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [graded, setGraded] = useState(false)
  const [correct, setCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [wrongIds, setWrongIds] = useState(readNotes)
  const filtered = useMemo(() => competencyQuestions.filter((question) =>
    (area === 'all' || question.areaId === area) && (type === 'all' || question.type === type)), [area, type])
  const wrongQuestions = competencyQuestions.filter((question) => wrongIds.includes(question.id))
  const question = queue[index]
  const isChoice = Boolean(question?.options.length)
  const areaTitle = (id) => competencyAreas.find((item) => item.id === id)?.title || ''

  useEffect(() => {
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  const resetAnswer = () => {
    setSelected([])
    setWritten('')
    setRevealed(false)
    setGraded(false)
    setCorrect(false)
  }
  const start = (questions = filtered) => {
    if (!questions.length) return
    setQueue(shuffled(questions).slice(0, 10))
    setIndex(0)
    setScore(0)
    resetAnswer()
    setMode('quiz')
  }
  const saveNotes = (ids) => {
    setWrongIds(ids)
    try { window.localStorage.setItem(storageKey, JSON.stringify(ids)) } catch { /* Keep the current session usable if storage is unavailable. */ }
  }
  const grade = (passed) => {
    if (graded) return
    setGraded(true)
    setCorrect(passed)
    if (passed) {
      setScore((value) => value + 1)
      saveNotes(wrongIds.filter((id) => id !== question.id))
    } else {
      saveNotes([question.id, ...wrongIds.filter((id) => id !== question.id)])
    }
  }
  const reveal = () => {
    setRevealed(true)
    if (isChoice) grade(selected.length === question.answerIndices.length && question.answerIndices.every((answer) => selected.includes(answer)))
  }
  const next = () => {
    if (index + 1 === queue.length) setMode('result')
    else { setIndex((value) => value + 1); resetAnswer() }
  }

  return createPortal(
    <div className="dx-insight-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="dx-insight-modal" onDragStart={(event) => {
        if (!event.target.closest('input, textarea')) event.preventDefault()
      }} role="dialog" aria-modal="true" aria-labelledby="dx-insight-title">
        <div className="dx-insight-head">
          <div><p className="eyebrow">QUIZ</p><h2 id="dx-insight-title">역량평가 퀴즈</h2></div>
          <button className="inquiry-close-button" type="button" onClick={onClose} aria-label="닫기">×</button>
        </div>
        {mode === 'setup' && <>
          <div className="dx-insight-stats">
            <span><b>{competencyQuestions.length}</b>문항</span><span><b>{wrongIds.length}</b>오답</span><span><b>{filtered.length}</b>선택됨</span>
          </div>
          <div className="dx-insight-controls">
            <label>영역<select value={area} onChange={(event) => setArea(event.target.value)}>
              <option value="all">전체 영역</option>
              {competencyAreas.map((item) => <option key={item.id} value={item.id}>{item.number}. {item.title}</option>)}
            </select></label>
            <label>문제 유형<select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="all">전체 유형</option>
              {['선다형', '복수선택형', '단답형', '서술형'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select></label>
          </div>
          <p className="competency-help">선택한 범위에서 최대 10문항씩 출제됩니다. 단답형·서술형은 모범답안과 비교해 직접 채점합니다.</p>
          <div className="dx-insight-actions">
            <button type="button" onClick={() => setMode('wrong')}>오답노트</button>
            <button className="primary-button" type="button" onClick={() => start()} disabled={!filtered.length}>문제 시작</button>
          </div>
        </>}
        {mode === 'quiz' && question && <div className="dx-insight-quiz" key={question.id}>
          <div className="dx-insight-progress"><span>{index + 1} / {queue.length}</span><strong>{question.type}</strong></div>
          <p className="competency-help">{areaTitle(question.areaId)} · 문제 {question.number}</p>
          <h3>{question.title}</h3>
          <div className="competency-question-text">{question.prompt}</div>
          {isChoice ? <div className="dx-insight-options">
            {question.type === '복수선택형' && <p className="competency-help">정답을 모두 선택해 주세요. ({question.answerIndices.length}개)</p>}
            {question.options.map((option, optionIndex) => <button key={optionIndex} type="button" aria-pressed={selected.includes(optionIndex)} disabled={revealed}
              className={`${selected.includes(optionIndex) ? 'selected' : ''} ${revealed && question.answerIndices.includes(optionIndex) ? 'correct' : revealed && selected.includes(optionIndex) ? 'wrong' : ''}`}
              onClick={() => setSelected((values) => question.type === '복수선택형' ? values.includes(optionIndex) ? values.filter((value) => value !== optionIndex) : [...values, optionIndex] : [optionIndex])}>
              <b>{optionIndex + 1}</b><span>{option}</span>
            </button>)}
          </div> : <label>내 답안<textarea rows={question.type === '서술형' ? 6 : 3} value={written} disabled={revealed} onChange={(event) => setWritten(event.target.value)} placeholder="답안을 입력해 주세요." /></label>}
          {revealed && <div className={`dx-insight-answer ${graded && !correct ? 'wrong' : 'correct'}`}>
            <strong>{graded ? correct ? '정답입니다.' : '오답노트에 저장했습니다.' : '모범답안과 비교해 채점해 주세요.'}</strong>
            <p className="competency-question-text">정답: {question.answer}</p>
            <small className="competency-question-text">{question.explanation}</small>
            {!graded && <div className="dx-insight-actions"><button type="button" onClick={() => grade(false)}>오답으로 표시</button><button type="button" onClick={() => grade(true)}>정답으로 표시</button></div>}
          </div>}
          <div className="dx-insight-actions">
            <button type="button" onClick={() => setMode('setup')}>설정</button>
            {!revealed ? <button className="primary-button" type="button" onClick={reveal} disabled={isChoice ? !selected.length : !written.trim()}>정답 확인</button>
              : <button className="primary-button" type="button" onClick={next} disabled={!graded}>{index + 1 === queue.length ? '결과 보기' : '다음 문제'}</button>}
          </div>
        </div>}
        {mode === 'result' && <div className="dx-insight-result"><b>{score} / {queue.length}</b><p>이번 세트를 마쳤습니다.</p><div className="dx-insight-actions"><button type="button" onClick={() => setMode('setup')}>설정</button><button type="button" onClick={() => setMode('wrong')}>오답노트</button><button className="primary-button" type="button" onClick={() => start()}>다시 시작</button></div></div>}
        {mode === 'wrong' && <div className="dx-insight-wrong-note">
          <div className="dx-insight-note-head"><strong>오답노트</strong>{wrongIds.length > 0 && <button type="button" onClick={() => saveNotes([])}>전체 삭제</button>}</div>
          {!wrongQuestions.length ? <p>저장된 오답이 없습니다.</p> : <div className="dx-insight-note-list">{wrongQuestions.map((item) => <article key={item.id}>
            <span>{areaTitle(item.areaId)} · 문제 {item.number} · {item.type}</span><strong>{item.title}</strong><div className="competency-question-text">{item.prompt}</div>
            {item.options.map((option, optionIndex) => <div className="competency-question-text" key={optionIndex}>{optionIndex + 1}. {option}</div>)}
            <p className="competency-question-text">정답: {item.answer}</p><small className="competency-question-text">{item.explanation}</small>
          </article>)}</div>}
          <div className="dx-insight-actions"><button type="button" onClick={() => setMode('setup')}>돌아가기</button><button className="primary-button" type="button" onClick={() => start(wrongQuestions)} disabled={!wrongQuestions.length}>오답 다시 풀기</button></div>
        </div>}
      </div>
    </div>, document.body,
  )
}
