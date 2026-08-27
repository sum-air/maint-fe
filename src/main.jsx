import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.jsx'
import './index.css'
import './shared/styles/modal.css'
import { registerServiceWorker } from './shared/lib/push.js'

registerServiceWorker() // 웹 푸시 수신용 — 캐싱은 하지 않는다

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
