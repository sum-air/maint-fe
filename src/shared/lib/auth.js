// atlas 인증 세션 — 로그인(Google id_token → atlas 토큰 발급), 갱신, 로그아웃.
//
// 흐름: Google 로그인 버튼(GIS) → id_token → POST /auth/tokens → access(1시간)·refresh(60일) 저장.
// access 가 만료되면 api.js 가 401 을 받고 refreshTokens() 로 갱신 후 재시도한다.
//
// dev 폴백: 로그인 없이도 .env.local 의 VITE_ATLAS_TOKEN 이 있으면 그대로 동작한다
// (refresh 가 없으니 만료되면 재발급 필요).
const BASE_URL = import.meta.env.VITE_ATLAS_BASE_URL ?? '/atlas'
export { BASE_URL }

export const TOKEN_KEY = 'atlas.accessToken'
const REFRESH_KEY = 'atlas.refreshToken'
const DEVICE_KEY = 'atlas.deviceKey'

// 관리자 포털과 공용인 Google 웹 클라이언트 — atlas 의 허용 audience 로 등록돼 있다 (V7 시드).
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ??
  '829726031399-r2hih4a8ukj4go1qnfdj9bqp0054l408.apps.googleusercontent.com'

export function getToken() {
  const raw = localStorage.getItem(TOKEN_KEY) ?? import.meta.env.VITE_ATLAS_TOKEN ?? ''
  // 복사·붙여넣기로 섞여 들어오는 따옴표·"Bearer " 접두어·공백·개행 제거.
  // 개행이 남으면 Safari 가 Authorization 헤더에서
  // "The string did not match the expected pattern" 을 던지며 요청 자체가 실패한다.
  return raw.trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '').replace(/\s+/g, '')
}

// 토큰 payload(사번·features)를 읽는다 — 화면이 "내가 누구인가"를 아는 경로.
// 서명 검증은 서버 몫이라 여기서 읽는 값은 UI 노출 판단에만 쓴다. 실제 권한 강제는 항상 서버가 한다.
export function getTokenClaims() {
  try {
    const payload = getToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload + '='.repeat((4 - (payload.length % 4)) % 4)))
  } catch {
    return {}
  }
}

// 화면 진입 허용 여부 — 로그인 세션 또는 dev 환경변수 토큰
export const hasSession = () => !!getToken()

// 브라우저(설치) 식별자 — 재로그인 시 같은 기기임을 알아보는 단서. 최초 접속 때 만들어 보관한다.
function getDeviceKey() {
  let key = localStorage.getItem(DEVICE_KEY)
  if (!key) {
    key = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, key)
  }
  return key
}

async function issueTokens(grant, credential) {
  const res = await fetch(new URL(`${BASE_URL}/auth/tokens`, window.location.origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant, credential, deviceKey: getDeviceKey(), platform: 'WEB' }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error(body.message ?? `로그인 실패 (${res.status})`)
    error.code = body.code
    throw error
  }
  localStorage.setItem(TOKEN_KEY, body.accessToken)
  localStorage.setItem(REFRESH_KEY, body.refreshToken)
  return body
}

// Google 로그인 성공 시 GIS 콜백이 부른다. 응답에 프로필·기능 목록이 함께 온다.
export const loginWithGoogle = (idToken) => issueTokens('IDENTITY_TOKEN', idToken)

export const hasRefreshSession = () => !!localStorage.getItem(REFRESH_KEY)

// 갱신 — refresh 는 1회용(회전)이라 동시에 두 번 부르면 재사용 오탐으로 기기가 폐기된다.
// 진행 중인 갱신이 있으면 그 약속을 같이 기다린다.
let refreshing = null
export function refreshTokens() {
  if (!refreshing) {
    const refresh = localStorage.getItem(REFRESH_KEY)
    if (!refresh) return Promise.reject(new Error('로그인 세션이 없습니다.'))
    refreshing = issueTokens('REFRESH_TOKEN', refresh).finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

// 로그아웃 — 서버의 기기 세션을 닫고(실패해도 무시) 로컬 세션을 지운 뒤 로그인 화면으로.
// 전체 리로드로 이동해 모듈들이 세션 기준 상태를 처음부터 다시 읽게 한다.
export async function logout() {
  const token = getToken()
  if (token) {
    await fetch(new URL(`${BASE_URL}/auth/tokens`, window.location.origin), {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }
  clearSession()
  window.location.replace('/login')
}
