import { PLACES } from './places'

// Cross-fading photos that fill their container (the glass panel), with a dark wash for text contrast.
export function PlacesSlides({ index }: { index: number }) {
  return (
    <div className="places-slides">
      {PLACES.map((p, i) => (
        <img key={p.source} src={p.src} alt="" className={i === index ? 'active' : undefined} />
      ))}
      <div className="places-wash" />
    </div>
  )
}

// Caption and photo credit for the current slide (kept outside the glass so the links can be clicked).
export function PlacesCaption({ index }: { index: number }) {
  const p = PLACES[index]
  return (
    <div className="places-caption" aria-live="polite">
      <span className="places-label">Around Davao City</span>
      <strong>{p.name}</strong>
      <span>{p.area}</span>
      <a href={p.source} target="_blank" rel="noreferrer">
        Photo: {p.credit}, CC BY-SA 4.0
      </a>
    </div>
  )
}
