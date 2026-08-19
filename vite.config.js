import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 개발용 프록시. atlas 는 CORS 를 열어두지 않았고(FE 오리진 확정 전),
    // 같은 오리진으로 보내면 그 문제가 아예 생기지 않는다.
    // 배포 시 라우팅은 별도 결정 사항이다.
    proxy: {
      '/atlas': {
        target: process.env.VITE_ATLAS_TARGET ?? 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/atlas/, ''),
      },
    },
  },
})
