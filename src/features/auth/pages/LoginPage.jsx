import { useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID, hasStoredSession, loginWithGoogle } from '../../../shared/lib/auth.js'
import './login.css'

// 로그인 — Google 계정(@sumair.kr)으로 신원을 확인하고 atlas 토큰을 받는다.
// 버튼은 GIS(Google Identity Services)가 그려 주고, 성공 콜백의 id_token 을 atlas 로 보낸다.
function LoginPage() {
  const buttonRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // 실로그인 세션이 이미 있으면(뒤로가기 등) 홈으로. dev 환경변수 토큰만 있는 경우는
    // 열어 둔다 — dev 에서도 실로그인을 시험할 수 있어야 한다.
    if (hasStoredSession()) {
      window.location.replace('/')
      return
    }
    const init = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            await loginWithGoogle(response.credential)
            // 전체 리로드로 이동 — 모듈들이 세션 기준 상태(사번·권한)를 처음부터 읽게 한다
            window.location.replace('/')
          } catch (e) {
            // 예: 재직 아님(EMPLOYMENT_NOT_ACTIVE), 미등록 도메인
            setError(e.message)
          }
        },
      })
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 280,
        text: 'signin_with',
      })
    }
    // StrictMode 이중 마운트·재방문 시 스크립트를 다시 싣지 않는다
    if (window.google?.accounts?.id) {
      init()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = init
    script.onerror = () => setError('Google 로그인 스크립트를 불러오지 못했습니다. 네트워크를 확인해주세요.')
    document.head.appendChild(script)
    return () => script.remove()
  }, [])

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <svg viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
            <path d="M26.0136 10.4009H17.3416L21.6776 2.59907L17.3438 0L13.0078 7.79953L17.3416 15.5991H26.0136V10.4009Z" fill="#6868FF" />
            <path d="M13.0081 7.79953L8.67205 0L4.33603 2.59907L8.67205 10.4009H0V15.5991H8.67205L13.0081 7.79953Z" fill="#6868FF" />
            <path d="M8.67196 15.5991L4.33594 23.3986L8.67196 26L13.008 18.1981L17.344 26L21.6778 23.3986L17.3418 15.5991H8.67196Z" fill="#6868FF" />
          </svg>
        </div>
        <h1 className="login__title">정비본부 시스템</h1>
        <p className="login__desc">회사 Google 계정(@sumair.kr)으로 로그인해주세요.</p>
        <div className="login__button" ref={buttonRef} />
        {error && <p className="login__error">{error}</p>}
      </div>
    </div>
  )
}

export default LoginPage
