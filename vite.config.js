import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // admin 과 같은 Google 웹 클라이언트를 쓰므로 오리진이 localhost:3000 이어야 GIS 가 통과한다.
    // 포트가 밀려 3001 로 뜨면 로그인만 조용히 깨지니 strictPort 로 실패를 앞당긴다.
    port: 3000,
    strictPort: true,
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
