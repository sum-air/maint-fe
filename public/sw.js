// 서비스워커 — 웹 푸시 수신 + 알림 탭 처리만 한다. 캐싱은 하지 않는다(항상 최신 화면).
// 서버가 보내는 페이로드: { title, body, url }  (atlas WebPushSender)

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data?.text() } }
  const title = data.title || '섬에어 정비'
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.url || 'default', // 같은 화면 알림은 하나로 합쳐진다
    renotify: true,
    data: { url: data.url || '/' },
  }))
})

// 탭하면 해당 화면으로 — 이미 열린 탭이 있으면 그 탭을 앞으로
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const same = all.find((c) => c.url === url) || all[0]
    if (same) {
      await same.focus()
      if (same.url !== url && 'navigate' in same) await same.navigate(url)
      return
    }
    await self.clients.openWindow(url)
  })())
})
