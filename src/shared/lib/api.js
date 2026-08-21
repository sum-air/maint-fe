// atlas 백엔드 호출 클라이언트.
//
// 개발에서는 vite 프록시(`/atlas` → atlas)를 거친다. atlas 가 CORS 를 열어두지
// 않았고, 같은 오리진으로 보내면 그 문제가 아예 생기지 않기 때문이다.
//
// 인증: Bearer access 토큰. 세션(로그인·갱신·로그아웃)은 auth.js 가 담당하고,
// 여기서는 401 을 받으면 한 번 갱신해 재시도한다. 갱신까지 실패하면 세션을 지우고
// 로그인 화면으로 보낸다.
import {
  BASE_URL,
  clearSession,
  getToken,
  hasRefreshSession,
  refreshTokens,
} from './auth.js'

// 기존 사용처 호환 — 토큰 원시 접근은 auth.js 로 옮겼다
export { TOKEN_KEY, getToken, getTokenClaims } from './auth.js'

/** 백엔드가 실패를 항상 { code, message } 로 준다. code 로 분기하고 message 는 보여주기만 한다. */
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function send(path, { method = 'GET', params, body } = {}) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })

  const doFetch = () => {
    const token = getToken()
    return fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  let res = await doFetch()

  // access 만료 → 갱신 후 한 번만 재시도. refresh 가 없으면(dev 환경변수 토큰) 그대로 실패.
  if (res.status === 401 && hasRefreshSession()) {
    try {
      await refreshTokens()
    } catch {
      clearSession()
      window.location.replace('/login')
      throw new ApiError(401, 'UNAUTHENTICATED', '세션이 만료되었습니다. 다시 로그인해주세요.')
    }
    res = await doFetch()
  }

  if (!res.ok) {
    // 본문이 비어 있거나 JSON 이 아닐 수 있다 (프록시 오류 등)
    const errBody = await res.json().catch(() => ({}))
    throw new ApiError(res.status, errBody.code ?? 'UNKNOWN', errBody.message ?? `요청 실패 (${res.status})`)
  }
  return res.json()
}

export const apiGet = (path, params) => send(path, { params })

export const apiPost = (path, body) => send(path, { method: 'POST', body })

export const apiPut = (path, body) => send(path, { method: 'PUT', body })

export const apiPatch = (path, body) => send(path, { method: 'PATCH', body })
