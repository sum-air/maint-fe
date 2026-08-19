import { useState } from 'react'
import MyOvertime from '../components/MyOvertime.jsx'
import AdminOvertime from '../components/AdminOvertime.jsx'
import { CURRENT_USER } from '../../../shared/lib/currentUser.js'
import './overtime.css'

// 시간외근무 — 내 시간외(신청·내역) + 팀 관리(승인, 관리자 전용)
function OvertimePage() {
  const [mode, setMode] = useState('my')

  return (
    <section>
      <div className="ot-head">
        <span className="ot-title">시간외근무</span>
        {CURRENT_USER.isAdmin && (
          <div className="ot-scope">
            {[['my', '내 시간외'], ['admin', '팀 관리']].map(([k, t]) => (
              <button
                key={k}
                type="button"
                className={mode === k ? 'ot-scopetab on' : 'ot-scopetab'}
                onClick={() => setMode(k)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        {mode === 'my' ? <MyOvertime /> : <AdminOvertime />}
      </div>
    </section>
  )
}

export default OvertimePage
