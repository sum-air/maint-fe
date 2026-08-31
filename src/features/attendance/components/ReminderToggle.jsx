import { useEffect, useState } from 'react'
import { disable, enable, getState, isIosBrowserTab } from '../../../shared/lib/push.js'
import { showToast } from '../../../shared/lib/toast.js'

// 벨 아이콘 — off 면 사선
const Bell = ({ off }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    {off && <path d="M3 3l18 18" />}
  </svg>
)

// 출퇴근 리마인더 켜기/끄기 — 이 기기의 푸시 구독. 상태: on/off/denied/unsupported
function ReminderToggle() {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { getState().then(setState).catch(() => setState('unsupported')) }, [])

  const toggle = async () => {
    if (busy || !state) return
    setBusy(true)
    try {
      setState(state === 'on' ? await disable() : await enable())
    } catch (e) {
      showToast(`알림 설정 실패 — ${e.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (state == null) return null
  if (state === 'unsupported') {
    return (
      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#9C9CAB' }} title="브라우저가 푸시 알림을 지원하지 않습니다">
        {isIosBrowserTab() ? '알림은 홈 화면에 추가한 뒤 켤 수 있어요' : '이 브라우저는 알림을 지원하지 않아요'}
      </span>
    )
  }
  const on = state === 'on'
  const denied = state === 'denied'
  return (
    <button
      type="button"
      disabled={denied || busy}
      onClick={toggle}
      title={denied ? '브라우저 설정에서 알림 권한을 허용해주세요' : on ? '출퇴근 리마인더 끄기' : '출퇴근 리마인더 켜기'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 12px', borderRadius: 999,
        border: '1px solid', fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: denied ? 'not-allowed' : 'pointer',
        ...(on
          ? { background: '#E9E8F7', color: '#433FBB', borderColor: 'transparent' }
          : { background: '#fff', color: denied ? '#B4B7C0' : '#6E6E78', borderColor: '#DCDCE4' }),
        opacity: busy ? 0.6 : 1,
      }}
    >
      <Bell off={!on} />
      {denied ? '알림 차단됨' : on ? '리마인더 켜짐' : '리마인더 켜기'}
    </button>
  )
}

export default ReminderToggle
