import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.jsx'
import './index.css'
import './shared/styles/modal.css'
import './app/mobile/mobile.css' // 모바일 오버라이드 — index.css 뒤에 와야 이긴다
import { registerServiceWorker } from './shared/lib/push.js'

registerServiceWorker() // 웹 푸시 수신용 — 캐싱은 하지 않는다

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
