import { useEffect, useState } from 'react'

// 모바일 판정 — 뷰포트 767px 이하. 회전/리사이즈에 반응한다.
const QUERY = '(max-width: 767px)'

export default function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = (e) => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return mobile
}
