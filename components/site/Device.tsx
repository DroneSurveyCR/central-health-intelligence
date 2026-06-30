// Shared marketing device frames: a clean browser window for desktop screenshots
// and an iPhone whose screen scrolls on hover so the whole screen can be read.
// Used by the homepage, the product page, and the per-vertical solution pages.

const SCREENS = "/screens";

/** A clean browser window around a desktop screenshot. */
export function Browser({
  src,
  alt,
  label,
  tilt,
}: {
  src: string;
  alt: string;
  label?: string;
  tilt?: boolean;
}) {
  return (
    <div className={`mkt-screen${tilt ? " tilt" : ""}`}>
      <div className="mkt-screen-bar">
        {label ? <span className="mkt-screen-url">{label}</span> : null}
      </div>
      <img src={`${SCREENS}/${src}`} alt={alt} width={1440} height={900} />
    </div>
  );
}

/** An iPhone whose screen scrolls on hover so the whole screen can be read. */
export function Phone({ src, alt, tilt }: { src: string; alt: string; tilt?: boolean }) {
  return (
    <div className={`mkt-phone${tilt ? " tilt" : ""}`} tabIndex={0} role="img" aria-label={alt}>
      <div className="mkt-screen-window">
        <img src={`${SCREENS}/${src}`} alt="" width={390} height={1283} />
      </div>
    </div>
  );
}
