/** Landscape layers from the licensed Aceternity Inference hero, with appearance centralized in CSS. */
export function LandingLandscape() {
  return (
    <div className="landing-hero-backdrop" aria-hidden="true">
      <div className="landing-landscape-image">
        <img src="/images/aceternity-landscape.webp" width="1672" height="941" alt="" fetchPriority="high" />
      </div>
      <div className="landing-landscape-shade" />
      <div className="landing-landscape-warmth" />
      <div className="landing-landscape-top" />
      <div className="landing-landscape-bottom" />
    </div>
  )
}
