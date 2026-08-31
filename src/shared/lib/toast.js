// 토스트 — 짧은 성공/안내 메시지. 어디서든 showToast('...') 한 줄로 쓴다.
// React 상태·컨텍스트 없이 DOM 으로 그린다 — 모달이 닫히면서 컴포넌트가 사라져도 토스트는 남아야 해서.

let stylesInjected = false

function injectStyles() {
  if (stylesInjected) return
  stylesInjected = true
  const style = document.createElement('style')
  style.textContent = `
    @keyframes toast-in { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    @keyframes toast-out { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, 8px); } }
  `
  document.head.appendChild(style)
}

/** @param message 표시할 문구  @param duration 유지 시간(ms, 기본 2500) */
export function showToast(message, duration = 2500) {
  injectStyles()
  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  Object.assign(el.style, {
    position: 'fixed', left: '50%', bottom: '36px', transform: 'translate(-50%, 0)', zIndex: 200,
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '11px 18px', borderRadius: '99px',
    background: '#1A1A22', color: '#fff', fontSize: '13px', fontWeight: '700',
    fontFamily: 'inherit', letterSpacing: '-.2px',
    boxShadow: '0 12px 32px rgba(21,21,29,.32)',
    animation: 'toast-in .22s ease both',
    pointerEvents: 'none', whiteSpace: 'nowrap',
  })
  el.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#5EE0A0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg><span></span>`
  el.querySelector('span').textContent = message
  document.body.appendChild(el)
  setTimeout(() => {
    el.style.animation = 'toast-out .2s ease both'
    setTimeout(() => el.remove(), 220)
  }, duration)
}
