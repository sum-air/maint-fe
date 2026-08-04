# maint-fe

정비(maintenance) 프론트엔드.

## 폴더 구조 — 기능 우선(feature-first)

기능 하나에 관한 모든 것(페이지·컴포넌트·훅·쿼리·유틸)을 한 폴더에 모은다.

```
src/
├─ app/                 # 앱 전역: App.jsx, router.jsx, 전역 provider
├─ features/            # ★ 기능 단위로 응집
│  └─ duty-log/         #   (예시 템플릿) 나머지 기능도 이 모양을 따른다
│     ├─ pages/         #     라우트로 연결되는 페이지 컴포넌트
│     ├─ components/    #     이 기능 전용 컴포넌트
│     ├─ hooks/         #     이 기능 전용 훅
│     ├─ api.js         #     백엔드 API 호출 (필요 시 생성)
│     └─ utils.js       #     이 기능 전용 유틸 (필요 시 생성)
├─ shared/              # 여러 기능이 공유하는 것만
│  ├─ components/       #   EmployeeAvatar, LoadingOverlay, Layout 등
│  ├─ hooks/            #   useIsMobile, useAttendance 등
│  ├─ lib/              #   api client, constants 등
│  └─ styles/           #   tokens.css, 전역 css
├─ main.jsx
└─ index.css
```

데이터는 별도 백엔드 서버의 API 를 호출해서 가져온다 (Vercel 서버리스/Supabase 미사용).

### 계획된 기능 폴더

`duty-log` 외에 아래 기능들을 같은 모양으로 추가한다:

`flight-ops` · `overtime` · `inventory` · `attendance` · `schedule` · `warranty` · `mh-analysis`

### 규칙

1. **feature → shared 는 OK, feature → feature 는 금지.**
   두 기능이 뭔가를 공유해야 하면 `shared/`로 올린다.
2. **모바일 페이지는 별도 트리로 빼지 않고 해당 기능 폴더 안에 co-locate 한다.**
   예: `features/duty-log/pages/DutyLogPage.jsx` 옆에 `DutyLogPage.mobile.jsx`.
3. 전용이던 것이 두 기능 이상에서 필요해지는 순간 `shared/`로 승격한다.
