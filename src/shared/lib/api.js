// atlas 백엔드 호출 클라이언트.
//
// 개발에서는 vite 프록시(`/atlas` → atlas)를 거친다. atlas 가 CORS 를 열어두지
// 않았고, 같은 오리진으로 보내면 그 문제가 아예 생기지 않기 때문이다.
//
// 인증: atlas 는 Bearer access token 을 요구한다. 로그인 화면이 아직 없어서
// 지금은 localStorage 의 `atlas.accessToken` 을 쓴다 — currentUser.js 를
// 하드코딩해 둔 것과 같은 임시 조치다. 로그인이 붙으면 그 흐름이 이 값을 채운다.
const BASE_URL = import.meta.env.VITE_ATLAS_BASE_URL ?? '/atlas'

export const TOKEN_KEY = 'atlas.accessToken'

export function getToken() {
  const raw = localStorage.getItem(TOKEN_KEY) ?? import.meta.env.VITE_ATLAS_TOKEN ?? ''
  // 복사·붙여넣기로 섞여 들어오는 따옴표·"Bearer " 접두어·공백·개행 제거.
  // 개행이 남으면 Safari 가 Authorization 헤더에서
  // "The string did not match the expected pattern" 을 던지며 요청 자체가 실패한다.
  return raw.trim().replace(/^["']|["']$/g, '').replace(/^Bearer\s+/i, '').replace(/\s+/g, '')
}

/** 백엔드가 실패를 항상 { code, message } 로 준다. code 로 분기하고 message 는 보여주기만 한다. */
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function apiGet(path, params) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })

  const token = getToken()
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    // 본문이 비어 있거나 JSON 이 아닐 수 있다 (프록시 오류 등)
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.code ?? 'UNKNOWN', body.message ?? `요청 실패 (${res.status})`)
  }
  return res.json()
}

export async function apiPut(path, body) {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin)
  const token = getToken()
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new ApiError(res.status, errBody.code ?? 'UNKNOWN', errBody.message ?? `요청 실패 (${res.status})`)
  }
  return res.json()
}
