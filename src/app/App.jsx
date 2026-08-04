import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app">
      <h1>안녕하세요 👋</h1>
      <p>maint-fe — React + Vite 세팅 완료</p>
      <button onClick={() => setCount(count + 1)}>
        버튼을 {count}번 눌렀어요
      </button>
      <p className="hint">
        <code>src/app/App.jsx</code> 를 고치고 저장하면 이 화면이 바로 바뀝니다.
      </p>
    </main>
  )
}

export default App
