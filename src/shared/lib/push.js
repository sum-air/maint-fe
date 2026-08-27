// 웹 푸시 구독 — 출퇴근 리마인더. 브라우저 구독을 만들어 atlas 에 저장한다.
//
// iOS 는 홈 화면에 추가한 앱(standalone)에서만, iOS 16.4+ 에서 동작한다.
// 사파리 탭에서는 PushManager 자체가 없어 isSupported() 가 false 다.
import { apiDelete, apiGet, apiPost } from './api.js'

export const isSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// iOS 사파리 탭(홈 화면 추가 전)인지 — 안내 문구 분기용
export const isIosBrowserTab = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.navigator.standalone && !window.matchMedia('(display-mode: standalone)').matches

// 서비스워커 등록 — main.jsx 에서 한 번. 실패해도 앱은 그대로 돈다.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

// 현재 이 기기의 구독 — 없으면 null
async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

/** 'on' | 'off' | 'denied' | 'unsupported' */
export async function getState() {
  if (!isSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return (await currentSubscription()) ? 'on' : 'off'
}

const toKey = (base64url) => {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** 권한 요청 → 구독 → 서버 저장. 거절하면 'denied' */
export async function enable() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'
  const { publicKey } = await apiGet('/push-subscriptions/config')
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) }))
  const { endpoint, keys } = sub.toJSON()
  await apiPost('/push-subscriptions', { endpoint, p256dh: keys.p256dh, auth: keys.auth })
  return 'on'
}

/** 서버에서 지우고 브라우저 구독도 해지 */
export async function disable() {
  const sub = await currentSubscription()
  if (!sub) return 'off'
  await apiDelete(`/push-subscriptions?endpoint=${encodeURIComponent(sub.endpoint)}`)
  await sub.unsubscribe()
  return 'off'
}
