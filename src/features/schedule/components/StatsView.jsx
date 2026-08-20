// 월간 통계 히트맵 — 데모 데이터를 제거한 상태. 근무 데이터가 백엔드에 생기면
// 인원 × 지표(근무·휴무·대휴 등) 표를 다시 붙인다 (이전 구현은 git 이력 참조).
function StatsView() {
  return (
    <div className="hm sched-empty">
      통계는 근무 데이터 연동 후 제공됩니다.
    </div>
  )
}

export default StatsView
