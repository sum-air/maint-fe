// 모바일 서브 페이지 공용 헤더 — 얇은 보라 그라데이션: 로고 + 화면 제목 + 우측 컨트롤(스테퍼 등)
function PageHero({ title, right }) {
  return (
    <div className="mpg">
      <img className="mpg__logo" src="/sumair_logo.svg" alt="SUMAIR" />
      <div className="mpg__row">
        <span className="mpg__title">{title}</span>
        {right && <span className="mpg__right">{right}</span>}
      </div>
    </div>
  )
}

// ‹ 라벨 › 스테퍼 (월/일 이동 공용)
export function Stepper({ label, onPrev, onNext }) {
  return (
    <span className="mstep">
      <button type="button" onClick={onPrev}>‹</button>
      <span className="mstep__label">{label}</span>
      <button type="button" onClick={onNext}>›</button>
    </span>
  )
}

export default PageHero
