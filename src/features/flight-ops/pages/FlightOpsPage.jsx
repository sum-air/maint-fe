import { useEffect, useState } from 'react'
import { fetchFlights } from '../api.js'
import './flight-ops.css'

// 상태 → 한글 라벨 + 색. 값은 백엔드 FlightStatus enum 과 1:1 이다.
const STATUS = {
  SCHEDULED: { label: '출발 전', c: '#6E6E80', b: '#F0F0F5' },
  DEPARTED: { label: '램프 아웃', c: '#C97A17', b: '#FBEFD9' },
  AIRBORNE: { label: '비행 중', c: '#5350E2', b: '#ECECFF' },
  LANDED: { label: '착륙', c: '#1F9D6B', b: '#E6F5EE' },
  ARRIVED: { label: '도착', c: '#1F9D6B', b: '#E6F5EE' },
  CANCELLED: { label: '결항', c: '#D23B3B', b: '#FBE6E6' },
  IRREGULAR: { label: '비정상', c: '#D2731E', b: '#FBECDD' },
}

const pad = (n) => String(n).padStart(2, '0')

/** UTC ISO → KST HH:MM. 백엔드는 전부 UTC 로 주고 변환은 화면 몫이다. */
function kst(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const k = new Date(d.getTime() + 9 * 3600 * 1000)
  return `${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`
}

/** 오늘의 GMT 운항일 (YYYY-MM-DD). 백엔드가 쓰는 날짜 키와 같은 기준. */
function todayGmt() {
  return new Date().toISOString().slice(0, 10)
}

function delayText(minutes) {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes === 0) return '정시'
  return minutes > 0 ? `+${minutes}분` : `${minutes}분`
}

function FlightOpsPage() {
  const [date, setDate] = useState(todayGmt)
  const [flights, setFlights] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetchFlights(date)
      .then((rows) => alive && setFlights(rows))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [date])

  return (
    <section className="fo">
      <header className="fo-head">
        <h1 className="fo-title">실시간 운항</h1>
        <input
          className="fo-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <span className="fo-note">운항일 기준 (GMT)</span>
      </header>

      {loading && <p className="fo-msg">불러오는 중…</p>}
      {error && (
        <p className="fo-msg fo-msg--err">
          {error.message} <span className="fo-code">{error.code}</span>
        </p>
      )}
      {!loading && !error && flights.length === 0 && (
        <p className="fo-msg">이 운항일에 편이 없습니다.</p>
      )}

      {!loading && !error && flights.length > 0 && (
        <table className="fo-table">
          <thead>
            <tr>
              <th>편명</th>
              <th>구간</th>
              <th>등록번호</th>
              <th>상태</th>
              <th>STD</th>
              <th>실제 출발</th>
              <th>지연</th>
              <th>STA</th>
              <th>실제 도착</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((f) => {
              const st = STATUS[f.status] ?? { label: f.status, c: '#6E6E80', b: '#F0F0F5' }
              return (
                <tr key={f.flightNumber}>
                  <td className="fo-mono fo-flt">{f.flightNumber}</td>
                  <td>
                    {f.departureAirport} → {f.arrivalAirport}
                  </td>
                  <td className="fo-mono">{f.registration ?? '—'}</td>
                  <td>
                    <span className="fo-badge" style={{ color: st.c, background: st.b }}>
                      {st.label}
                    </span>
                    {f.irregularityCode && <span className="fo-irr">{f.irregularityCode}</span>}
                  </td>
                  <td className="fo-mono">{kst(f.scheduledDepartureUtc)}</td>
                  <td className="fo-mono">
                    {kst(f.actualRampOutUtc ?? f.actualTakeOffUtc)}
                  </td>
                  <td className="fo-mono">{delayText(f.departureDelayMinutes)}</td>
                  <td className="fo-mono">{kst(f.scheduledArrivalUtc)}</td>
                  <td className="fo-mono">{kst(f.actualRampInUtc)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <p className="fo-foot">시각은 KST 표기. 원천은 MVT 이며 atlas 가 매 요청 그대로 읽는다.</p>
    </section>
  )
}

export default FlightOpsPage
