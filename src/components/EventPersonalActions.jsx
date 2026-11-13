import { useEffect, useState } from 'react'
import { getEventMuted, setEventMuted } from '../services/eventNotificationService'
import { downloadEventCalendar } from '../services/eventCalendar'

export default function EventPersonalActions({ event, memberId }) {
  const [muted, setMuted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setNotice('')
    getEventMuted(event.id, memberId).then(value => { if (active) setMuted(value) })
      .catch(() => { if (active) setError('알림 설정을 불러오지 못했습니다. 화면을 다시 열어 주세요.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [event.id, memberId])
  const toggle = async () => {
    setSaving(true); setNotice('')
    try {
      await setEventMuted(event.id, memberId, !muted)
      setMuted(!muted)
      setNotice(muted ? '이 일정의 알림을 다시 받습니다. 전체 알림 설정이 켜져 있어야 합니다.' : '내 계정에서 이 일정의 알림을 껐습니다. 참석 상태는 유지됩니다.')
    } catch {
      setNotice('설정을 저장하지 못했습니다. 다시 시도해 주세요.')
    } finally { setSaving(false) }
  }
  return <section className="event-personal-actions" aria-label="내 일정 설정">
    <div>
      <button className="event-detail-action" type="button" aria-pressed={muted} disabled={loading || saving || Boolean(error)} onClick={toggle}>
        {loading ? '알림 설정 확인 중…' : saving ? '저장 중…' : muted ? '이 일정 알림 켜기' : '이 일정 알림 끄기'}
      </button>
      <button className="event-detail-action" type="button" onClick={() => {
        try { downloadEventCalendar(event); setNotice('캘린더 파일을 열어 저장해 주세요. 앱에서 일정을 수정하거나 삭제해도 저장된 캘린더에는 자동 반영되지 않습니다.') }
        catch { setNotice('캘린더 파일을 만들지 못했습니다. 다시 시도해 주세요.') }
      }}>휴대폰 캘린더에 추가</button>
    </div>
    <p>{muted ? '이 일정 알림 꺼짐 · 나에게만 적용' : '알림 설정은 나에게만 적용됩니다.'}{event.repeat_monthly_day ? ' 반복 알림은 이후 회차에도 적용되며, 캘린더에는 표시된 회차만 추가됩니다.' : ''}</p>
    {(error || notice) && <p role="status">{error || notice}</p>}
  </section>
}
